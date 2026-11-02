#!/usr/bin/env bash
# Tests scripts/deploy.sh on a temporary clone of the repository, deploying to a temporary folder
# on the VPS (not the live site). Needs SSH access as deploy@79.110.63.60.
# Run from the agencia folder: bash tests/deploy.test.sh
set -uo pipefail
HOST=${DEPLOY_HOST:-deploy@79.110.63.60}
REPO=$(git rev-parse --show-toplevel)
TMP=$(mktemp -d)
ROOT=/tmp/ingrid-deploy-test-$$
failed=0
check() { if [ "$2" = 0 ]; then echo "PASS $1"; else echo "FAIL $1"; failed=$((failed + 1)); fi; }
remote() { ssh -o BatchMode=yes "$HOST" "$1"; }
cleanup() { remote "rm -rf $ROOT"; rm -rf "$TMP"; }
trap cleanup EXIT

git clone -q "$REPO" "$TMP/repo" -b "$(git -C "$REPO" branch --show-current)"
cd "$TMP/repo/agencia"
# Test the deploy script as it is in the working copy, committed in the clone.
cp "$REPO/agencia/scripts/deploy.sh" scripts/deploy.sh 2>/dev/null
if [ -n "$(git status --porcelain)" ]; then git add -A && git -c user.name=test -c user.email=test@example.com commit -qm 'test: working-copy deploy.sh'; fi
remote "mkdir -p $ROOT/releases"
export DEPLOY_HOST="$HOST" DEPLOY_ROOT="$ROOT" DEPLOY_URL=skip DEPLOY_SKIP_PUSH_CHECK=1 DEPLOY_RESTART=0
deploy() { bash scripts/deploy.sh "$@" >"$TMP/out" 2>&1; }

# A fresh checkout (CRLF files on Windows, LF after the build) deploys.
deploy; check 'deploy from a clean checkout' $?
rel=$(remote "readlink $ROOT/current")
check 'current points to a release' "$([[ $rel == releases/2* ]] && echo 0 || echo 1)"
remote "test -f $ROOT/current/index.html && test -f $ROOT/current/server/main.mjs && test -f $ROOT/current/robots.txt"
check 'release has the site and the form service' $?

# Página de propiedades → "publicada": the property pages and their data go out only when it is not false.
switch() {
  node -e "const fs = require('fs'), f = 'data/web/pagina-propiedades.json', o = JSON.parse(fs.readFileSync(f, 'utf8')); o.publicada = $1; fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n')"
  node scripts/build-site.js >/dev/null && node scripts/build-listings.js >/dev/null
  git add -A && git -c user.name=test -c user.email=test@example.com commit -qm "test: properties $1"
}
switch false; deploy; check 'deploy without properties' $?
remote "cd $ROOT/current && test -f index.html && test -f guias.html && ! ls properties.html property.html data/listings.json data/listings.js data/propiedades js/catalog.js js/properties.js 2>/dev/null"
check 'without properties: no property pages or data' $?
switch true; deploy; check 'deploy with properties' $?
remote "cd $ROOT/current && test -f properties.html && test -f property.html && test -f data/listings.json && test -d data/propiedades"
check 'with properties: pages and data' $?
remote "cd $ROOT/current && ! ls -d admin netlify tests scripts server/deploy netlify.toml 2>/dev/null && ! ls *.md 2>/dev/null"
check 'release has no panel, API, tests, scripts or docs' $?
check 'VERSION is the commit' "$([ "$(remote "cat $ROOT/current/VERSION")" = "$(git rev-parse HEAD)" ] && echo 0 || echo 1)"

# Real changes not committed: refused.
echo '<!-- x -->' >> index.html
deploy; code=$?
check 'uncommitted change → refused' "$([ $code != 0 ] && grep -q 'Hay cambios sin guardar' "$TMP/out" && echo 0 || echo 1)"
git checkout -q -- index.html
touch new-file.txt
deploy; code=$?
check 'untracked file → refused' "$([ $code != 0 ] && grep -q 'Hay cambios sin guardar' "$TMP/out" && echo 0 || echo 1)"
rm new-file.txt

# Keeps the last 5 releases.
for i in 1 2 3 4 5 6; do sleep 1; deploy || { echo "deploy $i failed"; cat "$TMP/out"; }; done
n=$(remote "ls -1 $ROOT/releases/2*/VERSION | wc -l")
check 'keeps 5 releases' "$([ "$n" = 5 ] && echo 0 || echo 1)"

# Rollback goes to the previous release, and refuses when there is none older.
cur=$(remote "readlink $ROOT/current")
prev=$(remote "ls -1 $ROOT/releases | grep '^2' | sort | tail -2 | head -1")
# A half-uploaded release (no VERSION) between the two is never chosen.
remote "mkdir -p $ROOT/releases/$prev-partial"
deploy --rollback; check 'rollback runs' $?
check 'rollback → previous release' "$([ "$(remote "readlink $ROOT/current")" = "releases/$prev" ] && echo 0 || echo 1)"

echo
[ $failed = 0 ] && echo 'all passed' || echo "$failed failed"
exit $((failed > 0))
