const {randomUUID}=require('node:crypto');
const {fail}=require('../dashboard/model.cjs');
module.exports=({execute,transaction})=>({
  async supportCustomer(userId){const [row]=await execute('SELECT u.id,p.name,COALESCE(c.suspended,FALSE) suspended FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=?',[userId]);return row||null;},
  async supportRole(userId){return {enabled:!!(await execute('SELECT user_id FROM support_accounts WHERE user_id=?',[userId]))[0]};},
  async saveSupportRole(actorId,targetId,input){
    if(typeof input.enabled!=='boolean'||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>500||/[\x00-\x1f\x7f<>]/.test(input.reason)||!/^[-a-f0-9]{16,64}$/.test(input.requestId||''))fail('اطلاعات تغییر نقش معتبر نیست');
    return transaction(async con=>{
      const [[actor]]=await con.execute('SELECT u.id FROM users u JOIN admin_accounts a ON a.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE FOR UPDATE',[actorId]);
      if(!actor)fail('فقط مدیر می‌تواند نقش ساپورت را تغییر دهد',403);
      const [[prior]]=await con.execute('SELECT actor_id,target_id,action,reason,details FROM admin_audit WHERE request_id=?',[input.requestId]);
      if(prior){const details=typeof prior.details==='string'?JSON.parse(prior.details):prior.details;if(prior.actor_id!==actorId||prior.target_id!==targetId||prior.action!=='support-role'||prior.reason!==input.reason.trim()||details.enabled!==input.enabled)fail('شناسهٔ عملیات قبلاً استفاده شده است',409);return {ok:true,repeated:true};}
      const [[target]]=await con.execute('SELECT u.id,u.phone_verified,COALESCE(c.suspended,FALSE) suspended,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? FOR UPDATE',[targetId]);
      if(!target)fail('حساب پیدا نشد',404);
      if(actorId===targetId||target.is_admin)fail('نقش مدیر از این بخش قابل تغییر نیست',409);
      if(input.enabled&&(!target.phone_verified||target.suspended))fail('برای اعطای نقش، حساب باید فعال و شمارهٔ آن تأیید شده باشد',409);
      if(input.enabled)await con.execute('INSERT IGNORE INTO support_accounts(user_id) VALUES(?)',[targetId]);
      else await con.execute('DELETE FROM support_accounts WHERE user_id=?',[targetId]);
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),actorId,targetId,'support-role',input.reason.trim(),JSON.stringify({enabled:input.enabled}),input.requestId,Date.now()]);
      return {ok:true,enabled:input.enabled};
    });
  },
});
