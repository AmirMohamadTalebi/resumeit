/* Public chrome behaviour, shared by the landing and the info pages: the header turns milky once the dark hero
   ([data-head-dark]) has scrolled away and tightens after the first scroll, its bottom edge fills with reading
   progress, a gold line follows the section being read ([data-spy]), «محصول» opens on hover or click, the
   footer wordmark fills with light as it appears, and the e-Namad seal falls back to text when it cannot load.
   site-shell.js keeps the phone menu, the account control and aria-current. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const head = $('.ln-head'); if (!head) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches, calm = matchMedia('(prefers-reduced-motion: reduce)');

  // «محصول»: opens on hover after a short pause or on click; Escape, outside clicks and focus leaving close it.
  const mega = $('[data-mega]'), trigger = mega?.querySelector('.ln-head__trigger');
  if (mega && trigger) {
    let timer = 0;
    const set = open => { clearTimeout(timer); mega.classList.toggle('is-open', open); trigger.setAttribute('aria-expanded', String(open)); };
    trigger.addEventListener('click', () => set(!mega.classList.contains('is-open')));
    if (fine) {
      mega.addEventListener('pointerenter', () => { clearTimeout(timer); timer = setTimeout(() => set(true), 90); });
      mega.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => set(false), 240); });
    }
    mega.addEventListener('focusout', e => { if (!mega.contains(e.relatedTarget)) set(false); });
    mega.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('pointerdown', e => { if (!mega.contains(e.target)) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && mega.classList.contains('is-open')) { set(false); trigger.focus(); } });
  }

  // Scroll: light glass past the dark hero, compact after the first scroll, progress line, gold line under the section.
  const dark = $('[data-head-dark]'), bar = $('.ln-head__progress'), ink = $('.ln-head__ink');
  const spies = $$('[data-spy]').filter(a => document.getElementById(a.dataset.spy));
  let queued = false;
  const frame = () => {
    queued = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    head.classList.toggle('is-light', !dark || dark.getBoundingClientRect().bottom < 90);
    head.classList.toggle('is-compact', y > 40);
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (ink && innerWidth > 960) {
      const mid = innerHeight * .35; let on = null;
      for (const s of spies) { const r = document.getElementById(s.dataset.spy).getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) on = s; }
      if (on) { const b = on.getBoundingClientRect(), n = ink.parentElement.getBoundingClientRect(); ink.style.width = Math.max(18, b.width - 26) + 'px'; ink.style.transform = 'translateX(' + (b.left - n.left + 13).toFixed(1) + 'px)'; }
      ink.classList.toggle('is-on', !!on);
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue, { passive: true }); frame();

  // Footer wordmark fills with light once it scrolls into view.
  const word = $('.ln-foot__word');
  if (word) {
    if (calm.matches || !('IntersectionObserver' in window)) word.classList.add('is-in');
    else { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { word.classList.add('is-in'); io.disconnect(); } }, { threshold: .4 }); io.observe(word); }
  }

  // Info pages: cards rise in as they scroll into view; siblings entering together are staggered.
  if (document.body.classList.contains('pub') && !calm.matches && 'IntersectionObserver' in window) {
    const cards = $('.lg-glance li, .lg-steps li, .lg-principles li, .lg-channel, .lg-panel, .lg-sec, .lg-cta, .lg-kicker');
    document.documentElement.classList.add('pub-motion');
    const io = new IntersectionObserver(entries => entries.filter(e => e.isIntersecting).forEach((e, i) => { e.target.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms'); e.target.classList.add('is-in'); io.unobserve(e.target); }), { rootMargin: '0px 0px -6% 0px' });
    cards.forEach(el => { el.classList.add('lg-reveal'); io.observe(el); });
  }

  // e-Namad seal: the official image when it loads, a text link otherwise.
  const seal = $('[data-enamad-seal]');
  if (seal) {
    const image = seal.querySelector('img'), fallback = $('.footer-enamad-fallback');
    const update = () => { const loaded = image.complete && image.naturalWidth > 0; seal.hidden = !loaded; if (fallback) fallback.hidden = loaded; };
    image.addEventListener('load', update); image.addEventListener('error', update); update();
  }
})();
