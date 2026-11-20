/* Boot sequence. Each module is optional — pages include only what they use. */
(function () {
  const D = window.DEVA;
  D.errors = [];
  const run = (fn) => { try { fn && fn(); } catch (err) { D.errors.push(err); console.error('[DEVA]', err); } };

  // Always start from the top after the intro (unless a #section was requested).
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function boot() {
    if (!location.hash) window.scrollTo(0, 0);
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    run(() => D.renderIcons(document));
    run(D.initSmoothScroll);
    run(D.initNav);
    run(D.initHero);
    run(D.initGallery);
    run(D.initForms);
    run(D.initAnimations);
    run(D.initPreloader);
    D.qsa('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
