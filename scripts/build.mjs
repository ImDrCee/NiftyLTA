// Builds data.js for the NiftyLTA page from data/daily, data/monthly and data/fundamentals.
// Run: node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r/g, '');
const num = (s) => (s === '' || s === undefined ? null : Number(s));

const STOCKS = [
  { sym: 'RELIANCE', name: 'Reliance Industries', group: 'Energy and conglomerates', kind: 'nonfin' },
  { sym: 'BHARTIARTL', name: 'Bharti Airtel', group: 'Telecom', kind: 'nonfin' },
  { sym: 'HDFCBANK', name: 'HDFC Bank', group: 'Banks and lenders', kind: 'bank' },
  { sym: 'ICICIBANK', name: 'ICICI Bank', group: 'Banks and lenders', kind: 'bank' },
  { sym: 'SBIN', name: 'State Bank of India', group: 'Banks and lenders', kind: 'bank' },
  { sym: 'BAJFINANCE', name: 'Bajaj Finance', group: 'Banks and lenders', kind: 'nbfc' },
  { sym: 'TCS', name: 'Tata Consultancy Services', group: 'IT services', kind: 'nonfin' },
  { sym: 'INFY', name: 'Infosys', group: 'IT services', kind: 'nonfin' },
  { sym: 'LT', name: 'Larsen and Toubro', group: 'Energy and conglomerates', kind: 'nonfin' },
  { sym: 'HINDUNILVR', name: 'Hindustan Unilever', group: 'Consumer and pharma', kind: 'nonfin' },
  { sym: 'SUNPHARMA', name: 'Sun Pharma', group: 'Consumer and pharma', kind: 'nonfin' },
];

const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const TAX = 0.25;
const RESULT_LAG_DAYS = 55;
const MERGE_GAP = 2; // touches this many months apart or less form one episode

const median = (a) => {
  const s = a.filter((x) => x !== null && Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const r1 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0));
}
function quarterEnd(label) {
  const [mon, y] = label.split(' ');
  return new Date(Date.UTC(Number(y), MON[mon], 0));
}

// ---------- prices ----------
function loadMonthly(sym) {
  const rows = rd(`data/monthly/${sym}_monthly.csv`).trim().split('\n').slice(1).map((l) => l.split(','));
  return rows.map((c) => ({
    m: c[0], o: +c[1], h: +c[2], l: +c[3], c: +c[4],
    sma20: num(c[5]), up: num(c[6]), lo: num(c[7]), sma9: num(c[8]), partial: c[9] === '1',
  }));
}

// independent recomputation of the bands straight from daily candles (guards the awk step)
function crossCheck(sym, monthly) {
  const rows = rd(`data/daily/${sym}_daily.csv`).trim().split('\n').slice(1).map((l) => l.split(','));
  const byM = new Map();
  for (const [d, o, h, l, c] of rows) {
    const k = d.slice(0, 7);
    const b = byM.get(k);
    if (!b) byM.set(k, { o: +o, h: +h, l: +l, c: +c });
    else { b.h = Math.max(b.h, +h); b.l = Math.min(b.l, +l); b.c = +c; }
  }
  const keys = [...byM.keys()];
  let worst = 0;
  keys.forEach((k, i) => {
    const mm = monthly[i];
    if (mm.m !== k) throw new Error(`${sym}: month mismatch ${mm.m} vs ${k}`);
    const b = byM.get(k);
    for (const f of ['o', 'h', 'l', 'c']) if (Math.abs(mm[f] - b[f]) > 1e-9) throw new Error(`${sym} ${k} ${f} differs`);
    if (i >= 19) {
      const cl = keys.slice(i - 19, i + 1).map((x) => byM.get(x).c);
      const mu = mean(cl);
      const sd = Math.sqrt(mean(cl.map((x) => (x - mu) ** 2)));
      worst = Math.max(worst, Math.abs(mu + 2 * sd - mm.up), Math.abs(mu - 2 * sd - mm.lo));
    }
    if (i >= 8) {
      const s9 = mean(keys.slice(i - 8, i + 1).map((x) => byM.get(x).c));
      worst = Math.max(worst, Math.abs(s9 - mm.sma9));
    }
  });
  if (worst > 0.011) throw new Error(`${sym}: band cross-check off by ${worst}`);
  return worst;
}

// ---------- fundamentals ----------
function loadQuarterly(sym) {
  const lines = rd(`data/fundamentals/${sym}_quarterly.csv`).trim().split('\n');
  const head = lines[0].split(',').slice(1);
  const rows = {};
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    rows[c[0]] = c.slice(1).map(num);
  }
  return { head, rows };
}

function normaliseQuarters(stock) {
  const { head, rows } = loadQuarterly(stock.sym);
  const g = (label, i) => (rows[label] ? rows[label][i] : null);
  const qs = head.map((label, i) => {
    const eps = g('EPS in Rs', i);
    const np = g('Net Profit', i);
    const shares = eps ? np / eps : null; // crore shares
    const q = { label, end: quarterEnd(label), shares, eps, np };
    if (stock.kind === 'nonfin') {
      q.rev = g('Sales', i);
      q.op = g('Operating Profit', i);
      q.oi = g('Other Income', i);
      q.int = g('Interest', i);
      q.dep = g('Depreciation', i);
      q.pbt = g('Profit before tax', i);
    } else {
      q.rev = g('Revenue', i) - g('Interest', i); // net interest income proxy
      q.fp = g('Financing Profit', i);
      q.oi = g('Other Income', i);
      q.dep = g('Depreciation', i) || 0;
      q.pbt = g('Profit before tax', i);
    }
    return q;
  });
  const excluded = new Set();
  if (stock.sym === 'HDFCBANK') excluded.add('Jun 2023'); // pre-merger, not like for like
  const usable = qs.filter((q) => !excluded.has(q.label));
  const oiMed = median(usable.map((q) => q.oi));
  for (const q of usable) {
    if (stock.kind === 'nonfin') {
      q.profit = q.op - q.dep - q.int + oiMed; // other income replaced by the stock's own median
      q.oiFlag = Math.abs(q.oi - oiMed) > 0.25 * Math.abs(q.pbt);
    } else if (stock.kind === 'nbfc') {
      q.profit = q.fp + oiMed - q.dep;
      q.oiFlag = Math.abs(q.oi - oiMed) > 0.25 * Math.abs(q.pbt);
    } else {
      q.profit = q.pbt; // banks: pre-tax profit after provisions, fee income is core so no stripping
      q.oiFlag = false;
    }
    q.neps = (q.profit * (1 - TAX)) / q.shares;
  }
  return { quarters: usable, all: qs, oiMed, excluded: [...excluded] };
}

function snapshot(fund, asOf) {
  const known = fund.quarters.filter((q) => new Date(q.end.getTime() + RESULT_LAG_DAYS * 864e5) <= asOf);
  if (!known.length) return null;
  const last4 = known.slice(-4);
  const k = last4.length;
  const rr = (f) => (mean(last4.map(f)) * 4);
  return {
    q: known[known.length - 1].label,
    nq: known.length,
    full: k === 4,
    qRev: known[known.length - 1].rev,
    qProfit: known[known.length - 1].profit,
    rrRev: rr((q) => q.rev),
    rrProfit: rr((q) => q.profit),
    rrEps: rr((q) => q.neps),
    flags: last4.filter((q) => q.oiFlag).map((q) => q.label),
  };
}

// ---------- episodes ----------
function findEpisodes(mo) {
  const out = [];
  for (const side of ['TOP', 'BOTTOM']) {
    const hits = [];
    mo.forEach((b, i) => {
      if (b.up === null) return;
      if (side === 'TOP' ? b.h >= b.up : b.l <= b.lo) hits.push(i);
    });
    let cur = null;
    for (const i of hits) {
      if (cur && i - cur.idx[cur.idx.length - 1] <= MERGE_GAP) cur.idx.push(i);
      else { cur = { side, idx: [i] }; out.push(cur); }
    }
  }
  return out.map((e) => {
    const f = e.idx[0], l = e.idx[e.idx.length - 1];
    const sub = e.idx;
    const over = (i) => (e.side === 'TOP' ? mo[i].h / mo[i].up - 1 : 1 - mo[i].l / mo[i].lo); // positive = beyond band
    let peak = sub[0];
    for (const i of sub) if (over(i) > over(peak)) peak = i;
    const closed = sub.filter((i) => (e.side === 'TOP' ? mo[i].c >= mo[i].up : mo[i].c <= mo[i].lo)).length;
    const fwd = (n) => (f + n < mo.length && !mo[f + n].partial ? r1((mo[f + n].c / mo[f].c - 1) * 100) : null);
    return {
      side: e.side, start: mo[f].m, end: mo[l].m, peak: mo[peak].m, months: sub.length, closed,
      overshoot: r1(over(peak) * 100),
      priceStart: mo[f].c, pricePeak: mo[peak].c,
      fwd3: fwd(3), fwd6: fwd(6), fwd12: fwd(12),
      ongoing: l === mo.length - 1,
      _f: f, _p: peak,
    };
  }).sort((a, b) => (a.start < b.start ? -1 : 1));
}

// ---------- assemble ----------
const result = { generated: new Date().toISOString().slice(0, 10), stocks: [] };

for (const stock of STOCKS) {
  const mo = loadMonthly(stock.sym);
  const drift = crossCheck(stock.sym, mo);
  const fund = normaliseQuarters(stock);
  const now = mo[mo.length - 1];
  const nowSnap = snapshot(fund, new Date('2100-01-01'));
  const pe = (price, s) => (s && s.rrEps > 0 ? price / s.rrEps : null);

  // per-month snapshot for the time-machine cursor
  const months = mo.map((b) => {
    const s = snapshot(fund, monthEnd(b.m));
    return {
      m: b.m, o: b.o, h: b.h, l: b.l, c: b.c,
      up: b.up === null ? null : r2(b.up), lo: b.lo === null ? null : r2(b.lo),
      mid: b.sma20 === null ? null : r2(b.sma20), s9: b.sma9 === null ? null : r2(b.sma9),
      partial: b.partial,
      f: s ? { q: s.q, full: s.full, pe: r1(pe(b.c, s)), rev: Math.round(s.rrRev), eps: r2(s.rrEps), qRev: Math.round(s.qRev) } : null,
    };
  });

  const episodes = findEpisodes(mo).map((e) => {
    const s = snapshot(fund, monthEnd(mo[e._p].m));
    const peE = s ? pe(mo[e._p].c, s) : null;
    const peNow = pe(now.c, nowSnap);
    const o = { ...e };
    delete o._f; delete o._p;
    o.fund = s ? {
      q: s.q, full: s.full, flags: s.flags,
      pe: r1(peE),
      rrRev: Math.round(s.rrRev), rrEps: r2(s.rrEps), qRev: Math.round(s.qRev),
      revNowPct: r1((nowSnap.rrRev / s.rrRev - 1) * 100),
      qRevNowPct: r1((nowSnap.qRev / s.qRev - 1) * 100),
      epsNowPct: r1((nowSnap.rrEps / s.rrEps - 1) * 100),
      priceNowPct: r1((now.c / mo[e._p].c - 1) * 100),
      peNow: r1(peNow),
    } : null;
    return o;
  });

  // zones
  // zones use the month's High for the ceiling and Low for the floor (month to date for the current bar)
  const toUp = (now.up / now.h - 1) * 100; // positive = High still below the ceiling
  const aboveLo = (now.l / now.lo - 1) * 100; // positive = Low still above the floor
  const closeToUp = (now.up / now.c - 1) * 100;
  const closeAboveLo = (now.c / now.lo - 1) * 100;
  const topIn = now.h >= now.up ? 'crossed' : now.h >= now.up * 0.95 ? 'within5' : now.h >= now.up * 0.9 ? 'within10' : null;
  const botIn = now.l <= now.lo ? 'crossed' : now.l <= now.lo * 1.05 ? 'within5' : now.l <= now.lo * 1.1 ? 'within10' : null;
  const pos = (now.c - now.lo) / (now.up - now.lo); // 0 = lower band, 1 = upper band, on the close
  const side = pos >= 0.5 ? 'TOP' : 'BOTTOM';
  const rank = { crossed: 0, within5: 1, within10: 2 };
  let zone = { side: 'MID', level: 'mid' };
  if (topIn && botIn) zone = rank[topIn] < rank[botIn] || (rank[topIn] === rank[botIn] && side === 'TOP') ? { side: 'TOP', level: topIn } : { side: 'BOTTOM', level: botIn };
  else if (topIn) zone = { side: 'TOP', level: topIn };
  else if (botIn) zone = { side: 'BOTTOM', level: botIn };

  const bw = mo.filter((b) => b.up !== null).map((b) => (b.up - b.lo) / b.sma20);
  const bwNow = bw[bw.length - 1];
  const bwPct = Math.round((bw.filter((x) => x <= bwNow).length / bw.length) * 100);

  // verdict
  const refSide = zone.side === 'MID' ? side : zone.side;
  const refs = episodes.filter((e) => e.side === refSide && !e.ongoing && e.fund).slice(-3);
  const refFull = refs.filter((e) => e.fund.full);
  const refUse = refFull.length ? refFull : refs;
  const peThen = median(refUse.map((e) => e.fund.pe));
  const peNow = pe(now.c, nowSnap);
  let rel = null;
  if (peThen && peNow) rel = peNow / peThen - 1;
  const prior4 = fund.quarters.slice(-8, -4);
  const last4 = fund.quarters.slice(-4);
  const epsGrowth = prior4.length === 4 ? (mean(last4.map((q) => q.neps)) / mean(prior4.map((q) => q.neps)) - 1) * 100 : null;

  const placeWord = zone.side === 'TOP' ? (zone.level === 'crossed' ? 'High has touched the upper band' : 'High is near the upper band')
    : zone.side === 'BOTTOM' ? (zone.level === 'crossed' ? 'Low has touched the lower band' : 'Low is near the lower band')
    : (side === 'TOP' ? 'Mid-band, nearer the upper band' : 'Mid-band, nearer the lower band');
  let val = 'no earlier touch has earnings data to compare';
  let valKey = 'none';
  if (rel !== null) {
    const t = refSide === 'TOP' ? 'ceilings' : 'floors';
    if (rel < -0.15) { val = `cheaper on earnings than past ${t}`; valKey = 'cheaper'; }
    else if (rel > 0.15) { val = `dearer on earnings than past ${t}`; valKey = 'dearer'; }
    else { val = `valued like past ${t}`; valKey = 'similar'; }
  }
  const tag = `${placeWord}, ${val}`;
  const confidence = refUse.length && refUse.every((e) => e.fund.full) ? 'medium' : 'low';

  // base rates from completed episodes
  const base = (side, k) => {
    const v = episodes.filter((e) => e.side === side && e[k] !== null).map((e) => e[k]);
    return { n: v.length, median: r1(median(v)) };
  };

  result.stocks.push({
    sym: stock.sym, name: stock.name, group: stock.group, kind: stock.kind,
    cmp: now.c, asOf: '2026-10-14', partialMonth: now.partial,
    band: { up: r2(now.up), lo: r2(now.lo), mid: r2(now.sma20), s9: r2(now.sma9) },
    toUpperPct: r1(toUp), aboveLowerPct: r1(aboveLo), closeToUpperPct: r1(closeToUp), closeAboveLowerPct: r1(closeAboveLo),
    mHigh: now.h, mLow: now.l, pos: r2(pos),
    bothEdges: !!(topIn && botIn),
    zone, vsS9Pct: r1((now.c / now.sma9 - 1) * 100),
    s9Slope3m: r1((now.sma9 / mo[mo.length - 4].sma9 - 1) * 100),
    bandwidthPct: r1(bwNow * 100), bandwidthRank: bwPct,
    months, episodes,
    base: { top: { f3: base('TOP', 'fwd3'), f6: base('TOP', 'fwd6'), f12: base('TOP', 'fwd12') }, bottom: { f3: base('BOTTOM', 'fwd3'), f6: base('BOTTOM', 'fwd6'), f12: base('BOTTOM', 'fwd12') } },
    now: {
      q: nowSnap.q, nq: nowSnap.nq, rrRev: Math.round(nowSnap.rrRev), rrEps: r2(nowSnap.rrEps), pe: r1(peNow),
      qRev: Math.round(nowSnap.qRev), epsGrowthPct: r1(epsGrowth), flags: nowSnap.flags,
    },
    verdict: { tag, valKey, refSide, peThen: r1(peThen), relPct: rel === null ? null : r1(rel * 100), refs: refUse.map((e) => e.peak), confidence },
    norm: { oiMedian: Math.round(fund.oiMed), excluded: fund.excluded, flagged: fund.quarters.filter((q) => q.oiFlag).map((q) => q.label) },
    check: { bandDrift: drift },
  });
}

fs.writeFileSync(path.join(ROOT, 'data.js'), 'window.NIFTYLTA = ' + JSON.stringify(result) + ';\n');
console.log('wrote data.js', (fs.statSync(path.join(ROOT, 'data.js')).size / 1024).toFixed(0) + ' KB');
for (const s of result.stocks) {
  console.log(`${s.sym.padEnd(11)} cmp ${String(s.cmp).padStart(8)}  up ${String(s.toUpperPct).padStart(5)}%  lo+ ${String(s.aboveLowerPct).padStart(5)}%  ${s.zone.side}/${s.zone.level}  PE ${s.now.pe}  | ${s.verdict.tag} (${s.verdict.relPct}% vs ${s.verdict.peThen}, ${s.verdict.confidence}) crossDrift=${s.check.bandDrift.toExponential(1)}`);
}
