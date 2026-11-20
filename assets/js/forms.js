/* Booking modal + contact form: validation and WhatsApp hand-off (wa.me).
   Nothing is sent automatically — WhatsApp opens with the message ready,
   and the visitor presses Send themselves. */
(function () {
  const D = window.DEVA;

  /* ---------- Validation ---------- */
  const V = {
    name(v) {
      v = v.trim();
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Name looks too short.';
      if (!/^[\p{L}][\p{L}\p{M} .'-]*$/u.test(v)) return 'Please use letters only.';
      return '';
    },
    phone(v) {
      const t = v.trim();
      if (!t) return 'Please enter your phone number.';
      if (!/^\+?[\d\s\-()]+$/.test(t)) return 'Use digits only (spaces, + and - are fine).';
      const d = t.replace(/\D/g, '');
      const ok =
        /^0?[6-9]\d{9}$/.test(d) ||               // Indian mobile: 98765 43210 / 098765 43210
        /^91[6-9]\d{9}$/.test(d) ||               // 91 98765 43210 / +91 ...
        (t.startsWith('+') && !d.startsWith('91') && d.length >= 8 && d.length <= 15); // international
      return ok ? '' : 'Please enter a valid mobile number (e.g. 98765 43210 or +91 98765 43210).';
    },
    email(v) {
      v = v.trim();
      if (!v) return ''; // optional
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.';
    },
    event(v) { return v ? '' : 'Please choose an event type.'; },
    message(v) {
      v = v.trim();
      if (!v) return 'Please write a short message.';
      return v.length < 10 ? 'Please add a little more detail (10+ characters).' : '';
    }
  };

  function fieldError(field, msg) {
    const wrap = field.closest('.field');
    const out = wrap && wrap.querySelector('.field__error');
    wrap && wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) out.innerHTML = msg ? `${D.icon('alert-circle')}<span>${D.esc(msg)}</span>` : '';
  }

  function validateForm(form) {
    let first = null;
    D.qsa('[data-validate]', form).forEach((f) => {
      const msg = V[f.dataset.validate](f.value);
      fieldError(f, msg);
      if (msg && !first) first = f;
    });
    return first;
  }

  function liveValidation(form) {
    D.qsa('[data-validate]', form).forEach((f) => {
      f.addEventListener('blur', () => { if (f.value || f.dataset.touched) { f.dataset.touched = '1'; fieldError(f, V[f.dataset.validate](f.value)); } });
      f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') fieldError(f, V[f.dataset.validate](f.value)); });
      f.addEventListener('change', () => { if (f.tagName === 'SELECT') fieldError(f, V[f.dataset.validate](f.value)); });
    });
  }

  /* ---------- WhatsApp ---------- */
  D.whatsappURL = (text) => `https://wa.me/${D.config.whatsappNumber}?text=${encodeURIComponent(text)}`;

  function openWhatsApp(text, statusEl) {
    const url = D.whatsappURL(text);
    const win = window.open(url, '_blank', 'noopener');
    if (statusEl) {
      statusEl.innerHTML = `${D.icon('check')}<strong>Your message is ready in WhatsApp.</strong>
        <span>Please review it and press <b>Send</b> in WhatsApp to complete your request. Nothing is sent until you do.</span>
        <span>WhatsApp didn't open? <a href="${url}" target="_blank" rel="noopener">Open WhatsApp</a> or call <a href="tel:${D.config.phoneTel}">${D.config.phoneDisplay}</a>.</span>`;
      statusEl.classList.add('is-visible');
      statusEl.setAttribute('tabindex', '-1');
      statusEl.focus({ preventScroll: true });
    }
    if (!win) location.href = url; // popup blocked — go directly
  }

  const val = (form, name) => (form.elements[name] ? form.elements[name].value.trim() : '');
  const tidyPhone = (p) => p.replace(/\s+/g, ' ').trim();

  function bindForm(form, buildMessage) {
    if (!form) return;
    form.setAttribute('novalidate', '');
    liveValidation(form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = form.querySelector('.form__status');
      if (status) status.classList.remove('is-visible');
      const bad = validateForm(form);
      if (bad) {
        bad.focus();
        if (window.gsap && !D.env.reducedMotion) gsap.fromTo(bad.closest('.field'), { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        return;
      }
      openWhatsApp(buildMessage(form), status);
    });
  }

  /* ---------- Booking modal ---------- */
  let modal, dialog, opener = null, isOpen = false;

  function buildModal() {
    const hero = D.photoById('forehead-touch') || D.photos()[0];
    const opts = D.config.eventTypes.map((t) => `<option value="${D.esc(t)}">${D.esc(t)}</option>`).join('');
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'booking-modal';
    modal.innerHTML = `
      <div class="modal__backdrop" data-close></div>
      <div class="modal__scroller" data-close>
        <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title" aria-describedby="booking-intro">
          <button type="button" class="modal__close" data-close aria-label="Close booking form">${D.icon('x')}</button>
          <div class="modal__media" aria-hidden="true">
            ${hero ? D.picture(hero, { sizes: '420px', maxWidth: 960, alt: '' }) : ''}
            <p class="modal__media-cap">Your story, told in light.</p>
          </div>
          <div class="modal__body">
            <span class="eyebrow">Book your date</span>
            <h2 class="modal__title" id="booking-title">Let's capture <em>your</em> moment.</h2>
            <p class="modal__intro" id="booking-intro">Share a few details and we'll get back to you about availability and packages.</p>
            <form class="form form--light" id="booking-form" novalidate>
              <div class="field">
                <label class="field__label" for="bk-name">Full name<span class="req" aria-hidden="true">*</span></label>
                <input class="field__control" id="bk-name" name="name" type="text" autocomplete="name" required data-validate="name" aria-describedby="bk-name-err" placeholder="Your full name">
                <span class="field__error" id="bk-name-err" aria-live="polite"></span>
              </div>
              <div class="field">
                <label class="field__label" for="bk-phone">Phone number<span class="req" aria-hidden="true">*</span></label>
                <input class="field__control" id="bk-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required data-validate="phone" aria-describedby="bk-phone-err" placeholder="98765 43210">
                <span class="field__error" id="bk-phone-err" aria-live="polite"></span>
              </div>
              <div class="field">
                <label class="field__label" for="bk-event">Event type<span class="req" aria-hidden="true">*</span></label>
                <select class="field__control" id="bk-event" name="event" required data-validate="event" aria-describedby="bk-event-err">
                  <option value="">Select an event</option>${opts}
                </select>
                <span class="field__error" id="bk-event-err" aria-live="polite"></span>
              </div>
              <button type="submit" class="btn btn--dark-solid btn--block">Send booking request ${D.icon('send')}</button>
              <p class="form__note">This opens WhatsApp with your details filled in — you review and press Send. See our <a href="privacy.html">Privacy Policy</a>.</p>
              <div class="form__status" role="status"></div>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    dialog = modal.querySelector('.modal__dialog');
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') && (e.target.hasAttribute('data-close') || e.target.closest('.modal__close'))) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') closeModal();
      else D.trapFocus(dialog, e);
    });
    bindForm(modal.querySelector('#booking-form'), (f) => [
      'Hello DEVA Photography,',
      '',
      'I would like to enquire about a photography booking.',
      '',
      `Name: ${val(f, 'name')}`,
      `Phone: ${tidyPhone(val(f, 'phone'))}`,
      `Event: ${val(f, 'event')}`,
      '',
      'Please contact me regarding availability and packages.',
      'Thank you.'
    ].join('\n'));
  }

  function openModal(preset) {
    if (!modal) buildModal();
    if (isOpen) return;
    isOpen = true;
    opener = document.activeElement;
    if (preset) { const s = modal.querySelector('#bk-event'); if (s && D.config.eventTypes.includes(preset)) s.value = preset; }
    const status = modal.querySelector('.form__status');
    status && status.classList.remove('is-visible');
    modal.classList.add('is-open');
    D.lockScroll();
    const gsap = window.gsap;
    if (gsap && !D.env.reducedMotion) {
      gsap.timeline()
        .fromTo(modal.querySelector('.modal__backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
        .fromTo(dialog, { opacity: 0, y: 60, clipPath: 'inset(8% 0 0 0)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: 'expo.out' }, 0.05)
        .fromTo(D.qsa('.modal__body > *', dialog), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' }, 0.25)
        .fromTo(modal.querySelector('.modal__media img'), { scale: 1.2 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.05);
    }
    setTimeout(() => { const f = modal.querySelector('#bk-name'); f && f.focus({ preventScroll: true }); }, 60);
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    const done = () => { modal.classList.remove('is-open'); D.unlockScroll(); if (opener && opener.focus) opener.focus({ preventScroll: true }); };
    if (window.gsap && !D.env.reducedMotion) {
      gsap.timeline({ onComplete: done })
        .to(dialog, { opacity: 0, y: 30, duration: 0.35, ease: 'power2.in' })
        .to(modal.querySelector('.modal__backdrop'), { opacity: 0, duration: 0.3 }, '-=0.15');
    } else done();
  }

  D.initForms = function () {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-book]');
      if (!t) return;
      e.preventDefault();
      openModal(t.getAttribute('data-book') || '');
    });
    bindForm(D.qs('#contact-form'), (f) => {
      const email = val(f, 'email');
      return [
        'Hello DEVA Photography,',
        '',
        'I would like to enquire about your photography services.',
        '',
        `Name: ${val(f, 'name')}`,
        `Phone: ${tidyPhone(val(f, 'phone'))}`,
        `Email: ${email || 'Not provided'}`,
        `Message: ${val(f, 'message')}`,
        '',
        'Please get in touch with me.',
        'Thank you.'
      ].join('\n');
    });
    // Plain WhatsApp links get a friendly default message.
    D.qsa('[data-whatsapp]').forEach((a) => { a.href = D.whatsappURL('Hello DEVA Photography, I would like to know more about your photography services.'); });
    // Open the booking form directly via a #book link (e.g. shared from Instagram bio).
    if (location.hash === '#book') D.listen('ready', () => openModal());
  };
  D.openBooking = openModal;
})();
