/* حساب و تنظیمات (همه نمایشی؛ رمز عبور یا کد تأیید هیچ‌جا ذخیره نمی‌شود) */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const NOTIFS = [['sms_publish', 'پیامک انتشار و به‌روزرسانی صفحه', 'sms'], ['sms_security', 'پیامک هشدار امنیتی (ورود تازه)', 'sms'], ['email_stats', 'گزارش هفتگی بازدیدها', 'mail'], ['email_tips', 'راهنمایی و خبرهای محصول', 'mail'], ['push_milestones', 'اعلان رسیدن به نشان‌ها', 'bell']];

  function otpModal(opts) {
    /* کد نمایشی: هر کد ۶ رقمی پذیرفته می‌شود */
    return new Promise((resolve) => {
      let ok = false, left = 30, t;
      const m = RI.modal({ title: opts.title, size: 'sm', body: '<p class="confirm-text">' + opts.text + '</p><div class="field" data-field="code"><label class="field__label" for="otp">کد ۶ رقمی</label><input class="input ltr otp" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"><div class="field__error" role="alert" hidden></div></div><div class="field__hint" id="otpt"></div><div class="banner" style="margin-top:12px">' + RI.icon('info') + '<div class="banner__body">نمایشی: هر عدد ۶ رقمی پذیرفته می‌شود و پیامکی ارسال نمی‌شود.</div></div>',
        actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'تأیید', kind: 'primary', keepOpen: true, onClick: (api) => { const v = RI.$('#otp', api.body).value; if (!/^\d{6}$/.test(v)) { RI.showFieldError(api.body, 'code', 'کد باید ۶ رقم باشد.'); return false; } ok = true; api.close(); } }], onClose: () => { clearInterval(t); resolve(ok); },
        onMount: (api) => { const tick = () => { RI.$('#otpt', api.body).innerHTML = left > 0 ? 'ارسال دوبارهٔ کد تا ' + RI.fa(left) + ' ثانیه دیگر' : '<button type="button" class="textlink" id="rs">ارسال دوبارهٔ کد</button>'; }; tick(); t = setInterval(() => { if (left > 0) { left--; tick(); } }, 1000); api.body.addEventListener('click', (e) => { if (e.target.id === 'rs') { left = 30; tick(); RI.toast('کد دوباره ارسال شد (نمایشی)', { kind: 'info' }); } }); } });
    });
  }

  RI.registerPage('settings', {
    title: 'تنظیمات حساب',
    render() {
      const a = RI.state.account, c = RI.C();
      const conn = (k, label, ic) => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(ic) + '</span><div><b>' + label + '</b><div class="field__hint">' + (a[k] ? 'متصل است؛ می‌توانی با آن وارد شوی.' : 'متصل نیست.') + '</div></div></div><button type="button" class="btn ' + (a[k] ? 'btn--soft' : 'btn--primary') + ' btn--sm" data-conn="' + k + '">' + (a[k] ? 'قطع اتصال' : 'اتصال') + '</button></div>';
      return RI.pageHead({ eyebrow: 'حساب', eyebrowIcon: 'settings', title: 'تنظیمات حساب', desc: 'مشخصات، امنیت، حریم خصوصی و اعلان‌ها. هیچ‌کدام از این عملیات واقعی اجرا نمی‌شود.' }) +
        '<div class="setgrid"><div class="setcol">' +
        '<section class="panel"><div class="panel__head"><h2>مشخصات حساب</h2></div><div class="field"><label class="field__label" for="a_name">نام</label><div class="btnrow btnrow--grow"><input class="input" id="a_name" value="' + esc(a.name) + '" maxlength="50"><button type="button" class="btn btn--soft" data-name>' + RI.icon('check') + 'ثبت نام</button></div></div>' +
        '<div class="syncrow"><div><b>شمارهٔ موبایل</b><div class="mobrow"><span class="ltr-inline mono">' + esc(a.mobile.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')) + '</span> ' + (a.mobileVerified ? '<span class="chip chip--ok">' + RI.icon('check') + 'تأیید شده</span>' : '<span class="chip chip--warn">تأییدنشده</span>') + '</div></div><button type="button" class="btn btn--soft btn--sm" data-mobile>' + RI.icon('phone') + 'تغییر شماره</button></div></section>' +
        '<section class="panel"><div class="panel__head"><h2>امنیت ورود</h2><p>ورود با رمز عبور یا کد یک‌بارمصرف پیامکی.</p></div><div class="syncrow"><div><b>رمز عبور</b><div class="field__hint">بهتر است از رمزی استفاده کنی که جای دیگر به کار نبرده‌ای.</div></div><button type="button" class="btn btn--soft btn--sm" data-pass>' + RI.icon('key') + 'تغییر رمز</button></div><hr class="divider">' + conn('google', 'گوگل', 'google') + conn('github', 'گیت‌هاب', 'github') + '</section>' +
        '<section class="panel"><div class="panel__head"><h2>نمایش عمومی اطلاعات تماس</h2><p>همان مقدارهای بخش «تماس» در رزومه؛ این‌جا فقط نمایش آن‌ها را کنترل می‌کنی.</p></div>' + c.contacts.map((x) => '<div class="syncrow"><div><b>' + esc(x.label) + '</b><div class="field__hint ltr">' + (x.value ? esc(x.value) : 'وارد نشده') + '</div></div>' + RI.switchHtml({ checked: x.public && !!x.value, disabled: !x.value, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '</div>').join('') + '</section></div>' +
        '<div class="setcol"><section class="panel"><div class="panel__head"><h2>اعلان‌ها</h2></div>' + NOTIFS.map((n) => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(n[2] === 'sms' ? 'phone' : n[2] === 'mail' ? 'mail' : 'bell') + '</span><b>' + n[1] + '</b></div>' + RI.switchHtml({ checked: a.notify[n[0]], label: n[1] }).replace('<input', '<input data-notif="' + n[0] + '"') + '</div>').join('') + '</section>' +
        '<section class="panel"><div class="panel__head"><h2>حریم خصوصی و برند</h2></div><div class="syncrow"><div><b>نشان «ساخته‌شده با ResumeIt»</b><div class="field__hint">' + (RI.hasSub() ? 'با اشتراک می‌توانی آن را برداری.' : '<span class="lock-note">' + RI.icon('lock') + 'برداشتن نشان با اشتراک ممکن است.</span>') + '</div></div>' + RI.switchHtml({ checked: a.brand, disabled: false, label: 'نمایش نشان برند' }).replace('<input', '<input data-brand') + '</div></section>' +
        '<section class="panel"><div class="panel__head"><h2>اطلاعات و حذف حساب</h2></div><div class="syncrow"><div><b>خروجی گرفتن از اطلاعات</b><div class="field__hint">یک فایل JSON از داده‌های نمونهٔ همین مرورگر.</div></div><button type="button" class="btn btn--soft btn--sm" data-export>' + RI.icon('download') + 'خروجی</button></div>' +
        '<div class="syncrow"><div><b>خروج از حساب</b><div class="field__hint">پایان نشست در این دستگاه.</div></div><button type="button" class="btn btn--soft btn--sm" data-logout>' + RI.icon('logout') + 'خروج</button></div>' +
        '<div class="danger"><div><b>حذف حساب</b><div class="field__hint">رزومه، لینک‌ها و همهٔ داده‌ها حذف می‌شود. در این نسخه چیزی حذف نمی‌شود.</div></div><button type="button" class="btn btn--danger-soft btn--sm" data-delete>' + RI.icon('trash') + 'حذف حساب</button></div></section></div></div>';
    },
    mount(root) {
      const a = RI.state.account;
      RI.delegate(root, 'click', '[data-name]', () => { const v = RI.$('#a_name', root).value.trim(); if (!v) return RI.toast('نام نمی‌تواند خالی باشد.', { kind: 'error' }); a.name = v; RI.emit('change', {}); RI.toast('نام ثبت شد'); });
      RI.delegate(root, 'click', '[data-mobile]', () => RI.formModal({ title: 'تغییر شمارهٔ موبایل', fields: [{ key: 'm', label: 'شمارهٔ جدید', ltr: true, required: true, placeholder: '09123456789', max: 11, validate: (v) => (!RI.isMobile(v) ? 'شمارهٔ موبایل را به شکل ۰۹۱۲۳۴۵۶۷۸۹ بنویس.' : v === a.mobile ? 'این شمارهٔ فعلی توست.' : '') }], submitLabel: 'ارسال کد',
        onSubmit: async (v) => { if (await otpModal({ title: 'تأیید شمارهٔ جدید', text: 'تأیید نمایشی شمارهٔ <span class="ltr-inline mono">' + esc(v.m) + '</span>؛ پیامکی ارسال نمی‌شود.' })) { a.mobile = v.m; a.mobileVerified = true; RI.rerender(); RI.toast('شمارهٔ جدید تأیید شد (نمایشی)'); } } }));
      RI.delegate(root, 'click', '[data-pass]', () => {
        const m = RI.modal({ title: 'تغییر رمز عبور', size: 'sm', body: '<div class="field" data-field="cur"><label class="field__label" for="pw0">رمز فعلی</label><input class="input ltr" type="password" id="pw0" autocomplete="off"><div class="field__error" role="alert" hidden></div></div><div class="field" data-field="n1"><label class="field__label" for="pw1">رمز جدید</label><input class="input ltr" type="password" id="pw1" autocomplete="off"><div class="strength" id="stg" data-level="0"><i></i><i></i><i></i><i></i></div><div class="field__hint" id="stt">حداقل ۸ نویسه؛ ترکیب حروف بزرگ و کوچک، عدد و نماد قوی‌تر است.</div><div class="field__error" role="alert" hidden></div></div><div class="field" data-field="n2"><label class="field__label" for="pw2">تکرار رمز جدید</label><input class="input ltr" type="password" id="pw2" autocomplete="off"><div class="field__error" role="alert" hidden></div></div><div class="banner">' + RI.icon('shield') + '<div class="banner__body">نمایشی: رمزی ذخیره یا ارسال نمی‌شود.</div></div>',
          actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'تغییر رمز', kind: 'primary', keepOpen: true, onClick: (api) => { const g = (i) => RI.$('#' + i, api.body).value; let bad = false; const chk = (k, c, msg) => { RI.showFieldError(api.body, k, c ? msg : ''); if (c) bad = true; }; chk('cur', !g('pw0'), 'رمز فعلی را وارد کن.'); chk('n1', g('pw1').length < 8, 'رمز جدید دست‌کم ۸ نویسه باشد.'); chk('n2', g('pw1') !== g('pw2'), 'تکرار رمز با رمز جدید یکی نیست.'); if (bad) return false; api.close(); RI.toast('رمز عبور تغییر کرد (نمایشی)'); } }],
          onMount: (api) => { const w = ['', 'ضعیف', 'متوسط', 'خوب', 'قوی']; RI.$('#pw1', api.body).addEventListener('input', (e) => { const l = RI.passStrength(e.target.value); RI.$('#stg', api.body).dataset.level = l; RI.$('#stt', api.body).textContent = l ? 'قدرت رمز: ' + w[l] : 'حداقل ۸ نویسه؛ ترکیب حروف بزرگ و کوچک، عدد و نماد قوی‌تر است.'; }); } });
      });
      RI.delegate(root, 'click', '[data-conn]', async (e, b) => {
        const k = b.dataset.conn, nm = k === 'google' ? 'گوگل' : 'گیت‌هاب';
        if (a[k]) { const others = (a.google ? 1 : 0) + (a.github ? 1 : 0); if (await RI.confirm({ title: 'قطع اتصال ' + nm, text: 'دیگر نمی‌توانی با ' + nm + ' وارد شوی.' + (others === 1 ? ' این آخرین روش ورود اجتماعی توست؛ با رمز عبور یا کد پیامکی همچنان می‌توانی وارد شوی.' : ''), danger: true, icon: 'link', confirmLabel: 'قطع اتصال' })) { a[k] = false; RI.rerender(); RI.toast('اتصال ' + nm + ' قطع شد', { kind: 'info' }); } }
        else { b.disabled = true; b.innerHTML = '<span class="spinner"></span>'; await RI.sleep(900); a[k] = true; RI.rerender(); RI.toast('اتصال ' + nm + ' برقرار شد (نمایشی)'); }
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
        const m = RI.modal({ title: 'حذف حساب', size: 'sm', body: '<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>این کار در نسخهٔ واقعی برگشت‌ناپذیر است</b>رزومه، صفحهٔ لینک، آمار و خریدها حذف می‌شوند و آدرس‌هایت آزاد می‌شود. در این نسخهٔ نمایشی هیچ‌چیز حذف نمی‌شود.</div></div><div class="field" style="margin-top:16px" data-field="w"><label class="field__label" for="dw">برای تأیید، کلمهٔ «حذف» را بنویس</label><input class="input" id="dw" autocomplete="off"><div class="field__error" role="alert" hidden></div></div>', actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'حذف حساب', kind: 'danger', icon: 'trash', keepOpen: true, onClick: (api) => { if (RI.$('#dw', api.body).value.trim() !== 'حذف') { RI.showFieldError(api.body, 'w', 'برای ادامه باید دقیقاً «حذف» را بنویسی.'); return false; } api.close(); RI.toast('حذف حساب فقط نمایشی بود؛ چیزی حذف نشد', { kind: 'info' }); } }] });
      });
    },
  });
})();
