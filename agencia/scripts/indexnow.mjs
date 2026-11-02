// Tells Bing (and the other IndexNow search engines) about every page in sitemap.xml.
// Google does not use IndexNow: it finds the site through robots.txt → sitemap.xml.
// Run from the agencia folder after publishing: node scripts/indexnow.mjs
// The key is the <32 hex>.txt file at the site root; it must be live before this runs.
import fs from 'node:fs';

const key = fs.readdirSync('.').find((f) => /^[0-9a-f]{32}\.txt$/.test(f)).slice(0, -4);
const urlList = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(urlList[0]).host;
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList })
});
console.log(res.status, res.statusText, '—', urlList.length, 'pages:', urlList.join(' '));
process.exit(res.ok ? 0 : 1);
