/* فراموشی رمز عبور: شماره ← کد پیامکی ← رمز جدید */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;
  const sh = RIA.shell({ foot: 'رمزت یادت آمد؟ <a class="link" href="' + RIA.cfg.loginUrl + '">بازگشت به ورود</a>', artTitle: 'اتفاقی نیست', artText: 'با کد پیامکی هویتت را تأیید می‌کنی و رمز تازه می‌گذاری.' });
  document.title = 'فراموشی رمز عبور | ResumeIt';
  const LABELS = ['شماره', 'تأیید', 'رمز جدید'];
  let mobile = '';

  function step1() {
    const html = RIA.stepper(LABELS, 1) + '<h1 data-focus>فراموشی رمز عبور</h1><p>شمارهٔ موبایل حسابت را بنویس تا کد بازیابی برایت پیامک شود.</p><form id="f" novalidate>' + RIA.mobileField({ value: mobile }) +
      '<button type="submit" class="btn btn--primary btn--block" id="sb">ارسال کد بازیابی</button></form><div class="note">' + RIA.icon('shield') + '<span>تغییر رمز فقط پس از تأیید شماره انجام می‌شود و ورودهای قبلی حساب را می‌بندد.</span></div>';
    RIA.swap(sh.view, html, (root) => {
      const m = RIA.bindMobile(root);
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), ''); const mob = m.validate(); if (!mob) return;
        try { await RIA.run(sh.card, () => RIA.api.sendOtp(mob, 'reset'), 'در حال ارسال کد…', $('#sb', root)); mobile = mob; step2(); }
        catch (er) { RIA.handleError($('#f', root), er); }
      });
    });
  }
  function step2() { RIA.otpStep({ view: sh.view, card: sh.card, mobile: mobile, purpose: 'reset', top: RIA.stepper(LABELS, 2), title: 'کد بازیابی را وارد کن', submitLabel: 'تأیید کد', onBack: step1, onVerified: step3 }); }
  function step3() {
    const html = RIA.stepper(LABELS, 3) + '<h1 data-focus>رمز عبور تازه</h1><p>رمز جدیدی انتخاب کن که قبلاً جای دیگر استفاده نکرده‌ای.</p><form id="f" novalidate>' + RIA.newPassHtml() + '<button type="submit" class="btn btn--primary btn--block" id="sb">تغییر رمز عبور</button></form>';
    RIA.swap(sh.view, html, (root) => {
      const np = RIA.bindNewPass(root);
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); RIA.formError($('#f', root), ''); if (!np.validate()) return;
        try { await RIA.run(sh.card, () => RIA.api.setPassword(mobile, np.value(), 'reset'), 'در حال ذخیرهٔ رمز جدید…', $('#sb', root)); finish(); }
        catch (er) { if (er.code === 'weak') np.setError(er.message); else RIA.handleError($('#f', root), er); }
      });
    });
  }
  function finish(){RIA.enterDashboard(sh.card,sh.view,{title:'رمز عبور تغییر کرد',text:'رمز تازه ذخیره شد و ورودهای قبلی حساب بسته شدند.'});}

  RIA.boot(sh.view, step1);
});
