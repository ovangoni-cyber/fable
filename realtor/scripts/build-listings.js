// Builds data/listings.json (what the site reads) from data/propiedades/*.json (what the admin panel edits).
// Netlify runs it on every publish (see netlify.toml). To run it by hand: node scripts/build-listings.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'data', 'propiedades');
const out = path.join(root, 'data', 'listings.json');

const AREAS = {
  'miami-beach': 'Miami Beach', 'key-biscayne': 'Key Biscayne', 'coral-gables': 'Coral Gables',
  'coconut-grove': 'Coconut Grove', 'pinecrest': 'Pinecrest', 'north-beaches': 'Golden Beach', 'brickell': 'Brickell'
};
// Characteristics are typed one per line in the panel.
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
const num = (v) => (isFinite(Number(v)) && v !== '' && v != null ? Number(v) : 0);
const today = new Date().toISOString().slice(0, 10);

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const seen = new Set();
const listings = [];

for (const file of files) {
  let p;
  try { p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch (e) {
    console.warn('Skipped ' + file + ': not valid JSON (' + e.message + ')');
    continue;
  }
  // The file name is the address of the property page: property.html?id=<file name>
  let id = path.basename(file, '.json').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  while (seen.has(id)) id += '-2';
  seen.add(id);

  const d = p.details || {};
  const en = p.en || {};
  const features = lines(p.features);
  listings.push({
    id,
    ref: p.ref || '',
    featured: !!p.featured,
    op: p.status === 'rent' ? 'rent' : 'sale',
    type: p.type || 'house',
    status: p.status || 'sale',
    exclusive: !!p.exclusive,
    area: p.area || '',
    place: d.place || AREAS[p.area] || '',
    title: { en: en.title || p.title || '', es: p.title || en.title || '' },
    price: num(p.price),
    beds: num(p.beds),
    baths: num(p.baths),
    sqft: num(p.sqft),
    lot: num(d.lot),
    water: d.water || 'none',
    frontage: num(d.frontage),
    year: num(d.year),
    listed: String(d.listed || today).slice(0, 10),
    imgs: (p.imgs || []).filter(Boolean),
    desc: { en: en.desc || p.desc || '', es: p.desc || en.desc || '' },
    features: { en: lines(en.features).length ? lines(en.features) : features, es: features }
  });
}

fs.writeFileSync(out, JSON.stringify({ listings }, null, 2) + '\n');
console.log('data/listings.json: ' + listings.length + ' properties');
