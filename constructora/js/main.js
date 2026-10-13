/* American Restoration Services: home collections, before/after comparison,
   portfolio filter and form prefill. */
(function () {
  'use strict';

  var Site = window.Site;

  /* ---------------------------------------------------------------- collection tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#models [role="tab"]'));
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
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
    });
  });

  /* ---------------------------------------------------------------- before / after */
  document.querySelectorAll('[data-compare]').forEach(function (fig) {
    var range = fig.querySelector('.compare__range');
    var set = function () { fig.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', set);
    set();
  });

  /* ---------------------------------------------------------------- prefill the project form */
  var type = document.getElementById('f-type');
  var msg = document.getElementById('f-msg');
  var lot = document.getElementById('f-lot');
  function goToForm() {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('f-name').focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-model]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      type.value = 'model';
      msg.value = Site.t('model.msg', { model: btn.getAttribute('data-model'), line: Site.t('line.' + btn.getAttribute('data-line')) });
      goToForm();
    });
  });
  document.querySelectorAll('[data-restoration-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      type.value = 'restoration';
      lot.value = 'home';
      msg.value = Site.t('rest.msg');
      goToForm();
    });
  });

  /* ---------------------------------------------------------------- portfolio filter */
  var grid = document.querySelector('.projects');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.project'));
  var chips = document.querySelectorAll('[data-filter]');
  var empty = document.querySelector('.filter-empty');

  function matches(card, filter) { return filter === 'all' || card.getAttribute('data-cat') === filter; }

  chips.forEach(function (chip) {
    var filter = chip.getAttribute('data-filter');
    var count = cards.filter(function (c) { return matches(c, filter); }).length;
    chip.querySelector('.chip__count').textContent = String(count);
    if (!count) chip.hidden = true;

    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      cards.forEach(function (card) {
        var on = matches(card, filter);
        card.hidden = !on;
        if (on) shown += 1;
      });
      grid.classList.toggle('is-filtered', filter !== 'all');
      if (empty) empty.hidden = shown > 0;
    });
  });
})();
