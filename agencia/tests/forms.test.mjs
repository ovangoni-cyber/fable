// Tests the form service (server/forms.mjs and server/smtp.mjs) with a fake mail sender and a fake SMTP server.
// Run from the agencia folder: node tests/forms.test.mjs
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createHandler } from '../server/forms.mjs';
import { sendMail } from '../server/smtp.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail == null ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) failed++;
};

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-forms-'));
const logFile = path.join(DIR, 'submissions.jsonl');
const ORIGIN = 'https://ingrid-realtor.com';
const mails = [];
let mailFails = false;
let clock = Date.parse('2026-11-02T12:00:00Z');
const handler = createHandler({
  sendMail: async (m) => { if (mailFails) throw new Error('535 bad credentials'); mails.push(m); },
  logFile, to: 'ingrid.realtor91@gmail.com', from: 'web@example.com', allowedOrigin: ORIGIN, now: () => clock
});
const server = http.createServer(handler);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const post = async (fields, { ip = '10.0.0.1', origin = ORIGIN, body } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const headers = { 'X-Real-IP': ip };
  if (origin) headers.Origin = origin;
  const res = await fetch(base + '/api/form', { method: 'POST', body: body || fd, headers });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const logLines = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const contact = { name: 'Ana López', email: 'ana@example.com', phone: '(239) 555-0100', message: 'Busco casa en Cape Coral', form: 'contact', page: '/', lang: 'es', website: '' };

// A valid contact message is mailed and logged.
let r = await post(contact);
check('valid contact → 200 ok', r.status === 200 && r.json && r.json.ok === true, r);
check('valid contact → one mail', mails.length === 1, mails.length);
const m = mails[0] || {};
check('mail goes to Ingrid', m.to === 'ingrid.realtor91@gmail.com', m.to);
check('mail Reply-To is the client', m.replyTo === 'ana@example.com', m.replyTo);
check('subject names the form and the client', /^Contacto web — /.test(m.subject || '') && (m.subject || '').includes('Ana López'), m.subject);
check('body has the fields', (m.text || '').includes('Busco casa en Cape Coral') && (m.text || '').includes('(239) 555-0100'), m.text);
let lines = logLines();
check('log: submission then "sent"', lines.length === 2 && lines[0].form === 'contact' && lines[0].fields.name === 'Ana López' && lines[1].mail === 'sent', lines);

// The enquiry subject says which property.
r = await post({ ...contact, form: 'enquire', reference: 'IC-2584', page: '/property.html?id=granada' }, { ip: '10.0.0.2' });
check('enquiry → 200', r.status === 200, r);
check('enquiry subject names the property', /^Interés en propiedad/.test(mails[1] && mails[1].subject) && mails[1].subject.includes('granada'), mails[1] && mails[1].subject);

// Honeypot: answered as if sent, not mailed, logged as spam.
const before = mails.length;
r = await post({ ...contact, website: 'http://spam.example' }, { ip: '10.0.0.3' });
check('honeypot → 200', r.status === 200, r);
check('honeypot → no mail', mails.length === before);
check('honeypot → logged as spam', logLines().some((l) => l.spam === true));

// Wrong or missing Origin.
r = await post(contact, { ip: '10.0.0.4', origin: 'https://evil.example' });
check('wrong Origin → 403', r.status === 403, r);
r = await post(contact, { ip: '10.0.0.4', origin: null });
check('missing Origin → 403', r.status === 403, r);

// Header injection through the email or the name.
r = await post({ ...contact, email: 'a@b.com\r\nBcc: x@y.com' }, { ip: '10.0.0.5' });
check('newline in email → 400', r.status === 400, r);
r = await post({ ...contact, name: 'Ana\r\nBcc: x@y.com' }, { ip: '10.0.0.5' });
check('newline in name → 400', r.status === 400, r);
r = await post({ ...contact, email: 'not-an-email' }, { ip: '10.0.0.5' });
check('bad email → 400', r.status === 400, r);
check('rejected requests send no mail', mails.length === before);

// Body too large.
r = await post({ ...contact, message: 'x'.repeat(25000) }, { ip: '10.0.0.6' });
check('body over 20 KB → 413', r.status === 413, r);

// Rate limit: 5 per IP every 10 minutes.
const codes = [];
for (let i = 0; i < 6; i++) codes.push((await post(contact, { ip: '10.0.0.7' })).status);
check('6th message in 10 min → 429', codes.slice(0, 5).every((c) => c === 200) && codes[5] === 429, codes);
clock += 10 * 60 * 1000 + 1;
r = await post(contact, { ip: '10.0.0.7' });
check('after 10 min → 200 again', r.status === 200, r);

// Mail failure: logged as failed, client gets 502.
mailFails = true;
r = await post(contact, { ip: '10.0.0.8' });
mailFails = false;
check('mail failure → 502', r.status === 502, r);
lines = logLines();
check('mail failure → logged as failed', lines[lines.length - 1].mail === 'failed' && /535/.test(lines[lines.length - 1].error || ''), lines[lines.length - 1]);
check('mail failure → submission kept in the log', lines[lines.length - 2].fields && lines[lines.length - 2].fields.name === 'Ana López');

// A malformed page address does not crash the service.
r = await post({ ...contact, form: 'enquire', page: '/property.html?id=%E0%A4%A' }, { ip: '10.0.0.9' });
check('malformed page id → still answered', r.status === 200 || r.status === 400, r);
r = await post(contact, { ip: '10.0.0.10' }).catch((e) => ({ status: 'down: ' + e.message }));
check('service still up after a malformed page id', r.status === 200, r);
r = await post({ ...contact, form: 'enquire', page: '/property.html?id=a%0D%0ABcc:%20x@y.com' }, { ip: '10.0.0.11' });
check('newline in page id stays out of the subject', !/[\r\n]/.test(mails[mails.length - 1].subject), mails[mails.length - 1].subject);

// Other methods.
const g = await fetch(base + '/api/form');
check('GET → 405', g.status === 405, g.status);

server.close();

// smtp.mjs against a fake SMTP server (plain TCP).
const session = [];
let rejectPass = false;
const smtp = net.createServer((sock) => {
  let buf = '', inData = false, data = '';
  const say = (l) => sock.write(l + '\r\n');
  say('220 fake ESMTP');
  sock.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let i;
    while ((i = buf.indexOf('\r\n')) > -1) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (inData) {
        if (line === '.') { inData = false; session.push({ data }); say('250 queued'); } else data += line + '\r\n';
        continue;
      }
      session.push(line);
      if (/^EHLO/i.test(line)) { sock.write('250-fake\r\n250 AUTH LOGIN\r\n'); }
      else if (line === 'AUTH LOGIN') say('334 VXNlcm5hbWU6');
      else if (session.length && session[session.length - 2] === 'AUTH LOGIN') say('334 UGFzc3dvcmQ6');
      else if (session.length > 2 && session[session.length - 3] === 'AUTH LOGIN') say(rejectPass ? '535 5.7.8 Username and Password not accepted' : '235 ok');
      else if (/^MAIL FROM|^RCPT TO/i.test(line)) say('250 ok');
      else if (line === 'DATA') { inData = true; data = ''; say('354 go'); }
      else if (line === 'QUIT') { say('221 bye'); sock.end(); }
      else say('500 ?');
    }
  });
});
await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
await sendMail({
  host: '127.0.0.1', port: smtp.address().port, secure: false, user: 'web@example.com', pass: 's3cret',
  from: 'web@example.com', to: 'ingrid.realtor91@gmail.com', replyTo: 'jose@example.com',
  subject: 'Contacto web — José Peña 🙂', text: 'Hola\n.hidden line\nAdiós'
});
rejectPass = true;
let err = '';
try {
  await sendMail({ host: '127.0.0.1', port: smtp.address().port, secure: false, user: 'web@example.com', pass: 's3cret', from: 'web@example.com', to: 'x@example.com', subject: 's', text: 't' });
} catch (e) { err = e.message; }
smtp.close();
check('smtp: rejected password → error', /535/.test(err), err);
check('smtp: error never contains the user or password', !err.includes(Buffer.from('s3cret').toString('base64')) && !err.includes(Buffer.from('web@example.com').toString('base64')) && !err.includes('s3cret'), err);
check('smtp: AUTH LOGIN with base64 user and password', session.includes(Buffer.from('web@example.com').toString('base64')) && session.includes(Buffer.from('s3cret').toString('base64')), session);
check('smtp: envelope', session.includes('MAIL FROM:<web@example.com>') && session.includes('RCPT TO:<ingrid.realtor91@gmail.com>'), session);
const msg = (session.find((s) => s && s.data) || {}).data || '';
const subj = (/^Subject: (.*)$/m.exec(msg) || [])[1] || '';
const decoded = subj.replace(/=\?UTF-8\?B\?([^?]*)\?=/g, (a, b) => Buffer.from(b, 'base64').toString('utf8')).replace(/\s+(?==\?)|\r?\n\s+/g, '');
check('smtp: subject RFC 2047 and decodes', /=\?UTF-8\?B\?/.test(subj) && decoded === 'Contacto web — José Peña 🙂', { subj, decoded });
check('smtp: Reply-To header', /^Reply-To: jose@example\.com\r?$/m.test(msg), msg);
check('smtp: UTF-8 base64 body', /Content-Type: text\/plain; charset=UTF-8/.test(msg) && /Content-Transfer-Encoding: base64/.test(msg), msg);
const bodyB64 = msg.split('\r\n\r\n').slice(1).join('').replace(/\r\n/g, '');
check('smtp: body decodes to the text', Buffer.from(bodyB64, 'base64').toString('utf8') === 'Hola\n.hidden line\nAdiós', bodyB64);

fs.rmSync(DIR, { recursive: true, force: true });
console.log(failed ? '\n' + failed + ' failed' : '\nall passed');
process.exit(failed ? 1 : 0);
