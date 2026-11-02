// Tests what the build scripts write for publishing: share links, broker name, form endpoint,
// robots.txt and sitemap.xml. Works on a temporary copy of the site.
// Run from the agencia folder: node tests/site.test.mjs
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-site-'));
fs.cpSync(SITE, DIR, { recursive: true, filter: (src) => !/[\\/](netlify|tests|node_modules|\.git)$/.test(src) });

let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail == null ? '' : ' — ' + detail));
  if (!ok) failed++;
};
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(DIR, f));
const build = () => execSync('node scripts/build-site.js && node scripts/build-listings.js', { cwd: DIR, encoding: 'utf8' });

build();

const D = 'https://ingrid-realtor.com';
for (const [page, url] of [['index.html', D + '/'], ['properties.html', D + '/properties.html'], ['property.html', D + '/property.html'], ['guias.html', D + '/guias.html']]) {
  const s = read(page);
  check(page + ': absolute og:image', s.includes('<meta property="og:image" content="' + D + '/img/og.jpg">'));
  check(page + ': og:url', s.includes('<meta property="og:url" content="' + url + '">'));
}

for (const page of ['index.html', 'property.html']) {
  const s = read(page);
  check(page + ': forms send to /api/form', s.includes('data-endpoint="/api/form"') && !s.includes('data-endpoint=""'));
  const forms = s.match(/<form[^>]*data-endpoint[\s\S]*?<\/form>/g) || [];
  check(page + ': has forms', forms.length > 0);
  forms.forEach((f, i) => check(page + ': form ' + (i + 1) + ' has the honeypot', /<input[^>]*name="website"[^>]*tabindex="-1"/.test(f)));
}

check('i18n: broker in Spanish', read('js/i18n.js').includes('Corretaje: BEST DEALS REALTY'));
check('index: broker in English', read('index.html').includes('Brokered by BEST DEALS REALTY'));

// With data/web/pagina-propiedades.json "publicada": false the site goes out without properties:
// open to search engines, with no link, sitemap entry or search box that leads to them.
const shown = JSON.parse(read('data/web/pagina-propiedades.json')).publicada !== false;
check('robots.txt open, with the sitemap', exists('robots.txt') && read('robots.txt') === 'User-agent: *\nAllow: /\nSitemap: ' + D + '/sitemap.xml\n', exists('robots.txt') && read('robots.txt'));

const sitemap = exists('sitemap.xml') ? read('sitemap.xml') : '';
check('sitemap: home', sitemap.includes('<loc>' + D + '/</loc>'));
check('sitemap: guides and privacy', sitemap.includes('<loc>' + D + '/guias.html</loc>') && sitemap.includes('<loc>' + D + '/privacy.html</loc>'));
if (shown) check('sitemap: a property', sitemap.includes('<loc>' + D + '/property.html?id=granada</loc>'));
else check('sitemap: no properties', !/propert/.test(sitemap), sitemap);
check('sitemap: no admin', !sitemap.includes('admin'));

if (!shown) {
  for (const page of ['index.html', 'guias.html', 'privacy.html']) {
    const s = read(page);
    check(page + ': no link to the properties', !/href="properties?\.html/.test(s), (s.match(/href="propert[^"]*"/g) || []).join(' '));
    check(page + ': no map link in the menu', !/data-i18n="nav\.map"/.test(s));
  }
  const home = read('index.html');
  check('index: no search box, featured grid or map', !/id="(hero-search|featured-grid|home-map|neighborhoods)"/.test(home));
  check('index: no sample figures or testimonials', !/class="figures"|words-title/.test(home));
  check('index: does not load the property scripts', !/js\/(listings|catalog|map)\.js/.test(home));
  const hero = (home.match(/<form[^>]*id="hero-form"[\s\S]*?<\/form>/) || [''])[0];
  check('index: short form in the hero', /data-endpoint="\/api\/form"/.test(hero) && /name="name"[^>]*required/.test(hero) && /name="email"[^>]*required/.test(hero) && /name="phone"/.test(hero) && /name="interest"/.test(hero));
  check('index: hero form has the honeypot', /<input[^>]*name="website"[^>]*tabindex="-1"/.test(hero));
  check('index: no Miami areas for search engines', !/Miami|Brickell|Key Biscayne/.test((home.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0]));
}
check('footer: no "sample listings" note', !/Sample listings/.test(read('index.html')) && !/ejemplos ilustrativos/.test(read('js/i18n.js')));

const before = { robots: exists('robots.txt') && read('robots.txt'), sitemap };
const again = build();
check('second build changes nothing', !/^updated /m.test(again), again);
check('second build: same robots.txt and sitemap.xml', before.robots === (exists('robots.txt') && read('robots.txt')) && before.sitemap === (exists('sitemap.xml') ? read('sitemap.xml') : ''));

fs.rmSync(DIR, { recursive: true, force: true });
console.log(failed ? '\n' + failed + ' failed' : '\nall passed');
process.exit(failed ? 1 : 0);
