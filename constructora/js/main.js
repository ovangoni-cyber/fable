/* American Restoration Services: portfolio filter. */
(function () {
  'use strict';

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
