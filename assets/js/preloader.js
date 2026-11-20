/* Animated logo preloader (first visit per browser session only)
   and the black page curtain used for transitions between pages. */
(function () {
  const D = window.DEVA;
  const root = document.documentElement;

  function waitForCritical(maxMs) {
    // Resolve when fonts + first hero image are ready, or after maxMs — slow images never block the site.
    const tasks = [];
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);
    const first = document.querySelector('[data-critical-img]');
    if (first && !first.complete) {
      tasks.push(new Promise((res) => { first.addEventListener('load', res, { once: true }); first.addEventListener('error', res, { once: true }); }));
    }
    return Promise.race([Promise.all(tasks), new Promise((res) => setTimeout(res, maxMs))]);
  }

  function finish() {
    root.classList.remove('show-preloader');
    root.classList.add('no-curtain');
    D.storage.set('deva-intro-seen', '1');
    D.emit('ready');
  }

  function runPreloader() {
    const el = document.querySelector('.preloader');
    const gsap = window.gsap;
    if (!el || !gsap) { finish(); return; }

    const fill = el.querySelector('.preloader__fill');
    const count = el.querySelector('.preloader__count');
    const parts = {
      letters: el.querySelectorAll('.pl-d, .pl-c, .pl-v, .pl-a'),
      camera: el.querySelector('.pl-camera'),
      flash: el.querySelector('.pl-flash'),
      scriptRect: el.querySelector('.pl-script-rect'),
      script: el.querySelector('.pl-script'),
      inner: el.querySelector('.preloader__inner')
    };
    const progress = { v: 0 };
    const setProgress = () => {
      fill.style.transform = `scaleX(${progress.v / 100})`;
      count.textContent = String(Math.round(progress.v)).padStart(3, '0');
    };

    if (D.env.reducedMotion) {
      gsap.set([parts.letters, parts.script], { opacity: 1 });
      gsap.set(parts.scriptRect, { attr: { width: 2100 } });
      waitForCritical(2500).then(() => {
        progress.v = 100; setProgress();
        gsap.to(el, { opacity: 0, duration: 0.5, delay: 0.3, onComplete: finish });
      });
      return;
    }

    const critical = waitForCritical(4000);
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro
      .from(parts.letters, { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.09 })
      .from(parts.camera, { scale: 0.55, opacity: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'back.out(1.6)' }, 0.35)
      // Shutter "click": camera dips, then the flash fires.
      .to(parts.camera, { scale: 0.92, duration: 0.12, ease: 'power2.in', transformOrigin: '50% 50%' }, 1.05)
      .to(parts.camera, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, 1.17)
      .fromTo(parts.flash, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1.4, duration: 0.14, ease: 'power2.out' }, 1.12)
      .to(parts.flash, { opacity: 0, scale: 2, duration: 0.6, ease: 'power2.out' }, 1.26)
      .to(parts.scriptRect, { attr: { width: 2100 }, duration: 1.2, ease: 'power2.inOut' }, 1.0)
      .from(parts.script, { y: 40, duration: 1.2, ease: 'expo.out' }, 1.0);

    // Progress: animate toward 90% during the intro, complete when assets are ready.
    gsap.to(progress, { v: 90, duration: 2, ease: 'power1.out', onUpdate: setProgress });

    Promise.all([critical, new Promise((r) => intro.eventCallback('onComplete', r))]).then(() => {
      gsap.killTweensOf(progress);
      gsap.timeline()
        .to(progress, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: setProgress })
        .to(parts.inner, { opacity: 0, y: -24, duration: 0.6, ease: 'power3.in' }, '+=0.1')
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut', onStart: () => D.emit('reveal') }, '-=0.15')
        .add(finish);
    });
  }

  function revealCurtain() {
    const curtain = document.querySelector('.page-curtain');
    const done = () => { root.classList.add('no-curtain'); D.emit('reveal'); D.emit('ready'); };
    if (!curtain || !window.gsap) { done(); return; }
    D.emit('reveal');
    gsap.to(curtain, { opacity: 0, duration: D.env.reducedMotion ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => { root.classList.add('no-curtain'); curtain.style.opacity = ''; D.emit('ready'); } });
  }

  /* Page-to-page transition: fade to black, then navigate. */
  function bindPageLinks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      const samePage = url.pathname === location.pathname || (url.pathname.endsWith('/') && /index\.html$/.test(location.pathname)) || (/index\.html$/.test(url.pathname) && location.pathname.endsWith('/'));
      if (samePage && url.hash) return; // handled by in-page anchor scrolling
      if (samePage && !url.hash) return;
      e.preventDefault();
      const curtain = document.querySelector('.page-curtain');
      root.classList.remove('no-curtain');
      if (!curtain || !window.gsap || D.env.reducedMotion) { location.href = a.href; return; }
      gsap.fromTo(curtain, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.in', onComplete: () => { location.href = a.href; } });
    });
    // Restore when coming back via bfcache.
    window.addEventListener('pageshow', (e) => { if (e.persisted) { root.classList.add('no-curtain'); } });
  }

  D.initPreloader = function () {
    bindPageLinks();
    if (root.classList.contains('show-preloader')) runPreloader();
    else revealCurtain();
  };
})();
