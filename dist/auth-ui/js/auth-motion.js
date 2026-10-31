/* The same eight-card R as the homepage, completed by form state. */
(() => {
  'use strict';
  const RIA = window.RIA;
  const pieces = [
    ['person', 1, [220,10,-5], [35,20], [145,175], '<span class="mark-avatar">تو</span><b>داستان تو</b><small>یک شروع تازه</small>'],
    ['work', 2, [15,218,-6], [190,20], [255,105], '<small>کار منتخب</small><b>چیزی که می‌سازی</b><span class="mark-lines"></span>'],
    ['project', 2, [435,90,6], [400,135], [140,140], '<small>پروژه‌ها</small><span class="mark-poster">ایده ↗</span>'],
    ['skills', 1, [35,35,-4], [35,205], [145,135], '<small>توانایی‌ها</small><b>از ایده<br>تا تجربه</b>'],
    ['links', 1, [410,365,5], [35,350], [145,210], '<small>لینک‌های تو</small><b>بیشتر از تو</b><span class="mark-link">Portfolio ↗</span><span class="mark-link">Projects ↗</span><span class="mark-link">Contact ↗</span>'],
    ['address', 2, [165,500,-3], [190,285], [205,70], '<small>یک آدرس، به نام تو</small><b dir="ltr">you.resumeit.ir</b>'],
    ['theme', 3, [38,380,-5], [225,375], [145,80], '<small>به رنگ خودت</small><span class="mark-swatches"><i></i><i></i><i></i></span>'],
    ['contact', 3, [215,365,4], [340,475], [190,85], '<small>قدم بعدی</small><b>دیده شدن</b>']
  ];
  RIA.markHtml = () => '<div class="auth-mark-home"><div class="auth-assembly" data-progress="0" aria-hidden="true">' + pieces.map(([id,group,from,to,size,content],i) =>
    '<div class="card auth-piece mark-' + id + '" data-group="' + group + '" style="--fx:' + (from[0]/600*100) + '%;--fy:' + (from[1]/585*100) + '%;--dx:' + ((to[0]-from[0])/size[0]*100) + '%;--dy:' + ((to[1]-from[1])/size[1]*100) + '%;--angle:' + from[2] + 'deg;--w:' + (size[0]/600*100) + '%;--h:' + (size[1]/585*100) + '%;--delay:' + i*28 + 'ms">' + content + '</div>'
  ).join('') + '</div></div>';
  RIA.setMark = progress => {
    const mark = document.querySelector('.auth-assembly');
    if (mark) mark.dataset.progress = String(progress);
  };
  RIA.watchMark = (root, progress) => {
    const update = () => RIA.setMark(progress());
    const form=root.querySelector('form')||root;
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    update();
  };

  /* The night around the form: the sky and the R lean toward the pointer, the card keeps a soft light under it,
     the main button leans in and ripples where it is pressed, every new step rises in part by part, the login tabs
     slide, a valid number or a matching password earns a check, and finishing throws a little confetti.
     Nothing here delays a request, and reduced motion leaves only the checks. */
  const calm = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(hover: hover) and (pointer: fine)');
  const mark = root => {
    const mobile = root.querySelector('#mobile');
    if (mobile) mobile.closest('.field')?.toggleAttribute('data-ok', RIA.isMobile(RIA.normMobile(mobile.value)));
    const p = root.querySelector('#np'), p2 = root.querySelector('#np2');
    if (p && p2) p2.closest('.field')?.toggleAttribute('data-ok', !!p2.value && p2.value === p.value && RIA.rules.every(r => r[1](p.value)));
  };
  document.addEventListener('input', e => { if (['mobile', 'np', 'np2'].includes(e.target.id)) mark(document); });

  const rise = list => [...list].forEach((el, i) => {
    el.style.setProperty('--i', i); el.classList.add('auth-in');
    el.addEventListener('animationend', function done(e) { if (e.target === el) { el.classList.remove('auth-in'); el.removeEventListener('animationend', done); } });
  });
  const confetti = card => {
    const art = card.querySelector('.done__art'); if (!art) return;
    const box = card.getBoundingClientRect(), a = art.getBoundingClientRect(), x = a.left - box.left + a.width / 2, y = a.top - box.top + a.height / 2;
    const colors = ['#f0bd52', '#e2a03a', '#3d8c9c', '#8ec5d6', '#875a36', '#fff3c4'];
    for (let i = 0; i < 30; i++) {
      const bit = document.createElement('i'), turn = Math.random() * Math.PI * 2, far = 90 + Math.random() * 150;
      bit.className = 'auth-confetti'; bit.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + colors[i % colors.length];
      card.append(bit);
      bit.animate([{ transform: 'translate(-50%,-50%) rotate(0) scale(1)', opacity: 1 }, { transform: 'translate(' + (Math.cos(turn) * far).toFixed(0) + 'px,' + (Math.sin(turn) * far * .7 + 70).toFixed(0) + 'px) rotate(' + (Math.random() * 720 - 360).toFixed(0) + 'deg) scale(.5)', opacity: 0 }], { duration: 1100 + Math.random() * 800, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.then(() => bit.remove(), () => bit.remove());
    }
  };
  const swap = RIA.swap;
  RIA.swap = function (root, html, init) {
    const was = root.querySelector('.segmented [aria-selected=true]')?.dataset.mode;
    return swap.call(this, root, html, view => {
      if (init) init(view);
      mark(view);
      if (calm.matches) return;
      const now = view.querySelector('.segmented [aria-selected=true]')?.dataset.mode;
      if (was && now) {
        // Switching login method keeps the page still: the pill slides and only the changed fields rise.
        const tabs = view.querySelector('.segmented');
        if (was !== now) { tabs.classList.add('is-sliding'); tabs.addEventListener('animationend', () => tabs.classList.remove('is-sliding'), { once: true }); }
        rise(view.querySelectorAll('#f > :not(:first-child)'));
        return;
      }
      rise(view.children);
      if (view.querySelector('.done')) confetti(view.closest('#card') || view);
    });
  };

  if (calm.matches) return;
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('#auth-root .btn'); if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect(), dot = document.createElement('span'), size = Math.max(r.width, r.height) * 2.4;
    dot.className = 'auth-ripple'; dot.style.left = e.clientX - r.left + 'px'; dot.style.top = e.clientY - r.top + 'px'; btn.append(dot);
    dot.animate([{ transform: 'scale(0)', opacity: .7 }, { transform: 'scale(' + size / 20 + ')', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => dot.remove(), () => dot.remove());
  });
  if (!fine.matches) return;
  let frame = 0, lean = null;
  addEventListener('pointermove', e => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      document.documentElement.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3));
      document.documentElement.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3));
      const card = document.getElementById('card');
      if (card) { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); }
      const btn = e.target.closest?.('#card .btn--primary:not(:disabled)');
      if (lean && lean !== btn) lean.style.translate = '';
      lean = btn || null;
      if (btn) { const r = btn.getBoundingClientRect(); btn.style.translate = ((e.clientX - r.left - r.width / 2) * .06).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + 'px'; }
    });
  }, { passive: true });
})();
