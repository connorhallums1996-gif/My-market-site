/* Trade Journal: log closed trades, see win rate, expectancy, best setups and an equity curve. */
App.register('journal', {
  title: 'Trade Journal', group: 'Trading',
  desc: 'Log your trades and see your win rate, average win/loss, expectancy and which setups work best.',
  render(el) {
    el.innerHTML = `
      <div class="card"><div class="row">
        <label>Date<input id="jD" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label>Symbol<input id="jS"></label>
        <label>Side<select id="jSide"><option>Long</option><option>Short</option></select></label>
        <label>Entry<input id="jE" type="number" step="any"></label><label>Exit<input id="jX" type="number" step="any"></label><label>Size<input id="jQ" type="number" step="any" value="1"></label>
        <label>Fees<input id="jF" type="number" step="any" value="0"></label><label>Setup<input id="jSet" placeholder="Breakout"></label>
        <label style="flex:1">Notes<input id="jN"></label><button id="jAdd">Add trade</button></div></div>
      <div class="card"><div class="stats" id="jStats"></div></div>
      <div class="grid2"><div class="card"><h2 style="margin-top:0">Equity curve (cumulative P/L)</h2><div class="chart-box" style="height:260px"><canvas id="jC"></canvas></div></div>
        <div class="card"><h2 style="margin-top:0">P/L by setup</h2><div class="chart-box" style="height:260px"><canvas id="jC2"></canvas></div></div></div>
      <div class="card" id="jT"></div>`;
    $('#jAdd').onclick = () => {
      const t = { date: $('#jD').value, sym: $('#jS').value.trim().toUpperCase(), side: $('#jSide').value, entry: num($('#jE').value), exit: num($('#jX').value), qty: num($('#jQ').value), fees: num($('#jF').value), setup: $('#jSet').value.trim() || 'Untagged', notes: $('#jN').value };
      if (!t.sym || !t.entry || !t.exit) return;
      const l = Store.get('journal', []); l.push(t); Store.set('journal', l); this.draw();
    };
    this.draw();
  },
  pl: t => (t.exit - t.entry) * t.qty * (t.side === 'Short' ? -1 : 1) - t.fees,

  draw() {
    const l = Store.get('journal', []).sort((a, b) => a.date.localeCompare(b.date));
    const pls = l.map(this.pl), wins = pls.filter(x => x > 0), losses = pls.filter(x => x <= 0);
    const aw = wins.length ? wins.reduce((a, b) => a + b) / wins.length : 0, al = losses.length ? losses.reduce((a, b) => a + b) / losses.length : 0;
    const wr = l.length ? wins.length / l.length : 0, total = pls.reduce((a, b) => a + b, 0);
    let streak = 0, best = 0; pls.forEach(p => { streak = p > 0 ? streak + 1 : 0; best = Math.max(best, streak); });
    $('#jStats').innerHTML = [['Trades', l.length], ['Win rate', fmt(wr * 100, 1) + '%'], ['Net P/L', `<span class="${cls(total)}">${fmt(total)}</span>`], ['Average win', fmt(aw)], ['Average loss', fmt(al)],
      ['Expectancy / trade', `<span class="${cls(wr * aw + (1 - wr) * al)}">${fmt(wr * aw + (1 - wr) * al)}</span>`], ['Profit factor', losses.length && al ? fmt(-wins.reduce((a, b) => a + b, 0) / losses.reduce((a, b) => a + b, 0)) : '—'], ['Longest win streak', best]]
      .map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join('');
    $('#jT').innerHTML = l.length ? `<div style="max-height:400px;overflow:auto"><table><tr><th>Date</th><th>Symbol</th><th>Side</th><th class="num">Entry</th><th class="num">Exit</th><th class="num">Size</th><th>Setup</th><th class="num">P/L</th><th>Notes</th><th></th></tr>
      ${l.map((t, i) => `<tr><td>${t.date}</td><td>${esc(t.sym)}</td><td>${t.side}</td><td class="num">${fmt(t.entry)}</td><td class="num">${fmt(t.exit)}</td><td class="num">${t.qty}</td><td>${esc(t.setup)}</td><td class="num ${cls(pls[i])}">${fmt(pls[i])}</td><td class="muted">${esc(t.notes)}</td><td><button class="ghost jDel" data-i="${i}">✕</button></td></tr>`).join('')}</table></div>`
      : '<p class="muted">No trades logged yet.</p>';
    $$('.jDel').forEach(b => b.onclick = () => { l.splice(+b.dataset.i, 1); Store.set('journal', l); this.draw(); });
    App.charts.forEach(c => c.destroy()); App.charts = [];
    if (!l.length) return;
    let cum = 0; lineChart($('#jC'), l.map(t => t.date), [{ label: 'Cumulative P/L', data: pls.map(p => cum += p), borderWidth: 2 }]);
    const bySetup = {}; l.forEach((t, i) => bySetup[t.setup] = (bySetup[t.setup] || 0) + pls[i]);
    barChart($('#jC2'), Object.keys(bySetup), [{ label: 'P/L', data: Object.values(bySetup), backgroundColor: Object.values(bySetup).map(v => v >= 0 ? '#2ecc71' : '#ff5c5c') }], { horizontal: true });
  },
});
