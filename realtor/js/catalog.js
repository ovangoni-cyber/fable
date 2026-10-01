/* Wendy Realtor: shared helpers for the property cards and pages.
   Reads window.LISTINGS (js/listings.js) and the strings in js/i18n.js. */
(function () {
  'use strict';

  var Site = window.Site;
  var t = Site.t;
  var LISTINGS = window.LISTINGS || [];
  var NEW_BUILD_YEAR = 2025;

  var ICONS = {
    bed: '<path d="M3 18v-6.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V18M3 15h18M6 10V7.5A1.5 1.5 0 0 1 7.5 6h3A1.5 1.5 0 0 1 12 7.5V10M12 10V7.5A1.5 1.5 0 0 1 13.5 6h3A1.5 1.5 0 0 1 18 7.5V10M3 18v2M21 18v2"/>',
    bath: '<path d="M3 12h18v1.5A5.5 5.5 0 0 1 15.5 19h-7A5.5 5.5 0 0 1 3 13.5V12zM5.5 12V6.5a2.5 2.5 0 0 1 4.6-1.4M8 19l-1 2M16 19l1 2"/>',
    area: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    lot: '<path d="M12 21v-5M7.5 16h9L12 3 7.5 16z"/>',
    water: '<path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M12 3l-3 5h6z"/>',
    year: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
    photo: '<path d="M3 8h4l1.6-2.5h6.8L17 8h4v11H3z"/><circle cx="12" cy="13.2" r="3.4"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    list: '<path d="M4 5h6v5H4zM4 14h6v5H4zM13 6.5h7M13 9h5M13 15.5h7M13 18h5"/>',
    share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function L(obj) { return obj[Site.lang] || obj.en; }
  function byId(id) { return LISTINGS.filter(function (l) { return l.id === id; })[0]; }
  function url(l) { return 'property.html?id=' + encodeURIComponent(l.id); }

  function compact(v) {
    return Site.money(v, { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
  function priceText(l) {
    if (l.status === 'private') return t('price.request');
    return l.op === 'rent' ? t('price.month', { price: Site.money(l.price) }) : Site.money(l.price);
  }
  function perSf(l) {
    if (l.op === 'rent' || l.status === 'private') return '';
    return Site.money(Math.round(l.price / l.sqft)) + ' / ' + t('u.sf');
  }
  function waterText(l, withFrontage) {
    if (l.water === 'none') return '';
    var label = t('water.' + l.water);
    return withFrontage && l.frontage ? label + ' · ' + Site.number(l.frontage) + ' ' + t('u.ft') : label;
  }
  function areaName(area) { return t('area.' + area); }
  function typeName(type) { return t('type.' + type); }
  function isNewBuild(l) { return l.year >= NEW_BUILD_YEAR; }
  function statusText(l) { return t('status.' + l.status); }

  function badges(l) {
    return '<span class="badge badge--' + l.status + '">' + esc(statusText(l)) + '</span>' +
      (l.exclusive ? '<span class="badge badge--exclusive">' + esc(t('badge.exclusive')) + '</span>' : '');
  }

  function facts(l) {
    var out = [
      [icon('bed'), l.beds, t('u.bd')],
      [icon('bath'), Site.number(l.baths), t('u.ba')],
      [icon('area'), Site.number(l.sqft), t('u.sf')]
    ];
    return out.map(function (f) { return '<li>' + f[0] + '<span><b>' + esc(f[1]) + '</b> ' + esc(f[2]) + '</span></li>'; }).join('');
  }

  /* One property card. Used on the home page, the properties page and "similar properties". */
  function card(l) {
    var water = waterText(l, false);
    return (
      '<article class="pcard pcard--' + l.status + '">' +
        '<a class="pcard__link" href="' + url(l) + '">' +
          '<div class="pcard__media media">' +
            '<img class="media__img" src="' + l.imgs[0] + '" width="1200" height="900" alt="' + esc(t('listing.imgAlt', { name: L(l.title) })) + '" loading="lazy" decoding="async">' +
            '<div class="pcard__badges">' + badges(l) + '</div>' +
            (l.status !== 'private' && l.imgs.length > 1 ? '<span class="pcard__photos">' + icon('photo') + l.imgs.length + '</span>' : '') +
          '</div>' +
          '<div class="pcard__body">' +
            '<p class="pcard__meta"><span>' + esc(l.place) + '</span><span class="pcard__ref">' + esc(t('ref.short', { ref: l.ref })) + '</span></p>' +
            '<h3 class="pcard__title">' + esc(L(l.title)) + '</h3>' +
            '<p class="pcard__desc">' + esc(L(l.desc)) + '</p>' +
            '<ul class="pcard__facts">' + facts(l) + '</ul>' +
            '<div class="pcard__foot">' +
              '<p class="pcard__price">' + esc(priceText(l)) + '</p>' +
              (water ? '<p class="pcard__water">' + icon('water') + esc(water) + '</p>' : '') +
            '</div>' +
          '</div>' +
        '</a>' +
      '</article>'
    );
  }

  /* Sold homes always go last; within each group the chosen order applies. */
  var ORDERS = {
    newest: function (a, b) { return a.listed < b.listed ? 1 : a.listed > b.listed ? -1 : 0; },
    'price-desc': function (a, b) { return b.price - a.price; },
    'price-asc': function (a, b) { return a.price - b.price; },
    size: function (a, b) { return b.sqft - a.sqft; }
  };
  function sort(list, order) {
    var cmp = ORDERS[order] || ORDERS.newest;
    return list.slice().sort(function (a, b) {
      var sa = a.status === 'sold' ? 1 : 0, sb = b.status === 'sold' ? 1 : 0;
      return sa - sb || cmp(a, b);
    });
  }

  window.Catalog = {
    all: LISTINGS,
    byId: byId,
    url: url,
    esc: esc,
    L: L,
    icon: icon,
    compact: compact,
    priceText: priceText,
    perSf: perSf,
    waterText: waterText,
    areaName: areaName,
    typeName: typeName,
    statusText: statusText,
    isNewBuild: isNewBuild,
    badges: badges,
    card: card,
    sort: sort,
    AREAS: ['miami-beach', 'key-biscayne', 'coral-gables', 'coconut-grove', 'pinecrest', 'north-beaches', 'brickell'],
    TYPES: ['house', 'condo', 'penthouse']
  };
})();
