const form = document.querySelector('form[data-mode]');
const digits = value => value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const normalizePhone = value => digits(value.trim()).replace(/[\s()-]/g,'').replace(/^(\+98|0098)/,'0');
if (form) {
  const message=document.querySelector('#form-message'), submit=document.querySelector('#continue');
  const resend=document.querySelector('#resend');
  let stage='phone', method='password', challengeId='', registrationToken='', phone='', retryAt=0, busy=false;
  const mode=form.dataset.mode, purpose=mode==='register'?'register':mode==='forgot-password'?'reset':'login';
  function showStage(next) {
    stage=next;
    form.querySelectorAll('[data-stage]').forEach(field=>{field.hidden=field.dataset.stage!==next;field.disabled=field.hidden;});
    document.querySelectorAll('[data-stage-label]').forEach(label=>label.classList.toggle('active',label.dataset.stageLabel===next));
    submit.textContent=next==='password'?(mode==='forgot-password'?'ذخیرهٔ رمز و ورود':'ساخت حساب'):next==='code'?'تأیید کد و ادامه':mode==='login'&&method==='password'?'ورود به حساب':'دریافت کد تأیید';
    document.querySelector('#login-password')?.toggleAttribute('hidden',method!=='password');
    if(mode==='login') form.elements.password.required=method==='password';
    if(mode==='login') form.elements.password.disabled=method!=='password'||next!=='phone';
    form.querySelector('[data-stage="'+next+'"] input')?.focus();
  }
  function tick() {
    if(!resend) return;
    const seconds=Math.max(0,Math.ceil((retryAt-Date.now())/1000));
    resend.disabled=busy||seconds>0;
    resend.textContent=seconds?'ارسال دوباره تا '+seconds+' ثانیه':'ارسال دوبارهٔ کد';
  }
  setInterval(tick,1000);
  async function api(path,body) {
    const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'درخواست انجام نشد.');
    return result;
  }
  async function run(action) {
    if(busy) return;
    busy=true;submit.disabled=true;form.setAttribute('aria-busy','true');message.textContent='در حال انجام درخواست…';tick();
    document.querySelectorAll('[data-method],#edit-phone').forEach(button=>button.disabled=true);
    try { await action(); }
    catch(error) { message.textContent=error.message==='Failed to fetch'?'ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.':error.message; }
    finally { busy=false;submit.disabled=false;form.removeAttribute('aria-busy');document.querySelectorAll('[data-method],#edit-phone').forEach(button=>button.disabled=false);tick(); }
  }
  async function requestCode() {
    const result=await api('otp/request',{phone,purpose});
    challengeId=result.challengeId;registrationToken='';retryAt=Date.now()+result.retryAfter*1000;
    document.querySelector('#code-phone').textContent=phone;form.elements.otp.value='';showStage('code');
    message.textContent='درخواست پیامک ثبت شد. کد تا دو دقیقه معتبر است.';tick();
  }
  document.querySelectorAll('[data-method]').forEach(button=>button.addEventListener('click',()=>{
    method=button.dataset.method;challengeId='';registrationToken='';message.textContent='';
    document.querySelectorAll('[data-method]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});showStage('phone');
  }));
  document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',()=>{message.textContent='ورود با این حساب هنوز فعال نیست.';}));
  document.querySelector('#edit-phone')?.addEventListener('click',()=>{challengeId='';registrationToken='';message.textContent='';showStage('phone');});
  resend?.addEventListener('click',()=>run(requestCode));

  form.addEventListener('submit',event=>{
    event.preventDefault();if(busy) return;
    run(async()=>{
      if(stage==='phone') {
        phone=normalizePhone(form.elements.phone.value);
        if(!/^09\d{9}$/.test(phone)) { form.elements.phone.focus();throw new Error('شمارهٔ موبایل معتبر وارد کن.'); }
        if(mode==='login'&&method==='password') { await api('login',{phone,password:form.elements.password.value});form.elements.password.value='';location.assign('/dashboard/'); }
        else await requestCode();
      } else if(stage==='code') {
        const code=digits(form.elements.otp.value.trim());
        if(!/^\d{6}$/.test(code)) throw new Error('کد شش‌رقمی معتبر وارد کن.');
        const result=await api('otp/verify',{challengeId,code,purpose});
        form.elements.otp.value='';
        if(mode!=='login') { registrationToken=mode==='register'?result.registrationToken:result.resetToken;showStage('password');message.textContent='شماره تأیید شد. تا پنج دقیقه فرصت داری رمز انتخاب کنی.'; }
        else location.assign('/dashboard/');
      } else {
        const password=form.elements.password.value;
        if(password!==form.elements.confirm.value) throw new Error('تکرار رمز با رمز عبور یکسان نیست.');
        await api(mode==='forgot-password'?'password/reset':'register',mode==='forgot-password'?{resetToken:registrationToken,password}:{registrationToken,password});form.elements.password.value='';form.elements.confirm.value='';location.assign('/dashboard/');
      }
    });
  });
  document.querySelector('.reveal-password')?.addEventListener('click',event=>{
    const password=form.elements.password,visible=password.type==='password';password.type=visible?'text':'password';
    event.currentTarget.textContent=visible?'پنهان':'نمایش';event.currentTarget.setAttribute('aria-pressed',String(visible));event.currentTarget.setAttribute('aria-label',visible?'پنهان کردن رمز عبور':'نمایش رمز عبور');
  });
  showStage('phone');
}
