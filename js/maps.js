/* Maps: flat choropleth + draggable 3D globe (d3), and World Bank data helpers. */
const WorldBank = {
  /* Latest available value per country for an indicator. Returns {ISO3: {value, year, name}} */
  async latest(code) {
    const j = await getJSON(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&mrnev=1`);
    const out = {};
    (j[1] || []).forEach(r => { if (r.value != null && r.countryiso3code) out[r.countryiso3code] = { value: r.value, year: r.date, name: r.country.value }; });
    return out;
  },
  /* Yearly history for one country. Returns [{year, value}] oldest -> newest */
  async history(iso3, code) {
    const j = await getJSON(`https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=100`);
    return (j[1] || []).filter(r => r.value != null).map(r => ({ year: r.date, value: r.value })).reverse();
  },
};

const Maps = {
  tooltip() {
    let t = $('.tooltip'); if (!t) { t = document.createElement('div'); t.className = 'tooltip'; document.body.appendChild(t); }
    return t;
  },

  colorScale(values, scheme = 'blues', diverging = false) {
    const v = values.filter(isFinite).sort((a, b) => a - b);
    if (!v.length) return () => '#2a3542';
    const lo = d3.quantile(v, 0.05), hi = d3.quantile(v, 0.95);
    if (diverging) {
      const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
      return d3.scaleDiverging([-m, 0, m], d3.interpolateRdYlGn).clamp(true);
    }
    const interp = { blues: d3.interpolateBlues, oranges: d3.interpolateOranges, greens: d3.interpolateGreens, purples: d3.interpolatePurples, reds: d3.interpolateReds, ylorbr: d3.interpolateYlOrBr }[scheme] || d3.interpolateBlues;
    return d3.scaleSequential([lo, hi], t => interp(0.15 + t * 0.85)).clamp(true);
  },

  legend(el, scale, unit = '', f = v => fmt(v, 1)) {
    const dom = scale.domain(), lo = dom[0], hi = dom[dom.length - 1];
    const stops = d3.range(0, 1.01, 0.1).map(t => scale(lo + t * (hi - lo)));
    el.innerHTML = `<div class="legend"><span>${f(lo)}${unit}</span><div class="bar" style="background:linear-gradient(90deg,${stops.join(',')})"></div><span>${f(hi)}${unit}</span><span>· grey = no data</span></div>`;
  },

  /* data: {ISO3: {value, year, name?}}; opts: {scheme, diverging, unit, onClick(iso3, name), points:[{lon,lat,label}]} */
  flat(el, data, opts = {}) {
    el.innerHTML = '';
    const W = 960, H = 500;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const proj = d3.geoNaturalEarth1().fitSize([W, H], WORLD_GEO);
    const path = d3.geoPath(proj);
    const scale = this.colorScale(Object.values(data).map(d => d.value), opts.scheme, opts.diverging);
    const tip = this.tooltip();
    svg.append('path').datum({ type: 'Sphere' }).attr('d', path).attr('fill', '#121a22');
    svg.append('g').selectAll('path').data(WORLD_GEO.features).join('path')
      .attr('d', path).attr('stroke', '#0f1419').attr('stroke-width', 0.5)
      .attr('fill', f => data[f.id] ? scale(data[f.id].value) : '#2a3542')
      .style('cursor', opts.onClick ? 'pointer' : 'default')
      .on('mousemove', (e, f) => {
        const d = data[f.id];
        tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px';
        tip.innerHTML = `<b>${esc(f.properties.name)}</b><br>${d ? (opts.format ? opts.format(d.value) : fmt(d.value, 2) + (opts.unit || '') + ` <span style="opacity:.7">(${d.year})</span>`) : 'No data'}${d && d.extra ? '<br>' + d.extra : ''}`;
      })
      .on('mouseleave', () => tip.style.display = 'none')
      .on('click', (e, f) => opts.onClick && opts.onClick(f.id, f.properties.name));
    if (opts.points) {
      svg.append('g').selectAll('circle').data(opts.points).join('circle')
        .attr('cx', d => proj([d.lon, d.lat])[0]).attr('cy', d => proj([d.lon, d.lat])[1])
        .attr('r', d => d.r || 4).attr('fill', d => d.color || '#f5b041').attr('stroke', '#000').attr('stroke-width', .6)
        .on('mousemove', (e, d) => { tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px'; tip.innerHTML = d.label; })
        .on('mouseleave', () => tip.style.display = 'none');
    }
    const lg = document.createElement('div'); el.appendChild(lg); this.legend(lg, scale, opts.unit || '', opts.legendFormat);
  },

  /* Orthographic globe: drag to rotate, spins slowly until touched. */
  globe(el, data, opts = {}) {
    el.innerHTML = '';
    const S = 560;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${S} ${S}`).style('max-width', '560px').style('margin', '0 auto').style('cursor', 'grab');
    const proj = d3.geoOrthographic().scale(S / 2 - 10).translate([S / 2, S / 2]).rotate([-20, -20]).clipAngle(90);
    const path = d3.geoPath(proj);
    const scale = this.colorScale(Object.values(data).map(d => d.value), opts.scheme, opts.diverging);
    const tip = this.tooltip();
    svg.append('path').datum({ type: 'Sphere' }).attr('fill', '#0d2236').attr('stroke', '#2a3542');
    svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', '#ffffff12');
    const countries = svg.append('g').selectAll('path').data(WORLD_GEO.features).join('path')
      .attr('stroke', '#0f1419').attr('stroke-width', 0.4)
      .attr('fill', f => data[f.id] ? scale(data[f.id].value) : '#2a3542')
      .on('mousemove', (e, f) => {
        const d = data[f.id];
        tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px';
        tip.innerHTML = `<b>${esc(f.properties.name)}</b><br>${d ? fmt(d.value, 2) + (opts.unit || '') + ` (${d.year})` : 'No data'}`;
      })
      .on('mouseleave', () => tip.style.display = 'none')
      .on('click', (e, f) => opts.onClick && opts.onClick(f.id, f.properties.name));
    const pts = svg.append('g').selectAll('circle').data(opts.points || []).join('circle')
      .attr('r', d => d.r || 4).attr('fill', d => d.color || '#f5b041').attr('stroke', '#000').attr('stroke-width', .6)
      .on('mousemove', (e, d) => { tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px'; tip.innerHTML = d.label; })
      .on('mouseleave', () => tip.style.display = 'none');
    const redraw = () => {
      svg.selectAll('path').attr('d', path);
      pts.each(function (d) {
        const visible = d3.geoDistance([d.lon, d.lat], [-proj.rotate()[0], -proj.rotate()[1]]) < Math.PI / 2;
        const [x, y] = proj([d.lon, d.lat]);
        d3.select(this).attr('cx', x).attr('cy', y).style('display', visible ? null : 'none');
      });
    };
    let spinning = true;
    svg.call(d3.drag().on('start', () => { spinning = false; svg.style('cursor', 'grabbing'); })
      .on('drag', e => { const r = proj.rotate(); proj.rotate([r[0] + e.dx * 0.4, Math.max(-80, Math.min(80, r[1] - e.dy * 0.4))]); redraw(); })
      .on('end', () => svg.style('cursor', 'grab')));
    const timer = d3.timer(() => { if (!document.body.contains(el)) return timer.stop(); if (spinning) { const r = proj.rotate(); proj.rotate([r[0] + 0.15, r[1]]); redraw(); } });
    redraw();
    const lg = document.createElement('div'); el.appendChild(lg); this.legend(lg, scale, opts.unit || '', opts.legendFormat);
  },
};

/* Builds a full "indicator map" page: dropdown of World Bank indicators, map/globe, click a country for its history. */
function indicatorMapPage(el, cfg) {
  el.innerHTML = `
    <div class="card">
      <div class="row">
        <label>Indicator<select id="imInd">${cfg.indicators.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select></label>
        ${cfg.globe ? '' : '<label>View<select id="imView"><option value="flat">Flat map</option><option value="globe">Globe</option></select></label>'}
        <span id="imMsg" class="muted"></span>
      </div>
      <div id="imMap" class="map-box"></div>
      ${cfg.extraHtml || ''}
    </div>
    <div class="card"><h2 id="imTitle" style="margin-top:0">Click a country for its history</h2><div class="chart-box" style="height:260px"><canvas id="imChart"></canvas></div></div>
    <div class="card"><h2 style="margin-top:0">Top 15</h2><div id="imTable"></div></div>
    <p class="muted" style="font-size:12px">Source: World Bank Open Data (api.worldbank.org). Latest available year per country.</p>`;
  let current, chart, data = {};
  const showHistory = async (iso3, name) => {
    $('#imTitle').textContent = `${name} — ${current.name}`;
    const h = await WorldBank.history(iso3, current.code);
    if (!document.body.contains(el)) return;
    if (chart) chart.destroy();
    chart = lineChart($('#imChart'), h.map(x => x.year), [{ label: current.name, data: h.map(x => x.value), fill: false }]);
  };
  const draw = async () => {
    current = cfg.indicators[$('#imInd').value];
    $('#imMsg').textContent = 'Loading…';
    try {
      data = await WorldBank.latest(current.code);
      if (!document.body.contains(el)) return; // user left the page
      $('#imMsg').textContent = '';
      const opts = { scheme: current.scheme || cfg.scheme, diverging: current.diverging, unit: current.unit || '', onClick: showHistory, points: cfg.points };
      const view = cfg.globe ? 'globe' : $('#imView').value;
      Maps[view]($('#imMap'), data, opts);
      const valid = new Set(WORLD_GEO.features.map(f => f.id));
      const top = Object.entries(data).filter(([k]) => valid.has(k)).sort((a, b) => b[1].value - a[1].value).slice(0, 15);
      $('#imTable').innerHTML = `<table><tr><th>#</th><th>Country</th><th class="num">${esc(current.name)}</th><th class="num">Year</th></tr>${top.map(([k, d], i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td class="num">${fmt(d.value, 2)}${current.unit || ''}</td><td class="num">${d.year}</td></tr>`).join('')}</table>`;
    } catch (e) { if (!$('#imMsg')) return; $('#imMsg').textContent = e.message; $('#imMsg').className = 'err'; }
  };
  $('#imInd').onchange = draw;
  if ($('#imView')) $('#imView').onchange = draw;
  draw();
  if (cfg.after) cfg.after(el);
}
