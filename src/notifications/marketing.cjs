const {createHmac,timingSafeEqual}=require('node:crypto'),templates=require('./email-templates.cjs'),{esc}=templates;
// Promotional sending: a slow worker (a few people every 15 seconds) and the one-click unsubscribe link.
// The link carries an HMAC of the account id, so it cannot be guessed for someone else.
module.exports=(database,provider,env=process.env)=>{
  const secret=env.UNSUBSCRIBE_SECRET||env.SMTP_PASSWORD||env.WEB_PUSH_PRIVATE_KEY||'',origin=()=>(env.PUBLIC_ORIGIN||'https://resumeit.ir').replace(/\/$/,'');
  const token=user=>createHmac('sha256',secret).update('unsubscribe:'+user).digest('hex').slice(0,32);
  const link=user=>origin()+'/mail/unsubscribe?u='+encodeURIComponent(user)+'&t='+token(user);
  const valid=(user,given)=>{const a=Buffer.from(token(user)),b=Buffer.from(String(given||''));return !!secret&&a.length===b.length&&timingSafeEqual(a,b);};
  const page=(title,text)=>'<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+esc(title)+'</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b141b;font-family:Tahoma,Arial,sans-serif;color:#1d2c36"><main style="max-width:420px;margin:20px;padding:32px;border-radius:22px;background:#fffdf9;text-align:center;line-height:2"><h1 style="margin:0 0 8px;font-size:22px">'+esc(title)+'</h1><p style="margin:0 0 18px">'+esc(text)+'</p><a href="/" style="display:inline-block;padding:11px 26px;border-radius:999px;background:#f0bd52;color:#2b1a05;font-weight:700;text-decoration:none">رفتن به رزومیت</a></main></body></html>';
  const headersFor=user=>({'List-Unsubscribe':'<'+link(user)+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'});
  let busy=false;
  return {
    link,valid,
    async handlePublic(req,res,pathname){
      if(pathname!=='/mail/unsubscribe')return false;
      const url=new URL(req.url,origin()),user=url.searchParams.get('u')||'',given=url.searchParams.get('t');
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
      if(!['GET','POST'].includes(req.method)){res.writeHead(405);res.end();return true;}
      let ok=false;
      if(/^[a-f0-9-]{36}$/.test(user)&&valid(user,given)){try{await database.saveMarketingConsent(user,false,'link');ok=true;}catch{}}
      res.writeHead(ok?200:400,{'Content-Type':'text/html; charset=utf-8'});
      res.end(page(ok?'ایمیل‌های تبلیغاتی متوقف شد':'این پیوند معتبر نیست',ok?'دیگر ایمیل تبلیغاتی برایت نمی‌فرستیم. ایمیل‌های مهم حساب، مثل کد ورود، همچنان می‌رسند و هر وقت خواستی می‌توانی از تنظیمات اعلان‌ها دوباره فعالش کنی.':'پیوند لغو ناقص یا قدیمی است؛ از بخش تنظیمات اعلان‌های حسابت هم می‌توانی دریافت ایمیل تبلیغاتی را خاموش کنی.'));
      return true;
    },
    mailFor(campaign,user){
      return templates.render('promo',{title:campaign.title,body:campaign.body,cta:campaign.cta||'دیدن در رزومیت',url:campaign.url||'/',unsubscribe:link(user)});
    },
    // One slice of the running campaigns; a failure to send marks that person failed and moves on.
    async tick(){
      if(busy||!database.marketingBatch||!provider.available.email||!secret)return;busy=true;
      try{
        await database.skipUnsubscribedMarketing();
        for(const item of await database.marketingBatch(10)){
          let ok=true;try{const mail=this.mailFor(item,item.user_id);await provider.mail(item.email,mail.subject,mail.text,mail.html,headersFor(item.user_id));}catch{ok=false;}
          await database.finishMarketingSend(item.campaign_id,item.user_id,ok);
        }
      }catch{ /* the next tick continues from the stored state */ }
      finally{busy=false;}
    },
    async sendTest(to,input){const mail=templates.render('promo',{title:input.title,body:input.body,cta:input.cta,url:input.url,unsubscribe:origin()+'/mail/unsubscribe'});return provider.mail(to,'[آزمایشی] '+mail.subject,mail.text,mail.html);}
  };
};
