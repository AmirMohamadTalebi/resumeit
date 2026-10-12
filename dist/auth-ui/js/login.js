/* صفحهٔ ورود: رمز عبور یا کد پیامکی؛ نام کاربری همان شمارهٔ موبایل است */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const RIA = window.RIA, $ = RIA.$;
  const sh = RIA.shell({ foot: 'حساب نداری؟ <a class="link" href="' + RIA.cfg.signupUrl + '">ثبت‌نام کن</a>', artTitle: 'دوباره خوش آمدی', artText: 'رزومه و صفحهٔ لینکت همان‌جا که گذاشتی منتظرند' });
  document.title = 'ورود | ResumeIt';
  let mode = 'pass', mobileKeep = '';

  function main() {
    const tabs = '<div class="segmented" role="tablist" aria-label="روش ورود"><button type="button" role="tab" data-mode="pass" aria-selected="' + (mode === 'pass') + '">' + RIA.icon('key') + 'رمز عبور</button><button type="button" role="tab" data-mode="otp" aria-selected="' + (mode === 'otp') + '">' + RIA.icon('phone') + 'کد پیامکی</button></div>';
    const html = '<h1 data-focus>ورود به حساب</h1><p>با شماره موبایلت وارد شو</p>' + tabs +
      '<form id="f" novalidate>' + RIA.mobileField({ value: mobileKeep }) +
      (mode === 'pass' ? RIA.passField({ id: 'pass', extra: '<a class="link link--sm" href="' + RIA.cfg.forgotUrl + '">فراموشی رمز عبور؟</a>' }) : '<div class="field__hint hint--otp">یه کد ورود به این شماره پیامک می‌کنیم</div>') +
      '<button type="submit" class="btn btn--primary btn--block" id="sb">' + (mode === 'pass' ? 'ورود' : 'دریافت کد ورود') + '</button></form>';
    RIA.swap(sh.view, html, (root) => {
      const m = RIA.bindMobile(root); RIA.bindEyes(root);
      RIA.watchMark(root,()=>RIA.isMobile(m.value()) ? (mode==='pass' && $('#pass',root).value.length ? 3 : 1) : 0);
      if (mode === 'pass') $('#pass', root).addEventListener('input', () => RIA.fieldError($('#pass', root), ''));
      RIA.$$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => { mobileKeep = m.input.value; if(mode===b.dataset.mode)return; mode = b.dataset.mode; main(); }));
      RIA.$$('[data-mode]',root).forEach(b=>{b.tabIndex=b.dataset.mode===mode?0:-1;b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?'pass':e.key==='End'?'otp':mode==='pass'?'otp':'pass';RIA.$('[data-mode="'+target+'"]',root).click();RIA.$('[data-mode="'+target+'"]',sh.view)?.focus();}});});
      $('#f', root).addEventListener('submit', async (e) => {
        e.preventDefault(); if(sh.card.dataset.pending)return; RIA.formError($('#f', root), '');
        const mob = m.validate(); if (!mob) return;
        if (mode === 'pass') {
          const pw = $('#pass', root);
          if (!pw.value) { RIA.fieldError(pw, 'رمزت رو وارد کن'); pw.focus(); return; }
          try { await RIA.run(sh.card, () => RIA.api.loginWithPassword(mob, pw.value), 'در حال ورود…', $('#sb', root), true); done(); }
          catch (er) { RIA.handleError($('#f', root), er); if (er.code === 'credentials') { pw.value = ''; RIA.setMark(1); pw.focus(); } }
        } else {
          try { await RIA.run(sh.card, () => RIA.api.sendOtp(mob, 'login'), 'در حال ارسال کد…', $('#sb', root)); mobileKeep = mob; otpView(mob); }
          catch (er) { RIA.handleError($('#f', root), er); }
        }
      });
    });
  }
  function otpView(mob) { RIA.otpStep({ view: sh.view, card: sh.card, mobile: mob, purpose: 'login', title: 'کد ورود رو وارد کن', submitLabel: 'تأیید و ورود', onBack: main, onVerified: done }); }
  function done() { RIA.enterDashboard(sh.card, sh.view, { title: 'خوش آمدی!', text: 'وارد حسابت شدی' }); }

  RIA.boot(sh.view, main);
});
