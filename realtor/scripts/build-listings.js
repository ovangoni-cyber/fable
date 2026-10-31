// Builds data/listings.json (what the site reads) from data/propiedades/*.json (what the admin panel edits).
// Netlify runs it on every publish (see netlify.toml). To run it by hand: node scripts/build-listings.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'data', 'propiedades');
const out = path.join(root, 'data', 'listings.json');

// Neighborhood names come from the panel (Web → Vecindarios); used when a property has no "Ubicación que se muestra".
let AREAS = {};
const CENTERS = {};
// A point from the panel's map field: '{"type":"Point","coordinates":[lng, lat]}'.
function point(v) {
  try {
    const g = typeof v === 'string' ? JSON.parse(v) : v;
    const [lng, lat] = (g && g.coordinates) || [];
    return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: +lat, lng: +lng } : null;
  } catch (e) { return null; }
}
try {
  for (const z of JSON.parse(fs.readFileSync(path.join(root, 'data', 'web', 'vecindarios.json'), 'utf8')).zonas || []) {
    if (!z || !z.id) continue;
    AREAS[z.id] = z.nombre_en || z.nombre || z.id;
    if (point(z.mapa)) CENTERS[z.id] = point(z.mapa);
  }
} catch (e) { console.warn('data/web/vecindarios.json: ' + e.message); }

// Where the property goes on the map. Without its own point it sits near the neighborhood's center
// (marked approximate). Off-market properties are never placed on the map.
function geo(p, id) {
  if (p.status === 'private') return null;
  const own = point(p.ubicacion);
  if (own) return { lat: +own.lat.toFixed(5), lng: +own.lng.toFixed(5) };
  const c = CENTERS[p.area];
  if (!c) return null;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.008, dy = ((((h / 1000) | 0) % 1000) / 1000 - 0.5) * 0.008;
  return { lat: +(c.lat + dy).toFixed(4), lng: +(c.lng + dx).toFixed(4), approx: true };
}
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
    video: String(p.video_url || p.video_file || '').trim(),
    geo: geo(p, id),
    desc: { en: en.desc || p.desc || '', es: p.desc || en.desc || '' },
    features: { en: lines(en.features).length ? lines(en.features) : features, es: features }
  });
}

fs.writeFileSync(out, JSON.stringify({ listings }, null, 2) + '\n');
// The same data as a script, for when the site is opened straight from a folder (see js/listings.js).
fs.writeFileSync(path.join(root, 'data', 'listings.js'), '// Written by scripts/build-listings.js. Do not edit by hand.\nwindow.LISTINGS_DATA = ' + JSON.stringify({ listings }) + ';\n');
console.log('data/listings.json: ' + listings.length + ' properties');
