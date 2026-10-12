/* آدرس، دامنه و انتشار (همه نمایشی) */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('publish', {
    title: 'آدرس و انتشار',
    render() {
      return RI.pageHead({ eyebrow: 'انتشار', eyebrowIcon: 'globe', title: 'آدرس و انتشار', desc: 'نام صفحه‌ات را بگیر، آمادگی را بسنج و صفحه‌ها را منتشر کن همهٔ این مراحل در این نسخه نمایشی‌اند' }) +
        '<div class="tabs" role="tablist" id="ptabs">' + [['address', 'نام و آدرس'], ['domain', 'دامنهٔ شخصی'], ['share', 'اشتراک‌گذاری'], ['go', 'چک‌لیست و انتشار']].map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div><div id="pbody"></div>';
    },
    mount(root, ctx) {
      let tab = (ctx.opts && ctx.opts.anchor === 'share') ? 'share' : (ctx.opts && ctx.opts.anchor === 'slug') ? 'address' : 'address';
      const body = RI.$('#pbody', root);
      const C = () => RI.C();
      let slugTimer = 0;

      /* ---- آدرس ---- */
      function slugMsg(r, checking) {
        if (checking) return '<div class="slugstat is-checking"><span class="spinner"></span>در حال بررسی آزاد بودن نام…</div>';
        if (r.state === 'ok') return '<div class="slugstat is-ok">' + RI.icon('check') + r.msg + '</div>';
        if (r.state === 'empty') return '<div class="slugstat">' + RI.icon('info') + r.msg + '</div>';
        let sug = '';
        if (r.state === 'taken') { const s = RI.suggestSlugs(C().slug); sug = s.length ? '<div class="sugs">پیشنهاد: ' + s.map((x) => '<button type="button" class="filter-chip ltr-inline" data-sug="' + x + '">' + x + '</button>').join('') + '</div>' : ''; }
        return '<div class="slugstat is-bad" role="alert">' + RI.icon('alert') + r.msg + '</div>' + sug;
      }
      function addressTab() {
        const u = RI.urls(), r = RI.slugCheck(C().slug), ok = r.state === 'ok';
        const pubR = RI.state.pub.resume.status === 'published', pubL = RI.state.pub.links.status === 'published';
        return '<div class="panel"><div class="panel__head"><h2>نام صفحه (زیردامنه)</h2><p>یک نام کوتاه و ماندگار؛ حروف کوچک انگلیسی، عدد و خط تیره <span class="field__req">ضروری</span></p></div>' +
          '<div class="field" id="slugField"><label class="field__label" for="slug">نام صفحه</label><div class="input-group"><input class="input" id="slug" value="' + esc(C().slug) + '" maxlength="30" autocomplete="off" spellcheck="false" aria-describedby="slugmsg" aria-invalid="' + (r.state === 'invalid' || r.state === 'taken') + '"><span class="input-group__addon">.' + RI.DOMAIN + '</span></div><div id="slugmsg" aria-live="polite">' + slugMsg(r) + '</div>' +
          '<div class="field__hint">نمونه‌های «گرفته‌شده» برای دیدن حالت‌ها: admin، ali، test</div></div>' +
          (RI.state.pub.resume.status === 'published' && C().slug !== RI.savedSlug ? '<div class="banner banner--warn">' + RI.icon('alert') + '<div class="banner__body"><b>آدرس منتشرشده عوض می‌شود</b>پس از به‌روزرسانی، آدرس قبلی دیگر کار نمی‌کند و لینک‌های اشتراک‌گذاری‌شده باید عوض شوند</div></div>' : '') + '</div>' +
          '<div class="panel"><div class="panel__head"><h2>آدرس‌های شما</h2><p>رزومه و صفحهٔ لینک دو صفحهٔ مستقل‌اند که از منوی خودشان به هم وصل می‌شوند</p></div><div class="urlrows">' +
          [['resume', 'صفحهٔ رزومه', 'resume', u.resume, pubR], ['links', 'صفحهٔ لینک‌ها', 'link', u.links, pubL]].map((x) => '<div class="urlrow ' + (ok ? '' : 'is-off') + '"><span class="row__ico">' + RI.icon(x[2]) + '</span><div class="row__main"><div class="row__title">' + x[1] + ' ' + (x[4] ? '<span class="chip chip--ok">منتشر شده</span>' : '<span class="chip">پیش‌نویس</span>') + '</div>' + (ok ? RI.urlChip(x[3], { open: x[3] }) : '<div class="field__hint">با انتخاب یک نام معتبر، آدرس این‌جا ظاهر می‌شود</div>') + '</div></div>').join('') + '</div></div>';
      }

      /* ---- دامنه ---- */
      function domainTab() {
        const d = C().domain, sub = RI.hasSub(), yearly = sub && RI.state.billing.plan.id === 'y';
        const stat = { none: ['chip', 'متصل نشده'], pending: ['chip chip--warn', 'در انتظار تنظیم DNS'], checking: ['chip chip--warn', 'در حال بررسی…'], connected: ['chip chip--ok', 'متصل است'], error: ['chip chip--err', 'تنظیم DNS پیدا نشد'] }[d.status];
        const dns = d.value ? '<div class="dnsbox"><b>رکوردهای زیر را در پنل دامنهٔ خود ثبت کنید</b><div class="table-wrap"><table class="table ltr"><thead><tr><th>Type</th><th>Name</th><th>Value</th><th></th></tr></thead><tbody>' +
          [['CNAME', '@', 'cname.' + RI.DOMAIN.toLowerCase()], ['CNAME', 'www', 'cname.' + RI.DOMAIN.toLowerCase()], ['TXT', '_resumeit', 'verify=demo-' + RI.uid()]].map((r) => '<tr><td class="mono">' + r[0] + '</td><td class="mono">' + r[1] + '</td><td class="mono">' + r[2] + '</td><td><button type="button" class="btn btn--icon btn--ghost btn--sm" data-copy="' + r[2] + '" aria-label="کپی">' + RI.icon('copy') + '</button></td></tr>').join('') + '</tbody></table></div><p class="field__hint">این رکوردها نمونه‌اند مقدار واقعی را بک‌اند تولید می‌کند</p></div>' : '';
        return '<div class="panel"><div class="panel__head panel__head--row"><div><h2>اتصال دامنهٔ شخصی</h2><p>صفحه‌ات روی آدرس خودت، مثلاً <span class="ltr-inline mono">yourname.ir</span>، باز شود <span class="field__opt">اختیاری</span></p></div><span class="' + stat[0] + '">' + stat[1] + '</span></div>' +
          '<div class="field"><label class="field__label" for="dom">نام دامنه</label><div class="btnrow btnrow--grow"><input class="input ltr" id="dom" dir="ltr" placeholder="example.ir" value="' + esc(d.value) + '" ' + (d.status === 'connected' ? 'disabled' : '') + ' aria-describedby="domerr"><button type="button" class="btn btn--primary" data-dom-add ' + (d.status === 'connected' ? 'disabled' : '') + '>' + RI.icon('link') + (d.value ? 'ثبت دوباره' : 'افزودن دامنه') + '</button></div><div class="field__error" id="domerr" role="alert" hidden></div></div>' + dns +
          (d.value && d.status !== 'connected' ? '<div class="btnrow"><button type="button" class="btn btn--ice" data-dom-check ' + (d.status === 'checking' ? 'disabled' : '') + '>' + (d.status === 'checking' ? '<span class="spinner"></span>' : RI.icon('refresh')) + 'بررسی اتصال</button><button type="button" class="btn btn--ghost" data-dom-clear>' + RI.icon('trash') + 'برداشتن دامنه</button></div>' : '') +
          (d.status === 'connected' ? '<div class="banner banner--ok">' + RI.icon('check') + '<div class="banner__body"><b>دامنه متصل شد (نمایشی)</b>آدرس‌ها از این پس روی ' + '<span class="ltr-inline mono">' + esc(d.value) + '</span> نشان داده می‌شوند</div><button type="button" class="btn btn--ghost btn--sm banner__action" data-dom-clear>جدا کردن</button></div>' : '') + '</div>' +
          '<div class="panel ir"><div class="ir__art">' + RI.icon('gift') + '</div><div class="ir__body"><h2>دامنهٔ .ir رایگان با اشتراک سالانه</h2><p>اگر اشتراک سالانه بگیری، یک دامنهٔ <span class="ltr-inline mono">.ir</span> بدون هزینهٔ جداگانه به نام خودت ثبت می‌شود در سه‌ماهه و شش‌ماهه این مزیت وجود ندارد</p>' +
          (yearly ? '<div class="btnrow"><span class="chip chip--ok">' + RI.icon('check') + 'اشتراک سالانه فعال است</span><button type="button" class="btn btn--primary btn--sm" data-ir-claim>' + RI.icon('gift') + 'درخواست دامنهٔ رایگان</button></div>' : '<div class="btnrow"><button type="button" class="btn btn--primary btn--sm" data-go="billing">' + RI.icon('crown') + 'مشاهدهٔ اشتراک سالانه</button></div>') + '</div></div>';
      }

      /* ---- اشتراک‌گذاری ---- */
      function shareTab() {
        const s = C().share, u = RI.urls(), p = C().profile;
        const t = s.title.trim() || p.name || 'عنوان صفحهٔ شما', d = s.desc.trim() || p.bio || 'توضیح کوتاه صفحه این‌جا نمایش داده می‌شود';
        return '<div class="two"><div class="panel"><div class="panel__head"><h2>وقتی لینکت را می‌فرستند…</h2><p>عنوان، توضیح و تصویری که در تلگرام، واتس‌اپ و گوگل دیده می‌شود <span class="field__opt">اختیاری</span> اما برای انتشار توصیه می‌شود</p></div>' +
          '<div class="field"><label class="field__label" for="sh_t">عنوان<span class="field__count" id="shc1"></span></label><input class="input" id="sh_t" maxlength="60" value="' + esc(s.title) + '" placeholder="' + esc(p.name || 'نام و عنوان تو') + '"></div>' +
          '<div class="field"><label class="field__label" for="sh_d">توضیح<span class="field__count" id="shc2"></span></label><textarea class="textarea" id="sh_d" rows="3" maxlength="160" placeholder="یک جملهٔ جذاب دربارهٔ خودت">' + esc(s.desc) + '</textarea></div>' +
          '<div class="field"><div class="field__label">تصویر اشتراک‌گذاری</div>' + RI.imageFieldHtml('shimg', { value: s.image, wide: true, label: 'تصویر اشتراک‌گذاری' }) + '<div class="field__hint">اندازهٔ پیشنهادی ۱۲۰۰×۶۳۰</div></div></div>' +
          '<div class="panel"><div class="panel__head"><h2>پیش‌نمایش کارت</h2></div><div class="sharecard"><div class="sharecard__img" style="' + esc(RI.bg(s.image || p.cover) || 'background:var(--ice-200)') + '"></div><div class="sharecard__body"><small class="ltr">' + esc(u.resume) + '</small><b>' + esc(t) + '</b><p>' + esc(d) + '</p></div></div>' +
          '<div class="syncrow" style="margin-top:14px"><div><b>اجازهٔ ایندکس در موتورهای جست‌وجو</b><div class="field__hint">با خاموش کردن، صفحه فقط برای کسانی که لینک را دارند پیدا می‌شود</div></div>' + RI.switchHtml({ checked: RI.state.account.indexing, label: 'ایندکس در جست‌وجو' }).replace('<input', '<input id="idx"') + '</div></div></div>';
      }

      /* ---- چک‌لیست و انتشار ---- */
      function item(i) {
        return '<li class="chk' + (i.done ? ' is-done' : '') + '"><span class="chk__tick">' + (i.done ? RI.icon('check') : '') + '</span><span class="chk__t">' + esc(i.label) + (i.req ? ' <em class="field__req">ضروری</em>' : ' <em class="field__opt">توصیه‌شده</em>') + '</span>' + (i.done ? '' : '<button type="button" class="btn btn--ghost btn--sm" data-fix="' + i.id + '">رفتن و تکمیل' + RI.icon('chevL') + '</button>') + '</li>';
      }
      function pubCard(k, rd) {
        const s = RI.state.pub[k], live = s.status === 'published', dirty = RI.pubDirty(k), ok = k === 'resume' ? rd.resumeOk : rd.linksOk, u = RI.urls();
        const list = rd[k];
        return '<section class="panel pubcard"><div class="panel__head panel__head--row"><div><h2>' + (k === 'resume' ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها') + '</h2><p>' + (live ? (dirty ? 'نسخهٔ ' + RI.fa(s.version) + ' منتشر است و تغییرات تازه‌ای هنوز منتشر نشده' : 'نسخهٔ ' + RI.fa(s.version) + ' منتشر است، آخرین به‌روزرسانی ' + RI.date(s.at) + '.') : 'هنوز منتشر نشده؛ فقط تو می‌بینی‌اش') + '</p></div>' + (live ? (dirty ? '<span class="chip chip--warn">تغییرات منتشرنشده</span>' : '<span class="chip chip--ok">' + RI.icon('check') + 'منتشر شده</span>') : '<span class="chip">پیش‌نویس</span>') + '</div>' +
          '<ul class="chklist">' + list.map(item).join('') + '</ul>' +
          (!ok ? '<div class="banner banner--warn">' + RI.icon('alert') + '<div class="banner__body">موارد «ضروری» را کامل کن تا دکمهٔ انتشار فعال شود</div></div>' : '') +
          '<div class="btnrow"><button type="button" class="btn btn--soft" data-pv="' + k + '">' + RI.icon('eye') + 'پیش‌نمایش قبل از انتشار</button>' +
          (live ? '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (dirty && ok ? '' : 'disabled') + '>' + RI.icon('refresh') + 'به‌روزرسانی نسخهٔ منتشرشده</button><button type="button" class="btn btn--danger-soft" data-unpub="' + k + '">' + RI.icon('eyeOff') + 'برداشتن از انتشار</button>' : '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (ok ? '' : 'disabled') + '>' + RI.icon('rocket') + 'انتشار</button>') + '</div>' +
          (live ? '<div style="margin-top:12px">' + RI.urlChip(k === 'resume' ? u.resume : u.links, { open: k === 'resume' ? u.resume : u.links }) + '</div>' : '') + '</section>';
      }
      function goTab() { const rd = RI.readiness(); return '<div class="two">' + pubCard('resume', rd) + pubCard('links', rd) + '</div>'; }

      function paint() {
        body.innerHTML = tab === 'address' ? addressTab() : tab === 'domain' ? domainTab() : tab === 'share' ? shareTab() : goTab();
        RI.$$('#ptabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        if (tab === 'share') { RI.bindImageField(body, 'shimg', { set: (v) => { C().share.image = v; RI.touch('share'); paint(); } }); counts(); }
        if (tab === 'address') { const i = RI.$('#slug', body); if (ctx.opts && ctx.opts.anchor === 'slug' && i) { i.focus(); ctx.opts = {}; } }
      }
      function counts() { const s = C().share; const a = RI.$('#shc1', body), b = RI.$('#shc2', body); if (a) a.textContent = RI.fa(s.title.length) + '/۶۰'; if (b) b.textContent = RI.fa(s.desc.length) + '/۱۶۰'; }

      /* رویدادها */
      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      body.addEventListener('input', (e) => {
        const t = e.target;
        if (t.id === 'slug') {
          C().slug = t.value.trim().toLowerCase(); RI.touch('slug');
          const r = RI.slugCheck(C().slug), box = RI.$('#slugmsg', body);
          clearTimeout(slugTimer);
          if (r.state === 'invalid' || r.state === 'empty') { box.innerHTML = slugMsg(r); t.setAttribute('aria-invalid', r.state === 'invalid'); }
          else { box.innerHTML = slugMsg(r, true); slugTimer = setTimeout(() => { const rr = RI.slugCheck(C().slug); box.innerHTML = slugMsg(rr); t.setAttribute('aria-invalid', rr.state === 'taken'); }, RI.state.ui.sim.slow ? 1400 : 550); }
        }
        if (t.id === 'sh_t') { C().share.title = t.value; RI.touch('share'); counts(); paintCard(); }
        if (t.id === 'sh_d') { C().share.desc = t.value; RI.touch('share'); counts(); paintCard(); }
      });
      function paintCard() { const s = C().share, p = C().profile, card = RI.$('.sharecard__body', body); if (!card) return; card.querySelector('b').textContent = s.title.trim() || p.name || 'عنوان صفحهٔ شما'; card.querySelector('p').textContent = s.desc.trim() || p.bio || 'توضیح کوتاه صفحه این‌جا نمایش داده می‌شود'; }
      body.addEventListener('change', (e) => { if (e.target.id === 'idx') { RI.state.account.indexing = e.target.checked; RI.toast(e.target.checked ? 'صفحه در جست‌وجو دیده می‌شود' : 'صفحه از جست‌وجو پنهان شد', { kind: 'info' }); } });
      RI.delegate(body, 'click', '[data-sug]', (e, b) => { C().slug = b.dataset.sug; RI.touch('slug'); paint(); });

      RI.delegate(body, 'click', '[data-dom-add]', () => {
        const v = RI.$('#dom', body).value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''), err = RI.$('#domerr', body);
        let m = '';
        if (!v) m = 'نام دامنه را وارد کن'; else if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) m = 'دامنه معتبر نیست؛ نمونه: example.ir'; else if (/resumeit\.ir$/.test(v)) m = 'این دامنهٔ خود ResumeIt است و قابل اتصال نیست';
        if (m) { err.innerHTML = RI.icon('alert') + m; err.hidden = false; RI.$('#dom', body).setAttribute('aria-invalid', 'true'); return; }
        C().domain = { value: v, status: 'pending' }; RI.touch('domain'); paint(); RI.toast('دامنه ثبت شد؛ حالا رکوردهای DNS را تنظیم کن', { kind: 'info' });
      });
      RI.delegate(body, 'click', '[data-dom-check]', async () => {
        C().domain.status = 'checking'; paint(); await RI.sleep(RI.state.ui.sim.slow ? 2600 : 1400);
        if (RI.state.ui.sim.failNext) { RI.state.ui.sim.failNext = false; C().domain.status = 'error'; paint(); RI.toast('رکورد DNS هنوز پیدا نشد ممکن است تا چند ساعت طول بکشد', { kind: 'error' }); return; }
        C().domain.status = 'connected'; RI.touch('domain'); paint(); RI.toast('دامنه متصل شد (نمایشی).');
      });
      RI.delegate(body, 'click', '[data-dom-clear]', async () => { if (await RI.confirm({ title: 'برداشتن دامنه', text: 'دامنهٔ شخصی از صفحه‌ها جدا می‌شود و دوباره روی آدرس ' + esc(C().slug || 'username') + '.' + RI.DOMAIN + ' نمایش داده می‌شوند', danger: true, icon: 'trash', confirmLabel: 'برداشتن' })) { C().domain = { value: '', status: 'none' }; RI.touch('domain'); paint(); } });
      RI.delegate(body, 'click', '[data-ir-claim]', () => RI.formModal({ title: 'درخواست دامنهٔ .ir رایگان', fields: [{ key: 'name', label: 'نام دامنهٔ دلخواه', ltr: true, required: true, placeholder: 'yourname', hint: 'پسوند .ir خودکار اضافه می‌شود', validate: (v) => (/^[a-z0-9-]{3,30}$/.test(v) ? '' : 'فقط حروف کوچک انگلیسی، عدد و خط تیره (حداقل ۳ نویسه).') }], submitLabel: 'ثبت درخواست', onSubmit: (v) => { C().domain = { value: v.name + '.ir', status: 'pending' }; RI.touch('domain'); paint(); RI.toast('درخواست ثبت شد (نمایشی).'); } }));

      RI.delegate(body, 'click', '[data-fix]', (e, b) => {
        const all = RI.readiness(); const it = all.resume.concat(all.links).find((x) => x.id === b.dataset.fix);
        if (it.route === 'publish') { tab = it.anchor === 'share' ? 'share' : 'address'; paint(); if (tab === 'address') RI.$('#slug', body).focus(); } else RI.go(it.route, { step: it.step, tab: it.tab });
      });
      RI.delegate(body, 'click', '[data-pv]', (e, b) => RI.openPreview(b.dataset.pv, { title: 'پیش‌نمایش قبل از انتشار' }));
      RI.delegate(body, 'click', '[data-pub]', async (e, b) => {
        const k = b.dataset.pub;
        if (RI.state.ui.dirty) { const c = await RI.choice({ title: 'ابتدا ذخیره کن', text: 'تغییرات ذخیره‌نشده داری انتشار از آخرین نسخهٔ ذخیره‌شده ساخته می‌شود', options: [{ label: 'ذخیره و ادامهٔ انتشار', kind: 'primary', value: 'save' }, { label: 'انصراف', kind: 'ghost', value: null }] }); if (c !== 'save') return; if (!(await RI.save())) return; }
        runPublish(k);
      });
      function runPublish(k) {
        const update = RI.state.pub[k].status === 'published';
        const m = RI.modal({ title: update ? 'در حال به‌روزرسانی…' : 'در حال انتشار…', size: 'sm', dismissible: false, body: '<ol class="pubsteps" id="ps"></ol>', actions: [] });
        const draw = (i, steps) => { RI.$('#ps', m.body).innerHTML = steps.map((s, j) => '<li class="' + (j < i ? 'is-done' : j === i ? 'is-now' : '') + '">' + (j < i ? RI.icon('check') : j === i ? '<span class="spinner"></span>' : '<i></i>') + s + '</li>').join(''); };
        RI.publish(k, draw).then(() => {
          m.setTitle(update ? 'به‌روزرسانی شد' : 'منتشر شد'); const u = RI.urls();
          m.setBody('<div class="pay-state pay-state--ok"><div class="empty__art">' + RI.icon('rocket') + '</div><b>صفحه‌ات حالا زنده است (نمایشی)</b><p>در نسخهٔ واقعی این آدرس برای همه باز می‌شود</p>' + RI.urlChip(k === 'resume' ? u.resume : u.links, {}) + '</div>');
          m.setActions([{ label: 'تمام', kind: 'primary', value: true }]); m.el.querySelector('[data-close]') || null; paint();
        }).catch(() => {
          m.setTitle('انتشار انجام نشد'); m.setBody('<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>خطا در انتشار</b>اتصال برقرار نشد؛ نسخهٔ قبلی دست‌نخورده ماند دوباره تلاش کن</div></div>');
          m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تلاش دوباره', kind: 'primary', icon: 'refresh', onClick: () => { setTimeout(() => runPublish(k), 220); } }]);
        });
      }
      RI.delegate(body, 'click', '[data-unpub]', async (e, b) => {
        const k = b.dataset.unpub;
        if (await RI.confirm({ title: 'برداشتن صفحه از انتشار', text: 'صفحهٔ ' + (k === 'resume' ? 'رزومه' : 'لینک‌ها') + ' برای بازدیدکننده‌ها «پیدا نشد» نشان می‌دهد محتوایت حذف نمی‌شود و هر وقت خواستی دوباره منتشرش کن', danger: true, icon: 'eyeOff', confirmLabel: 'برداشتن از انتشار' })) { RI.unpublish(k); RI.toast('صفحه از انتشار برداشته شد', { kind: 'info' }); paint(); }
      });
      const off = RI.on('pub', () => {});
      paint();
      return () => { off(); clearTimeout(slugTimer); };
    },
  });
})();
