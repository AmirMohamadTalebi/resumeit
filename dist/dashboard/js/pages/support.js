/* پشتیبانی: فهرست گفت‌وگوها، گفت‌وگوی باز به شکل پیام‌رسان، فرم تیکت تازه با انتخاب موضوع، و راه‌های دیگر تماس */
(() => {
 'use strict';
 const RI = window.RI, esc = RI.esc;
 const STATUS = { open: ['در انتظار پاسخ', 'warn', 'clock'], answered: ['پاسخ داده شده', 'ok', 'check'], closed: ['بسته شده', '', 'lock'] };
 const DEPARTMENTS = { sales: 'فروش', finance: 'مالی', technical: 'فنی', account: 'حساب کاربری', general: 'عمومی' };
 const TOPICS = [['sales', 'خرید و اشتراک', 'crown', 'پیش از خرید، تخفیف، دوره‌ها'], ['payment', 'کیف پول و پرداخت', 'card', 'شارژ نشدن، فاکتور، بازگشت وجه'], ['account', 'حساب و ورود', 'key', 'ورود، کد تأیید، شماره و رمز'], ['editor', 'طراحی و ویرایش', 'palette', 'قالب، رنگ، بخش‌های رزومه'], ['publication', 'انتشار صفحه', 'globe', 'آدرس، دامنه، دیده‌نشدن صفحه'], ['other', 'سایر', 'help', 'پیشنهاد، گزارش مشکل دیگر']];
 const TOPIC = Object.fromEntries(TOPICS.map(t => [t[0], t[1]]));
 const FILTERS = [['', 'همه', 'total'], ['open', 'در انتظار پاسخ', 'open'], ['answered', 'پاسخ داده شده', 'answered'], ['closed', 'بسته شده', 'closed']];
 const chip = s => { const [label, kind, glyph] = STATUS[s] || STATUS.open; return '<span class="nv-chip' + (kind ? ' nv-chip--' + kind : '') + '">' + RI.icon(glyph) + label + '</span>'; };
 const ago = t => { const s = (Date.now() - Number(t)) / 1000; if (s < 60) return 'همین حالا'; if (s < 3600) return RI.fa(Math.floor(s / 60)) + ' دقیقه پیش'; if (s < 86400) return RI.fa(Math.floor(s / 3600)) + ' ساعت پیش'; if (s < 604800) return RI.fa(Math.floor(s / 86400)) + ' روز پیش'; return RI.date(Number(t)); };

 function aside() {
  return '<aside class="nv-stack nv-support__side" data-mtab="help"><section class="nv-card"><div class="nv-card__head"><div><h2>' + RI.icon('zap') + 'راه‌های سریع‌تر</h2><p>برای سؤال کوتاه، این‌ها زودتر جواب می‌دهند.</p></div></div><ul class="nv-list">' +
   [['https://t.me/amirtalebi_x', 'پشتیبانی تلگرام', 'گفت‌وگوی مستقیم در ساعت کاری', 'telegram'], ['https://t.me/resumeit_ir', 'کانال رزومیت', 'خبرها، اختلال‌ها و نسخه‌های تازه', 'telegram'], ['/contact/', 'ارتباط با ما', 'ایمیل و راه‌های رسمی تماس', 'mail'], ['/changes/', 'تغییرات رزومیت', 'شاید مشکلت در نسخهٔ تازه حل شده', 'refresh']]
    .map(([href, title, meta, glyph]) => '<li><a class="nv-row" href="' + href + '"' + (href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '') + '><span class="nv-ico nv-ico--blue">' + RI.icon(glyph) + '</span><span class="nv-row__main"><span class="nv-row__title">' + title + '</span><span class="nv-row__meta">' + meta + '</span></span>' + RI.icon(href.startsWith('http') ? 'external' : 'chevL') + '</a></li>').join('') + '</ul></section>' +
   '<section class="nv-card nv-card--flat"><div class="nv-card__head"><div><h2>' + RI.icon('shield') + 'پیش از نوشتن</h2></div></div><ul class="nv-tips"><li>برای پرداخت، شمارهٔ فاکتور یا کد پیگیری بانک را بنویس.</li><li>برای مشکل صفحه، آدرس صفحه و یک تصویر از خطا بفرست.</li><li>رمز عبور، کد پیامکی یا اطلاعات کارت را هرگز نفرست.</li></ul></section></aside>';
 }

 RI.registerPage('support', {
  title: 'پشتیبانی',
  render() {
   return '<div class="nv nv-support"><header class="nv-head"><div><p class="nv-head__eyebrow">' + RI.icon('help') + 'کمک</p><h1 id="page-title" tabindex="-1">پشتیبانی</h1><p>گفت‌وگوهایت با تیم رزومیت این‌جاست. هر پاسخ تازه به اعلان‌هایت هم می‌آید.</p></div><div class="nv-head__actions"><button class="btn btn--primary" type="button" data-new-ticket>' + RI.icon('plus') + 'تیکت تازه</button></div></header>' +
    '<div class="nv-split"><div class="nv-stack" data-mtab="talk"><section class="nv-card nv-support__main" id="support-body" aria-live="polite"></section></div>' + aside() + '</div></div>';
  },
  mount(root, ctx) {
   let alive = true, page = 1, query = '', status = '', ticket = null, requestId = crypto.randomUUID(), timer, busy = false, serial = 0, summary = null;
   const body = root.querySelector('#support-body'), split = root.querySelector('.nv-split');
   split.before(RI.mobileTabs(split, [['talk', 'گفت‌وگوها', 'mail'], ['help', 'راه‌های دیگر', 'zap']], 'support'));
   const paid = () => RI.hasSub();

   function listShell() {
    body.innerHTML = '<div class="nv-card__head"><div><h2>' + RI.icon('mail') + 'گفت‌وگوها</h2><p data-support-count></p></div><label class="nv-search"><span class="sr-only">جست‌وجوی تیکت</span>' + RI.icon('search') + '<input type="search" id="ticket-search" value="' + esc(query) + '" placeholder="موضوع یا شناسه" autocomplete="off"></label></div>' +
     '<div class="nv-seg" role="group" aria-label="وضعیت" data-filters></div><div class="nv-tickets" data-tickets><p class="nv-status" role="status">در حال دریافت گفت‌وگوها…</p></div>';
   }
   function paintFilters() {
    const host = body.querySelector('[data-filters]'); if (!host) return;
    host.innerHTML = FILTERS.map(([id, label, key]) => '<button type="button" data-filter="' + id + '" aria-pressed="' + (status === id) + '">' + label + (summary ? '<span>' + RI.fa(summary[key] || 0) + '</span>' : '') + '</button>').join('');
    const count = body.querySelector('[data-support-count]'); if (count && summary) count.textContent = summary.open ? RI.fa(summary.open) + ' گفت‌وگو منتظر پاسخ ماست' : 'همهٔ گفت‌وگوها پاسخ گرفته‌اند';
   }
   async function list() {
    ticket = null; const load = ++serial;
    if (!body.querySelector('[data-tickets]')) listShell(); paintFilters();
    const host = body.querySelector('[data-tickets]'); host.setAttribute('aria-busy', 'true');
    try {
     const result = await RI.dashboardRequest('support?' + new URLSearchParams({ page, q: query, status }));
     if (!alive || load !== serial) return;
     summary = result.summary; paintFilters(); RI.setNavBadge?.('support', 0);
     host.innerHTML = result.rows.length ? '<ul class="nv-list">' + result.rows.map(t => '<li><button type="button" class="nv-ticket' + (t.status === 'answered' ? ' is-answered' : '') + '" data-ticket="' + t.id + '"><span class="nv-ico' + (t.status === 'answered' ? ' nv-ico--ok' : t.status === 'closed' ? '' : ' nv-ico--warn') + '">' + RI.icon(TOPICS.find(x => x[0] === t.category)?.[2] || 'help') + '</span><span class="nv-row__main"><span class="nv-row__title">' + esc(t.subject) + '</span><span class="nv-row__meta">' + esc(TOPIC[t.category] || 'پشتیبانی') + (t.department ? ' · بخش ' + esc(DEPARTMENTS[t.department] || 'عمومی') : '') + ' · ' + ago(t.updated_at) + '</span></span>' + chip(t.status) + RI.icon('chevL') + '</button></li>').join('') + '</ul>' + (result.total > 25 ? RI.pagination(page, result.total, 25) : '')
      : '<div class="nv-empty"><span class="nv-ico">' + RI.icon('mail') + '</span><b>' + (query || status ? 'گفت‌وگویی با این مشخصات نیست' : 'هنوز گفت‌وگویی شروع نکرده‌ای') + '</b><p>' + (query || status ? 'جست‌وجو یا وضعیت را تغییر بده.' : 'هر سؤال یا مشکلی داری، یک تیکت بساز؛ پاسخ همین‌جا و در اعلان‌ها می‌آید.') + '</p>' + (query || status ? '' : '<button class="btn btn--primary" type="button" data-new-ticket>' + RI.icon('plus') + 'ساخت تیکت</button>') + '</div>';
    } catch (e) { if (alive && load === serial) host.innerHTML = '<p class="nv-status" data-kind="error" role="alert">' + esc(e.message) + '</p><button class="btn btn--soft btn--sm" type="button" data-retry>تلاش دوباره</button>'; }
    finally { host.removeAttribute('aria-busy'); }
   }

   function bubble(m, i) {
    const staff = !!m.staff;
    return '<article class="nv-msg' + (staff ? ' nv-msg--staff' : '') + '"><header><span class="nv-msg__who">' + (staff ? RI.icon('shield') + 'پشتیبانی رزومیت' : RI.icon('user') + 'تو') + '</span><time title="' + esc(RI.date(Number(m.created_at))) + '">' + ago(m.created_at) + '</time></header><p>' + esc(m.body) + '</p><div class="nv-msg__files" data-files="' + i + '"></div></article>';
   }
   async function open(id) {
    clearTimeout(timer); const load = ++serial;
    body.innerHTML = '<p class="nv-status" role="status">در حال دریافت گفت‌وگو…</p>';
    try {
     const t = await RI.dashboardRequest('support?id=' + encodeURIComponent(id));
     if (!alive || load !== serial) return;
     ticket = t; requestId = crypto.randomUUID(); const closed = t.status === 'closed';
     body.innerHTML = '<div class="nv-thread"><div class="nv-thread__head"><button class="nv-icon-btn" type="button" data-back aria-label="همهٔ گفت‌وگوها">' + RI.icon('chevR') + '</button><div class="nv-thread__title"><h2>' + esc(t.subject) + '</h2><p>' + chip(t.status) + '<span class="nv-chip nv-chip--blue">بخش ' + esc(DEPARTMENTS[t.department] || 'عمومی') + '</span><span class="nv-chip">' + esc(TOPIC[t.category] || 'سایر') + '</span><button type="button" class="nv-code" data-copy="' + esc(t.id) + '" title="کپی شناسهٔ تیکت">' + RI.icon('copy') + '<bdi>' + esc(t.id.slice(0, 8)) + '</bdi></button></p></div>' +
      (closed ? '' : '<button class="btn btn--ghost btn--sm" type="button" data-ticket-status="closed">' + RI.icon('check') + 'مشکلم حل شد</button>') + '</div>' +
      '<div class="nv-thread__body" data-thread>' + t.messages.map(bubble).join('') + '</div>' +
      (closed ? '<div class="nv-thread__closed">' + RI.icon('lock') + '<span>این گفت‌وگو بسته شده است. اگر مشکل دوباره پیش آمد، بازش کن.</span><button class="btn btn--soft btn--sm" type="button" data-ticket-status="open">' + RI.icon('undo') + 'باز کردن دوباره</button></div>'
       : '<form id="ticket-reply" class="nv-composer"><label class="sr-only" for="reply-body">پاسخ تازه</label><textarea class="textarea" id="reply-body" maxlength="6000" rows="3" required placeholder="پیامت را بنویس… (Ctrl+Enter برای ارسال)"></textarea><div class="nv-composer__files"></div><div class="nv-composer__foot"><span class="nv-status" data-send-status role="status"></span><button class="btn btn--primary" type="submit">' + RI.icon('mail') + 'ارسال</button></div></form>') + '</div>';
     body.querySelectorAll('[data-files]').forEach(el => { el.innerHTML = ResumeSupportFiles.links(t.messages[Number(el.dataset.files)].attachments, false); });
     body.querySelector('.nv-composer__files')?.insertAdjacentHTML('beforeend', ResumeSupportFiles.input(paid()));
     const thread = body.querySelector('[data-thread]'); thread.scrollTop = thread.scrollHeight;
     history.replaceState(history.state, '', '/dashboard/support/?ticket=' + encodeURIComponent(t.id));
    } catch (e) { if (alive && load === serial) body.innerHTML = '<p class="nv-status" data-kind="error" role="alert">' + esc(e.message) + '</p><button class="btn btn--soft btn--sm" type="button" data-back>بازگشت</button>'; }
   }

   function create() {
    clearTimeout(timer); ++serial; ticket = null; requestId = crypto.randomUUID();
    body.innerHTML = '<form id="ticket-create" class="nv-form"><div class="nv-thread__head"><button class="nv-icon-btn" type="button" data-back aria-label="انصراف">' + RI.icon('chevR') + '</button><div class="nv-thread__title"><h2>تیکت تازه</h2><p>موضوع را انتخاب کن تا مستقیم به بخش درست برسد.</p></div></div>' +
     '<fieldset class="nv-topics"><legend class="field__label">موضوع</legend>' + TOPICS.map(([id, label, glyph, hint], i) => '<label class="nv-topic"><input type="radio" name="ticket-category" value="' + id + '"' + (id === 'other' ? ' checked' : '') + '><span class="nv-ico">' + RI.icon(glyph) + '</span><span><b>' + label + '</b><small>' + hint + '</small></span></label>').join('') + '</fieldset>' +
     '<div class="field"><label class="field__label" for="ticket-subject">عنوان کوتاه</label><input class="input" id="ticket-subject" maxlength="120" minlength="3" required placeholder="مثلاً: کیف پولم بعد از پرداخت شارژ نشد"></div>' +
     '<div class="field"><label class="field__label" for="ticket-message">چه اتفاقی افتاده؟</label><textarea class="textarea" id="ticket-message" maxlength="6000" minlength="10" rows="6" required placeholder="مراحلی که رفتی و پیامی که دیدی را بنویس."></textarea></div>' +
     '<div class="nv-form__row"><div class="field"><span class="field__label" id="priority-label">فوریت</span><div class="nv-seg" role="radiogroup" aria-labelledby="priority-label"><label class="nv-seg__opt"><input type="radio" name="ticket-priority" value="normal" checked>عادی</label><label class="nv-seg__opt"><input type="radio" name="ticket-priority" value="high">کارم متوقف شده</label></div></div><div class="nv-composer__files"></div></div>' +
     '<div class="nv-actions"><button class="btn btn--primary" type="submit">' + RI.icon('mail') + 'ثبت تیکت</button><button class="btn btn--ghost" type="button" data-back>انصراف</button><span class="nv-status" data-send-status role="status"></span></div></form>';
     body.querySelector('.nv-composer__files').insertAdjacentHTML('beforeend', ResumeSupportFiles.input(paid()));
     body.querySelector('[name=ticket-category]:checked').focus();
   }

   RI.delegate(root, 'click', '[data-new-ticket]', () => { create(); root.querySelector('[data-mtab-go="talk"]')?.click(); });
   RI.delegate(root, 'click', '[data-ticket]', (e, b) => open(b.dataset.ticket));
   RI.delegate(root, 'click', '[data-back],[data-retry]', () => { history.replaceState(history.state, '', '/dashboard/support/'); listShell(); list(); });
   RI.delegate(root, 'click', '[data-page]', (e, b) => { page = Number(b.dataset.page); list(); });
   RI.delegate(root, 'click', '[data-filter]', (e, b) => { status = b.dataset.filter; page = 1; list(); });
   root.addEventListener('input', e => { if (e.target.id === 'ticket-search') { query = e.target.value; page = 1; clearTimeout(timer); timer = setTimeout(list, 300); } });
   root.addEventListener('keydown', e => { if (e.target.id === 'reply-body' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.target.form.requestSubmit(); } });
   root.addEventListener('submit', async e => {
    const form = e.target; if (!['ticket-create', 'ticket-reply'].includes(form.id)) return; e.preventDefault(); if (busy || !form.reportValidity()) return;
    const load = serial, isNew = form.id === 'ticket-create', feedback = form.querySelector('[data-send-status]');
    const payload = isNew ? { subject: form.querySelector('#ticket-subject').value, category: form.querySelector('[name=ticket-category]:checked').value, priority: form.querySelector('[name=ticket-priority]:checked').value, body: form.querySelector('#ticket-message').value, requestId } : { id: ticket.id, body: form.querySelector('#reply-body').value, requestId };
    feedback.removeAttribute('data-kind'); feedback.textContent = 'در حال ارسال…'; form.setAttribute('aria-busy', 'true');
    const controls = [...form.elements].filter(el => !el.disabled); controls.forEach(el => el.disabled = true); busy = true;
    try {
     const attachments = await ResumeSupportFiles.read(form.querySelector('#ticket-files'), paid()); if (!alive || load !== serial) return;
     const result = await RI.dashboardRequest(isNew ? 'support' : 'support/reply', { ...payload, attachments });
     if (alive && load === serial) { RI.toast(isNew ? 'تیکت ثبت شد؛ پاسخ را همین‌جا می‌بینی' : 'پیامت فرستاده شد'); await open(result.id); }
    } catch (error) { if (alive && load === serial) { feedback.dataset.kind = 'error'; feedback.setAttribute('role', 'alert'); feedback.textContent = error.message; } }
    finally { busy = false; controls.forEach(el => el.disabled = false); form.removeAttribute('aria-busy'); }
   });
   RI.delegate(root, 'click', '[data-ticket-status]', async (e, b) => { const load = serial, id = ticket.id; b.disabled = true; try { await RI.dashboardRequest('support/status', { id, status: b.dataset.ticketStatus }); if (alive && load === serial) { RI.toast(b.dataset.ticketStatus === 'closed' ? 'خوشحالیم که حل شد' : 'گفت‌وگو دوباره باز شد'); open(id); } } catch (error) { if (alive && load === serial) RI.toast(error.message, { kind: 'error' }); b.disabled = false; } });
   const id = new URLSearchParams(location.search).get('ticket');
   if (id) open(id); else if (ctx.opts?.tab === 'new') create(); else { listShell(); list(); }
   return () => { alive = false; clearTimeout(timer); };
  },
 });
})();
