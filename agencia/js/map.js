/* Maps: every property on the home page, the results of a search on the properties page, and one property
   on its own page. Uses Leaflet (loaded only when a map is about to be seen) and OpenStreetMap tiles.
   The points come from the admin panel: each property's "Ubicación en el mapa", or its neighborhood's. */
window.SiteMap = (function () {
  'use strict';

  var Site = window.Site;
  var C = window.Catalog;
  var t = Site.t;
  var LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  // To use another map style or provider, change these two lines (keep the attribution it asks for).
  var TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  // Opened straight from a folder (file://), the browser sends no Referer and OpenStreetMap answers
  // every tile with "403 Access blocked" (CARTO asks for an API key). There, use Esri's street map.
  if (location.protocol === 'file:') {
    TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';
  }
  var FLORIDA = [25.9, -80.25];

  // The coastline drawn under the street map (js/map-land.js): it is what shows when the street map
  // cannot load, for example in a preview that blocks outside images. Missing, the map works without it.
  function loadLand() {
    if (window.MAP_LAND) return Promise.resolve();
    return new Promise(function (done) {
      var s = document.createElement('script');
      s.src = 'js/map-land.js';
      s.onload = s.onerror = function () { done(); };
      document.head.appendChild(s);
    });
  }

  var loading = null;
  function load() {
    if (window.L) return loadLand().then(function () { return window.L; });
    if (!loading) {
      loading = new Promise(function (resolve, reject) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET + 'leaflet.css';
        document.head.appendChild(css);
        var js = document.createElement('script');
        js.src = LEAFLET + 'leaflet.js';
        js.onload = function () { if (window.L) loadLand().then(function () { resolve(window.L); }); else reject(new Error('Leaflet')); };
        js.onerror = function () { loading = null; reject(new Error('Leaflet')); };
        document.head.appendChild(js);
      });
    }
    return loading;
  }

  // Start a map only when it is about to scroll into view.
  function whenVisible(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: '300px' });
    io.observe(el);
  }

  function failed(el) {
    el.innerHTML = '<p class="homemap__wait">' + C.esc(t('map.error')) + '</p>';
  }

  /* ---------------------------------------------------------------- markers */
  function shortPrice(l) {
    if (l.status === 'private' || !l.price) return t('map.ask');
    var v = l.price;
    var s = v >= 1e6 ? Site.number(Math.round(v / 1e5) / 10) + 'M' : Site.number(Math.round(v / 1e3)) + 'k';
    return '$' + s + (l.op === 'rent' ? t('map.perMonth') : '');
  }
  function pin(L, l) {
    return L.divIcon({
      className: 'mpin' + (l.status === 'sold' ? ' mpin--sold' : '') + (l.op === 'rent' ? ' mpin--rent' : ''),
      html: '<span class="mpin__tag">' + C.esc(shortPrice(l)) + '</span>',
      iconSize: null, iconAnchor: [0, 0], popupAnchor: [0, -34]
    });
  }
  function popup(l) {
    var facts = [l.beds && l.beds + ' ' + t('u.bd'), l.baths && Site.number(l.baths) + ' ' + t('u.ba'), l.sqft && Site.number(l.sqft) + ' ' + t('u.sf')].filter(Boolean).join(' · ');
    return '<a class="mpop" href="' + C.esc(C.url(l)) + '">' +
      '<img class="mpop__img" src="' + C.esc(l.imgs[0]) + '" alt="" loading="lazy">' +
      '<span class="mpop__body"><strong class="mpop__price">' + C.esc(C.priceText(l)) + '</strong>' +
      '<span class="mpop__title">' + C.esc(C.L(l.title)) + '</span>' +
      '<span class="mpop__facts">' + C.esc(facts) + '</span>' +
      '<span class="mpop__place">' + C.esc(l.place || '') + (l.geo.approx ? ' · ' + C.esc(t('map.approx')) : '') + '</span></span></a>';
  }

  function create(L, el, opts) {
    el.innerHTML = '';
    var map = L.map(el, Object.assign({ scrollWheelZoom: false, zoomControl: true, attributionControl: true }, opts || {}));
    if (window.MAP_LAND) {
      el.classList.add('has-land');
      map.createPane('land').style.zIndex = 150;
      map.createPane('names').style.zIndex = 450;
      // Added once the map has a view (Leaflet cannot draw shapes before).
      map.whenReady(function () {
        L.geoJSON(window.MAP_LAND, { pane: 'land', interactive: false, style: { color: '#c9b99a', weight: 1, fillColor: '#f3eee4', fillOpacity: 1 } }).addTo(map);
      });
      if (TILES.indexOf('openstreetmap') < 0) map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    }
    var tiles = L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    // No street map (blocked or offline): only the coastline shows, with the neighborhood names.
    var errors = 0;
    tiles.on('tileerror', function () { if (++errors === 3) { el.classList.add('no-tiles'); declutter(el); } });
    // Zoom with the wheel only after the map has been clicked, so the page still scrolls.
    map.on('click focus', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout blur', function () { map.scrollWheelZoom.disable(); });
    // Zoomed out, prices would overlap: show dots and let the prices appear when zooming in.
    function far() { el.classList.toggle('is-far', map.getZoom() < 12); }
    map.on('zoomend', far);
    map.whenReady(far);
    return map;
  }

  function fit(L, map, list) {
    var pts = list.filter(function (l) { return l.geo; }).map(function (l) { return [l.geo.lat, l.geo.lng]; });
    if (!pts.length) map.setView(FLORIDA, 9);
    else if (pts.length === 1) map.setView(pts[0], 14);
    else map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 14 });
  }

  // Neighborhood names, at the middle of their homes. Shown only when the street map is missing (CSS: .no-tiles).
  function labels(L, map, layer, list) {
    if (!map.getPane('names')) return;
    var areas = {};
    list.filter(function (l) { return l.geo && l.area; }).forEach(function (l) {
      var a = areas[l.area] || (areas[l.area] = { lat: 0, lng: 0, n: 0 });
      a.lat += l.geo.lat; a.lng += l.geo.lng; a.n++;
    });
    Object.keys(areas).sort(function (x, y) { return areas[y].n - areas[x].n; }).forEach(function (id) {
      var a = areas[id];
      L.marker([a.lat / a.n, a.lng / a.n], {
        icon: L.divIcon({ className: 'mlabel', html: '<span>' + C.esc(t('area.' + id)) + '</span>', iconSize: null, iconAnchor: [0, 0] }),
        interactive: false, keyboard: false, pane: 'names'
      }).addTo(layer);
    });
  }
  // Hide the names that would overlap one already shown (the busiest neighborhoods come first).
  function declutter(el) {
    var kept = [], box = el.getBoundingClientRect();
    Array.prototype.forEach.call(el.querySelectorAll('.mlabel span'), function (s) {
      s.style.visibility = '';
      var r = s.getBoundingClientRect();
      var hit = r.left < box.left + 4 || r.right > box.right - 4 || kept.some(function (k) { return r.left < k.right + 6 && r.right > k.left - 6 && r.top < k.bottom + 2 && r.bottom > k.top - 2; });
      if (hit) s.style.visibility = 'hidden'; else kept.push(r);
    });
  }

  // A map with one marker per property; returns a function that draws a new list.
  function many(el, first) {
    var state = { map: null, layer: null, list: first || [], L: null };
    function draw(refit) {
      if (!state.map) return;
      state.layer.clearLayers();
      labels(state.L, state.map, state.layer, state.list);
      state.list.filter(function (l) { return l.geo; }).forEach(function (l) {
        state.L.marker([l.geo.lat, l.geo.lng], { icon: pin(state.L, l), title: C.L(l.title), alt: C.L(l.title), riseOnHover: true })
          .bindPopup(popup(l), { maxWidth: 280, minWidth: 240, className: 'mpop-wrap' })
          .addTo(state.layer);
      });
      if (refit) fit(state.L, state.map, state.list);
      declutter(el);
    }
    function start() {
      load().then(function (L) {
        state.L = L;
        state.map = create(L, el);
        state.layer = L.layerGroup().addTo(state.map);
        state.map.on('zoomend', function () { declutter(el); });
        draw(true);
        Site.onLang(function () { draw(false); });
      }).catch(function () { failed(el); });
    }
    return {
      start: start,
      update: function (list) { state.list = list; draw(true); },
      resize: function () { if (state.map) state.map.invalidateSize(); }
    };
  }

  return {
    load: load,

    // Home page: every property that can be shown.
    home: function (el, list) {
      if (!el) return;
      var m = many(el, list);
      whenVisible(el, m.start);
    },

    // Properties page: the results of the current search. Call update(list) after each change.
    results: function (el) {
      var m = many(el, []);
      var started = false;
      return {
        show: function (list) {
          if (!started) { started = true; m.update(list); m.start(); }
          else { m.resize(); m.update(list); }
        },
        update: function (list) { if (started) m.update(list); }
      };
    },

    // One property: its marker, or a circle around the neighborhood when the point is approximate.
    single: function (el, l) {
      if (!el || !l.geo) return false;
      whenVisible(el, function () {
        load().then(function (L) {
          var map = create(L, el, { zoomControl: true });
          var at = [l.geo.lat, l.geo.lng];
          if (l.geo.approx) {
            L.circle(at, { radius: 600, color: '#9c7f4a', weight: 1.5, fillColor: '#c9ad78', fillOpacity: 0.25 }).addTo(map);
            map.setView(at, 13);
          } else {
            L.marker(at, { icon: pin(L, l), title: C.L(l.title), alt: C.L(l.title) }).addTo(map);
            map.setView(at, 15);
          }
        }).catch(function () { failed(el); });
      });
      return true;
    }
  };
})();
