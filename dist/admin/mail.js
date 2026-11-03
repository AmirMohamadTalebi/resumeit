/* Owner panel for email: delivery status, the rules for what gets mailed, every template with a live preview and a
   test send, and promotional campaigns sent slowly to people who said yes. */
(() => {
  'use strict';
  const fa = n => Number(n || 0).toLocaleString('fa-IR'), $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = n => (window.RI && window.RI.icon ? window.RI.icon(n) : '');
  const STATUS = { draft: 'پیش‌نویس', sending: 'در حال ارسال', done: 'تمام شد', cancelled: 'لغو شد' };
  const when = ms => ms ? new Date(Number(ms)).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  let data = null, previewTimer;

  async function call(route, body) {
    const response = await fetch('/api/admin/mail' + route, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'درخواست انجام نشد');
    return result;
  }
  const say = (el, text, kind) => { if (el) { el.textContent = text; el.dataset.kind = kind || ''; } };

  function campaign(c) {
    const total = Number(c.total), done = Number(c.sent) + Number(c.failed), pct = total ? Math.round(done / total * 100) : 0;
    return '<article class="ml-camp" data-camp="' + esc(c.id) + '"><header><strong>' + esc(c.title) + '</strong><span class="ml-pill" data-s="' + esc(c.status) + '">' + (STATUS[c.status] || c.status) + '</span></header>' +
      '<div class="ml-meter" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<p>' + fa(c.sent) + ' ارسال‌شده از ' + fa(total) + (Number(c.failed) ? ' · ' + fa(c.failed) + ' ناموفق' : '') + ' · ' + when(c.started_at || c.created_at) + '</p>' +
      '<div class="ml-actions">' + (c.status === 'draft' ? '<button type="button" class="btn ml-go" data-send>' + icon('rocket') + 'شروع ارسال</button>' : '') + (['draft', 'sending'].includes(c.status) ? '<button type="button" class="btn" data-cancel>لغو</button>' : '') + '</div></article>';
  }

  function render(d) {
    data = d; const s = d.stats;
    return '<div class="ml" data-ml-root>' +
      '<section class="ml-hero"><div><h2>' + icon('mail') + 'ایمیل رزومیت</h2><p>همهٔ ایمیل‌ها با یک قالب هماهنگ با سایت ساخته می‌شوند. خبرهای مهم خودکارند؛ ایمیل تبلیغاتی فقط برای کسانی می‌رود که خودشان تأیید کرده‌اند.</p></div>' +
      '<span class="ml-state" data-ok="' + d.configured + '">' + (d.configured ? 'ارسال آماده است' : 'ارسال تنظیم نشده') + '</span></section>' +
      (d.configured ? '' : '<p class="ml-warn">برای فعال شدن، متغیرهای SMTP را روی هاست بگذار (راهنما: docs/notification-delivery-setup.md).</p>') +
      (d.configured && !d.unsubscribe ? '<p class="ml-warn">برای پیوند لغو دریافت، یک مقدار UNSUBSCRIBE_SECRET روی هاست بگذار.</p>' : '') +
      '<div class="ml-kpis"><div><span>مخاطب تبلیغات</span><strong>' + fa(s.audience) + '</strong><small>ایمیل تأییدشده و موافق</small></div><div><span>ایمیل‌های تأییدشده</span><strong>' + fa(s.verifiedEmails) + '</strong><small>از ' + fa(s.users) + ' حساب</small></div><div><span>پوشش</span><strong>' + (s.users ? fa(Math.round(s.verifiedEmails / s.users * 100)) : '۰') + '٪</strong><small>حساب‌هایی با ایمیل</small></div></div>' +
      '<section class="ml-card"><h3>' + icon('shield') + 'چه چیزی ایمیل می‌شود</h3><div class="ml-rules"><div><b>همیشه</b><ul>' + d.rules.important.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div><div><b>هرگز</b><ul>' + d.rules.never.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div></div></section>' +
      '<section class="ml-card"><h3>' + icon('palette') + 'قالب‌ها</h3><div class="ml-tpl">' + d.templates.map(t => '<article><strong>' + esc(t.label) + '</strong><div><button type="button" class="btn" data-preview="' + esc(t.key) + '">پیش‌نمایش</button><button type="button" class="btn" data-test="' + esc(t.key) + '">ارسال آزمایشی به من</button></div></article>').join('') + '</div><p class="ml-note" data-ml-status></p></section>' +
      '<section class="ml-card"><h3>' + icon('sparkle') + 'کمپین تبلیغاتی تازه</h3><div class="ml-compose"><form data-ml-form novalidate>' +
      '<label>عنوان<input class="input" name="title" maxlength="120" placeholder="مثلاً: قالب‌های تازه رسیدند"></label>' +
      '<label>متن (هر خط یک بند)<textarea class="input" name="body" rows="6" maxlength="1500" placeholder="چند جملهٔ کوتاه و صمیمی"></textarea></label>' +
      '<div class="ml-two"><label>متن دکمه<input class="input" name="cta" maxlength="40" placeholder="دیدن قالب‌ها"></label><label>نشانی دکمه<input class="input" name="url" dir="ltr" maxlength="300" placeholder="/dashboard/"></label></div>' +
      '<div class="ml-actions"><button type="submit" class="btn ml-go">ذخیرهٔ پیش‌نویس</button><button type="button" class="btn" data-test="promo">ارسال آزمایشی به من</button></div><p class="ml-note" data-ml-form-status></p></form>' +
      '<div class="ml-frame"><iframe title="پیش‌نمایش ایمیل" sandbox="" data-ml-frame></iframe></div></div></section>' +
      '<section class="ml-card"><h3>' + icon('clock') + 'کمپین‌ها</h3><div class="ml-camps">' + (d.campaigns.length ? d.campaigns.map(campaign).join('') : '<p class="ml-note">هنوز کمپینی نساخته‌ای. بعد از ساخت پیش‌نویس، «شروع ارسال» لیست مخاطبان را همان لحظه ثابت می‌کند و ایمیل‌ها آرام و پشت‌سرهم می‌روند.</p>') + '</div></section>' +
      '<dialog class="ml-dialog" data-ml-dialog><header><strong data-ml-dialog-title></strong><button type="button" class="btn" data-close>بستن</button></header><iframe title="پیش‌نمایش قالب" sandbox="" data-ml-dialog-frame></iframe></dialog></div>';
  }

  const formData = () => { const f = $('[data-ml-form]'); return Object.fromEntries(['title', 'body', 'cta', 'url'].map(k => [k, f.elements[k].value])); };
  async function livePreview() {
    const f = $('[data-ml-form]'); if (!f) return;
    try { const r = await call('/preview', { kind: 'promo', data: Object.fromEntries(Object.entries(formData()).filter(([, v]) => v.trim())) }); $('[data-ml-frame]').srcdoc = r.html; } catch { /* the preview is only a convenience */ }
  }
  async function refresh(message) {
    const host = $('#content'); host.innerHTML = render(await call('')); livePreview();
    if (message) say($('[data-ml-status]'), message, 'ok');
  }

  window.adminMail = d => { requestAnimationFrame(livePreview); return render(d); };

  document.addEventListener('input', e => { if (e.target.closest('[data-ml-form]')) { clearTimeout(previewTimer); previewTimer = setTimeout(livePreview, 350); } });
  document.addEventListener('submit', async e => {
    const form = e.target.closest('[data-ml-form]'); if (!form) return; e.preventDefault();
    const status = $('[data-ml-form-status]'), button = form.querySelector('[type=submit]'); button.disabled = true; say(status, 'در حال ذخیره…');
    try { await call('/campaign', formData()); await refresh(); say($('[data-ml-form-status]'), 'پیش‌نویس ذخیره شد؛ از فهرست پایین می‌توانی ارسالش را شروع کنی.', 'ok'); }
    catch (error) { say(status, error.message, 'error'); button.disabled = false; }
  });
  document.addEventListener('click', async e => {
    const root = e.target.closest('[data-ml-root]'); if (!root) return;
    const preview = e.target.closest('[data-preview]');
    if (preview) {
      try { const r = await call('/preview', { kind: preview.dataset.preview }); const dialog = $('[data-ml-dialog]'); $('[data-ml-dialog-title]').textContent = r.subject; $('[data-ml-dialog-frame]').srcdoc = r.html; dialog.showModal(); }
      catch (error) { say($('[data-ml-status]'), error.message, 'error'); }
      return;
    }
    if (e.target.closest('[data-close]')) { $('[data-ml-dialog]').close(); return; }
    const test = e.target.closest('[data-test]');
    if (test) {
      const kind = test.dataset.test, status = kind === 'promo' ? $('[data-ml-form-status]') : $('[data-ml-status]'); test.disabled = true; say(status, 'در حال ارسال…');
      try { const r = await call('/test', { kind, ...(kind === 'promo' ? Object.fromEntries(Object.entries(formData()).filter(([, v]) => v.trim())) : {}) }); say(status, 'ارسال شد به ' + r.to, 'ok'); }
      catch (error) { say(status, error.message, 'error'); } finally { test.disabled = false; }
      return;
    }
    const card = e.target.closest('[data-camp]');
    if (card && e.target.closest('[data-send]')) {
      if (!confirm('ایمیل برای همهٔ مخاطبان موافق ارسال می‌شود و بعد از شروع فقط می‌توانی ادامه‌اش را لغو کنی. شروع شود؟')) return;
      try { const r = await call('/campaign/send', { id: card.dataset.camp }); await refresh('ارسال برای ' + fa(r.total) + ' نفر شروع شد.'); } catch (error) { alert(error.message); }
    }
    if (card && e.target.closest('[data-cancel]')) { try { await call('/campaign/cancel', { id: card.dataset.camp }); await refresh('کمپین لغو شد.'); } catch (error) { alert(error.message); } }
  });
})();
