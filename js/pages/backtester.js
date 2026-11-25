/* Backtester: long-only strategies, next-bar-open execution, costs, equity curve and stats. */
App.register('backtester', {
  title: 'Backtester', group: 'Trading',
  desc: 'Test a trading rule on past prices. See returns, drawdown, win rate and every trade.',
  strategies: {
    sma: { name: 'Moving-average crossover', params: [['fast', 'Fast SMA', 20], ['slow', 'Slow SMA', 50]],
      run(c, p) { const f = Ind.sma(c, p.fast), s = Ind.sma(c, p.slow); return c.map((_, i) => f[i] == null || s[i] == null ? null : f[i] > s[i]); } },
    rsi: { name: 'RSI mean reversion', params: [['len', 'RSI length', 14], ['buy', 'Buy below', 30], ['sell', 'Sell above', 55]],
      run(c, p) { const r = Ind.rsi(c, p.len); let pos = false; return c.map((_, i) => { if (r[i] == null) return null; if (!pos && r[i] < p.buy) pos = true; else if (pos && r[i] > p.sell) pos = false; return pos; }); } },
    breakout: { name: 'Channel breakout', params: [['entry', 'Entry high (bars)', 20], ['exit', 'Exit low (bars)', 10]],
      run(c, p) { let pos = false; return c.map((x, i) => { if (i < p.entry) return null; const hi = Math.max(...c.slice(i - p.entry, i)), lo = Math.min(...c.slice(i - p.exit, i)); if (!pos && x > hi) pos = true; else if (pos && x < lo) pos = false; return pos; }); } },
    macd: { name: 'MACD crossover', params: [['fast', 'Fast EMA', 12], ['slow', 'Slow EMA', 26], ['sig', 'Signal', 9]],
      run(c, p) { const m = Ind.macd(c, p.fast, p.slow, p.sig); return c.map((_, i) => m.hist[i] == null ? null : m.hist[i] > 0); } },
    hold: { name: 'Buy and hold', params: [], run(c) { return c.map(() => true); } },
  },

  render(el) {
    el.innerHTML = `
      <div class="card" id="btPick"></div>
      <div class="card"><div class="row">
        <label>Strategy<select id="btS">${Object.entries(this.strategies).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join('')}</select></label>
        <span id="btP" class="row" style="margin:0"></span>
        <label>Starting capital<input id="btCap" type="number" value="10000"></label>
        <label>Cost per trade (%)<input id="btFee" type="number" step="0.01" value="0.1"></label>
        <button id="btRun">Run backtest</button></div></div>
      <div id="btOut"></div>`;
    const params = () => { const s = this.strategies[$('#btS').value]; $('#btP').innerHTML = s.params.map(([k, l, d]) => `<label>${l}<input type="number" data-k="${k}" value="${d}"></label>`).join(''); };
    $('#btS').onchange = params; params();
    dataPicker($('#btPick'), s => { this.series = s; this.run(); });
    $('#btRun').onclick = () => this.series && this.run();
  },

  run() {
    const s = this.series, c = s.map(b => b.close);
    const strat = this.strategies[$('#btS').value];
    const p = {}; $$('#btP input').forEach(i => p[i.dataset.k] = num(i.value));
    const want = strat.run(c, p), cap0 = num($('#btCap').value), fee = num($('#btFee').value) / 100;
    let cash = cap0, sh = 0, entry = null; const eq = [], trades = [];
    for (let i = 0; i < s.length; i++) {
      // A signal on bar i-1's close is filled at bar i's open (no look-ahead).
      if (i > 0 && want[i - 1] != null) {
        const px = s[i].open;
        if (want[i - 1] && sh === 0) { sh = cash * (1 - fee) / px; cash = 0; entry = { date: s[i].date, px }; }
        else if (!want[i - 1] && sh > 0) { cash = sh * px * (1 - fee); trades.push({ ...entry, exitDate: s[i].date, exitPx: px, ret: (px / entry.px) * (1 - fee) ** 2 - 1 }); sh = 0; }
      }
      eq.push(cash + sh * s[i].close);
    }
    if (sh > 0) trades.push({ ...entry, exitDate: s.at(-1).date + ' (open)', exitPx: s.at(-1).close, ret: (s.at(-1).close / entry.px) * (1 - fee) - 1 });
    const bh = c.map(x => cap0 * x / c[0]);
    const st = this.stats(eq, trades, s.length);
    $('#btOut').innerHTML = `
      <div class="card"><div class="stats">
        ${[['Total return', pct(st.ret), cls(st.ret)], ['Buy & hold', pct((c.at(-1) / c[0] - 1) * 100), ''], ['Annual return (CAGR)', pct(st.cagr), cls(st.cagr)], ['Max drawdown', pct(-st.mdd), 'down'],
           ['Sharpe ratio', fmt(st.sharpe), ''], ['Trades', st.n, ''], ['Win rate', st.n ? fmt(st.win, 1) + '%' : '—', ''], ['Avg trade', pct(st.avg), cls(st.avg)],
           ['Profit factor', fmt(st.pf), ''], ['Final value', fmt(eq.at(-1)), '']].map(([a, b, k]) => `<div class="stat"><small>${a}</small><b class="${k}">${b}</b></div>`).join('')}
      </div></div>
      <div class="card"><div class="chart-box"><canvas id="btEq"></canvas></div></div>
      <div class="card"><h2 style="margin-top:0">Trades</h2><div style="max-height:320px;overflow:auto"><table><tr><th>Entry</th><th class="num">Price</th><th>Exit</th><th class="num">Price</th><th class="num">Return</th></tr>
        ${trades.map(t => `<tr><td>${t.date}</td><td class="num">${fmt(t.px)}</td><td>${t.exitDate}</td><td class="num">${fmt(t.exitPx)}</td><td class="num ${cls(t.ret)}">${pct(t.ret * 100)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No trades</td></tr>'}</table></div></div>
      <p class="note">Past results do not predict future results. Trades fill at the next bar's open, with costs charged on entry and exit.</p>`;
    lineChart($('#btEq'), s.map(b => b.date), [{ label: 'Strategy', data: eq, borderWidth: 2 }, { label: 'Buy & hold', data: bh, color: '#8b98a5' }]);
  },

  stats(eq, trades, bars) {
    const ret = (eq.at(-1) / eq[0] - 1) * 100, yrs = bars / 252;
    const cagr = (Math.pow(eq.at(-1) / eq[0], 1 / Math.max(yrs, 1e-9)) - 1) * 100;
    let peak = eq[0], mdd = 0; eq.forEach(v => { peak = Math.max(peak, v); mdd = Math.max(mdd, (peak - v) / peak * 100); });
    const r = eq.slice(1).map((v, i) => v / eq[i] - 1), m = r.reduce((a, b) => a + b, 0) / r.length;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length);
    const wins = trades.filter(t => t.ret > 0), losses = trades.filter(t => t.ret <= 0);
    const gw = wins.reduce((a, t) => a + t.ret, 0), gl = -losses.reduce((a, t) => a + t.ret, 0);
    return { ret, cagr, mdd, sharpe: sd ? m / sd * Math.sqrt(252) : 0, n: trades.length, win: trades.length ? wins.length / trades.length * 100 : 0,
      avg: trades.length ? trades.reduce((a, t) => a + t.ret, 0) / trades.length * 100 : 0, pf: gl ? gw / gl : (gw ? Infinity : 0) };
  },
});
