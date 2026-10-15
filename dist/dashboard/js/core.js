/* هستهٔ ابزارها: رویدادها، توست، مودال، منو، مرتب‌سازی بدون وابستگی */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  /* ---------- ابزارهای کوچک ---------- */
  RI.pages = {};
  RI.registerPage = (id, def) => { RI.pages[id] = def; };
  RI.$ = (s, r) => (r || document).querySelector(s);
  RI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  RI.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RI.uid = () => Math.random().toString(36).slice(2, 9);
  RI.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  RI.reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  RI.clone = (o) => JSON.parse(JSON.stringify(o));

  const nf = new Intl.NumberFormat('fa-IR',{maximumFractionDigits:4});
  RI.fa = (n) => nf.format(n);
  RI.toman = (n) => nf.format(n) + ' تومان';
  RI.date = (d, opts) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts || { year: 'numeric', month: 'long', day: 'numeric' }).format(d instanceof Date ? d : new Date(d));
  RI.daysFromNow = (n) => new Date(Date.now() + n * 864e5);

  RI.delegate = (root, type, sel, fn) => {
    root.addEventListener(type, (e) => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  };

  RI.isUrl = (s) => {
    if (typeof s !== 'string' || /[\s\x00-\x1f\x7f]/.test(s) || (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s))) return false;
    try { const u = new URL(RI.normUrl(s)); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && u.hostname.includes('.'); }
    catch { return false; }
  };
  RI.isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  RI.isMobile = (s) => /^09\d{9}$/.test(String(s).replace(/[\s-]/g, ''));
  RI.normUrl = (s) => (/^https?:\/\//i.test(s) ? s : 'https://' + s);
  RI.hostOf = (s) => { try { return new URL(RI.normUrl(s)).hostname.replace(/^www\./, ''); } catch (e) { return s; } };

  /* ---------- باس رویداد ---------- */
  const bus = {};
  RI.on = (e, fn) => { (bus[e] = bus[e] || new Set()).add(fn); return () => bus[e].delete(fn); };
  RI.emit = (e, d) => { if (bus[e]) Array.from(bus[e]).forEach((fn) => fn(d)); };

  /* ---------- کپی ---------- */
  RI.copy = async function (text, msg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let copied=false;try { copied=document.execCommand('copy'); } catch {}
      ta.remove();if(!copied){RI.toast('کپی انجام نشد؛ متن را انتخاب و دستی کپی کن.',{kind:'error'});return;}
    }
    RI.toast(msg || 'کپی شد');
  };

  /* ---------- توست ---------- */
  RI.toast = (msg, opts) => window.ResumeItNotify(msg, opts || {kind:'success'});

  /* ---------- مودال ---------- */
  const stack = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  RI.modal = function (opts) {
    const o = Object.assign({ title: '', body: '', size: 'md', actions: [], dismissible: true }, opts);
    const root = RI.$('#modal-root');
    const prev = document.activeElement;
    const tid = 'mt' + RI.uid();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal modal--' + o.size + '" role="dialog" aria-modal="true" aria-labelledby="' + tid + '">' +
      '<header class="modal__head"><h2 id="' + tid + '">' + RI.esc(o.title) + '</h2>' +
      (o.dismissible ? '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-close aria-label="بستن">' + RI.icon('x') + '</button>' : '') +
      '</header><div class="modal__body"></div><footer class="modal__foot"></footer></div>';
    const box = overlay.firstElementChild;
    const body = box.querySelector('.modal__body');
    const foot = box.querySelector('.modal__foot');
    const api = { el: box, body: body, foot: foot, closed: false };

    api.setBody = (b) => { if (typeof b === 'string') body.innerHTML = b; else { body.innerHTML = ''; body.appendChild(b); } };
    api.setTitle = (t) => { box.querySelector('h2').textContent = t; };
    api.setActions = (actions) => {
      foot.innerHTML = '';
      actions.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + ({ primary: 'btn--primary', danger: 'btn--danger', ice: 'btn--ice', soft: 'btn--soft' }[a.kind] || 'btn--ghost') + (a.push ? ' push' : '');
        b.innerHTML = (a.icon ? RI.icon(a.icon) : '') + RI.esc(a.label);
        if (a.disabled) b.disabled = true;
        if (a.id) b.dataset.id = a.id;
        b.addEventListener('click', (e) => {
          if (b.disabled) return;
          const r = a.onClick ? a.onClick(api, e, b) : undefined;
          if (!a.keepOpen && r !== false) api.close(a.value);
        });
        foot.appendChild(b);
      });
    };
    api.close = (value) => {
      if (api.closed) return;
      api.closed = true;
      const i = stack.indexOf(api);
      if (i > -1) stack.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      const finish = () => {
        overlay.remove();
        if (prev && prev.focus && document.contains(prev)) prev.focus();
        if (o.onClose) o.onClose(value);
      };
      if (RI.reduceMotion()) finish();
      else { overlay.classList.add('is-closing'); setTimeout(finish, 170); }
    };

    function onKey(e) {
      if (stack[stack.length - 1] !== api) return;
      if (e.key === 'Escape' && o.dismissible) { e.stopPropagation(); api.close(); }
      if (e.key === 'Tab') {
        const f = RI.$$(FOCUSABLE, box).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    api.setBody(o.body);
    api.setActions(o.actions);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && o.dismissible) api.close(); });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
    root.appendChild(overlay);
    stack.push(api);
    document.addEventListener('keydown', onKey, true);
    if (o.onMount) o.onMount(api);
    requestAnimationFrame(() => {
      const target = box.querySelector('[autofocus]') || box.querySelector('.modal__body ' + FOCUSABLE.split(',').join(',.modal__body ')) || box.querySelector('.modal__foot button:last-child');
      if (target) target.focus();
    });
    return api;
  };

  RI.confirm = function (o) {
    return new Promise((resolve) => {
      let result = false;
      RI.modal({
        size: 'sm', title: o.title,
        body: '<div class="confirm">' + (o.icon ? '<div class="confirm__ico ' + (o.danger ? 'is-danger' : '') + '">' + RI.icon(o.icon) + '</div>' : '') + '<p>' + o.text + '</p></div>' + (o.extra || ''),
        actions: [
          { label: o.cancelLabel || 'انصراف', kind: 'ghost' },
          { label: o.confirmLabel || 'تأیید', kind: o.danger ? 'danger' : 'primary', onClick: () => { result = true; } },
        ],
        onClose: () => resolve(result),
      });
    });
  };

  /* گزینه‌های چندگانه؛ مقدار انتخاب‌شده یا null */
  RI.choice = function (o) {
    return new Promise((resolve) => {
      let val = null;
      RI.modal({
        size: 'sm', title: o.title,
        body: '<p class="confirm-text">' + o.text + '</p>',
        actions: o.options.map((x) => ({ label: x.label, kind: x.kind || 'ghost', icon: x.icon, onClick: () => { val = x.value; } })),
        onClose: () => resolve(val),
      });
    });
  };

  /* ---------- منوی کشویی ---------- */
  let activeMenu;
  RI.menu = function (anchor, items, opts) {
    opts = opts || {};
    activeMenu?.close();
    const m = document.createElement('div');
    m.className = 'menu';
    m.setAttribute('role', 'menu');
    m.id='menu-'+RI.uid();anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-controls',m.id);
    items.forEach((it) => {
      if (it === 'hr') { m.appendChild(document.createElement('hr')); return; }
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitem');
      if (it.danger) b.className = 'is-danger';
      b.innerHTML = (it.icon ? RI.icon(it.icon) : '') + '<span>' + RI.esc(it.label) + '</span>';
      b.addEventListener('click', () => { close(); it.onClick && it.onClick(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = opts.alignEnd ? r.right - mw : r.left;
    left = RI.clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 8;
    if (top + mh > window.innerHeight - 8 || opts.up) top = Math.max(8, r.top - mh - 8);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    const first = m.querySelector('button'); if (first) first.focus({preventScroll:true});
    let closed=false;
    function close() { if(closed)return;closed=true;document.removeEventListener('mousedown', outside, true);document.removeEventListener('keydown', key, true);window.removeEventListener('resize',close);document.removeEventListener('scroll',scroll,true);m.remove();anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-controls');if(anchor.isConnected)anchor.focus({preventScroll:true});if(activeMenu?.element===m)activeMenu=null; }
    function outside(e) { if (!m.contains(e.target)) close(); }
    function scroll(e){if(!m.contains(e.target))close();}
    function key(e) {
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.key==='Tab'){close();return;}
      if(e.key==='Home'||e.key==='End'){e.preventDefault();const bs=RI.$$('button',m);bs[e.key==='Home'?0:bs.length-1]?.focus();return;}
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const bs = RI.$$('button', m); const i = bs.indexOf(document.activeElement);
        bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
      }
    }
    document.addEventListener('mousedown', outside, true);document.addEventListener('keydown', key, true);window.addEventListener('resize',close);document.addEventListener('scroll',scroll,true);
    activeMenu={close,element:m};return activeMenu;
  };

  /* ---------- FLIP: انیمیشن جابه‌جایی آیتم‌ها ---------- */
  RI.flip = function (container, mutate, sel) {
    sel = sel || '[data-id]';
    const first = new Map();
    container.querySelectorAll(sel).forEach((e) => first.set(e.dataset.id, e.getBoundingClientRect()));
    mutate();
    if (RI.reduceMotion()) return;
    container.querySelectorAll(sel).forEach((e) => {
      const f = first.get(e.dataset.id);
      if (!f) return;
      const l = e.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (!dx && !dy) return;
      e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.22,.8,.28,1)' });
    });
  };

  /* ---------- کشیدن و رها کردن (ماوس و لمس) ---------- */
  RI.sortable = function (container, opts) {
    const itemSel = opts.itemSel || '.row';
    const handleSel = opts.handle || '.row__grip';
    let drag = null;
    container.addEventListener('pointerdown', (e) => {
      const h = e.target.closest(handleSel);
      if (!h || !container.contains(h)) return;
      const item = h.closest(itemSel);
      if (!item) return;
      e.preventDefault();
      const items = Array.from(container.querySelectorAll(itemSel));
      drag = { item, from: items.indexOf(item), to: items.indexOf(item), h };
      item.classList.add('is-dragging');
      try { h.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });
    container.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const items = Array.from(container.querySelectorAll(itemSel));
      let target = items.length - 1;
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { target = i; break; }
      }
      drag.to = target;
      items.forEach((it, i) => it.classList.toggle('is-over', i === target && i !== drag.from));
    });
    const end = () => {
      if (!drag) return;
      const { item, from, to } = drag;
      item.classList.remove('is-dragging');
      container.querySelectorAll(itemSel).forEach((x) => x.classList.remove('is-over'));
      drag = null;
      if (from !== to) opts.onReorder(from, to);
    };
    container.addEventListener('pointerup', end);
    container.addEventListener('pointercancel', end);
  };

  RI.move = function (arr, from, to) {
    const x = arr.splice(from, 1)[0];
    arr.splice(to, 0, x);
  };
})();
