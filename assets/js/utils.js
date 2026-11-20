/* Shared helpers: environment flags, picture markup, photo data access. */
(function () {
  const D = window.DEVA;
  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;

  const lowPower = (() => {
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory || 8;
    const saveData = navigator.connection && navigator.connection.saveData;
    return saveData || cores <= 4 || mem <= 2;
  })();

  D.env = {
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    finePointer: mq('(hover: hover) and (pointer: fine)'),
    touch: mq('(pointer: coarse)'),
    lowPower,
    get isMobile() { return window.innerWidth < 768; }
  };
  // Heavy effects (parallax, smooth scroll) only where they stay smooth.
  D.env.richMotion = !D.env.reducedMotion && !(D.env.touch && lowPower);

  D.storage = {
    get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  D.esc = esc;

  /* Build a <picture> with AVIF + WebP sources from a photo entry. */
  D.picture = function (photo, opts) {
    const o = Object.assign({ sizes: '100vw', loading: 'lazy', className: '', alt: photo.alt, fetchpriority: '', maxWidth: Infinity, style: '' }, opts || {});
    const widths = photo.widths.filter((w) => w <= o.maxWidth);
    const list = widths.length ? widths : [photo.widths[0]];
    const set = (ext) => list.map((w) => `${photo.src}-${w}.${ext} ${w}w`).join(', ');
    const fallbackW = list[list.length - 1];
    const fp = o.fetchpriority ? ` fetchpriority="${o.fetchpriority}"` : '';
    const st = o.style ? ` style="${o.style}"` : '';
    return `<picture>` +
      `<source type="image/avif" srcset="${set('avif')}" sizes="${o.sizes}">` +
      `<source type="image/webp" srcset="${set('webp')}" sizes="${o.sizes}">` +
      `<img src="${photo.src}-${fallbackW}.webp" alt="${esc(o.alt)}" width="${photo.width}" height="${photo.height}" loading="${o.loading}" decoding="async"${fp}${st}${o.className ? ` class="${o.className}"` : ''}>` +
      `</picture>`;
  };

  /* Photo library — newest first. */
  D.photos = function () {
    const list = Array.isArray(window.DEVA_GALLERY) ? window.DEVA_GALLERY.slice() : [];
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  D.photoById = (id) => (window.DEVA_GALLERY || []).find((p) => p.id === id);
  D.categoryLabel = (p) => (p.categories || []).map((c) => D.config.categories[c] || c).join(' · ');

  D.on = (el, ev, fn, o) => el && el.addEventListener(ev, fn, o);
  D.qs = (s, r) => (r || document).querySelector(s);
  D.qsa = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Event bus */
  D.emit = (name, detail) => document.dispatchEvent(new CustomEvent('deva:' + name, { detail }));
  D.listen = (name, fn) => document.addEventListener('deva:' + name, (e) => fn(e.detail));

  /* Scroll lock that cooperates with Lenis */
  let locks = 0;
  D.lockScroll = function () {
    locks++;
    if (locks > 1) return;
    if (D.lenis) D.lenis.stop();
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    if (sw > 0) document.body.style.paddingRight = sw + 'px';
  };
  D.unlockScroll = function () {
    locks = Math.max(0, locks - 1);
    if (locks) return;
    if (D.lenis) D.lenis.start();
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  /* Focus trap for dialogs */
  D.trapFocus = function (container, e) {
    if (e.key !== 'Tab') return;
    const f = D.qsa('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
})();
