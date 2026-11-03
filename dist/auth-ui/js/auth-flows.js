/* مرحلهٔ مشترک «وارد کردن کد پیامکی» برای ورود، ثبت‌نام و بازیابی رمز */
(function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;

  RIA.stepper = function (labels, n) {
    return '<ol class="steps" aria-label="مراحل">' + labels.map((l, i) => '<li class="' + (i + 1 < n ? 'is-done' : i + 1 === n ? 'is-now' : '') + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><span>' + (i + 1 < n ? RIA.icon('check') : RIA.fa(i + 1)) + '</span>' + l + '</li>').join('') + '</ol>';
  };


  // Codes by email or SMS: email is the default when the server can send mail, SMS unlocks thirty seconds later.
  RIA.hasEmail = () => { RIA.providersPromise ||= fetch('/api/auth/providers', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Providers unavailable'); return r.json(); }); return RIA.providersPromise.then(p => p.email === true, () => false); };
  RIA.smsUnlockAt = RIA.smsUnlockAt || Date.now() + 30000;
  RIA.channelHtml = (emailOn) => emailOn ? '<div class="field"><span class="field__label" id="chl">دریافت کد از طریق</span><div class="segmented" role="radiogroup" aria-labelledby="chl" id="chs"><button type="button" role="radio" data-ch="email" aria-checked="true" aria-selected="true">' + RIA.icon('mail') + 'ایمیل</button><button type="button" role="radio" data-ch="sms" aria-checked="false" aria-selected="false" disabled>' + RIA.icon('phone') + 'پیامک<small class="ch-wait"></small></button></div><div class="field__hint">کد به ایمیل تأییدشدهٔ حسابت می‌رسد؛ گزینهٔ پیامک سی ثانیه بعد فعال می‌شود</div></div>' : '';
  RIA.bindChannel = function (root, emailOn) {
    let value = emailOn ? 'email' : 'sms', t;
    if (!emailOn) return { value: () => 'sms', stop() {} };
    const box = $('#chs', root), sms = $('[data-ch="sms"]', box), wait = $('.ch-wait', sms);
    const pick = ch => { value = ch; RIA.$$('[data-ch]', box).forEach(b => { const on = b.dataset.ch === ch; b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-selected', String(on)); }); };
    const tick = () => { const left = Math.ceil((RIA.smsUnlockAt - Date.now()) / 1000); if (left > 0) { wait.textContent = ' (' + RIA.fa(left) + ')'; return; } clearInterval(t); wait.textContent = ''; sms.disabled = false; };
    tick(); if (sms.disabled) t = setInterval(() => { if (!sms.isConnected) clearInterval(t); else tick(); }, 1000);
    box.addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b && !b.disabled) pick(b.dataset.ch); });
    return { value: () => value, stop: () => clearInterval(t) };
  };

  RIA.otpStep = function (o) {
    let ch = o.channel || 'sms', hint = o.hint || '';
    const intro = () => ch === 'email' ? 'کد ' + RIA.fa(RIA.cfg.otpLength) + ' رقمی به ایمیل <b class="ltr-inline">' + RIA.esc(hint) + '</b> فرستاده شد و تا پنج دقیقه معتبر است' : 'کد ' + RIA.fa(RIA.cfg.otpLength) + ' رقمی به شمارهٔ <b class="ltr-inline">' + RIA.showMobile(o.mobile) + '</b> درخواست شد تا دو دقیقه می‌تونی از این کد استفاده کنی';
    const html = (o.top || '') + '<button type="button" class="back" id="back">' + RIA.icon('chevR') + 'تغییر شماره</button><h1 data-focus>' + (o.title || 'کد تأیید رو وارد کن') + '</h1>' +
      '<p id="otp-intro">' + intro() + '</p>' +
      '<form id="of" novalidate>' + RIA.otpHtml(ch === 'email' ? 'کد ایمیل‌شده' : 'کد پیامک‌شده') + '<button type="submit" class="btn btn--primary btn--block" id="vb">' + (o.submitLabel || 'تأیید کد') + '</button></form><div class="resend" id="resend" aria-live="polite"></div><div class="resend resend--switch" id="switch" aria-live="polite"></div><details class="sms-help"><summary>کد تأیید نرسید؟</summary><p>شماره‌ات رو چک کن و بعد از پایان شمارش، یه کد تازه بگیر، اگر پیامک خدماتی رو مسدود کردی، تنظیمات مسدودسازی یا پشتیبانی اپراتورت رو بررسی کن</p>' + (o.purpose === 'login' || o.purpose === 'reset' ? '<p>اگر با این شماره هنوز حسابی نساخته باشی، برای حفظ حریم خصوصی کدی فرستاده نمی‌شود؛ در این صورت <a class="link" href="/register/">ثبت‌نام کن</a>.</p>' : '') + (o.purpose === 'reset' ? '<p>به این شماره دسترسی نداری؟ اگر قبلاً حساب گوگل یا گیت‌هابت را متصل کرده‌ای، از <a class="link" href="' + RIA.cfg.loginUrl + '">صفحهٔ ورود</a> همان روش را امتحان کن. برای راهنمایی بیشتر <a class="link" href="/contact/">با پشتیبانی تماس بگیر</a>؛ بازیابی حساب بدون تأیید مالکیت تضمین نمی‌شود.</p>' : '') + '</details>';
    RIA.swap(o.view, html, (root) => {
      let rs, busy = false;
      if(o.purpose!=='login')RIA.setMark(1);
      const otp = RIA.bindOtp(root);
      RIA.toast(ch === 'email' ? 'کد به ایمیلت فرستاده شد' : 'درخواست کد ثبت شد، پیامکت رو چک کن','success');
      rs = RIA.resend(root, () => RIA.run(o.card,async()=>{otp.error('');otp.clear();otp.listen();const r=await RIA.api.sendOtp(o.mobile,o.purpose,ch);hint=r.hint||hint;},'در حال ارسال کد تازه…'));
      // Switching channel waits thirty seconds after the last code, like the server does.
      const sw = $('#switch', root); let swLeft = 30, swTimer;
      const swDraw = () => {
        if (!o.canSwitch) return;
        const other = ch === 'email' ? 'sms' : 'email', name = other === 'sms' ? 'پیامک' : 'ایمیل';
        sw.innerHTML = swLeft > 0 ? 'دریافت با ' + name + ' تا <b class="num">' + RIA.fa(swLeft) + '</b> ثانیهٔ دیگر' : '<button type="button" class="link" id="swBtn">دریافت کد با ' + name + '</button>';
        const b = $('#swBtn', sw); if (b) b.addEventListener('click', async () => {
          b.disabled = true;
          try {
            const r = await RIA.run(o.card, () => RIA.api.sendOtp(o.mobile, o.purpose, other), 'در حال ارسال کد…');
            ch = other; hint = r.hint || ''; otp.error(''); otp.clear(); if (ch === 'sms') otp.listen();
            $('#otp-intro', root).innerHTML = intro(); $('label[for="otp-code"]', root).textContent = ch === 'email' ? 'کد ایمیل‌شده' : 'کد پیامک‌شده';
            RIA.toast(ch === 'email' ? 'کد به ایمیلت فرستاده شد' : 'کد پیامک شد', 'success');
            rs.stop(); rs = RIA.resend(root, rsSend); swLeft = 30; swStart(); swDraw();
          } catch (e) { RIA.toast(e.message, 'error'); swDraw(); }
        });
      };
      const swStart = () => { clearInterval(swTimer); swTimer = setInterval(() => { if (!sw.isConnected) { clearInterval(swTimer); return; } if (swLeft > 0) { swLeft--; swDraw(); } else clearInterval(swTimer); }, 1000); };
      const rsSend = () => RIA.run(o.card,async()=>{otp.error('');otp.clear();otp.listen();const r=await RIA.api.sendOtp(o.mobile,o.purpose,ch);hint=r.hint||hint;},'در حال ارسال کد تازه…');
      swDraw(); swStart();
      $('#back', root).addEventListener('click', () => { rs.stop(); clearInterval(swTimer); RIA.stopSmsCapture(); o.onBack(); });
      $('#of', root).addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      async function submit() {
        if (busy || o.card.dataset.pending) return;
        const code = otp.value();
        if (code.length < RIA.cfg.otpLength) { otp.error('کد ۶ رقمی رو کامل وارد کن'); return; }
        busy = true; RIA.formError($('#of', root), '');
        RIA.stopSmsCapture();
        try {
          await RIA.run(o.card, () => RIA.api.verifyOtp(o.mobile, code, o.purpose), 'در حال بررسی کد…', $('#vb', root), o.purpose==='login');
          rs.stop(); clearInterval(swTimer); busy = false; o.onVerified();
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
