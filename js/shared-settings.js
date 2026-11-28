// REMEDIATE: one settings screen for every page except index.html (which still has its own copy of this same panel).
// "System Config // Terminal 07": Audio, Display, Controls, Gameplay tabs.
// Saved in localStorage 'remediate.settings.v1', the same key index.html and js/settings.js read.
// Opened with openRemediateSettings(). Changes preview live; Save keeps them, Back / Discard undoes them.
const RemediateSharedSettings = (() => {
  const KEY = 'remediate.settings.v1';
  const CSS = "#rcfg .cfg{position:relative;display:grid;grid-template:auto 1fr auto/210px 1fr;grid-template-areas:\"h h\" \"t b\" \"f f\";width:min(940px,100%);height:min(620px,calc(100dvh - 1rem));background:radial-gradient(ellipse at 50% 0,#153748 0,#091824 58%,#05090e 100%);border:2px solid rgba(122,232,255,.75);box-shadow:0 0 0 1px #000,0 0 28px rgba(122,232,255,.38),0 0 70px rgba(122,232,255,.12),0 20px 60px #000;overflow:hidden}#rcfg .cfg::after{content:\"\";position:absolute;inset:0;pointer-events:none;z-index:5;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px),radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.5))}#rcfg .cfg::before{content:\"\";position:absolute;left:0;right:0;top:-80px;height:80px;pointer-events:none;z-index:6;background:linear-gradient(transparent,rgba(122,232,255,.07),transparent);animation:rc-sweep 7s linear infinite}#rcfg .cb{position:absolute;width:14px;height:14px;border:2px solid var(--cy);z-index:7;pointer-events:none}#rcfg .c1{top:-1px;left:-1px;border-right:0;border-bottom:0}#rcfg .c2{top:-1px;right:-1px;border-left:0;border-bottom:0}#rcfg .c3{bottom:-1px;left:-1px;border-right:0;border-top:0}#rcfg .c4{bottom:-1px;right:-1px;border-left:0;border-top:0}#rcfg .cfg-h{grid-area:h;display:flex;justify-content:space-between;align-items:center;padding:.8rem 1rem;border-bottom:1px solid var(--ln);background:rgba(122,232,255,.05)}#rcfg .cfg-h h2{font:12px 'Press Start 2P',monospace;color:#fff;text-shadow:0 0 12px var(--cy)}#rcfg .cfg-sub{font:18px VT323,monospace;color:#9bb7c6}#rcfg .led{width:8px;height:8px;background:var(--cy);box-shadow:0 0 8px var(--cy);animation:rc-blink 2s steps(1) infinite}#rcfg .dirty{display:none;font:8px 'Press Start 2P',monospace;color:#ffb454}#rcfg .dirty.on{display:inline}#rcfg .cfg-x{color:#7d98a8;font-size:16px;padding:.2rem .5rem;border:1px solid transparent}#rcfg .cfg-x:hover{color:#fff;border-color:var(--cy);box-shadow:0 0 10px rgba(122,232,255,.5)}#rcfg .cfg-t{grid-area:t;display:flex;flex-direction:column;gap:2px;padding:.6rem;border-right:1px solid var(--ln);background:rgba(0,0,0,.35);overflow:auto}#rcfg .tab{display:flex;align-items:center;gap:.7rem;padding:.8rem;font:9px 'Press Start 2P',monospace;text-transform:uppercase;color:#bdd3df;border:1px solid transparent;border-left:3px solid transparent;text-align:left;transition:.15s}#rcfg .tab:hover{color:#fff;background:rgba(122,232,255,.08)}#rcfg .tab[aria-selected=true]{color:var(--cy);background:linear-gradient(90deg,rgba(122,232,255,.2),transparent);border-left-color:var(--cy);text-shadow:0 0 8px var(--cy)}#rcfg .tf{margin-top:auto;padding:.6rem;font:16px/1.2 VT323,monospace;color:#91abba}#rcfg .cfg-b{grid-area:b;overflow-y:auto;padding:1rem 1.25rem;scrollbar-width:thin;scrollbar-color:var(--cy) #05090e}#rcfg .pane{display:none}#rcfg .pane.on{display:block;animation:rc-pop .2s ease-out}#rcfg .sec{display:flex;align-items:center;gap:.6rem;margin:.9rem 0 .3rem;font:9px 'Press Start 2P',monospace;letter-spacing:.2em;color:#aef5ff;text-shadow:0 0 8px rgba(122,232,255,.55);text-transform:uppercase}#rcfg .sec:first-child{margin-top:.1rem}#rcfg .sec::after{content:\"\";flex:1;height:1px;background:var(--ln)}#rcfg .row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem 1rem;padding:.75rem .7rem;border-bottom:1px dashed rgba(122,232,255,.22);border-left:2px solid transparent;background:rgba(2,12,19,.22);transition:.15s}#rcfg .row:hover,#rcfg .row:focus-within{background:rgba(122,232,255,.06);border-left-color:var(--cy)}#rcfg .row>div:first-child{flex:1 1 10rem}#rcfg .row>:last-child{flex:0 1 15rem}#rcfg .row>.sw,#rcfg .row>.key{flex:0 0 auto}#rcfg .row>.dd{flex:0 0 11rem}#rcfg .nm{font:24px/1 VT323,monospace;letter-spacing:.04em;color:#fff;text-shadow:0 1px 2px #000}#rcfg .ds{font-size:13px;color:#b5cbd6;margin-top:4px}#rcfg .ds.note{padding:.8rem .6rem}#rcfg .rng{display:flex;align-items:center;gap:.7rem}#rcfg .val{min-width:3.6rem;text-align:right;font:24px VT323,monospace;color:#c7fbff;border:1px solid rgba(122,232,255,.55);background:#02070b;padding:0 .5rem;text-shadow:0 0 8px var(--cy)}#rcfg .rng input{--tr:repeating-linear-gradient(90deg,transparent 0 calc(5% - 1px),#02070b calc(5% - 1px) 5%),linear-gradient(90deg,var(--cy) var(--p,50%),#0b1a24 var(--p,50%));flex:1;min-width:0;height:22px;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none}#rcfg .rng input::-webkit-slider-runnable-track{height:10px;border:1px solid var(--ln);background:var(--tr)}#rcfg .rng input::-moz-range-track{height:10px;border:1px solid var(--ln);background:var(--tr)}#rcfg .rng input::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:24px;margin-top:-8px;background:#fff;border:2px solid var(--cy);box-shadow:0 0 14px var(--cy)}#rcfg .rng input::-moz-range-thumb{width:10px;height:18px;border-radius:0;background:#fff;border:2px solid var(--cy);box-shadow:0 0 10px var(--cy)}#rcfg .rng input:hover::-webkit-slider-thumb,#rcfg .rng input:active::-webkit-slider-thumb{background:var(--cy)}#rcfg .rng input:hover::-moz-range-thumb,#rcfg .rng input:active::-moz-range-thumb{background:var(--cy)}#rcfg .rng input:focus{outline:0}#rcfg .rng input:focus-visible::-webkit-slider-thumb{outline:2px dashed #fff;outline-offset:2px}#rcfg .sw{position:relative;width:64px;height:28px;border:1px solid #74b4c8;background:#071621;cursor:pointer;transition:.2s}#rcfg .sw::before{content:\"OFF\";position:absolute;right:7px;top:8px;font:8px 'Press Start 2P',monospace;color:#4d6b7c}#rcfg .sw i{position:absolute;top:3px;left:3px;width:20px;height:20px;background:#5d7a8b;transition:.2s}#rcfg .sw:hover{border-color:var(--cy)}#rcfg .sw[aria-checked=true]{border-color:var(--cy);background:rgba(122,232,255,.15);box-shadow:0 0 12px rgba(122,232,255,.35),inset 0 0 8px rgba(122,232,255,.2)}#rcfg .sw[aria-checked=true]::before{content:\"ON\";right:auto;left:8px;color:var(--cy)}#rcfg .sw[aria-checked=true] i{left:39px;background:var(--cy);box-shadow:0 0 10px var(--cy)}#rcfg .sw:disabled{opacity:.35;pointer-events:none}#rcfg .dd{position:relative}#rcfg .dd-b{width:100%;display:flex;justify-content:space-between;align-items:center;padding:.35rem .6rem;border:1px solid #35566a;background:#04101a;color:#fff;font:20px VT323,monospace;text-align:left}#rcfg .dd-b::after{content:\"\";border:5px solid transparent;border-top-color:var(--cy);margin-top:5px;transition:.15s}#rcfg .dd-b:hover,#rcfg .dd.open .dd-b{border-color:var(--cy);box-shadow:0 0 10px rgba(122,232,255,.3)}#rcfg .dd.open .dd-b::after{transform:rotate(180deg);margin-top:-5px}#rcfg .dd-l{display:none;position:absolute;left:0;right:0;top:calc(100% + 2px);z-index:20;margin:0;padding:0;list-style:none;background:#061520;border:1px solid var(--cy);box-shadow:0 8px 24px #000;outline:0}#rcfg .dd.open .dd-l{display:block}#rcfg .dd.up .dd-l{top:auto;bottom:calc(100% + 2px)}#rcfg .dd-l li{padding:.35rem .6rem;font:20px VT323,monospace;color:#a9c4d3;cursor:pointer}#rcfg .dd-l li.act{background:rgba(122,232,255,.18);color:#fff}#rcfg .dd-l li[aria-selected=true]{color:var(--cy)}#rcfg .dd-l li[aria-selected=true]::before{content:\"\\25B8 \"}#rcfg .key{min-width:8rem;padding:.4rem .7rem;font:9px 'Press Start 2P',monospace;color:var(--cy);border:1px solid #35566a;background:#04101a;box-shadow:inset 0 -3px 0 #0b2a3a;transition:.15s}#rcfg .key:hover{border-color:var(--cy);box-shadow:0 0 10px rgba(122,232,255,.35),inset 0 -3px 0 #0b2a3a}#rcfg .key.on{color:#ffb454;border-color:#ffb454;animation:rc-blink 1s steps(1) infinite}#rcfg .cfg-f{grid-area:f;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;padding:.7rem 1rem;border-top:1px solid var(--ln);background:rgba(0,0,0,.4)}#rcfg .warn{font:20px VT323,monospace;color:#ffb454}#rcfg .gb{position:relative;padding:.75rem 1rem;font:9px 'Press Start 2P',monospace;text-transform:uppercase;color:#bfefff;background:#071722;border:1px solid var(--ln);cursor:pointer;transition:.15s;box-shadow:inset -3px -3px 0 rgba(0,0,0,.5),inset 3px 3px 0 rgba(255,255,255,.1)}#rcfg .gb:hover{color:#fff;border-color:var(--cy);box-shadow:0 0 0 1px var(--cy),0 0 18px rgba(122,232,255,.5),inset 0 0 14px rgba(122,232,255,.25)}#rcfg .gb:active{transform:translateY(2px);background:#0d3347;box-shadow:inset 3px 3px 0 rgba(0,0,0,.6)}#rcfg .gb.p{color:#04141c;background:var(--cy);border-color:#d8f8ff}#rcfg .gb.p:hover{background:#b8f3ff;box-shadow:0 0 0 1px #fff,0 0 22px rgba(122,232,255,.8)}#rcfg .gb.d{color:#ff9b9b;border-color:rgba(255,107,107,.4)}#rcfg .gb.d:hover{color:#fff;border-color:#ff6b6b;box-shadow:0 0 0 1px #ff6b6b,0 0 18px rgba(255,107,107,.5),inset 0 0 14px rgba(255,107,107,.2)}#rcfg .gb:disabled{opacity:.35;pointer-events:none}#rcfg .cfg :focus-visible{outline:2px dashed #fff;outline-offset:2px}#rcfg .cfg-sm{display:block;width:min(24rem,100%);height:auto;padding:1.5rem;text-align:center}@media(max-width:700px){#rcfg .cfg{grid-template:auto auto 1fr auto/1fr;grid-template-areas:\"h\" \"t\" \"b\" \"f\"}#rcfg .cfg-t{flex-direction:row;border-right:0;border-bottom:1px solid var(--ln);padding:.4rem}#rcfg .tf,#rcfg .cfg-sub{display:none}#rcfg .tab{flex:1;justify-content:center;padding:.6rem .3rem;font-size:7px;gap:.4rem;border-left-width:1px}#rcfg .tab svg{display:none}#rcfg .cfg-b{padding:.6rem .7rem}#rcfg .gb{padding:.65rem .7rem}}#rcfg{--cy:#7ae8ff;--ln:rgba(122,232,255,.25);position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:.5rem;background:rgba(0,0,0,.8);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}@media(min-width:640px){#rcfg{padding:1rem}}#rcfg.rc-hidden{display:none}#rcfg button{cursor:pointer;background:none;border:0;margin:0;font-family:inherit;color:inherit}#rcfg .cfg{animation:rc-pop .2s ease-out;color:#e2e8f0;font-family:\"Nunito\",sans-serif;text-align:left}#rcfg .hl{display:flex;align-items:center;gap:.75rem}#rcfg .caret{animation:rc-blink 1s steps(1) infinite}#rcfg .fg{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}#rcfg .askd,#rcfg .askr{display:none}#rcfg .ask-d .askd,#rcfg .ask-r .askr{display:flex}#rcfg .ask-d .norm,#rcfg .ask-r .norm{display:none}#rcfg .warn{font:20px VT323,monospace;color:#ffb454}#rcfg .rc-toast{position:absolute;left:50%;bottom:4.2rem;transform:translateX(-50%);z-index:9;max-width:90%;padding:.5rem .9rem;font:20px VT323,monospace;color:#c7fbff;background:#061520;border:1px solid var(--cy);box-shadow:0 0 14px rgba(122,232,255,.35)}#rcfg .rc-toast.rc-hidden{display:none}@keyframes rc-pop{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}@keyframes rc-blink{50%{opacity:0}}@keyframes rc-sweep{to{top:100%}}";
  const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const DEF = {
    master: 100, bgm: 80, sfx: 95, uiSounds: true, quality: 'high',
    crt: true, vignette: false, colorblind: 'off', reduceMotion: reduced,
    hints: true, timer: true, captions: true, textScale: 'medium', labels: false,
    keys: { interact: 'Space', hint: 'KeyH', inventory: 'KeyI' }
  };
  const CB = {
    protanopia: '1.000 0.000 0.000 0 0 -0.255 1.255 0.000 0 0 0.303 -0.545 1.242 0 0 0 0 0 1 0',
    deuteranopia: '1.000 0.000 0.000 0 0 -0.438 1.438 0.000 0 0 0.262 -0.562 1.300 0 0 0 0 0 1 0',
    tritanopia: '1.050 -0.382 0.332 0 0 0.000 1.234 -0.234 0 0 0.000 0.000 1.000 0 0 0 0 0 1 0'
  };
  const SCHEMA = [
    { id: 'audio', name: 'Audio', icon: '<path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>', rows: [
      ['sec', 'Volume'],
      ['range', 'master', 'Master Volume', 'Overall output level.'],
      ['range', 'bgm', 'Music', 'Chill pixel BGM. Release the slider to preview.'],
      ['range', 'sfx', 'Sound Effects', 'Clicks, pings and puzzle feedback.'],
      ['sec', 'Interface'],
      ['switch', 'uiSounds', 'UI Sounds', 'Hover and click blips in menus.'] ] },
    { id: 'display', name: 'Display', icon: '<path d="M3 4h18v12H3V4zm2 2v8h14V6H5zM8 19h8v2H8z"/>', rows: [
      ['sec', 'Screen'],
      ['fs', 'fullscreen', 'Fullscreen', 'Takes effect immediately; not saved.'],
      ['select', 'quality', 'Graphics Quality', 'Low trims stars and background glow.', 'low,medium,high,ultra'],
      ['select', 'textScale', 'Text Size', 'Labels, puzzle text and pop-ups in the game room.', 'small,medium,large'],
      ['sec', 'Effects'],
      ['switch', 'crt', 'CRT Scanlines', 'Retro terminal scanline overlay.'],
      ['switch', 'vignette', 'Vignette', 'Darkens the screen edges.'],
      ['sec', 'Accessibility'],
      ['select', 'colorblind', 'Colorblind Assist', 'Color-shift filter for red, green or blue weakness.', 'off,protanopia,deuteranopia,tritanopia'],
      ['switch', 'reduceMotion', 'Reduce Motion', 'Stops twinkling stars and menu animations.'] ] },
    { id: 'controls', name: 'Controls', icon: '<path d="M2 6h20v12H2V6zm2 2v8h16V8H4zm2 1h2v2H6V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9zM7 13h10v2H7v-2z"/>', rows: [
      ['sec', 'Keyboard'],
      ['key', 'interact', 'Launch', 'Starts the game from this menu.'],
      ['key', 'hint', 'Request Hint', 'Asks for a hint in the game room.'],
      ['key', 'inventory', 'Inventory', 'Shows the items you collected in the game room.'],
      ['note', 'Click a key box, then press the new key. Esc is reserved and always goes back.'] ] },
    { id: 'gameplay', name: 'Gameplay', icon: '<path d="M10 3h4v3h3v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z"/>', rows: [
      ['sec', 'Assistance'],
      ['switch', 'hints', 'Hints', 'Allow the hint button during puzzles.'],
      ['switch', 'timer', 'Show Timer', 'Show the elapsed time in the game room.'],
      ['switch', 'captions', 'Captions', 'Text captions for sound cues.'],
      ['switch', 'labels', 'Show Object Labels', 'Always show object names in the game room.'] ] }
  ];

  const clone = o => JSON.parse(JSON.stringify(o));
  const cap = x => x[0].toUpperCase() + x.slice(1);
  const kn = c => c === 'Space' ? 'SPACE' : String(c).replace(/^(Key|Digit|Arrow)/, '').toUpperCase();
  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY));
      return x ? { ...clone(DEF), ...x, keys: { ...DEF.keys, ...x.keys } } : clone(DEF);
    } catch (e) { return clone(DEF); }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { console.error(e); } }

  let root, saved, draft, openDD = null, rb = null, opener = null, toastT;
  const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
  const isOpen = () => !!root && !root.classList.contains('rc-hidden');
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(saved);

  /* colour-blind filters, needed by apply() on pages that do not load js/settings.js */
  function ensureFilters() {
    if (document.getElementById('cb-protanopia') || !document.body) return;
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<svg width="0" height="0" style="position:absolute" focusable="false"><defs>' +
      Object.keys(CB).map(k => '<filter id="cb-' + k + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + CB[k] + '"/></filter>').join('') +
      '</defs></svg>';
    document.body.appendChild(box);
    if (!document.getElementById('rc-motion')) {
      const st = document.createElement('style');
      st.id = 'rc-motion';
      st.textContent = '.reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation:none!important;transition:none!important}';
      document.head.appendChild(st);
    }
  }

  /* push a settings object to the page; other scripts listen for 'remediate:settings' */
  function apply(x) {
    ensureFilters();
    const r = document.documentElement;
    r.dataset.quality = x.quality;
    r.classList.toggle('reduce-motion', !!x.reduceMotion);
    r.style.filter = x.colorblind === 'off' ? '' : 'url(#cb-' + x.colorblind + ')';
    /* CRT + vignette on EVERY page: page-local overlays (#crtOverlay, #vignette, .scanlines) and the shared ones (#rs-crt, #rs-vignette) all obey the setting; a page with none gets a shared one */
    const grab = (ids, cls) => ids.map(i => document.getElementById(i)).filter(Boolean).concat(cls ? [...document.querySelectorAll(cls)] : []);
    let crtEls = grab(['rs-crt', 'crtOverlay'], '.scanlines'), vgEls = grab(['rs-vignette', 'vignette']);
    if (document.body && (!crtEls.length || !vgEls.length)) {
      const mk = (id, z, bg) => { const d = document.createElement('div'); d.id = id; d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:fixed;inset:0;z-index:' + z + ';pointer-events:none;background:' + bg; document.body.appendChild(d); return d; };
      if (!crtEls.length) crtEls = [mk('rs-crt', 90, 'repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0,rgba(0,0,0,.28) 1px,transparent 1px,transparent 3px)')];
      if (!vgEls.length) vgEls = [mk('rs-vignette', 89, 'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.65) 100%)')];
    }
    crtEls.forEach(e => { e.style.display = x.crt ? 'block' : 'none'; });
    vgEls.forEach(e => { e.style.display = x.vignette ? 'block' : 'none'; });
    document.dispatchEvent(new CustomEvent('remediate:settings', { detail: x }));
  }

  /* ----- build the panel ----- */
  const el = (t, c, html) => { const e = document.createElement(t); if (c) e.className = c; if (html != null) e.innerHTML = html; return e; };
  function row([t, k, label, desc, opts]) {
    if (t === 'sec') return el('div', 'sec', k);
    if (t === 'note') return el('div', 'ds note', k);
    const r = el('div', 'row', '<div><div class="nm" id="rl-' + k + '">' + label + '</div><div class="ds">' + desc + '</div></div>');
    let c;
    if (t === 'range') {
      c = el('div', 'rng', '<input type="range" min="0" max="100" data-k="' + k + '" aria-labelledby="rl-' + k + '"><output class="val" id="rv-' + k + '"></output>');
    } else if (t === 'switch' || t === 'fs') {
      c = el('button', 'sw', '<i></i>'); c.type = 'button'; c.setAttribute('role', 'switch'); c.setAttribute('aria-labelledby', 'rl-' + k);
      if (t === 'fs') c.dataset.fs = 1; else c.dataset.k = k;
    } else if (t === 'key') {
      c = el('button', 'key'); c.type = 'button'; c.dataset.bind = k; c.setAttribute('aria-labelledby', 'rl-' + k);
    } else {
      c = el('div', 'dd', '<button type="button" class="dd-b" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="rl-' + k + '"></button>' +
        '<ul class="dd-l" role="listbox" tabindex="-1" aria-labelledby="rl-' + k + '">' +
        opts.split(',').map(o => '<li role="option" id="ro-' + k + '-' + o + '" data-v="' + o + '" aria-selected="false">' + cap(o) + '</li>').join('') + '</ul>');
      c.dataset.k = k;
    }
    r.appendChild(c);
    return r;
  }

  function inject() {
    if (root) return;
    const st = document.createElement('style');
    st.id = 'rcfg-css';
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.id = 'rcfg';
    root.className = 'rc-hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'rcfg-title');
    root.innerHTML =
      '<div class="cfg" id="rcfg-panel">' +
        '<i class="cb c1"></i><i class="cb c2"></i><i class="cb c3"></i><i class="cb c4"></i>' +
        '<header class="cfg-h">' +
          '<div class="hl"><span class="led"></span><h2 id="rcfg-title">SYSTEM CONFIG</h2><span class="cfg-sub">// TERMINAL 07<span class="caret">_</span></span></div>' +
          '<div class="hl"><span class="dirty" id="rcfg-dirty">&#9679; UNSAVED</span><button class="cfg-x" type="button" aria-label="Close settings" data-act="back">&#10005;</button></div>' +
        '</header>' +
        '<nav class="cfg-t" id="rcfg-tabs" role="tablist" aria-orientation="vertical" aria-label="Settings categories">' +
          '<div class="tf">BUILD 0.7.2<br>SECTOR 07 &middot; ONLINE<br>&uarr;&darr; NAV &middot; ESC BACK</div></nav>' +
        '<section class="cfg-b" id="rcfg-body"></section>' +
        '<footer class="cfg-f" id="rcfg-foot">' +
          '<div class="fg norm"><button class="gb d" type="button" data-act="reset">Reset to Default</button></div>' +
          '<div class="fg norm"><button class="gb" type="button" id="rcfg-back" data-act="back">Back</button><button class="gb p" type="button" id="rcfg-save" data-act="save">Save Changes</button></div>' +
          '<div class="fg askd"><span class="warn">Discard unsaved changes?</span></div>' +
          '<div class="fg askd"><button class="gb" type="button" id="rcfg-keep" data-act="keep">Keep Editing</button><button class="gb d" type="button" data-act="discard">Discard</button></div>' +
          '<div class="fg askr"><span class="warn">Reset all settings to default?</span></div>' +
          '<div class="fg askr"><button class="gb" type="button" id="rcfg-no" data-act="keep">No</button><button class="gb d" type="button" data-act="resetyes">Yes, Reset</button></div>' +
        '</footer>' +
        '<div class="rc-toast rc-hidden" id="rcfg-toast" role="status"></div>' +
      '</div>';
    document.body.appendChild(root);
    const tabs = q('#rcfg-tabs'), foot = q('.tf'), body = q('#rcfg-body');
    SCHEMA.forEach(p => {
      const tb = el('button', 'tab', '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" fill-rule="evenodd">' + p.icon + '</svg><span>' + p.name + '</span>');
      tb.type = 'button'; tb.id = 'rtab-' + p.id; tb.dataset.pane = p.id; tb.setAttribute('role', 'tab'); tb.setAttribute('aria-controls', 'rpane-' + p.id);
      tabs.insertBefore(tb, foot);
      const pn = el('div', 'pane'); pn.id = 'rpane-' + p.id; pn.setAttribute('role', 'tabpanel'); pn.setAttribute('aria-labelledby', tb.id);
      p.rows.forEach(r => pn.appendChild(row(r)));
      body.appendChild(pn);
    });
    wire();
    tab('audio');
  }

  /* ----- draft -> UI ----- */
  function render() {
    qa('[data-k]').forEach(e => {
      const k = e.dataset.k, v = draft[k];
      if (e.type === 'range') { e.value = v; e.style.setProperty('--p', v + '%'); q('#rv-' + k).textContent = v + '%'; }
      else if (e.classList.contains('sw')) e.setAttribute('aria-checked', !!v);
      else if (e.classList.contains('dd')) { e.querySelector('.dd-b').textContent = cap(String(v)); e.querySelectorAll('li').forEach(li => li.setAttribute('aria-selected', li.dataset.v === String(v))); }
    });
    qa('[data-bind]').forEach(b => { if (b !== rb) b.textContent = kn(draft.keys[b.dataset.bind]); });
    const f = q('[data-fs]'), d = dirty();
    f.setAttribute('aria-checked', !!document.fullscreenElement);
    f.disabled = !document.documentElement.requestFullscreen;
    q('#rcfg-dirty').classList.toggle('on', d);
    q('#rcfg-save').disabled = !d;
  }
  function set(k, v) { draft[k] = v; apply(draft); render(); }

  function tab(id, focus) {
    ddClose();
    qa('.tab').forEach(t => { const on = t.dataset.pane === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (focus && on) t.focus(); });
    qa('.pane').forEach(p => p.classList.toggle('on', p.id === 'rpane-' + id));
    q('#rcfg-body').scrollTop = 0;
  }

  /* ----- custom dropdown ----- */
  function ddClose() { if (!openDD) return; openDD.classList.remove('open', 'up'); openDD.querySelector('.dd-b').setAttribute('aria-expanded', 'false'); openDD = null; }
  function ddAct(dd, li) { dd.querySelectorAll('li').forEach(x => x.classList.toggle('act', x === li)); dd.querySelector('.dd-l').setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
  function ddOpen(dd) {
    ddClose(); dd.classList.add('open'); dd.querySelector('.dd-b').setAttribute('aria-expanded', 'true'); openDD = dd;
    const l = dd.querySelector('.dd-l'), r = l.getBoundingClientRect(), p = q('#rcfg-body').getBoundingClientRect();
    if (r.bottom > p.bottom && dd.getBoundingClientRect().top - r.height > p.top) dd.classList.add('up');
    ddAct(dd, dd.querySelector('[aria-selected=true]') || dd.querySelector('li')); l.focus();
  }
  function ddPick(dd, li) { set(dd.dataset.k, li.dataset.v); ddClose(); dd.querySelector('.dd-b').focus(); }

  /* ----- key rebinding ----- */
  function startRebind(b) { rbStop(); rb = b; b.classList.add('on'); b.textContent = 'PRESS A KEY...'; }
  function rbStop() { if (!rb) return; rb.classList.remove('on'); rb = null; render(); }
  function toast(msg) {
    const t = q('#rcfg-toast');
    t.textContent = msg; t.classList.remove('rc-hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('rc-hidden'), 2600);
  }
  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => toast('Your browser refused fullscreen.'));
  }

  /* ----- open / back / save / reset ----- */
  const ask = mode => {
    const f = q('#rcfg-foot');
    f.classList.toggle('ask-d', mode === 'd'); f.classList.toggle('ask-r', mode === 'r');
    if (mode === 'd') q('#rcfg-keep').focus(); else if (mode === 'r') q('#rcfg-no').focus(); else q('#rcfg-back').focus();
  };
  const asking = () => q('#rcfg-foot').classList.contains('ask-d') || q('#rcfg-foot').classList.contains('ask-r');
  function open() {
    inject();
    opener = document.activeElement;
    saved = load(); draft = clone(saved);
    ask(null); apply(draft); render(); tab('audio');
    root.classList.remove('rc-hidden');
    q('.tab[aria-selected=true]').focus();
  }
  function leave() {
    ddClose(); rbStop(); q('#rcfg-foot').classList.remove('ask-d', 'ask-r');
    draft = clone(saved); apply(saved);
    root.classList.add('rc-hidden');
    if (opener && opener.focus) opener.focus();
  }
  function back() { if (asking()) return ask(null); dirty() ? ask('d') : leave(); }
  function save() { saved = clone(draft); persist(); leave(); }
  function resetYes() {
    saved = clone(DEF); persist(); draft = clone(saved); apply(draft); render(); ask(null);
    toast('Settings reset to default.');
  }
  const act = a => ({ back, save, keep: () => ask(null), discard: leave, reset: () => ask('r'), resetyes: resetYes })[a]();

  /* ----- events ----- */
  function wire() {
    root.addEventListener('input', e => { const x = e.target; if (x.type === 'range') set(x.dataset.k, +x.value); });
    root.addEventListener('click', e => {
      const c = s => e.target.closest(s);
      if (c('[data-act]')) return act(c('[data-act]').dataset.act);
      if (c('.tab')) return tab(c('.tab').dataset.pane);
      if (c('.key')) return startRebind(c('.key'));
      if (c('.dd-b')) { const dd = c('.dd'); return dd === openDD ? ddClose() : ddOpen(dd); }
      if (c('.dd-l li')) return ddPick(c('.dd'), c('li'));
      const sw = c('.sw') || (!c('.rng') && c('.row') && c('.row').querySelector('.sw'));
      if (sw) { if (sw.dataset.fs) return toggleFS(); set(sw.dataset.k, !draft[sw.dataset.k]); }
      if (openDD && !c('.dd')) ddClose();
    });
    root.addEventListener('focusout', e => { if (e.target === rb) rbStop(); });
    root.addEventListener('keydown', e => {
      if (rb) return;                      // the rebind handler below owns this key
      const l = e.target.closest('.dd-l');
      if (l) {
        const dd = l.parentNode, it = [...l.children], i = it.findIndex(x => x.classList.contains('act')), go = n => { e.preventDefault(); ddAct(dd, it[(n + it.length) % it.length]); };
        if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(-1);
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ddPick(dd, it[Math.max(i, 0)]); }
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); ddClose(); dd.querySelector('.dd-b').focus(); }
        e.stopPropagation(); return;
      }
      if (e.target.matches('.dd-b') && e.key === 'ArrowDown') { e.preventDefault(); ddOpen(e.target.parentNode); }
      const t = e.target.closest('.tab'), d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (t && d) { e.preventDefault(); const all = qa('.tab'); tab(all[(all.indexOf(t) + d + all.length) % all.length].dataset.pane, true); }
      else if (e.key === 'Escape') { e.preventDefault(); back(); }
      else if (e.key === 'Tab') {            // keep Tab inside the panel
        const f = qa('button,[tabindex="0"]').filter(x => !x.disabled && x.tabIndex >= 0 && x.offsetParent), i = f.indexOf(document.activeElement);
        if (f.length && e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (f.length && !e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      e.stopPropagation();                   // game-room shortcuts (hint, inventory) must not fire while this is open
    });
  }

  /* key being rebound: runs before every other key handler on the page */
  addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (!rb) { if (!root.contains(e.target)) { e.stopPropagation(); if (e.key === 'Escape') back(); } return; }
    e.preventDefault(); e.stopPropagation();
    if (/^(Shift|Control|Alt|Meta|OS)/.test(e.code)) return;
    if (e.code === 'Escape') return rbStop();
    if (['Tab', 'Enter', 'NumpadEnter'].includes(e.code)) return toast('Tab and Enter are used by the menus.');
    const a = rb.dataset.bind, other = Object.keys(draft.keys).find(x => x !== a && draft.keys[x] === e.code);
    if (other) draft.keys[other] = draft.keys[a];   // swap on conflict
    draft.keys[a] = e.code; rbStop();
  }, true);
  document.addEventListener('fullscreenchange', () => { if (isOpen()) render(); });

  window.openRemediateSettings = open;
  document.addEventListener('DOMContentLoaded', () => { apply(load()); });
  addEventListener('storage', e => { if (e.key === KEY) { apply(load()); } });
  return { open, get: load, apply: () => apply(load()) };
})();