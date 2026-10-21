/* Home page: the search box, featured properties, neighborhood links, the map and the service tabs.
   The properties come from data/listings.json, edited in the admin panel (/admin/). */
window.Listings.ready(function () {
  'use strict';

  var Site = window.Site;
  var C = window.Catalog;
  var t = Site.t;
  var FEATURED = 8;

  /* ---------------------------------------------------------------- featured properties */
  var grid = document.getElementById('featured-grid');
  function available(l) { return l.status !== 'sold'; }

  function renderFeatured() {
    // Mostly homes for sale, plus the two newest rentals.
    // The ones marked "Destacar arriba en la portada" in the panel come first.
    var sale = C.sort(C.all.filter(function (l) { return l.op === 'sale' && available(l); }), 'newest');
    sale = sale.filter(function (l) { return l.featured; }).concat(sale.filter(function (l) { return !l.featured; }));
    var rent = C.sort(C.all.filter(function (l) { return l.op === 'rent'; }), 'newest').slice(0, 2);
    var list = sale.slice(0, FEATURED - rent.length).concat(rent);
    grid.innerHTML = list.map(C.card).join('');
    document.getElementById('all-props').textContent = t('listings.allN', { n: C.all.length });

    var counts = {
      sale: C.all.filter(function (l) { return l.op === 'sale' && available(l); }).length,
      rent: C.all.filter(function (l) { return l.op === 'rent'; }).length,
      'new': C.all.filter(function (l) { return l.op === 'sale' && C.isNewBuild(l); }).length,
      water: C.all.filter(function (l) { return l.op === 'sale' && l.water !== 'none' && available(l); }).length,
      excl: C.all.filter(function (l) { return l.op === 'sale' && l.exclusive && available(l); }).length
    };
    document.querySelectorAll('[data-quick]').forEach(function (el) { el.textContent = String(counts[el.getAttribute('data-quick')]); });
  }

  /* ---------------------------------------------------------------- neighborhoods */
  function renderHoods() {
    document.querySelectorAll('.hood').forEach(function (hood) {
      var area = hood.getAttribute('data-area');
      var sale = C.all.filter(function (l) { return l.area === area && l.op === 'sale' && available(l); }).length;
      var rent = C.all.filter(function (l) { return l.area === area && l.op === 'rent'; }).length;
      var btn = hood.querySelector('.hood__btn');
      if (sale) {
        btn.textContent = t(sale === 1 ? 'hoods.seeOne' : 'hoods.see', { n: sale });
        btn.href = 'properties.html?area=' + area;
      } else if (rent) {
        btn.textContent = t(rent === 1 ? 'hoods.rentOne' : 'hoods.rent', { n: rent });
        btn.href = 'properties.html?op=rent&area=' + area;
      } else {
        btn.textContent = t('hoods.ask');
        btn.href = '#contact';
        btn.onclick = function () {
          document.getElementById('c-msg').value = t('hoods.askMsg', { area: hood.querySelector('h3').textContent });
        };
      }
    });
  }

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

  /* ---------------------------------------------------------------- search box */
  var search = document.getElementById('hero-search');
  var maxSel = document.getElementById('s-max');
  // Price steps: totals for homes for sale, per month for rentals.
  var STEPS = { sale: [500000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000], rent: [3000, 5000, 8000, 12000, 20000, 40000] };
  function money(v) { return '$' + (v >= 1e6 ? Site.number(v / 1e6) + 'M' : Site.number(v / 1e3) + 'k'); }
  function op() { var c = search.querySelector('input[name="op"]:checked'); return c ? c.value : 'sale'; }
  function fillMax() {
    var keep = maxSel.value;
    var steps = STEPS[op()];
    maxSel.innerHTML = '<option value="">' + t('search.anyPrice') + '</option>' + steps.map(function (v) {
      return '<option value="' + v + '">' + t(op() === 'rent' ? 'search.upToMonth' : 'search.upTo', { price: money(v) }) + '</option>';
    }).join('');
    if (steps.indexOf(+keep) > -1) maxSel.value = keep;
  }
  search.addEventListener('change', function (e) { if (e.target.name === 'op') fillMax(); });
  // Keep the address short: leave out the defaults.
  search.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = new URLSearchParams();
    new FormData(search).forEach(function (v, k) {
      if (!v || (k === 'op' && v === 'sale') || (k === 'beds' && v === '0')) return;
      q.set(k, v);
    });
    var s = q.toString();
    window.location.href = 'properties.html' + (s ? '?' + s : '');
  });

  /* ---------------------------------------------------------------- map */
  if (window.SiteMap) window.SiteMap.home(document.getElementById('home-map'), C.all.filter(available));

  /* ---------------------------------------------------------------- language */
  Site.onLang(function () { fillMax(); renderFeatured(); renderHoods(); });
  fillMax();
  renderFeatured();
  renderHoods();
});
