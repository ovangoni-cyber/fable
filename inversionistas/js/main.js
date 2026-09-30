/* Arcova Capital: distribution waterfall calculator.
   Terms match the sample term sheet: 8% simple annual preferred return, then a
   70/30 split of remaining profit between investors and the sponsor. */
(function () {
  'use strict';

  var Site = window.Site;
  var t = Site.t;
  var PREF = 0.08;
  var INVESTOR_SPLIT = 0.7;

  var amount = document.getElementById('r-amount');
  var hold = document.getElementById('r-hold');
  var mult = document.getElementById('r-mult');
  if (!amount) return;

  function waterfall(capital, months, multiple) {
    var gross = capital * multiple;
    var profit = gross - capital;
    if (profit <= 0) {
      return { capital: gross, pref: 0, split: 0, promote: 0, loss: capital - gross, total: gross, gross: gross };
    }
    var prefDue = capital * PREF * (months / 12);
    var pref = Math.min(profit, prefDue);
    var rest = profit - pref;
    var split = rest * INVESTOR_SPLIT;
    return { capital: capital, pref: pref, split: split, promote: rest - split, loss: 0, total: capital + pref + split, gross: gross };
  }

  function pct(x) { return Site.number(x * 100, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).replace('-', '−') + '%'; }
  function money(x) { return Site.money(Math.round(x)); }

  function paint(el, value) { if (el.textContent !== value) el.textContent = value; }

  function update() {
    var c = +amount.value, m = +hold.value, x = +mult.value;
    var r = waterfall(c, m, x);
    var multiple = r.total / c;
    var annual = Math.pow(multiple, 12 / m) - 1;

    paint(document.getElementById('o-amount'), money(c));
    paint(document.getElementById('o-hold'), t('calc.months', { n: m }));
    paint(document.getElementById('o-mult'), Site.number(x, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×');

    paint(document.getElementById('k-total'), money(r.total));
    var kp = document.getElementById('k-profit');
    paint(kp, (r.total - c < 0 ? '−' : '') + money(Math.abs(r.total - c)));
    kp.classList.toggle('is-neg', r.total < c);
    paint(document.getElementById('k-multiple'), Site.number(multiple, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×');
    var ki = document.getElementById('k-irr');
    paint(ki, pct(annual));
    ki.classList.toggle('is-neg', annual < 0);

    // Bar: 100% = everything attributable to this investment (or the capital, in a loss).
    var scale = r.loss > 0 ? c : r.gross;
    var parts = [
      ['capital', r.capital, t('calc.wfCapital')],
      ['pref', r.pref, t('calc.wfPref')],
      ['split', r.split, t('calc.wfSplit')],
      ['promote', r.promote, t('calc.wfPromote')],
      ['loss', r.loss, t('calc.wfLoss')]
    ].filter(function (p) { return p[1] > 0.5; });

    document.getElementById('wf-bar').innerHTML = parts.map(function (p) {
      return '<span class="wf__seg wf__seg--' + p[0] + '" style="width:' + (p[1] / scale * 100).toFixed(3) + '%"></span>';
    }).join('');

    document.getElementById('wf-table').innerHTML =
      '<tbody>' + parts.map(function (p) {
        var who = p[0] === 'promote' ? t('calc.toSponsor') : (p[0] === 'loss' ? t('calc.lost') : t('calc.toYou'));
        return '<tr class="wf__row--' + p[0] + '"><th scope="row"><i class="wf__sw wf__seg--' + p[0] + '"></i>' + p[2] + '</th>' +
          '<td>' + who + '</td><td>' + money(p[1]) + '</td></tr>';
      }).join('') + '</tbody>';

    document.querySelectorAll('[data-mult]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Math.abs(+b.getAttribute('data-mult') - x) < 0.001));
    });
  }

  [amount, hold, mult].forEach(function (el) { el.addEventListener('input', update); });
  document.querySelectorAll('[data-mult]').forEach(function (b) {
    b.addEventListener('click', function () { mult.value = b.getAttribute('data-mult'); update(); });
  });
  document.getElementById('calc').addEventListener('submit', function (e) { e.preventDefault(); });

  Site.onLang(update);
  update();
})();
