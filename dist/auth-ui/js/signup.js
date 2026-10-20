/* ثبت‌نام: شمارهٔ موبایل ← تأیید کد ← تعیین رمز عبور */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;
  const sh = RIA.shell({ foot: 'قبلاً ثبت‌نام کرده‌ای؟ <a class="link" href="' + RIA.cfg.loginUrl + '">وارد شو</a>', artTitle: 'هویت دیجیتالت را بساز', artText: 'یک رزومه و یک صفحهٔ لینک؛ با آدرس شخصی خودت' });
  document.title = 'ثبت‌نام | ResumeIt';
  const LABELS = ['شماره', 'تأیید', 'رمز عبور'];
  let mobile = '';

  function step1() {
    const html = RIA.stepper(LABELS, 1) + '<h1 data-focus>ساخت حساب</h1><p>شماره موبایلت رو بنویس، تأییدش کن و برای حسابت رمز بذار</p>' +
      '<form id="f" novalidate>' + RIA.mobileField({ value: mobile }) +
      RIA.termsHtml() + '<button type="submit" class="btn btn--primary btn--block" id="sb">دریافت کد تأیید</button></form>' + RIA.socialHtml();
    RIA.swap(sh.view, html, (root) => {
      const m = RIA.bindMobile(root);
      RIA.bindSocial(root);
      RIA.watchMark(root,()=>RIA.isMobile(m.value())?1:0);
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), '');
        if (!RIA.requireTerms(root)) return;
        const mob = m.validate(); if (!mob) return;
        try { await RIA.run(sh.card, () => RIA.api.sendOtp(mob, 'signup'), 'در حال ارسال کد…', $('#sb', root)); mobile = mob; step2(); }
        catch (er) {
          if (er.code === 'exists') { RIA.handleError($('#f', root), er); $('.formerr span', root).innerHTML = RIA.esc(er.message) + ' <a class="link" href="' + RIA.cfg.loginUrl + '">وارد شو</a> یا <a class="link" href="' + RIA.cfg.forgotUrl + '">رمزت رو بازیابی کن</a>.'; }
          else RIA.handleError($('#f', root), er);
        }
      });
    });
  }
  function step2() { RIA.otpStep({ view: sh.view, card: sh.card, mobile: mobile, purpose: 'signup', top: RIA.stepper(LABELS, 2), title: 'شماره‌ات رو تأیید کن', submitLabel: 'تأیید شماره', onBack: step1, onVerified: step3 }); }
  function step3() {
    const html = RIA.stepper(LABELS, 3) + '<h1 data-focus>یک رمز عبور بساز</h1><p>شمارهٔ <b class="ltr-inline">' + RIA.showMobile(mobile) + '</b> تأیید شد حالا برای حسابت رمز بذار</p><form id="f" novalidate>' + RIA.newPassHtml() + '<button type="submit" class="btn btn--primary btn--block" id="sb">ساخت حساب</button></form>';
    RIA.swap(sh.view, html, (root) => {
      const np = RIA.bindNewPass(root);
      RIA.watchMark(root,()=>{const p=$('#np',root).value;return p.length>=8 && p.length<=128 && p===$('#np2',root).value?3:2;});
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), ''); if (!np.validate()) return;
        try { await RIA.run(sh.card, () => RIA.api.setPassword(mobile, np.value(), 'signup'), 'در حال ساخت حساب…', $('#sb', root), true); RIA.enterDashboard(sh.card, sh.view, { title: 'حسابت ساخته شد 🎉', text: 'خوش آمدی! حالا می‌تونی رزومه و صفحه لینکت رو بسازی' }); }
        catch (er) { if (er.code === 'weak') np.setError(er.message); else RIA.expiredProof($('#f', root), er, step1); }
      });
    });
  }

  RIA.boot(sh.view, step1);
});
