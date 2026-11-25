App.register('settings', {
  title: 'Settings', group: 'Settings',
  desc: 'API keys and data. Everything is stored only in this browser (localStorage).',
  render(el) {
    el.innerHTML = `
      <div class="card"><h2 style="margin-top:0">Alpha Vantage key (stock prices)</h2>
        <p class="muted">Free at <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener">alphavantage.co</a>. Without one, the site uses the public "demo" key, which only covers a few sample symbols.</p>
        <div class="row"><input id="stAV" type="password" style="min-width:320px" value="${esc(Store.get('avKey', ''))}"><button id="stAVs">Save</button></div></div>
      <div class="card"><h2 style="margin-top:0">Anthropic API key (AI Chart Analysis)</h2>
        <p class="muted">Get one at <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a>. Calls are billed to this key. It is stored only in this browser and sent only to api.anthropic.com.</p>
        <div class="row"><input id="stAN" type="password" style="min-width:320px" value="${esc(Store.get('anthropicKey', ''))}"><button id="stANs">Save</button></div></div>
      <div class="card"><h2 style="margin-top:0">Your data</h2><div class="row">
        <button class="ghost" id="stExp">Back up all data (JSON)</button>
        <label>Restore backup<input type="file" id="stImp" accept=".json"></label>
        <button class="ghost" id="stClr">Clear everything</button></div><span id="stMsg" class="muted"></span></div>`;
    const ok = t => { $('#stMsg').textContent = t; };
    $('#stAVs').onclick = () => { Store.set('avKey', $('#stAV').value.trim()); ok('Alpha Vantage key saved'); };
    $('#stANs').onclick = () => { Store.set('anthropicKey', $('#stAN').value.trim()); ok('Anthropic key saved'); };
    $('#stExp').onclick = () => {
      const d = {}; Object.keys(localStorage).filter(k => k.startsWith('md_') && !/Key$/.test(k)).forEach(k => d[k] = localStorage.getItem(k));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = 'marketdesk-backup.json'; a.click();
    };
    $('#stImp').onchange = async e => { const d = JSON.parse(await e.target.files[0].text()); Object.entries(d).forEach(([k, v]) => k.startsWith('md_') && localStorage.setItem(k, v)); ok('Backup restored'); };
    $('#stClr').onclick = () => { if (!confirm('Delete your portfolio, journal and keys from this browser?')) return; Object.keys(localStorage).filter(k => k.startsWith('md_')).forEach(k => localStorage.removeItem(k)); ok('All data cleared'); };
  },
});
