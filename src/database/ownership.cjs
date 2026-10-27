const {randomUUID}=require('node:crypto');
const {fail}=require('../dashboard/model.cjs');
const {requireOwner}=require('../admin/access.cjs');
const requestInput=input=>{
  if(!input||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>500||/[\x00-\x1f\x7f<>]/.test(input.reason)||!/^[-a-f0-9]{16,64}$/.test(input.requestId||''))fail('دلیل و شناسهٔ عملیات معتبر نیست');
};
module.exports=({execute,transaction})=>({
  async accountRole(id){
    const [row]=await execute('SELECT u.id,EXISTS(SELECT 1 FROM owner_accounts WHERE user_id=u.id) is_owner,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin,EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id) is_support FROM users u WHERE u.id=?',[id]);
    if(!row)fail('حساب پیدا نشد',404);
    return {role:row.is_owner?'owner':row.is_admin?'admin':row.is_support?'support':'user'};
  },
  async saveAccountRole(actor,target,input){
    requestInput(input);if(!['owner','admin','support','user'].includes(input.role))fail('نقش معتبر نیست');
    return transaction(async con=>{
      await requireOwner(con,actor);
      if(actor===target)fail('برای جلوگیری از ازدست‌رفتن دسترسی، نقش خودت را نمی‌توانی تغییر بدهی',409);
      const [[prior]]=await con.execute('SELECT actor_id,target_id,action,reason,details FROM admin_audit WHERE request_id=?',[input.requestId]);
      if(prior){const details=typeof prior.details==='string'?JSON.parse(prior.details):prior.details;if(prior.actor_id!==actor||prior.target_id!==target||prior.action!=='account-role'||prior.reason!==input.reason.trim()||details.role!==input.role)fail('شناسهٔ عملیات قبلاً استفاده شده است',409);return {ok:true,role:input.role,repeated:true};}
      const [[user]]=await con.execute('SELECT u.id,u.phone_verified,COALESCE(c.suspended,FALSE) suspended,EXISTS(SELECT 1 FROM owner_accounts WHERE user_id=u.id) is_owner,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin,EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id) is_support FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? FOR UPDATE',[target]);
      if(!user)fail('حساب پیدا نشد',404);
      if(input.role!=='user'&&(!user.phone_verified||user.suspended))fail('نقش سازمانی فقط به حساب فعال با شمارهٔ تأییدشده داده می‌شود',409);
      const previous=user.is_owner?'owner':user.is_admin?'admin':user.is_support?'support':'user';
      for(const table of ['owner_accounts','admin_accounts','support_accounts'])await con.execute('DELETE FROM '+table+' WHERE user_id=?',[target]);
      if(['admin','owner'].includes(input.role))await con.execute('INSERT INTO admin_accounts(user_id) VALUES(?)',[target]);
      if(input.role==='owner')await con.execute('INSERT INTO owner_accounts(user_id) VALUES(?)',[target]);
      if(input.role==='support')await con.execute('INSERT INTO support_accounts(user_id) VALUES(?)',[target]);
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),actor,target,'account-role',input.reason.trim(),JSON.stringify({previous,role:input.role}),input.requestId,Date.now()]);
      return {ok:true,role:input.role};
    });
  },
  async purgeAdminAudit(actor,input){
    requestInput(input);
    if(!['حذف لاگ‌ها','بایگانی لاگ‌ها'].includes(input.confirmation)||!Number.isSafeInteger(input.before)||input.before<0||input.before>Date.now())fail('بازه و عبارت تأیید لاگ‌ها معتبر نیست');
    return transaction(async con=>{
      await requireOwner(con,actor);
      const [[prior]]=await con.execute('SELECT actor_id,action,reason,details FROM admin_audit WHERE request_id=?',[input.requestId]);
      if(prior){const details=typeof prior.details==='string'?JSON.parse(prior.details):prior.details;if(prior.actor_id!==actor||prior.action!=='audit-purge'||prior.reason!==input.reason.trim()||details.before!==input.before)fail('شناسهٔ عملیات قبلاً استفاده شده است',409);return {ok:true,deleted:details.deleted,repeated:true};}
      // Audit rows also guard replay of sensitive commands; hide them without destroying receipts.
      const [rows]=await con.execute("SELECT id,created_at FROM admin_audit WHERE created_at<? AND action NOT IN ('audit-purge','retention-run') AND NOT EXISTS(SELECT 1 FROM admin_archives z WHERE z.kind='audit' AND z.record_id=admin_audit.id) ORDER BY created_at,id LIMIT 200 FOR UPDATE",[input.before]);
      for(const row of rows)await con.execute('INSERT IGNORE INTO admin_archives(kind,record_id,actor_id,record_at,created_at,batch_id) VALUES(?,?,?,?,?,?)',['audit',row.id,actor,Number(row.created_at),Date.now(),input.requestId]);
      const deleted=rows.length;
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,NULL,?,?,?,?,?)',[randomUUID(),actor,'audit-purge',input.reason.trim(),JSON.stringify({before:input.before,deleted}),input.requestId,Date.now()]);
      return {ok:true,deleted};
    });
  },
});
module.exports.bootstrapOwner=async(execute,phone=require('../admin/access.cjs').ownerPhone())=>{
  // Bootstrap only an unowned installation; restarting must not restore a revoked role.
  const [existing]=await execute('SELECT user_id FROM owner_accounts LIMIT 1');
  if(!existing&&phone)await execute('INSERT IGNORE INTO owner_accounts(user_id) SELECT id FROM users WHERE phone=? AND phone_verified=TRUE',[phone]);
  await execute('INSERT IGNORE INTO admin_accounts(user_id) SELECT user_id FROM owner_accounts');
};
