const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{isSupport}=require('../admin/access.cjs');
const uuid=/^[a-f0-9-]{36}$/;
const clean=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail('متن واردشده معتبر نیست');return value.trim();};
module.exports=async(database,req,path,origin,user,reply,res)=>{
  if(!path.startsWith('/api/dashboard/support')&&!path.startsWith('/api/dashboard/notifications'))return false;
  const url=new URL(req.url,origin),staff=url.searchParams.get('staff')==='1';if(staff&&!isSupport(user))fail('این بخش فقط برای پشتیبانی است',403);
  const owner=staff?null:user.id,id=url.searchParams.get('id');if(id&&!uuid.test(id))fail('شناسه معتبر نیست');
  if(req.method==='GET'){
    if(path==='/api/dashboard/support/attachment'){
      if(!id)fail('شناسهٔ پیوست لازم است');
      const file=await database.ticketAttachment(owner,id);if(!file)fail('پیوست پیدا نشد',404);
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':file.size,'Content-Disposition':"attachment; filename=\"attachment\"; filename*=UTF-8''"+encodeURIComponent(file.name),'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});res.end(Buffer.from(file.data));return true;
    }
    // The customer's account at a glance for the agent handling a ticket (read-only; credit is a separate action).
    if(path==='/api/dashboard/support/customer'){
      if(!staff||!id)fail('شناسهٔ کاربر لازم است');
      reply(200,await database.supportProfile(user.id,id));return true;
    }
    if(path==='/api/dashboard/support'){
      const page=Number(url.searchParams.get('page')||1),q=url.searchParams.get('q')||'',status=url.searchParams.get('status')||'',department=staff?url.searchParams.get('department')||'':'',escalated=staff&&url.searchParams.get('escalated')==='1';
      if(!Number.isSafeInteger(page)||page<1||page>10000||q.length>100||!['','open','answered','closed'].includes(status)||(department&&!Object.hasOwn(database.supportDepartments(),department)))fail('فیلتر معتبر نیست');
      const result=id?await database.ticket(owner,id):await database.tickets(owner,{page,q,status,department,escalated});
      if(id&&staff&&database.supportCustomer)result.customer=await database.supportCustomer(result.user_id);
      if(staff&&database.adminCodes){if(id){const [coded]=await database.adminCodes('tickets',[result]);result.admin_code=coded.admin_code;if(result.customer)[result.customer]=await database.adminCodes('users',[result.customer]);}else result.rows=await database.adminCodes('tickets',result.rows);}
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
  const input=await readJson(req,['/api/dashboard/support','/api/dashboard/support/reply'].includes(path)?12*1024*1024:24000);
  let attachments;
  if(['/api/dashboard/support','/api/dashboard/support/reply'].includes(path)){
    const billing=database.billing?await database.billing(user.id):{};
    attachments=require('./attachments.cjs').validate(input.attachments,staff||billing.plan?.end>Date.now());
  }
  if(path==='/api/dashboard/support'){
    if(!['sales','account','payment','editor','publication','other'].includes(input.category)||!['normal','high'].includes(input.priority)||!uuid.test(input.requestId||''))fail('موضوع تیکت معتبر نیست');
    reply(200,await database.createTicket(user.id,{...input,attachments,subject:clean(input.subject,3,120),body:clean(input.body,10,6000)}));
  }else if(path==='/api/dashboard/support/reply'){
    if(!uuid.test(input.id||'')||!uuid.test(input.requestId||''))fail('شناسه معتبر نیست');reply(200,await database.replyTicket(user.id,input.id,clean(input.body,1,6000),input.requestId,staff,attachments));
  }else if(staff&&path==='/api/dashboard/support/transfer'){
    if(!uuid.test(input.id||'')||!uuid.test(input.requestId||'')||typeof input.department!=='string')fail('اطلاعات انتقال معتبر نیست');
    reply(200,await database.transferTicket(user.id,input.id,input.department,input));
  }else if(staff&&path==='/api/dashboard/support/escalate'){
    if(!uuid.test(input.id||'')||!uuid.test(input.requestId||''))fail('اطلاعات ارجاع معتبر نیست');
    reply(200,await database.escalateTicket(user.id,input.id,input));
  }else if(staff&&path==='/api/dashboard/support/note'){
    if(!uuid.test(input.id||'')||!uuid.test(input.requestId||''))fail('شناسه معتبر نیست');
    reply(200,await database.ticketNote(user.id,input.id,clean(input.body,1,6000),input.requestId));
  }else if(staff&&path==='/api/dashboard/support/credit'){
    if(!uuid.test(input.userId||'')||!uuid.test(input.requestId||'')||(input.ticketId!==undefined&&!uuid.test(input.ticketId||'')))fail('اطلاعات شارژ معتبر نیست');
    await require('../auth/confirm.cjs').confirmPassword(database,user,input.password);
    reply(200,await database.supportCredit(user.id,input.userId,input));
  }else if(staff&&path==='/api/dashboard/support/refund'){
    if(!uuid.test(input.userId||'')||!uuid.test(input.requestId||'')||!uuid.test(input.ticketId||'')||typeof input.ref!=='string'||(input.override!==undefined&&typeof input.override!=='boolean'))fail('اطلاعات بازگشت وجه معتبر نیست');
    if(!database.supportRefund)fail('بازگشت وجه در این محیط آماده نیست',503);
    await require('../auth/confirm.cjs').confirmPassword(database,user,input.password);
    reply(200,await database.supportRefund(user.id,input.userId,input));
  }else if(path==='/api/dashboard/support/status'){
    if(!uuid.test(input.id||'')||!['open','closed'].includes(input.status))fail('وضعیت معتبر نیست');await database.ticketStatus(user.id,input.id,input.status,staff);reply(200,{ok:true});
  }else if(path==='/api/dashboard/notifications/read'){
    if(input.id!==undefined&&(typeof input.id!=='string'||!uuid.test(input.id)))fail('شناسه معتبر نیست');await database.readNotifications(user.id,input.id);reply(200,{ok:true});
  }else if(path==='/api/dashboard/notifications/preferences'){
    const prefs={};for(const key of ['publication','payments','support','product']){if(typeof input[key]!=='boolean')fail('تنظیم اعلان معتبر نیست');prefs[key]=input[key];}await database.notificationPreferences(user.id,prefs);reply(200,{ok:true,preferences:prefs});
  }else fail('مسیر پیدا نشد',404);return true;
};
