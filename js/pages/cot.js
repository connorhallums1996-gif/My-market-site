/* COT Report: live CFTC Commitments of Traders (Legacy, futures only) from publicreporting.cftc.gov. */
App.register('cot', {
  title: 'COT Report', group: 'Toolkit',
  desc: 'Weekly futures positioning from the CFTC: commercials vs large speculators vs small traders, with history.',
  presets: { 'Gold': 'GOLD - COMMODITY EXCHANGE INC.', 'Silver': 'SILVER - COMMODITY EXCHANGE INC.', 'Crude oil (WTI)': 'WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE',
    'Natural gas': 'NAT GAS NYME - NEW YORK MERCANTILE EXCHANGE', 'Copper': 'COPPER- #1 - COMMODITY EXCHANGE INC.', 'Corn': 'CORN - CHICAGO BOARD OF TRADE',
    'Wheat': 'WHEAT-SRW - CHICAGO BOARD OF TRADE', 'Soybeans': 'SOYBEANS - CHICAGO BOARD OF TRADE', 'S&P 500 E-mini': 'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE',
    'Nasdaq-100 E-mini': 'NASDAQ MINI - CHICAGO MERCANTILE EXCHANGE', 'Euro FX': 'EURO FX - CHICAGO MERCANTILE EXCHANGE', 'British pound': 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
    'Japanese yen': 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE', '10-year T-note': 'UST 10Y NOTE - CHICAGO BOARD OF TRADE', 'Bitcoin': 'BITCOIN - CHICAGO MERCANTILE EXCHANGE' },
  render(el) {
    el.innerHTML = `
      <div class="card"><div class="row">
        <label>Market<select id="cM">${Object.keys(this.presets).map(k => `<option>${k}</option>`).join('')}<option value="__custom">Search other…</option></select></label>
        <label id="cCL" style="display:none">Search text<input id="cC" placeholder="e.g. PALLADIUM"></label>
        <label>History<select id="cW"><option value="52">1 year</option><option value="156" selected>3 years</option><option value="260">5 years</option></select></label>
        <button id="cGo">Load</button><span id="cMsg" class="muted"></span></div></div>
      <div id="cOut"></div>
      <p class="muted" style="font-size:12px">Source: CFTC Public Reporting, Legacy Futures-Only report (dataset 6dca-aqww). Released Fridays; positions as of the previous Tuesday.</p>`;
    $('#cM').onchange = () => $('#cCL').style.display = $('#cM').value === '__custom' ? '' : 'none';
    $('#cGo').onclick = () => this.load(); this.load();
  },

  async load() {
    const msg = $('#cMsg'); msg.textContent = 'Loading…'; msg.className = 'muted';
    const custom = $('#cM').value === '__custom';
    const where = custom ? `upper(market_and_exchange_names) like '%${$('#cC').value.toUpperCase().replace(/'/g, '')}%'` : `market_and_exchange_names='${this.presets[$('#cM').value]}'`;
    const url = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json?' + new URLSearchParams({ $where: where, $order: 'report_date_as_yyyy_mm_dd DESC', $limit: custom ? 400 : $('#cW').value });
    try {
      let rows = await getJSON(url);
      if (!rows.length) throw new Error('No market found. Try different search text.');
      if (custom) { const name = rows[0].market_and_exchange_names; rows = rows.filter(r => r.market_and_exchange_names === name).slice(0, +$('#cW').value); }
      rows.reverse();
      msg.textContent = rows[0].market_and_exchange_names;
      this.draw(rows);
    } catch (e) { msg.textContent = e.message; msg.className = 'err'; }
  },

  draw(rows) {
    const n = k => rows.map(r => +r[k] || 0);
    const specNet = n('noncomm_positions_long_all').map((l, i) => l - n('noncomm_positions_short_all')[i]);
    const commNet = n('comm_positions_long_all').map((l, i) => l - n('comm_positions_short_all')[i]);
    const smallNet = n('nonrept_positions_long_all').map((l, i) => l - n('nonrept_positions_short_all')[i]);
    const oi = n('open_interest_all'), L = rows.length - 1;
    const idx = a => { const mn = Math.min(...a), mx = Math.max(...a); return mx === mn ? 50 : (a[L] - mn) / (mx - mn) * 100; }; // COT index over the window
    const chg = a => L > 0 ? a[L] - a[L - 1] : 0;
    const last = rows[L];
    $('#cOut').innerHTML = `
      <div class="card"><b>Report date: ${last.report_date_as_yyyy_mm_dd.slice(0, 10)}</b>
        <table style="margin-top:8px"><tr><th>Group</th><th class="num">Long</th><th class="num">Short</th><th class="num">Net</th><th class="num">Weekly change</th><th class="num">COT index*</th></tr>
        ${[['Large speculators (non-commercial)', 'noncomm', specNet], ['Commercials (hedgers)', 'comm', commNet], ['Small traders (non-reportable)', 'nonrept', smallNet]].map(([lbl, k, net]) =>
          `<tr><td>${lbl}</td><td class="num">${fmt(+last[k + '_positions_long_all'], 0)}</td><td class="num">${fmt(+last[k + '_positions_short_all'], 0)}</td><td class="num ${cls(net[L])}">${fmt(net[L], 0)}</td><td class="num ${cls(chg(net))}">${fmt(chg(net), 0)}</td><td class="num">${fmt(idx(net), 0)}</td></tr>`).join('')}
        <tr><td>Open interest</td><td></td><td></td><td class="num">${fmt(oi[L], 0)}</td><td class="num ${cls(chg(oi))}">${fmt(chg(oi), 0)}</td><td></td></tr></table>
        <p class="muted" style="font-size:12px">*COT index = where the latest net position sits between its low (0) and high (100) for the selected window. Readings near 0 or 100 are extremes.</p></div>
      <div class="card"><h2 style="margin-top:0">Net positions</h2><div class="chart-box"><canvas id="cC1"></canvas></div></div>
      <div class="card"><h2 style="margin-top:0">Open interest</h2><div class="chart-box" style="height:220px"><canvas id="cC2"></canvas></div></div>`;
    const dates = rows.map(r => r.report_date_as_yyyy_mm_dd.slice(0, 10));
    lineChart($('#cC1'), dates, [{ label: 'Large speculators', data: specNet, color: '#4c9aff' }, { label: 'Commercials', data: commNet, color: '#f5b041' }, { label: 'Small traders', data: smallNet, color: '#8b98a5' }]);
    lineChart($('#cC2'), dates, [{ label: 'Open interest', data: oi, color: '#5dd3d3', fill: true, backgroundColor: 'rgba(93,211,211,.12)' }]);
  },
});
