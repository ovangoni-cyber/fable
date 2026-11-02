/* Home page: the service tabs, and the "tell us" buttons that open the contact form with their option chosen.
   While the properties are out (data/web/pagina-propiedades.json → "publicada": false) the home page has no
   search box, featured properties or map; the version with them is in git history (before this file changed). */
(function () {
  'use strict';

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

  /* ---------------------------------------------------------------- "tell us" buttons */
  var interest = document.getElementById('c-interest');
  document.querySelectorAll('[data-interest]').forEach(function (a) {
    a.addEventListener('click', function () { if (interest) interest.value = a.getAttribute('data-interest'); });
  });
})();
