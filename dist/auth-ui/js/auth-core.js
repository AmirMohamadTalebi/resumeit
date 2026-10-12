/* اجزای مشترک صفحه‌های احراز هویت: فیلدها، OTP، رمز، لودینگ، توست، انتقال بین مرحله‌ها */
(function () {
  'use strict';
  const RIA = (window.RIA = window.RIA || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  RIA.$ = $; RIA.$$ = $$;
  RIA.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RIA.icon = (n, c) => (window.RI && window.RI.icon ? window.RI.icon(n, c) : '');
  RIA.reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fa = new Intl.NumberFormat('fa-IR');
  RIA.fa = (n) => fa.format(n);

  /* ---------- ورودی‌ها ---------- */
  RIA.digits = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  RIA.normMobile = (s) => { let v = RIA.digits(s).replace(/[\s\-()]/g, ''); v = v.replace(/^(\+98|0098)/, '0'); if (/^9\d{9}$/.test(v)) v = '0' + v; return v; };
  RIA.isMobile = (s) => /^09\d{9}$/.test(s);
  RIA.maskMobile = (m) => m.slice(0, 4) + ' ••• ' + m.slice(7);
  RIA.showMobile = (m) => m.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');

  /* ---------- انتقال بین نماها ---------- */
  RIA.swap = function (root, html, init) {
    const revision = (root._revision || 0) + 1; root._revision = revision;
    const run = () => {
      if (root._revision !== revision) return;
      root.innerHTML = html;
      const h = $('[data-focus]', root) || $('h1', root);
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      if (!RIA.reduce()) root.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,.8,.28,1)' });
      if (init) init(root);
    };
    if (root.children.length && !RIA.reduce()) root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(run, run); else run();
  };

  /* ---------- توست ---------- */
  RIA.toast = function (msg, kind) {
    const root = $('#toast-root'); if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'info');
    el.innerHTML = RIA.icon(kind === 'error' ? 'alert' : kind === 'success' ? 'check' : 'info') + '<span>' + RIA.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); }, 3400);
  };

  /* ---------- لودینگ ----------
     busy(card, 'پیام') یک پوشش روی کارت می‌گذارد؛ اگر عملیات طول بکشد پیام «کمی طول کشید» می‌آید. */
  RIA.busy = function (host, msg) {
    if(host.dataset.pending)throw new Error('درخواست قبلی هنوز تمام نشده است.');
    host.dataset.pending='true';const content=$('#view',host);if(content)content.inert=true;
    const o = document.createElement('div');
    o.className = 'busy'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
    o.innerHTML = '<div class="busy__box"><span class="loading loading-dots loading-lg" aria-hidden="true"></span><b class="busy__msg">' + RIA.esc(msg || 'لطفاً صبر کنید…') + '</b><small class="busy__slow" hidden>کمی بیشتر از معمول طول کشید؛ لطفاً صفحه را نبندید.</small></div>';
    host.appendChild(o);
    host.setAttribute('aria-busy', 'true');
    const t = setTimeout(() => { $('.busy__slow', o).hidden = false; }, RIA.cfg.slowNoticeMs);
    requestAnimationFrame(() => o.classList.add('is-on'));
    return {
      text(m) { $('.busy__msg', o).textContent = m; },
      done() { clearTimeout(t); delete host.dataset.pending;if(content)content.inert=false; host.removeAttribute('aria-busy'); o.classList.remove('is-on'); setTimeout(() => o.remove(), 200); },
    };
  };
  /* اجرای یک عملیات ناهمگام با دکمه یا پوششِ لودینگ */
  RIA.run = async function (card, promiseFn, msg, btn) {
    const b = RIA.busy(card, msg); if (btn) btn.disabled = true;
    try { return await promiseFn(); } finally { b.done(); if (btn) btn.disabled = false; }
  };

  /* ---------- خطای فرم ---------- */
  RIA.formError = function (root, msg) {
    let e = $('.formerr', root);
    if (!msg) { if (e) e.hidden = true; return; }
    if (!e) { e = document.createElement('div'); e.className = 'formerr'; e.setAttribute('role', 'alert'); root.prepend(e); }
    e.hidden = false; e.innerHTML = RIA.icon('alert') + '<span>' + RIA.esc(msg) + '</span>';
    if (!RIA.reduce()) e.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 });
  };
  RIA.handleError=function(root,error){if(error.code!=='ACCOUNT_NOT_FOUND'){RIA.formError(root,error.message);return;}let dialog=$('#account-notice');if(!dialog){dialog=document.createElement('dialog');dialog.id='account-notice';dialog.className='modal account-notice';dialog.setAttribute('aria-labelledby','account-title');dialog.innerHTML='<div class="modal-box"><button type="button" class="notice-close" aria-label="بستن">×</button><div class="notice-icon">'+RIA.icon('user')+'</div><h2 id="account-title">هنوز حسابی با این شماره ندارید</h2><p>برای شروع، حساب بسازید. برای این درخواست پیامکی ارسال نشده است.</p><a class="btn btn--primary btn--block" href="/register/">ساخت حساب</a><button type="button" class="btn btn--ghost btn--block" id="edit-number">ویرایش شماره</button></div>';document.body.appendChild(dialog);$('.notice-close',dialog).onclick=()=>dialog.close();$('#edit-number',dialog).onclick=()=>dialog.close();dialog.addEventListener('close',()=>$('#mobile')?.focus());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}if(!dialog.open)dialog.showModal();};
  RIA.fieldError = function (field, msg) {
    const g = field.closest('.field'), e = $('.field__error', g), inp = $('input', g);
    if (msg) { e.innerHTML = RIA.icon('alert') + RIA.esc(msg); e.hidden = false; inp.setAttribute('aria-invalid', 'true'); }
    else { e.hidden = true; inp.removeAttribute('aria-invalid'); }
  };

  /* ---------- فیلد موبایل ---------- */
  RIA.mobileField = (o) => {
    o = o || {};
    return '<div class="field"><label class="field__label" for="' + (o.id || 'mobile') + '">شمارهٔ موبایل</label><div class="inputwrap">' + RIA.icon('phone') + '<input class="input" id="' + (o.id || 'mobile') + '" name="mobile" type="tel" inputmode="numeric" dir="ltr" autocomplete="tel-national" placeholder="09123456789" maxlength="14" value="' + RIA.esc(o.value || '') + '"' + (o.disabled ? ' disabled' : '') + ' aria-describedby="' + (o.id || 'mobile') + '_e"></div><div class="field__error" id="' + (o.id || 'mobile') + '_e" hidden></div>' + (o.hint ? '<div class="field__hint">' + o.hint + '</div>' : '') + '</div>';
  };
  RIA.bindMobile = function (root, id) {
    const inp = $('#' + (id || 'mobile'), root); if (!inp) return null;
    inp.addEventListener('input', () => { const p = inp.selectionStart; inp.value = RIA.digits(inp.value).replace(/[^\d+]/g, ''); RIA.fieldError(inp, ''); });
    return { value: () => RIA.normMobile(inp.value), validate() { const v = RIA.normMobile(inp.value); if (!v) { RIA.fieldError(inp, 'شمارهٔ موبایل را وارد کنید.'); inp.focus(); return null; } if (!RIA.isMobile(v)) { RIA.fieldError(inp, 'شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد؛ مثلاً ۰۹۱۲۳۴۵۶۷۸۹.'); inp.focus(); return null; } return v; }, input: inp };
  };

  /* ---------- رمز عبور ---------- */
  RIA.passField = (o) => {
    const id = o.id || 'pass';
    return '<div class="field"><label class="field__label" for="' + id + '">' + RIA.esc(o.label || 'رمز عبور') + (o.extra || '') + '</label><div class="inputwrap">' + RIA.icon('lock') + '<input class="input" id="' + id + '" name="' + id + '" type="password" maxlength="128" dir="ltr" autocomplete="' + (o.auto || 'current-password') + '" aria-describedby="' + id + '_e"><button type="button" class="eye" data-eye="' + id + '" aria-label="نمایش رمز" aria-pressed="false">' + RIA.icon('eye') + '</button></div><div class="field__error" id="' + id + '_e" hidden></div></div>';
  };
  RIA.bindEyes = function (root) {
    $$('[data-eye]', root).forEach((b) => b.addEventListener('click', () => { const i = $('#' + b.dataset.eye, root), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز'); b.innerHTML = RIA.icon(show ? 'eyeOff' : 'eye'); i.focus(); }));
  };
  RIA.rules = [['۸ تا ۱۲۸ نویسه', (p) => p.length >= 8 && p.length <= 128]];
  RIA.strength = function (p) { let s = 0; if (p.length >= 8) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++; return p ? Math.max(1, s) : 0; };
  RIA.newPassHtml = () => RIA.passField({ id: 'np', label: 'رمز عبور جدید', auto: 'new-password' }) + '<div class="strength" id="stg" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="strength__txt" id="stt" aria-live="polite"></div><ul class="rules" id="rules">' + RIA.rules.map((r, i) => '<li data-r="' + i + '">' + RIA.icon('check') + r[0] + '</li>').join('') + '</ul>' + RIA.passField({ id: 'np2', label: 'تکرار رمز عبور', auto: 'new-password' });
  RIA.bindNewPass = function (root) {
    const p = $('#np', root), p2 = $('#np2', root), W = ['', 'ضعیف', 'متوسط', 'خوب', 'قوی'];
    RIA.bindEyes(root);
    p.addEventListener('input', () => { const l = RIA.strength(p.value); $('#stg', root).dataset.level = l; $('#stt', root).textContent = l ? 'قدرت رمز: ' + W[l] : ''; RIA.rules.forEach((r, i) => $('[data-r="' + i + '"]', root).classList.toggle('is-ok', r[1](p.value))); RIA.fieldError(p, ''); });
    p2.addEventListener('input', () => RIA.fieldError(p2, ''));
    return { value: () => p.value, validate() { let bad = null; if (!RIA.rules.every((r) => r[1](p.value))) { RIA.fieldError(p, 'رمز باید بین ۸ تا ۱۲۸ نویسه باشد.'); bad = p; } else RIA.fieldError(p, ''); if (p.value !== p2.value) { RIA.fieldError(p2, 'تکرار رمز با رمز بالا یکی نیست.'); bad = bad || p2; } else RIA.fieldError(p2, ''); if (bad) { bad.focus(); return false; } return true; }, setError: (m) => { RIA.fieldError(p, m); p.focus(); } };
  };

  /* ---------- کد یک‌بارمصرف ---------- */
  RIA.otpHtml = (label) => '<div class="field"><div class="field__label" id="otpl">' + RIA.esc(label || 'کد ۶ رقمی') + '</div><div class="otp" id="otp" dir="ltr" role="group" aria-labelledby="otpl">' + Array.from({ length: RIA.cfg.otpLength }, (_, i) => '<input class="otp__i" inputmode="numeric" maxlength="' + (i ? 1 : RIA.cfg.otpLength) + '" autocomplete="' + (i ? 'off' : 'one-time-code') + '" aria-label="رقم ' + RIA.fa(i + 1) + '">').join('') + '</div><div class="field__error" id="otp_e" role="alert" hidden></div></div>';
  RIA.bindOtp = function (root, onComplete) {
    const box = $('#otp', root), ins = $$('.otp__i', box), err = $('#otp_e', root);
    const val = () => ins.map((i) => i.value).join('');
    const setErr = (m) => { box.classList.toggle('is-bad', !!m); err.hidden = !m; err.innerHTML = m ? RIA.icon('alert') + RIA.esc(m) : ''; if (m && !RIA.reduce()) box.animate([{ transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 300 }); };
    const fill = (s) => { const d = RIA.digits(s).replace(/\D/g, '').slice(0, ins.length); ins.forEach((i, k) => { i.value = d[k] || ''; i.classList.toggle('has', !!i.value); }); (ins[Math.min(d.length, ins.length - 1)]).focus(); if (d.length === ins.length) onComplete && onComplete(d); };
    ins.forEach((inp, i) => {
      inp.addEventListener('input', () => { const d = RIA.digits(inp.value).replace(/\D/g, ''); if (d.length > 1) { fill(val().slice(0, i) + d); return; } inp.value = d; inp.classList.toggle('has', !!d); setErr(''); if (d && i < ins.length - 1) ins[i + 1].focus(); if (val().length === ins.length) onComplete && onComplete(val()); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i > 0) { ins[i - 1].focus(); ins[i - 1].value = ''; ins[i - 1].classList.remove('has'); } if (e.key === 'ArrowRight' && i < ins.length - 1) { e.preventDefault(); ins[i + 1].focus(); } if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); ins[i - 1].focus(); } });
      inp.addEventListener('paste', (e) => { e.preventDefault(); fill((e.clipboardData || window.clipboardData).getData('text')); });
      inp.addEventListener('focus', () => inp.select());
    });
    return { value: val, error: setErr, clear() { ins.forEach((i) => { i.value = ''; i.classList.remove('has'); }); ins[0].focus(); }, disable(b) { ins.forEach((i) => { i.disabled = b; }); }, focus: () => ins[0].focus() };
  };

  /* شمارندهٔ ارسال مجدد */
  RIA.resend = function (root, onResend) {
    const el = $('#resend', root); let left = RIA.cfg.otpResendSeconds, t;
    const draw = () => { el.innerHTML = left > 0 ? 'ارسال دوبارهٔ کد تا <b class="num">' + RIA.fa(String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0')) + '</b> دیگر' : '<button type="button" class="link" id="resendBtn">ارسال دوبارهٔ کد</button>'; const b = $('#resendBtn', el); if (b) b.addEventListener('click', async () => { b.disabled = true; try { await onResend(); left = RIA.cfg.otpResendSeconds; start(); draw(); RIA.toast('درخواست کد تازه ثبت شد', 'success'); } catch (e) { RIA.toast(e.message, 'error'); draw(); } }); };
    const start = () => { clearInterval(t); t = setInterval(() => { if (left > 0) { left--; draw(); } else clearInterval(t); }, 1000); };
    draw(); start();
    return { stop: () => clearInterval(t) };
  };

  /* ---------- ورود اجتماعی (نمایشی) ---------- */
  const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.700h5.400a4.600 4.600 0 0 1-2 3v2.500h3.200c1.900-1.700 3-4.300 3-7.300z"/><path fill="#34A853" d="M12 22c2.700 0 5-.9 6.600-2.400l-3.200-2.500c-.9.600-2 1-3.400 1-2.600 0-4.800-1.800-5.600-4.100H3.100v2.600A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.400 14c-.2-.6-.3-1.300-.3-2s.1-1.400.3-2V7.400H3.100a10 10 0 0 0 0 9.200z"/><path fill="#EA4335" d="M12 5.900c1.500 0 2.800.5 3.800 1.500l2.800-2.800A10 10 0 0 0 3.100 7.400L6.400 10c.8-2.300 3-4.100 5.600-4.100z"/></svg>';
  RIA.socialHtml = (verb) => '<div class="or"><span>یا</span></div><div class="social"><button type="button" class="btn btn--social" data-social="google">' + GOOGLE + verb + ' با گوگل</button><button type="button" class="btn btn--social" data-social="github">' + RIA.icon('github') + verb + ' با گیت‌هاب</button></div>';
  RIA.bindSocial = function(root){$$('[data-social]',root).forEach(b=>b.addEventListener('click',()=>RIA.formError($('form',root)||root,'ورود با گوگل و گیت‌هاب هنوز فعال نشده است. از شماره و رمز یا کد پیامکی استفاده کنید.')));};

  /* ---------- نمای موفقیت / ورود به داشبورد ---------- */
  RIA.successHtml = (o) => '<div class="done"><div class="done__art">' + RIA.icon(o.icon || 'check') + '</div><h1 data-focus>' + o.title + '</h1><p>' + o.text + '</p>' + (o.note ? '<div class="note">' + RIA.icon('info') + '<span>' + o.note + '</span></div>' : '') + o.actions + '</div>';
  RIA.enterDashboard = function (card, view, o) {
    RIA.swap(view, RIA.successHtml({ icon: 'check', title: o.title, text: o.text, note: o.note, actions: '<button type="button" class="btn btn--primary btn--block" id="goDash">' + RIA.icon('rocket') + 'ورود به داشبورد</button>' }), (r) => {
      $('#goDash', r).addEventListener('click', async (e) => {
        const b = RIA.busy(card, 'در حال آماده‌سازی داشبورد…');
        try { await RIA.api.enterDashboard(); b.done(); window.location.href = RIA.cfg.dashboardUrl; } catch (er) { b.done(); RIA.toast(er.message, 'error'); }
      });
    });
  };

  /* ---------- لودینگ اولیهٔ صفحه ---------- */
  RIA.boot = function(root,render){render();};

  /* ---------- پوستهٔ مشترک صفحه ---------- */
  RIA.shell = function (o) {
    document.getElementById('auth-root').innerHTML =
      '<a class="skip" href="#view">رفتن به محتوا</a><main class="auth"><section class="auth__main"><header class="auth__top"><a class="brand" href="' + (o.home || '/') + '" aria-label="ResumeIt"><img class="brand__logo" src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="150" height="50"></a><a class="link link--sm" href="/">بازگشت به سایت</a></header>' +
      '<div class="card" id="card"><div id="view"></div></div><footer class="auth__foot">' + (o.foot || '') + '</footer></section>' +
      '<aside class="auth__art" aria-hidden="true"><div class="art"><div class="art__glow"></div><div class="art__logo"><img src="/brand/resumeit-mark-v1.png" alt="" width="180" height="180"></div><div class="art__card art__card--resume"><i class="av"></i><b></b><s></s><s></s><div class="tags"><u></u><u></u><u></u></div></div><div class="art__card art__card--links"><i class="av"></i><b></b><span></span><span></span><span class="hot"></span></div><div class="art__copy"><h2>' + o.artTitle + '</h2><p>' + o.artText + '</p></div></div></aside></main><div id="toast-root" class="toast-root" aria-live="polite"></div>';
    return { card: $('#card'), view: $('#view') };
  };
})();
