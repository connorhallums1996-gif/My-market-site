/* Signals: rule-based technical signals on the latest bar, with a price chart. */
App.register('signals', {
  title: 'Signals', group: 'Trading',
  desc: 'Technical buy/sell signals (moving averages, RSI, MACD, Bollinger Bands) on any price series.',
  render(el) {
    el.innerHTML = `<div class="card" id="sgPick"></div><div id="sgOut"></div>`;
    dataPicker($('#sgPick'), (s, label) => this.show(s, label));
  },

  compute(series) {
    const c = series.map(b => b.close), i = c.length - 1;
    const s50 = Ind.sma(c, 50), s200 = Ind.sma(c, Math.min(200, c.length - 1)), s20 = Ind.sma(c, 20);
    const rsi = Ind.rsi(c), macd = Ind.macd(c), bb = Ind.bollinger(c);
    const sig = [];
    const add = (name, score, detail) => sig.push({ name, score, detail });
    add('Price vs 50-day average', c[i] > s50[i] ? 1 : -1, `Close ${fmt(c[i])} vs SMA50 ${fmt(s50[i])}`);
    add('Trend (50 vs 200 average)', s50[i] > s200[i] ? 1 : -1, s50[i] > s200[i] ? 'Golden-cross regime (50 above 200)' : 'Death-cross regime (50 below 200)');
    add('RSI(14)', rsi[i] < 30 ? 1 : rsi[i] > 70 ? -1 : 0, `RSI ${fmt(rsi[i], 1)} — ${rsi[i] < 30 ? 'oversold' : rsi[i] > 70 ? 'overbought' : 'neutral zone'}`);
    add('MACD', macd.hist[i] > 0 ? 1 : -1, `MACD ${fmt(macd.line[i], 3)} vs signal ${fmt(macd.signal[i], 3)}`);
    add('Bollinger Bands', c[i] < bb.lower[i] ? 1 : c[i] > bb.upper[i] ? -1 : 0, `Price ${c[i] < bb.lower[i] ? 'below lower band' : c[i] > bb.upper[i] ? 'above upper band' : 'inside the bands'}`);
    add('20-day momentum', c[i] > c[i - 20] ? 1 : -1, `${pct((c[i] / c[i - 20] - 1) * 100)} over 20 bars`);
    const total = sig.reduce((a, x) => a + x.score, 0);
    return { sig, total, s20, s50, s200, rsi, bb };
  },

  show(series, label) {
    const r = this.compute(series), n = r.sig.length;
    const verdict = r.total >= 2 ? ['buy', 'Bullish'] : r.total <= -2 ? ['sell', 'Bearish'] : ['neutral', 'Neutral'];
    const tail = series.slice(-180), off = series.length - tail.length;
    $('#sgOut').innerHTML = `
      <div class="card"><div class="row" style="justify-content:space-between;align-items:center">
        <h2 style="margin:0">${esc(label)} — overall: <span class="badge ${verdict[0]}">${verdict[1]}</span> <span class="muted">(score ${r.total} of ±${n})</span></h2></div>
        <table><tr><th>Signal</th><th>Reading</th><th>Detail</th></tr>
        ${r.sig.map(s => `<tr><td>${s.name}</td><td><span class="badge ${s.score > 0 ? 'buy' : s.score < 0 ? 'sell' : 'neutral'}">${s.score > 0 ? 'Buy' : s.score < 0 ? 'Sell' : 'Neutral'}</span></td><td class="muted">${s.detail}</td></tr>`).join('')}
        </table></div>
      <div class="card"><div class="chart-box"><canvas id="sgC"></canvas></div></div>
      <div class="card"><div class="chart-box" style="height:180px"><canvas id="sgR"></canvas></div></div>
      <p class="note">Signals are simple rules, not predictions. Test any rule in the Backtester before you trust it.</p>`;
    const L = tail.map(b => b.date), sl = a => a.slice(off);
    lineChart($('#sgC'), L, [
      { label: 'Close', data: tail.map(b => b.close), borderWidth: 2 },
      { label: 'SMA 50', data: sl(r.s50) }, { label: 'SMA 200', data: sl(r.s200) },
      { label: 'Upper band', data: sl(r.bb.upper), borderDash: [4, 4], color: '#5dd3d3' },
      { label: 'Lower band', data: sl(r.bb.lower), borderDash: [4, 4], color: '#5dd3d3' },
    ]);
    lineChart($('#sgR'), L, [{ label: 'RSI 14', data: sl(r.rsi), color: '#b084f5' }], { y: { min: 0, max: 100 } });
  },
});
