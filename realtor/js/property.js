/* Wendy Realtor: one property page (property.html?id=…). Gallery with a photo viewer,
   facts, details, the neighborhood, an enquiry form and similar properties. */
(function () {
  'use strict';

  var Site = window.Site;
  var C = window.Catalog;
  var t = Site.t;
  var WA = 'https://wa.me/13055550199';
  function $(id) { return document.getElementById(id); }

  var l = C.byId(new URLSearchParams(window.location.search).get('id'));

  if (!l) {
    $('p-content').hidden = true;
    $('p-missing').hidden = false;
    document.querySelectorAll('.crumbs__more').forEach(function (el) { el.hidden = true; });
    var setMissing = function () {
      $('p-crumb-ref').textContent = t('prop.missingCrumb');
      document.title = t('prop.missingTitle') + ' · Wendy Realtor';
    };
    setMissing();
    Site.onLang(setMissing);
    return;
  }

  var msg = $('e-msg');
  var msgTouched = false;
  msg.addEventListener('input', function () { msgTouched = true; });
  // After a successful send the form is reset; put the property back in the message.
  $('enquire-form').addEventListener('reset', function () { window.setTimeout(function () { msgTouched = false; fillForm(); }, 0); });

  function waLink() { return WA + '?text=' + encodeURIComponent(t('prop.wa', { ref: l.ref, name: C.L(l.title) })); }

  function fillForm() {
    var key = l.status === 'sold' ? 'dlg.similarMsg' : l.status === 'private' ? 'prop.msgPrivate' : l.op === 'rent' ? 'prop.msgRent' : 'prop.msgShowing';
    if (!msgTouched) msg.value = t(key, { ref: l.ref, name: C.L(l.title), place: l.place });
    $('e-ref').value = l.ref;
    var cta = l.status === 'sold' ? 'dlg.similar' : l.status === 'private' ? 'dlg.details' : l.op === 'rent' ? 'prop.ctaRent' : 'dlg.showing';
    $('e-submit').textContent = t(cta);
  }

  function galleryHTML() {
    var name = C.L(l.title);
    if (l.status === 'private') {
      return '<div class="gallery__main media gallery--private"><img class="media__img" src="' + l.imgs[0] + '" width="1200" height="900" alt="" decoding="async">' +
        '<p class="gallery__note">' + C.esc(t('prop.privatePhotos')) + '</p></div>';
    }
    return l.imgs.slice(0, 3).map(function (src, i) {
      var more = i === 2 || (i === l.imgs.length - 1 && i > 0);
      return '<button class="' + (i ? 'gallery__thumb' : 'gallery__main') + ' media" type="button" data-photo="' + i + '" aria-label="' + C.esc(t('lb.open', { n: i + 1, total: l.imgs.length })) + '">' +
        '<img class="media__img" src="' + src + '" width="1200" height="900" alt="' + C.esc(t('listing.photoAlt', { name: name, n: i + 1, total: l.imgs.length })) + '"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + ' decoding="async">' +
        (more ? '<span class="gallery__all">' + C.icon('photo') + C.esc(t('prop.allPhotos', { n: l.imgs.length })) + '</span>' : '') +
      '</button>';
    }).join('');
  }

  function factsHTML() {
    var water = C.waterText(l, false);
    var rows = [
      ['bed', String(l.beds), t('dlg.beds')],
      ['bath', Site.number(l.baths), t('dlg.baths')],
      ['area', Site.number(l.sqft) + ' ' + t('u.sf'), t('dlg.interior')],
      l.lot ? ['lot', Site.number(l.lot) + ' ' + t('u.ac'), t('dlg.lot')] : null,
      water ? (l.frontage ? ['water', Site.number(l.frontage) + ' ' + t('u.ft'), water] : ['water', water, t('prop.setting')]) : null,
      ['year', String(l.year), t('dlg.year')]
    ].filter(Boolean);
    return rows.map(function (r) {
      return '<li>' + C.icon(r[0]) + '<span><b>' + C.esc(r[1]) + '</b><small>' + C.esc(r[2]) + '</small></span></li>';
    }).join('');
  }

  function tableHTML() {
    var water = C.waterText(l, true);
    var listed = new Intl.DateTimeFormat(Site.lang === 'es' ? 'es-US' : 'en-US', { dateStyle: 'long' }).format(new Date(l.listed + 'T12:00:00'));
    var rows = [
      [t('prop.ref'), l.ref],
      [t('prop.type'), C.typeName(l.type)],
      [t('prop.op'), t('op.' + l.op)],
      [t('dlg.price'), C.priceText(l)],
      C.perSf(l) ? [t('dlg.perSf'), C.perSf(l)] : null,
      [t('dlg.beds'), String(l.beds)],
      [t('dlg.baths'), Site.number(l.baths)],
      [t('dlg.interior'), Site.number(l.sqft) + ' ' + t('u.sf')],
      l.lot ? [t('dlg.lot'), Site.number(l.lot) + ' ' + t('u.ac')] : null,
      water ? [t('dlg.water'), water] : null,
      [t('dlg.year'), String(l.year)],
      [t('dlg.status'), C.statusText(l)],
      [t('prop.listed'), listed]
    ].filter(Boolean);
    return rows.map(function (r) { return '<div><dt>' + C.esc(r[0]) + '</dt><dd>' + C.esc(r[1]) + '</dd></div>'; }).join('');
  }

  function similar() {
    return C.all
      .filter(function (o) { return o.id !== l.id && o.op === l.op && o.status !== 'sold'; })
      .map(function (o) {
        var score = (o.area === l.area ? 3 : 0) + (o.type === l.type ? 2 : 0) + (o.water !== 'none' && l.water !== 'none' ? 1 : 0) - Math.abs(Math.log(o.price / l.price));
        return { o: o, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3)
      .map(function (s) { return s.o; });
  }

  function render() {
    var name = C.L(l.title);
    var areaHref = 'properties.html?' + (l.op === 'rent' ? 'op=rent&' : '') + 'area=' + l.area;

    $('p-crumb-area').textContent = C.areaName(l.area);
    $('p-crumb-area').href = areaHref;
    $('p-crumb-ref').textContent = t('ref.short', { ref: l.ref });

    $('p-eyebrow').textContent = C.typeName(l.type) + ' · ' + l.place;
    $('p-title').textContent = name;
    $('p-badges').innerHTML = C.badges(l) + '<span class="prop__ref">' + C.esc(t('ref.short', { ref: l.ref })) + '</span>';
    $('p-price').textContent = C.priceText(l);
    $('p-price').classList.toggle('is-sold', l.status === 'sold');
    $('p-persf').textContent = C.perSf(l);

    $('p-gallery').innerHTML = galleryHTML();
    $('p-gallery').className = 'gallery gallery--' + Math.min(l.status === 'private' ? 1 : l.imgs.length, 3);
    $('p-facts').innerHTML = factsHTML();
    $('p-desc').textContent = C.L(l.desc);
    $('p-features').innerHTML = C.L(l.features).map(function (f) { return '<li>' + C.esc(f) + '</li>'; }).join('');
    $('p-table').innerHTML = tableHTML();
    $('p-hood').textContent = t('hood.' + l.area);
    $('p-hood-link').textContent = t(l.op === 'rent' ? 'prop.moreInRent' : 'prop.moreIn', { area: C.areaName(l.area) });
    $('p-hood-link').href = areaHref;

    $('p-wa').href = waLink();
    $('p-wa-bar').href = waLink();
    fillForm();

    var sim = similar();
    $('similar').hidden = sim.length === 0;
    $('similar-grid').innerHTML = sim.map(C.card).join('');

    document.title = name + ' · ' + t('ref.short', { ref: l.ref }) + ' · Wendy Realtor';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = C.L(l.desc);
  }

  /* ---------------------------------------------------------------- photo viewer */
  var box = $('lightbox');
  var boxImg = $('lb-img');
  var current = 0;
  function show(i) {
    current = (i + l.imgs.length) % l.imgs.length;
    boxImg.src = l.imgs[current];
    boxImg.alt = t('listing.photoAlt', { name: C.L(l.title), n: current + 1, total: l.imgs.length });
    $('lb-count').textContent = (current + 1) + ' / ' + l.imgs.length;
  }
  function openBox(i) {
    show(i);
    if (!box.open) { if (typeof box.showModal === 'function') box.showModal(); else box.setAttribute('open', ''); }
    document.body.classList.add('has-dialog');
  }
  function closeBox() {
    if (box.open) { if (typeof box.close === 'function') box.close(); else box.removeAttribute('open'); }
  }
  box.addEventListener('close', function () { document.body.classList.remove('has-dialog'); });
  box.addEventListener('click', function (e) {
    var step = e.target.closest('[data-lb]');
    if (step) { show(current + +step.getAttribute('data-lb')); return; }
    if (e.target === box || e.target.closest('[data-lb-close]') || e.target.classList.contains('lightbox__inner')) closeBox();
  });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { show(current + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { show(current - 1); e.preventDefault(); }
  });
  $('p-gallery').addEventListener('click', function (e) {
    var b = e.target.closest('[data-photo]');
    if (b) openBox(+b.getAttribute('data-photo'));
  });

  /* ---------------------------------------------------------------- share */
  $('p-share').addEventListener('click', function () {
    var link = window.location.href.split('#')[0];
    var out = $('p-shared');
    if (navigator.share) {
      navigator.share({ title: document.title, url: link }).catch(function () { /* closed */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { out.textContent = t('prop.copied'); }, function () { out.textContent = link; });
    } else {
      out.textContent = link;
    }
  });

  render();
  Site.onLang(function () {
    render();
    if (box.open) show(current);
  });
})();
