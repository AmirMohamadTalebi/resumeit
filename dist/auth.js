const form=document.querySelector('form[data-mode]');
const digits=value=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const normalizePhone=value=>digits(value.trim()).replace(/[\s()-]/g,'').replace(/^(\+98|0098)/,'0');
function enterDemo(){try{sessionStorage.setItem('resumeit-demo-session','1');}catch{return false;}location.assign('/dashboard/');return true;}
if(form){
 const mode=form.dataset.mode,phone=form.elements.phone,message=document.querySelector('#form-message'),submit=document.querySelector('#continue');let stage='phone',method='password';
 const setStage=next=>{stage=next;form.querySelectorAll('[data-stage]').forEach(field=>{const active=field.dataset.stage===next;field.hidden=!active;field.disabled=!active;});document.querySelectorAll('[data-stage-label]').forEach(label=>{const active=label.dataset.stageLabel===next;label.classList.toggle('active',active);if(active)label.setAttribute('aria-current','step');else label.removeAttribute('aria-current');});message.textContent='';submit.textContent=next==='phone'?(mode==='login'&&method==='password'?'ورود به داشبورد ↖':'دریافت کد تأیید ↖'):next==='code'?'تأیید و ادامه ↖':mode==='register'?'ثبت رمز و ورود ↖':'ذخیرهٔ رمز و بازگشت به ورود ↖';if(next==='code')document.querySelector('#code-phone').textContent=normalizePhone(phone.value);form.querySelector('fieldset:not([hidden]) input')?.focus();};
 form.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
 form.elements.password?.addEventListener('input',()=>form.elements.confirm?.setCustomValidity(''));
 document.querySelectorAll('[data-method]').forEach(button=>button.addEventListener('click',()=>{method=button.dataset.method;document.querySelectorAll('[data-method]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});const panel=document.querySelector('#login-password');panel.hidden=method==='code';form.elements.password.disabled=method==='code';form.elements.password.required=method==='password';form.elements.otp.value='';setStage('phone');}));
 document.querySelector('#edit-phone').addEventListener('click',()=>{form.elements.otp.value='';setStage('phone');});
 document.querySelector('#resend').addEventListener('click',()=>{message.textContent='کد نمایشی همچنان 123456 است؛ پیامکی ارسال نمی‌شود.';form.elements.otp.value='';form.elements.otp.focus();});
 form.addEventListener('submit',event=>{
  event.preventDefault();message.textContent='';
  if(stage==='phone'){
   if(!/^09\d{9}$/.test(normalizePhone(phone.value))){phone.setCustomValidity('شمارهٔ موبایل معتبر وارد کن.');phone.reportValidity();return;}
   if(mode==='login'&&method==='password'){if(!enterDemo())message.textContent='ذخیره‌سازی مرورگر را برای ورود نمایشی فعال کن.';return;}
   setStage('code');return;
  }
  if(stage==='code'){
   if(digits(form.elements.otp.value)!=='123456'){form.elements.otp.setCustomValidity('برای پیش‌نمایش، کد 123456 را وارد کن.');form.elements.otp.reportValidity();return;}
   if(mode==='login'){if(!enterDemo())message.textContent='ذخیره‌سازی مرورگر را برای ورود نمایشی فعال کن.';return;}
   setStage('password');return;
  }
  if(form.elements.confirm.value!==form.elements.password.value){form.elements.confirm.setCustomValidity('تکرار رمز عبور یکسان نیست.');form.elements.confirm.reportValidity();return;}
  form.reset();
  if(mode==='forgot-password'){location.assign('/login/?reset=demo');return;}
  if(!enterDemo())message.textContent='ذخیره‌سازی مرورگر را برای ورود نمایشی فعال کن.';
 });
 document.querySelector('.reveal-password')?.addEventListener('click',event=>{const password=form.elements.password,visible=password.type==='password';password.type=visible?'text':'password';event.currentTarget.textContent=visible?'پنهان':'نمایش';event.currentTarget.setAttribute('aria-pressed',String(visible));event.currentTarget.setAttribute('aria-label',visible?'پنهان کردن رمز عبور':'نمایش رمز عبور');});
 document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',()=>{if(!enterDemo())message.textContent='ذخیره‌سازی مرورگر را برای ورود نمایشی فعال کن.';}));
 if(mode==='login'&&new URLSearchParams(location.search).get('reset')==='demo')message.textContent='مسیر بازیابی تمام شد؛ رمز واقعی تغییر نکرده است. می‌توانی ورود نمایشی را ادامه بدهی.';
}
