/* Wendy Realtor: the properties page. Filters, sorting, grid or list view and pages.
   The search lives in the address (properties.html?op=sale&area=brickell…) so a search can be shared. */
(function () {
  'use strict';

  var Site = window.Site;
  var C = window.Catalog;
  var t = Site.t;
  var PER_PAGE = 9;
  var PRICES = {
    sale: { min: [5e6, 7.5e6, 10e6, 15e6, 20e6], max: [7.5e6, 10e6, 15e6, 20e6, 30e6] },
    rent: { min: [20000, 30000, 50000, 75000, 100000], max: [30000, 50000, 75000, 100000, 150000] }
  };
  var DEFAULTS = { op: 'sale', ref: '', types: [], area: '', min: '', max: '', beds: '0', baths: '0', size: '0', water: '', excl: false, nb: false, sold: false, sort: 'newest', page: 1 };

  var form = document.getElementById('filter-form');
  var grid = document.getElementById('r-grid');
  var countEl = document.getElementById('r-count');
  var chipsEl = document.getElementById('r-chips');
  var emptyEl = document.getElementById('r-empty');
  var pagerEl = document.getElementById('r-pager');
  var sortEl = document.getElementById('r-sort');
  var minEl = document.getElementById('f-min');
  var maxEl = document.getElementById('f-max');
  var applyBtn = document.getElementById('f-apply');
  var filterN = document.getElementById('filter-n');
  var panel = document.getElementById('filters');
  var openBtn = document.getElementById('open-filters');
  var scrim = document.querySelector('.filters-scrim');
  var results = document.getElementById('results');

  var state = Object.assign({}, DEFAULTS, { types: [] });

  /* ---------------------------------------------------------------- address <-> state */
  function readURL() {
    var q = new URLSearchParams(window.location.search);
    var s = Object.assign({}, DEFAULTS, { types: [] });
    if (q.get('op') === 'rent') s.op = 'rent';
    s.ref = (q.get('ref') || '').slice(0, 20);
    s.types = (q.get('type') || '').split(',').filter(function (v) { return C.TYPES.indexOf(v) > -1; });
    if (C.AREAS.indexOf(q.get('area')) > -1) s.area = q.get('area');
    ['min', 'max'].forEach(function (k) { if (/^\d+$/.test(q.get(k) || '')) s[k] = q.get(k); });
    ['beds', 'baths', 'size'].forEach(function (k) { if (/^\d+$/.test(q.get(k) || '')) s[k] = q.get(k); });
    if (['any', 'ocean', 'bay', 'canal'].indexOf(q.get('water')) > -1) s.water = q.get('water');
    s.excl = q.get('excl') === '1';
    s.nb = q.get('new') === '1';
    s.sold = q.get('sold') === '1';
    if (['newest', 'price-desc', 'price-asc', 'size'].indexOf(q.get('sort')) > -1) s.sort = q.get('sort');
    s.page = Math.max(1, parseInt(q.get('page'), 10) || 1);
    return s;
  }

  function writeURL() {
    var q = new URLSearchParams();
    if (state.op !== 'sale') q.set('op', state.op);
    if (state.ref) q.set('ref', state.ref);
    if (state.types.length) q.set('type', state.types.join(','));
    ['area', 'min', 'max', 'water'].forEach(function (k) { if (state[k]) q.set(k, state[k]); });
    ['beds', 'baths', 'size'].forEach(function (k) { if (state[k] !== '0') q.set(k, state[k]); });
    if (state.excl) q.set('excl', '1');
    if (state.nb) q.set('new', '1');
    if (state.sold) q.set('sold', '1');
    if (state.sort !== 'newest') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', String(state.page));
    var lang = new URLSearchParams(window.location.search).get('lang');
    if (lang) q.set('lang', lang);
    var s = q.toString();
    try { window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : '')); } catch (e) { /* file:// in some browsers */ }
  }

  /* ---------------------------------------------------------------- form <-> state */
  function priceOptions() {
    var p = PRICES[state.op];
    minEl.innerHTML = '<option value="">' + C.esc(t('f.minAny')) + '</option>' +
      p.min.map(function (v) { return '<option value="' + v + '">' + C.esc(t('f.from', { price: C.compact(v) })) + '</option>'; }).join('');
    maxEl.innerHTML = '<option value="">' + C.esc(t('f.maxAny')) + '</option>' +
      p.max.map(function (v) { return '<option value="' + v + '">' + C.esc(t('f.upTo', { price: C.compact(v) })) + '</option>'; }).join('');
    if (p.min.indexOf(+state.min) < 0) state.min = '';
    if (p.max.indexOf(+state.max) < 0) state.max = '';
  }

  function syncForm() {
    form.elements.ref.value = state.ref;
    form.querySelectorAll('[name="type"]').forEach(function (c) { c.checked = state.types.indexOf(c.value) > -1; });
    form.elements.area.value = state.area;
    minEl.value = state.min;
    maxEl.value = state.max;
    form.querySelectorAll('[name="beds"]').forEach(function (r) { r.checked = r.value === state.beds; });
    form.querySelectorAll('[name="baths"]').forEach(function (r) { r.checked = r.value === state.baths; });
    if (!form.querySelector('[name="beds"]:checked')) { state.beds = '0'; form.querySelector('[name="beds"][value="0"]').checked = true; }
    if (!form.querySelector('[name="baths"]:checked')) { state.baths = '0'; form.querySelector('[name="baths"][value="0"]').checked = true; }
    form.elements.size.value = state.size;
    if (form.elements.size.value !== state.size) { state.size = '0'; form.elements.size.value = '0'; }
    form.elements.water.value = state.water;
    form.elements.excl.checked = state.excl;
    form.elements['new'].checked = state.nb;
    form.elements.sold.checked = state.sold;
    sortEl.value = state.sort;
    document.querySelectorAll('[data-op]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-op') === state.op)); });
    document.getElementById('f-sold-wrap').hidden = state.op === 'rent';
  }

  function readForm() {
    state.ref = form.elements.ref.value.trim();
    state.types = Array.prototype.slice.call(form.querySelectorAll('[name="type"]:checked')).map(function (c) { return c.value; });
    state.area = form.elements.area.value;
    state.min = minEl.value;
    state.max = maxEl.value;
    state.beds = (form.querySelector('[name="beds"]:checked') || { value: '0' }).value;
    state.baths = (form.querySelector('[name="baths"]:checked') || { value: '0' }).value;
    state.size = form.elements.size.value;
    state.water = form.elements.water.value;
    state.excl = form.elements.excl.checked;
    state.nb = form.elements['new'].checked;
    state.sold = form.elements.sold.checked;
  }

  /* ---------------------------------------------------------------- matching */
  function norm(s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function matches(l) {
    if (l.op !== state.op) return false;
    if (state.ref && norm(l.ref).indexOf(norm(state.ref)) < 0) return false;
    if (state.types.length && state.types.indexOf(l.type) < 0) return false;
    if (state.area && l.area !== state.area) return false;
    if (state.min && l.price < +state.min) return false;
    if (state.max && l.price > +state.max) return false;
    if (l.beds < +state.beds) return false;
    if (l.baths < +state.baths) return false;
    if (l.sqft < +state.size) return false;
    if (state.water === 'any' && l.water === 'none') return false;
    if (state.water && state.water !== 'any' && l.water !== state.water) return false;
    if (state.excl && !l.exclusive) return false;
    if (state.nb && !C.isNewBuild(l)) return false;
    if (!state.sold && l.status === 'sold') return false;
    return true;
  }

  /* ---------------------------------------------------------------- active filters as chips */
  function activeChips() {
    var out = [];
    if (state.ref) out.push(['ref', t('chip.ref', { ref: state.ref })]);
    state.types.forEach(function (v) { out.push(['type:' + v, t('types.' + v)]); });
    if (state.area) out.push(['area', C.areaName(state.area)]);
    if (state.min) out.push(['min', t('f.from', { price: C.compact(+state.min) })]);
    if (state.max) out.push(['max', t('f.upTo', { price: C.compact(+state.max) })]);
    if (state.beds !== '0') out.push(['beds', t('chip.beds', { n: state.beds })]);
    if (state.baths !== '0') out.push(['baths', t('chip.baths', { n: state.baths })]);
    if (state.size !== '0') out.push(['size', t('chip.size', { n: Site.number(+state.size) })]);
    if (state.water) out.push(['water', state.water === 'any' ? t('chip.waterAny') : t('water.' + state.water)]);
    if (state.excl) out.push(['excl', t('chip.excl')]);
    if (state.nb) out.push(['nb', t('chip.new')]);
    if (state.sold && state.op === 'sale') out.push(['sold', t('chip.sold')]);
    return out;
  }

  function removeChip(key) {
    var parts = key.split(':');
    if (parts[0] === 'type') state.types = state.types.filter(function (v) { return v !== parts[1]; });
    else if (parts[0] === 'beds' || parts[0] === 'baths' || parts[0] === 'size') state[parts[0]] = '0';
    else if (parts[0] === 'excl' || parts[0] === 'nb' || parts[0] === 'sold') state[parts[0]] = false;
    else state[parts[0]] = '';
    state.page = 1;
    syncForm();
    render();
  }

  function clearAll() {
    state = Object.assign({}, DEFAULTS, { types: [], op: state.op, sort: state.sort });
    syncForm();
    render();
  }

  /* ---------------------------------------------------------------- render */
  function countText(n) {
    var key = 'r.count.' + state.op + (state.op === 'sale' && state.sold ? 'Sold' : n === 1 ? 'One' : '');
    return t(key, { n: Site.number(n) });
  }

  function pagerHTML(pages) {
    if (pages < 2) return '';
    var h = '<button class="pager__step" type="button" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + '>' + C.esc(t('pager.prev')) + '</button><ol class="pager__list">';
    for (var i = 1; i <= pages; i++) {
      h += '<li><button type="button" data-page="' + i + '" aria-label="' + C.esc(t('pager.page', { n: i })) + '"' + (i === state.page ? ' aria-current="page"' : '') + '>' + i + '</button></li>';
    }
    return h + '</ol><button class="pager__step" type="button" data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + '>' + C.esc(t('pager.next')) + '</button>';
  }

  function render() {
    var inOp = C.all.filter(function (l) { return l.op === state.op && l.status !== 'sold'; });
    var list = C.sort(C.all.filter(matches), state.sort);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    var from = (state.page - 1) * PER_PAGE;
    var shown = list.slice(from, from + PER_PAGE);

    grid.innerHTML = shown.map(C.card).join('');
    emptyEl.hidden = list.length > 0;
    pagerEl.innerHTML = pagerHTML(pages);

    var count = countText(list.length);
    countEl.innerHTML = '<strong>' + C.esc(count) + '</strong>' +
      (pages > 1 ? '<span>' + C.esc(t('r.range', { from: from + 1, to: from + shown.length })) + '</span>' : '');

    var chips = activeChips();
    chipsEl.innerHTML = chips.map(function (c) {
      return '<button class="chip" type="button" data-chip="' + C.esc(c[0]) + '" aria-label="' + C.esc(t('chip.remove', { label: c[1] })) + '">' + C.esc(c[1]) + '<span aria-hidden="true">×</span></button>';
    }).join('') + (chips.length > 1 ? '<button class="chip chip--clear" type="button" data-chip-clear>' + C.esc(t('f.clearShort')) + '</button>' : '');
    chipsEl.hidden = chips.length === 0;

    filterN.hidden = chips.length === 0;
    filterN.textContent = String(chips.length);
    applyBtn.textContent = list.length ? t(list.length === 1 ? 'f.applyOne' : 'f.apply', { n: list.length }) : t('f.applyNone');

    document.querySelectorAll('[data-op-count]').forEach(function (el) {
      var op = el.getAttribute('data-op-count');
      el.textContent = String(C.all.filter(function (l) { return l.op === op && l.status !== 'sold'; }).length);
    });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var k = el.getAttribute('data-count').split(':');
      el.textContent = String(inOp.filter(function (l) {
        return k[0] === 'type' ? l.type === k[1] : k[0] === 'excl' ? l.exclusive : C.isNewBuild(l);
      }).length);
    });
    document.querySelectorAll('[data-area-link]').forEach(function (a) {
      var area = a.getAttribute('data-area-link');
      var sale = C.all.filter(function (l) { return l.area === area && l.op === 'sale' && l.status !== 'sold'; }).length;
      var rent = C.all.filter(function (l) { return l.area === area && l.op === 'rent'; }).length;
      var parts = [];
      if (sale) parts.push(t('areas.sale', { n: sale }));
      if (rent) parts.push(t('areas.rent', { n: rent }));
      a.querySelector('small').textContent = parts.length ? parts.join(' · ') : t('areas.none');
      a.setAttribute('href', 'properties.html?' + (sale || !rent ? '' : 'op=rent&') + 'area=' + area);
    });

    writeURL();
  }

  /* ---------------------------------------------------------------- events */
  function onFilterChange() { readForm(); state.page = 1; render(); }
  form.addEventListener('change', onFilterChange);
  form.elements.ref.addEventListener('input', onFilterChange);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // A complete reference goes straight to the property.
    var q = norm(form.elements.ref.value);
    var hit = q && C.all.filter(function (l) { return norm(l.ref) === q || norm(l.ref) === 'WR' + q; });
    if (hit && hit.length === 1) { window.location.href = C.url(hit[0]); return; }
    closePanel();
  });

  document.querySelectorAll('[data-op]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (state.op === b.getAttribute('data-op')) return;
      state.op = b.getAttribute('data-op');
      state.page = 1;
      priceOptions();
      syncForm();
      render();
    });
  });

  sortEl.addEventListener('change', function () { state.sort = sortEl.value; state.page = 1; render(); });

  chipsEl.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-chip]');
    if (chip) removeChip(chip.getAttribute('data-chip'));
    else if (e.target.closest('[data-chip-clear]')) clearAll();
  });
  document.getElementById('f-clear').addEventListener('click', clearAll);
  document.getElementById('r-empty-clear').addEventListener('click', clearAll);

  pagerEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = +b.getAttribute('data-page');
    render();
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* grid or list, remembered on this device */
  var views = document.querySelectorAll('[data-view]');
  function setView(v) {
    grid.classList.toggle('pgrid--list', v === 'list');
    views.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
  }
  views.forEach(function (b) {
    b.addEventListener('click', function () {
      setView(b.getAttribute('data-view'));
      try { window.localStorage.setItem('wr-view', b.getAttribute('data-view')); } catch (e) { /* storage unavailable */ }
    });
  });
  try { if (window.localStorage.getItem('wr-view') === 'list') setView('list'); } catch (e) { /* storage unavailable */ }

  /* filters as a panel on small screens */
  function openPanel() {
    document.body.classList.add('filters-open');
    scrim.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    panel.querySelector('.filters__close').focus();
  }
  function closePanel() {
    if (!document.body.classList.contains('filters-open')) return;
    document.body.classList.remove('filters-open');
    scrim.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', openPanel);
  document.querySelectorAll('[data-close-filters]').forEach(function (el) { el.addEventListener('click', closePanel); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 960) closePanel(); });

  /* ---------------------------------------------------------------- start */
  state = readURL();
  var requestedPage = state.page;
  priceOptions();
  syncForm();
  state.page = requestedPage;
  render();

  Site.onLang(function () { priceOptions(); syncForm(); render(); });
})();
