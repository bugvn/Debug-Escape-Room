// One command that runs every test group and writes a report you can paste into your paper.
//   node tools/run-tests.js            (or: npm run test:report)
// Writes test-report.md and test-report.csv in the project folder. Exit code 1 if any test failed.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const T = (d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.test.js')).map((f) => d + '/' + f);

const GROUPS = [
  { name: 'Unit', what: 'one function or module at a time (scoring, adaptive rules, anti-cheat, analytics, lesson gate rules, login form rules)',
    files: ['tests/adaptive.test.js', 'tests/score.test.js', 'tests/integrity.test.js', 'tests/analytics.test.js', 'tests/progress.test.js', 'tests/login.test.js', 'tests/lesson-extra.test.js', 'tests/analytics-extra.test.js'] },
  { name: 'Integration', what: 'modules working together (account + level + lecture gate, puzzle bank + rules + scoring)', files: T('tests/integration') },
  { name: 'System', what: 'the whole site end to end without a browser (pages, files, links, full player journey, real Python puzzle check)',
    files: ['tests/project.test.js', ...T('tests/system')] }
];

const rows = [];
for (const g of GROUPS) {
  let n = 0;
  for (const f of g.files) {
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', f], { cwd: ROOT, encoding: 'utf8' });
    for (const line of (r.stdout || '').split('\n')) {
      const m = line.match(/^(not ok|ok) \d+ - (.+?)(?: # (SKIP|skip).*)?$/);
      if (!m) continue;
      n++;
      rows.push({ group: g.name, id: g.name.slice(0, 3).toUpperCase() + '-' + String(n).padStart(3, '0'), file: f.replace('tests/', ''), name: m[2].trim(), result: m[3] ? 'SKIP' : m[1] === 'ok' ? 'PASS' : 'FAIL' });
    }
    if (r.status !== 0 && !rows.some((x) => x.file === f.replace('tests/', ''))) rows.push({ group: g.name, id: g.name.slice(0, 3).toUpperCase() + '-ERR', file: f, name: 'file could not run', result: 'FAIL' });
  }
}

const count = (g, res) => rows.filter((r) => (!g || r.group === g) && (!res || r.result === res)).length;
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
let md = `# REMEDIATE test report\n\nRun: ${stamp}  \nCommand: \`node tools/run-tests.js\`\n\n## Summary\n\n| Level | What it checks | Tests | Passed | Failed | Skipped |\n| --- | --- | ---: | ---: | ---: | ---: |\n`;
for (const g of GROUPS) md += `| ${g.name} | ${g.what} | ${count(g.name)} | ${count(g.name, 'PASS')} | ${count(g.name, 'FAIL')} | ${count(g.name, 'SKIP')} |\n`;
md += `| **Total** | | **${count()}** | **${count(null, 'PASS')}** | **${count(null, 'FAIL')}** | **${count(null, 'SKIP')}** |\n`;
for (const g of GROUPS) {
  md += `\n## ${g.name} tests\n\n| ID | Test | File | Result |\n| --- | --- | --- | --- |\n`;
  rows.filter((r) => r.group === g.name).forEach((r) => { md += `| ${r.id} | ${r.name.replace(/\|/g, '/')} | ${r.file} | ${r.result} |\n`; });
}
md += `\nBrowser-only checks (Google sign-in, real Supabase, clicking through the game) are in tests/MANUAL-TEST-CASES.md.\n`;
fs.writeFileSync(path.join(ROOT, 'test-report.md'), md);
fs.writeFileSync(path.join(ROOT, 'test-report.csv'), 'id,level,test,file,result\n' + rows.map((r) => [r.id, r.group, `"${r.name.replace(/"/g, '""')}"`, r.file, r.result].join(',')).join('\n') + '\n');

console.log('\nREMEDIATE test report  (' + stamp + ')\n');
for (const g of GROUPS) console.log(`${g.name.padEnd(12)} ${String(count(g.name, 'PASS')).padStart(3)} passed  ${String(count(g.name, 'FAIL')).padStart(3)} failed  ${String(count(g.name, 'SKIP')).padStart(3)} skipped   (${count(g.name)} tests)`);
console.log(`${'TOTAL'.padEnd(12)} ${String(count(null, 'PASS')).padStart(3)} passed  ${String(count(null, 'FAIL')).padStart(3)} failed  ${String(count(null, 'SKIP')).padStart(3)} skipped   (${count()} tests)`);
const failed = rows.filter((r) => r.result === 'FAIL');
if (failed.length) { console.log('\nFAILED:'); failed.forEach((r) => console.log('  ' + r.id + '  ' + r.name + '  [' + r.file + ']')); }
console.log('\nWrote test-report.md and test-report.csv');
process.exit(failed.length ? 1 : 0);