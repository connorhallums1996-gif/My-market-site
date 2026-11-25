# MarketDesk

A free, static markets website: trading tools, calculators and live world market maps.
It is pure HTML, CSS and JavaScript with no build step and no server, so it runs on GitHub Pages as-is.

> Rename the site by changing `SITE_NAME` at the top of `js/core.js`.

## Tools

| Section | Page | What it does | Data |
|---|---|---|---|
| Trading | Signals | MA / RSI / MACD / Bollinger / momentum signals with an overall score | Demo, Alpha Vantage or CSV |
| | Backtester | 5 strategies, next-bar-open fills, costs, CAGR, drawdown, Sharpe, trade list | Demo, Alpha Vantage or CSV |
| | AI Chart Analysis | Upload a chart screenshot and Claude analyses it | Anthropic API (your key) |
| | Portfolio Manager | Holdings, P/L, allocation by holding and sector, CSV import/export | Alpha Vantage quotes |
| | Trade Journal | Log trades, win rate, expectancy, profit factor, P/L by setup | Your browser |
| Calculators | Dividend | DRIP, dividend growth, contributions, tax | — |
| | Forex | Converter, pip value, margin, P/L | ECB rates (frankfurter.dev) |
| | Position Size | Risk-based sizing, reward:risk | — |
| Toolkit | Options Lab | Black-Scholes, American binomial, Greeks, implied vol, payoff chart | — |
| | Playbook | Plain-English guide to the concepts | — |
| | COT Report | CFTC Commitments of Traders, net positions, COT index | CFTC (live) |
| Markets | Leaderboard | US top gainers/losers/most active, plus a watchlist league | Alpha Vantage |
| | Market Mood Meter | Bull-vs-bear gauge from trend, momentum, volatility, COT | Price data + CFTC |
| World Maps | Global Heat Map | GDP growth, inflation, unemployment, market cap, debt… | World Bank (live) |
| | Mining Globe | 3D globe of mineral rents and metal exports, with major mines | World Bank |
| | Industrial Tracker | Manufacturing and industry share, growth and jobs | World Bank |
| | REIT Map | Countries with REIT regimes and the year each started | Built-in list |
| | Oil Map | Oil and gas rents, fuel exports, energy imports, Brent vs WTI | World Bank + Alpha Vantage |
| | Finance Map | Credit, interest rates, bad loans, bank capital, stock trading | World Bank |

## Run it on your computer

Browsers block some features when you open `index.html` straight from disk, so start a tiny local server:

```bash
cd my-markets-site
python -m http.server 8000
# then open http://localhost:8000
```

## Put it on GitHub (free hosting)

1. Create a new **empty** repository on github.com (e.g. `my-markets-site`).
2. In this folder run:
   ```bash
   git remote add origin https://github.com/<your-username>/my-markets-site.git
   git branch -M main
   git push -u origin main
   ```
   (Or use GitHub's website: **Add file → Upload files** and drag in the whole folder.)
3. In the repo go to **Settings → Pages**, set *Source* to `Deploy from a branch`, branch `main`, folder `/ (root)`, and save.
4. After a minute your site is live at `https://<your-username>.github.io/my-markets-site/`.

## API keys

Enter these on the site's **Settings** page. They are stored only in the visitor's browser.

- **Alpha Vantage** (free): stock prices, the leaderboard watchlist and oil prices. Without a key the public `demo` key is used, which covers only a few sample symbols.
- **Anthropic** (paid per use): powers AI Chart Analysis with model `claude-opus-5-5`.
  ⚠️ On a public website, every visitor must use *their own* key. Do not hard-code yours in the code. To offer AI analysis with your own key, move the call in `js/pages/ai-chart.js` to a small server (for example a Cloudflare Worker or Vercel function) that keeps the key secret.

World Bank, CFTC and Frankfurter data need no key.

## Project layout

```
index.html            page shell + script list
css/style.css         all styling (dark theme, colours are CSS variables at the top)
data/world.js         world country shapes (Natural Earth, public domain)
js/core.js            router, storage, price data loader, indicators, chart helpers
js/maps.js            world map + 3D globe engine, World Bank helpers
js/pages/*.js         one file per section; each calls App.register(...)
```

### Add a new page

Create `js/pages/my-page.js`:

```js
App.register('my-page', {
  title: 'My Page', group: 'Markets', desc: 'One-line description.',
  render(el) { el.innerHTML = '<div class="card">Hello</div>'; },
});
```

Then add `<script src="js/pages/my-page.js"></script>` to `index.html`. It will appear in the menu and on the home page.

## Disclaimer

For education only. Nothing on this site is financial advice.
