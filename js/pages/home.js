App.register('home', {
  title: 'Home', group: 'Start',
  desc: 'Trading tools, calculators and live world market maps. Pick a tool to get started.',
  render(el) {
    const groups = App.groups.filter(g => g !== 'Start');
    el.innerHTML = groups.map(g => {
      const ids = App.order.filter(id => App.pages[id].group === g);
      if (!ids.length) return '';
      return `<h2>${g}</h2><div class="grid">${ids.map(id => `<a class="tile" href="#/${id}"><b>${esc(App.pages[id].title)}</b><span>${esc(App.pages[id].desc || '')}</span></a>`).join('')}</div>`;
    }).join('') + `<p class="note">Everything here is for education. Nothing on this site is financial advice. Check prices and data with your broker before trading.</p>`;
  },
});
