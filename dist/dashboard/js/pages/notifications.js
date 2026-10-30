/* اعلان‌ها: یک فهرست ساده و آرام؛ تنظیمات فقط وقتی لازم است باز می‌شود. */
(() => {
 'use strict';
 const RI = window.RI, esc = RI.esc;
 const KINDS = { publication: ['انتشار', 'globe'], payments: ['پرداخت و خرید', 'card'], support: ['پشتیبانی', 'help'], product: ['خبرهای رزومیت', 'sparkle'] };
 const ago = t => { const s = (Date.now() - Number(t)) / 1000; if (s < 3600) return RI.fa(Math.max(1, Math.floor(s / 60))) + ' دقیقه پیش'; if (s < 86400) return RI.fa(Math.floor(s / 3600)) + ' ساعت پیش'; if (s < 604800) return RI.fa(Math.floor(s / 86400)) + ' روز پیش'; return RI.date(Number(t)); };

 RI.registerPage('notifications', {
  title: 'اعلان‌ها',
  render(ctx) {
   const tab = ['unread', 'preferences'].includes(ctx.opts?.tab) ? ctx.opts.tab : 'inbox';
   return '<div class="nv nv-notes"><header class="nv-head"><div><h1 id="page-title" tabindex="-1">اعلان‌ها</h1><p data-notes-sub>رویدادهای حسابت؛ چیز مهمی جا نمی‌ماند.</p></div><div class="nv-head__actions"><button type="button" class="btn btn--ghost btn--sm" data-read-all>' + RI.icon('check') + 'همه را خواندم</button></div></header>' +
    '<section class="nv-card nv-notes__card"><div class="nv-notes__bar"><div class="nv-seg" role="tablist" aria-label="نمایش">' + [['inbox', 'همه'], ['unread', 'خوانده‌نشده'], ['preferences', 'تنظیمات']].map(([id, label]) => '<button type="button" role="tab" data-workspace-tab="' + id + '" aria-selected="' + (id === tab) + '">' + label + '</button>').join('') + '</div>' +
    '<label class="nv-notes__kind" data-kind-filter><span class="sr-only">موضوع</span><select class="select" id="notice-kind"><option value="">همهٔ موضوعات</option>' + Object.entries(KINDS).map(([id, [label]]) => '<option value="' + id + '">' + label + '</option>').join('') + '</select></label><button class="nv-icon-btn" type="button" data-refresh aria-label="به‌روزرسانی">' + RI.icon('refresh') + '</button></div>' +
    '<div id="notification-body" aria-live="polite"></div></section></div>';
  },
  mount(root, ctx) {
   const body = root.querySelector('#notification-body');
   let tab = ['unread', 'preferences'].includes(ctx.opts?.tab) ? ctx.opts.tab : 'inbox', kind = '', alive = true, next = null, rows = [], preferences = {}, serial = 0;
   const select = id => { tab = id; root.querySelectorAll('[data-workspace-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.workspaceTab === id))); root.querySelector('[data-kind-filter]').hidden = id === 'preferences'; RI.setRouteTab(id, 'inbox'); };
   function item(n) {
    const [label, glyph] = KINDS[n.kind] || ['اعلان', 'bell'], unread = !n.read_at;
    return '<li class="notification-item nv-note-item' + (unread ? ' is-unread' : '') + '"><span class="nv-note-item__ico">' + RI.icon(glyph) + '</span><div class="nv-note-item__main"><h3 class="nv-note-item__title"><a href="' + esc(n.url) + '"' + (unread ? ' data-read-on-open="' + n.id + '"' : '') + '>' + esc(n.title) + '</a></h3><p>' + esc(n.body) + '</p><small>' + label + ' · ' + ago(n.created_at) + '</small></div>' + (unread ? '<button class="nv-icon-btn" type="button" data-read="' + n.id + '" aria-label="علامت خوانده‌شده" title="خواندم">' + RI.icon('check') + '</button>' : '') + '</li>';
   }
   function paint() {
    if (tab === 'preferences') {
     body.innerHTML = '<div class="nv-notes__prefs"><section class="nv-set"><div class="nv-set__head"><h3>پیام کوتاه داخل سایت</h3><p>رویدادها همیشه در این فهرست می‌مانند؛ این‌جا فقط تعیین می‌کنی کدام‌ها هنگام وقوع، پیام کوتاه نشان دهند.</p></div><ul class="nv-list">' + Object.entries(KINDS).map(([id, [label, glyph]]) => '<li class="nv-row"><span class="nv-ico nv-ico--blue">' + RI.icon(glyph) + '</span><span class="nv-row__main"><span class="nv-row__title">' + label + '</span></span>' + RI.switchHtml({ checked: preferences[id] !== false, label: 'پیام کوتاه ' + label }).replace('<input', '<input data-notice-pref="' + id + '"') + '</li>').join('') + '</ul><button class="btn btn--soft btn--sm" type="button" data-save-notices>ذخیرهٔ انتخاب‌ها</button></section><section class="nv-set"><div class="nv-set__head"><h3>ایمیل، پیامک و اعلان مرورگر</h3><p>کانال‌های بیرون از سایت و اجازهٔ هر دستگاه.</p></div><div data-notification-channels></div></section></div>';
     RI.mountNotificationChannels(body.querySelector('[data-notification-channels]')); return;
    }
    body.innerHTML = rows.length ? '<ul class="nv-note-list">' + rows.map(item).join('') + '</ul>' + (next ? '<div class="nv-notes__more"><button class="btn btn--ghost btn--sm" type="button" data-more>اعلان‌های قبلی</button><span class="nv-status" data-more-status role="status"></span></div>' : '')
     : '<div class="nv-empty"><span class="nv-ico nv-ico--blue">' + RI.icon('bell') + '</span><b>' + (tab === 'unread' ? 'همه را خوانده‌ای' : 'اعلانی نیست') + '</b><p>رویدادهای انتشار، پرداخت و پشتیبانی این‌جا جمع می‌شوند.</p></div>';
   }
   async function load(more = false) {
    if (tab === 'preferences' && !more && Object.keys(preferences).length) { paint(); return; }
    const request = ++serial;
    if (more) { const b = body.querySelector('[data-more]'); if (b) b.disabled = true; } else body.innerHTML = '<div class="nv-skeleton" style="height:56px"></div>';
    try {
     const result = await RI.dashboardRequest('notifications?' + new URLSearchParams({ kind, unread: tab === 'unread' ? '1' : '0', ...(more && next ? { before: next } : {}) }));
     if (!alive || request !== serial) return;
     rows = more ? rows.concat(result.rows) : result.rows; preferences = result.preferences; next = result.next; RI.inbox = result; RI.emit('inbox');
     const sub = root.querySelector('[data-notes-sub]'); if (sub) sub.textContent = result.unread ? RI.fa(result.unread) + ' اعلان خوانده‌نشده' : 'همه را خوانده‌ای.';
     paint();
    } catch (e) {
     if (!alive || request !== serial) return;
     if (more && rows.length) { const s = body.querySelector('[data-more-status]'); if (s) { s.dataset.kind = 'error'; s.textContent = e.message; } const b = body.querySelector('[data-more]'); if (b) b.disabled = false; }
     else body.innerHTML = '<p class="nv-status" data-kind="error" role="alert">' + esc(e.message) + '</p><button class="btn btn--soft btn--sm" type="button" data-refresh>تلاش دوباره</button>';
    }
   }
   async function read(id) { try { await RI.dashboardRequest('notifications/read', id ? { id } : {}); await load(); } catch (e) { RI.toast(e.message, { kind: 'error' }); } }
   RI.delegate(root, 'click', '[data-workspace-tab]', (e, b) => { select(b.dataset.workspaceTab); load(); });
   root.addEventListener('change', e => { if (e.target.id === 'notice-kind') { kind = e.target.value; load(); } });
   RI.delegate(root, 'click', '[data-refresh]', () => load());
   RI.delegate(root, 'click', '[data-more]', () => load(true));
   RI.delegate(root, 'click', '[data-read]', (e, b) => read(b.dataset.read));
   RI.delegate(root, 'click', '[data-read-all]', () => read());
   RI.delegate(root, 'click', '[data-read-on-open]', (e, a) => { RI.dashboardRequest('notifications/read', { id: a.dataset.readOnOpen }).catch(() => {}); });
   RI.delegate(root, 'click', '[data-save-notices]', async (e, b) => { b.disabled = true; const values = {}; root.querySelectorAll('[data-notice-pref]').forEach(x => values[x.dataset.noticePref] = x.checked); try { await RI.dashboardRequest('notifications/preferences', values); preferences = values; RI.toast('تنظیم اعلان‌ها ذخیره شد'); } catch (error) { RI.toast(error.message, { kind: 'error' }); } finally { b.disabled = false; } });
   select(tab); load(); return () => { alive = false; };
  },
 });
})();
