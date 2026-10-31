// Tests the site API (netlify/functions/api) against a fake GitHub contents API that works on a
// temporary copy of the site. Run from the agencia folder: node tests/api.test.mjs
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-api-'));
fs.cpSync(SITE, path.join(REPO, 'agencia'), { recursive: true, filter: (src) => !/[\\/](netlify|tests|node_modules)$/.test(src) });

const sha = (buf) => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
let forceConflict = false;
const commits = [];
const server = http.createServer(async (req, res) => {
  const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.headers.authorization !== 'Bearer test-gh') return send(401, { message: 'Bad credentials' });
  const u = new URL(req.url, 'http://x');
  const m = /^\/repos\/ovangoni-cyber\/fable\/contents\/(.+)$/.exec(u.pathname);
  if (!m) return send(404, { message: 'Not Found' });
  const rel = decodeURIComponent(m[1]); const abs = path.join(REPO, rel);
  let raw = ''; for await (const c of req) raw += c;
  const body = raw ? JSON.parse(raw) : {};
  if (req.method === 'GET') {
    if (u.searchParams.get('ref') !== 'main') return send(404, { message: 'No commit found for the ref' });
    if (!fs.existsSync(abs)) return send(404, { message: 'Not Found' });
    if (fs.statSync(abs).isDirectory()) return send(200, fs.readdirSync(abs).map((n) => { const b = fs.readFileSync(path.join(abs, n)); return { type: 'file', name: n, path: rel + '/' + n, sha: sha(b), size: b.length }; }));
    const b = fs.readFileSync(abs);
    return send(200, { type: 'file', name: path.basename(abs), path: rel, sha: sha(b), size: b.length, content: b.toString('base64'), encoding: 'base64' });
  }
  if (body.branch !== 'main') return send(422, { message: 'bad branch' });
  const exists = fs.existsSync(abs); const cur = exists ? sha(fs.readFileSync(abs)) : null;
  if (req.method === 'PUT') {
    if (forceConflict) { forceConflict = false; return send(409, { message: 'is at abc but expected def' }); }
    if (exists && !body.sha) return send(422, { message: '"sha" wasn\'t supplied.' });
    if (exists && body.sha !== cur) return send(409, { message: 'does not match' });
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const b = Buffer.from(body.content, 'base64'); fs.writeFileSync(abs, b);
    commits.push(body.message); return send(exists ? 200 : 201, { content: { sha: sha(b) }, commit: { sha: crypto.randomBytes(20).toString('hex') } });
  }
  if (req.method === 'DELETE') {
    if (!exists) return send(404, { message: 'Not Found' });
    if (body.sha !== cur) return send(409, { message: 'does not match' });
    fs.rmSync(abs); commits.push(body.message); return send(200, { commit: { sha: crypto.randomBytes(20).toString('hex') } });
  }
  send(405, {});
});
await new Promise((r) => server.listen(0, r));
process.env.GITHUB_API_URL = 'http://127.0.0.1:' + server.address().port;
process.env.GITHUB_TOKEN = 'test-gh';
process.env.API_KEY = 'clave-de-prueba-1234567890,otra-clave';
const { default: api } = await import(pathToFileURL(path.join(SITE, 'netlify/functions/api/api.mjs')).href);

const KEY = 'clave-de-prueba-1234567890';
async function call(method, p, body, { key = KEY, raw, type } = {}) {
  const headers = {};
  if (key) headers.Authorization = 'Bearer ' + key;
  let b;
  if (raw) { b = raw; headers['Content-Type'] = type || 'application/octet-stream'; }
  else if (body !== undefined) { b = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await api(new Request('https://ingridcabeza.com' + p, { method, headers, body: b }));
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}
let pass = 0, failN = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('PASS ' + name); } else { failN++; console.log('FAIL ' + name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };
const file = (p) => path.join(REPO, 'agencia', p);
const readJ = (p) => JSON.parse(fs.readFileSync(file(p), 'utf8'));

let r = await call('GET', '/api', undefined, { key: null });
ok('index without key', r.status === 200 && r.data.rutas);
r = await call('GET', '/api/propiedades', undefined, { key: null });
ok('401 without key', r.status === 401 && r.data.error === 'unauthorized');
r = await call('GET', '/api/propiedades', undefined, { key: 'mala' });
ok('401 wrong key', r.status === 401);
r = await call('GET', '/api/propiedades', undefined, { key: 'otra-clave' });
ok('second key works', r.status === 200);
r = await call('OPTIONS', '/api/propiedades', undefined, { key: null });
ok('CORS preflight', r.status === 204);

r = await call('GET', '/api/propiedades');
ok('list 18 properties', r.status === 200 && r.data.total === 18, r.data.total);
ok('summary fields', r.data.propiedades.find((p) => p.id === 'harbor-drive').ref === 'IC-2611');
r = await call('GET', '/api/propiedades?completo=1');
ok('full list', r.data.propiedades[0].desc);
r = await call('GET', '/api/esquema');
ok('schema', r.status === 200 && r.data.propiedades.campos.find((c) => c.campo === 'area').opciones_de && r.data.web.contacto);
r = await call('GET', '/api/propiedades/harbor-drive');
ok('get one', r.status === 200 && r.data.title && r.data.id === 'harbor-drive');
r = await call('GET', '/api/propiedades/no-existe');
ok('404 unknown property', r.status === 404);

// every existing file passes the panel's rules (PATCH {} rewrites it unchanged)
let allValid = true;
for (const f of fs.readdirSync(file('data/propiedades'))) {
  const id = f.replace('.json', ''); const before = readJ('data/propiedades/' + f);
  const x = await call('PATCH', '/api/propiedades/' + id, {});
  if (x.status !== 200 || !x.data.sin_cambios) { allValid = false; console.log('  ', id, JSON.stringify(x.data.detalles || x.data).slice(0, 300)); }
  else if (JSON.stringify(readJ('data/propiedades/' + f)) !== JSON.stringify(before)) { allValid = false; console.log('  changed', id); }
}
ok('all 18 existing properties valid and unchanged', allValid);
ok('no commits for unchanged data', commits.length === 0, commits);
for (const s of ['contacto', 'portada', 'vecindarios', 'servicios', 'valoracion', 'sobre-mi', 'testimonios', 'pagina-propiedades', 'guias', 'calculadora']) {
  const before = readJ('data/web/' + s + '.json');
  const x = await call('PATCH', '/api/web/' + s, {});
  ok('web section valid and unchanged: ' + s, x.status === 200 && x.data.sin_cambios && JSON.stringify(readJ('data/web/' + s + '.json')) === JSON.stringify(before), x.data.detalles);
}

// create
const bad = await call('POST', '/api/propiedades', { ref: 'IC 9999', status: 'algo', area: 'marte', price: 'caro', beds: 2.5, imgs: [], extra: 1 });
ok('invalid property rejected with details', bad.status === 400 && bad.data.detalles.length >= 6, bad.data);
console.log('   e.g.', bad.data.detalles.slice(0, 4).map((d) => d.campo + ': ' + d.error).join(' | '));
const nueva = {
  title: 'Casa en canal con salida al Golfo', ref: 'IC-9999', status: 'new', type: 'house', area: 'key-biscayne',
  price: '2450000', beds: 4, baths: 3.5, sqft: 3200, imgs: ['/img/propiedades/listing-1.jpg'],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', desc: 'Casa de prueba creada por la API.', features: 'Muelle\nPiscina',
  details: { water: 'canal', listed: '2026-10-13' }, en: { title: 'Canal home with Gulf access' }
};
r = await call('POST', '/api/propiedades', nueva);
ok('create property', r.status === 201 && r.data.id === 'ic-9999' && fs.existsSync(file('data/propiedades/ic-9999.json')), r.data);
ok('numbers coerced', readJ('data/propiedades/ic-9999.json').price === 2450000);
r = await call('POST', '/api/propiedades', nueva);
ok('duplicate ref 409', r.status === 409);
r = await call('PATCH', '/api/propiedades/ic-9999', { price: 2300000, details: { year: 2024 }, video_url: null });
const after = readJ('data/propiedades/ic-9999.json');
ok('patch merges', r.status === 200 && after.price === 2300000 && after.details.water === 'canal' && after.details.year === 2024 && !('video_url' in after), after);
r = await call('PATCH', '/api/propiedades/ic-9999', { precio: 1 });
ok('unknown field rejected', r.status === 400 && r.data.detalles[0].campo === 'precio');
r = await call('PUT', '/api/propiedades/ic-9999', { title: 'Solo título' });
ok('PUT needs the whole property', r.status === 400);
execSync('node scripts/build-listings.js', { cwd: path.join(REPO, 'agencia') });
const L = readJ('data/listings.json').listings;
ok('listing built from API property', L.length === 19 && L.find((l) => l.id === 'ic-9999').price === 2300000);
forceConflict = true;
r = await call('PATCH', '/api/propiedades/ic-9999', { beds: 5 });
ok('conflict reported as 409', r.status === 409 && r.data.error === 'conflict');
r = await call('DELETE', '/api/propiedades/ic-9999');
ok('delete property', r.status === 200 && !fs.existsSync(file('data/propiedades/ic-9999.json')));

// site sections
r = await call('GET', '/api/web');
ok('list sections', r.data.secciones.length === 10);
r = await call('GET', '/api/web/contacto');
ok('get contacto', r.data.oficina.ciudad === 'Cape Coral');
r = await call('PATCH', '/api/web/contacto', { oficina: { calle: '1000 Cape Coral Pkwy E', cp: '33914' }, agencia: 'Gulf Realty Group' });
ok('patch contacto', r.status === 200 && readJ('data/web/contacto.json').oficina.cp === '33914' && readJ('data/web/contacto.json').oficina.ciudad === 'Cape Coral');
r = await call('PATCH', '/api/web/contacto', { email: '' });
ok('required email kept', r.status === 400 && r.data.detalles[0].campo === 'email');
r = await call('GET', '/api/web/no-existe');
ok('unknown section 404', r.status === 404);
const vec = (await call('GET', '/api/web/vecindarios')).data;
r = await call('PUT', '/api/web/vecindarios', { ...vec, zonas: vec.zonas.filter((z) => z.id !== 'key-biscayne') });
ok('cannot remove a neighborhood in use', r.status === 409 && r.data.error === 'in_use' && r.data.detalles.length > 0, r.data);
r = await call('PUT', '/api/web/vecindarios', { ...vec, zonas: [{ id: 'cape-coral', nombre: 'Cape Coral', texto: 'Canales con salida al Golfo.', portada: true }, ...vec.zonas] });
ok('add neighborhood', r.status === 200);
r = await call('POST', '/api/propiedades', { ...nueva, ref: 'IC-9998', area: 'cape-coral' });
ok('property in the new neighborhood', r.status === 201);
r = await call('PATCH', '/api/web/testimonios', { mostrar: false });
ok('hide testimonials', r.status === 200);
r = await call('PATCH', '/api/web/portada', { cifras: { lista: [{ numero: '1', texto: 'a' }, { numero: '2', texto: 'b' }, { numero: '3', texto: 'c' }, { numero: '4', texto: 'd' }, { numero: '5', texto: 'e' }] } });
ok('max 4 figures enforced', r.status === 400);
execSync('node scripts/build-site.js && node scripts/build-listings.js', { cwd: path.join(REPO, 'agencia') });
const idx = fs.readFileSync(file('index.html'), 'utf8');
ok('site rebuilt with API changes', idx.includes('1000 Cape Coral Pkwy E · Cape Coral, FL 33914') && idx.includes('data-area="cape-coral"') && !idx.includes('words-title') && idx.includes('Gulf Realty Group'));

// map points
r = await call('PATCH', '/api/propiedades/harbor-drive', { ubicacion: 'cerca del mar' });
ok('bad map point rejected', r.status === 400 && r.data.detalles[0].campo === 'ubicacion');
r = await call('PATCH', '/api/propiedades/harbor-drive', { ubicacion: { type: 'Point', coordinates: [-80.16, 25.69] } });
ok('map point as object accepted', r.status === 200 && readJ('data/propiedades/harbor-drive.json').ubicacion === '{"type":"Point","coordinates":[-80.16,25.69]}');
r = await call('PATCH', '/api/web/calculadora', { interes: 7.25 });
ok('calculator rate updated', r.status === 200 && readJ('data/web/calculadora.json').interes === 7.25);

// media
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
r = await call('POST', '/api/medios', { nombre: 'Casa Nueva 1.PNG', contenido: png.toString('base64') });
ok('upload base64', r.status === 201 && r.data.ruta === '/img/propiedades/casa-nueva-1.png' && fs.existsSync(file('img/propiedades/casa-nueva-1.png')), r.data);
r = await call('POST', '/api/medios?nombre=casa-nueva-2.png', undefined, { raw: png, type: 'image/png' });
ok('upload raw', r.status === 201 && r.data.nombre === 'casa-nueva-2.png');
r = await call('POST', '/api/medios', { nombre: 'casa-nueva-1.png', contenido: png.toString('base64') });
ok('upload duplicate 409', r.status === 409);
r = await call('POST', '/api/medios?reemplazar=1', { nombre: 'casa-nueva-1.png', contenido: png.toString('base64') });
ok('upload replace', r.status === 201);
r = await call('POST', '/api/medios', { nombre: 'script.html', contenido: png.toString('base64') });
ok('bad extension rejected', r.status === 400);
r = await call('POST', '/api/medios?nombre=grande.jpg', undefined, { raw: Buffer.alloc(5 * 1024 * 1024) });
ok('too large 413', r.status === 413);
r = await call('GET', '/api/medios');
ok('list media', r.data.medios.some((m) => m.nombre === 'casa-nueva-2.png'));
r = await call('DELETE', '/api/medios/casa-nueva-2.png');
ok('delete media', r.status === 200 && !fs.existsSync(file('img/propiedades/casa-nueva-2.png')));
r = await call('DELETE', '/api/medios/..%2Fetc');
ok('path traversal rejected', r.status === 400 || r.status === 404);
r = await call('GET', '/api/propiedades/..%2F..%2Fadmin%2Fconfig');
ok('id traversal rejected', r.status === 400);

// not configured
process.env.API_KEY = '';
r = await call('GET', '/api/propiedades');
ok('503 when API_KEY missing', r.status === 503);
process.env.API_KEY = KEY;
process.env.GITHUB_TOKEN = 'mal';
r = await call('GET', '/api/web/contacto');
ok('GitHub token rejected → 502', r.status === 502 && r.data.error === 'github_denied', r.data);

console.log('\ncommits:', commits.slice(0, 6).join(' | '), '…');
console.log(`\n${pass} passed, ${failN} failed`);
server.close();
fs.rmSync(REPO, { recursive: true, force: true });
process.exit(failN ? 1 : 0);
