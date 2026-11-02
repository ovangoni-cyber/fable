// The form service: receives the site's forms (POST /api/form), keeps every message in a log file
// and emails it to the agency. Nginx passes the requests here (see server/deploy/nginx.conf).
import fs from 'node:fs';
import path from 'node:path';

const MAX_BODY = 20 * 1024;
const MAX_FIELD = 2000;
const RATE = { max: 5, windowMs: 10 * 60 * 1000 };
// The fields of the three forms (contact-form, valuation-form, enquire-form) plus what js/core.js adds.
const FIELDS = ['name', 'email', 'phone', 'message', 'address', 'type', 'timeline', 'interest', 'budget', 'language', 'reference', 'form', 'page', 'lang', 'website'];
const LABELS = {
  name: 'Nombre', email: 'Correo', phone: 'Teléfono', reference: 'Referencia', address: 'Dirección', type: 'Tipo',
  timeline: 'Plazo', interest: 'Interés', budget: 'Presupuesto', language: 'Idioma preferido', message: 'Mensaje'
};
const SUBJECTS = { contact: 'Contacto web', valuation: 'Valoración', enquire: 'Interés en propiedad' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createHandler({ sendMail, logFile, to, from, allowedOrigin, now = Date.now }) {
  const hits = new Map(); // ip -> times of recent messages
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = (o) => fs.appendFileSync(logFile, JSON.stringify(o) + '\n');

  // Any unexpected error answers 500 instead of stopping the service.
  return async function (req, res) {
    try {
      await handle(req, res);
    } catch (e) {
      console.error('form service error: ' + (e && e.message || e));
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' }); res.end('{"ok":false}'); }
    }
  };

  async function handle(req, res) {
    const reply = (status, o) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    if (new URL(req.url, 'http://x').pathname !== '/api/form') return reply(404, { ok: false });
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { ok: false }); }
    if (req.headers.origin !== allowedOrigin) return reply(403, { ok: false });

    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX_BODY) return reply(413, { ok: false });
      chunks.push(c);
    }

    let data;
    try {
      data = await new Response(Buffer.concat(chunks), { headers: { 'content-type': req.headers['content-type'] || '' } }).formData();
    } catch (e) {
      return reply(400, { ok: false });
    }
    const f = {};
    for (const k of FIELDS) {
      const v = data.get(k);
      if (typeof v === 'string' && v.trim()) f[k] = v.trim().slice(0, MAX_FIELD);
    }
    if (['name', 'email', 'phone', 'reference'].some((k) => /[\r\n]/.test(f[k] || '')) || !EMAIL.test(f.email || '')) return reply(400, { ok: false });

    const t = now();
    const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
    const recent = (hits.get(ip) || []).filter((x) => t - x < RATE.windowMs);
    if (recent.length >= RATE.max) { hits.set(ip, recent); return reply(429, { ok: false }); }
    recent.push(t);
    hits.set(ip, recent);

    const ts = new Date(t).toISOString();
    const ref = ts + '-' + Math.random().toString(36).slice(2, 8);
    const { website, form, page, lang, ...fields } = f;
    // Honeypot filled in: a robot. Answer as if it was sent so it does not try again.
    if (website) { log({ ts, ref, ip, form, page, lang, fields, spam: true }); return reply(200, { ok: true }); }
    log({ ts, ref, ip, form, page, lang, fields, spam: false });

    let id = (/[?&]id=([^&#]+)/.exec(page || '') || [])[1] || '';
    try { id = decodeURIComponent(id); } catch (e) { /* keep it as sent */ }
    const what = form === 'enquire' ? [fields.reference, id].filter(Boolean).join(', ').replace(/[\r\n]+/g, ' ') : '';
    const subject = (SUBJECTS[form] || 'Mensaje web') + (what ? ' (' + what + ')' : '') + ' — ' + (fields.name || fields.email);
    const text = Object.keys(LABELS).filter((k) => fields[k]).map((k) => LABELS[k] + ': ' + fields[k]).join('\n') +
      '\n\n—\nPágina: ' + (allowedOrigin + (page || '/')) + '\nIdioma de la web: ' + (lang || '?') + '\nEnviado: ' + ts +
      '\nPara contestar, responda a este correo: va directo a ' + fields.email + '.';
    try {
      await sendMail({ from, to, replyTo: fields.email, subject, text });
      log({ ts: new Date(now()).toISOString(), ref, mail: 'sent' });
      return reply(200, { ok: true });
    } catch (e) {
      log({ ts: new Date(now()).toISOString(), ref, mail: 'failed', error: String(e && e.message || e) });
      console.error('mail failed for ' + ref + ': ' + (e && e.message || e));
      return reply(502, { ok: false });
    }
  }
}
