require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.SHRINKME_API_KEY || '';
if (!API_KEY) {
  console.warn('Warning: SHRINKME_API_KEY not set in environment. Set it before deploying.');
}

// simple in-memory store for links and stats
const routes = {}; // alias -> target (short link)
const stats = {}; // alias -> {clicks: number, countries: {}}

// Dashboard API: get stats + routes
app.get('/api/stats', (req, res) => {
  res.json({ ok: true, stats, routes });
});

// Add a link via POST from dashboard
app.post('/api/add', (req, res) => {
  const { alias, link } = req.body;
  if (!alias || !link) return res.status(400).json({ ok:false, error:'alias and link required' });
  // Ensure direct=1 present to reduce redirects
  let modified = link;
  if (!/(&|\?)direct=1/.test(link)) {
    modified += (link.includes('?') ? '&' : '?') + 'direct=1';
  }
  routes[alias] = modified;
  stats[alias] = stats[alias] || { clicks: 0, countries: {} };
  return res.json({ ok:true, alias, short: modified });
});

// Redirect endpoint
app.get('/:alias', async (req, res) => {
  const alias = req.params.alias;
  const target = routes[alias];
  if (!target) return res.status(404).send('Link not found');
  // record click (simple)
  stats[alias] = stats[alias] || { clicks: 0, countries: {} };
  stats[alias].clicks += 1;
  // country detection (best-effort from headers)
  const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || 'unknown';
  stats[alias].countries[country] = (stats[alias].countries[country] || 0) + 1;
  // redirect (302 preserves monetizer counting)
  return res.redirect(302, target);
});

// ShrinkMe API proxy shorten (optional)
app.post('/api/shorten', async (req, res) => {
  const { url, alias } = req.body;
  if (!url) return res.status(400).json({ ok:false, error:'url required' });
  try {
    const apiUrl = `https://shrinkme.io/api?api=${API_KEY}&url=${encodeURIComponent(url)}${alias?('&optional='+encodeURIComponent(alias)):''}&direct=1`;
    const r = await fetch(apiUrl);
    const text = await r.text();
    return res.json({ ok:true, short: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error:'api failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
