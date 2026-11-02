# Ingrid Realtor on a VPS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve `agencia/` at `https://ingrid-realtor.com` from the Hostealo VPS, hidden from search engines, with the three forms emailed to Ingrid and a one-command deploy/rollback.

**Architecture:** Static files served by Nginx from `/var/www/ingrid-realtor/current` (symlink to a timestamped release). A dependency-free Node service on `127.0.0.1:3100` receives `POST /api/form`, appends to a JSONL log, then sends mail through Gmail SMTP (implicit TLS, port 465). `agencia/scripts/deploy.sh` builds, tests, refuses dirty/unpushed trees, uploads a release over SSH and flips the symlink.

**Tech Stack:** Node ≥ 18 (built-ins only: `node:http`, `node:tls`, `node:net`, `Response.formData()`), Bash (Git Bash on Windows), Nginx, certbot, ufw, fail2ban, systemd, Ubuntu 26.04.

**Spec:** `docs/superpowers/specs/2026-11-02-vps-deploy-design.md`

## Global Constraints

- Only `agencia/` changes (plus root `CLAUDE.md`/`README.md` docs). `admin/`, `netlify/`, `netlify.toml` stay in the repo untouched except `admin/config.mjs` (domain + new field).
- `agencia/` must keep working from `file://` (double-click).
- Never hand-edit generated parts of pages: change `data/web/*.json` and run `node scripts/build-site.js && node scripts/build-listings.js`; running them twice must change nothing.
- Domain `https://ingrid-realtor.com` (no `www`); VPS `79.110.63.60`; broker `BEST DEALS REALTY`; mail to `ingrid.realtor91@gmail.com`.
- Hidden from search engines while content is sample data: `X-Robots-Tag: noindex, nofollow` on everything and `robots.txt` = `Disallow: /`, switched by one Nginx include.
- No secrets in the repo or chat: SMTP credentials live only in `/etc/ingrid-forms.env` (mode 600) on the VPS.
- No npm dependencies (no `package.json` anywhere).
- Code comments, commit messages in English; commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Form log retention: 12 months.

## Review Focus

- Name with accents (`José Peña`) or an emoji → subject/body arrive readable (RFC 2047 encoded subject, UTF-8 body). Test in Task 2.
- Newline injected in `email`/`name` (`a@b.com\r\nBcc: x@y`) → no extra header; request rejected with 400. Test in Task 2.
- Gmail down or wrong password → entry still in the log with `"mail":"failed"`, client gets 502 and sees the existing error text. Test in Task 2.
- Same visitor submitting 6 times in 10 minutes → 6th gets 429, no mail. Test in Task 2.
- Deploy run with only line-ending noise in `git status` → deploy proceeds (not refused). Test in Task 4.

## File Structure

| File | Responsibility |
| --- | --- |
| `agencia/data/web/contacto.json` | add `dominio`; set `agencia`, `formularios` |
| `agencia/admin/config.mjs` | `site_url`/`display_url`; `dominio` field in the contact collection |
| `agencia/scripts/build-site.js` | absolute `og:image`/`og:url` from `dominio`; writes `robots.txt` |
| `agencia/scripts/build-listings.js` | writes `sitemap.xml` (non-private listings) |
| `agencia/js/core.js` | `file:` → "not connected" path; adds hidden `form`, `page`, `lang` fields |
| `agencia/index.html`, `property.html` | honeypot field `website` in the three forms (inside forms, not generated parts) |
| `agencia/server/forms.mjs` | pure request handling: parse, validate, rate-limit, log, mail (injected deps) |
| `agencia/server/smtp.mjs` | `sendMail(opts)` minimal SMTP client over TLS |
| `agencia/server/main.mjs` | reads env, starts `http` server on `127.0.0.1:3100` |
| `agencia/server/deploy/nginx.conf`, `noindex.conf`, `ingrid-forms.service`, `logrotate`, `provision.sh` | VPS configuration, installed by `provision.sh` |
| `agencia/scripts/deploy.sh` | build, test, guard, upload, switch, verify, `--rollback` |
| `agencia/tests/site.test.mjs`, `tests/forms.test.mjs`, `tests/deploy.test.sh` | tests |

---

### Task 1: Site data, SEO files and form fields

**Files:**
- Modify: `agencia/data/web/contacto.json`, `agencia/admin/config.mjs` (lines ~30-31 and the contact collection near line 447-488), `agencia/scripts/build-site.js`, `agencia/scripts/build-listings.js`, `agencia/js/core.js:152-190`, `agencia/index.html` (forms at 339, 472), `agencia/property.html` (form at 169)
- Create: `agencia/tests/site.test.mjs`

**Interfaces:**
- Produces: `contacto.json → "dominio": "https://ingrid-realtor.com"`; form POST fields `form` (`contact` | `valuation` | `enquire`), `page` (`location.pathname + location.search`), `lang` (`es`|`en`), honeypot `website`; generated `robots.txt`, `sitemap.xml` at `agencia/`.

- [ ] **Step 1: Write `tests/site.test.mjs`** — same style as `api.test.mjs` (copies `agencia/` to a temp dir excluding `netlify|tests|node_modules`, runs both build scripts with `execSync` in the copy, prints `PASS`/`FAIL`, exits 1 on failure). Assertions:
  - every page in `['index.html','properties.html','property.html','guias.html']` contains `<meta property="og:image" content="https://ingrid-realtor.com/img/og.jpg">` and `<meta property="og:url" content="https://ingrid-realtor.com/<page>">` (`/` for index).
  - `index.html` and `property.html` contain `data-endpoint="/api/form"`; every `<form … data-endpoint` has an `<input` with `name="website"` and `tabindex="-1"` before `</form>`.
  - `js/i18n.js` contains `Corretaje: BEST DEALS REALTY`; `index.html` contains `Brokered by BEST DEALS REALTY`.
  - `robots.txt` === `"User-agent: *\nDisallow: /\n"`.
  - `sitemap.xml` contains `<loc>https://ingrid-realtor.com/property.html?id=granada</loc>`, `<loc>https://ingrid-realtor.com/</loc>`, no `admin`, and no listing whose JSON has `"status": "private"`.
  - running both scripts a second time prints no `updated` and leaves `sitemap.xml`/`robots.txt` byte-identical.
- [ ] **Step 2: Run** `node tests/site.test.mjs` → FAIL on og:url/robots.
- [ ] **Step 3: Data** — `contacto.json`: `"agencia": "BEST DEALS REALTY"`, `"formularios": "/api/form"`, new `"dominio": "https://ingrid-realtor.com"`. `config.mjs`: `site_url`/`display_url` → `https://ingrid-realtor.com`; add a `dominio` string field next to `formularios` (label "Dirección de la web", hint explaining it is used for link previews and the sitemap) so the API validator accepts the key.
- [ ] **Step 4: `build-site.js`** — read `dominio` (trim trailing `/`); in `applyHtml` replace/insert `og:image` with `dominio + '/img/og.jpg'` and insert/replace `<meta property="og:url" content="…">` right after `og:type`. Empty `dominio` → leave relative `img/og.jpg` and no `og:url`. Write `robots.txt` via `write()` (always `Disallow: /`; the public version is served by Nginx later when the switch is flipped — see Task 3).
- [ ] **Step 5: `build-listings.js`** — after listings are built, write `sitemap.xml` with the four public pages plus `property.html?id=<id>` for non-private listings, using `dominio` from `data/web/contacto.json`; skip writing when `dominio` is empty. No `<lastmod>` (keeps output deterministic).
- [ ] **Step 6: Forms** — add the honeypot to the three forms: `<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">` and `.hp{position:absolute;left:-9999px}` in the existing CSS. In `core.js` submit handler: if `location.protocol === 'file:'` treat as no endpoint; before `fetch`, append `form` (form id without `-form`), `page`, `lang` (`document.documentElement.lang`) to the `FormData`.
- [ ] **Step 7: Run** `node tests/site.test.mjs` and `node tests/api.test.mjs` → both all PASS (api tests must still be 59/59 plus any new). Open `index.html` by double-click: submitting the contact form shows the "not connected" confirmation, no console error.
- [ ] **Step 8: Commit** `Agency site: broker name, form endpoint, absolute share links, robots and sitemap`.

### Task 2: Form service

**Files:**
- Create: `agencia/server/forms.mjs`, `agencia/server/smtp.mjs`, `agencia/server/main.mjs`, `agencia/tests/forms.test.mjs`

**Interfaces:**
- Consumes: POST fields from Task 1.
- Produces: `createHandler({ sendMail, logFile, to, from, allowedOrigin, now = Date.now }) → (req, res) => Promise<void>` in `forms.mjs`; `sendMail({ host, port, user, pass, from, to, replyTo, subject, text, secure = true }) → Promise<void>` in `smtp.mjs`; `main.mjs` reads env `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `ALLOWED_ORIGIN` (default `https://ingrid-realtor.com`), `LOG_FILE` (default `/var/lib/ingrid-forms/submissions.jsonl`), `PORT` (default `3100`) and listens on `127.0.0.1`.

- [ ] **Step 1: Write `tests/forms.test.mjs`** (same PASS/FAIL style). It starts the handler on an ephemeral port with a fake `sendMail` that records calls (and can be told to throw), a temp `logFile`, and also a fake plain-TCP SMTP server to exercise `smtp.mjs` with `secure:false`. Cases:
  - valid contact submission (multipart, `Origin: https://ingrid-realtor.com`) → 200 `{"ok":true}`; one mail with `to` = `MAIL_TO`, `replyTo` = client email, subject starts `Contacto web —` and contains the name; log has one JSON line with `"mail":"sent"`.
  - `form=enquire` with `page=/property.html?id=granada` → subject contains `granada`.
  - honeypot `website=x` → 200, no mail, logged with `"spam":true`.
  - wrong/missing `Origin` → 403, no mail.
  - email `a@b.com\r\nBcc: x@y` → 400, no mail.
  - body > 20 KB → 413.
  - 6th request from same IP within 10 min → 429; with `now` advanced 10 min → 200.
  - `sendMail` throws → 502, log line `"mail":"failed"` present.
  - `smtp.mjs` against the fake server: name `José Peña 🙂` → `Subject: =?UTF-8?B?…?=` decodes to the original; body sent as `Content-Type: text/plain; charset=UTF-8` with base64 transfer encoding; `AUTH LOGIN` sent with base64 user/pass; a line beginning with `.` is dot-stuffed.
  - `GET /api/form` → 405.
- [ ] **Step 2: Run** `node tests/forms.test.mjs` → FAIL (modules missing).
- [ ] **Step 3: Implement `smtp.mjs`** — `tls.connect(465)` when `secure`, else `net.connect`; read-reply/expect-code loop; `EHLO`, `AUTH LOGIN`, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`; 15 s timeout → reject. Headers: `From`, `To`, `Reply-To`, `Subject` (RFC 2047 B when non-ASCII), `Date`, `Message-ID`, `MIME-Version`, base64 body wrapped at 76.
- [ ] **Step 4: Implement `forms.mjs`** — parse with `new Response(bodyBuffer, { headers: { 'content-type': ct } }).formData()` (also accept `application/x-www-form-urlencoded`); allowed text fields: `name, email, phone, message, form, page, lang, website` plus any other `<input>` names present in the three forms (read them from `index.html`/`property.html`, each ≤ 2000 chars, others dropped); reject any value with `\r` or `\n` in `name`/`email`/`phone`; email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. IP from `X-Real-IP` (set by Nginx), in-memory sliding window 5 per 10 min. Subject prefix by form: `contact` → `Contacto web`, `valuation` → `Valoración`, `enquire` → `Interés en propiedad` + ` (<id>)`. Log line appended **before** mailing: `{ts, ip, form, page, lang, fields, spam, mail}` then updated by appending a second line `{ts, ref, mail:"sent"|"failed", error}` (append-only).
- [ ] **Step 5: Implement `main.mjs`** — wire env → `createHandler`, `http.createServer`, refuse to start (exit 1, clear message) if `SMTP_USER`/`SMTP_PASS`/`MAIL_TO` missing.
- [ ] **Step 6: Run** `node tests/forms.test.mjs` → all PASS.
- [ ] **Step 7: Commit** `Form service: email the agency forms through Gmail and keep a log`.

### Task 3: VPS configuration files and provisioning

**Files:**
- Create: `agencia/server/deploy/nginx.conf`, `agencia/server/deploy/noindex.conf`, `agencia/server/deploy/ingrid-forms.service`, `agencia/server/deploy/logrotate`, `agencia/server/deploy/provision.sh`

**Interfaces:**
- Produces on the VPS: user `deploy` (key from root's `authorized_keys`), dir `/var/www/ingrid-realtor/{releases,current}` owned by `deploy`, user `ingrid-forms` (no login) owning `/var/lib/ingrid-forms`, unit `ingrid-forms.service` running `node /var/www/ingrid-realtor/current/server/main.mjs` with `EnvironmentFile=/etc/ingrid-forms.env`, sudoers line letting `deploy` run only `systemctl restart ingrid-forms`.

- [ ] **Step 1: `nginx.conf`** — default server (80, and 443 once certs exist) for any other host/IP → `301 https://ingrid-realtor.com$request_uri`; `www` → same redirect; main server root `/var/www/ingrid-realtor/current`, `include /etc/nginx/ingrid/noindex.conf;`, `location = /api/form { proxy_pass http://127.0.0.1:3100; proxy_set_header X-Real-IP $remote_addr; client_max_body_size 32k; }`, `location /data/ { add_header Cache-Control no-cache; }`, `/img/` `/css/` `/js/` 7-day cache, deny `/server/`, gzip, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin` (the map needs a Referer). `noindex.conf` = `add_header X-Robots-Tag "noindex, nofollow" always;` (the switch: emptying it opens the site; Task 4 docs explain also swapping `robots.txt`). `logrotate` for `/var/lib/ingrid-forms/submissions.jsonl`: `monthly`, `rotate 12`, `compress`, `copytruncate` (12-month retention per `privacy.html`).
- [ ] **Step 2: `provision.sh`** — idempotent, run as root via `ssh root@79.110.63.60 'bash -s' < provision.sh`: `apt-get install -y nginx certbot python3-certbot-nginx fail2ban unattended-upgrades nodejs` (if `node -v` < 18, install NodeSource LTS), create users/dirs, install the four files, `ufw allow OpenSSH; ufw allow 'Nginx Full'; ufw --force enable`, enable fail2ban `sshd` jail, `nginx -t && systemctl reload nginx`, enable (not start until env exists) `ingrid-forms`. Does **not** touch `sshd_config` (Task 5).
- [ ] **Step 3: Run provisioning** and verify: `ssh deploy@79.110.63.60 true` succeeds; `curl -sI http://79.110.63.60` → `301` to `https://ingrid-realtor.com/`; `ufw status` → active with 22/80/443; `systemctl is-active nginx fail2ban` → `active active`; running `provision.sh` a second time exits 0 with no changes.
- [ ] **Step 4: Commit** `VPS config: nginx, form service unit and provisioning script`.

### Task 4: Deploy and rollback script

**Files:**
- Create: `agencia/scripts/deploy.sh`, `agencia/tests/deploy.test.sh`
- Modify: root `CLAUDE.md` (hosting, deploy flow, noindex switch, line-ending note), `README.md` (short VPS section)

**Interfaces:**
- Consumes: Task 3 layout on the VPS. Env overrides for testing: `DEPLOY_HOST` (default `deploy@79.110.63.60`), `DEPLOY_ROOT` (default `/var/www/ingrid-realtor`), `DEPLOY_URL` (default `https://ingrid-realtor.com/`), `DEPLOY_SKIP_PUSH_CHECK`.
- Produces: `scripts/deploy.sh` (deploy) and `scripts/deploy.sh --rollback`.

- [ ] **Step 1: Write `tests/deploy.test.sh`** — runs the script with `DEPLOY_HOST=local` mode (script uses plain `bash -c` instead of `ssh` when host is `local`) against a temp `DEPLOY_ROOT` and a temp clone of the repo. Assertions: release dir contains `index.html`, `server/main.mjs`, `data/listings.json`, and does **not** contain `admin/`, `netlify/`, `tests/`, `scripts/`, `*.md`, `netlify.toml`; `current` points to it; `VERSION` holds `git rev-parse HEAD`; a tracked file with real content change → exit 1 and message `Hay cambios sin guardar`; only CRLF differences → proceeds; deploying 7 times keeps 5 releases; `--rollback` points `current` to the previous release.
- [ ] **Step 2: Run** `bash tests/deploy.test.sh` → FAIL.
- [ ] **Step 3: Implement `deploy.sh`** — `set -euo pipefail`; cd to `agencia/`; run both build scripts, `node tests/api.test.mjs`, `node tests/site.test.mjs`, `node tests/forms.test.mjs`; guard with `git diff --ignore-cr-at-eol --quiet HEAD -- .` and untracked check; unless `DEPLOY_SKIP_PUSH_CHECK`, `git fetch` and require `HEAD == origin/main`; build file list with `git ls-files` minus the excluded paths plus generated files; stream `tar czf - … | ssh "$DEPLOY_HOST" "mkdir -p R && tar xzf - -C R"` into `releases/$(date -u +%Y%m%d-%H%M%S)`; write `VERSION`; `ln -sfn` + `mv -T` for atomic switch; prune to 5; `sudo systemctl restart ingrid-forms` if `server/` differs from the previous release; `curl -fsS -o /dev/null "$DEPLOY_URL"` else print a Spanish error suggesting `--rollback`. Messages to the user in Spanish.
- [ ] **Step 4: Run** `bash tests/deploy.test.sh` → all PASS.
- [ ] **Step 5: Docs** — update `CLAUDE.md` "Estado y pendientes"/hosting lines and add the change flow (edit → build → check → commit → push → `scripts/deploy.sh`) and how to open the site to search engines (empty `noindex.conf`, serve public `robots.txt`).
- [ ] **Step 6: Commit** `Deploy script with releases and rollback; document the VPS flow`.

### Task 5: Go live (needs the owner)

- [ ] **Step 1: DNS** — owner sets A records `@` and `www` → `79.110.63.60` in IONOS. Verify: `getent hosts ingrid-realtor.com www.ingrid-realtor.com` on the VPS both return `79.110.63.60`.
- [ ] **Step 2: Certificate** — `certbot --nginx -d ingrid-realtor.com -d www.ingrid-realtor.com --redirect -m ingrid.realtor91@gmail.com --agree-tos -n`; verify `curl -sI https://ingrid-realtor.com` → 200 with `x-robots-tag: noindex, nofollow`, `http://`, `https://www.` and `http://79.110.63.60` → 301 to `https://ingrid-realtor.com/`; `certbot renew --dry-run` succeeds.
- [ ] **Step 3: Gmail secret** — owner creates the app password and writes `/etc/ingrid-forms.env` themselves (`SMTP_USER=…`, `SMTP_PASS=…`, `MAIL_TO=ingrid.realtor91@gmail.com`), mode 600 root; then `systemctl restart ingrid-forms` → active.
- [ ] **Step 4: First deploy** — commit, push, `bash agencia/scripts/deploy.sh` → exit 0.
- [ ] **Step 5: End-to-end** — in a real browser, ES and EN, desktop and 390 px: no JS errors, map tiles load, listings load; send each of the three forms → mail arrives in Gmail inbox (not spam) with correct subject and Reply-To, log lines present; 6th fast submission shows the error text.
- [ ] **Step 6: SSH hardening** — `/etc/ssh/sshd_config.d/10-hardening.conf`: `PasswordAuthentication no`, `PermitRootLogin prohibit-password`, `KbdInteractiveAuthentication no`; `sshd -t`; keep the current session open, reload `ssh`, confirm a **new** key login works as root and as `deploy`, and `ssh -o PubkeyAuthentication=no root@79.110.63.60` is refused.
- [ ] **Step 7: Commit** any doc updates `Go live on ingrid-realtor.com`.
