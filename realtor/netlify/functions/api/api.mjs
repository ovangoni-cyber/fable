// API de la web de Ingrid Cabeza: lee y cambia todo lo que se edita en el panel (propiedades, textos y datos
// de la web, fotos y vídeos) para que otras herramientas (Claude, Zapier, un CRM…) puedan hacerlo.
// Cada cambio se guarda en GitHub, igual que el panel, y Netlify vuelve a publicar la web en uno o dos minutos.
// Comprueba los datos con las mismas reglas que el panel (admin/config.mjs) y solo puede tocar los datos,
// nunca el código. Documentación: API.md, en la carpeta realtor.
//
// Variables de entorno (Netlify → Site configuration → Environment variables):
//   API_KEY        Clave secreta que deben enviar las herramientas. Varias claves separadas por comas.
//   GITHUB_TOKEN   Token de GitHub con permiso "Contents: read and write" solo sobre este repositorio.
//   GITHUB_REPO    Opcional. Por defecto, el del panel (backend.repo).
//   GITHUB_BRANCH  Opcional. Por defecto, la del panel (backend.branch).
import { timingSafeEqual, createHash } from 'node:crypto';
import CONFIG from '../../../admin/config.mjs';

const env = (k, d = '') => (process.env[k] || d).trim();
const GITHUB_API = env('GITHUB_API_URL', 'https://api.github.com');
const REPO = () => env('GITHUB_REPO', CONFIG.backend.repo);
const BRANCH = () => env('GITHUB_BRANCH', CONFIG.backend.branch);

const COLLECTIONS = Object.fromEntries(CONFIG.collections.map((c) => [c.name, c]));
const PROPS = COLLECTIONS.propiedades;
const WEB = COLLECTIONS.web;
const SECTIONS = Object.fromEntries(WEB.files.map((f) => [f.name, f]));
const MEDIA_FOLDER = CONFIG.media_folder.replace(/\/+$/, '');
const MEDIA_PUBLIC = CONFIG.public_folder.replace(/\/+$/, '');
const MEDIA_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', pdf: 'application/pdf' };
const MAX_UPLOAD = 4.5 * 1024 * 1024; // Netlify accepts requests up to 6 MB; base64 adds a third.
const NOTE = 'La web se actualiza en uno o dos minutos.';

export const config = { path: ['/api', '/api/*'] };

/* ---------------------------------------------------------------- responses */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type'
};
const json = (status, body) => new Response(JSON.stringify(body, null, 2) + '\n', {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }
});
class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
const fail = (status, code, message, details) => { throw new ApiError(status, code, message, details); };

/* ---------------------------------------------------------------- access */
function checkKey(req) {
  const keys = env('API_KEY').split(',').map((k) => k.trim()).filter(Boolean);
  if (!keys.length) fail(503, 'not_configured', 'La API no está activada: falta la variable API_KEY en Netlify.');
  if (!env('GITHUB_TOKEN')) fail(503, 'not_configured', 'La API no está activada: falta la variable GITHUB_TOKEN en Netlify.');
  const auth = req.headers.get('authorization') || '';
  const sent = (auth.match(/^Bearer\s+(.+)$/i) || [])[1] || req.headers.get('x-api-key') || '';
  const digest = (s) => createHash('sha256').update(String(s)).digest();
  const ok = sent && keys.some((k) => timingSafeEqual(digest(k), digest(sent.trim())));
  if (!ok) fail(401, 'unauthorized', 'Falta la clave de la API o no es correcta. Envíela en la cabecera "Authorization: Bearer <clave>".');
}

/* ---------------------------------------------------------------- GitHub */
async function github(method, repoPath, body) {
  const url = GITHUB_API + '/repos/' + REPO() + '/contents/' + repoPath.split('/').map(encodeURIComponent).join('/') +
    (method === 'GET' ? '?ref=' + encodeURIComponent(BRANCH()) : '');
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + env('GITHUB_TOKEN'), Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ingrid-cabeza-api', 'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify({ branch: BRANCH(), ...body }) : undefined
  });
  if (method === 'GET' && res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 409 || (res.status === 422 && /sha/i.test(data.message || ''))) {
    fail(409, 'conflict', 'El archivo cambió mientras se guardaba (por ejemplo, desde el panel). Vuelva a leerlo y repita el cambio.');
  }
  if (res.status === 401 || res.status === 403) fail(502, 'github_denied', 'GitHub rechazó el acceso: revise GITHUB_TOKEN (permiso Contents: read and write sobre ' + REPO() + ').');
  if (!res.ok) fail(502, 'github_error', 'GitHub respondió con un error (' + res.status + '): ' + (data.message || ''));
  return data;
}
async function readFile(repoPath) {
  const f = await github('GET', repoPath);
  if (!f || Array.isArray(f)) return null;
  let content = f.content;
  if (!content && f.download_url) content = Buffer.from(await (await fetch(f.download_url)).arrayBuffer()).toString('base64');
  return { sha: f.sha, buffer: Buffer.from(content || '', 'base64') };
}
async function readJson(repoPath) {
  const f = await readFile(repoPath);
  if (!f) return null;
  try { return { sha: f.sha, data: JSON.parse(f.buffer.toString('utf8')) }; } catch (e) {
    fail(500, 'bad_file', repoPath + ' no es un JSON válido: ' + e.message);
  }
}
async function fileSha(repoPath) {
  const f = await github('GET', repoPath);
  return f && !Array.isArray(f) ? f.sha : null;
}
async function listDir(repoPath) {
  const d = await github('GET', repoPath);
  return Array.isArray(d) ? d.filter((x) => x.type === 'file') : [];
}
async function writeFile(repoPath, buffer, message, sha) {
  const r = await github('PUT', repoPath, { message, content: Buffer.from(buffer).toString('base64'), ...(sha ? { sha } : {}) });
  return r.commit && r.commit.sha;
}
const writeJson = (repoPath, data, message, sha) => writeFile(repoPath, JSON.stringify(data, null, 2) + '\n', message, sha);
async function deleteFile(repoPath, message, sha) {
  const r = await github('DELETE', repoPath, { message, sha });
  return r.commit && r.commit.sha;
}

/* ---------------------------------------------------------------- checking data against the panel's fields */
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

// Returns the cleaned value; collects problems as { campo, error }.
function check(value, field, at, errs, ctx) {
  const where = at || field.name;
  const say = (error) => { errs.push({ campo: where, error }); return value; };
  const required = field.required !== false;
  if (empty(value) && !(field.widget === 'boolean' && value === false)) {
    if (required && field.widget !== 'boolean' && field.widget !== 'object') return say('Es obligatorio (' + (field.label || field.name) + ').');
    if (field.widget !== 'object' || value == null) return value;
  }
  switch (field.widget) {
    case 'string': case 'text': case 'markdown': {
      if (typeof value === 'number') value = String(value);
      if (typeof value !== 'string') return say('Debe ser un texto.');
      if (field.pattern && value && !new RegExp(field.pattern[0]).test(value)) return say(field.pattern[1] || 'Formato no válido.');
      return value;
    }
    case 'number': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !isFinite(n)) return say('Debe ser un número.');
      if (field.value_type === 'int' && !Number.isInteger(n)) return say('Debe ser un número entero.');
      if (field.min != null && n < field.min) return say('Debe ser como mínimo ' + field.min + '.');
      if (field.max != null && n > field.max) return say('Debe ser como máximo ' + field.max + '.');
      return n;
    }
    case 'boolean':
      if (value === 'true' || value === 'false') return value === 'true';
      if (typeof value !== 'boolean') return say('Debe ser true o false.');
      return value;
    case 'select': {
      const allowed = (field.options || []).map((o) => (isObj(o) ? o.value : o));
      if (!allowed.includes(value)) return say('Debe ser uno de: ' + allowed.join(', ') + '.');
      return value;
    }
    case 'image': case 'file': {
      if (typeof value !== 'string') return say('Debe ser la ruta de un archivo, por ejemplo ' + MEDIA_PUBLIC + '/foto.jpg (súbalo antes con POST /api/medios).');
      if (!/^\/[\w\-./]+$/.test(value) || value.includes('..')) return say('Ruta no válida. Use la que devuelve POST /api/medios, por ejemplo ' + MEDIA_PUBLIC + '/foto.jpg.');
      return value;
    }
    case 'datetime':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return say('Debe ser una fecha AAAA-MM-DD.');
      return value.slice(0, 10);
    case 'relation': {
      const allowed = ctx.relation(field);
      if (!allowed.includes(value)) return say('Debe ser uno de: ' + allowed.join(', ') + '.');
      return value;
    }
    case 'list': {
      if (!Array.isArray(value)) return say('Debe ser una lista.');
      if (field.min != null && value.length < field.min) return say('Necesita al menos ' + field.min + ' elemento(s).');
      if (field.max != null && value.length > field.max) return say('Admite como máximo ' + field.max + ' elementos.');
      if (field.field) return value.map((v, i) => check(v, field.field, where + '[' + i + ']', errs, ctx));
      return value.map((v, i) => checkFields(v, field.fields, where + '[' + i + ']', errs, ctx));
    }
    case 'object':
      return checkFields(value == null ? {} : value, field.fields, where, errs, ctx);
    default:
      return value;
  }
}
function checkFields(obj, fields, at, errs, ctx) {
  if (!isObj(obj)) { errs.push({ campo: at || '(raíz)', error: 'Debe ser un objeto JSON.' }); return obj; }
  const out = {};
  const known = new Set(fields.map((f) => f.name));
  for (const k of Object.keys(obj)) {
    if (!known.has(k)) errs.push({ campo: (at ? at + '.' : '') + k, error: 'Campo desconocido. Campos admitidos: ' + [...known].join(', ') + '.' });
  }
  for (const f of fields) {
    const v = check(obj[f.name], f, (at ? at + '.' : '') + f.name, errs, ctx);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

// Values a relation field accepts (today: the neighborhood ids from Web → Vecindarios).
async function relations() {
  const cache = {};
  for (const f of PROPS.fields) {
    if (f.widget !== 'relation') continue;
    const file = COLLECTIONS[f.collection].files.find((x) => x.name === f.file);
    const doc = await readJson(file.file);
    const [listName, , key] = f.value_field.split('.');
    cache[f.name] = ((doc && doc.data[listName]) || []).map((x) => x && x[key]).filter(Boolean);
  }
  return { relation: (field) => cache[field.name] || [] };
}

function validate(data, fields, ctx) {
  const errs = [];
  const clean = checkFields(data, fields, '', errs, ctx);
  if (errs.length) fail(400, 'invalid', 'Los datos no son válidos. Revise los campos indicados.', errs);
  return clean;
}

// Same data, whatever the order of the fields.
const canon = (v) => (Array.isArray(v) ? v.map(canon) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// PATCH: objects are merged, lists and values are replaced, null removes a field.
function merge(base, patch) {
  if (!isObj(base) || !isObj(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

/* ---------------------------------------------------------------- helpers */
const propPath = (id) => PROPS.folder + '/' + id + '.' + (PROPS.extension || 'json');
const cleanId = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
function validId(id) { if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(400, 'bad_id', 'Identificador no válido: use minúsculas, números y guiones.'); return id; }
async function body(req) {
  const text = await req.text();
  if (!text.trim()) fail(400, 'no_body', 'Falta el cuerpo de la petición (JSON).');
  try { return JSON.parse(text); } catch (e) { fail(400, 'bad_json', 'El cuerpo no es un JSON válido: ' + e.message); }
}
function summary(id, p) {
  return { id, ref: p.ref, titulo: p.title, estado: p.status, tipo: p.type, vecindario: p.area, precio: p.price, destacada: !!p.featured, foto: (p.imgs || [])[0] || null };
}
function describe(fields) {
  return fields.map((f) => {
    const d = { campo: f.name, nombre: f.label || f.name, tipo: f.widget, obligatorio: f.required !== false };
    if (f.hint) d.ayuda = f.hint;
    if (f.default !== undefined) d.por_defecto = f.default;
    if (f.options) d.opciones = f.options.map((o) => (isObj(o) ? o.value : o));
    if (f.pattern) d.formato = f.pattern[0];
    if (f.min != null) d.minimo = f.min;
    if (f.max != null) d.maximo = f.max;
    if (f.value_type) d.numero = f.value_type === 'int' ? 'entero' : 'decimal';
    if (f.widget === 'relation') d.opciones_de = 'GET /api/web/' + f.file + ' → ' + f.value_field;
    if (f.widget === 'image' || f.widget === 'file') d.ruta = 'Ruta devuelta por POST /api/medios, por ejemplo ' + MEDIA_PUBLIC + '/foto.jpg';
    if (f.fields) d.campos = describe(f.fields);
    if (f.field) d.elemento = describe([f.field])[0];
    return d;
  });
}

/* ---------------------------------------------------------------- endpoints */
const INDEX = {
  api: 'Web de Ingrid Cabeza',
  autenticacion: 'Cabecera "Authorization: Bearer <clave>" en todas las peticiones salvo GET /api.',
  aviso: 'Cada cambio se guarda en GitHub. ' + NOTE,
  rutas: {
    'GET /api/esquema': 'Todos los campos que admite cada parte de la web, con su tipo y si son obligatorios.',
    'GET /api/propiedades': 'Lista de propiedades (resumen). Añada ?completo=1 para todos los datos.',
    'GET /api/propiedades/{id}': 'Una propiedad.',
    'POST /api/propiedades': 'Crea una propiedad. El id sale de la referencia (IC-2620 → ic-2620).',
    'PUT /api/propiedades/{id}': 'Reemplaza una propiedad entera.',
    'PATCH /api/propiedades/{id}': 'Cambia solo los campos enviados (null borra un campo opcional).',
    'DELETE /api/propiedades/{id}': 'Quita una propiedad.',
    'GET /api/web': 'Lista de secciones: ' + Object.keys(SECTIONS).join(', ') + '.',
    'GET /api/web/{seccion}': 'Los textos y datos de una sección.',
    'PUT /api/web/{seccion}': 'Reemplaza una sección entera.',
    'PATCH /api/web/{seccion}': 'Cambia solo los campos enviados.',
    'GET /api/medios': 'Fotos y vídeos subidos.',
    'POST /api/medios': 'Sube una foto o un vídeo: JSON {"nombre": "casa.jpg", "contenido": "<base64>"}, o el archivo tal cual con ?nombre=casa.jpg. Máximo 4,5 MB.',
    'DELETE /api/medios/{nombre}': 'Borra una foto o un vídeo.'
  }
};

async function route(req) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/(?:\.netlify\/functions\/)?api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [area, id, extra] = parts;
  const m = req.method;
  if (extra) fail(404, 'not_found', 'Ruta no encontrada. Vea GET /api.');

  if (!area && m === 'GET') return json(200, INDEX);
  checkKey(req);

  if (area === 'esquema' && m === 'GET') {
    return json(200, {
      propiedades: { carpeta: PROPS.folder, id: 'Se forma con la referencia', campos: describe(PROPS.fields) },
      web: Object.fromEntries(WEB.files.map((f) => [f.name, { nombre: f.label, campos: describe(f.fields) }])),
      medios: { carpeta_publica: MEDIA_PUBLIC, tipos: Object.keys(MEDIA_TYPES), maximo_mb: 4.5 }
    });
  }

  /* properties */
  if (area === 'propiedades') {
    if (!id && m === 'GET') {
      const files = (await listDir(PROPS.folder)).filter((f) => f.name.endsWith('.json'));
      const full = url.searchParams.get('completo') === '1';
      const items = await Promise.all(files.map(async (f) => {
        const pid = f.name.replace(/\.json$/, '');
        const doc = await readJson(f.path);
        return doc && (full ? { id: pid, ...doc.data } : summary(pid, doc.data));
      }));
      return json(200, { total: items.filter(Boolean).length, propiedades: items.filter(Boolean) });
    }
    if (!id && m === 'POST') {
      const data = await body(req);
      const clean = validate(data, PROPS.fields, await relations());
      const pid = validId(cleanId(clean.ref));
      if (await fileSha(propPath(pid))) fail(409, 'exists', 'Ya hay una propiedad con la referencia ' + clean.ref + ' (id ' + pid + '). Use PUT o PATCH /api/propiedades/' + pid + '.');
      const commit = await writeJson(propPath(pid), clean, 'API: nueva propiedad ' + pid);
      return json(201, { ok: true, id: pid, propiedad: clean, commit, aviso: NOTE });
    }
    if (id) {
      validId(id);
      const doc = await readJson(propPath(id));
      if (!doc) fail(404, 'not_found', 'No hay ninguna propiedad con id ' + id + '. Vea GET /api/propiedades.');
      if (m === 'GET') return json(200, { id, ...doc.data });
      if (m === 'DELETE') {
        const commit = await deleteFile(propPath(id), 'API: quitar propiedad ' + id, doc.sha);
        return json(200, { ok: true, id, borrada: true, commit, aviso: NOTE });
      }
      if (m === 'PUT' || m === 'PATCH') {
        const data = await body(req);
        const next = m === 'PATCH' ? merge(doc.data, data) : data;
        const clean = validate(next, PROPS.fields, await relations());
        if (same(clean, doc.data)) return json(200, { ok: true, id, propiedad: clean, sin_cambios: true });
        const commit = await writeJson(propPath(id), clean, 'API: actualizar propiedad ' + id, doc.sha);
        return json(200, { ok: true, id, propiedad: clean, commit, aviso: NOTE });
      }
    }
  }

  /* site texts and details */
  if (area === 'web') {
    if (!id && m === 'GET') return json(200, { secciones: WEB.files.map((f) => ({ seccion: f.name, nombre: f.label })) });
    const section = SECTIONS[id];
    if (!section) fail(404, 'not_found', 'Sección desconocida. Secciones: ' + Object.keys(SECTIONS).join(', ') + '.');
    const doc = await readJson(section.file);
    if (m === 'GET') return json(200, doc ? doc.data : {});
    if (m === 'PUT' || m === 'PATCH') {
      const data = await body(req);
      const next = m === 'PATCH' ? merge(doc ? doc.data : {}, data) : data;
      const clean = validate(next, section.fields, await relations());
      if (doc && same(clean, doc.data)) return json(200, { ok: true, seccion: id, datos: clean, sin_cambios: true });
      if (id === 'vecindarios') await keepUsedNeighborhoods(clean);
      const commit = await writeJson(section.file, clean, 'API: actualizar ' + section.label, doc && doc.sha);
      return json(200, { ok: true, seccion: id, datos: clean, commit, aviso: NOTE });
    }
  }

  /* photos and videos */
  if (area === 'medios') {
    if (!id && m === 'GET') {
      const files = await listDir(MEDIA_FOLDER);
      return json(200, { total: files.length, medios: files.map((f) => ({ nombre: f.name, ruta: MEDIA_PUBLIC + '/' + f.name, bytes: f.size })) });
    }
    if (!id && m === 'POST') {
      let name = url.searchParams.get('nombre');
      let buffer;
      if ((req.headers.get('content-type') || '').includes('application/json')) {
        const data = await body(req);
        name = data.nombre || name;
        const b64 = String(data.contenido || '').replace(/^data:[^,]*,/, '');
        if (!b64) fail(400, 'no_file', 'Falta "contenido": el archivo en base64.');
        buffer = Buffer.from(b64, 'base64');
      } else {
        buffer = Buffer.from(await req.arrayBuffer());
      }
      const ext = String(name || '').split('.').pop().toLowerCase();
      const base = cleanId(String(name || '').replace(/\.[^.]+$/, ''));
      if (!base || !MEDIA_TYPES[ext]) fail(400, 'bad_name', 'Indique un nombre con una de estas extensiones: ' + Object.keys(MEDIA_TYPES).join(', ') + '.');
      if (!buffer.length) fail(400, 'no_file', 'El archivo está vacío.');
      if (buffer.length > MAX_UPLOAD) fail(413, 'too_large', 'El archivo pasa de 4,5 MB. Para vídeos, use un enlace de YouTube o Vimeo en el campo video_url.');
      const file = base + '.' + ext;
      const existing = await fileSha(MEDIA_FOLDER + '/' + file);
      if (existing && url.searchParams.get('reemplazar') !== '1') fail(409, 'exists', 'Ya existe ' + file + '. Use otro nombre o añada ?reemplazar=1.');
      const commit = await writeFile(MEDIA_FOLDER + '/' + file, buffer, 'API: subir ' + file, existing);
      return json(201, { ok: true, nombre: file, ruta: MEDIA_PUBLIC + '/' + file, bytes: buffer.length, commit, aviso: 'Use "ruta" en los campos de foto o vídeo.' });
    }
    if (id && m === 'DELETE') {
      const file = String(id);
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(file) || file.includes('..')) fail(400, 'bad_name', 'Nombre de archivo no válido.');
      const existing = await fileSha(MEDIA_FOLDER + '/' + file);
      if (!existing) fail(404, 'not_found', 'No existe ' + file + '.');
      const commit = await deleteFile(MEDIA_FOLDER + '/' + file, 'API: borrar ' + file, existing);
      return json(200, { ok: true, nombre: file, borrado: true, commit, aviso: NOTE });
    }
  }

  fail(404, 'not_found', 'Ruta o método no encontrados. Vea GET /api.');
}

// A neighborhood that still has properties can't be removed (the properties would lose it).
async function keepUsedNeighborhoods(next) {
  const ids = new Set((next.zonas || []).map((z) => z.id));
  const files = (await listDir(PROPS.folder)).filter((f) => f.name.endsWith('.json'));
  const orphans = [];
  for (const f of files) {
    const doc = await readJson(f.path);
    if (doc && doc.data.area && !ids.has(doc.data.area)) orphans.push({ propiedad: f.name.replace(/\.json$/, ''), vecindario: doc.data.area });
  }
  if (orphans.length) fail(409, 'in_use', 'Hay propiedades en vecindarios que se quitarían. Cámbielas de vecindario antes.', orphans);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    return await route(req);
  } catch (e) {
    if (e instanceof ApiError) return json(e.status, { ok: false, error: e.code, mensaje: e.message, ...(e.details ? { detalles: e.details } : {}) });
    console.error(e);
    return json(500, { ok: false, error: 'server_error', mensaje: 'Error inesperado: ' + e.message });
  }
}
