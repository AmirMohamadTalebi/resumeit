const {readJson}=require('../http/security.cjs'),{createHash}=require('node:crypto'),{fail,initial}=require('./model.cjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
module.exports=(database,options)=>{
  const otp=require('../auth/otp.cjs').createOtpService({database,...options});
  return async(req,path,origin,user,slot,reply)=>{
    if(!['/api/dashboard/reset','/api/dashboard/reset/request'].includes(path))return false;
    if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
    if(!user.phone_verified||!user.phone)fail('برای پاک‌سازی ابتدا شمارهٔ حساب را تأیید کن',403);
    const input=await readJson(req,2000);if(!['resume','links'].includes(input.kind)||slot===3&&input.kind==='resume')fail('صفحه معتبر نیست');
    if(path.endsWith('/request')){
      const result=await otp.request(user.phone,'wipe',hash(req.socket.remoteAddress||'unknown'),user.id);if(!result)fail('یک دقیقه صبر کن و دوباره کد بگیر',429);
      await database.bindReset(user.id,slot,input.kind,result.challengeId);reply(200,result);return true;
    }
    if(!Number.isSafeInteger(input.revision)||input.revision<0||!/^[a-f0-9-]{36}$/.test(input.challengeId||'')||!/^\d{6}$/.test(input.code||''))fail('کد تأیید و نسخهٔ صفحه معتبر نیست');
    if((await database.loadDashboard(user.id,slot)).revision!==input.revision)fail('این صفحه در تب دیگری تغییر کرده؛ پیش از پاک‌سازی صفحه را تازه کن',409,'REVISION_CONFLICT');
    if(!await database.consumeReset(user.id,slot,input.kind,input.challengeId,hash(input.challengeId+input.code),user.phone))fail('کد درست نیست، مصرف شده یا اعتبارش تمام شده',401);
    const result=await database.mutateDashboard(user.id,input.revision,doc=>{
      const blank=initial().content;
      if(input.kind==='resume'){
        for(const key of ['profile','contacts','skills','experience','education','projects','certs','languages','socials','sections','resumeTemplates'])doc.content[key]=structuredClone(blank[key]);
        doc.content.branding.resume=blank.branding.resume;
      }else{doc.content.links=blank.links;doc.content.branding.links=blank.branding.links;doc.content.theme.links=blank.theme.links;doc.content.theme.linksPalette=blank.theme.linksPalette;}
      doc.pub[input.kind]={status:'draft',version:doc.pub[input.kind].version,at:null,snap:null};delete doc.published[input.kind];
    },{workspace:slot,resetAdvisor:input.kind==='resume'});
    reply(200,result);return true;
  };
};
