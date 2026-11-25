/* World map pages. All economic data comes from the World Bank (free, no key). */
App.register('heatmap', {
  title: 'Global Heat Map', group: 'World Maps',
  desc: 'Colour-coded world map of growth, inflation, jobs, stock-market size and more. Click a country for its history.',
  render(el) {
    indicatorMapPage(el, { indicators: [
      { name: 'GDP growth (annual %)', code: 'NY.GDP.MKTP.KD.ZG', unit: '%', diverging: true },
      { name: 'Inflation, consumer prices (%)', code: 'FP.CPI.TOTL.ZG', unit: '%', scheme: 'reds' },
      { name: 'Unemployment (% of labour force)', code: 'SL.UEM.TOTL.ZS', unit: '%', scheme: 'oranges' },
      { name: 'Stock market capitalisation (% of GDP)', code: 'CM.MKT.LCAP.GD.ZS', unit: '%', scheme: 'blues' },
      { name: 'GDP per person (US$)', code: 'NY.GDP.PCAP.CD', scheme: 'greens' },
      { name: 'Current account balance (% of GDP)', code: 'BN.CAB.XOKA.GD.ZS', unit: '%', diverging: true },
      { name: 'Government debt (% of GDP)', code: 'GC.DOD.TOTL.GD.ZS', unit: '%', scheme: 'purples' },
    ] });
  },
});

App.register('mining-globe', {
  title: 'Mining Globe', group: 'World Maps',
  desc: 'A spinning 3D globe of how much each economy depends on mining, with some of the world’s best-known mines marked.',
  mines: [
    ['Escondida', 'Chile', 'Copper', -24.27, -69.07], ['Grasberg', 'Indonesia', 'Copper, gold', -4.05, 137.11], ['Carajás', 'Brazil', 'Iron ore', -6.07, -50.17],
    ['Pilbara region', 'Australia', 'Iron ore', -22.5, 118.5], ['Muruntau', 'Uzbekistan', 'Gold', 41.5, 64.6], ['Carlin Trend', 'USA', 'Gold', 40.9, -116.3],
    ['Kiruna', 'Sweden', 'Iron ore', 67.85, 20.2], ['Norilsk', 'Russia', 'Nickel, palladium', 69.35, 88.2], ['Bingham Canyon', 'USA', 'Copper', 40.52, -112.15],
    ['Kolwezi', 'DR Congo', 'Copper, cobalt', -10.7, 25.47], ['Greenbushes', 'Australia', 'Lithium', -33.86, 116.06], ['Salar de Atacama', 'Chile', 'Lithium', -23.5, -68.25],
    ['Witwatersrand', 'South Africa', 'Gold', -26.2, 27.9], ['Bushveld Complex', 'South Africa', 'Platinum group metals', -24.9, 29.5], ['Olympic Dam', 'Australia', 'Copper, uranium', -30.44, 136.88],
    ['Cigar Lake', 'Canada', 'Uranium', 58.07, -104.53], ['Bayan Obo', 'China', 'Rare earths', 41.77, 109.97], ['Oyu Tolgoi', 'Mongolia', 'Copper, gold', 43.0, 106.85],
  ],
  render(el) {
    indicatorMapPage(el, {
      globe: true,
      points: this.mines.map(([n, c, m, lat, lon]) => ({ lat, lon, r: 5, label: `<b>${n}</b> (${c})<br>${m}<br><span style="opacity:.7">approx. location</span>` })),
      indicators: [
        { name: 'Mineral rents (% of GDP)', code: 'NY.GDP.MINR.RT.ZS', unit: '%', scheme: 'ylorbr' },
        { name: 'Ores & metals exports (% of goods exports)', code: 'TX.VAL.MMTL.ZS.UN', unit: '%', scheme: 'oranges' },
        { name: 'Coal rents (% of GDP)', code: 'NY.GDP.COAL.RT.ZS', unit: '%', scheme: 'purples' },
      ],
      extraHtml: '<p class="muted" style="font-size:12px">Drag the globe to turn it. Yellow dots are major mines (locations are approximate).</p>',
    });
  },
});

App.register('industry', {
  title: 'Industrial Tracker', group: 'World Maps',
  desc: 'Manufacturing and industry around the world: share of the economy, growth and jobs.',
  render(el) {
    indicatorMapPage(el, { indicators: [
      { name: 'Manufacturing (% of GDP)', code: 'NV.IND.MANF.ZS', unit: '%', scheme: 'blues' },
      { name: 'Manufacturing growth (annual %)', code: 'NV.IND.MANF.KD.ZG', unit: '%', diverging: true },
      { name: 'Industry incl. construction (% of GDP)', code: 'NV.IND.TOTL.ZS', unit: '%', scheme: 'purples' },
      { name: 'Industry growth (annual %)', code: 'NV.IND.TOTL.KD.ZG', unit: '%', diverging: true },
      { name: 'Jobs in industry (% of employment)', code: 'SL.IND.EMPL.ZS', unit: '%', scheme: 'oranges' },
      { name: 'High-tech exports (% of manufactured exports)', code: 'TX.VAL.TECH.MF.ZS', unit: '%', scheme: 'greens' },
    ] });
  },
});

App.register('reit-map', {
  title: 'REIT Map', group: 'World Maps',
  desc: 'Which countries have a REIT (real estate investment trust) system, and when each one started.',
  // [ISO3, year introduced, local name]. Compiled for education; verify before relying on it.
  regimes: [['USA', 1960, 'REIT'], ['NLD', 1969, 'FBI'], ['AUS', 1971, 'A-REIT'], ['BRA', 1993, 'FII'], ['CAN', 1993, 'REIT'], ['BEL', 1995, 'SICAFI / RREC'],
    ['TUR', 1995, 'GYO'], ['GRC', 1999, 'REIC'], ['JPN', 2000, 'J-REIT'], ['KOR', 2001, 'K-REIT'], ['SGP', 2002, 'S-REIT'], ['TWN', 2003, 'T-REIT'], ['FRA', 2003, 'SIIC'],
    ['BGR', 2004, 'SPIC'], ['MYS', 2005, 'M-REIT'], ['ISR', 2006, 'REIT'], ['ARE', 2006, 'REIT'], ['DEU', 2007, 'G-REIT'], ['GBR', 2007, 'UK-REIT'], ['ITA', 2007, 'SIIQ'],
    ['PAK', 2008, 'REIT'], ['FIN', 2009, 'REIT'], ['ESP', 2009, 'SOCIMI'], ['PHL', 2009, 'REIT'], ['MEX', 2010, 'FIBRA'], ['HUN', 2011, 'SZIT'], ['THA', 2012, 'REIT'],
    ['IRL', 2013, 'REIT'], ['ZAF', 2013, 'SA REIT'], ['KEN', 2013, 'REIT'], ['IND', 2014, 'REIT'], ['SAU', 2016, 'REIT'], ['PRT', 2019, 'SIGI'], ['CHN', 2021, 'C-REIT (infrastructure)']],
  render(el) {
    el.innerHTML = `<div class="card"><div id="rmMap" class="map-box"></div></div>
      <div class="card"><h2 style="margin-top:0">REIT regimes by start year</h2><div id="rmT"></div></div>
      <p class="note">This list is general background compiled for education. Rules and dates change, so check a current official source before relying on it. Hong Kong (2003) is too small to show on this map.</p>`;
    const names = Object.fromEntries(WORLD_GEO.features.map(f => [f.id, f.properties.name]));
    const data = Object.fromEntries(this.regimes.map(([iso, y, n]) => [iso, { value: y, year: y, extra: n }]));
    Maps.flat($('#rmMap'), data, { scheme: 'purples', format: v => 'since ' + v, legendFormat: v => Math.round(v) });
    $('#rmT').innerHTML = `<table><tr><th>Country</th><th>Name</th><th class="num">Year</th></tr>${this.regimes.map(([iso, y, n]) => `<tr><td>${esc(names[iso] || iso)}</td><td>${esc(n)}</td><td class="num">${y}</td></tr>`).join('')}</table>`;
  },
});

App.register('oil-map', {
  title: 'Oil Map', group: 'World Maps',
  desc: 'Where the world’s oil and gas money flows: oil rents, fuel exports, energy import dependence, plus Brent and WTI prices.',
  render(el) {
    indicatorMapPage(el, {
      indicators: [
        { name: 'Oil rents (% of GDP)', code: 'NY.GDP.PETR.RT.ZS', unit: '%', scheme: 'ylorbr' },
        { name: 'Fuel exports (% of goods exports)', code: 'TX.VAL.FUEL.ZS.UN', unit: '%', scheme: 'oranges' },
        { name: 'Natural gas rents (% of GDP)', code: 'NY.GDP.NGAS.RT.ZS', unit: '%', scheme: 'blues' },
        { name: 'Net energy imports (% of energy use)', code: 'EG.IMP.CONS.ZS', unit: '%', diverging: true },
      ],
      extraHtml: `<h2>Brent vs WTI crude (US$ per barrel, monthly)</h2><div class="chart-box" style="height:260px"><canvas id="omC"></canvas></div><p id="omMsg" class="muted" style="font-size:12px">Prices: Alpha Vantage.</p>`,
      after: async () => {
        try {
          const get = f => getJSON(`https://www.alphavantage.co/query?function=${f}&interval=monthly&apikey=${Data.avKey()}`);
          const [b, w] = await Promise.all([get('BRENT'), get('WTI')]);
          if (!$('#omC')) return;
          if (!b.data || !w.data) throw new Error(b.Information || b.Note || 'No price data');
          const wm = Object.fromEntries(w.data.map(x => [x.date, +x.value]));
          const rows = b.data.filter(x => x.value !== '.').slice(0, 120).reverse();
          lineChart($('#omC'), rows.map(x => x.date.slice(0, 7)), [{ label: 'Brent', data: rows.map(x => +x.value), color: '#f5b041' }, { label: 'WTI', data: rows.map(x => wm[x.date] ?? null), color: '#4c9aff' }]);
        } catch (e) { if ($('#omMsg')) $('#omMsg').textContent = 'Oil prices unavailable: ' + e.message; }
      },
    });
  },
});

App.register('finance-map', {
  title: 'Finance Map', group: 'World Maps',
  desc: 'Banking and capital markets by country: credit, interest rates, bank health and stock trading.',
  render(el) {
    indicatorMapPage(el, { indicators: [
      { name: 'Bank credit to private sector (% of GDP)', code: 'FS.AST.PRVT.GD.ZS', unit: '%', scheme: 'blues' },
      { name: 'Lending interest rate (%)', code: 'FR.INR.LEND', unit: '%', scheme: 'reds' },
      { name: 'Real interest rate (%)', code: 'FR.INR.RINR', unit: '%', diverging: true },
      { name: 'Stock market capitalisation (% of GDP)', code: 'CM.MKT.LCAP.GD.ZS', unit: '%', scheme: 'greens' },
      { name: 'Stocks traded (% of GDP)', code: 'CM.MKT.TRAD.GD.ZS', unit: '%', scheme: 'purples' },
      { name: 'Bad loans (% of total bank loans)', code: 'FB.AST.NPER.ZS', unit: '%', scheme: 'oranges' },
      { name: 'Bank capital to assets (%)', code: 'FB.BNK.CAPA.ZS', unit: '%', scheme: 'greens' },
    ] });
  },
});
