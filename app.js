(() => {
  const D = window.NIFTYLTA;
  const S = D.stocks;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ml = (m) => { const [y, mo] = m.split('-'); return MON[+mo - 1] + ' ' + y; };
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: n >= 100 ? 0 : 2 });
  const num = (n, d = 1) => (n === null || n === undefined ? 'n/a' : Number(n).toFixed(d));
  const pct = (n) => (n === null || n === undefined ? 'n/a' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1) + '%');
  const cr = (n) => Number(n).toLocaleString('en-IN') + ' cr';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  const cls = (z) => (z.side === 'TOP' ? 'top' : z.side === 'BOTTOM' ? 'bot' : 'mid');
  const zoneText = (z) => z.side === 'MID' ? 'Between the zones'
    : z.level === 'crossed' ? (z.side === 'TOP' ? 'Above the ceiling' : 'Below the floor')
    : `Within ${z.level === 'within5' ? 5 : 10}% of the ${z.side === 'TOP' ? 'ceiling' : 'floor'}`;
  const nearest = (s) => (Math.abs(s.toUpperPct) < Math.abs(s.aboveLowerPct)
    ? { side: 'ceiling', v: Math.abs(s.toUpperPct), word: s.toUpperPct >= 0 ? 'below the ceiling' : 'above the ceiling' }
    : { side: 'floor', v: Math.abs(s.aboveLowerPct), word: s.aboveLowerPct >= 0 ? 'above the floor' : 'below the floor' });
  const closeness = (s) => nearest(s).v;
  const byClose = S.slice().sort((a, b) => closeness(a) - closeness(b));
  const byPos = S.slice().sort((a, b) => a.pos - b.pos);
  const label = (s) => (s.kind === 'nonfin' ? 'Sales' : 'Net interest income');

  $('#asof').textContent = 'As of 14 Oct 2026, October bar still forming';

  // zone geometry (fractions of the band width) so the 5% and 10% ends are honest per stock
  const zoneShapes = (s) => {
    const w = s.band.up - s.band.lo;
    const f = (p, side) => (side === 'b' ? (p * s.band.lo) / w : (p * s.band.up) / w) * 100;
    return `<i class="z b10" style="width:${f(0.10, 'b')}%"></i><i class="z b5" style="width:${f(0.05, 'b')}%"></i>`
      + `<i class="z t10" style="width:${f(0.10, 't')}%"></i><i class="z t5" style="width:${f(0.05, 't')}%"></i>`;
  };

  /* ---------- hero rails ---------- */
  const rails = $('#rails');
  rails.innerHTML = byPos.map((s) => {
    const n = nearest(s);
    return `<li class="rail"><span class="rail-name">${s.sym}</span>
      <div class="track" role="img" aria-label="${s.sym}: ${zoneText(s.zone)}">${zoneShapes(s)}<i class="dot ${s.zone.side === 'MID' ? '' : cls(s.zone)}"></i></div>
      <span class="rail-val">${n.v.toFixed(1)}% ${n.word}</span></li>`;
  }).join('');
  const heroDots = [...rails.querySelectorAll('.dot')];
  let trackW = 0;

  /* ---------- method schematic ---------- */
  (() => {
    const N = 62, win = 14, W = 520, H = 300;
    const p = Array.from({ length: N }, (_, i) => 150 + 46 * Math.sin(i / 7.5) + 13 * Math.sin(i / 2.4) + i * 0.55);
    const roll = p.map((_, i) => {
      if (i < win - 1) return null;
      const w = p.slice(i - win + 1, i + 1); const mu = w.reduce((a, b) => a + b) / win;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - mu) ** 2, 0) / win);
      return { mu, up: mu + 2 * sd, lo: mu - 2 * sd };
    });
    const lo = Math.min(...p, ...roll.filter(Boolean).map((r) => r.lo)), hi = Math.max(...p, ...roll.filter(Boolean).map((r) => r.up));
    const X = (i) => 8 + (i / (N - 1)) * (W - 90); const Y = (v) => 20 + (1 - (v - lo) / (hi - lo)) * (H - 40);
    const idx = roll.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
    const poly = idx.map((i) => `${X(i)},${Y(roll[i].up)}`).join(' ') + ' ' + idx.slice().reverse().map((i) => `${X(i)},${Y(roll[i].lo)}`).join(' ');
    const line = (f) => idx.map((i) => `${X(i)},${Y(f(roll[i]))}`).join(' ');
    const sma = p.map((_, i) => (i >= 8 ? `${X(i)},${Y(p.slice(i - 8, i + 1).reduce((a, b) => a + b) / 9)}` : null)).filter(Boolean).join(' ');
    const last = idx[idx.length - 1];
    const labels = [[Y(roll[last].up), 'ceiling', '#B03519'], [Y(p[last]), 'price', '#15130F'], [Y(roll[last].lo), 'floor', '#17636B']].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < labels.length; i++) if (labels[i][0] - labels[i - 1][0] < 16) labels[i][0] = labels[i - 1][0] + 16;
    $('#schem').innerHTML = `
      <polygon points="${poly}" fill="rgba(21,19,15,.06)"/>
      <polyline points="${line((r) => r.up)}" fill="none" stroke="#B03519" stroke-width="2"/>
      <polyline points="${line((r) => r.lo)}" fill="none" stroke="#17636B" stroke-width="2"/>
      <polyline points="${sma}" fill="none" stroke="#8B8371" stroke-width="1.6" stroke-dasharray="5 4"/>
      <polyline points="${p.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="#15130F" stroke-width="2.2" stroke-linejoin="round"/>
      <g font-size="13" font-family="system-ui,sans-serif">
        ${labels.map((l) => `<text x="${X(last) + 8}" y="${l[0] + 4}" fill="${l[2]}">${l[1]}</text>`).join('')}
        <text x="${X(N - 1) - 10}" y="${H - 4}" fill="#5B5549" text-anchor="end">9 month average, dashed</text>
      </g>`;
  })();

  /* ---------- board ---------- */
  const groups = [
    { key: 'within5', title: 'Within 5% of an edge' },
    { key: 'within10', title: 'Within 10% of an edge' },
    { key: 'mid', title: 'Between the zones' },
  ];
  $('#board-groups').innerHTML = groups.map((g) => {
    const list = byClose.filter((s) => s.zone.level === g.key);
    if (!list.length) return '';
    return `<div class="group"><h3>${g.title}</h3><div class="cards">${list.map((s) => {
      const v = s.verdict;
      const rel = v.relPct === null ? '' : `<span>P/E <b>${num(s.now.pe)}</b> now vs <b>${num(v.peThen)}</b> at past ${v.refSide === 'TOP' ? 'ceilings' : 'floors'}</span>`;
      return `<button class="card" data-sym="${s.sym}" aria-label="${s.name}, open in the time machine">
        <div class="card-top"><strong>${s.sym}</strong><span>${inr(s.cmp)}</span></div>
        <div class="name">${s.name}</div>
        <div class="track" aria-hidden="true">${zoneShapes(s)}<i class="dot ${s.zone.side === 'MID' ? '' : cls(s.zone)}" style="left:${clamp(s.pos, -0.03, 1.03) * 100}%"></i></div>
        <div class="band-ends"><span>floor ${inr(s.band.lo)}</span><span>ceiling ${inr(s.band.up)}</span></div>
        <div class="tag">${esc(v.tag)}.</div>
        <div class="meta">${rel}<span>9M avg <b>${pct(s.vsS9Pct)}</b></span></div>
        <div class="conf">${v.confidence === 'low' ? 'Low confidence: ' + (v.relPct === null ? 'no earnings history at an earlier touch' : 'earnings run-rate from fewer than four quarters') : 'Medium confidence'}</div>
      </button>`;
    }).join('')}</div></div>`;
  }).join('');

  /* ---------- ledger ---------- */
  const epRow = (s, e) => {
    const f = e.fund; const side = e.side === 'TOP' ? 'Ceiling' : 'Floor';
    const when = e.start === e.end ? ml(e.start) : `${ml(e.start)} to ${ml(e.end)}`;
    const dc = (v) => (v === null ? '' : v >= 0 ? 'pos' : 'neg');
    const fw = [e.fwd3, e.fwd6, e.fwd12].map((v) => (v === null ? 'n/a' : pct(v))).join(' / ');
    return `<div class="ep"><div class="ep-h"><b class="${e.side === 'TOP' ? 'top' : 'bot'}">${side}${e.ongoing ? ', ongoing' : ''}</b><span>${when}</span></div>
      <dl>
        <dt>Peak month</dt><dd>${ml(e.peak)} at ${inr(e.pricePeak)}, ${e.closed} of ${e.months} closed beyond</dd>
        ${f && e.ongoing && f.priceNowPct === 0 ? `<dt>Then to now</dt><dd>this is the current month</dd><dt>P/E now</dt><dd>${num(f.peNow)}</dd>` : f ? `<dt>Price then to now</dt><dd class="${dc(f.priceNowPct)}">${pct(f.priceNowPct)}</dd>
        <dt>P/E then to now</dt><dd>${num(f.pe)} to ${num(f.peNow)}${f.full ? '' : ' (under 4 quarters)'}</dd>
        <dt>Core EPS then to now</dt><dd>${pct(f.epsNowPct)}</dd>
        <dt>${label(s)}</dt><dd>${pct(f.revNowPct)}</dd>` : `<dt>Earnings</dt><dd>Before the data starts</dd>`}
        <dt>After 3 / 6 / 12 months</dt><dd>${e.ongoing ? 'too early' : fw}</dd>
      </dl></div>`;
  };
  $('#ledger-track').innerHTML = byClose.map((s) => {
    const tops = s.episodes.filter((e) => e.side === 'TOP').slice(-2);
    const bots = s.episodes.filter((e) => e.side === 'BOTTOM').slice(-2);
    const all = [...tops, ...bots].sort((a, b) => (a.start < b.start ? 1 : -1));
    return `<article class="sheet"><div class="sheet-head"><strong>${s.sym}</strong><span>${inr(s.cmp)}</span></div>
      <p class="sheet-sub">${esc(zoneText(s.zone))}. P/E now ${num(s.now.pe)} on results to ${s.now.q}.</p>
      ${all.length ? all.map((e) => epRow(s, e)).join('') : '<p class="empty">No touches in the data window.</p>'}</article>`;
  }).join('');

  /* ---------- aftermath ---------- */
  (() => {
    const pool = (side) => {
      const rows = ['fwd3', 'fwd6', 'fwd12'].map((k, i) => {
        const v = S.flatMap((s) => s.episodes.filter((e) => e.side === side && e[k] !== null).map((e) => e[k]));
        return `<div class="pool-row"><span>After ${[3, 6, 12][i]} months</span><span>${pct(median(v))} median, ${v.length} episodes</span></div>`;
      }).join('');
      return `<div class="pool ${side === 'TOP' ? 'top' : 'bot'}"><h3>After touching the ${side === 'TOP' ? 'ceiling' : 'floor'}</h3>${rows}</div>`;
    };
    $('#pooled').innerHTML = pool('TOP') + pool('BOTTOM');
    $('#dots').innerHTML = byPos.map((s) => {
      const pts = s.episodes.filter((e) => e.fwd6 !== null);
      return `<li class="drow"><b>${s.sym}</b><div class="dline">${pts.map((e, i) => `<i class="pt ${e.side === 'TOP' ? 'top' : 'bot'}" style="left:${clamp(50 + e.fwd6, 2, 98)}%;transition-delay:${i * 70}ms" title="${s.sym} ${e.side === 'TOP' ? 'ceiling' : 'floor'} ${ml(e.start)}: ${pct(e.fwd6)}"></i>`).join('')}<span class="sr">${pts.map((e) => `${e.side === 'TOP' ? 'ceiling' : 'floor'} ${ml(e.start)} ${pct(e.fwd6)}`).join(', ') || 'no completed episodes'}</span></div></li>`;
    }).join('');
  })();

  /* ---------- close ---------- */
  (() => {
    const fl = byClose.filter((s) => s.zone.side === 'BOTTOM').map((s) => `${s.sym} (${s.aboveLowerPct.toFixed(1)}% above)`);
    const ce = byClose.filter((s) => s.zone.side === 'TOP').map((s) => `${s.sym} (${Math.abs(s.toUpperPct).toFixed(1)}% below)`);
    const mid = S.filter((s) => s.zone.side === 'MID').length;
    $('#close-line').textContent = `Within 10% of the floor: ${fl.join(', ') || 'none'}. Within 10% of the ceiling: ${ce.join(', ') || 'none'}. The other ${mid} sit between the zones.`;
  })();

  /* ---------- time machine ---------- */
  const machine = $('#machine');
  const layers = $('#chart-layers');
  const cursor = $('#cursor');
  const cursorLabel = $('#cursor-label');
  const readout = $('#readout');
  const scrub = $('#scrub');
  const chips = $('#chips');
  let cur = null, geo = null, shownIdx = -1, narrow = innerWidth < 760;

  chips.innerHTML = S.map((s) => `<button class="chip" role="radio" aria-checked="false" data-sym="${s.sym}">${s.sym}</button>`).join('');

  function buildChart(st) {
    const W = narrow ? 600 : 1000, H = narrow ? 400 : 580, L = 8, R = narrow ? 52 : 62, T = 14, B = 26;
    const ms = st.months.slice(19); const n = ms.length;
    const lo = Math.min(...ms.map((m) => Math.min(m.l, m.lo))), hi = Math.max(...ms.map((m) => Math.max(m.h, m.up)));
    const pad = (hi - lo) * 0.04, y0 = lo - pad, y1 = hi + pad, step = (W - L - R) / n;
    const X = (i) => L + (i + 0.5) * step, Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const fs = narrow ? 15 : 11;
    const band = ms.map((m, i) => `${X(i)},${Y(m.up)}`).join(' ') + ' ' + ms.map((m, i) => `${X(ms.length - 1 - i)},${Y(ms[ms.length - 1 - i].lo)}`).join(' ');
    const ln = (f) => ms.map((m, i) => `${X(i).toFixed(1)},${Y(f(m)).toFixed(1)}`).join(' ');
    const bw = step * 0.5;
    const candles = ms.map((m, i) => {
      const x = X(i), up = m.c >= m.o, yt = Y(Math.max(m.o, m.c)), yb = Y(Math.min(m.o, m.c));
      return `<line x1="${x}" x2="${x}" y1="${Y(m.h)}" y2="${Y(m.l)}" stroke="#F3EFE6" stroke-width="1.2"/><rect x="${x - bw / 2}" y="${yt}" width="${bw}" height="${Math.max(1.4, yb - yt)}" fill="${up ? '#F3EFE6' : '#15130F'}" stroke="#F3EFE6" stroke-width="1.2"/>`;
    }).join('');
    const ticks = Array.from({ length: 5 }, (_, k) => y0 + ((y1 - y0) * (k + 0.5)) / 5).map((v) => `<text x="${W - R + 6}" y="${Y(v) + 4}" fill="#A79F8E" font-size="${fs}">${Math.round(v).toLocaleString('en-IN')}</text>`).join('');
    const years = ms.map((m, i) => (m.m.endsWith('-01') || i === 0 ? `<text x="${X(i)}" y="${H - 6}" fill="#A79F8E" font-size="${fs}" text-anchor="middle">${m.m.slice(0, 4)}</text>` : '')).join('');
    const rings = st.episodes.map((e) => {
      const i = ms.findIndex((m) => m.m === e.peak); if (i < 0) return '';
      const top = e.side === 'TOP';
      return `<circle cx="${X(i)}" cy="${Y(top ? ms[i].h : ms[i].l)}" r="${narrow ? 8 : 7}" fill="none" stroke="${top ? '#F08467' : '#5FC3CC'}" stroke-width="2"/>`;
    }).join('');
    const svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><polygon points="${band}" fill="rgba(243,239,230,.07)"/>
      <polyline points="${ln((m) => m.up)}" fill="none" stroke="#F08467" stroke-width="1.8"/>
      <polyline points="${ln((m) => m.lo)}" fill="none" stroke="#5FC3CC" stroke-width="1.8"/>
      <polyline points="${ln((m) => m.s9)}" fill="none" stroke="#E0A53A" stroke-width="1.6" stroke-dasharray="5 4"/>
      ${candles}${rings}${ticks}${years}</svg>`;
    geo = { n, W, L, step, ms };
    return svg;
  }

  function monthZone(m) {
    if (m.h >= m.up) return { c: 'top', t: 'Touched the ceiling' };
    if (m.l <= m.lo) return { c: 'bot', t: 'Touched the floor' };
    if (m.c >= m.up * 0.95) return { c: 'top', t: 'Within 5% of the ceiling' };
    if (m.c >= m.up * 0.90) return { c: 'top', t: 'Within 10% of the ceiling' };
    if (m.c <= m.lo * 1.05) return { c: 'bot', t: 'Within 5% of the floor' };
    if (m.c <= m.lo * 1.10) return { c: 'bot', t: 'Within 10% of the floor' };
    return { c: 'mid', t: 'Between the zones' };
  }

  function renderReadout(i) {
    const m = geo.ms[i], st = cur, z = monthZone(m), f = m.f;
    const posIn = ((m.c - m.lo) / (m.up - m.lo)) * 100;
    const dPE = f && f.pe && st.now.pe ? (st.now.pe / f.pe - 1) * 100 : null;
    const revWord = label(st);
    readout.innerHTML = `<div class="ro-month">${ml(m.m)}${m.partial ? ' <small style="font-size:.4em;letter-spacing:.04em">so far</small>' : ''}</div>
      <span class="ro-badge ${z.c}">${z.t}</span>
      <dl class="ro-grid">
        <div><dt>Close</dt><dd>${inr(m.c)} <small>now ${pct((st.cmp / m.c - 1) * 100)}</small></dd></div>
        <div><dt>Position in band</dt><dd>${Math.round(posIn)} <small>0 is the floor, 100 the ceiling</small></dd></div>
        <div><dt>P/E on core earnings</dt><dd>${f ? num(f.pe) : 'n/a'} <small>now ${num(st.now.pe)}${dPE === null ? '' : ', ' + pct(dPE)}</small></dd></div>
        <div><dt>${revWord} run-rate</dt><dd>${f ? cr(f.rev) : 'n/a'} <small>${f ? 'now ' + pct((st.now.rrRev / f.rev - 1) * 100) : ''}</small></dd></div>
      </dl>
      <p class="ro-note">${f ? `Earnings known by the end of this month: results to ${f.q}${f.full ? '' : ', run-rate from fewer than four quarters'}.` : 'No quarterly results in the dataset yet for this month. Screener history starts at June 2023.'}</p>`;
  }

  function placeCursor(t) {
    const x = geo.L + (t + 0.5) * geo.step, xp = (x / geo.W) * 100;
    const w = layers.clientWidth;
    cursor.style.transform = `translate3d(${(xp / 100) * w}px,0,0)`;
    $('.live', layers).style.clipPath = `inset(0 ${100 - xp}% 0 0)`;
    const i = clamp(Math.round(t), 0, geo.n - 1);
    if (i !== shownIdx) { shownIdx = i; cursorLabel.textContent = ml(geo.ms[i].m); renderReadout(i); }
  }

  function selectStock(sym) {
    const st = S.find((s) => s.sym === sym); if (!st || st === cur) return;
    cur = st; shownIdx = -1;
    const svg = buildChart(st);
    layers.innerHTML = svg.replace('<svg', '<svg class="ghost"') + svg.replace('<svg', '<svg class="live"');
    cursor.style.height = layers.clientHeight + 'px';
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.sym === sym)));
    $('#scrub-now').textContent = ml(geo.ms[geo.n - 1].m);
    $('#scrub-then').textContent = ml(geo.ms[0].m);
    placeCursor((geo.n - 1) * (1 - smooth.machine));
  }

  chips.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) selectStock(b.dataset.sym); });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.card'); if (!c) return;
    selectStock(c.dataset.sym);
    scrollTo({ top: machine.offsetTop, behavior: reduce ? 'auto' : 'smooth' });
  });
  scrub.addEventListener('input', () => {
    const span = machine.offsetHeight - innerHeight;
    scrollTo({ top: machine.offsetTop + (scrub.value / 1000) * span, behavior: 'auto' });
  });

  /* ---------- pan ---------- */
  const ledger = $('#ledger'), track = $('#ledger-track');
  let panMax = 0;
  function fitSheets() {
    document.querySelectorAll('.sheet').forEach((sh) => {
      sh.querySelectorAll('.ep[hidden]').forEach((e) => { e.hidden = false; });
      sh.querySelector('.ep-more')?.remove();
      const eps = [...sh.querySelectorAll('.ep')];
      let hid = 0;
      const more = document.createElement('p');
      more.className = 'sheet-sub ep-more';
      sh.appendChild(more);
      while (eps.length - hid > 1 && sh.scrollHeight > sh.clientHeight + 1) {
        eps[eps.length - 1 - hid].hidden = true; hid++;
        more.textContent = hid + (hid === 1 ? ' older touch' : ' older touches') + ' in the time machine';
      }
      if (!hid) more.remove();
    });
  }
  function sizePan() {
    fitSheets();
    if (reduce) return;
    panMax = Math.max(0, track.scrollWidth - innerWidth);
    ledger.style.height = innerHeight + panMax + 'px';
  }

  /* ---------- reveal and stagger ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    const k = document.querySelectorAll('.wipe.in').length;
    schem.style.clipPath = `inset(0 ${100 - (k / 4) * 100}% 0 0)`;
  }, { threshold: 0.35 });
  const schem = $('#schem');
  schem.style.clipPath = 'inset(0 100% 0 0)';
  schem.style.transition = reduce ? 'none' : 'clip-path .9s cubic-bezier(.2,.9,.25,1)';
  document.querySelectorAll('.wipe, .card, .pt').forEach((el, i) => {
    if (el.classList.contains('card')) el.style.transitionDelay = (i % 3) * 90 + 'ms';
    io.observe(el);
  });
  if (reduce) { document.querySelectorAll('.wipe, .card, .pt').forEach((el) => el.classList.add('in')); schem.style.clipPath = 'inset(0 0 0 0)'; }

  /* ---------- scroll loop: targets from scroll, values spring toward them ---------- */
  const hero = $('#hero');
  const smooth = { hero: 0, machine: 0, ledger: 0 };
  const target = { hero: 0, machine: 0, ledger: 0 };
  const progress = (el) => clamp(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight), 0, 1);
  const ease = (t) => 1 - (1 - t) ** 3;
  let last = performance.now(), running = false;

  function measure() { trackW = rails.querySelector('.track').clientWidth; }
  function apply() {
    const h = smooth.hero;
    heroDots.forEach((d, i) => {
      const s = byPos[i], t = ease(clamp(h * 1.45 - i * 0.03, 0, 1));
      const x = (0.5 + (clamp(s.pos, -0.03, 1.03) - 0.5) * t) * trackW;
      d.style.transform = `translate3d(${x}px,0,0)`;
    });
    if (cur) placeCursor((geo.n - 1) * (1 - smooth.machine));
    if (!reduce) track.style.transform = `translate3d(${-smooth.ledger * panMax}px,0,0)`;
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt / 0.07);
    let moving = false;
    for (const key of ['hero', 'machine', 'ledger']) {
      const d = target[key] - smooth[key];
      if (Math.abs(d) > 0.0004) { smooth[key] += d * k; moving = true; } else smooth[key] = target[key];
    }
    apply();
    if (moving) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function onScroll() {
    target.hero = progress(hero);
    target.machine = progress(machine);
    target.ledger = reduce ? 0 : progress(ledger);
    const mr = machine.getBoundingClientRect();
    document.body.classList.toggle('on-night', mr.top <= 40 && mr.bottom > 40);
    if (document.activeElement !== scrub) scrub.value = Math.round(target.machine * 1000);
    kick();
  }
  function onResize() {
    const wasNarrow = narrow; narrow = innerWidth < 760;
    measure(); sizePan();
    if (cur && wasNarrow !== narrow) { const s = cur; cur = null; selectStock(s.sym); }
    else if (cur) cursor.style.height = layers.clientHeight + 'px';
    onScroll();
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);

  const first = byClose.find((s) => s.zone.side !== 'MID') || S[0];
  measure(); sizePan();
  selectStock(first.sym);
  onScroll();
  smooth.hero = target.hero; smooth.machine = target.machine; smooth.ledger = target.ledger;
  apply();
  requestAnimationFrame(() => { sizePan(); onScroll(); });
})();
