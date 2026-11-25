/* Portfolio Manager: holdings saved in the browser, live prices via Alpha Vantage, allocation and P/L. */
App.register('portfolio', {
  title: 'Portfolio Manager', group: 'Trading',
  desc: 'Track your holdings, cost basis, profit/loss and allocation. Saved in your browser.',
  render(el) {
    el.innerHTML = `
      <div class="card"><div class="row">
        <label>Symbol<input id="pfSym" placeholder="AAPL"></label><label>Shares<input id="pfSh" type="number" step="any"></label>
        <label>Avg cost<input id="pfCost" type="number" step="any"></label><label>Sector / type<input id="pfSec" placeholder="Tech"></label>
        <button id="pfAdd">Add holding</button>
        <button class="ghost" id="pfRef">Refresh prices</button>
        <button class="ghost" id="pfExp">Export CSV</button>
        <label class="ghost">Import CSV<input type="file" id="pfImp" accept=".csv"></label>
        <span id="pfMsg" class="muted"></span></div></div>
      <div class="card"><div class="stats" id="pfS"></div></div>
      <div class="card" id="pfT"></div>
      <div class="grid2"><div class="card"><h2 style="margin-top:0">By holding</h2><div class="chart-box" style="height:280px"><canvas id="pfC1"></canvas></div></div>
        <div class="card"><h2 style="margin-top:0">By sector</h2><div class="chart-box" style="height:280px"><canvas id="pfC2"></canvas></div></div></div>`;
    $('#pfAdd').onclick = () => {
      const h = { sym: $('#pfSym').value.trim().toUpperCase(), shares: num($('#pfSh').value), cost: num($('#pfCost').value), sector: $('#pfSec').value.trim() || 'Other' };
      if (!h.sym || !h.shares) return;
      h.price = h.cost; const list = this.list(); list.push(h); Store.set('portfolio', list); this.draw();
    };
    $('#pfRef').onclick = () => this.refresh();
    $('#pfExp').onclick = () => {
      const csv = 'symbol,shares,cost,sector,price\n' + this.list().map(h => [h.sym, h.shares, h.cost, h.sector, h.price].join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'portfolio.csv'; a.click();
    };
    $('#pfImp').onchange = async e => {
      const t = await e.target.files[0].text();
      const rows = t.trim().split(/\r?\n/).slice(1).map(l => l.split(',')).map(c => ({ sym: c[0], shares: +c[1], cost: +c[2], sector: c[3] || 'Other', price: +c[4] || +c[2] }));
      Store.set('portfolio', rows); this.draw();
    };
    this.draw();
  },
  list() { return Store.get('portfolio', []); },

  async refresh() {
    const list = this.list(), msg = $('#pfMsg');
    if (Data.avKey() === 'demo') { msg.textContent = 'Add a free Alpha Vantage key in Settings to fetch prices. Free keys allow ~25 calls/day.'; return; }
    for (const h of list) {
      msg.textContent = 'Fetching ' + h.sym + '…';
      try {
        const j = await getJSON(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(h.sym)}&apikey=${Data.avKey()}`);
        const p = parseFloat(j['Global Quote']?.['05. price']); if (p) h.price = p;
        else { msg.textContent = j.Note || j.Information || 'No quote for ' + h.sym; break; }
      } catch (e) { msg.textContent = e.message; break; }
    }
    Store.set('portfolio', list); if (msg.textContent.startsWith('Fetching')) msg.textContent = 'Prices updated'; this.draw();
  },

  draw() {
    const list = this.list();
    const tv = list.reduce((a, h) => a + h.shares * h.price, 0), tc = list.reduce((a, h) => a + h.shares * h.cost, 0);
    $('#pfS').innerHTML = [['Market value', fmt(tv)], ['Cost basis', fmt(tc)], ['Unrealised P/L', `<span class="${cls(tv - tc)}">${fmt(tv - tc)}</span>`], ['Return', `<span class="${cls(tv - tc)}">${pct(tc ? (tv / tc - 1) * 100 : 0)}</span>`], ['Holdings', list.length]]
      .map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join('');
    $('#pfT').innerHTML = list.length ? `<table><tr><th>Symbol</th><th>Sector</th><th class="num">Shares</th><th class="num">Avg cost</th><th class="num">Price</th><th class="num">Value</th><th class="num">P/L</th><th class="num">Weight</th><th></th></tr>
      ${list.map((h, i) => { const v = h.shares * h.price, pl = v - h.shares * h.cost; return `<tr><td><b>${esc(h.sym)}</b></td><td>${esc(h.sector)}</td><td class="num">${fmt(h.shares, 2)}</td><td class="num">${fmt(h.cost)}</td>
        <td class="num"><input data-i="${i}" class="pfPx" type="number" step="any" value="${h.price}" style="width:90px;min-width:0"></td><td class="num">${fmt(v)}</td><td class="num ${cls(pl)}">${fmt(pl)} (${pct(h.cost ? (h.price / h.cost - 1) * 100 : 0, 1)})</td>
        <td class="num">${fmt(tv ? v / tv * 100 : 0, 1)}%</td><td><button class="ghost pfDel" data-i="${i}">✕</button></td></tr>`; }).join('')}</table>` : '<p class="muted">No holdings yet. Add one above.</p>';
    $$('.pfDel').forEach(b => b.onclick = () => { const l = this.list(); l.splice(+b.dataset.i, 1); Store.set('portfolio', l); this.draw(); });
    $$('.pfPx').forEach(inp => inp.onchange = () => { const l = this.list(); l[+inp.dataset.i].price = num(inp.value); Store.set('portfolio', l); this.draw(); });
    App.charts.forEach(c => c.destroy()); App.charts = [];
    if (!list.length) return;
    barChart($('#pfC1'), list.map(h => h.sym), [{ data: list.map(h => h.shares * h.price), backgroundColor: COLORS }], { type: 'doughnut', legend: true });
    const sec = {}; list.forEach(h => sec[h.sector] = (sec[h.sector] || 0) + h.shares * h.price);
    barChart($('#pfC2'), Object.keys(sec), [{ data: Object.values(sec), backgroundColor: COLORS }], { type: 'doughnut', legend: true });
  },
});
