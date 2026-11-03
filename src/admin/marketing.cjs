const templates=require('../notifications/email-templates.cjs'),{fail}=require('../dashboard/model.cjs');
// Owner panel for email: what is configured, every template with its preview, and promotional campaigns.
const list=()=>Object.entries(templates.templates).map(([key,t])=>({key,label:t.label,sample:t.sample}));
module.exports={
  async view(database,notifications){
    return {configured:!!notifications?.provider.available.email,unsubscribe:!!(process.env.UNSUBSCRIBE_SECRET||process.env.SMTP_PASSWORD||process.env.WEB_PUSH_PRIVATE_KEY),templates:list(),stats:await database.marketingStats(),campaigns:await database.marketingCampaigns(),
      rules:{important:['کد ورود و بازیابی رمز','تأیید ایمیل','کیف پول و پرداخت','پاسخ پشتیبانی'],never:['نسخهٔ تازه و تغییرات کوچک','انتشار صفحه توسط خود کاربر']}};
  },
  preview(kind,data){
    const t=templates.templates[kind];if(!t)fail('قالب پیدا نشد',404);
    return templates.render(kind,{...t.sample,...(data||{})});
  },
  // POST routes. A test goes to the owner's own verified address only, never to a typed-in one.
  async post(database,notifications,user,path,input){
    const sub=path.replace('/api/admin/mail','');
    if(sub==='/test'){
      if(!notifications?.provider.available.email)fail('ارسال ایمیل روی سرور تنظیم نشده است',409);
      const address=(await database.notificationChannels(user.id)).email_verified?(await database.notificationChannels(user.id)).email:null;
      if(!address)fail('برای ارسال آزمایشی، اول ایمیل خودت را در اعلان‌های حساب تأیید کن',409);
      if(input.kind==='promo'||!input.kind){await notifications.marketing.sendTest(address,input);}
      else{const mail=this.preview(input.kind);await notifications.provider.mail(address,'[آزمایشی] '+mail.subject,mail.text,mail.html);}
      return {ok:true,to:address.replace(/^(.).*?@/,'$1***@')};
    }
    if(sub==='/preview'){const mail=this.preview(String(input.kind||'promo'),input.data);return {subject:mail.subject,html:mail.html};}
    if(sub==='/campaign')return {ok:true,id:await database.createMarketingCampaign(user.id,input)};
    if(sub==='/campaign/send'){
      if(!notifications?.provider.available.email)fail('ارسال ایمیل روی سرور تنظیم نشده است',409);
      if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id))fail('کمپین معتبر نیست');
      return {ok:true,total:await database.startMarketingCampaign(input.id)};
    }
    if(sub==='/campaign/cancel'){if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id))fail('کمپین معتبر نیست');await database.cancelMarketingCampaign(input.id);return {ok:true};}
    fail('مسیر پیدا نشد',404);
  }
};
