// Visitor messages from the published resume. No reply goes through ResumeIt: the owner answers by the phone
// number or email the visitor left, so every card offers call, SMS, email and copy for that contact.
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const FILTERS = [['', 'همه', 'mail'], ['new', 'تازه', 'bell'], ['read', 'خوانده‌شده', 'eye'], ['done', 'رسیدگی‌شده', 'check']];
  const LABELS = { new: 'تازه', read: 'خوانده‌شده', done: 'رسیدگی‌شده' };
  const ago = at => { const s = (Date.now() - at) / 1000; return s < 3600 ? RI.fa(Math.max(1, Math.round(s / 60))) + ' دقیقه پیش' : s < 86400 ? RI.fa(Math.round(s / 3600)) + ' ساعت پیش' : s < 604800 ? RI.fa(Math.round(s / 86400)) + ' روز پیش' : RI.date(at); };

  RI.registerPage('messages', {
    title: 'پیام‌های رزومه',
    render() {
      const on = RI.C().inbox?.enabled !== false;
      return RI.pageHead({ eyebrow: 'ارتباط', eyebrowIcon: 'mail', title: 'پیام‌های رزومه', desc: 'پیام‌هایی که بازدیدکننده‌ها از فرم «ارتباط با من» رزومه‌ات فرستاده‌اند. جواب را با همان شماره یا ایمیلی بده که گذاشته‌اند؛ ResumeIt پاسخی ارسال نمی‌کند.' }) +
        '<section class="msg-switch"><div><b>فرم پیام در رزومه</b><p>' + (on ? 'بازدیدکننده‌ها می‌توانند از پایین رزومه‌ات پیام بفرستند.' : 'فرم پیام در رزومه نمایش داده نمی‌شود.') + ' تغییر این گزینه بعد از انتشار دوبارهٔ رزومه روی صفحهٔ عمومی دیده می‌شود.</p></div>' + RI.switchHtml({ id: 'msg-inbox', checked: on, label: 'فرم پیام در رزومه' }) + '</section>' +
        '<div class="msg-tools"><div class="msg-filters" role="tablist" aria-label="وضعیت پیام‌ها" id="msg-filters"></div><label class="msg-search"><span class="sr-only">جست‌وجو در پیام‌ها</span>' + RI.icon('search') + '<input type="search" id="msg-q" placeholder="نام، شماره، ایمیل یا متن پیام" maxlength="100" autocomplete="off"></label></div>' +
        '<div id="msg-list" class="msg-list" aria-live="polite">' + RI.sectionLoading('در حال دریافت پیام‌ها…') + '</div>';
    },
    mount(root) {
      let alive = true, status = '', page = 1, q = '', serial = 0, timer, summary = null;
      const list = root.querySelector('#msg-list');
      const paintFilters = () => { root.querySelector('#msg-filters').innerHTML = FILTERS.map(([id, label, icon]) => '<button type="button" role="tab" data-mfilter="' + id + '" aria-selected="' + (status === id) + '">' + RI.icon(icon) + '<span>' + label + '</span><b>' + RI.fa(summary ? (id ? summary[id] : summary.total) : 0) + '</b></button>').join(''); };
      const contactActions = m => m.contactType === 'phone'
        ? '<a class="btn btn--soft btn--sm" href="tel:' + esc(m.contact) + '">' + RI.icon('phone') + 'تماس</a><a class="btn btn--soft btn--sm" href="sms:' + esc(m.contact) + '">' + RI.icon('mail') + 'پیامک</a>'
        : '<a class="btn btn--soft btn--sm" href="mailto:' + esc(m.contact) + '?subject=' + encodeURIComponent('پاسخ به پیام شما در رزومه') + '">' + RI.icon('mail') + 'ایمیل</a>';
      const card = m => '<article class="msg-card is-' + esc(m.status) + '" data-message="' + esc(m.id) + '"><header><span class="msg-avatar" aria-hidden="true">' + esc(m.name.trim().charAt(0) || '؟') + '</span><div class="msg-who"><b>' + esc(m.name) + '</b><span><bdi dir="ltr">' + esc(m.contact) + '</bdi> · ' + esc(ago(m.at)) + '</span></div><span class="msg-badge msg-badge--' + esc(m.status) + '">' + esc(LABELS[m.status]) + '</span></header>' +
        '<p class="msg-body">' + esc(m.body) + '</p>' +
        (m.resumeUrl ? '<a class="msg-resume" href="' + esc(m.resumeUrl) + '" target="_blank" rel="noopener noreferrer">' + RI.icon('resume') + '<span>رزومهٔ فرستنده</span><bdi dir="ltr">' + esc(m.resumeUrl.replace(/^https:\/\//, '')) + '</bdi></a>' : '') +
        '<footer><div class="msg-contact">' + contactActions(m) + '<button type="button" class="btn btn--soft btn--sm" data-copy-contact="' + esc(m.contact) + '">' + RI.icon('copy') + 'کپی</button></div><div class="msg-state">' +
        (m.status !== 'done' ? '<button type="button" class="btn btn--primary btn--sm" data-mstatus="done">' + RI.icon('check') + 'رسیدگی شد</button>' : '<button type="button" class="btn btn--soft btn--sm" data-mstatus="read">' + RI.icon('undo') + 'برگرداندن</button>') +
        (m.status === 'new' ? '<button type="button" class="btn btn--soft btn--sm" data-mstatus="read">' + RI.icon('eye') + 'خواندم</button>' : '') +
        '<button type="button" class="btn btn--soft btn--sm btn--icon" data-mdelete aria-label="حذف پیام" title="حذف پیام">' + RI.icon('trash') + '</button></div></footer></article>';
      async function load() {
        const id = ++serial; list.setAttribute('aria-busy', 'true');
        try {
          const data = await RI.dashboardRequest('messages?' + new URLSearchParams({ status, page, q })); if (!alive || id !== serial) return;
          summary = data.summary; paintFilters();
          list.innerHTML = data.rows.length ? data.rows.map(card).join('') + RI.pagination(page, data.total, data.size)
            : RI.empty({ icon: 'mail', title: q || status ? 'پیامی با این فیلتر نیست' : 'هنوز پیامی نرسیده', text: q || status ? '' : 'وقتی کسی از فرم «ارتباط با من» رزومه‌ات پیام بفرستد، این‌جا می‌بینی‌اش.' });
        } catch (e) { if (alive && id === serial) list.innerHTML = '<p role="alert">' + esc(e.message) + '</p><button type="button" class="btn btn--soft btn--sm" data-mretry>' + RI.icon('refresh') + 'تلاش دوباره</button>'; }
        finally { if (alive && id === serial) list.setAttribute('aria-busy', 'false'); }
      }
      RI.delegate(root, 'click', '[data-mfilter]', (e, b) => { status = b.dataset.mfilter; page = 1; load(); });
      RI.delegate(root, 'click', '[data-page]', (e, b) => { if (b.disabled) return; page = Number(b.dataset.page); load(); list.scrollIntoView({ block: 'start' }); });
      RI.delegate(root, 'click', '[data-mretry]', load);
      RI.delegate(root, 'click', '[data-copy-contact]', async (e, b) => { try { await navigator.clipboard.writeText(b.dataset.copyContact); RI.toast('کپی شد'); } catch { RI.toast('کپی ممکن نشد', { kind: 'error' }); } });
      RI.delegate(root, 'click', '[data-mstatus]', async (e, b) => { const id = b.closest('[data-message]').dataset.message; b.disabled = true; try { await RI.dashboardRequest('messages/status', { id, status: b.dataset.mstatus }); RI.toast(b.dataset.mstatus === 'done' ? 'پیام رسیدگی‌شده علامت خورد' : 'وضعیت پیام عوض شد'); await load(); } catch (ex) { RI.toast(ex.message, { kind: 'error' }); b.disabled = false; } });
      RI.delegate(root, 'click', '[data-mdelete]', (e, b) => { const id = b.closest('[data-message]').dataset.message; RI.modal({ title: 'حذف پیام', size: 'sm', body: '<p>این پیام برای همیشه حذف می‌شود.</p>', actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'حذف', kind: 'danger', onClick: async () => { try { await RI.dashboardRequest('messages/delete', { id }); RI.toast('پیام حذف شد'); load(); } catch (ex) { RI.toast(ex.message, { kind: 'error' }); } } }] }); });
      RI.delegate(root, 'change', '#msg-inbox', (e, b) => { const c = RI.C(); c.inbox = Object.assign({ enabled: true }, c.inbox); c.inbox.enabled = b.checked; RI.touch('inbox'); RI.toast(c.inbox.enabled ? 'فرم پیام روشن شد؛ رزومه را دوباره منتشر کن' : 'فرم پیام خاموش شد؛ رزومه را دوباره منتشر کن'); });
      root.querySelector('#msg-q').addEventListener('input', e => { q = e.target.value; page = 1; clearTimeout(timer); timer = setTimeout(load, 300); });
      paintFilters(); load();
      return () => { alive = false; clearTimeout(timer); };
    },
  });
})();
