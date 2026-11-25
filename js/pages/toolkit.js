/* Toolkit: Options Lab (Black-Scholes, binomial American, implied volatility, payoff) and the Playbook guide. */
const Opt = {
  N(x) { // standard normal CDF (Abramowitz & Stegun 7.1.26)
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  },
  n: x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI),
  /* S spot, K strike, T years, r rate, q dividend yield, v volatility (decimals) */
  bs(type, S, K, T, r, q, v) {
    if (T <= 0 || v <= 0) return { price: Math.max(0, type === 'call' ? S - K : K - S), delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
    const d1 = (Math.log(S / K) + (r - q + v * v / 2) * T) / (v * Math.sqrt(T)), d2 = d1 - v * Math.sqrt(T);
    const dq = Math.exp(-q * T), dr = Math.exp(-r * T), c = type === 'call';
    const price = c ? S * dq * this.N(d1) - K * dr * this.N(d2) : K * dr * this.N(-d2) - S * dq * this.N(-d1);
    const gamma = dq * this.n(d1) / (S * v * Math.sqrt(T)), vega = S * dq * this.n(d1) * Math.sqrt(T) / 100;
    const theta = (-(S * dq * this.n(d1) * v) / (2 * Math.sqrt(T)) + (c ? q * S * dq * this.N(d1) - r * K * dr * this.N(d2) : -q * S * dq * this.N(-d1) + r * K * dr * this.N(-d2))) / 365;
    return { price, d1, d2, delta: c ? dq * this.N(d1) : -dq * this.N(-d1), gamma, vega, theta, rho: (c ? K * T * dr * this.N(d2) : -K * T * dr * this.N(-d2)) / 100 };
  },
  /* Cox-Ross-Rubinstein binomial tree; american=true allows early exercise */
  binomial(type, S, K, T, r, q, v, steps = 200, american = true) {
    const dt = T / steps, u = Math.exp(v * Math.sqrt(dt)), d = 1 / u, p = (Math.exp((r - q) * dt) - d) / (u - d), disc = Math.exp(-r * dt);
    const pay = s => Math.max(0, type === 'call' ? s - K : K - s);
    let vals = Array.from({ length: steps + 1 }, (_, i) => pay(S * u ** (steps - i) * d ** i));
    for (let j = steps - 1; j >= 0; j--) for (let i = 0; i <= j; i++) {
      const hold = disc * (p * vals[i] + (1 - p) * vals[i + 1]);
      vals[i] = american ? Math.max(hold, pay(S * u ** (j - i) * d ** i)) : hold;
    }
    return vals[0];
  },
  impliedVol(type, price, S, K, T, r, q) {
    let lo = 0.0001, hi = 5;
    if (price < this.bs(type, S, K, T, r, q, lo).price || price > this.bs(type, S, K, T, r, q, hi).price) return null;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (this.bs(type, S, K, T, r, q, m).price > price) hi = m; else lo = m; }
    return (lo + hi) / 2;
  },
};

App.register('options-lab', {
  title: 'Options Lab', group: 'Toolkit',
  desc: 'Price options (Black-Scholes and American binomial), see the Greeks, solve implied volatility and plot payoffs.',
  render(el) {
    const f = [['oS', 'Stock price', 100], ['oK', 'Strike', 100], ['oD', 'Days to expiry', 30], ['oV', 'Volatility (%)', 25], ['oR', 'Risk-free rate (%)', 4], ['oQ', 'Dividend yield (%)', 0], ['oN', 'Binomial steps', 200]];
    el.innerHTML = `
      <div class="card"><div class="row"><label>Type<select id="oT"><option value="call">Call</option><option value="put">Put</option></select></label>
        ${f.map(([id, l, v]) => `<label>${l}<input id="${id}" type="number" step="any" value="${v}"></label>`).join('')}
        <label>Position<select id="oPos"><option value="1">Long (bought)</option><option value="-1">Short (sold)</option></select></label></div>
        <div class="stats" id="oOut"></div></div>
      <div class="card"><h2 style="margin-top:0">Payoff at expiry vs value today</h2><div class="chart-box"><canvas id="oC"></canvas></div></div>
      <div class="card"><h2 style="margin-top:0">Implied volatility solver</h2>
        <p class="muted">Enter a market price for the option above. The solver finds the volatility that makes Black-Scholes match it.</p>
        <div class="row"><label>Market option price<input id="oMP" type="number" step="any" value="3.2"></label><button id="oIV">Solve</button><b id="oIVo"></b></div></div>`;
    const calc = () => {
      const g = id => num($('#' + id).value), type = $('#oT').value, S = g('oS'), K = g('oK'), T = g('oD') / 365, v = g('oV') / 100, r = g('oR') / 100, q = g('oQ') / 100, pos = g('oPos');
      const b = Opt.bs(type, S, K, T, r, q, v), am = Opt.binomial(type, S, K, T, r, q, v, Math.min(1000, Math.max(10, g('oN'))), true);
      const intrinsic = Math.max(0, type === 'call' ? S - K : K - S);
      $('#oOut').innerHTML = [['European price (Black-Scholes)', fmt(b.price, 4)], ['American price (binomial)', fmt(am, 4)], ['Early-exercise premium', fmt(am - b.price, 4)],
        ['Intrinsic value', fmt(intrinsic, 4)], ['Time value', fmt(b.price - intrinsic, 4)], ['Delta', fmt(b.delta * pos, 4)], ['Gamma', fmt(b.gamma * pos, 4)],
        ['Vega (per 1 vol pt)', fmt(b.vega * pos, 4)], ['Theta (per day)', fmt(b.theta * pos, 4)], ['Rho (per 1% rate)', fmt(b.rho * pos, 4)],
        ['Break-even at expiry', fmt(type === 'call' ? K + b.price : K - b.price, 2)], ['Chance ITM (risk-neutral)', fmt((type === 'call' ? Opt.N(b.d2 ?? 0) : Opt.N(-(b.d2 ?? 0))) * 100, 1) + '%']]
        .map(([a, x]) => `<div class="stat"><small>${a}</small><b>${x}</b></div>`).join('');
      const xs = Array.from({ length: 81 }, (_, i) => S * (0.6 + i * 0.01));
      App.charts.forEach(c => c.destroy()); App.charts = [];
      lineChart($('#oC'), xs.map(x => fmt(x, 1)), [
        { label: 'At expiry', data: xs.map(x => pos * (Math.max(0, type === 'call' ? x - K : K - x) - b.price)), borderWidth: 2 },
        { label: 'Today (model)', data: xs.map(x => pos * (Opt.bs(type, x, K, T, r, q, v).price - b.price)), borderDash: [5, 4] },
      ], { extra: { scales: { x: { title: { display: true, text: 'Stock price' }, ticks: { maxTicksLimit: 9 } }, y: { title: { display: true, text: 'Profit / loss per share' } } } } });
    };
    $$('#page input, #page select').forEach(i => { if (i.id !== 'oMP') i.oninput = calc; });
    $('#oIV').onclick = () => {
      const g = id => num($('#' + id).value);
      const iv = Opt.impliedVol($('#oT').value, g('oMP'), g('oS'), g('oK'), g('oD') / 365, g('oR') / 100, g('oQ') / 100);
      $('#oIVo').innerHTML = iv == null ? '<span class="err">No volatility fits that price (check it is above intrinsic value).</span>' : `Implied volatility ≈ ${fmt(iv * 100, 2)}%`;
    };
    calc();
  },
});

App.register('playbook', {
  title: 'Playbook', group: 'Toolkit',
  desc: 'Plain-English guide to the ideas behind every tool: risk, indicators, options and positioning data.',
  render(el) {
    const s = [
      ['Risk per trade', `Decide the most you will lose on one trade before you enter, usually 0.5–2% of the account. With 1% risk you could be wrong 10 times in a row and still have about 90% of your money. Use the <a href="#/position-size">Position Size Calculator</a> to turn that % into a share count.`],
      ['Reward : risk and expectancy', `<b>Expectancy</b> = (win rate × average win) − (loss rate × average loss). A strategy that wins 40% of the time can still make money if the average win is twice the average loss: 0.4 × 2 − 0.6 × 1 = +0.2 units per trade. The <a href="#/journal">Trade Journal</a> works this out from your own trades.`],
      ['Drawdowns are lopsided', `A 10% loss needs an 11% gain to get back to even. A 25% loss needs 33%, and a 50% loss needs 100%. This is why the Backtester shows <b>max drawdown</b> next to return.`],
      ['Moving averages', `A simple moving average (SMA) is the average closing price of the last N bars. Price above a rising 50-day SMA is a common sign of an up-trend. When the 50-day crosses above the 200-day it is called a "golden cross", and crossing below is a "death cross". These signals lag: they confirm a trend rather than predict it.`],
      ['RSI', `The Relative Strength Index compares the size of recent up-moves with recent down-moves, on a 0–100 scale. Above 70 is often called overbought and below 30 oversold. In strong trends RSI can stay at those extremes for a long time, so use it with the trend, not against it.`],
      ['MACD', `MACD is the 12-period EMA minus the 26-period EMA. The signal line is a 9-period EMA of MACD. When MACD crosses above its signal line, momentum is turning up. The histogram shows the gap between the two.`],
      ['Bollinger Bands', `These are a 20-period average with bands 2 standard deviations above and below it. Narrow bands mean the market is quiet, and a quiet spell often comes before a big move. Closes outside the bands are unusual but are not reversal signals by themselves.`],
      ['Options: calls and puts', `A <b>call</b> is the right to buy at the strike price, and a <b>put</b> is the right to sell. The buyer's loss is capped at the premium paid. The seller collects the premium but takes on the risk. An option's price is its intrinsic value (what it is worth if exercised now) plus its time value.`],
      ['Black-Scholes inputs', `The model prices a European option from five inputs: stock price, strike, time to expiry, interest rate and volatility (plus dividend yield). Volatility is the only input you cannot look up directly, so traders often work backwards from the market price to find it. That figure is called <b>implied volatility</b>.`],
      ['American options and early exercise', `American options can be exercised any day up to expiry. A binomial tree models this by checking at every step whether exercising beats holding. Early exercise matters most for deep in-the-money puts and for calls just before a large dividend. The Options Lab shows the "early-exercise premium".`],
      ['The Greeks', `<b>Delta</b>: how much the option price moves for a $1 move in the stock. <b>Gamma</b>: how fast delta changes. <b>Theta</b>: value lost each day from time decay. <b>Vega</b>: price change per 1-point change in volatility. <b>Rho</b>: price change per 1% change in interest rates.`],
      ['Commitments of Traders (COT)', `Every Friday the CFTC publishes futures positions as of the Tuesday before. <b>Commercials</b> are hedgers such as producers and users. <b>Non-commercials</b> are large speculators such as funds. <b>Non-reportables</b> are small traders. When speculators' net position hits an extreme, it can mean a move is crowded. Positioning is context, not a timing signal.`],
      ['Backtesting pitfalls', `Look-ahead bias means using information you would not have had at the time. The Backtester avoids it by filling at the next bar's open. Over-fitting means tuning parameters until the past looks perfect. Survivorship bias means testing only on stocks that still exist today. Always include costs.`],
    ];
    el.innerHTML = s.map(([h, b], i) => `<details ${i === 0 ? 'open' : ''}><summary>${h}</summary><div class="prose" style="margin-top:8px">${b}</div></details>`).join('');
  },
});
