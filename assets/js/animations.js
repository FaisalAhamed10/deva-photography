/* Scroll-driven reveals, parallax, magnetic buttons, footer reveal. */
(function () {
  const D = window.DEVA;

  function splitWords(el) {
    if (el.dataset.splitDone) return D.qsa('.split-word > span', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'split-word';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    D.qsa('.split-word', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    el.dataset.splitDone = '1';
    return D.qsa('.split-word > span', el);
  }

  function reveals() {
    const gsap = window.gsap;
    // Headings: masked word-by-word rise
    D.qsa('[data-split]').forEach((el) => {
      const words = splitWords(el);
      gsap.fromTo(words, { yPercent: 110 }, {
        yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      });
    });
    // Generic fade-up blocks (supports data-delay)
    D.qsa('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' }
      });
    });
    // Staggered children
    D.qsa('[data-stagger]').forEach((el) => {
      gsap.fromTo(el.children, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      });
    });
    // Image wipes: frame unclips upward while the photo settles from a zoom
    D.qsa('[data-reveal-img]').forEach((el) => {
      const img = el.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, 0.2);
    });
  }

  function parallax() {
    if (!D.env.richMotion) return;
    D.qsa('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax || 10);
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function footer() {
    const f = D.qs('.site-footer');
    if (!f) return;
    gsap.fromTo(D.qsa('.footer__grid > *', f), { opacity: 0, y: 50 }, {
      opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: f, start: 'top 85%', toggleActions: 'play none none none' }
    });
    const mark = D.qs('.footer__wordmark', f);
    if (mark) gsap.fromTo(mark, { yPercent: 60, opacity: 0 }, {
      yPercent: 0, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  function magnetic() {
    if (!D.env.finePointer || D.env.reducedMotion) return;
    D.qsa('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  D.initAnimations = function () {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (D.env.reducedMotion) {
      // Respect the preference: content simply appears; no travel, no parallax.
      return;
    }
    reveals();
    parallax();
    footer();
    magnetic();
    // Re-measure once images/fonts settle so triggers fire at the right spots.
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  };
})();
