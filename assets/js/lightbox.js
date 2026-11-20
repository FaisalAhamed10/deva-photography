/* Full-screen lightbox: prev/next, keyboard, touch swipe, focus management. */
(function () {
  const D = window.DEVA;
  let el, figure, countEl, titleEl, catEl, list = [], index = 0, opener = null, isOpen = false, busy = false;

  function build() {
    el = document.createElement('div');
    el.className = 'lightbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Photo viewer');
    el.innerHTML = `
      <div class="lightbox__top">
        <span class="lightbox__count" aria-live="polite"></span>
        <button type="button" class="lightbox__btn" data-lb="close" aria-label="Close photo viewer">${D.icon('x')}</button>
      </div>
      <div class="lightbox__stage"><figure class="lightbox__figure"></figure></div>
      <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" data-lb="prev" aria-label="Previous photo">${D.icon('chevron-left')}</button>
      <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" data-lb="next" aria-label="Next photo">${D.icon('chevron-right')}</button>
      <div class="lightbox__caption"><span class="lightbox__title"></span><span class="lightbox__cat"></span></div>`;
    document.body.appendChild(el);
    figure = el.querySelector('.lightbox__figure');
    countEl = el.querySelector('.lightbox__count');
    titleEl = el.querySelector('.lightbox__title');
    catEl = el.querySelector('.lightbox__cat');

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb]');
      if (b) { const a = b.dataset.lb; a === 'close' ? close() : step(a === 'next' ? 1 : -1); return; }
      if (e.target === el || e.target.classList.contains('lightbox__stage')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else D.trapFocus(el, e);
    });

    // Touch swipe
    let sx = 0, sy = 0, tracking = false;
    el.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!tracking) return; tracking = false;
      const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
    }, { passive: true });
  }

  function preload(i) {
    const p = list[(i + list.length) % list.length];
    if (!p) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = `${p.src}-${p.widths[p.widths.length - 1]}.webp`;
  }

  function render(dir) {
    const p = list[index];
    const html = D.picture(p, { sizes: '100vw', loading: 'eager' });
    const update = () => {
      figure.innerHTML = html;
      countEl.textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
      titleEl.textContent = p.title || '';
      catEl.textContent = D.categoryLabel(p);
      const single = list.length < 2;
      el.querySelectorAll('.lightbox__nav').forEach((b) => { b.hidden = single; });
      preload(index + 1); preload(index - 1);
    };
    if (!window.gsap || D.env.reducedMotion || !dir) { update(); if (window.gsap && dir === 0) gsap.fromTo(figure, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }); return; }
    busy = true;
    gsap.to(figure, {
      opacity: 0, x: -40 * dir, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        update();
        gsap.fromTo(figure, { opacity: 0, x: 50 * dir }, { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out', onComplete: () => { busy = false; } });
      }
    });
  }

  function step(dir) {
    if (busy || list.length < 2) return;
    index = (index + dir + list.length) % list.length;
    render(dir);
  }

  function open(photos, i, trigger) {
    if (!el) build();
    list = photos.filter(Boolean);
    if (!list.length) return;
    index = Math.max(0, Math.min(i || 0, list.length - 1));
    opener = trigger || document.activeElement;
    isOpen = true;
    el.classList.add('is-open');
    D.lockScroll();
    render(0);
    if (window.gsap && !D.env.reducedMotion) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
    el.querySelector('[data-lb="close"]').focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    const done = () => { el.classList.remove('is-open'); figure.innerHTML = ''; D.unlockScroll(); if (opener && opener.focus) opener.focus({ preventScroll: true }); };
    if (window.gsap && !D.env.reducedMotion) gsap.to(el, { opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: done });
    else done();
  }

  D.openLightbox = open;
  D.closeLightbox = close;
})();
