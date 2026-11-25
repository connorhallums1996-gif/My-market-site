/* Core: router, storage, price data, indicators, chart helpers. */
const App = {
  SITE_NAME: 'MarketDesk',           // change this to rename the site
  pages: {},
  order: [],
  groups: ['Start', 'Trading', 'Calculators', 'Toolkit', 'Markets', 'World Maps', 'Settings'],
  charts: [],

  register(id, def) { this.pages[id] = def; this.order.push(id); },

  start() {
    document.title = this.SITE_NAME;
    document.getElementById('brand').textContent = this.SITE_NAME;
    this.buildNav();
    window.addEventListener('hashchange', () => this.route());
    document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    this.route();
  },

  buildNav() {
    const nav = document.getElementById('sidebar');
    nav.innerHTML = this.groups.map(g => {
      const items = this.order.filter(id => this.pages[id].group === g);
      if (!items.length) return '';
      return `<h4>${g}</h4>` + items.map(id => `<a href="#/${id === 'home' ? '' : id}" data-id="${id}">${this.pages[id].title}</a>`).join('');
    }).join('');
  },

  route() {
    const id = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
    const page = this.pages[id] || this.pages.home;
    this.charts.forEach(c => { try { c.destroy(); } catch {} }); this.charts = [];
    document.querySelectorAll('.tooltip').forEach(t => t.remove());
    document.querySelectorAll('#sidebar a').forEach(a => a.classList.toggle('active', a.dataset.id === (this.pages[id] ? id : 'home')));
    document.getElementById('sidebar').classList.remove('open');
    const view = document.getElementById('view');
    view.innerHTML = `<h1>${page.title}</h1><p class="sub">${page.desc || ''}</p><div id="page"></div>`;
    window.scrollTo(0, 0);
    try { page.render(document.getElementById('page')); }
    catch (e) { console.error(e); view.insertAdjacentHTML('beforeend', `<p class="err">Error: ${e.message}</p>`); }
  },
};

/* ---------- Small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (v, d = 2) => (v == null || !isFinite(v)) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 2) => (v == null || !isFinite(v)) ? '—' : (v >= 0 ? '+' : '') + fmt(v, d) + '%';
const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';

const Store = {
  get(k, def) { try { const v = localStorage.getItem('md_' + k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { localStorage.setItem('md_' + k, JSON.stringify(v)); },
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

/* ---------- Price data ----------
   Series format everywhere: [{date:'YYYY-MM-DD', open, high, low, close, volume}] oldest -> newest
   Sources: Alpha Vantage (free key), a CSV file (e.g. Yahoo Finance "Download"), or demo data. */
const Data = {
  avKey() { return Store.get('avKey', '') || 'demo'; },

  async alphaVantageDaily(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${this.avKey()}`;
    const j = await getJSON(url);
    const ts = j['Time Series (Daily)'];
    if (!ts) throw new Error(j.Note || j.Information || j['Error Message'] || 'No data returned. Add your free Alpha Vantage key in Settings.');
    return Object.entries(ts).map(([date, v]) => ({
      date, open: +v['1. open'], high: +v['2. high'], low: +v['3. low'], close: +v['4. close'], volume: +v['5. volume'],
    })).sort((a, b) => a.date.localeCompare(b.date));
  },

  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const head = lines[0].toLowerCase().split(',').map(s => s.trim().replace(/"/g, ''));
    const idx = n => head.findIndex(h => h === n || h.startsWith(n));
    const iD = idx('date'), iO = idx('open'), iH = idx('high'), iL = idx('low');
    let iC = head.indexOf('close'); if (iC < 0) iC = idx('adj close'); if (iC < 0) iC = idx('close');
    const iV = idx('volume');
    if (iD < 0 || iC < 0) throw new Error('CSV needs at least Date and Close columns');
    const rows = lines.slice(1).map(l => l.split(',').map(s => s.replace(/"/g, '').trim())).filter(c => c.length > iC && isFinite(parseFloat(c[iC])));
    return rows.map(c => {
      const close = +c[iC];
      return { date: c[iD], close, open: iO >= 0 ? +c[iO] : close, high: iH >= 0 ? +c[iH] : close, low: iL >= 0 ? +c[iL] : close, volume: iV >= 0 ? +c[iV] : 0 };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /* Random-walk demo data so every tool works with no key. Clearly labelled as DEMO in the UI. */
  demo(bars = 500, seed = 7) {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const out = []; let p = 100; const d = new Date(); d.setDate(d.getDate() - bars * 1.45);
    for (let i = 0; i < bars; i++) {
      d.setDate(d.getDate() + (d.getDay() === 5 ? 3 : 1));
      const drift = Math.sin(i / 60) * 0.0015;
      const r = drift + (rnd() - 0.5) * 0.035;
      const open = p; p = Math.max(1, p * (1 + r));
      const high = Math.max(open, p) * (1 + rnd() * 0.01), low = Math.min(open, p) * (1 - rnd() * 0.01);
      out.push({ date: d.toISOString().slice(0, 10), open, high, low, close: p, volume: Math.round(1e6 * (0.5 + rnd())) });
    }
    return out;
  },
};

/* Shared "choose your data" widget. onLoad(series, label) is called when data is ready. */
function dataPicker(el, onLoad, opts = {}) {
  const id = 'dp' + Math.random().toString(36).slice(2, 7);
  el.innerHTML = `
    <div class="row">
      <label>Source<select id="${id}src">
        <option value="demo">Demo data (random walk)</option>
        <option value="av">Alpha Vantage (symbol)</option>
        <option value="csv">Upload CSV</option>
      </select></label>
      <label id="${id}symL" style="display:none">Symbol<input id="${id}sym" value="${opts.symbol || 'IBM'}" placeholder="e.g. AAPL"></label>
      <label id="${id}fileL" style="display:none">CSV file<input type="file" id="${id}file" accept=".csv"></label>
      <button id="${id}go">Load</button>
      <span id="${id}msg" class="muted"></span>
    </div>`;
  const src = $('#' + id + 'src'), msg = $('#' + id + 'msg');
  src.onchange = () => {
    $('#' + id + 'symL').style.display = src.value === 'av' ? '' : 'none';
    $('#' + id + 'fileL').style.display = src.value === 'csv' ? '' : 'none';
  };
  const load = async () => {
    msg.textContent = 'Loading…'; msg.className = 'muted';
    try {
      let series, label;
      if (src.value === 'demo') { series = Data.demo(); label = 'DEMO'; }
      else if (src.value === 'av') { const s = $('#' + id + 'sym').value.trim().toUpperCase(); series = await Data.alphaVantageDaily(s); label = s; }
      else {
        const f = $('#' + id + 'file').files[0]; if (!f) throw new Error('Choose a CSV file first');
        series = Data.parseCSV(await f.text()); label = f.name.replace(/\.csv$/i, '');
      }
      if (series.length < 30) throw new Error('Need at least 30 bars of data');
      msg.textContent = `${label}: ${series.length} bars, ${series[0].date} → ${series.at(-1).date}`;
      onLoad(series, label);
    } catch (e) { msg.textContent = e.message; msg.className = 'err'; }
  };
  $('#' + id + 'go').onclick = load;
  if (opts.autoload !== false) load();
}

/* ---------- Indicators (arrays aligned with input; null until enough data) ---------- */
const Ind = {
  sma(v, n) { const o = Array(v.length).fill(null); let s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; if (i >= n - 1) o[i] = s / n; } return o; },
  ema(v, n) { const o = Array(v.length).fill(null), k = 2 / (n + 1); let e = null; for (let i = 0; i < v.length; i++) { if (i === n - 1) e = v.slice(0, n).reduce((a, b) => a + b) / n; else if (i >= n) e = v[i] * k + e * (1 - k); o[i] = e; } return o; },
  rsi(v, n = 14) {
    const o = Array(v.length).fill(null); let g = 0, l = 0;
    for (let i = 1; i < v.length; i++) {
      const d = v[i] - v[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } }
      else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    }
    return o;
  },
  macd(v, f = 12, s = 26, sig = 9) {
    const ef = this.ema(v, f), es = this.ema(v, s);
    const line = v.map((_, i) => ef[i] != null && es[i] != null ? ef[i] - es[i] : null);
    const start = line.findIndex(x => x != null);
    const sigArr = Array(v.length).fill(null);
    if (start >= 0) { const e = this.ema(line.slice(start), sig); e.forEach((x, i) => sigArr[start + i] = x); }
    return { line, signal: sigArr, hist: line.map((x, i) => x != null && sigArr[i] != null ? x - sigArr[i] : null) };
  },
  bollinger(v, n = 20, k = 2) {
    const m = this.sma(v, n);
    const sd = v.map((_, i) => { if (m[i] == null) return null; const w = v.slice(i - n + 1, i + 1); return Math.sqrt(w.reduce((a, x) => a + (x - m[i]) ** 2, 0) / n); });
    return { mid: m, upper: m.map((x, i) => x == null ? null : x + k * sd[i]), lower: m.map((x, i) => x == null ? null : x - k * sd[i]) };
  },
  atr(series, n = 14) {
    const tr = series.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - series[i - 1].close), Math.abs(b.low - series[i - 1].close)));
    const o = Array(series.length).fill(null); let a = null;
    for (let i = 0; i < tr.length; i++) { if (i === n - 1) a = tr.slice(0, n).reduce((x, y) => x + y) / n; else if (i >= n) a = (a * (n - 1) + tr[i]) / n; o[i] = a; }
    return o;
  },
};

/* ---------- Chart helpers (Chart.js) ---------- */
const COLORS = ['#4c9aff', '#f5b041', '#2ecc71', '#ff5c5c', '#b084f5', '#5dd3d3', '#f78fb3', '#a3cb38'];
Chart.defaults.color = '#8b98a5';
Chart.defaults.borderColor = '#2a3542';
Chart.defaults.font.family = getComputedStyle(document.documentElement).fontFamily;

function lineChart(canvas, labels, datasets, opts = {}) {
  const c = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: datasets.map((d, i) => ({ borderColor: d.color || COLORS[i % COLORS.length], backgroundColor: d.color || COLORS[i % COLORS.length], borderWidth: 1.6, pointRadius: 0, tension: 0, spanGaps: true, ...d })) },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { ...(opts.y || {}) } },
      plugins: { legend: { display: datasets.length > 1 }, ...(opts.plugins || {}) },
      ...(opts.extra || {}),
    },
  });
  App.charts.push(c); return c;
}

function barChart(canvas, labels, datasets, opts = {}) {
  const c = new Chart(canvas, {
    type: opts.type || 'bar',
    data: { labels, datasets: datasets.map((d, i) => ({ backgroundColor: d.color || COLORS[i % COLORS.length], ...d })) },
    options: { responsive: true, maintainAspectRatio: false, animation: false, indexAxis: opts.horizontal ? 'y' : 'x', plugins: { legend: { display: datasets.length > 1 || opts.legend } }, ...(opts.extra || {}) },
  });
  App.charts.push(c); return c;
}
