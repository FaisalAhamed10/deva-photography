/* Smooth scrolling (Lenis), header states, mobile menu, anchor links, active section. */
(function () {
  const D = window.DEVA;

  D.initSmoothScroll = function () {
    if (!window.Lenis || !D.env.richMotion) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    D.lenis = lenis;
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  };

  D.scrollTo = function (target, opts) {
    const header = D.qs('.site-header');
    const offset = target === 0 ? 0 : -((header && header.offsetHeight) || 0) + 1;
    if (D.lenis) D.lenis.scrollTo(target, Object.assign({ offset, duration: 1.4 }, opts || {}));
    else {
      const y = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: D.env.reducedMotion ? 'auto' : 'smooth' });
    }
  };

  function initHeader() {
    const header = D.qs('.site-header');
    if (!header) return;
    const alwaysSolid = header.hasAttribute('data-solid');
    // Hide on scroll down / reveal on scroll up, decided from the *accumulated*
    // distance in one direction so small smooth-scroll steps can't make it flicker.
    const HIDE_AFTER = 480;   // never hide near the top of the page
    const THRESHOLD = 24;     // px of travel in one direction before switching state
    let lastY = window.scrollY, travel = 0, hidden = false, solid = null;

    const setHidden = (h) => { if (h !== hidden) { hidden = h; header.classList.toggle('is-hidden', h); } };
    const update = () => {

      const y = Math.max(0, window.scrollY);
      const isSolid = alwaysSolid || y > 60;
      if (isSolid !== solid) { solid = isSolid; header.classList.toggle('is-solid', isSolid); }

      const dy = y - lastY;
      lastY = y;
      if (dy === 0) return;
      // Reset the counter whenever the direction changes.
      travel = (Math.sign(dy) === Math.sign(travel)) ? travel + dy : dy;

      const locked = document.body.classList.contains('menu-open') || document.documentElement.style.overflow === 'hidden';
      if (y < HIDE_AFTER || locked) setHidden(false);
      else if (travel > THRESHOLD) setHidden(true);
      else if (travel < -THRESHOLD) setHidden(false);
    };
    update();
    // update() only touches the DOM when state actually changes, so it can run on every scroll event.
    window.addEventListener('scroll', update, { passive: true });
    // Keyboard users tabbing into the header always get it back.
    header.addEventListener('focusin', () => setHidden(false));
  }

  function initMenu() {
    const toggle = D.qs('.menu-toggle');
    const menu = D.qs('.mobile-menu');
    if (!toggle || !menu) return;
    const links = D.qsa('.mobile-menu__link > span, .mobile-menu__foot', menu);
    let open = false;
    let tl;

    const set = (state) => {
      if (state === open) return;
      open = state;
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (tl) tl.kill();
      if (open) {
        menu.style.visibility = 'visible';
        menu.removeAttribute('inert');
        D.lockScroll();
        if (window.gsap && !D.env.reducedMotion) {
          tl = gsap.timeline()
            .fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' })
            .fromTo(links, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, '-=0.35');
        } else menu.style.clipPath = 'inset(0 0 0% 0)';
        setTimeout(() => { const f = D.qs('.mobile-menu__link', menu); f && f.focus({ preventScroll: true }); }, 350);
      } else {
        const done = () => { menu.style.visibility = 'hidden'; menu.setAttribute('inert', ''); };
        D.unlockScroll();
        if (window.gsap && !D.env.reducedMotion) {
          tl = gsap.timeline({ onComplete: done })
            .to(links, { yPercent: -60, opacity: 0, duration: 0.35, stagger: 0.03, ease: 'power2.in' })
            .to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.65, ease: 'expo.inOut' }, '-=0.15');
        } else { menu.style.clipPath = 'inset(0 0 100% 0)'; done(); }
      }
    };
    menu.setAttribute('inert', '');
    toggle.addEventListener('click', () => set(!open));
    menu.addEventListener('click', (e) => { if (e.target.closest('a, [data-book]')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') { set(false); toggle.focus(); }
      if (e.key === 'Tab') {
        // Keep focus cycling between the close button and the menu items.
        const items = [toggle].concat(D.qsa('a[href], button', menu));
        const i = items.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
        items[next].focus();
      }
    });
    window.addEventListener('resize', () => { if (open && window.innerWidth >= 1024) set(false); });
    D.closeMenu = () => set(false);
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a) return;
      const url = new URL(a.getAttribute('href'), location.href);
      const here = location.pathname.replace(/index\.html$/, '');
      const there = url.pathname.replace(/index\.html$/, '');
      if (here !== there || !url.hash) return;
      const target = url.hash === '#home' || url.hash === '#top' ? 0 : document.getElementById(url.hash.slice(1));
      if (target === null) return;
      e.preventDefault();
      // Wait for the menu to close before scrolling.
      setTimeout(() => D.scrollTo(target), document.body.classList.contains('menu-open') ? 450 : 0);
      history.replaceState(null, '', url.hash === '#home' ? location.pathname : url.hash);
    });
    // Arrived from another page with a hash.
    if (location.hash && location.hash.length > 1) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) D.listen('ready', () => setTimeout(() => D.scrollTo(t, { immediate: true }), 50));
    }
  }

  function initActiveLinks() {
    const links = D.qsa('.nav-link[data-section]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((l) => { const s = document.getElementById(l.dataset.section); if (s) map.set(s, l); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          const l = map.get(en.target);
          if (l) { l.classList.add('is-active'); l.setAttribute('aria-current', 'true'); }
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, s) => io.observe(s));
  }

  function initBackToTop() {
    const btn = D.qs('.to-top');
    if (!btn) return;
    const ring = btn.querySelector('circle');
    const len = ring ? 2 * Math.PI * ring.r.baseVal.value : 0;
    if (ring) { ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len; }
    const bar = D.qs('.scroll-progress span');
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      btn.classList.toggle('is-visible', window.scrollY > 700);
      if (ring) ring.style.strokeDashoffset = len * (1 - p);
      if (bar) bar.style.transform = `scaleX(${p})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    btn.addEventListener('click', () => { D.scrollTo(0); const s = D.qs('#main'); if (s) setTimeout(() => s.focus({ preventScroll: true }), 900); });
  }

  D.initNav = function () {
    initHeader();
    initMenu();
    initAnchors();
    initActiveLinks();
    initBackToTop();
  };
})();
