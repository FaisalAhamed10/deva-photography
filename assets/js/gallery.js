/* Portfolio gallery (filterable masonry) + footer "Latest Photos" — both read DEVA_GALLERY. */
(function () {
  const D = window.DEVA;

  function itemHTML(p, i) {
    const cats = (p.categories || []).join(' ');
    return `<figure class="g-item" data-cats="${D.esc(cats)}" data-id="${D.esc(p.id)}">
      <button type="button" class="g-link" style="--g-color:${D.esc(p.color || '#ddd')}" data-index="${i}" aria-label="Open photo: ${D.esc(p.title || p.alt)}">
        ${D.picture(p, { sizes: '(min-width: 1024px) 31vw, (min-width: 400px) 48vw, 100vw', loading: i < 3 ? 'eager' : 'lazy', maxWidth: 960 })}
        <span class="g-link__overlay" aria-hidden="true">
          <span class="g-link__zoom">${D.icon('maximize')}</span>
          <span class="g-link__cat">${D.esc(D.categoryLabel(p))}</span>
          <span class="g-link__title">${D.esc(p.title || '')}</span>
        </span>
      </button>
    </figure>`;
  }

  function initGallery() {
    const grid = D.qs('[data-gallery-grid]');
    if (!grid) return;
    const photos = D.photos();
    const filters = D.qsa('[data-filter]');
    let current = 'all';

    grid.innerHTML = photos.map(itemHTML).join('');
    const items = D.qsa('.g-item', grid);

    // Counts on filter buttons
    filters.forEach((btn) => {
      const f = btn.dataset.filter;
      const n = f === 'all' ? photos.length : photos.filter((p) => (p.categories || []).includes(f)).length;
      const sup = btn.querySelector('sup');
      if (sup) sup.textContent = String(n).padStart(2, '0');
    });

    const visibleList = () => items.filter((it) => !it.hidden).map((it) => D.photoById(it.dataset.id));

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.g-link');
      if (!btn) return;
      const list = visibleList();
      const idx = list.findIndex((p) => p.id === btn.closest('.g-item').dataset.id);
      D.openLightbox(list, idx, btn);
    });

    function apply(filter) {
      if (filter === current) return;
      current = filter;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      const match = (it) => filter === 'all' || it.dataset.cats.split(' ').includes(filter);
      const gsap = window.gsap;
      const swap = () => {
        items.forEach((it) => { it.hidden = !match(it); });
        const shown = items.filter((it) => !it.hidden);
        const empty = D.qs('[data-gallery-empty]');
        if (empty) empty.hidden = shown.length > 0;
        if (window.ScrollTrigger) ScrollTrigger.refresh();
        if (gsap && !D.env.reducedMotion) gsap.fromTo(shown, { opacity: 0, y: 40, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05, clearProps: 'transform' });
      };
      const status = D.qs('[data-gallery-status]');
      if (status) {
        const n = items.filter(match).length;
        status.textContent = `Showing ${n} ${n === 1 ? 'photo' : 'photos'}${filter === 'all' ? '' : ' in ' + (D.config.categories[filter] || filter)}`;
      }
      if (gsap && !D.env.reducedMotion) {
        gsap.to(items.filter((it) => !it.hidden), { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in', stagger: 0.015, onComplete: swap });
      } else swap();
    }
    filters.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    // "Explore work" links on service cards jump to the gallery pre-filtered.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-explore]');
      if (a) setTimeout(() => apply(a.dataset.explore), 250);
    });

    // Reveal-on-scroll for gallery items
    if (window.gsap && window.ScrollTrigger && !D.env.reducedMotion) {
      const seen = new WeakSet();
      ScrollTrigger.batch(items, {
        start: 'top 92%',
        onEnter: (batch) => {
          const fresh = batch.filter((it) => !seen.has(it));
          fresh.forEach((it) => seen.add(it));
          if (fresh.length) gsap.fromTo(fresh, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' });
        }
      });
      gsap.set(items, { opacity: 0 });
    }
  }

  function initLatest() {
    const wrap = D.qs('[data-latest]');
    if (!wrap) return;
    const latest = D.photos().slice(0, D.config.latestCount || 9);
    wrap.innerHTML = latest.map((p, i) => `<button type="button" class="latest__item" data-index="${i}" aria-label="Open latest photo ${i + 1}: ${D.esc(p.title || p.alt)}">
        ${D.picture(p, { sizes: '120px', maxWidth: 480, alt: '' })}
      </button>`).join('');
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.latest__item');
      if (b) D.openLightbox(latest, Number(b.dataset.index), b);
    });
  }

  D.initGallery = function () { initGallery(); initLatest(); };
})();
