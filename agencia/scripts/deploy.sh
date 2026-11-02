#!/usr/bin/env bash
# Publishes the agency site on the VPS (https://ingrid-realtor.com). Run from Git Bash:
#   bash agencia/scripts/deploy.sh              build, test, upload a new release and switch to it
#   bash agencia/scripts/deploy.sh --rollback   switch back to the previous release
# Only what is committed and pushed to GitHub (main) is published: GitHub is the record of what is live.
# Each release is a folder in /var/www/ingrid-realtor/releases/; "current" points to the live one.
# For tests: DEPLOY_HOST, DEPLOY_ROOT, DEPLOY_URL (skip = no check), DEPLOY_SKIP_PUSH_CHECK=1, DEPLOY_RESTART=0.
set -euo pipefail
HOST=${DEPLOY_HOST:-deploy@79.110.63.60}
ROOT=${DEPLOY_ROOT:-/var/www/ingrid-realtor}
URL=${DEPLOY_URL:-https://ingrid-realtor.com/}
KEEP=5
cd "$(dirname "$0")/.."
remote() { ssh -o BatchMode=yes "$HOST" "$@"; }
# Releases that finished uploading (they have VERSION), oldest first. Run on the server, in $ROOT.
COMPLETE="for d in releases/2*/VERSION; do [ -f \"\$d\" ] && basename \"\$(dirname \"\$d\")\"; done | sort"
fail() { echo "ERROR: $*" >&2; exit 1; }

if [ "${1:-}" = --rollback ]; then
  prev=$(remote "cd $ROOT && cur=\$(basename \"\$(readlink current)\") && $COMPLETE | awk -v c=\"\$cur\" '\$0 == c { print p; exit } { p = \$0 }'")
  [ -n "$prev" ] || fail 'No hay una versión anterior a la que volver.'
  remote "cd $ROOT && ln -sfn releases/$prev current.tmp && mv -Tf current.tmp current"
  echo "Listo: la web vuelve a la versión $prev."
  exit 0
fi

echo '== Generando la web'
node scripts/build-site.js >/dev/null
node scripts/build-listings.js >/dev/null

echo '== Comprobando'
# Line-ending differences (Windows CRLF against the LF the build writes) do not count as changes.
if ! git diff --ignore-cr-at-eol --quiet HEAD -- . || [ -n "$(git ls-files --others --exclude-standard -- .)" ]; then
  git diff --ignore-cr-at-eol --stat HEAD -- . >&2
  git ls-files --others --exclude-standard -- . >&2
  fail 'Hay cambios sin guardar en agencia/. Haz commit (y push) antes de publicar.'
fi
if [ "${DEPLOY_SKIP_PUSH_CHECK:-0}" != 1 ]; then
  git fetch -q origin main
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail 'Lo que vas a publicar no es lo mismo que main en GitHub. Sube los cambios a main (git push) antes de publicar.'
fi
node tests/site.test.mjs >/dev/null || fail 'Fallan las pruebas de la web (node tests/site.test.mjs).'
node tests/forms.test.mjs >/dev/null 2>&1 || fail 'Fallan las pruebas de los formularios (node tests/forms.test.mjs).'
node tests/api.test.mjs >/dev/null || fail 'Fallan las pruebas de la API (node tests/api.test.mjs).'

echo '== Subiendo'
# Only what visitors need, plus the form service. Never the panel, the API, tests, scripts or docs.
files=$(git ls-files -- . | grep -Ev '^(admin|netlify|tests|scripts|server/deploy)/|\.md$|^netlify\.toml$')
# Página de propiedades → "publicada": false: the site goes out without the property pages and their data.
if [ "$(node -p "require('./data/web/pagina-propiedades.json').publicada !== false")" != true ]; then
  files=$(printf '%s\n' "$files" | grep -Ev '^(properties\.html|property\.html|data/listings\.js(on)?|js/(listings|catalog|map|properties|property)\.js)$|^data/propiedades/')
fi
rel=$(date -u +%Y%m%d-%H%M%S)
printf '%s\n' "$files" | tar czf - -T - | remote "set -e; cd $ROOT/releases; rm -rf .tmp-*; mkdir .tmp-$rel; tar xzf - -C .tmp-$rel; echo $(git rev-parse HEAD) > .tmp-$rel/VERSION; mv .tmp-$rel $rel"

echo '== Activando'
changed=$(remote "set -e; cd $ROOT
  old=\$(readlink current || true)
  ln -sfn releases/$rel current.tmp && mv -Tf current.tmp current
  $COMPLETE | head -n -$KEEP | sed 's|^|releases/|' | xargs -r rm -rf
  if [ -z \"\$old\" ] || ! diff -rq \"\$old/server\" releases/$rel/server >/dev/null 2>&1; then echo yes; fi")
if [ "${DEPLOY_RESTART:-1}" = 1 ] && [ "$changed" = yes ]; then
  remote 'sudo -n /usr/bin/systemctl restart ingrid-forms'
fi

if [ "$URL" != skip ]; then
  curl -fsS -o /dev/null "$URL" || fail "La web no responde en $URL. Para volver a la versión anterior: bash agencia/scripts/deploy.sh --rollback"
fi
echo "Listo: publicada la versión $rel ($(git rev-parse --short HEAD))."
