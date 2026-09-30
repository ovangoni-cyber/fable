/* Wendy Realtor: listings, filters, listing detail, neighborhood guide, service tabs.
   Edit LISTINGS to change the homes on the page. `photo` is optional; `art` is the
   illustration shown underneath (and whenever the photo can't load). */
(function () {
  'use strict';

  var Site = window.Site;
  var t = Site.t;

  var LISTINGS = [
    {
      id: 'harbor-drive', area: 'key-biscayne', place: 'Key Biscayne',
      title: { en: 'Harbor Drive Residence', es: 'Residencia Harbor Drive' },
      price: 18950000, beds: 7, baths: 8.5, sqft: 9850, lot: 0.52, water: 'bay', frontage: 120, year: 2025,
      status: 'new', listed: '2026-09-12',
      art: 'img/listing-1.svg', photo: 'photo-1613490493576-7fde63acd811',
      desc: {
        en: 'New construction on the bay side of the island, finished this summer. Floor-to-ceiling impact glass on three sides, a 75 ft pool at the level of the water and a dock for a 60 ft yacht.',
        es: 'Construcción nueva en el lado de la bahía, terminada este verano. Vidrio de impacto de piso a techo en tres fachadas, una piscina de 75 pies a nivel del agua y un muelle para un yate de 60 pies.'
      },
      features: {
        en: ['120 ft of bay frontage with new seawall', 'Elevator, wine room and summer kitchen', 'Whole-home generator', 'Flood zone AE, built above base flood elevation'],
        es: ['120 pies frente a la bahía con muro nuevo', 'Ascensor, cava y cocina de verano', 'Generador para toda la casa', 'Zona de inundación AE, construida sobre la cota base']
      }
    },
    {
      id: 'sunset-island', area: 'miami-beach', place: 'Sunset Islands, Miami Beach',
      title: { en: 'Sunset Island Modern', es: 'Moderna en Sunset Island' },
      price: 32500000, beds: 8, baths: 10.5, sqft: 12400, lot: 0.61, water: 'bay', frontage: 150, year: 2023,
      status: 'sale', listed: '2026-06-02',
      art: 'img/listing-2.svg', photo: 'photo-1600585154340-be6161a56a0c',
      desc: {
        en: 'A gated island, sunset views across the bay to the downtown skyline and 150 ft of deep water with no fixed bridges to the ocean.',
        es: 'Una isla con acceso controlado, atardeceres sobre la bahía con vista al skyline y 150 pies de agua profunda sin puentes fijos hasta el océano.'
      },
      features: {
        en: ['No fixed bridges to open water', 'Rooftop terrace with bay and skyline views', 'Staff quarters and 4-car garage', 'Built 2023'],
        es: ['Sin puentes fijos hasta mar abierto', 'Terraza en la azotea con vista a la bahía y al skyline', 'Área de servicio y garaje para 4 autos', 'Construida en 2023']
      }
    },
    {
      id: 'golden-beach', area: 'north-beaches', place: 'Golden Beach',
      title: { en: 'Oceanfront on Ocean Boulevard', es: 'Frente al océano en Ocean Boulevard' },
      price: 26000000, beds: 7, baths: 9.5, sqft: 11000, lot: 0.7, water: 'ocean', frontage: 100, year: 2021,
      status: 'sale', listed: '2026-04-18',
      art: 'img/listing-8.svg', photo: 'photo-1605276374104-dee2a0ed3cd6',
      desc: {
        en: 'Direct beach access in a small town with its own police and no high-rises. Every main room faces the Atlantic.',
        es: 'Acceso directo a la playa en un pequeño municipio con policía propia y sin torres. Cada estancia principal mira al Atlántico.'
      },
      features: {
        en: ['100 ft of private beach frontage', 'Primary suite with ocean terrace', 'Gym, spa and cinema', 'Built 2021'],
        es: ['100 pies de playa privada', 'Suite principal con terraza al océano', 'Gimnasio, spa y cine', 'Construida en 2021']
      }
    },
    {
      id: 'old-cutler', area: 'coral-gables', place: 'Coral Gables',
      title: { en: 'Old Cutler Bay Estate', es: 'Finca en Old Cutler Bay' },
      price: 14200000, beds: 6, baths: 7.5, sqft: 8900, lot: 1.1, water: 'canal', frontage: 180, year: 2019,
      status: 'contract', listed: '2026-05-07',
      art: 'img/listing-3.svg', photo: 'photo-1512917774080-9991f1c4c750',
      desc: {
        en: 'More than an acre in a guard-gated community, on a wide canal with direct ocean access and room for a second dock.',
        es: 'Más de un acre en una comunidad con garita, sobre un canal ancho con salida directa al mar y espacio para un segundo muelle.'
      },
      features: {
        en: ['Guard-gated community', '180 ft on a wide canal, ocean access', 'Guest house over the garage', 'Top-rated public and private schools nearby'],
        es: ['Comunidad con garita de seguridad', '180 pies sobre canal ancho con salida al mar', 'Casa de huéspedes sobre el garaje', 'Colegios públicos y privados de primer nivel cerca']
      }
    },
    {
      id: 'venetian', area: 'miami-beach', place: 'Venetian Islands, Miami Beach',
      title: { en: 'Venetian Islands Modern', es: 'Moderna en las Venetian Islands' },
      price: 12850000, beds: 6, baths: 7, sqft: 7400, lot: 0.3, water: 'bay', frontage: 75, year: 2020,
      status: 'sold', listed: '2026-01-20',
      art: 'img/listing-7.svg', photo: 'photo-1600596542815-ffad4c1539a9',
      desc: {
        en: 'Sold off-market in 23 days to a buyer from New York. Wide bay views toward the Miami Beach skyline.',
        es: 'Vendida fuera del mercado en 23 días a un comprador de Nueva York. Amplias vistas a la bahía hacia el skyline de Miami Beach.'
      },
      features: {
        en: ['Sold off-market', '75 ft of bay frontage', 'Walk to the Venetian Causeway', 'Built 2020'],
        es: ['Vendida fuera del mercado', '75 pies frente a la bahía', 'A pasos de la Venetian Causeway', 'Construida en 2020']
      }
    },
    {
      id: 'sunny-isles-ph', area: 'north-beaches', place: 'Sunny Isles Beach',
      title: { en: 'Oceanfront Penthouse', es: 'Penthouse frente al océano' },
      price: 11900000, beds: 5, baths: 6.5, sqft: 6000, lot: 0, water: 'ocean', frontage: 0, year: 2022,
      status: 'sale', listed: '2026-08-27',
      art: 'img/listing-4.svg', photo: 'photo-1600607687939-ce8a6c25118c',
      desc: {
        en: 'A full-floor penthouse with a private elevator, 360° views and a rooftop pool, in a tower with beach service and a spa.',
        es: 'Penthouse de piso completo con ascensor privado, vistas de 360° y piscina en la azotea, en una torre con servicio de playa y spa.'
      },
      features: {
        en: ['Full floor, private elevator', 'Rooftop pool and summer kitchen', 'Beach service, spa and valet', 'Two assigned parking spaces and a cabana'],
        es: ['Piso completo, ascensor privado', 'Piscina y cocina de verano en la azotea', 'Servicio de playa, spa y valet', 'Dos plazas de estacionamiento y una cabaña']
      }
    },
    {
      id: 'pinecrest', area: 'pinecrest', place: 'Pinecrest',
      title: { en: 'Pinecrest Garden Estate', es: 'Finca con jardines en Pinecrest' },
      price: 9400000, beds: 7, baths: 8, sqft: 10200, lot: 1.4, water: 'none', frontage: 0, year: 2018,
      status: 'private', listed: '2026-09-01',
      art: 'img/listing-5.svg', photo: 'photo-1564013799919-ab600027ffc6',
      desc: {
        en: 'Offered privately. Details, photos and the address are shared with qualified buyers after a short call.',
        es: 'Oferta privada. Los detalles, fotos y la dirección se comparten con compradores calificados después de una breve llamada.'
      },
      features: {
        en: ['1.4 acres of mature gardens', 'Tennis court', 'Near top-rated schools', 'Details on request'],
        es: ['1.4 acres de jardines maduros', 'Cancha de tenis', 'Cerca de colegios de primer nivel', 'Detalles a solicitud']
      }
    },
    {
      id: 'tigertail', area: 'coconut-grove', place: 'Coconut Grove',
      title: { en: 'Tigertail Villa', es: 'Villa Tigertail' },
      price: 8750000, beds: 5, baths: 6.5, sqft: 6300, lot: 0.35, water: 'none', frontage: 0, year: 2024,
      status: 'sale', listed: '2026-07-15',
      art: 'img/listing-6.svg', photo: 'photo-1580587771525-78b9dba3b914',
      desc: {
        en: 'A new modern villa under the oak canopy, a short walk to the sailing clubs, Peacock Park and the village center.',
        es: 'Una villa moderna nueva bajo la sombra de los robles, a poca distancia de los clubes de vela, Peacock Park y el centro del barrio.'
      },
      features: {
        en: ['Built 2024', 'Heated pool and outdoor living room', 'Walk to the bay and the village', 'Impact glass throughout'],
        es: ['Construida en 2024', 'Piscina climatizada y sala exterior', 'A pie de la bahía y del centro', 'Vidrio de impacto en toda la casa']
      }
    }
  ];

  var PHOTO = 'https://images.unsplash.com/{id}?auto=format&fit=crop&w=1200&q=80';

  var state = { area: 'all', price: 'all', beds: '0', water: 'all', sort: 'price-desc' };
  var grid = document.getElementById('listing-grid');
  var countEl = document.getElementById('listing-count');
  var emptyEl = document.getElementById('listing-empty');
  var resetBtn = document.getElementById('l-reset');
  var sortEl = document.getElementById('l-sort');
  var dialog = document.getElementById('listing-dialog');
  var dialogBody = document.getElementById('dialog-body');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function L(obj) { return obj[Site.lang] || obj.en; }
  function byId(id) { return LISTINGS.filter(function (l) { return l.id === id; })[0]; }

  function priceText(l) { return l.status === 'private' ? t('price.request') : Site.money(l.price); }
  function perSf(l) { return Site.money(Math.round(l.price / l.sqft)) + ' / ' + t('u.sf'); }
  function facts(l) {
    return [
      l.beds + ' ' + t('u.bd'),
      Site.number(l.baths) + ' ' + t('u.ba'),
      Site.number(l.sqft) + ' ' + t('u.sf')
    ];
  }
  function waterText(l) {
    if (l.water === 'none') return '';
    var label = t('water.' + l.water);
    return l.frontage ? label + ' · ' + Site.number(l.frontage) + ' ' + t('u.ft') : label;
  }

  function matches(l) {
    if (state.area !== 'all' && l.area !== state.area) return false;
    if (state.water !== 'all' && l.water !== state.water) return false;
    if (+state.beds && l.beds < +state.beds) return false;
    if (state.price !== 'all') {
      var r = state.price.split('-').map(Number);
      var m = l.price / 1e6;
      if (m < r[0] || m >= r[1]) return false;
    }
    return true;
  }

  function sorted(list) {
    var s = list.slice();
    var cmp = {
      'price-desc': function (a, b) { return b.price - a.price; },
      'price-asc': function (a, b) { return a.price - b.price; },
      newest: function (a, b) { return b.listed < a.listed ? -1 : 1; },
      size: function (a, b) { return b.sqft - a.sqft; }
    }[state.sort];
    return s.sort(cmp);
  }

  function card(l) {
    var water = waterText(l);
    var photo = l.photo ? '<img class="media__photo" loading="lazy" src="' + PHOTO.replace('{id}', l.photo) + '" alt="">' : '';
    return (
      '<article class="listing listing--' + l.status + '">' +
        '<button class="listing__open" type="button" data-open-listing="' + l.id + '" aria-label="' + esc(t('listing.open', { name: L(l.title) })) + '">' +
          '<div class="listing__media media">' +
            '<img class="media__art" src="' + l.art + '" alt="">' + photo +
            '<span class="badge badge--' + l.status + '">' + esc(t('status.' + l.status)) + '</span>' +
          '</div>' +
          '<div class="listing__body">' +
            '<p class="listing__place">' + esc(l.place) + '</p>' +
            '<h3 class="listing__title">' + esc(L(l.title)) + '</h3>' +
            '<p class="listing__price">' + esc(priceText(l)) + (l.status !== 'private' ? '<span>' + esc(perSf(l)) + '</span>' : '') + '</p>' +
            '<p class="listing__facts">' + facts(l).map(esc).join('<i>·</i>') + '</p>' +
            (water ? '<p class="listing__water">' + esc(water) + '</p>' : '') +
          '</div>' +
        '</button>' +
      '</article>'
    );
  }

  function render() {
    var list = sorted(LISTINGS.filter(matches));
    grid.innerHTML = list.map(card).join('');
    Site.wirePhotos(grid);
    emptyEl.hidden = list.length > 0;
    var filtered = state.area !== 'all' || state.price !== 'all' || state.beds !== '0' || state.water !== 'all';
    resetBtn.hidden = !filtered;
    countEl.textContent = filtered
      ? t('listings.countFiltered', { n: list.length, total: LISTINGS.length })
      : t('listings.count', { n: LISTINGS.length });
  }

  /* ---------------------------------------------------------------- filters */
  var controls = document.querySelectorAll('[data-filter-control]');
  function syncControls() {
    controls.forEach(function (c) { c.value = state[c.getAttribute('data-filter-control')]; });
  }

  document.getElementById('hero-search').addEventListener('submit', function (e) {
    e.preventDefault();
    controls.forEach(function (c) { state[c.getAttribute('data-filter-control')] = c.value; });
    render();
    document.getElementById('listings').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });
  resetBtn.addEventListener('click', function () {
    state.area = 'all'; state.price = 'all'; state.beds = '0'; state.water = 'all';
    syncControls();
    render();
  });

  /* ---------------------------------------------------------------- neighborhoods */
  function renderHoods() {
    document.querySelectorAll('.hood').forEach(function (hood) {
      var area = hood.getAttribute('data-area');
      var n = LISTINGS.filter(function (l) { return l.area === area && l.status !== 'sold'; }).length;
      var btn = hood.querySelector('.hood__btn');
      btn.textContent = n ? t(n === 1 ? 'hoods.seeOne' : 'hoods.see', { n: n }) : t('hoods.ask');
      btn.onclick = function () {
        if (n) {
          state.area = area; state.price = 'all'; state.beds = '0'; state.water = 'all';
          syncControls();
          render();
          document.getElementById('listings').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          var msg = document.getElementById('c-msg');
          msg.value = t('hoods.askMsg', { area: hood.querySelector('h3').textContent });
          document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.getElementById('c-name').focus({ preventScroll: true });
        }
      };
    });
  }

  /* ---------------------------------------------------------------- listing detail */
  function openListing(id) {
    var l = byId(id);
    if (!l) return;
    var water = waterText(l);
    var rows = [
      [t('dlg.price'), priceText(l)],
      l.status !== 'private' ? [t('dlg.perSf'), perSf(l)] : null,
      [t('dlg.beds'), String(l.beds)],
      [t('dlg.baths'), Site.number(l.baths)],
      [t('dlg.interior'), Site.number(l.sqft) + ' ' + t('u.sf')],
      l.lot ? [t('dlg.lot'), Site.number(l.lot) + ' ' + t('u.ac')] : null,
      water ? [t('dlg.water'), water] : null,
      [t('dlg.year'), String(l.year)],
      [t('dlg.status'), t('status.' + l.status)]
    ].filter(Boolean);
    var photo = l.photo ? '<img class="media__photo" src="' + PHOTO.replace('{id}', l.photo) + '" alt="">' : '';

    dialogBody.innerHTML =
      '<div class="dialog__media media"><img class="media__art" src="' + l.art + '" alt="">' + photo +
        '<span class="badge badge--' + l.status + '">' + esc(t('status.' + l.status)) + '</span></div>' +
      '<div class="dialog__content">' +
        '<button class="dialog__close" type="button" data-close aria-label="' + esc(t('dlg.close')) + '">×</button>' +
        '<p class="listing__place">' + esc(l.place) + '</p>' +
        '<h2 class="dialog__title" id="dlg-title">' + esc(L(l.title)) + '</h2>' +
        '<p class="dialog__desc">' + esc(L(l.desc)) + '</p>' +
        '<dl class="dialog__facts">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<ul class="dialog__features">' + L(l.features).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
        '<div class="dialog__actions">' +
          (l.status === 'sold'
            ? '<button class="btn btn--sea" type="button" data-similar="' + l.id + '">' + esc(t('dlg.similar')) + '</button>'
            : '<button class="btn btn--sea" type="button" data-showing="' + l.id + '">' + esc(t(l.status === 'private' ? 'dlg.details' : 'dlg.showing')) + '</button>') +
          '<button class="btn btn--line" type="button" data-close>' + esc(t('dlg.close')) + '</button>' +
        '</div>' +
      '</div>';
    Site.wirePhotos(dialogBody);
    dialog.dataset.listing = id;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    document.body.classList.add('has-dialog');
  }

  function closeDialog() {
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
    document.body.classList.remove('has-dialog');
  }

  dialog.addEventListener('close', function () { document.body.classList.remove('has-dialog'); delete dialog.dataset.listing; });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog || e.target.closest('[data-close]')) { closeDialog(); return; }
    var showing = e.target.closest('[data-showing], [data-similar]');
    if (showing) {
      var l = byId(showing.getAttribute('data-showing') || showing.getAttribute('data-similar'));
      var key = showing.hasAttribute('data-similar') ? 'dlg.similarMsg' : (l.status === 'private' ? 'dlg.detailsMsg' : 'dlg.showingMsg');
      document.getElementById('c-msg').value = t(key, { name: L(l.title), place: l.place });
      document.getElementById('c-interest').value = 'buy';
      closeDialog();
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('c-name').focus({ preventScroll: true });
    }
  });

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-listing]');
    if (opener) openListing(opener.getAttribute('data-open-listing'));
  });

  /* ---------------------------------------------------------------- tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (tb) {
      var on = tb === tab;
      tb.setAttribute('aria-selected', String(on));
      tb.tabIndex = on ? 0 : -1;
      document.getElementById(tb.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next, true);
        e.preventDefault();
      }
    });
  });

  /* ---------------------------------------------------------------- language */
  Site.onLang(function () {
    render();
    renderHoods();
    if (dialog.open && dialog.dataset.listing) openListing(dialog.dataset.listing);
  });
  render();
  renderHoods();
})();
