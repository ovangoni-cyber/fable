/* loads the properties from data/listings.json.
   That file is edited from the admin panel (/admin/); there is no need to touch it by hand.
   Page scripts run through Listings.ready(fn), once the properties have arrived. */
(function () {
  'use strict';

  var queue = [];
  var loaded = null;

  // Fill gaps a hand-made or half-finished entry may leave, so one bad entry cannot break a page.
  function clean(l) {
    var text = function (o) { o = o || {}; return { en: o.en || o.es || '', es: o.es || o.en || '' }; };
    var list = function (o) { o = o || {}; return { en: (o.en && o.en.length ? o.en : o.es) || [], es: (o.es && o.es.length ? o.es : o.en) || [] }; };
    var num = function (v) { v = Number(v); return isFinite(v) ? v : 0; };
    return {
      id: String(l.id || '').trim(),
      ref: l.ref || '',
      featured: !!l.featured,
      op: l.op === 'rent' ? 'rent' : 'sale',
      type: ['house', 'condo', 'penthouse'].indexOf(l.type) > -1 ? l.type : 'house',
      status: ['new', 'sale', 'contract', 'sold', 'private', 'rent'].indexOf(l.status) > -1 ? l.status : (l.op === 'rent' ? 'rent' : 'sale'),
      exclusive: !!l.exclusive,
      area: l.area || '',
      place: l.place || '',
      title: text(l.title),
      price: num(l.price),
      beds: num(l.beds),
      baths: num(l.baths),
      sqft: num(l.sqft),
      lot: num(l.lot),
      water: ['ocean', 'bay', 'canal'].indexOf(l.water) > -1 ? l.water : 'none',
      frontage: num(l.frontage),
      year: num(l.year),
      listed: String(l.listed || '').slice(0, 10),
      // The panel saves photos as /img/propiedades/…; drop the leading slash so the site also works from a subfolder.
      imgs: (l.imgs || []).filter(Boolean).length ? l.imgs.filter(Boolean).map(function (src) { return String(src).replace(/^\//, ''); }) : ['img/sin-foto.svg'],
      video: video(l.video),
      geo: l.geo && isFinite(l.geo.lat) && isFinite(l.geo.lng) ? { lat: +l.geo.lat, lng: +l.geo.lng, approx: !!l.geo.approx } : null,
      desc: text(l.desc),
      features: list(l.features)
    };
  }

  // A video is a YouTube or Vimeo link, or a file uploaded from the panel.
  function video(v) {
    v = String(v || '').trim();
    if (!v) return null;
    var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(v);
    if (m) return { kind: 'youtube', id: m[1], url: 'https://www.youtube.com/watch?v=' + m[1] };
    m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(v);
    if (m) return { kind: 'vimeo', id: m[1], url: 'https://vimeo.com/' + m[1] };
    if (/^https?:\/\//.test(v) && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(v)) return { kind: 'link', url: v };
    return { kind: 'file', src: v.replace(/^\//, '') };
  }

  function done(raw) {
    loaded = (raw || []).map(clean).filter(function (l) { return l.id; });
    window.LISTINGS = loaded;
    queue.splice(0).forEach(function (fn) { fn(loaded); });
  }

  window.Listings = {
    ready: function (fn) { if (loaded) fn(loaded); else queue.push(fn); }
  };

  // The one-file preview embeds the data; the real site reads the file.
  if (window.LISTINGS_DATA) { done(window.LISTINGS_DATA.listings); return; }
  fetch('data/listings.json', { cache: 'no-cache' })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (json) { done(json.listings); })
    .catch(function (err) {
      if (window.console) console.error('Could not load data/listings.json', err);
      done([]);
    });
})();
