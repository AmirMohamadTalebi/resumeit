/* مشخصات حساب و روش‌های ورود به سرور متصل‌اند؛ بقیهٔ تنظیمات نمایشی باقی می‌مانند */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const NOTIFS = [['sms_publish', 'پیامک انتشار و به‌روزرسانی صفحه', 'sms'], ['sms_security', 'پیامک هشدار امنیتی (ورود تازه)', 'sms'], ['email_stats', 'گزارش هفتگی بازدیدها', 'mail'], ['email_tips', 'راهنمایی و خبرهای محصول', 'mail'], ['push_milestones', 'اعلان رسیدن به نشان‌ها', 'bell']];

  RI.registerPage('settings', {
    title: 'تنظیمات حساب',
    render() {
      const a = RI.state.account, c = RI.C();
      const conn = (k, label, ic) => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(ic) + '</span><div><b>' + label + '</b><div class="field__hint">' + (a[k] ? 'متصل است؛ می‌توانی با آن وارد شوی' : 'متصل نیست') + '</div></div></div><button type="button" class="btn ' + (a[k] ? 'btn--soft' : 'btn--primary') + ' btn--sm" data-conn="' + k + '">' + (a[k] ? 'قطع اتصال' : 'اتصال') + '</button></div>';
      return RI.pageHead({ eyebrow: 'حساب', eyebrowIcon: 'settings', title: 'تنظیمات حساب', desc: 'مشخصات و روش‌های ورود حسابت رو اینجا مدیریت کن' }) +
        '<div class="setgrid"><div class="setcol">' +
        '<section class="panel"><div class="panel__head"><h2>مشخصات حساب</h2></div><div class="field"><label class="field__label" for="a_name">نام</label><div class="btnrow btnrow--grow"><input class="input" id="a_name" value="' + esc(a.firstName||'') + '" maxlength="39"><button type="button" class="btn btn--soft" data-name>' + RI.icon('check') + 'ذخیره مشخصات</button></div></div><div class="field"><label class="field__label" for="a_last">نام خانوادگی</label><input class="input" id="a_last" maxlength="39" value="' + esc(a.lastName||'') + '"></div><div class="field__hint">برای انتشار صفحه، نام، نام خانوادگی و شماره تأییدشده‌ات باید کامل باشن</div>' +
        '<div class="syncrow"><div><b>شمارهٔ موبایل</b><div class="mobrow"><span class="ltr-inline mono">' + esc(a.mobile.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')) + '</span> ' + (a.mobileVerified ? '<span class="chip chip--ok">' + RI.icon('check') + 'تأیید شده</span>' : '<span class="chip chip--warn">تأییدنشده</span>') + '</div></div><button type="button" class="btn btn--soft btn--sm" data-mobile>' + RI.icon('phone') + (a.mobile ? 'تغییر یا تأیید شماره' : 'اضافه‌کردن شماره') + '</button></div></section>' +
        '<section class="panel"><div class="panel__head"><h2>امنیت ورود</h2><p>ورود با رمز عبور یا کد یک‌بارمصرف پیامکی</p></div><div class="syncrow"><div><b>رمز عبور</b><div class="field__hint">تغییر رمز با تأیید پیامکی شمارهٔ حساب انجام می‌شود و نشست‌های قبلی را می‌بندد</div></div><button type="button" class="btn btn--soft btn--sm" data-pass>' + RI.icon('key') + 'تغییر رمز</button></div><hr class="divider">' + conn('google', 'گوگل', 'google') + conn('github', 'گیت‌هاب', 'github') + '</section>' +
        '<section class="panel"><div class="panel__head"><h2>نمایش عمومی اطلاعات تماس</h2><p>همان مقدارهای بخش «تماس» در رزومه؛ این‌جا فقط نمایش آن‌ها را کنترل می‌کنی</p></div>' + c.contacts.map((x) => '<div class="syncrow"><div><b>' + esc(x.label) + '</b><div class="field__hint ltr">' + (x.value ? esc(x.value) : 'وارد نشده') + '</div></div>' + RI.switchHtml({ checked: x.public && !!x.value, disabled: !x.value, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '</div>').join('') + '</section></div>' +
        '<div class="setcol"><section class="panel"><div class="panel__head"><h2>اعلان‌ها</h2></div>' + NOTIFS.map((n) => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(n[2] === 'sms' ? 'phone' : n[2] === 'mail' ? 'mail' : 'bell') + '</span><b>' + n[1] + '</b></div>' + RI.switchHtml({ checked: a.notify[n[0]], label: n[1] }).replace('<input', '<input data-notif="' + n[0] + '"') + '</div>').join('') + '</section>' +
        '<section class="panel"><div class="panel__head"><h2>حریم خصوصی و برند</h2></div><div class="syncrow"><div><b>نشان «ساخته‌شده با ResumeIt»</b><div class="field__hint">' + (RI.hasSub() ? 'با اشتراک می‌توانی آن را برداری' : '<span class="lock-note">' + RI.icon('lock') + 'برداشتن نشان با اشتراک ممکن است</span>') + '</div></div>' + RI.switchHtml({ checked: a.brand, disabled: false, label: 'نمایش نشان برند' }).replace('<input', '<input data-brand') + '</div></section>' +
        '<section class="panel"><div class="panel__head"><h2>اطلاعات و حذف حساب</h2></div><div class="syncrow"><div><b>خروجی گرفتن از اطلاعات</b><div class="field__hint">یک فایل JSON از داده‌های نمونهٔ همین مرورگر</div></div><button type="button" class="btn btn--soft btn--sm" data-export>' + RI.icon('download') + 'خروجی</button></div>' +
        '<div class="syncrow"><div><b>خروج از حساب</b><div class="field__hint">پایان نشست در این دستگاه</div></div><button type="button" class="btn btn--soft btn--sm" data-logout>' + RI.icon('logout') + 'خروج</button></div>' +
        '<div class="danger"><div><b>حذف حساب</b><div class="field__hint">رزومه، لینک‌ها و همهٔ داده‌ها حذف می‌شود در این نسخه چیزی حذف نمی‌شود</div></div><button type="button" class="btn btn--danger-soft btn--sm" data-delete>' + RI.icon('trash') + 'حذف حساب</button></div></section></div></div>';
    },
    mount(root) {
      const a = RI.state.account;
      RI.delegate(root, 'click', '[data-name]', async (e,b) => {if(b.disabled)return;b.disabled=true;try{await RI.accountRequest('account/names',{firstName:RI.$('#a_name',root).value.trim(),lastName:RI.$('#a_last',root).value.trim()});await RI.reloadAccount();RI.rerender();RI.toast('مشخصاتت ذخیره شد');}catch(error){RI.toast(error.message,{kind:'error'});}finally{b.disabled=false;}});
      RI.delegate(root, 'click', '[data-mobile]', () => RI.phoneDialog());
      RI.delegate(root, 'click', '[data-pass]', async () => { if(await RI.leaveGuard()) location.assign('/forgot-password/'); });
      RI.delegate(root, 'click', '[data-conn]', async (e, b) => {
        const k = b.dataset.conn, nm = k === 'google' ? 'گوگل' : 'گیت‌هاب';
        if(b.disabled)return;b.disabled=true;
        try {
        if(a[k]) {if(await RI.confirm({title:'قطع اتصال '+nm,text:'با قطع اتصال، دیگه با '+nm+' وارد این حساب نمی‌شی',danger:true,icon:'link',confirmLabel:'قطع اتصال'})){await RI.accountRequest('social/unlink',{provider:k});await RI.reloadAccount();RI.rerender();RI.toast('اتصال '+nm+' قطع شد',{kind:'info'});}}
        else {window.location.href='/api/auth/'+k+'/start?mode=link';}
        } catch(error){RI.toast(error.message,{kind:'error'});
        } finally {b.disabled=false;}
      });
      root.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.cpub) { const x = RI.C().contacts.find((k) => k.id === t.dataset.cpub); x.public = t.checked; RI.touch('contacts'); }
        if (t.dataset.notif) { a.notify[t.dataset.notif] = t.checked; RI.toast(t.checked ? 'اعلان روشن شد' : 'اعلان خاموش شد', { kind: 'info' }); }
        if ('brand' in t.dataset) { if (!t.checked && !RI.hasSub()) { t.checked = true; RI.lockedExplain({ name: 'برداشتن نشان برند', access: 'sub', kind: 'font', id: 'brand' }); return; } a.brand = t.checked; }
      });
      RI.delegate(root, 'click', '[data-export]', () => {
        const data = { _note: 'خروجی نمونه؛ فقط داده‌های نمایشی مرورگر', account: { name: a.name }, content: RI.C() };
        const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); l.download = 'resumeit-sample-export.json'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 500); RI.toast('فایل نمونه دانلود شد');
      });
      RI.delegate(root, 'click', '[data-logout]', () => RI.logout());
      RI.delegate(root, 'click', '[data-delete]', () => {
        const m = RI.modal({ title: 'حذف حساب', size: 'sm', body: '<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>این کار در نسخهٔ واقعی برگشت‌ناپذیر است</b>رزومه، صفحهٔ لینک، آمار و خریدها حذف می‌شوند و آدرس‌هایت آزاد می‌شود در این نسخهٔ نمایشی هیچ‌چیز حذف نمی‌شود</div></div><div class="field" style="margin-top:16px" data-field="w"><label class="field__label" for="dw">برای تأیید، کلمهٔ «حذف» را بنویس</label><input class="input" id="dw" autocomplete="off"><div class="field__error" role="alert" hidden></div></div>', actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'حذف حساب', kind: 'danger', icon: 'trash', keepOpen: true, onClick: (api) => { if (RI.$('#dw', api.body).value.trim() !== 'حذف') { RI.showFieldError(api.body, 'w', 'برای ادامه باید دقیقاً «حذف» را بنویسی'); return false; } api.close(); RI.toast('حذف حساب فقط نمایشی بود؛ چیزی حذف نشد', { kind: 'info' }); } }] });
      });
    },
  });
})();
