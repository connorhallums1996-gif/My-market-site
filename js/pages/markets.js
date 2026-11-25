/* Leaderboard (top gainers/losers/most active) and Market Mood Meter (bull vs bear gauge). */
App.register('leaderboard', {
  title: 'Leaderboard', group: 'Markets',
  desc: "Today's biggest US stock gainers, losers and most-traded names, plus a ranking of your own watchlist.",
  render(el) {
    el.innerHTML = `<div class="card"><div class="row"><label>Show<select id="lbT"><option value="top_gainers">Top gainers</option><option value="top_losers">Top losers</option><option value="most_actively_traded">Most active</option></select></label>
      <label>Minimum price<input id="lbMin" type="number" value="1"></label><span id="lbMsg" class="muted"></span></div><div id="lbOut"></div></div>
      <div class="card"><h2 style="margin-top:0">My watchlist league</h2><p class="muted">Ranks your symbols by % change over the last ~100 trading days. Each symbol uses one Alpha Vantage call (free key: ~25/day).</p>
      <div class="row"><label style="flex:1">Symbols (comma separated)<input id="lbW" value="${esc(Store.get('watch', 'AAPL,MSFT,NVDA,AMZN,GOOGL'))}"></label><button id="lbGo">Rank</button></div><div id="lbWOut"></div></div>
      <p class="muted" style="font-size:12px">Source: Alpha Vantage. The gainers/losers list works with the public demo key; add your own key in Settings for the watchlist.</p>`;
    let data;
    const draw = () => {
      if (!data) return;
      const rows = (data[$('#lbT').value] || []).filter(r => +r.price >= num($('#lbMin').value));
      $('#lbOut').innerHTML = `<table><tr><th>#</th><th>Ticker</th><th class="num">Price</th><th class="num">Change</th><th class="num">Change %</th><th class="num">Volume</th></tr>${rows.map((r, i) => {
        const p = parseFloat(r.change_percentage); return `<tr><td>${i + 1}</td><td><b>${esc(r.ticker)}</b></td><td class="num">${fmt(+r.price)}</td><td class="num ${cls(p)}">${fmt(+r.change_amount)}</td><td class="num ${cls(p)}">${pct(p)}</td><td class="num">${(+r.volume).toLocaleString()}</td></tr>`; }).join('')}</table>`;
    };
    getJSON(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${Data.avKey()}`).then(j => {
      if (!$('#lbMsg')) return;
      if (!j.top_gainers) throw new Error(j.Information || j.Note || 'No data');
      data = j; $('#lbMsg').textContent = 'Updated ' + j.last_updated; draw();
    }).catch(e => { if (!$('#lbMsg')) return; $('#lbMsg').textContent = e.message; $('#lbMsg').className = 'err'; });
    $('#lbT').onchange = draw; $('#lbMin').oninput = draw;
    $('#lbGo').onclick = async () => {
      const syms = $('#lbW').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean); Store.set('watch', syms.join(','));
      const out = []; $('#lbWOut').innerHTML = '<p class="muted">Loading…</p>';
      for (const s of syms) {
        try { const d = await Data.alphaVantageDaily(s); out.push({ s, ret: (d.at(-1).close / d[0].close - 1) * 100, last: d.at(-1).close, d1: (d.at(-1).close / d.at(-2).close - 1) * 100 }); }
        catch (e) { out.push({ s, err: e.message }); }
      }
      out.sort((a, b) => (b.ret ?? -1e9) - (a.ret ?? -1e9));
      $('#lbWOut').innerHTML = `<table><tr><th>Rank</th><th>Symbol</th><th class="num">Last</th><th class="num">1 day</th><th class="num">~100 days</th></tr>${out.map((r, i) => r.err ? `<tr><td>—</td><td>${r.s}</td><td colspan="3" class="err">${esc(r.err)}</td></tr>` :
        `<tr><td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td><td><b>${r.s}</b></td><td class="num">${fmt(r.last)}</td><td class="num ${cls(r.d1)}">${pct(r.d1)}</td><td class="num ${cls(r.ret)}">${pct(r.ret)}</td></tr>`).join('')}</table>`;
    };
  },
});

App.register('mood', {
  title: 'Market Mood Meter', group: 'Markets',
  desc: 'A bull-vs-bear gauge built from trend, momentum, volatility and futures positioning.',
  render(el) {
    el.innerHTML = `<div class="card" id="mdPick"></div>
      <div class="grid2"><div class="card" style="text-align:center"><svg id="mdG" viewBox="0 0 300 180" style="max-width:420px;width:100%"></svg><h2 id="mdV" style="margin:0"></h2></div>
      <div class="card" id="mdT"></div></div>
      <p class="note">The meter is a summary of simple measures, not a forecast. Each part scores 0 (very bearish) to 100 (very bullish), and the needle shows the average.</p>`;
    this.cot = null;
    // Optional live component: large speculator positioning in S&P 500 E-mini futures (CFTC, no key needed)
    getJSON('https://publicreporting.cftc.gov/resource/6dca-aqww.json?' + new URLSearchParams({ $where: "market_and_exchange_names='E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE'", $order: 'report_date_as_yyyy_mm_dd DESC', $limit: 156 }))
      .then(r => { const net = r.map(x => +x.noncomm_positions_long_all - +x.noncomm_positions_short_all), mn = Math.min(...net), mx = Math.max(...net); this.cot = { score: mx === mn ? 50 : (net[0] - mn) / (mx - mn) * 100, date: r[0].report_date_as_yyyy_mm_dd.slice(0, 10) }; if (this.series) this.show(); })
      .catch(() => {});
    dataPicker($('#mdPick'), (s, label) => { this.series = s; this.label = label; this.show(); }, { symbol: 'SPY' });
  },

  show() {
    const s = this.series, c = s.map(b => b.close), i = c.length - 1, clamp = x => Math.max(0, Math.min(100, x));
    const s50 = Ind.sma(c, 50)[i], s200 = Ind.sma(c, Math.min(200, i))[i], rsi = Ind.rsi(c)[i];
    const rets = c.slice(1).map((x, k) => Math.log(x / c[k])), sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    const volNow = sd(rets.slice(-20)), volAvg = sd(rets.slice(-Math.min(250, rets.length)));
    const hi = Math.max(...c.slice(-250)), lo = Math.min(...c.slice(-250));
    const parts = [
      ['Price vs 50-day average', clamp(50 + (c[i] / s50 - 1) * 1000), `${pct((c[i] / s50 - 1) * 100)} from SMA50`],
      ['Price vs 200-day average', clamp(50 + (c[i] / s200 - 1) * 500), `${pct((c[i] / s200 - 1) * 100)} from SMA200`],
      ['Momentum (RSI 14)', clamp(rsi), `RSI ${fmt(rsi, 1)}`],
      ['3-month return', clamp(50 + (c[i] / c[Math.max(0, i - 63)] - 1) * 400), pct((c[i] / c[Math.max(0, i - 63)] - 1) * 100)],
      ['Volatility (calm = bullish)', clamp(50 - (volNow / volAvg - 1) * 100), `20-day vol is ${fmt(volNow / volAvg * 100, 0)}% of its 1-year average`],
      ['Position in 1-year range', clamp((c[i] - lo) / (hi - lo) * 100), `${fmt((c[i] - lo) / (hi - lo) * 100, 0)}% of the way from low to high`],
    ];
    if (this.cot) parts.push(['S&P futures speculator positioning', this.cot.score, `CFTC COT index ${fmt(this.cot.score, 0)} (3y window, ${this.cot.date})`]);
    const score = parts.reduce((a, p) => a + p[1], 0) / parts.length;
    const label = score >= 75 ? 'Strong bull' : score >= 58 ? 'Bullish' : score > 42 ? 'Neutral' : score > 25 ? 'Bearish' : 'Strong bear';
    $('#mdV').innerHTML = `${esc(this.label)}: <span class="${score > 55 ? 'up' : score < 45 ? 'down' : ''}">${label}</span> (${fmt(score, 0)}/100)`;
    $('#mdT').innerHTML = `<table><tr><th>Component</th><th class="num">Score</th><th>Reading</th></tr>${parts.map(p => `<tr><td>${p[0]}</td><td class="num ${p[1] > 55 ? 'up' : p[1] < 45 ? 'down' : ''}">${fmt(p[1], 0)}</td><td class="muted">${p[2]}</td></tr>`).join('')}</table>`;
    // Gauge
    const g = d3.select('#mdG'); g.selectAll('*').remove();
    const arc = d3.arc().innerRadius(90).outerRadius(125), cx = 150, cy = 150;
    const zones = [['#ff5c5c', 0, 25], ['#f5916b', 25, 42], ['#8b98a5', 42, 58], ['#7fd49a', 58, 75], ['#2ecc71', 75, 100]];
    const ang = v => -Math.PI / 2 + v / 100 * Math.PI;
    zones.forEach(([col, a, b]) => g.append('path').attr('transform', `translate(${cx},${cy})`).attr('d', arc({ startAngle: ang(a), endAngle: ang(b) })).attr('fill', col));
    g.append('text').attr('x', 22).attr('y', 172).attr('fill', '#ff5c5c').attr('font-size', 12).text('BEAR');
    g.append('text').attr('x', 245).attr('y', 172).attr('fill', '#2ecc71').attr('font-size', 12).text('BULL');
    const a = ang(score);
    g.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + Math.sin(a) * 115).attr('y2', cy - Math.cos(a) * 115).attr('stroke', '#e6edf3').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 8).attr('fill', '#e6edf3');
  },
});
