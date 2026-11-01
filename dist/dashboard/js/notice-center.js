/* مرکز اعلان: the bell opens a small night-sky panel with the latest events (newest first, unread lit in gold), a
   switch between all and unread, "read all", and ways to the full list and its settings. The full page stays at
   /dashboard/notifications/. On phones it rises as a bottom sheet. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const KINDS = { publication: ['انتشار', 'globe'], payments: ['پرداخت و خرید', 'card'], support: ['پشتیبانی', 'help'], product: ['خبرهای رزومیت', 'sparkle'] };
  const ago = t => { const s = (Date.now() - Number(t)) / 1000; if (s < 3600) return RI.fa(Math.max(1, Math.floor(s / 60))) + ' دقیقه پیش'; if (s < 86400) return RI.fa(Math.floor(s / 3600)) + ' ساعت پیش'; if (s < 604800) return RI.fa(Math.floor(s / 86400)) + ' روز پیش'; return RI.date(Number(t)); };

  RI.mountNoticeCenter = bell => {
    const badge = document.createElement('span'); badge.className = 'nc-badge'; badge.hidden = true; badge.setAttribute('aria-hidden', 'true'); bell.append(badge);
    bell.setAttribute('aria-haspopup', 'dialog'); bell.setAttribute('aria-expanded', 'false'); bell.setAttribute('aria-controls', 'notice-center');
    let panel = null, view = 'all', busy = false, last = 0;

    const paintBadge = () => {
      const n = RI.inbox?.unread || 0;
      if (n > last) { bell.classList.remove('is-ringing'); void bell.offsetWidth; bell.classList.add('is-ringing'); }
      last = n; badge.hidden = !n; badge.textContent = n > 9 ? '۹+' : RI.fa(n);
    };
    RI.on('inbox', () => { paintBadge(); if (panel && !busy) paint(); });

    const item = (n, i) => {
      const [label, glyph] = KINDS[n.kind] || ['اعلان', 'bell'], unread = !n.read_at;
      return '<li class="nc-item' + (unread ? ' is-unread' : '') + '" style="--i:' + i + '"><a href="' + esc(n.url || RI.routeUrl('notifications')) + '" data-nc-open="' + esc(n.id) + '"><span class="nc-item__orb">' + RI.icon(glyph) + '</span><span class="nc-item__main"><b>' + esc(n.title) + '</b>' + (n.body ? '<span>' + esc(n.body) + '</span>' : '') + '<small>' + label + ' · ' + ago(n.created_at) + '</small></span>' + (unread ? '<i class="nc-item__dot" aria-label="خوانده‌نشده"></i>' : '') + '</a></li>';
    };
    function paint() {
      const inbox = RI.inbox || { rows: [], unread: 0 }, rows = (inbox.rows || []).filter(n => view === 'all' || !n.read_at).slice(0, 8);
      panel.querySelector('[data-nc-count]').textContent = inbox.unread ? RI.fa(inbox.unread) + ' تازه' : 'همه خوانده شد';
      panel.querySelector('[data-nc-count]').classList.toggle('is-quiet', !inbox.unread);
      panel.querySelector('[data-nc-readall]').disabled = !inbox.unread;
      panel.querySelectorAll('[data-nc-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ncView === view)));
      panel.querySelector('[data-nc-list]').innerHTML = rows.length ? '<ul>' + rows.map(item).join('') + '</ul>'
        : '<div class="nc-empty"><svg viewBox="0 0 64 64" aria-hidden="true"><path class="nc-empty__bell" d="M32 10c-9 0-15 7-15 16v9l-5 8h40l-5-8v-9c0-9-6-16-15-16z"/><path class="nc-empty__clap" d="M26 48a6 6 0 0012 0"/><path class="nc-empty__check" d="M24 27l6 6 10-11"/></svg><b>' + (view === 'unread' ? 'چیز تازه‌ای نمانده' : 'هنوز اعلانی نیست') + '</b><span>انتشار، پرداخت و جواب پشتیبانی این‌جا خبر داده می‌شوند.</span></div>';
    }
    async function refresh() {
      busy = true; panel.classList.add('is-loading');
      try { RI.inbox = await RI.dashboardRequest('notifications'); RI.emit('inbox'); }
      catch (e) { if (!RI.inbox) panel.querySelector('[data-nc-list]').innerHTML = '<p class="nc-error" role="alert">' + esc(e.message) + '</p>'; }
      finally { busy = false; if (panel) { panel.classList.remove('is-loading'); if (RI.inbox) paint(); } }
    }
    const place = () => {
      if (!panel || matchMedia('(max-width:760px)').matches) { panel?.style.removeProperty('top'); panel?.style.removeProperty('left'); return; }
      const r = bell.getBoundingClientRect(), w = panel.offsetWidth;
      panel.style.top = Math.round(r.bottom + 12) + 'px';
      panel.style.left = Math.round(Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w + 34))) + 'px';
      panel.style.setProperty('--nc-tip', Math.round(r.left + r.width / 2 - parseFloat(panel.style.left)) + 'px');
    };
    const outside = e => { if (panel && !panel.contains(e.target) && !bell.contains(e.target)) close(); };
    const keys = e => { if (e.key === 'Escape') { close(); bell.focus(); } };
    function close() {
      if (!panel) return; const p = panel; panel = null;
      bell.setAttribute('aria-expanded', 'false'); bell.classList.remove('is-open');
      document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keys); removeEventListener('resize', place);
      p.classList.add('is-leaving'); p.previousElementSibling?.classList.contains('nc-scrim') && p.previousElementSibling.classList.add('is-leaving');
      setTimeout(() => { p.previousElementSibling?.classList.contains('nc-scrim') && p.previousElementSibling.remove(); p.remove(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
    }
    function open() {
      const scrim = document.createElement('div'); scrim.className = 'nc-scrim'; scrim.setAttribute('aria-hidden', 'true');
      panel = document.createElement('section'); panel.className = 'nc'; panel.id = 'notice-center';
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'اعلان‌ها');
      panel.innerHTML = '<span class="nc-grab" aria-hidden="true"></span><header class="nc-head"><span class="nc-head__bell">' + RI.icon('bell') + '</span><div><h2>اعلان‌ها</h2><em data-nc-count></em></div><button type="button" class="nc-x" data-nc-close aria-label="بستن">' + RI.icon('x') + '</button></header>' +
        '<div class="nc-bar"><div class="nc-views" role="group" aria-label="نمایش"><button type="button" data-nc-view="all">همه</button><button type="button" data-nc-view="unread">تازه‌ها</button></div><button type="button" class="nc-readall" data-nc-readall>' + RI.icon('check') + 'همه را خواندم</button></div>' +
        '<div class="nc-list" data-nc-list><div class="nc-skel"></div><div class="nc-skel"></div><div class="nc-skel"></div></div>' +
        '<footer class="nc-foot"><a href="' + RI.routeUrl('notifications') + '" data-nc-go="inbox">' + RI.icon('bell') + 'همهٔ اعلان‌ها</a><a href="' + RI.routeUrl('notifications', { tab: 'preferences' }) + '" data-nc-go="preferences">' + RI.icon('settings') + 'تنظیمات اعلان</a></footer>';
      document.body.append(scrim, panel); place();
      bell.setAttribute('aria-expanded', 'true'); bell.classList.add('is-open');
      document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', keys); addEventListener('resize', place, { passive: true });
      if (RI.inbox) paint();
      panel.addEventListener('click', async e => {
        const t = e.target.closest('[data-nc-close],[data-nc-view],[data-nc-readall],[data-nc-go],[data-nc-open]'); if (!t) return;
        if (t.dataset.ncClose !== undefined) { close(); bell.focus(); return; }
        if (t.dataset.ncView) { view = t.dataset.ncView; paint(); return; }
        if (t.dataset.ncGo) { e.preventDefault(); close(); RI.go('notifications', t.dataset.ncGo === 'preferences' ? { tab: 'preferences' } : undefined); return; }
        if (t.dataset.ncReadall !== undefined) {
          t.disabled = true; panel.classList.add('is-clearing');
          try { await RI.dashboardRequest('notifications/read', {}); await refresh(); RI.toast('همهٔ اعلان‌ها خوانده شد', { kind: 'success' }); }
          catch (err) { RI.toast(err.message, { kind: 'error' }); t.disabled = false; }
          finally { panel?.classList.remove('is-clearing'); }
          return;
        }
        const row = (RI.inbox?.rows || []).find(n => String(n.id) === t.dataset.ncOpen);
        if (row && !row.read_at) RI.dashboardRequest('notifications/read', { id: row.id }).catch(() => {});
        const url = new URL(t.href, location.href);
        if (url.origin === location.origin && url.pathname.startsWith('/dashboard/')) { e.preventDefault(); close(); const id = url.pathname.replace(/^\/dashboard\/?/, '').split('/')[0] || 'home'; RI.go(id, Object.fromEntries(url.searchParams)); }
        else close();
      });
      requestAnimationFrame(() => panel?.querySelector('[data-nc-close]').focus({ preventScroll: true }));
      refresh();
    }
    bell.addEventListener('click', () => (panel ? close() : open()));
    addEventListener('popstate', close);
    paintBadge();
  };
})();
