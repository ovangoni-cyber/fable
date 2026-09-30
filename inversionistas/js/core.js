/* Shared site core: language switch (EN/ES), header, mobile menu, photos, forms.
   The same file is used by all three sites. English lives in the HTML; Spanish
   comes from js/i18n.js (window.I18N.es for the page, window.I18N.strings for scripts). */
(function () {
  'use strict';

  var root = document.documentElement;
  var I18N = window.I18N || {};
  var dict = I18N.es || {};
  var strings = I18N.strings || { en: {}, es: {} };
  var SUPPORTED = ['en', 'es'];
  var base = new Map();
  var listeners = [];
  var lang = 'en';

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } }

  function initialLang() {
    var q = null;
    try { q = new URLSearchParams(window.location.search).get('lang'); } catch (e) { /* ignore */ }
    if (SUPPORTED.indexOf(q) > -1) return q;
    var saved = read('site-lang');
    if (SUPPORTED.indexOf(saved) > -1) return saved;
    return (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function attrSpec(el) {
    var spec = el.getAttribute('data-i18n-attr');
    if (!spec) return [];
    return spec.split(',').map(function (pair) { return pair.split(':').map(function (s) { return s.trim(); }); });
  }

  function snapshot(el) {
    var rec = base.get(el);
    if (rec) return rec;
    rec = { html: el.hasAttribute('data-i18n') ? el.innerHTML : null, attrs: {} };
    attrSpec(el).forEach(function (p) { rec.attrs[p[0]] = el.getAttribute(p[0]); });
    base.set(el, rec);
    return rec;
  }

  var meta = {
    title: document.title,
    description: (document.querySelector('meta[name="description"]') || {}).content || ''
  };

  function apply(scope) {
    (scope || document).querySelectorAll('[data-i18n],[data-i18n-attr]').forEach(function (el) {
      var rec = snapshot(el);
      if (rec.html !== null) {
        var key = el.getAttribute('data-i18n');
        var html = lang === 'es' && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : rec.html;
        if (el.innerHTML !== html) el.innerHTML = html;
      }
      attrSpec(el).forEach(function (p) {
        var val = lang === 'es' && Object.prototype.hasOwnProperty.call(dict, p[1]) ? dict[p[1]] : rec.attrs[p[0]];
        if (val != null) el.setAttribute(p[0], val);
      });
    });
  }

  function setLang(next, persist) {
    if (SUPPORTED.indexOf(next) < 0) return;
    lang = next;
    root.lang = next;
    apply(document);
    document.title = next === 'es' && dict['meta.title'] ? dict['meta.title'] : meta.title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = next === 'es' && dict['meta.description'] ? dict['meta.description'] : meta.description;
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === next));
    });
    if (persist) write('site-lang', next);
    listeners.forEach(function (fn) { fn(next); });
  }

  function t(key, vars) {
    var table = strings[lang] || {};
    var s = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : (strings.en || {})[key];
    if (s == null) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function locale() { return lang === 'es' ? 'es-US' : 'en-US'; }
  function money(value, opts) {
    return new Intl.NumberFormat(locale(), Object.assign({ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }, opts || {})).format(value);
  }
  function number(value, opts) { return new Intl.NumberFormat(locale(), opts || {}).format(value); }

  window.Site = {
    t: t,
    money: money,
    number: number,
    apply: apply,
    get lang() { return lang; },
    onLang: function (fn) { listeners.push(fn); }
  };

  /* ---------------------------------------------------------------- header + menu */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  function closeMenu() {
    if (!header) return;
    header.classList.remove('nav-open');
    document.body.style.overflow = '';
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn && header) {
    menuBtn.addEventListener('click', function () {
      var open = !header.classList.contains('nav-open');
      header.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.querySelectorAll('#site-nav a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeMenu(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });

  /* ---------------------------------------------------------------- photos
     Every .media block has an illustration underneath and an optional photo on top.
     The photo fades in once it loads; if it fails (offline, blocked) it is removed
     and the illustration stays. */
  function wirePhoto(img) {
    if (img.dataset.wired) return;
    img.dataset.wired = '1';
    var done = function () { img.classList.add('is-loaded'); };
    var fail = function () { img.remove(); };
    if (img.complete) { if (img.naturalWidth) done(); else if (img.getAttribute('src')) fail(); return; }
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', fail, { once: true });
  }
  function wirePhotos(scope) { (scope || document).querySelectorAll('.media__photo').forEach(wirePhoto); }
  window.Site.wirePhotos = wirePhotos;
  wirePhotos();

  /* ---------------------------------------------------------------- forms
     Set data-endpoint on a form (Formspree, Basin, your own API…) to deliver
     submissions. Without one the form validates and confirms, and says it is
     not connected yet. */
  function fieldOf(input) { return input.closest('.field'); }
  function validate(input) {
    var ok = input.checkValidity();
    var f = fieldOf(input);
    if (f) f.classList.toggle('is-invalid', !ok);
    return ok;
  }

  document.querySelectorAll('form[data-endpoint]').forEach(function (form) {
    var status = form.querySelector('.form__status');
    form.querySelectorAll('input, select, textarea').forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value) validate(input); });
      input.addEventListener('input', function () { if (fieldOf(input) && fieldOf(input).classList.contains('is-invalid')) validate(input); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      form.querySelectorAll('input, select, textarea').forEach(function (input) {
        if (!validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      var endpoint = form.getAttribute('data-endpoint');
      var submit = form.querySelector('[type="submit"]');
      var nameField = form.querySelector('[name="name"]');
      var first = nameField && nameField.value ? nameField.value.trim().split(/\s+/)[0] : '';
      var who = first ? ', ' + first : '';
      status.className = 'form__status';

      if (!endpoint) {
        status.classList.add('is-ok');
        status.innerHTML = t('form.ok', { name: who }) + '<small>' + t('form.preview') + '</small>';
        form.reset();
        return;
      }

      if (submit) submit.disabled = true;
      status.textContent = t('form.sending');
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          status.classList.add('is-ok');
          status.textContent = t('form.ok', { name: who });
          form.reset();
        })
        .catch(function () { status.textContent = t('form.fail'); })
        .then(function () { if (submit) submit.disabled = false; });
    });
  });

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  setLang(initialLang(), false);
})();
