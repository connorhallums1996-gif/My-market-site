/* AI Chart Analysis: upload a chart screenshot, Claude describes trend, levels and patterns.
   Uses the official Anthropic TypeScript/JS SDK loaded from a CDN, with the visitor's own API key
   (stored only in their browser). For a public site, move this call to a small server so your key stays secret. */
App.register('ai-chart', {
  title: 'AI Chart Analysis', group: 'Trading',
  desc: 'Upload a chart screenshot and get an AI read of trend, support/resistance and patterns.',
  render(el) {
    const hasKey = !!Store.get('anthropicKey', '');
    el.innerHTML = `
      ${hasKey ? '' : '<p class="note">Add your Anthropic API key in <a href="#/settings">Settings</a> first. It stays in your browser.</p>'}
      <div class="card">
        <div class="row">
          <label>Chart image (PNG/JPG/WebP)<input type="file" id="aiF" accept="image/png,image/jpeg,image/webp,image/gif"></label>
          <label>Timeframe<select id="aiTf"><option>Unknown</option><option>Intraday</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
          <label>Your style<select id="aiSt"><option>Swing trader</option><option>Day trader</option><option>Long-term investor</option></select></label>
        </div>
        <label>Anything specific to look at? (optional)<textarea id="aiQ" placeholder="e.g. Is this a head-and-shoulders? Where is support?"></textarea></label>
        <div class="row" style="margin-top:10px"><button id="aiGo" ${hasKey ? '' : 'disabled'}>Analyse chart</button><span id="aiMsg" class="muted"></span></div>
        <img id="aiPrev" style="max-width:100%;margin-top:10px;display:none;border-radius:8px">
      </div>
      <div class="card prose" id="aiOut" style="white-space:pre-wrap;display:none"></div>`;
    $('#aiF').onchange = () => { const f = $('#aiF').files[0]; if (f) { $('#aiPrev').src = URL.createObjectURL(f); $('#aiPrev').style.display = 'block'; } };
    $('#aiGo').onclick = () => this.analyse();
  },

  async analyse() {
    const f = $('#aiF').files[0], msg = $('#aiMsg'), out = $('#aiOut');
    if (!f) { msg.textContent = 'Choose an image first'; return; }
    if (f.size > 5 * 1024 * 1024) { msg.textContent = 'Image must be under 5 MB'; return; }
    $('#aiGo').disabled = true; msg.textContent = 'Analysing…'; msg.className = 'muted';
    out.style.display = 'block'; out.textContent = '';
    try {
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
      const { default: Anthropic } = await import('https://esm.sh/@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: Store.get('anthropicKey', ''), dangerouslyAllowBrowser: true });
      const prompt = `You are a technical analysis educator. Analyse this price chart for a ${$('#aiSt').value.toLowerCase()} (timeframe: ${$('#aiTf').value}).
Cover, with short headed sections in plain text:
1. Trend (direction and strength)
2. Key support and resistance levels (read the price axis; say if values are unreadable)
3. Chart patterns or candlestick patterns you can actually see
4. Indicators visible on the chart and what they show
5. Bullish case and bearish case, with the price level that would prove each wrong
6. Overall bias: Bullish / Bearish / Neutral, with a confidence of low/medium/high
Only describe what is visible. Do not invent numbers. End with one line reminding the reader this is education, not financial advice.
${$('#aiQ').value.trim() ? 'The user also asks: ' + $('#aiQ').value.trim() : ''}`;
      const stream = client.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: f.type, data } },
          { type: 'text', text: prompt },
        ] }],
      });
      stream.on('text', t => { out.textContent += t; });
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') { out.textContent += '\n\n[The model declined this request.]'; }
      msg.textContent = 'Done';
    } catch (e) {
      msg.textContent = (e.status === 401 ? 'Invalid API key. ' : '') + (e.message || String(e)); msg.className = 'err';
    } finally { $('#aiGo').disabled = false; }
  },
});
