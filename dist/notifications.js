/* Toasts for every page: a night-sky card with a kind orb, optional title and action buttons, a gold countdown that
   pauses while the pointer or focus is on it, and swipe-to-dismiss on touch. Text is always set as text, never HTML.
   ResumeItNotify(message, { kind, title, duration, sticky, actions:[{ label, href, onClick, primary, icon }] }) */
(() => {
  'use strict';
  const ICONS = {
    success: '<path class="ri-note__draw" d="M5 12.5l4.2 4.2L19 7"/>',
    error: '<path d="M12 7v6"/><path class="ri-note__draw" d="M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
    warning: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    info: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><path d="M8 14h3"/>'
  };
  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clean = v => String(v == null ? '' : v).replace(/\.(?=\s|$)/g, ' ').trim();

  window.ResumeItNotify = (message, options = {}) => {
    let root = document.getElementById('ri-notifications');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ri-notifications'; root.className = 'toast toast-top toast-end';
      root.setAttribute('aria-live', 'polite'); root.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(root);
    }
    const kind = ICONS[options.kind] ? options.kind : 'info', duration = options.duration || (options.actions?.length ? 9000 : 4200);
    const item = document.createElement('div');
    item.className = 'ri-notification ri-note'; item.dataset.kind = kind;
    item.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    item.style.setProperty('--ri-note-life', duration + 'ms');
    if (options.sticky) item.classList.add('is-sticky');

    const orb = document.createElement('span');
    orb.className = 'ri-note__orb'; orb.innerHTML = svg(ICONS[options.icon] || ICONS[kind]);
    const body = document.createElement('div'); body.className = 'ri-note__body';
    if (options.title) { const t = document.createElement('b'); t.className = 'ri-note__title'; t.textContent = clean(options.title); body.append(t); }
    const text = document.createElement('span'); text.className = 'ri-note__text'; text.textContent = clean(message); body.append(text);
    if (options.actions?.length) {
      const row = document.createElement('div'); row.className = 'ri-note__actions';
      options.actions.forEach((a, i) => {
        const el = document.createElement(a.href ? 'a' : 'span');
        if (a.href) el.href = a.href; else { el.setAttribute('role', 'button'); el.tabIndex = 0; }
        el.className = 'ri-note__act' + (a.primary ? ' is-primary' : ''); el.style.setProperty('--i', i);
        if (a.icon && ICONS[a.icon]) el.innerHTML = svg(ICONS[a.icon]);
        el.append(document.createTextNode(a.label));
        const run = e => { try { a.onClick?.(e); } finally { if (a.keep !== true) dismiss(); } };
        el.addEventListener('click', run);
        el.addEventListener('keydown', e => { if (!a.href && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); run(e); } });
        row.append(el);
      });
      body.append(row);
    }
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'ri-note__x'; close.setAttribute('aria-label', 'بستن اعلان');
    close.innerHTML = svg('<path d="M6 6l12 12M18 6L6 18"/>');
    const life = document.createElement('i'); life.className = 'ri-note__life'; life.setAttribute('aria-hidden', 'true');
    item.append(orb, body, close, life); root.appendChild(item);
    while (root.children.length > 3) root.firstChild.remove();

    // Countdown that pauses on hover, focus and while a finger is on it.
    let timer, left = duration, started = Date.now(), gone = false;
    const run = () => { if (options.sticky || gone) return; started = Date.now(); timer = setTimeout(dismiss, left); item.classList.remove('is-paused'); };
    const pause = () => { if (options.sticky || gone) return; clearTimeout(timer); left = Math.max(600, left - (Date.now() - started)); item.classList.add('is-paused'); };
    function dismiss(dir) {
      if (gone) return; gone = true; clearTimeout(timer);
      if (dir) item.style.setProperty('--ri-note-out', dir * 120 + '%');
      item.classList.add('is-leaving'); setTimeout(() => item.remove(), still() ? 0 : 260);
    }
    close.onclick = () => dismiss();
    item.addEventListener('pointerenter', pause); item.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') run(); });
    item.addEventListener('focusin', pause); item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) run(); });

    // Swipe sideways on touch to throw it away.
    let x0 = null, dx = 0;
    item.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('a,button,[role=button]')) return; x0 = e.clientX; dx = 0; pause(); });
    item.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; item.style.translate = dx + 'px 0'; item.style.opacity = String(Math.max(.2, 1 - Math.abs(dx) / 260)); });
    const release = () => { if (x0 == null) return; x0 = null; if (Math.abs(dx) > 80) { item.style.translate = ''; dismiss(Math.sign(dx)); } else { item.style.translate = ''; item.style.opacity = ''; run(); } };
    item.addEventListener('pointerup', release); item.addEventListener('pointercancel', release);

    run();
    return { dismiss: () => dismiss(), element: item };
  };
})();
