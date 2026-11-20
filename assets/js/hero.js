/* Cinematic hero: crossfading slides with Ken Burns drift + staggered title entrance. */
(function () {
  const D = window.DEVA;
  const DURATION = 6.5; // seconds per slide

  function splitChars(el) {
    D.qsa('.line', el).forEach((line) => {
      const text = line.textContent;
      line.setAttribute('aria-hidden', 'true');
      line.innerHTML = Array.from(text).map((c) => c === ' ' ? ' ' : `<span class="char">${c}</span>`).join('');
    });
  }

  function initSlider(hero) {
    const slides = D.qsa('.hero__slide', hero);
    const dots = D.qsa('.hero__dot', hero);
    const countEl = D.qs('.hero__count-current', hero);
    const gsap = window.gsap;
    if (slides.length < 2 || !gsap) return;

    let index = 0, timer = null, kb = null, progress = null, paused = false, visible = true;
    const drift = [
      { from: { scale: 1.14, xPercent: -1.5 }, to: { scale: 1.02, xPercent: 1.5 } },
      { from: { scale: 1.02, yPercent: 1.5 }, to: { scale: 1.12, yPercent: -1.5 } },
      { from: { scale: 1.12, xPercent: 1.5 }, to: { scale: 1.03, xPercent: -1 } }
    ];

    // Only panels currently displayed (1 on phones/tablets, 3 on desktop).
    const shownImgs = (slide) => D.qsa('.hero__panel', slide).filter((p) => p.offsetWidth > 0).map((p) => p.querySelector('img')).filter(Boolean);
    const kenBurns = (i) => {
      if (D.env.reducedMotion) return null;
      const tl = gsap.timeline();
      shownImgs(slides[i]).forEach((img, k) => {
        const d = drift[(i + k) % drift.length];
        tl.fromTo(img, d.from, Object.assign({}, d.to, { duration: DURATION + 2, ease: 'none' }), 0);
      });
      return tl;
    };
    const runProgress = (i) => {
      dots.forEach((d, k) => gsap.set(d.querySelector('i'), { scaleX: k < i ? 1 : 0 }));
      const bar = dots[i] && dots[i].querySelector('i');
      return bar ? gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DURATION, ease: 'none' }) : null;
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!paused && visible) timer = setTimeout(() => go(index + 1), DURATION * 1000);
    };

    function go(next) {
      next = (next + slides.length) % slides.length;
      if (next === index) return;
      const cur = slides[index], nxt = slides[next];
      // Make sure the next slide's images are requested before showing it.
      shownImgs(nxt).forEach((img) => { if (img.loading === 'lazy') img.loading = 'eager'; });
      gsap.killTweensOf([cur, nxt]);
      gsap.set(cur, { zIndex: 1 });
      nxt.classList.add('is-active');
      if (kb) kb.kill();
      kb = kenBurns(next);
      const finish = () => { cur.classList.remove('is-active'); gsap.set(cur, { opacity: 0, zIndex: 0 }); };
      if (D.env.reducedMotion) {
        gsap.fromTo(nxt, { opacity: 0, zIndex: 2 }, { opacity: 1, duration: 0.8, ease: 'power2.inOut', onComplete: finish });
      } else {
        // Cinematic wipe: each panel unveils upward, staggered left to right.
        const panels = D.qsa('.hero__panel', nxt).filter((p) => p.offsetWidth > 0);
        gsap.set(nxt, { opacity: 1, zIndex: 2 });
        gsap.fromTo(panels, { clipPath: 'inset(100% 0% 0% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', stagger: 0.14,
          onComplete: finish, clearProps: 'clipPath'
        });
        gsap.fromTo(D.qsa('.hero__panel', cur).filter((p) => p.offsetWidth > 0), { yPercent: 0 }, { yPercent: -6, duration: 1.6, ease: 'expo.inOut', stagger: 0.14, clearProps: 'transform' });
      }
      index = next;
      slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== index)));
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
      if (countEl) countEl.textContent = String(index + 1).padStart(2, '0');
      if (progress) progress.kill();
      progress = runProgress(index);
      if (paused || !visible) progress && progress.pause();
      schedule();
    }

    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    const setPaused = (p) => {
      paused = p;
      if (p) { clearTimeout(timer); progress && progress.pause(); kb && kb.pause(); }
      else { progress && progress.resume(); kb && kb.resume(); schedule(); }
    };
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; setPaused(!visible || document.hidden); }, { threshold: 0.05 }).observe(hero);
    }

    // Warm up the remaining slides once the page is idle.
    const warm = () => slides.slice(1).forEach((s) => shownImgs(s).forEach((i) => { i.loading = 'eager'; }));
    ('requestIdleCallback' in window) ? requestIdleCallback(warm, { timeout: 2500 }) : setTimeout(warm, 1500);

    let started = false;
    D.listen('reveal', () => {
      if (started) return; started = true;
      kb = kenBurns(0);
      progress = runProgress(0);
      schedule();
    });
  }

  function intro(hero) {
    const gsap = window.gsap;
    const title = D.qs('.hero__title', hero);
    if (!gsap) return;
    splitChars(title);
    const items = D.qsa('[data-hero-fade]', hero);
    const header = D.qs('.site-header');
    gsap.set(D.qsa('.char', title), { yPercent: 110 });
    gsap.set(items, { opacity: 0, y: 26 });
    if (header) gsap.set(header, { opacity: 0 });

    let played = false;
    D.listen('reveal', () => {
      if (played) return; played = true;
      const rm = D.env.reducedMotion;
      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(D.qsa('.char', title), { yPercent: 0, duration: rm ? 0.01 : 1.2, ease: 'expo.out', stagger: rm ? 0 : 0.035 }, 0.2)
        .to(items, { opacity: 1, y: 0, duration: rm ? 0.3 : 1, ease: 'expo.out', stagger: 0.08 }, rm ? 0.1 : 0.75);
      if (header) tl.to(header, { opacity: 1, duration: 1, ease: 'power2.out', clearProps: 'opacity' }, 0.5);
    });
  }

  function scrollFx(hero) {
    if (!window.ScrollTrigger || !D.env.richMotion) return;
    gsap.to(D.qs('.hero__slides', hero), { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(D.qs('.hero__content', hero), { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true } });
  }

  D.initHero = function () {
    const hero = D.qs('.hero');
    if (!hero) return;
    intro(hero);
    initSlider(hero);
    scrollFx(hero);
  };
})();
