/* Dividend, Forex and Position Size calculators. */
App.register('dividend', {
  title: 'Dividend Calculator', group: 'Calculators',
  desc: 'Project dividend income and portfolio growth with reinvestment (DRIP), dividend growth and monthly top-ups.',
  render(el) {
    const f = [['div0', 'Starting investment', 10000], ['divM', 'Monthly contribution', 200], ['divY', 'Dividend yield (%)', 4], ['divG', 'Dividend growth / yr (%)', 5],
      ['divP', 'Share price growth / yr (%)', 4], ['divT', 'Tax on dividends (%)', 0], ['divN', 'Years', 20]];
    el.innerHTML = `<div class="card"><div class="row">${f.map(([id, l, v]) => `<label>${l}<input type="number" id="${id}" value="${v}" step="any"></label>`).join('')}
      <label>Reinvest dividends?<select id="divR"><option value="1">Yes (DRIP)</option><option value="0">No, take as cash</option></select></label></div></div>
      <div class="card"><div class="stats" id="divS"></div></div>
      <div class="card"><div class="chart-box"><canvas id="divC"></canvas></div></div>
      <div class="card"><div id="divTbl" style="max-height:340px;overflow:auto"></div></div>`;
    const calc = () => {
      const g = id => num($('#' + id).value);
      let value = g('div0'), yld = g('divY') / 100, contrib = g('div0'), cashDivs = 0; const drip = $('#divR').value === '1';
      const rows = [];
      for (let y = 1; y <= g('divN'); y++) {
        let yearDiv = 0;
        for (let m = 0; m < 12; m++) {
          value += g('divM'); contrib += g('divM');
          value *= 1 + g('divP') / 100 / 12;
          const d = value * yld / 12 * (1 - g('divT') / 100); yearDiv += d;
          if (drip) value += d; else cashDivs += d;
        }
        rows.push({ y, value, contrib, yearDiv, monthly: yearDiv / 12 });
        yld *= (1 + g('divG') / 100) / (1 + g('divP') / 100); // yield on market value moves with dividend growth vs price growth
      }
      const last = rows.at(-1) || { value, contrib, yearDiv: 0, monthly: 0 };
      $('#divS').innerHTML = [['Final value', fmt(last.value, 0)], ['Total contributed', fmt(last.contrib, 0)], ['Annual income (final yr)', fmt(last.yearDiv, 0)],
        ['Monthly income (final yr)', fmt(last.monthly, 0)], ['Dividends taken as cash', fmt(cashDivs, 0)]].map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join('');
      App.charts.forEach(c => c.destroy()); App.charts = [];
      barChart($('#divC'), rows.map(r => 'Y' + r.y), [{ label: 'Portfolio value', data: rows.map(r => r.value), type: 'line', borderColor: '#4c9aff', yAxisID: 'y' },
        { label: 'Annual dividends', data: rows.map(r => r.yearDiv), backgroundColor: '#2ecc71', yAxisID: 'y1' }],
        { legend: true, extra: { scales: { y: { position: 'left' }, y1: { position: 'right', grid: { display: false } } } } });
      $('#divTbl').innerHTML = `<table><tr><th>Year</th><th class="num">Value</th><th class="num">Contributed</th><th class="num">Dividends that year</th><th class="num">Per month</th></tr>${rows.map(r => `<tr><td>${r.y}</td><td class="num">${fmt(r.value, 0)}</td><td class="num">${fmt(r.contrib, 0)}</td><td class="num">${fmt(r.yearDiv, 0)}</td><td class="num">${fmt(r.monthly, 0)}</td></tr>`).join('')}</table>`;
    };
    $$('#page input, #page select').forEach(i => i.oninput = calc); calc();
  },
});

App.register('forex', {
  title: 'Forex Calculator', group: 'Calculators',
  desc: 'Live currency conversion, pip values, margin and profit/loss for FX trades.',
  render(el) {
    el.innerHTML = `
      <div class="card"><h2 style="margin-top:0">Currency converter</h2><div class="row">
        <label>Amount<input id="fxA" type="number" value="1000"></label><label>From<select id="fxF"></select></label><label>To<select id="fxT"></select></label>
        <div><b id="fxR" style="font-size:22px"></b><div class="muted" id="fxD"></div></div></div></div>
      <div class="card"><h2 style="margin-top:0">Trade calculator</h2><div class="row">
        <label>Account currency<select id="fxAc"></select></label>
        <label>Pair base<select id="fxB"></select></label><label>Pair quote<select id="fxQ"></select></label>
        <label>Lot size<select id="fxL"><option value="100000">Standard (100,000)</option><option value="10000">Mini (10,000)</option><option value="1000">Micro (1,000)</option></select></label>
        <label>Lots<input id="fxN" type="number" value="1" step="0.01"></label><label>Leverage (x)<input id="fxLev" type="number" value="30"></label>
        <label>Entry price<input id="fxE" type="number" step="any"></label><label>Exit price<input id="fxX" type="number" step="any"></label>
        <label>Direction<select id="fxDir"><option value="1">Buy (long)</option><option value="-1">Sell (short)</option></select></label></div>
        <div class="stats" id="fxS"></div></div>
      <p class="muted" style="font-size:12px">Rates: European Central Bank reference rates via frankfurter.dev (daily, not live dealing prices).</p>`;
    getJSON('https://api.frankfurter.dev/v1/latest?base=USD').then(j => {
      const rates = { USD: 1, ...j.rates }, cur = Object.keys(rates).sort();
      const opts = d => cur.map(c => `<option${c === d ? ' selected' : ''}>${c}</option>`).join('');
      $('#fxF').innerHTML = opts('USD'); $('#fxT').innerHTML = opts('EUR'); $('#fxAc').innerHTML = opts('USD'); $('#fxB').innerHTML = opts('EUR'); $('#fxQ').innerHTML = opts('USD');
      const rate = (a, b) => rates[b] / rates[a];   // units of b per 1 a
      $('#fxD').textContent = 'ECB reference rates for ' + j.date;
      const conv = () => { $('#fxR').textContent = `${fmt(num($('#fxA').value) * rate($('#fxF').value, $('#fxT').value), 4)} ${$('#fxT').value}`; };
      let lastPair = '';
      const trade = () => {
        const B = $('#fxB').value, Q = $('#fxQ').value, A = $('#fxAc').value;
        if (B + Q !== lastPair) { lastPair = B + Q; const p = rate(B, Q); $('#fxE').value = p.toFixed(5); $('#fxX').value = (p * 1.005).toFixed(5); }
        const units = num($('#fxL').value) * num($('#fxN').value), pip = Q === 'JPY' ? 0.01 : 0.0001;
        const pipQuote = units * pip, pipAcct = pipQuote * rate(Q, A);
        const entry = num($('#fxE').value), exit = num($('#fxX').value), dir = num($('#fxDir').value);
        const pips = (exit - entry) / pip * dir, pl = (exit - entry) * dir * units * rate(Q, A);
        const notional = units * rate(B, A), margin = notional / Math.max(1, num($('#fxLev').value));
        $('#fxS').innerHTML = [['Pip size', pip], ['Pip value (' + A + ')', fmt(pipAcct, 2)], ['Position value (' + A + ')', fmt(notional, 0)], ['Margin needed (' + A + ')', fmt(margin, 2)],
          ['Pips gained/lost', fmt(pips, 1)], ['Profit / loss (' + A + ')', `<span class="${cls(pl)}">${fmt(pl, 2)}</span>`]].map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join('');
      };
      ['fxA', 'fxF', 'fxT'].forEach(id => $('#' + id).oninput = conv);
      ['fxAc', 'fxB', 'fxQ', 'fxL', 'fxN', 'fxLev', 'fxE', 'fxX', 'fxDir'].forEach(id => $('#' + id).oninput = trade);
      conv(); trade();
    }).catch(e => el.insertAdjacentHTML('afterbegin', `<p class="err">Could not load rates: ${esc(e.message)}</p>`));
  },
});

App.register('position-size', {
  title: 'Position Size Calculator', group: 'Calculators',
  desc: 'How many shares or units to buy so a stop-loss only costs the % of your account you choose.',
  render(el) {
    const f = [['psA', 'Account size', 10000], ['psR', 'Risk per trade (%)', 1], ['psE', 'Entry price', 50], ['psS', 'Stop-loss price', 47], ['psT', 'Target price (optional)', 56], ['psC', 'Commission per trade', 0]];
    el.innerHTML = `<div class="card"><div class="row">${f.map(([id, l, v]) => `<label>${l}<input id="${id}" type="number" step="any" value="${v}"></label>`).join('')}</div>
      <div class="stats" id="psOut"></div></div>
      <div class="card prose"><b>How it works:</b> money at risk = account × risk %. Risk per share = |entry − stop|. Position size = money at risk ÷ risk per share.
      If the position would cost more than your whole account, it is capped and the real risk will be lower.</div>`;
    const calc = () => {
      const g = id => num($('#' + id).value);
      const riskAmt = g('psA') * g('psR') / 100, perShare = Math.abs(g('psE') - g('psS'));
      if (!perShare) { $('#psOut').innerHTML = '<p class="err">Stop must differ from entry</p>'; return; }
      let shares = Math.floor(Math.max(0, riskAmt - 2 * g('psC')) / perShare), capped = false;
      if (shares * g('psE') > g('psA')) { shares = Math.floor(g('psA') / g('psE')); capped = true; }
      const long = g('psS') < g('psE'), reward = g('psT') ? (long ? g('psT') - g('psE') : g('psE') - g('psT')) : 0;
      $('#psOut').innerHTML = [['Direction', long ? 'Long' : 'Short'], ['Money at risk', fmt(riskAmt)], ['Position size (units)', shares.toLocaleString() + (capped ? ' (capped)' : '')],
        ['Position value', fmt(shares * g('psE'))], ['% of account', fmt(shares * g('psE') / g('psA') * 100, 1) + '%'], ['Actual loss at stop', fmt(shares * perShare + 2 * g('psC'))],
        ['Reward : risk', reward ? fmt(reward / perShare, 2) + ' : 1' : '—'], ['Profit at target', reward ? fmt(shares * reward - 2 * g('psC')) : '—']]
        .map(([a, b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join('');
    };
    $$('#page input').forEach(i => i.oninput = calc); calc();
  },
});
