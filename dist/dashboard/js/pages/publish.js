/* رزرو آدرس و انتشار مستقل صفحه‌ها روی سرور */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('publish', {
    title: 'آدرس و انتشار',
    render() {
      return RI.pageHead({ eyebrow: 'انتشار', eyebrowIcon: 'globe', title: 'آدرس و انتشار', desc: 'نام صفحه‌ات را بگیر، آمادگی را بسنج و صفحه‌ها را منتشر کن ذخیره و انتشار هر صفحه مستقل است' }) +
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
          '<div class="field__hint">نام‌هایی مانند admin و www برای سرویس رزرو شده‌اند.</div></div>' +
          (RI.state.pub.resume.status === 'published' && C().slug !== RI.savedSlug ? '<div class="banner banner--warn">' + RI.icon('alert') + '<div class="banner__body"><b>آدرس منتشرشده عوض می‌شود</b>پس از ذخیرهٔ نام جدید، آدرس قبلی دیگر کار نمی‌کند و لینک‌های اشتراک‌گذاری‌شده باید عوض شوند</div></div>' : '') + '</div>' +
          '<div class="panel"><div class="panel__head"><h2>آدرس‌های شما</h2><p>رزومه و صفحهٔ لینک دو صفحهٔ مستقل‌اند که از منوی خودشان به هم وصل می‌شوند</p></div><div class="urlrows">' +
          [['resume', 'صفحهٔ رزومه', 'resume', u.resume, pubR], ['links', 'صفحهٔ لینک‌ها', 'link', u.links, pubL]].map((x) => '<div class="urlrow ' + (ok ? '' : 'is-off') + '"><span class="row__ico">' + RI.icon(x[2]) + '</span><div class="row__main"><div class="row__title">' + x[1] + ' ' + (x[4] ? '<span class="chip chip--ok">منتشر شده</span>' : '<span class="chip">پیش‌نویس</span>') + '</div>' + (ok ? RI.urlChip(x[3], { open: x[3] }) : '<div class="field__hint">با انتخاب یک نام معتبر، آدرس این‌جا ظاهر می‌شود</div>') + '</div></div>').join('') + '</div></div>';
      }

      /* ---- دامنه ---- */
      function domainTab() { return '<div class="panel"><h2>آدرس شخصی شما</h2><p>رزومه و لینک‌ها روی زیردامنهٔ resumeit.ir منتشر می‌شوند. اتصال دامنهٔ مستقل فعلاً فعال نیست.</p><a class="btn btn--soft" href="/contact/">ارتباط با پشتیبانی</a></div>'; }

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
          else { box.innerHTML = slugMsg(r, true); slugTimer = setTimeout(async () => { const value=C().slug;try{const result=await RI.dashboardRequest('slug?value='+encodeURIComponent(value));if(C().slug!==value||!box.isConnected)return;const rr=result.available?{state:'ok',msg:'این نام آزاد است.'}:{state:'taken',msg:'این نام رزرو شده یا قبلاً گرفته شده است.'};box.innerHTML=slugMsg(rr);t.setAttribute('aria-invalid',!result.available);}catch(e){if(box.isConnected)box.textContent=e.message;} },350); }
        }
        if (t.id === 'sh_t') { C().share.title = t.value; RI.touch('share'); counts(); paintCard(); }
        if (t.id === 'sh_d') { C().share.desc = t.value; RI.touch('share'); counts(); paintCard(); }
      });
      function paintCard() { const s = C().share, p = C().profile, card = RI.$('.sharecard__body', body); if (!card) return; card.querySelector('b').textContent = s.title.trim() || p.name || 'عنوان صفحهٔ شما'; card.querySelector('p').textContent = s.desc.trim() || p.bio || 'توضیح کوتاه صفحه این‌جا نمایش داده می‌شود'; }
      body.addEventListener('change', (e) => { if (e.target.id === 'idx') { RI.state.account.indexing = e.target.checked; RI.touch('preferences'); RI.toast('تنظیم به‌صورت خودکار ذخیره می‌شود',{kind:'info'}); } });
      RI.delegate(body, 'click', '[data-sug]', (e, b) => { C().slug = b.dataset.sug; RI.touch('slug'); paint(); });

      RI.delegate(body, 'click', '[data-fix]', (e, b) => {
        const all = RI.readiness(); const it = all.resume.concat(all.links).find((x) => x.id === b.dataset.fix);
        if (it.route === 'publish') { tab = it.anchor === 'share' ? 'share' : 'address'; paint(); if (tab === 'address') RI.$('#slug', body).focus(); } else RI.go(it.route, { step: it.step, tab: it.tab });
      });
      RI.delegate(body, 'click', '[data-pv]', (e, b) => RI.openPreview(b.dataset.pv, { title: 'پیش‌نمایش قبل از انتشار' }));
      RI.delegate(body, 'click', '[data-pub]', async (e, b) => {
        const k = b.dataset.pub;
        if ((RI.state.ui.dirty || RI.state.ui.saving) && !(await RI.save())) return;
        runPublish(k);
      });
      function runPublish(k) {
        const update = RI.state.pub[k].status === 'published';
        const m = RI.modal({ title: update ? 'در حال به‌روزرسانی…' : 'در حال انتشار…', size: 'sm', dismissible: false, body: '<ol class="pubsteps" id="ps"></ol>', actions: [] });
        const draw = (i, steps) => { RI.$('#ps', m.body).innerHTML = steps.map((s, j) => '<li class="' + (j < i ? 'is-done' : j === i ? 'is-now' : '') + '">' + (j < i ? RI.icon('check') : j === i ? '<span class="spinner"></span>' : '<i></i>') + s + '</li>').join(''); };
        RI.publish(k, draw).then(() => {
          m.setTitle(update ? 'به‌روزرسانی شد' : 'منتشر شد'); const u = RI.urls();
          m.setBody('<div class="pay-state pay-state--ok"><div class="empty__art">' + RI.icon('rocket') + '</div><b>نسخهٔ عمومی صفحه منتشر شد</b><p>ویرایش‌ها تا انتشار دوباره عمومی نمی‌شوند.</p>' + RI.urlChip(k === 'resume' ? u.resume : u.links, {}) + '<p>اگر زیردامنه هنوز در دسترس نیست، از آدرس جایگزین استفاده کن:</p>'+RI.urlChip(k==='resume'?u.fallbackResume:u.fallbackLinks,{open:k==='resume'?u.fallbackResume:u.fallbackLinks})+'</div>');
          m.setActions([{ label: 'تمام', kind: 'primary', value: true }]); m.el.querySelector('[data-close]') || null; paint();
        }).catch((error) => {
          if (error.message === 'account-incomplete') {
            m.setTitle('مشخصات حسابت رو کامل کن');
            m.setBody('<p>برای انتشار صفحه باید اسم، فامیل و شماره موبایل تأییدشده داشته باشی</p>');
            m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تکمیل مشخصات', kind: 'primary', onClick: () => RI.go('settings') }]);
            return;
          }
          m.setTitle('انتشار انجام نشد'); m.setBody('<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>خطا در انتشار</b>' + esc(error.message) + '</div></div>');
          m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تلاش دوباره', kind: 'primary', icon: 'refresh', onClick: () => { setTimeout(() => runPublish(k), 220); } }]);
        });
      }
      RI.delegate(body, 'click', '[data-unpub]', async (e, b) => {
        const k = b.dataset.unpub;
        if (await RI.confirm({ title: 'برداشتن صفحه از انتشار', text: 'صفحهٔ ' + (k === 'resume' ? 'رزومه' : 'لینک‌ها') + ' برای بازدیدکننده‌ها «پیدا نشد» نشان می‌دهد محتوایت حذف نمی‌شود و هر وقت خواستی دوباره منتشرش کن', danger: true, icon: 'eyeOff', confirmLabel: 'برداشتن از انتشار' })) { try{await RI.unpublish(k);RI.toast('صفحه از انتشار برداشته شد',{kind:'info'});paint();}catch(e){RI.toast(e.message,{kind:'error'});} }
      });
      const off = RI.on('pub', () => {});
      paint();
      return () => { off(); clearTimeout(slugTimer); };
    },
  });
})();
