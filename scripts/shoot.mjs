import { chromium } from 'playwright-core';
const [,, w = '1440', h = '900', tag = 'd', reduced = '0'] = process.argv;
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduced === '1' ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:4500/');
await p.waitForTimeout(600);
const shots = [['hero0', '#hero', 0], ['hero1', '#hero', .5], ['hero2', '#hero', 1], ['method', '#method', .3], ['board', '#board', .1], ['board2', '#board', .6],
  ['m0', '#machine', 0], ['m1', '#machine', .35], ['m2', '#machine', .7], ['m3', '#machine', 1], ['l0', '#ledger', .02], ['l1', '#ledger', .5], ['l2', '#ledger', .98], ['after', '#aftermath', .35], ['close', '#close', .2]];
for (const [n, sel, f] of shots) {
  await p.evaluate(([s, f]) => { const e = document.querySelector(s); const span = Math.max(0, e.offsetHeight - innerHeight); scrollTo(0, e.offsetTop + f * (span || e.offsetHeight * 0.4)); }, [sel, f]);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `lab/${tag}_${n}.png` });
}
const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
console.log(JSON.stringify(m), 'errors:', JSON.stringify(errs));
await b.close();
