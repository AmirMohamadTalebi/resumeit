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
      '<form id="of" novalidate>' + RIA.otpHtml('کد پیامک‌شده') + '<button type="submit" class="btn btn--primary btn--block" id="vb">' + (o.submitLabel || 'تأیید کد') + '</button></form><div class="resend" id="resend" aria-live="polite"></div><details class="sms-help"><summary>کد تأیید نرسید؟</summary><p>شماره‌ات رو چک کن و بعد از پایان شمارش، یه کد تازه بگیر، اگر پیامک خدماتی رو مسدود کردی، تنظیمات مسدودسازی یا پشتیبانی اپراتورت رو بررسی کن</p></details>';
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
          if (e.code === 'network') { RIA.formError($('#of', root), e.message); return; }
          otp.error(e.message); otp.clear();
        }
      }
    });
  };
})();
