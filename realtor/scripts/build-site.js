// Applies the texts, photos and contact details edited in the admin panel (Web → …, files in data/web/)
// to the pages. Netlify runs it on every publish (see netlify.toml). To run it by hand: node scripts/build-site.js
// It only rewrites what sits between <!-- web:name --> markers, elements with data-web="…" or data-i18n="…"
// keys listed below, and the phone, WhatsApp, email and form links. Running it twice changes nothing.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => { if (read(f) !== s) { fs.writeFileSync(path.join(root, f), s); console.log('updated ' + f); } };
function web(name) {
  try { return JSON.parse(read('data/web/' + name + '.json')); } catch (e) {
    console.warn('data/web/' + name + '.json: ' + e.message + ' (using what the pages already say)');
    return null;
  }
}

const str = (v) => (v == null ? '' : String(v)).trim();
const html = (v) => str(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => html(v).replace(/"/g, '&quot;');
const img = (v) => str(v).replace(/^\//, '');
const list = (v) => (Array.isArray(v) ? v : []);
// Spanish is the main text in the panel; English falls back to it when left empty, and the other way round.
const pair = (es, en) => ({ es: str(es) || str(en), en: str(en) || str(es) });

/* ---------------------------------------------------------------- read the panel */
const contacto = web('contacto');
const portada = web('portada');
const vecindarios = web('vecindarios');
const servicios = web('servicios');
const valoracion = web('valoracion');
const sobreMi = web('sobre-mi');
const testimonios = web('testimonios');
const paginaProps = web('pagina-propiedades');

const keys = {};      // data-i18n key -> { es, en } for elements that already exist on the pages
const extra = {};     // Spanish strings for elements this script creates (written into the web:es block)
const blocks = {};    // marker name -> function (indent) -> HTML
const set = (k, es, en) => { const p = pair(es, en); if (p.es || p.en) keys[k] = p; };
const ind = (lines, pad) => lines.filter((l) => l != null).map((l) => pad + l).join('\n');

/* contact */
let phone = null, wa = null, email = '', office = '', endpoint = null, c = {};
if (contacto) {
  c = contacto;
  const tel = (v) => {
    let d = str(v).replace(/\D/g, '');
    if (!d) return null;
    if (d.length === 10) d = '1' + d;
    const us = d.length === 11 && d[0] === '1';
    return {
      href: '+' + d, wa: d,
      text: us ? '(' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7) : str(v),
      intl: us ? '+1 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7) : '+' + d
    };
  };
  phone = tel(c.telefono);
  wa = tel(c.whatsapp) || phone;
  email = str(c.email);
  const o = c.oficina || {};
  const cityLine = [str(o.ciudad), [str(o.estado), str(o.cp)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  office = [str(o.calle), cityLine].filter(Boolean).join(' · ');
  endpoint = str(c.formularios);
  const lic = str(c.licencia);
  const agency = str(c.agencia);
  set('contact.title', c.titulo, (c.en || {}).titulo);
  set('contact.lede', c.texto, (c.en || {}).texto);
  set('about.f2v', 'Asociada de ventas de bienes raíces en Florida' + (lic ? ' · ' + lic : ''),
    'Florida Real Estate Sales Associate' + (lic ? ' · ' + lic : ''));
  set('footer.role', 'Asesora de bienes raíces de lujo · Asociada de ventas con licencia en Florida' + (lic ? ' · Lic. ' + lic : ''),
    'Luxury Real Estate Advisor · Licensed Florida Real Estate Sales Associate' + (lic ? ' · Lic. ' + lic : ''));
  set('footer.broker', 'Corretaje: ' + (agency || '[Nombre de la agencia]') + ', corredor de bienes raíces con licencia',
    'Brokered by ' + (agency || '[Brokerage Name]') + ', Licensed Real Estate Broker');
  blocks.channels = (pad) => ind([
    phone && '<li><span data-i18n="contact.phone">Phone</span><a href="tel:' + phone.href + '" data-web="phone">' + html(phone.text) + '</a></li>',
    wa && '<li><span>WhatsApp</span><a href="https://wa.me/' + wa.wa + '" target="_blank" rel="noopener">' + html(wa.intl) + '</a></li>',
    email && '<li><span data-i18n="contact.email">Email</span><a href="mailto:' + attr(email) + '" data-web="email">' + html(email) + '</a></li>',
    office && '<li><span data-i18n="contact.office">Office</span><span data-web="office">' + html(office) + '</span></li>'
  ], pad);
}

/* home page */
let metaHome = null, metaProps = null;
if (portada) {
  const en = portada.en || {};
  set('hero.eyebrow', portada.eyebrow, en.eyebrow);
  set('hero.lede', portada.frase, en.frase);
  set('hero.sub', portada.subtitulo, en.subtitulo);
  const g = portada.google || {};
  metaHome = { es: pair(g.titulo, g.titulo_en), desc: pair(g.descripcion, g.descripcion_en) };
  set('meta.title', metaHome.es.es, metaHome.es.en);
  set('meta.description', metaHome.desc.es, metaHome.desc.en);
  const fig = portada.cifras || {};
  const figs = list(fig.lista).filter((f) => str(f.numero) || str(f.texto) || str(f.texto_en)).slice(0, 4);
  figs.forEach((f, i) => { extra['fig.' + (i + 1)] = pair(f.texto, f.texto_en).es; });
  blocks.figures = (pad) => (fig.mostrar === false || !figs.length ? '' : ind([
    '<section class="figures" aria-label="Track record" data-i18n-attr="aria-label:fig.label">',
    '  <div class="wrap figures__row">',
    ...figs.map((f, i) => '    <p><strong>' + html(f.numero) + '</strong><span data-i18n="fig.' + (i + 1) + '">' + html(pair(f.texto, f.texto_en).en) + '</span></p>'),
    '  </div>',
    '</section>'
  ], pad));
}

/* neighborhoods: the cards on the home page, the neighborhood lists and filters, and the names used by the scripts */
let zones = null;
if (vecindarios) {
  const en = vecindarios.en || {};
  set('hoods.eyebrow', vecindarios.eyebrow, en.eyebrow);
  set('hoods.title', vecindarios.titulo, en.titulo);
  set('hoods.intro', vecindarios.intro, en.intro);
  const seen = new Set();
  zones = list(vecindarios.zonas).map((z) => {
    let id = str(z.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id) id = str(z.nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return { id, name: pair(z.nombre, z.nombre_en), text: pair(z.texto, z.texto_en), photo: img(z.foto), home: z.portada !== false };
  }).filter(Boolean);
  zones.forEach((z) => { extra['zone.' + z.id] = z.name.es; if (z.home) extra['zone.' + z.id + '.d'] = z.text.es; });
  const options = (pad) => ind(zones.map((z) => '<option value="' + z.id + '" data-i18n="zone.' + z.id + '">' + html(z.name.en) + '</option>'), pad);
  blocks['area-options'] = options;
  blocks.hoods = (pad) => ind(zones.filter((z) => z.home).flatMap((z) => [
    '<article class="hood" data-area="' + z.id + '">',
    '  <div class="hood__media media"><img class="media__img" src="' + attr(z.photo || 'img/sin-foto.svg') + '" width="1000" height="1250" alt="" loading="lazy" decoding="async"></div>',
    '  <h3 data-i18n="zone.' + z.id + '">' + html(z.name.en) + '</h3>',
    '  <p data-i18n="zone.' + z.id + '.d">' + html(z.text.en) + '</p>',
    '  <a class="link-btn hood__btn" href="properties.html?area=' + z.id + '">See properties</a>',
    '</article>'
  ]), pad);
  blocks['area-links'] = (pad) => ind(zones.map((z) => '<li><a href="properties.html?area=' + z.id + '" data-area-link="' + z.id + '"><span data-i18n="zone.' + z.id + '">' + html(z.name.en) + '</span><small></small></a></li>'), pad);
}

/* services */
if (servicios) {
  const en = servicios.en || {};
  set('services.eyebrow', servicios.eyebrow, en.eyebrow);
  set('services.title', servicios.titulo, en.titulo);
  [['buy', servicios.comprar], ['sell', servicios.vender], ['intl', servicios.exterior]].forEach(([k, items]) => {
    const pts = list(items).filter((p) => str(p.titulo) || str(p.titulo_en));
    pts.forEach((p, i) => { extra[k + '.' + (i + 1)] = pair(p.titulo, p.titulo_en).es; extra[k + '.' + (i + 1) + 'd'] = pair(p.texto, p.texto_en).es; });
    blocks[k] = (pad) => ind(pts.map((p, i) => '<div class="point"><h3 data-i18n="' + k + '.' + (i + 1) + '">' + html(pair(p.titulo, p.titulo_en).en) +
      '</h3><p data-i18n="' + k + '.' + (i + 1) + 'd">' + html(pair(p.texto, p.texto_en).en) + '</p></div>'), pad);
  });
}

/* valuation */
if (valoracion) {
  const en = valoracion.en || {};
  set('val.eyebrow', valoracion.eyebrow, en.eyebrow);
  set('val.title', valoracion.titulo, en.titulo);
  set('val.lede', valoracion.texto, en.texto);
}

/* about */
let portrait = null;
if (sobreMi) {
  const en = sobreMi.en || {};
  set('about.eyebrow', sobreMi.eyebrow, en.eyebrow);
  set('about.title', sobreMi.titulo, en.titulo);
  set('about.f1v', sobreMi.idiomas, en.idiomas);
  set('about.f3v', sobreMi.especialidad, en.especialidad);
  portrait = img(sobreMi.foto);
  const paras = list(sobreMi.parrafos).filter((p) => str(p.texto) || str(p.texto_en));
  paras.forEach((p, i) => { extra['about.p' + (i + 1)] = pair(p.texto, p.texto_en).es; });
  blocks['about-text'] = (pad) => ind(paras.map((p, i) => '<p data-i18n="about.p' + (i + 1) + '">' + html(pair(p.texto, p.texto_en).en) + '</p>'), pad);
}

/* testimonials */
if (testimonios) {
  const en = testimonios.en || {};
  const head = { eyebrow: pair(testimonios.eyebrow, en.eyebrow), title: pair(testimonios.titulo, en.titulo) };
  set('words.eyebrow', head.eyebrow.es, head.eyebrow.en);
  set('words.title', head.title.es, head.title.en);
  const items = list(testimonios.lista).filter((w) => str(w.texto) || str(w.texto_en));
  items.forEach((w, i) => { extra['words.' + (i + 1)] = pair(w.texto, w.texto_en).es; extra['words.' + (i + 1) + 'by'] = pair(w.quien, w.quien_en).es; });
  blocks.words = (pad) => (testimonios.mostrar === false || !items.length ? '' : ind([
    '<section class="section section--mist" aria-labelledby="words-title">',
    '  <div class="wrap">',
    '    <p class="eyebrow" data-i18n="words.eyebrow">' + html(head.eyebrow.en) + '</p>',
    '    <h2 id="words-title" class="h2 words__title" data-i18n="words.title">' + html(head.title.en) + '</h2>',
    '    <div class="words">',
    ...items.flatMap((w, i) => [
      '      <figure class="word">',
      '        <blockquote data-i18n="words.' + (i + 1) + '">' + html(pair(w.texto, w.texto_en).en) + '</blockquote>',
      '        <figcaption><span class="word__initials">' + html(w.iniciales) + '</span><span data-i18n="words.' + (i + 1) + 'by">' + html(pair(w.quien, w.quien_en).en) + '</span></figcaption>',
      '      </figure>'
    ]),
    '    </div>',
    '  </div>',
    '</section>'
  ], pad));
}

/* properties page */
if (paginaProps) {
  const en = paginaProps.en || {};
  set('props.title', paginaProps.titulo, en.titulo);
  set('props.lede', paginaProps.texto, en.texto);
  const g = paginaProps.google || {};
  metaProps = { es: pair(g.titulo, g.titulo_en), desc: pair(g.descripcion, g.descripcion_en) };
  set('props.meta.title', metaProps.es.es, metaProps.es.en);
  set('props.meta.description', metaProps.desc.es, metaProps.desc.en);
}

/* structured data for search engines */
blocks.jsonld = (pad) => {
  const o = (c.oficina || {});
  const data = {
    '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'Ingrid Cabeza',
    description: 'Luxury real estate advisor in Florida.',
    telephone: phone ? phone.href.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '+1-$1-$2-$3') : undefined,
    email: email || undefined,
    knowsLanguage: ['en', 'es'],
    address: { '@type': 'PostalAddress', streetAddress: str(o.calle) || undefined, addressLocality: str(o.ciudad) || undefined, addressRegion: str(o.estado) || undefined, postalCode: str(o.cp) || undefined, addressCountry: 'US' },
    areaServed: zones ? zones.map((z) => z.name.en) : undefined
  };
  const body = JSON.stringify(data, null, 2).replace(/</g, '\\u003c').split('\n');
  return ind(['<script type="application/ld+json">', ...body, '</script>'], pad);
};

/* ---------------------------------------------------------------- write the pages */
const reKey = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function applyHtml(file, metaSet) {
  let s = read(file);
  // Blocks between <!-- web:name --> and <!-- /web:name -->, indented like the opening marker.
  s = s.replace(/([ \t]*)<!-- web:([\w-]+) -->[\s\S]*?<!-- \/web:\2 -->/g, (all, pad, name) => {
    if (!blocks[name]) return all;
    const inner = blocks[name](pad);
    return pad + '<!-- web:' + name + ' -->\n' + (inner ? inner + '\n' : '') + pad + '<!-- /web:' + name + ' -->';
  });
  // English text of existing elements (Spanish goes to js/i18n.js).
  for (const [k, v] of Object.entries(keys)) {
    if (k.indexOf('meta.') > -1) continue;
    const re = new RegExp('(<([a-z0-9]+)\\b[^>]*\\sdata-i18n="' + reKey(k) + '"[^>]*>)[\\s\\S]*?(</\\2>)', 'g');
    s = s.replace(re, (all, open, tag, close) => open + html(v.en) + close);
  }
  // Contact details wherever they are shown.
  const shown = { phone: phone && phone.text, whatsapp: wa && wa.intl, email, office };
  s = s.replace(/(<([a-z]+)\b[^>]*\sdata-web="(phone|whatsapp|email|office)"[^>]*>)[\s\S]*?(<\/\2>)/g,
    (all, open, tag, kind, close) => (shown[kind] ? open + html(shown[kind]) + close : all));
  if (phone) s = s.replace(/tel:\+\d+/g, 'tel:' + phone.href);
  if (wa) s = s.replace(/wa\.me\/\d+/g, 'wa.me/' + wa.wa);
  if (email) s = s.replace(/mailto:[^"'\s<>?]+/g, 'mailto:' + email);
  if (endpoint != null) s = s.replace(/data-endpoint="[^"]*"/g, 'data-endpoint="' + attr(endpoint) + '"');
  // Portrait in the key of the About section.
  if (portrait) s = s.replace(/(<image href=")[^"]*("[^>]*clip-path="url\(#key-frame\)")/, '$1' + attr(portrait) + '$2');
  // Title and description for search engines and shared links.
  if (metaSet) {
    s = s.replace(/<title>[^<]*<\/title>/, '<title>' + html(metaSet.es.en) + '</title>')
      .replace(/(<meta name="description" content=")[^"]*(")/, '$1' + attr(metaSet.desc.en) + '$2')
      .replace(/(<meta property="og:title" content=")[^"]*(")/, '$1' + attr(metaSet.es.en) + '$2')
      .replace(/(<meta property="og:description" content=")[^"]*(")/, '$1' + attr(metaSet.desc.en) + '$2');
  }
  write(file, s);
}
applyHtml('index.html', metaHome);
applyHtml('properties.html', metaProps);
applyHtml('property.html', null);
applyHtml('privacy.html', null);

/* Spanish texts, and the neighborhood names and descriptions used by the scripts */
{
  let s = read('js/i18n.js');
  const js = (v) => JSON.stringify(v);
  const i = s.indexOf('\n  strings: {');
  let es = s.slice(0, i), rest = s.slice(i);
  for (const [k, v] of Object.entries(keys)) {
    const re = new RegExp("(\\n    '" + reKey(k) + "': )(?:'(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\")");
    const val = k.indexOf('meta.') > -1 ? v.es : html(v.es);
    if (re.test(es)) es = es.replace(re, (all, head) => head + js(val));
    else extra[k] = v.es;
  }
  const lines = Object.entries(extra).map(([k, v]) => "    '" + k + "': " + js(k.indexOf('meta.') > -1 ? v : html(v)) + ',');
  es = es.replace(/(\n    \/\/ web:es[^\n]*)[\s\S]*?(\n    \/\/ \/web:es)/, (all, a, b) => a + (lines.length ? '\n' + lines.join('\n') : '') + b);
  if (zones) {
    let n = 0;
    rest = rest.replace(/(\n      \/\/ web:areas)[\s\S]*?(\n      \/\/ \/web:areas)/g, (all, a, b) => {
      const lang = n++ === 0 ? 'en' : 'es';
      const out = zones.flatMap((z) => ["      'area." + z.id + "': " + js(z.name[lang]) + ',', "      'hood." + z.id + "': " + js(z.text[lang]) + ',']);
      return a + (out.length ? '\n' + out.join('\n') : '') + b;
    });
  }
  write('js/i18n.js', es + rest);
}

/* the neighborhoods the property filters accept */
if (zones) {
  const s = read('js/catalog.js');
  write('js/catalog.js', s.replace(/AREAS: \[[^\]]*\]/, 'AREAS: [' + zones.map((z) => "'" + z.id + "'").join(', ') + ']'));
}
if (phone) {
  const s = read('js/property.js');
  write('js/property.js', s.replace(/wa\.me\/\d+/g, 'wa.me/' + wa.wa));
}
console.log('site texts: ' + Object.keys(keys).length + ' texts, ' + Object.keys(extra).length + ' generated strings' + (zones ? ', ' + zones.length + ' neighborhoods' : ''));
