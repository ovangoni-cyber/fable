// Minimal SMTP client to send one plain-text email (Gmail: smtp.gmail.com, port 465, implicit TLS,
// AUTH LOGIN with an app password). No dependencies.
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
// RFC 2047 for headers that are not plain ASCII, in pieces short enough for one line each.
function header(s) {
  s = String(s).replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const words = [];
  let cur = '';
  for (const ch of s) {
    if (Buffer.byteLength(cur + ch) > 45) { words.push(cur); cur = ''; }
    cur += ch;
  }
  if (cur) words.push(cur);
  return words.map((w) => '=?UTF-8?B?' + b64(w) + '?=').join('\r\n ');
}

export function sendMail({ host = 'smtp.gmail.com', port = 465, secure = true, user, pass, from, to, replyTo, subject, text, timeout = 15000 }) {
  return new Promise((resolve, reject) => {
    const sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = '';
    let waiting = null;
    const fail = (e) => { sock.destroy(); reject(e instanceof Error ? e : new Error(String(e))); };
    sock.setTimeout(timeout, () => fail(new Error('SMTP timeout')));
    sock.on('error', fail);
    // A reply is complete on a line "NNN text" (a dash after the code means more lines follow).
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const m = /(?:^|\r\n)(\d{3}) [^\r\n]*\r\n$/.exec(buf);
      if (m && waiting) { const w = waiting; waiting = null; const reply = buf; buf = ''; w(Number(m[1]), reply.trim()); }
    });
    // step names the command in errors: the line itself may hold the user or the password.
    const expect = (code, step, line) => new Promise((ok) => {
      waiting = (got, reply) => (got === code ? ok() : fail(new Error('SMTP ' + step + ': ' + reply)));
      if (line != null) sock.write(line + '\r\n');
    });
    const headers = [
      'From: ' + from,
      'To: ' + to,
      replyTo ? 'Reply-To: ' + replyTo : null,
      'Subject: ' + header(subject),
      'Date: ' + new Date().toUTCString().replace('GMT', '+0000'),
      'Message-ID: <' + crypto.randomUUID() + '@' + (String(from).split('@')[1] || 'localhost') + '>',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64'
    ].filter(Boolean);
    // Base64 lines never start with ".", so the body needs no dot-stuffing.
    const message = headers.join('\r\n') + '\r\n\r\n' + wrap(b64(text));
    (async () => {
      await expect(220, 'greeting', null);
      await expect(250, 'EHLO', 'EHLO ' + (String(from).split('@')[1] || 'localhost'));
      await expect(334, 'AUTH', 'AUTH LOGIN');
      await expect(334, 'user', b64(user));
      await expect(235, 'password', b64(pass));
      await expect(250, 'MAIL FROM', 'MAIL FROM:<' + from + '>');
      await expect(250, 'RCPT TO', 'RCPT TO:<' + to + '>');
      await expect(354, 'DATA', 'DATA');
      await expect(250, 'message', message + '.');
      sock.write('QUIT\r\n');
      sock.end();
      resolve();
    })().catch(fail);
  });
}
