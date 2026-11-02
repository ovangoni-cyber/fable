// Starts the form service on the server (systemd unit: server/deploy/ingrid-forms.service).
// Settings come from /etc/ingrid-forms.env: SMTP_USER, SMTP_PASS, MAIL_TO and, optionally,
// ALLOWED_ORIGIN, LOG_FILE, PORT, SMTP_HOST, SMTP_PORT.
import http from 'node:http';
import { createHandler } from './forms.mjs';
import { sendMail } from './smtp.mjs';

const env = process.env;
const missing = ['SMTP_USER', 'SMTP_PASS', 'MAIL_TO'].filter((k) => !env[k]);
if (missing.length) {
  console.error('Missing settings in /etc/ingrid-forms.env: ' + missing.join(', '));
  process.exit(1);
}

const smtp = { host: env.SMTP_HOST || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), user: env.SMTP_USER, pass: env.SMTP_PASS };
const handler = createHandler({
  sendMail: (m) => sendMail({ ...smtp, ...m }),
  logFile: env.LOG_FILE || '/var/lib/ingrid-forms/submissions.jsonl',
  to: env.MAIL_TO,
  from: env.SMTP_USER,
  allowedOrigin: env.ALLOWED_ORIGIN || 'https://ingrid-realtor.com'
});
const port = Number(env.PORT || 3100);
http.createServer(handler).listen(port, '127.0.0.1', () => console.log('form service on 127.0.0.1:' + port));
