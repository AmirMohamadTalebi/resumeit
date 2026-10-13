(() => {
  'use strict';
  const RI=window.RI;
  RI.accountRequest=async(route,data)=>{
    const response=await fetch('/api/auth/'+route,{method:data?'POST':'GET',credentials:'same-origin',headers:{...(data?{'Content-Type':'application/json'}:{}),...(RI.ownerId?{'X-ResumeIt-Owner':RI.ownerId}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'درخواست انجام نشد، دوباره امتحان کن');return result;
  };
  RI.applyAccount=user=>{
    RI.ownerId=user.id;
    RI.state.account.isAdmin=!!user.is_admin;
    Object.assign(RI.state.account,{mobile:user.phone||'',mobileVerified:!!user.phone_verified,firstName:user.first_name||'',lastName:user.last_name||'',google:!!user.google,github:!!user.github,name:[user.first_name,user.last_name].filter(Boolean).join(' ')||'حساب من'});
  };
  RI.reloadAccount=async()=>{const {user}=await RI.accountRequest('session');if(!user)throw new Error('دوباره وارد حسابت شو');RI.applyAccount(user);RI.emit('change',{});};
  RI.phoneDialog=()=>{
    let challenge,phone='',pending=false,capture,timer;
    const stop=()=>{capture?.abort();clearTimeout(timer);};
    const digits=value=>String(value).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g,'');
    const dialog=RI.modal({title:'شماره موبایلت رو تأیید کن',size:'sm',body:'<p>شماره باید مال خودت باشه و روی حساب دیگه‌ای ثبت نشده باشه</p><label class="field__label" for="account-phone">شماره موبایل</label><input class="input ltr" id="account-phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="11" value="'+RI.esc(RI.state.account.mobile)+'"><div id="phone-error" role="alert"></div>',onClose:stop});
    const error=message=>{const el=RI.$('#phone-error',dialog.body);if(el)el.textContent=message;};
    const action=(label,fn)=>({label,kind:'primary',keepOpen:true,onClick:async(api,event,button)=>{
      if(pending)return;pending=true;button.disabled=true;error('');
      try{await fn();}catch(e){error(e.message);RI.toast(e.message,{kind:'error'});}finally{pending=false;button.disabled=false;}
    }});
    dialog.setActions([{label:'انصراف',kind:'ghost'},action('ارسال کد',async()=>{
      phone=digits(RI.$('#account-phone',dialog.body).value);if(!/^09\d{9}$/.test(phone))throw new Error('شماره رو با ۰۹ و ۱۱ رقم بنویس');
      let captured;
      stop();
      if(window.isSecureContext&&'OTPCredential' in window&&navigator.credentials){
        capture=new AbortController();timer=setTimeout(()=>capture.abort(),120000);
        navigator.credentials.get({otp:{transport:['sms']},signal:capture.signal}).then(credential=>{if(!credential||dialog.closed)return;captured=credential.code;const input=RI.$('#account-code',dialog.body);if(input){input.value=digits(captured);RI.toast('کد جایگذاری شد، حالا تأییدش کن');}}).catch(()=>{});
      }
      try{challenge=await RI.accountRequest('phone/request',{phone});}catch(e){stop();throw e;}
      if(dialog.closed)return;
      dialog.setBody('<p>کد ۶ رقمی رو برای <b class="ltr-inline">'+RI.esc(phone)+'</b> درخواست کردیم، تا دو دقیقه اعتبار داره</p><label class="field__label" for="account-code">کد تأیید</label><input class="input ltr" id="account-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" enterkeyhint="done"><div id="phone-error" role="alert"></div>');
      if(captured)RI.$('#account-code',dialog.body).value=digits(captured);
      dialog.setActions([{label:'بستن',kind:'ghost'},action('تأیید شماره',async()=>{
        const code=digits(RI.$('#account-code',dialog.body).value);if(!/^\d{6}$/.test(code))throw new Error('کد ۶ رقمی رو کامل وارد کن');
        await RI.accountRequest('phone/verify',{challengeId:challenge.challengeId,code});stop();await RI.reloadAccount();dialog.close();RI.rerender();RI.toast('شماره‌ات تأیید و ذخیره شد');
      })]);
      RI.toast('درخواست کد ثبت شد، پیامکت رو چک کن');
    })]);
  };
})();
