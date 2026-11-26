"""Checks every puzzle in js/puzzles.json with real Python, the same way game-room.html grades it.

    python3 tools/verify_bank.py

For each puzzle:
  1. the buggy code must FAIL (error or wrong output)
  2. the reference fix below must PASS (output + variant + probes + needCall)
  3. a cheat that just prints the answer must be REJECTED
Run it after adding or editing a puzzle. Needs node and python3.
"""
import ast, json, re, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
bank = json.loads((ROOT / 'js' / 'puzzles.json').read_text(encoding='utf8'))
for _p in bank:                      # the game joins code lines with newlines, so do the same here
    if isinstance(_p['code'], list): _p['code'] = '\n'.join(_p['code'])

# one correct fix per puzzle id: [old text, new text]. Kept OUT of the browser bank so players cannot read answers.
FIX = json.loads((ROOT / 'tools' / 'fixes.json').read_text(encoding='utf8'))

def run(code, timeout=5):
    """returns (stdout, error_name_or_None)"""
    try:
        r = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return '', 'TimeoutError'
    if r.returncode:
        m = re.findall(r'^(\w+(?:Error|Exception))', r.stderr, re.M)
        return r.stdout.strip(), (m[-1] if m else 'Error')
    return r.stdout.strip(), None

def py_literal(v):
    return repr(v)  # json -> python objects already

def variant_apply(code, v):
    m = re.search(v['re'], code)
    if not m: return None
    to = re.sub(r'\{(\d)\}', lambda x: m.group(int(x.group(1))) or '', v['to'])
    return code[:m.start()] + to + code[m.end():]

def grade(p, code):
    """same order as game-room.html: validate -> run -> expected output -> hidden checks. Returns tag or None."""
    if p.get('needDef') and not re.search(r'def\s+' + p['needDef'] + r'\s*\(', code): return 'Missing def'
    out, err = run(code)
    if err: return err
    if out != p['expect']: return 'Wrong Output'
    v = p.get('variant')
    if v:
        c2 = variant_apply(code, v)
        if c2 is None: return 'Hardcoded Answer'
        o2, e2 = run(c2)
        if e2 or o2 != v['expect']: return 'Hardcoded Answer'
    for pr in p.get('probes', []):
        probe = code + f"\nimport inspect as _i\n_n = len(_i.signature({pr['fn']}).parameters)\nprint('@@PROBE@@' + str({pr['fn']}(*{py_literal(pr['args'])}[:_n])))"
        o3, e3 = run(probe)
        got = o3.split('@@PROBE@@')[1].strip() if '@@PROBE@@' in o3 else None
        if e3 or got != pr['expect']: return 'Hardcoded Answer'
    if p.get('needCall'):
        tree = ast.parse(code); par = {}
        for n in ast.walk(tree):
            for c in ast.iter_child_nodes(n): par[c] = n
        ok = any(isinstance(n, ast.Call) and getattr(n.func, 'id', None) == p['needCall'] and not isinstance(par.get(n), ast.Expr) for n in ast.walk(tree))
        if not ok: return 'Hardcoded Answer'
    return None

bad = 0
def check(cond, msg):
    global bad
    if not cond: bad += 1; print('  FAIL:', msg)

ids = [p['id'] for p in bank]
check(len(ids) == len(set(ids)), 'duplicate ids')
check(set(ids) == set(FIX), f'FIX dict out of sync: {set(ids) ^ set(FIX)}')
cats = {}
for p in bank:
    print(p['id'])
    for k in ['id','category','level','title','story','code','expect','file','status','badge','bug','why','hint']:
        check(k in p, f'missing field {k}')
    check(len(p['hint']) == 2, 'needs exactly 2 hints')
    check(p['story'].endswith('Fix the code and run it.'), 'story must end with "Fix the code and run it."')
    check('{obj}' in p['story'] and '{obj}' in p['title'], 'title and story must use the {obj} token (puzzles are themed on the room object)')
    check('{objfile}' in p['file'], 'file must use the {objfile} token')
    check(len(p['code']) <= 500, 'code longer than game MAX_CHARS (500)')
    check(any([p.get('variant'), p.get('probes'), p.get('needCall')]), 'no hidden check, answer could be hardcoded')
    cats.setdefault((p['category'], p['level']), []).append(p['id'])
    check(grade(p, p['code']) is not None, 'buggy code PASSES (should fail)')
    old, new = FIX[p['id']]
    check(old in p['code'], 'fix pattern not found in code')
    fixed = p['code'].replace(old, new, 1)
    t = grade(p, fixed)
    check(t is None, f'reference fix rejected: {t}')
    cheat = f"print({json.dumps(p['expect'])})" if '\n' not in p['expect'] else '\n'.join(f'print({json.dumps(l)})' for l in p['expect'].split('\n'))
    check(grade(p, cheat) is not None, 'hardcoded print PASSES (should be rejected)')
print('\ncoverage (category x level):')
for c in ['Index','Type','Recursion','Scope']:
    print(f'  {c:10}', ' '.join(f"{lv[:3]}={len(cats.get((c, lv), []))}" for lv in ['BEGINNER','INTERMEDIATE','ADVANCED']))
for k, v in cats.items():
    check(len(v) >= 2, f'{k} needs 2+ puzzles so rooms can rotate')
print('\nOK' if not bad else f'\n{bad} problem(s)')
sys.exit(1 if bad else 0)