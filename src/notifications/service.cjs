const {randomInt}=require('node:crypto'),{readJson}=require('../http/security.cjs'),{fail}=require('../dashboard/model.cjs');
const {providers,email,subscription,endpointId}=require('./providers.cjs'),templates=require('./email-templates.cjs');
module.exports=(database,options={})=>{
  const provider=options.provider||providers();const marketing=require('./marketing.cjs')(database,provider);let timer,busy=false,stopped=false,remindedAt=0;
  // user_notifications.reference is unique, so each user gets each stage once; a renewal moves the end and starts a fresh pair.
  async function subscriptionReminders(now=Date.now()){
    if(!database.dueSubscriptionReminders||!database.notify||now-remindedAt<36e5)return;remindedAt=now;
    for(const r of await database.dueSubscriptionReminders(now))await database.notify(r.userId,'payments',r.stage===1?'اشتراکت فردا تمام می‌شود':'اشتراکت یک هفتهٔ دیگر تمام می‌شود','صفحهٔ منتشرشده‌ات همان‌طور می‌ماند. بعد از پایان اشتراک، در ذخیره یا انتشار بعدی، قالب‌ها و فونت‌هایی که با اشتراک باز شده بودند به نسخهٔ رایگان برمی‌گردند؛ چیزهایی که جدا خریده‌ای می‌مانند. تمدید خودکار نیست و فقط با انتخاب خودت انجام می‌شود.','/dashboard/billing/','sub-end:'+r.userId+':'+r.end+':'+r.stage);
  }
  const policy=async()=>database.notificationPolicy?await database.notificationPolicy():{email:true,sms:true,push:true};
  const availability=enabled=>Object.fromEntries(['email','sms','push'].map(key=>[key,!!provider.available[key]&&enabled[key]]));
  const publicSettings=async owner=>{const value=await database.notificationChannels(owner),adminEnabled=await policy();return {available:availability(adminEnabled),adminEnabled,publicKey:provider.publicKey,email:value.email||'',pendingEmail:value.pending_email||'',emailVerified:!!value.email_verified,marketing:!!value.marketing_optin,enabled:{email:!!value.email_enabled,sms:!!value.sms_enabled,push:!!value.push_enabled},devices:value.devices,history:value.history};};
  async function tick(){
    if(stopped||busy||!database.notificationCandidates)return;busy=true;
    try{await subscriptionReminders();}catch{remindedAt=0;/* retried on the next tick */}
    try{await database.expireNotificationDeliveries();const candidates=await database.notificationCandidates();
      for(const item of candidates){if(stopped)break;if(!provider.available[item.channel]||!(await policy())[item.channel]||!await database.claimNotificationDelivery(item))continue;
        if(!(await policy())[item.channel]){await database.finishNotificationDelivery(item,'paused');continue;}
        try{if(item.channel==='email'){const mail=templates.render(item.kind==='support'?'support-reply':'notification',{title:item.title,url:item.url});await provider.mail(item.email,mail.subject,mail.text,mail.html);}else if(item.channel==='sms')await provider.sms(item.phone,{publication:'انتشار صفحه',payments:'پرداخت و خرید',support:'پاسخ پشتیبانی'}[item.kind]||'اعلان تازه');else await provider.push(typeof item.subscription==='string'?JSON.parse(item.subscription):item.subscription,{title:'رزومیت',body:'اعلان تازه‌ای در صندوق تو ثبت شده است.',url:'/dashboard/notifications/',tag:item.id});await database.finishNotificationDelivery(item,'accepted');}
        catch(error){if(item.channel==='push'&&[404,410].includes(error.statusCode)){await database.removeNotificationPush(item.user_id,item.recipient_key);await database.finishNotificationDelivery(item,'expired');}else await database.finishNotificationDelivery(item,'uncertain');}
      }
    }catch{ /* The persisted inbox remains authoritative when a delivery service fails. */ }
    finally{busy=false;}
    await marketing.tick();
  }
  return {
    provider,
    marketing,
    tick,
    subscriptionReminders,
    async adminSettings(){return {configured:{...provider.available},enabled:await policy()};},
    async saveAdminSettings(actor,input){for(const key of ['email','sms','push'])if(typeof input[key]!=='boolean')fail('انتخاب کانال معتبر نیست');if(Object.keys(input).some(key=>!['email','sms','push'].includes(key)))fail('تنظیم ناشناخته است');if(!database.saveNotificationPolicy)fail('تنظیم کانال‌ها در این محیط آماده نیست',503);await database.saveNotificationPolicy(actor,input);return this.adminSettings();},
    start(){if(database.notificationCandidates&&!timer){timer=setInterval(()=>void tick(),15000);timer.unref();}},
    stop(){stopped=true;clearInterval(timer);provider.close?.();},
    async handle(req,path,origin,user,reply){
      if(!path.startsWith('/api/dashboard/notifications/channels'))return false;
      if(!database.notificationChannels)fail('ارسال بیرون از سایت روی این محیط آماده نیست',503);
      if(req.method==='GET'&&path==='/api/dashboard/notifications/channels'){reply(200,await publicSettings(user.id));return true;}
      if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);const input=await readJson(req,12000);await database.notificationChannels(user.id);
      if(path==='/api/dashboard/notifications/channels'){
        for(const key of ['email','sms','push'])if(typeof input[key]!=='boolean')fail('انتخاب کانال معتبر نیست');
        const current=await publicSettings(user.id);for(const key of ['email','sms','push'])if(input[key]&&!current.available[key]&&!current.enabled[key])fail('این کانال در حال حاضر در دسترس نیست',409);
        if(input.email&&!current.emailVerified)fail('ابتدا ایمیل را تأیید کن',409);if(input.sms&&(!user.phone_verified||!user.phone))fail('ابتدا شمارهٔ موبایل حساب را تأیید کن',409);if(input.push&&!current.devices.length)fail('ابتدا اعلان این مرورگر را متصل کن',409);
        await database.saveNotificationChannels(user.id,input);
      }else if(path.endsWith('/email/start')){
        const address=email(input.email);if(!provider.available.email)fail('ارسال ایمیل در حال حاضر در دسترس نیست',409);if(!address)fail('ایمیل معتبر وارد کن');const code=String(randomInt(100000,1000000));await database.beginNotificationEmail(user.id,address,code);
        try{const mail=templates.render('verify-email',{code});await provider.mail(address,mail.subject,mail.text,mail.html);}catch{fail('ارسال ایمیل تأیید نشد؛ کمی بعد صندوق ایمیل را بررسی کن',502);}
      }else if(path.endsWith('/email/verify')){
        if(typeof input.code!=='string'||!/^\d{6}$/.test(input.code))fail('کد شش‌رقمی معتبر وارد کن');if(!await database.verifyNotificationEmail(user.id,input.code))fail('کد نادرست، منقضی یا بیش از حد امتحان شده است',400);
      }else if(path.endsWith('/push/subscribe')){
        if(!availability(await policy()).push)fail('کانال پوش در حال حاضر در دسترس نیست',409);let value;try{value=subscription(input.subscription);}catch{fail('اتصال پوش معتبر نیست');}await database.addNotificationPush(user.id,endpointId(value.endpoint),value);
      }else if(path.endsWith('/marketing')){
        if(typeof input.optin!=='boolean')fail('انتخاب معتبر نیست');if(input.optin&&!(await publicSettings(user.id)).emailVerified)fail('ابتدا ایمیلت را تأیید کن',409);await database.saveMarketingConsent(user.id,input.optin,String(input.source||'settings').replace(/[^a-z]/g,'').slice(0,16)||'settings');
      }else if(path.endsWith('/push/unsubscribe')){
        if(typeof input.endpoint!=='string'||input.endpoint.length>2048)fail('اتصال معتبر نیست');await database.removeNotificationPush(user.id,endpointId(input.endpoint));
      }else fail('مسیر پیدا نشد',404);
      reply(200,{ok:true,...await publicSettings(user.id)});return true;
    }
  };
};
