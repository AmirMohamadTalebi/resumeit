const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{isSupport}=require('../admin/access.cjs');
const uuid=/^[a-f0-9-]{36}$/;
const clean=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail('متن واردشده معتبر نیست');return value.trim();};
module.exports=async(database,req,path,origin,user,reply)=>{
  if(!path.startsWith('/api/dashboard/support')&&!path.startsWith('/api/dashboard/notifications'))return false;
  const url=new URL(req.url,origin),staff=url.searchParams.get('staff')==='1';if(staff&&!isSupport(user))fail('این بخش فقط برای پشتیبانی است',403);
  const owner=staff?null:user.id,id=url.searchParams.get('id');if(id&&!uuid.test(id))fail('شناسه معتبر نیست');
  if(req.method==='GET'){
    if(path==='/api/dashboard/support'){
      const page=Number(url.searchParams.get('page')||1),q=url.searchParams.get('q')||'',status=url.searchParams.get('status')||'';
      if(!Number.isSafeInteger(page)||page<1||page>10000||q.length>100||!['','open','answered','closed'].includes(status))fail('فیلتر معتبر نیست');
      const result=id?await database.ticket(owner,id):await database.tickets(owner,{page,q,status});
      if(id&&staff&&database.supportCustomer)result.customer=await database.supportCustomer(result.user_id);
      reply(200,result);
    }else if(path==='/api/dashboard/notifications'){
      if(url.searchParams.get('updates')==='1'&&database.notify){const release=require('../releases.json')[0];await database.notify(user.id,'product','نسخهٔ '+release.version,release.title,'/changes/','release:'+release.version+':'+user.id).catch(()=>{});}
      const cursor=(url.searchParams.get('before')||String(Date.now()+1)).split(':'),before=Number(cursor[0]),beforeId=cursor[1]||'',kind=url.searchParams.get('kind')||'';
      if(cursor.length>2||!Number.isSafeInteger(before)||before<0||(beforeId&&!uuid.test(beforeId))||!['','publication','payments','support','product'].includes(kind))fail('فیلتر معتبر نیست');
      reply(200,{...await database.notifications(user.id,{before,beforeId,kind,unread:url.searchParams.get('unread')==='1'}),summary:await database.notificationSummary(user.id)});
    }else fail('مسیر پیدا نشد',404);return true;
  }
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const input=await readJson(req,24000);
  if(path==='/api/dashboard/support'){
    if(!['account','payment','editor','publication','other'].includes(input.category)||!['normal','high'].includes(input.priority)||!uuid.test(input.requestId||''))fail('موضوع تیکت معتبر نیست');
    reply(200,await database.createTicket(user.id,{...input,subject:clean(input.subject,3,120),body:clean(input.body,10,6000)}));
  }else if(path==='/api/dashboard/support/reply'){
    if(!uuid.test(input.id||'')||!uuid.test(input.requestId||''))fail('شناسه معتبر نیست');reply(200,await database.replyTicket(user.id,input.id,clean(input.body,1,6000),input.requestId,staff));
  }else if(path==='/api/dashboard/support/status'){
    if(!uuid.test(input.id||'')||!['open','closed'].includes(input.status))fail('وضعیت معتبر نیست');await database.ticketStatus(user.id,input.id,input.status,staff);reply(200,{ok:true});
  }else if(path==='/api/dashboard/notifications/read'){
    if(input.id!==undefined&&(typeof input.id!=='string'||!uuid.test(input.id)))fail('شناسه معتبر نیست');await database.readNotifications(user.id,input.id);reply(200,{ok:true});
  }else if(path==='/api/dashboard/notifications/preferences'){
    const prefs={};for(const key of ['publication','payments','support','product']){if(typeof input[key]!=='boolean')fail('تنظیم اعلان معتبر نیست');prefs[key]=input[key];}await database.notificationPreferences(user.id,prefs);reply(200,{ok:true,preferences:prefs});
  }else fail('مسیر پیدا نشد',404);return true;
};
