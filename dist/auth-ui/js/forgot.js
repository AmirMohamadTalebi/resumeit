/* فراموشی رمز عبور: شماره ← کد پیامکی ← رمز جدید */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;
  const sh = RIA.shell({ foot: 'رمزت یادت آمد؟ <a class="link" href="' + RIA.cfg.loginUrl + '">بازگشت به ورود</a>', artTitle: 'اتفاقی نیست', artText: 'با کد پیامکی هویتت را تأیید می‌کنی و رمز تازه می‌گذاری' });
  document.title = 'فراموشی رمز عبور | ResumeIt';
  const LABELS = ['شماره', 'تأیید', 'رمز جدید'];
  let mobile = '';

  function step1() {
    const html = RIA.stepper(LABELS, 1) + '<h1 data-focus>فراموشی رمز عبور</h1><p>شماره موبایل حسابت رو بنویس تا کد بازیابی رو برات بفرستیم</p><form id="f" novalidate>' + RIA.mobileField({ value: mobile }) +
      '<button type="submit" class="btn btn--primary btn--block" id="sb">ارسال کد بازیابی</button></form><div class="note">' + RIA.icon('shield') + '<span>اول شماره‌ات رو تأیید می‌کنیم، با تغییر رمز از دستگاه‌های قبلی خارج می‌شی</span></div>';
    RIA.swap(sh.view, html, (root) => {
      const m = RIA.bindMobile(root);
      RIA.watchMark(root,()=>RIA.isMobile(m.value())?1:0);
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), ''); const mob = m.validate(); if (!mob) return;
        try { await RIA.run(sh.card, () => RIA.api.sendOtp(mob, 'reset'), 'در حال ارسال کد…', $('#sb', root)); mobile = mob; step2(); }
        catch (er) { RIA.handleError($('#f', root), er); }
      });
    });
  }
  function step2() { RIA.otpStep({ view: sh.view, card: sh.card, mobile: mobile, purpose: 'reset', top: RIA.stepper(LABELS, 2), title: 'کد بازیابی رو وارد کن', submitLabel: 'تأیید کد', onBack: step1, onVerified: step3 }); }
  function step3() {
    const html = RIA.stepper(LABELS, 3) + '<h1 data-focus>رمز عبور تازه</h1><p>یه رمز تازه انتخاب کن که جای دیگه ازش استفاده نکردی</p><form id="f" novalidate>' + RIA.newPassHtml() + '<button type="submit" class="btn btn--primary btn--block" id="sb">تغییر رمز عبور</button></form>';
    RIA.swap(sh.view, html, (root) => {
      const np = RIA.bindNewPass(root);
      RIA.watchMark(root,()=>{const p=$('#np',root).value;return p.length>=8 && p.length<=128 && p===$('#np2',root).value?3:2;});
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), ''); if (!np.validate()) return;
        try { await RIA.run(sh.card, () => RIA.api.setPassword(mobile, np.value(), 'reset'), 'در حال ذخیرهٔ رمز جدید…', $('#sb', root), true); finish(); }
        catch (er) { if (er.code === 'weak') np.setError(er.message); else RIA.handleError($('#f', root), er); }
      });
    });
  }
  function finish(){RIA.enterDashboard(sh.card,sh.view,{title:'رمز عبور تغییر کرد',text:'رمزت ذخیره شد و از دستگاه‌های قبلی خارج شدی'});}

  RIA.boot(sh.view, step1);
});
