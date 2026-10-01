/* Wendy Realtor home page: featured properties, neighborhood links and service tabs.
   The properties themselves are in js/listings.js. */
(function () {
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
    var sale = C.sort(C.all.filter(function (l) { return l.op === 'sale' && available(l); }), 'newest');
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

  /* ---------------------------------------------------------------- hero search: keep the address short */
  var search = document.getElementById('hero-search');
  search.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = new URLSearchParams();
    Array.prototype.forEach.call(search.elements, function (el) {
      if (!el.name || !el.value || (el.name === 'op' && el.value === 'sale') || (el.name === 'beds' && el.value === '0')) return;
      q.set(el.name, el.value);
    });
    var s = q.toString();
    window.location.href = 'properties.html' + (s ? '?' + s : '');
  });

  /* ---------------------------------------------------------------- language */
  Site.onLang(function () { renderFeatured(); renderHoods(); });
  renderFeatured();
  renderHoods();
})();
