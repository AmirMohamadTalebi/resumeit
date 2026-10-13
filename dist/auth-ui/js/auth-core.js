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

  RIA.termsHtml = () => '<div class="terms-field"><label class="terms-check" for="accept-terms"><input class="checkbox checkbox-sm" id="accept-terms" type="checkbox" required aria-describedby="terms-error"><span><a class="link" href="/terms/" target="_blank" rel="noopener">شرایط استفاده و حریم خصوصی</a> را خوانده‌ام و می‌پذیرم.</span></label><p id="terms-error" role="alert" hidden>برای ادامه، شرایط استفاده و حریم خصوصی را تأیید کن.</p></div>';
  RIA.requireTerms = root => {const input=$('#accept-terms',root);if(!input)return true;const valid=input.checked;$('#terms-error',root).hidden=valid;input.setAttribute('aria-invalid',String(!valid));if(!valid)input.focus();return valid;};
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
    run();
  };

  /* ---------- توست ---------- */
  RIA.toast = function (msg, kind) {
    window.ResumeItNotify(msg, {kind:kind||'info'});
  };
  RIA.socialHtml = () => '<div data-social-container hidden></div>';
  RIA.bindSocial = async root => {
    const container=$('[data-social-container]',root);if(!container)return;
    try {
      RIA.providersPromise ||= fetch('/api/auth/providers',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Providers unavailable');return r.json();});
      const providers=await RIA.providersPromise;
      if(!container.isConnected)return;
      const buttons=[['google','گوگل'],['github','گیت‌هاب']];
      container.innerHTML=buttons.length?'<div class="or">یا با حساب دیگه‌ات</div><div class="social">'+buttons.map(([key,name])=>providers[key]===true?'<a class="btn btn--social" data-social="'+key+'" href="/api/auth/'+key+'/start">'+RIA.icon(key)+name+'</a>':'<button class="btn btn--social" type="button" disabled title="ورود با این سرویس فعلاً آماده نیست">'+RIA.icon(key)+name+'</button>').join('')+'</div>':'';
      if(buttons.some(([key])=>providers[key]!==true))container.insertAdjacentHTML('beforeend','<p class="field__hint">روش‌های غیرفعال فعلاً آماده نیستند؛ با شماره موبایل وارد شو.</p>');container.hidden=false;container.addEventListener('click',e=>{if(e.target.closest('[data-social]')&&!RIA.requireTerms(root))e.preventDefault();});
    } catch {container.hidden=true;}
  };

  /* ---------- لودینگ ----------
     busy(card, 'پیام') یک پوشش روی کارت می‌گذارد؛ اگر عملیات طول بکشد پیام «کمی طول کشید» می‌آید */
  RIA.busy = function (host, msg) {
    if(host.dataset.pending)throw new Error('یه لحظه صبر کن تا درخواست قبلی تموم بشه');
    host.dataset.pending='true';const content=$('#view',host);if(content)content.inert=true;
    const o = document.createElement('div');
    o.className = 'busy'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
    o.innerHTML = '<div class="busy__box"><span class="loading loading-dots loading-lg" aria-hidden="true"></span><b class="busy__msg">' + RIA.esc(msg || 'یه لحظه صبر کن…') + '</b><small class="busy__slow" hidden>کمی بیشتر از معمول طول کشید؛ صفحه رو باز نگه دار</small></div>';
    host.appendChild(o);
    host.setAttribute('aria-busy', 'true');
    const t = setTimeout(() => { $('.busy__slow', o).hidden = false; }, RIA.cfg.slowNoticeMs);
    requestAnimationFrame(() => o.classList.add('is-on'));
    return {
      text(m) { $('.busy__msg', o).textContent = m; },
      done() { clearTimeout(t); delete host.dataset.pending;if(content)content.inert=false; host.removeAttribute('aria-busy'); o.remove(); },
    };
  };
  /* اجرای یک عملیات ناهمگام با دکمه یا پوششِ لودینگ */
  RIA.run = async function(card,promiseFn,msg,btn,final=false) {
    if(card.dataset.pending)throw new Error('یه لحظه صبر کن تا درخواست قبلی تموم بشه');
    let loading;
    if(final){card.dataset.pending='true';card.setAttribute('aria-busy','true');loading=RIA.centerMark(msg);}
    else loading=RIA.busy(card,msg);
    if(btn)btn.disabled=true;
    try {
      // Start the request immediately; reserve only enough display time for the R journey.
      if(!final)return await promiseFn();
      const [result]=await Promise.allSettled([Promise.resolve().then(promiseFn),new Promise(r=>setTimeout(r,RIA.reduce()?700:2400))]);
      if(result.status==='rejected')throw result.reason;
      return result.value;
    }finally{if(btn)btn.disabled=false;await loading.done();delete card.dataset.pending;card.removeAttribute('aria-busy');}
  };

  /* ---------- خطای فرم ---------- */
  RIA.formError = function (root, msg) {
    let e = $('.formerr', root);
    if (!msg) { if (e) e.hidden = true; return; }
    if (!e) { e = document.createElement('div'); e.className = 'formerr'; e.setAttribute('role', 'alert'); root.prepend(e); }
    e.hidden = false; e.innerHTML = RIA.icon('alert') + '<span>' + RIA.esc(msg) + '</span>';
    if (!RIA.reduce()) e.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 });
  };
  RIA.handleError=(root,error)=>RIA.formError(root,error.message);
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
    return { value: () => RIA.normMobile(inp.value), validate() { const v = RIA.normMobile(inp.value); if (!v) { RIA.fieldError(inp, 'شماره موبایلت رو وارد کن'); inp.focus(); return null; } if (!RIA.isMobile(v)) { RIA.fieldError(inp, 'شماره باید ۱۱ رقم باشه و با ۰۹ شروع بشه، مثل ۰۹۱۲۳۴۵۶۷۸۹'); inp.focus(); return null; } return v; }, input: inp };
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
    return { value: () => p.value, validate() { let bad = null; if (!RIA.rules.every((r) => r[1](p.value))) { RIA.fieldError(p, 'رمزت باید بین ۸ تا ۱۲۸ کاراکتر باشه'); bad = p; } else RIA.fieldError(p, ''); if (p.value !== p2.value) { RIA.fieldError(p2, 'این دو تا رمز با هم یکی نیستن'); bad = bad || p2; } else RIA.fieldError(p2, ''); if (bad) { bad.focus(); return false; } return true; }, setError: (m) => { RIA.fieldError(p, m); p.focus(); } };
  };

  /* ---------- کد یک‌بارمصرف ---------- */
  RIA.otpHtml = (label) => '<div class="field"><label class="field__label" for="otp-code">' + RIA.esc(label || 'کد ۶ رقمی') + '</label><div class="auth-otp" id="otp" dir="ltr"><input class="input otp__i" id="otp-code" name="code" type="text" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" enterkeyhint="done" placeholder="کد ۶ رقمی" aria-describedby="otp_e"></div><div class="field__error" id="otp_e" role="alert" hidden></div></div>';
  RIA.bindOtp = function (root) {
    const box = $('#otp', root), inp = $('#otp-code', root), err = $('#otp_e', root);
    const setErr = m => { box.classList.toggle('is-bad',!!m); err.hidden=!m; err.textContent=m||''; inp.setAttribute('aria-invalid',String(!!m)); };
    // Keyboard autofill may insert the SMS text, including its phone/domain, instead of just the code.
    const fill = s => { const text=RIA.digits(s),code=/#(\d{6})(?!\d)/.exec(text)?.[1] || /(?:^|\D)(\d{6})(?!\d)/.exec(text)?.[1];inp.value=code || text.replace(/\D/g,'').slice(0,6); inp.classList.toggle('has',!!inp.value); setErr(''); };
    inp.addEventListener('input',()=>fill(inp.value));
    inp.addEventListener('change',()=>fill(inp.value));
    inp.addEventListener('paste',e=>{e.preventDefault();fill(e.clipboardData.getData('text'));});
    const listen = () => { RIA.smsFill=code=>{if(inp.isConnected){fill(code);RIA.toast('کد جایگذاری شد، حالا تأییدش کن','success');}}; };
    listen();if(RIA.smsCode)RIA.smsFill(RIA.smsCode);
    inp.focus({preventScroll:true});
    return { value:()=>inp.value, error:setErr, listen, clear(){inp.value='';inp.classList.remove('has');inp.focus();}, disable:b=>{inp.disabled=b;}, focus:()=>inp.focus() };
  };

  RIA.stopSmsCapture = () => { RIA.smsController?.abort();clearTimeout(RIA.smsTimer);RIA.smsFill=null;RIA.smsCode=null; };
  RIA.startSmsCapture = () => {
    const fill=RIA.smsFill;
    RIA.stopSmsCapture();
    RIA.smsFill=fill;
    if(!window.isSecureContext || !('OTPCredential' in window) || !navigator.credentials)return;
    const controller=RIA.smsController=new AbortController();
    RIA.smsTimer=setTimeout(()=>controller.abort(),120000);
    navigator.credentials.get({otp:{transport:['sms']},signal:controller.signal}).then(credential=>{
      if(controller.signal.aborted || !credential)return;
      RIA.smsCode=credential.code;RIA.smsFill?.(credential.code);
    }).catch(()=>{}).finally(()=>{if(RIA.smsController===controller)clearTimeout(RIA.smsTimer);});
  };
  window.addEventListener('pagehide',()=>RIA.stopSmsCapture());

  /* شمارندهٔ ارسال مجدد */
  RIA.resend = function (root, onResend) {
    const el = $('#resend', root); let left = RIA.cfg.otpResendSeconds, t;
    const draw = () => { el.innerHTML = left > 0 ? 'ارسال دوبارهٔ کد تا <b class="num">' + RIA.fa(String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0')) + '</b> دیگر' : '<button type="button" class="link" id="resendBtn">ارسال دوبارهٔ کد</button>'; const b = $('#resendBtn', el); if (b) b.addEventListener('click', async () => { b.disabled = true; try { await onResend(); left = RIA.cfg.otpResendSeconds; start(); draw(); RIA.toast('درخواست کد تازه ثبت شد', 'success'); } catch (e) { RIA.toast(e.message, 'error'); draw(); } }); };
    const start = () => { clearInterval(t); t = setInterval(() => { if (left > 0) { left--; draw(); } else clearInterval(t); }, 1000); };
    draw(); start();
    return { stop: () => clearInterval(t) };
  };

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
  RIA.boot = function(root,render){sessionStorage.removeItem('ri-panel-choice');render();const url=new URL(location.href),error=url.searchParams.get('social_error');if(error){const messages={unavailable:'این روش ورود هنوز تنظیم نشده',invalid:'درخواست ورود معتبر نبود، دوباره امتحان کن',expired:'زمان ورود تموم شد، دوباره امتحان کن',cancelled:'ورود رو لغو کردی، می‌تونی دوباره امتحان کنی',limited:'چند بار تلاش کردی، یه کم صبر کن',failed:'اتصال به سرویس ورود انجام نشد، دوباره امتحان کن'};RIA.toast(messages[error]||messages.failed,'error');url.searchParams.delete('social_error');history.replaceState(null,'',url.pathname+url.search+url.hash);}};

  /* ---------- پوستهٔ مشترک صفحه ---------- */
  RIA.shell = function (o) {
    document.getElementById('auth-root').innerHTML =
      '<a class="skip" href="#view">رفتن به محتوا</a><main class="auth"><section class="auth__main"><header class="auth__top"><a class="brand" href="' + (o.home || '/') + '" aria-label="ResumeIt"><span class="ri-logo"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="2172" height="724"></span></a><a class="link link--sm" href="/">بازگشت به سایت</a></header>' +
      '<div class="card" id="card"><div id="view"></div></div><footer class="auth__foot">' + (o.foot || '') + '<div class="ri-support-links"><a href="/about/">درباره ما</a><a href="/terms/">شرایط و حریم خصوصی</a><a href="/contact/">ارتباط با ما</a><a href="https://t.me/resumeit_ir" target="_blank" rel="noopener">کانال تلگرام</a><a href="https://t.me/amirtalebi_x" target="_blank" rel="noopener">تلگرام پشتیبانی</a></div></footer></section>' +
      '<aside class="auth__art" aria-hidden="true"><div class="art"><div class="art__glow"></div>' + RIA.markHtml() + '<div class="art__copy"><h2>' + o.artTitle + '</h2><p>' + o.artText + '</p></div></div></aside></main><div id="toast-root" class="toast-root" aria-live="polite"></div>';
    return { card: $('#card'), view: $('#view') };
  };
})();
