require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.SHRINKME_API_KEY || '';
const dataFile = path.join(__dirname, 'data.json');

let routes = {};
let stats = {};

// Load saved data
if (fs.existsSync(dataFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    routes = saved.routes || {};
    stats = saved.stats || {};
  } catch (error) {
    console.error('Failed to load data.json:', error);
  }
}

// Save helper
function saveData() {
  fs.writeFileSync(
    dataFile,
    JSON.stringify({ routes, stats }, null, 2)
  );
}

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({ ok: true, routes, stats });
});

// Add link
app.post('/api/add', (req, res) => {
  const { alias, link } = req.body;

  if (!alias || !link) {
    return res.status(400).json({
      ok: false,
      error: 'alias and link required'
    });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
    return res.status(400).json({
      ok: false,
      error: 'invalid alias'
    });
  }

  if (routes[alias]) {
    return res.status(400).json({
      ok: false,
      error: 'alias already exists'
    });
  }

  let modified = link;

  if (!/(&|\?)direct=1/.test(link)) {
    modified += (link.includes('?') ? '&' : '?') + 'direct=1';
  }

  routes[alias] = modified;
  stats[alias] = { clicks: 0, countries: {} };

  saveData();

  return res.json({
    ok: true,
    alias,
    short: `${req.protocol}://${req.get('host')}/${alias}`
  });
});

// Redirect
app.get('/:alias', (req, res) => {
  const alias = req.params.alias;
  const target = routes[alias];

  if (!target) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  stats[alias].clicks += 1;

  const country =
    req.headers['cf-ipcountry'] ||
    req.headers['x-country'] ||
    'unknown';

  stats[alias].countries[country] =
    (stats[alias].countries[country] || 0) + 1;

  saveData();

  return res.redirect(302, target);
});

// ShrinkMe shorten proxy
app.post('/api/shorten', async (req, res) => {
  const { url, alias } = req.body;

  if (!url) {
    return res.status(400).json({
      ok: false,
      error: 'url required'
    });
  }

  try {
    const apiUrl =
      `https://shrinkme.io/api?api=${API_KEY}` +
      `&url=${encodeURIComponent(url)}` +
      `${alias ? '&optional=' + encodeURIComponent(alias) : ''}` +
      `&direct=1`;

    const response = await fetch(apiUrl);
    const text = await response.text();

    return res.json({
      ok: true,
      short: text
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'api failed'
    });
  }
});

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
