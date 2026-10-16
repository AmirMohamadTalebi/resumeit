const {randomBytes,createHash}=require('node:crypto'),{readJson}=require('../http/security.cjs');
const digest=v=>createHash('sha256').update(v).digest('hex');
const proofHash=req=>{const value=/(?:^|;\s*)ri_restriction=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1]||/(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];return value?digest(value):'';};
async function issue(database,req,res,notice,context,origin){const value=randomBytes(32).toString('hex');await database.createNoticeProof(digest(value),notice,context);const previous=/(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(previous)await database.deleteSession(digest(previous));const secure=origin.startsWith('https:')?'; Secure':'',cookies=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(cookies)?cookies:[cookies]),'ri_restriction='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=900'+secure,'ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+secure]);return {restricted:true,redirect:'/account-status/'};}
function handler(database){return async(req,res,path,origin,reply)=>{
 if(!path.startsWith('/api/auth/account-status'))return false;
 const hash=proofHash(req),proof=database.noticeProof?await database.noticeProof(hash):null;if(!proof){reply(401,{error:'برای دیدن وضعیت حساب، دوباره هویتت را تأیید کن'});return true;}
 const n=proof.notice;
 if(req.method==='GET'&&path==='/api/auth/account-status'){const thread=n.review_ticket?await database.ticket(n.user_id,n.review_ticket).catch(()=>null):null;reply(200,{state:n.active?n.kind:'restored',reason:n.reason,until:n.until_at,at:n.created_at,actorCode:n.actor_code,accountCode:n.user_code,review:thread?{status:thread.status,messages:thread.messages}:null});return true;}
 if(req.method!=='POST'){reply(405,{error:'روش درخواست معتبر نیست'});return true;}
 if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
 const input=await readJson(req,12000);
 if(path==='/api/auth/account-status/review')reply(200,await database.requestAccountReview(hash,input.body));
 else if(path==='/api/auth/account-status/recreate'){if(input.confirm!==true){reply(400,{error:'شروع یک حساب خالی و برنگشتن اطلاعات قبلی را تأیید کن'});return true;}const result=await database.allowNoticeRecreation(hash);await database.deleteNoticeProof(hash);const secure=origin.startsWith('https:')?'; Secure':'';res.setHeader('Set-Cookie',['ri_restriction=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+secure,'ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+secure]);reply(200,result);}
 else if(path==='/api/auth/account-status/leave'){await database.deleteNoticeProof(hash);const secure=origin.startsWith('https:')?'; Secure':'';res.setHeader('Set-Cookie',['ri_restriction=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+secure,'ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+secure]);reply(200,{ok:true});}
 else reply(404,{error:'بخش پیدا نشد'});return true;
};}
module.exports={handler,issue,proofHash};
