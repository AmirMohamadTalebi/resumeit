// Visitor messages from published resumes: validation, the public POST route and the owner's API.
const {createHash}=require('node:crypto'),{readJson}=require('../http/security.cjs'),{fail,webUrl}=require('./model.cjs');
const digits=v=>String(v).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c));
const control=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
function text(value,min,max,label){if(typeof value!=='string'||control.test(value))fail(label+' معتبر نیست');const v=value.trim();if(v.length<min||v.length>max)fail(label+' باید '+min.toLocaleString('fa-IR')+' تا '+max.toLocaleString('fa-IR')+' نویسه باشد');return v;}
function clean(input){
  if(!input||typeof input!=='object')fail('پیام معتبر نیست');
  // Bots fill the hidden field or submit within a moment of loading the page.
  if(input.website)fail('پیام ارسال نشد',400);
  if(!Number.isSafeInteger(input.elapsed)||input.elapsed<2500)fail('کمی صبر کن و دوباره بفرست',400);
  const name=text(input.name,2,80,'نام');
  const raw=digits(text(input.contact,5,120,'راه تماس')).replace(/[\s-]/g,'');
  let contact,contactType;
  if(/^(\+98|0098|0)?9\d{9}$/.test(raw)){contact='0'+raw.slice(-10);contactType='phone';}
  else if(/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(raw)&&raw.length<=120){contact=raw.toLowerCase();contactType='email';}
  else fail('شمارهٔ موبایل (مثل ۰۹۱۲…) یا ایمیل معتبر بنویس تا صاحب رزومه بتواند جوابت را بدهد');
  const body=text(input.message,10,2000,'متن پیام');
  let resumeUrl='';
  if(input.resumeUrl){if(typeof input.resumeUrl!=='string'||input.resumeUrl.length>300)fail('آدرس رزومه معتبر نیست');const url=webUrl(input.resumeUrl.trim());if(!url||!url.startsWith('https://'))fail('آدرس رزومه باید با https شروع شود');resumeUrl=url;}
  return {name,contact,contactType,body,resumeUrl};
}
const ipHash=req=>createHash('sha256').update('inbox:'+require('../http/client-ip.cjs').clientIp(req)).digest('hex');

// POST <page base>/message on the page's own host; the page itself names the owner and slot.
async function publicMessage(database,req,res,page,origin){
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  try{
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
    if(!database.createResumeMessage)fail('ارسال پیام در دسترس نیست',503);
    if(page.content?.inbox?.enabled===false)fail('صاحب این رزومه دریافت پیام را خاموش کرده است',403);
    const input=clean(await readJson(req,12000));
    await database.createResumeMessage(page.id,page.slot||1,input,ipHash(req));
    if(database.notify)await database.notify(page.id,'support','پیام تازه از رزومه',input.name+' از صفحهٔ رزومه برایت پیام فرستاد.','/dashboard/messages/','resume-message:'+page.id+':'+Date.now()).catch(()=>{});
    reply(200,{ok:true});
  }catch(e){if(!e.status)require('../http/log.cjs').logFailure('inbox',req,e);reply(e.status||(e instanceof SyntaxError?400:503),{error:e.status||e instanceof SyntaxError?(e.message||'پیام معتبر نیست'):'پیام ارسال نشد؛ کمی بعد دوباره امتحان کن'});}
}

// Owner side: list, status and delete for the active page slot.
async function ownerRoute(database,req,pathname,origin,user,workspace,reply){
  if(!pathname.startsWith('/api/dashboard/messages'))return false;
  if(!database.resumeMessages)fail('پیام‌ها در دسترس نیست',503);
  const url=new URL(req.url,origin);
  if(req.method==='GET'&&pathname==='/api/dashboard/messages'){reply(200,await database.resumeMessages(user.id,workspace,{status:url.searchParams.get('status')||'',page:Number(url.searchParams.get('page')||1),q:url.searchParams.get('q')||''}));return true;}
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const input=await readJson(req,2000);if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id))fail('شناسهٔ پیام معتبر نیست');
  if(pathname==='/api/dashboard/messages/status'){reply(200,await database.resumeMessageStatus(user.id,input.id,input.status));return true;}
  if(pathname==='/api/dashboard/messages/delete'){reply(200,await database.deleteResumeMessage(user.id,input.id));return true;}
  fail('مسیر پیدا نشد',404);
}
module.exports={clean,publicMessage,ownerRoute};
