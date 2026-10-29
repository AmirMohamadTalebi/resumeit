/* مرحلهٔ مشترک «وارد کردن کد پیامکی» برای ورود، ثبت‌نام و بازیابی رمز */
(function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;

  RIA.stepper = function (labels, n) {
    return '<ol class="steps" aria-label="مراحل">' + labels.map((l, i) => '<li class="' + (i + 1 < n ? 'is-done' : i + 1 === n ? 'is-now' : '') + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><span>' + (i + 1 < n ? RIA.icon('check') : RIA.fa(i + 1)) + '</span>' + l + '</li>').join('') + '</ol>';
  };

  RIA.otpStep = function (o) {
    const html = (o.top || '') + '<button type="button" class="back" id="back">' + RIA.icon('chevR') + 'تغییر شماره</button><h1 data-focus>' + (o.title || 'کد تأیید رو وارد کن') + '</h1>' +
      '<p>کد ' + RIA.fa(RIA.cfg.otpLength) + ' رقمی به شمارهٔ <b class="ltr-inline">' + RIA.showMobile(o.mobile) + '</b> درخواست شد تا دو دقیقه می‌تونی از این کد استفاده کنی</p>' +
      '<form id="of" novalidate>' + RIA.otpHtml('کد پیامک‌شده') + '<button type="submit" class="btn btn--primary btn--block" id="vb">' + (o.submitLabel || 'تأیید کد') + '</button></form><div class="resend" id="resend" aria-live="polite"></div><details class="sms-help"><summary>کد تأیید نرسید؟</summary><p>شماره‌ات رو چک کن و بعد از پایان شمارش، یه کد تازه بگیر، اگر پیامک خدماتی رو مسدود کردی، تنظیمات مسدودسازی یا پشتیبانی اپراتورت رو بررسی کن</p>' + (o.purpose === 'login' || o.purpose === 'reset' ? '<p>اگر با این شماره هنوز حسابی نساخته باشی، برای حفظ حریم خصوصی کدی فرستاده نمی‌شود؛ در این صورت <a class="link" href="/register/">ثبت‌نام کن</a>.</p>' : '') + (o.purpose === 'reset' ? '<p>به این شماره دسترسی نداری؟ اگر قبلاً حساب گوگل یا گیت‌هابت را متصل کرده‌ای، از <a class="link" href="' + RIA.cfg.loginUrl + '">صفحهٔ ورود</a> همان روش را امتحان کن. برای راهنمایی بیشتر <a class="link" href="/contact/">با پشتیبانی تماس بگیر</a>؛ بازیابی حساب بدون تأیید مالکیت تضمین نمی‌شود.</p>' : '') + '</details>';
    RIA.swap(o.view, html, (root) => {
      let rs, busy = false;
      if(o.purpose!=='login')RIA.setMark(1);
      const otp = RIA.bindOtp(root);
      RIA.toast('درخواست کد ثبت شد، پیامکت رو چک کن','success');
      rs = RIA.resend(root, () => RIA.run(o.card,async()=>{otp.error('');otp.clear();otp.listen();await RIA.api.sendOtp(o.mobile,o.purpose);},'در حال ارسال کد تازه…'));
      $('#back', root).addEventListener('click', () => { rs.stop(); RIA.stopSmsCapture(); o.onBack(); });
      $('#of', root).addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      async function submit() {
        if (busy || o.card.dataset.pending) return;
        const code = otp.value();
        if (code.length < RIA.cfg.otpLength) { otp.error('کد ۶ رقمی رو کامل وارد کن'); return; }
        busy = true; RIA.formError($('#of', root), '');
        RIA.stopSmsCapture();
        try {
          await RIA.run(o.card, () => RIA.api.verifyOtp(o.mobile, code, o.purpose), 'در حال بررسی کد…', $('#vb', root), o.purpose==='login');
          rs.stop(); busy = false; o.onVerified();
        } catch (e) {
          busy = false;
          otp.listen(); RIA.startSmsCapture();
          if (e.code === 'network') { RIA.formError($('#of', root), e.message); return; }
          otp.error(e.message); otp.clear();
        }
      }
    });
  };
})();
