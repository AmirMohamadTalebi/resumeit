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
    // Each product tile carries a light that follows the pointer.
    if (fine) mega.querySelectorAll('.ln-mega__item').forEach(item => item.addEventListener('pointermove', e => { const r = item.getBoundingClientRect(); item.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); item.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px'); }));
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

  /* Info pages: a living hero (grid floor, orbit rings, drifting sparks, a title that arrives word by word,
     auroras that follow the pointer, content that lifts away as you scroll), cards that tilt toward the pointer
     with a following light and rise in with their icons drawing themselves, magnetic buttons and a soft glow
     that follows the cursor. Everything is skipped with reduced motion. */
  if (document.body.classList.contains('pub') && !calm.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('pub-motion');
    const hero = $('.lg-hero, .cl-hero');
    if (hero) {
      hero.insertAdjacentHTML('afterbegin', '<span class="lg-sky" aria-hidden="true"><i class="lg-floor"></i><i class="lg-orbit"><b></b></i><i class="lg-orbit lg-orbit--2"><b></b></i>' + '<i class="lg-spark"></i>'.repeat(14) + '</span>');
      hero.querySelectorAll('.lg-spark').forEach(s => { s.style.cssText = '--x:' + (Math.random() * 100).toFixed(1) + '%;--y:' + (20 + Math.random() * 70).toFixed(1) + '%;--s:' + (2 + Math.random() * 4).toFixed(1) + 'px;--t:' + (5 + Math.random() * 7).toFixed(1) + 's;--w:' + (-Math.random() * 8).toFixed(1) + 's'; });
      // Words, not letters, so Persian letters keep joining.
      const title = hero.querySelector('h1');
      if (title) { let i = 0; title.innerHTML = title.textContent.trim().split(/(\s+)/).map(w => /^\s+$/.test(w) ? w : '<span class="lg-w" style="--i:' + i++ + '">' + w + '</span>').join(''); title.classList.add('is-split'); }
      if (fine) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
      const lift = () => { const y = Math.min(scrollY, 600); hero.style.setProperty('--lift', y.toFixed(0)); };
      addEventListener('scroll', () => requestAnimationFrame(lift), { passive: true }); lift();
    }
    const cards = $$('.lg-glance li, .lg-steps li, .lg-principles li, .lg-channel, .lg-panel, .lg-sec, .lg-cta, .lg-kicker, .cl-release, .cl-toolbar, .cl-index, .lg-toc, .ln-foot [data-anim]');
    const io = new IntersectionObserver(entries => entries.filter(e => e.isIntersecting).forEach((e, i) => { e.target.style.setProperty('--d', Math.min(i, 6) * 90 + 'ms'); e.target.classList.add('is-in'); io.unobserve(e.target); }), { rootMargin: '0px 0px -6% 0px' });
    cards.forEach(el => { el.classList.add('lg-reveal'); io.observe(el); });
    if (fine) {
      $$('.lg-glance li, .lg-steps li, .lg-principles li, .lg-channel').forEach(card => {
        card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; card.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--my', (y * 100).toFixed(1) + '%'); card.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * 8).toFixed(2) + 'deg) rotateY(' + ((x - .5) * 10).toFixed(2) + 'deg) translateY(-4px)'; });
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
      });
      $$('.lg-btn, .ln-head__cta').forEach(btn => {
        btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); btn.style.translate = ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px'; });
        btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
      });
      const glow = document.createElement('span'); glow.className = 'lg-glow'; glow.setAttribute('aria-hidden', 'true'); document.body.append(glow);
      addEventListener('pointermove', e => { glow.classList.add('is-on'); glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)'; }, { passive: true });
    }
  }

  // e-Namad seal: the official image when it loads, a text link otherwise.
  const seal = $('[data-enamad-seal]');
  if (seal) {
    const image = seal.querySelector('img'), fallback = $('.footer-enamad-fallback');
    const update = () => { const loaded = image.complete && image.naturalWidth > 0; seal.hidden = !loaded; if (fallback) fallback.hidden = loaded; };
    image.addEventListener('load', update); image.addEventListener('error', update); update();
  }
})();

// Scroll cinema chapters: where the browser has no scroll timelines, one throttled listener writes --sc-p.
(() => {
  const chapters = [...document.querySelectorAll('.sc-ch')];
  if (!chapters.length || matchMedia('(prefers-reduced-motion: reduce)').matches || CSS.supports('animation-timeline: view()')) return;
  let queued = false;
  const frame = () => { queued = false; for (const c of chapters) { const r = c.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); c.firstElementChild.style.setProperty('--sc-p', p.toFixed(4)); } };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame); frame();
})();
