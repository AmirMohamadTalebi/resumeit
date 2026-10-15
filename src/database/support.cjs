const {randomUUID}=require('node:crypto');
const {fail}=require('../dashboard/model.cjs');
async function staffAccess(con,owner){
  const [[actor]]=await con.execute('SELECT u.id FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE AND (EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) OR EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id)) FOR UPDATE',[owner]);
  if(!actor)fail('دسترسی پشتیبانی فعال نیست',403);
}
async function staffAudit(con,actor,ticket,action,requestId){
  await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),actor,ticket.user_id,action,'عملیات پنل پشتیبانی',JSON.stringify({ticketId:ticket.id}),requestId,Date.now()]);
}
module.exports=({execute,transaction})=>({
  async tickets(owner,{page=1,q='',status=''}){
    const where=(owner?'t.user_id=? AND ':'')+'(?=\'\' OR t.status=?) AND (?=\'\' OR t.subject LIKE ? OR t.id=?)';
    const args=[...(owner?[owner]:[]),status,status,q,'%'+q+'%',q];
    const [total]=await execute('SELECT COUNT(*) total FROM support_tickets t WHERE '+where,args);
    const rows=await execute('SELECT t.id,t.subject,t.category,t.priority,t.status,t.created_at,t.updated_at FROM support_tickets t WHERE '+where+' ORDER BY t.updated_at DESC,t.id DESC LIMIT 25 OFFSET '+((page-1)*25),args);
    const [summary]=await execute("SELECT COUNT(*) total,SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open_count,SUM(CASE WHEN status='answered' THEN 1 ELSE 0 END) answered_count,SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) closed_count FROM support_tickets"+(owner?' WHERE user_id=?':''),owner?[owner]:[]);
    return {rows,total:Number(total.total),page,summary:{total:Number(summary.total),open:Number(summary.open_count||0),answered:Number(summary.answered_count||0),closed:Number(summary.closed_count||0)}};
  },
  async ticket(owner,id){const [ticket]=await execute('SELECT * FROM support_tickets WHERE id=?'+(owner?' AND user_id=?':''),[id,...(owner?[owner]:[])]);if(!ticket)fail('تیکت پیدا نشد',404);return {...ticket,messages:await execute('SELECT id,staff,body,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at,id',[id])};},
  async createTicket(owner,input){return transaction(async con=>{
    await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[owner]);
    const [[count]]=await con.execute('SELECT COUNT(*) total FROM support_tickets WHERE user_id=? AND created_at>?',[owner,Date.now()-3600000]);if(Number(count.total)>=5)fail('تا یک ساعت می‌توانی پنج تیکت بسازی؛ گفت‌وگوی موجود را ادامه بده',429);
    const [[prior]]=await con.execute('SELECT id FROM support_tickets WHERE user_id=? AND request_id=?',[owner,input.requestId]);if(prior)return {id:prior.id};
    const id=randomUUID(),now=Date.now();await con.execute('INSERT INTO support_tickets(id,user_id,subject,category,priority,status,request_id,created_at,updated_at) VALUES(?,?,?,?,?,\'open\',?,?,?)',[id,owner,input.subject,input.category,input.priority,input.requestId,now,now]);
    await con.execute('INSERT INTO support_messages(id,ticket_id,staff,body,request_id,created_at) VALUES(?,?,FALSE,?,?,?)',[randomUUID(),id,input.body,input.requestId,now]);return {id};
  });},
  async replyTicket(owner,id,body,requestId,staff){return transaction(async con=>{
    if(staff)await staffAccess(con,owner);
    const [[ticket]]=await con.execute('SELECT * FROM support_tickets WHERE id=?'+(staff?'':' AND user_id=?')+' FOR UPDATE',[id,...(staff?[]:[owner])]);if(!ticket)fail('تیکت پیدا نشد',404);if(ticket.status==='closed')fail('ابتدا تیکت را دوباره باز کن',409);
    const [[count]]=await con.execute('SELECT COUNT(*) total FROM support_messages WHERE ticket_id=? AND created_at>?',[id,Date.now()-60000]);if(Number(count.total)>=10)fail('پیام‌ها را در یک پاسخ جمع کن و کمی بعد دوباره بفرست',429);
    const [[prior]]=await con.execute('SELECT id FROM support_messages WHERE ticket_id=? AND request_id=?',[id,requestId]);if(prior)return {id};
    const now=Date.now();await con.execute('INSERT INTO support_messages(id,ticket_id,staff,body,request_id,created_at) VALUES(?,?,?,?,?,?)',[randomUUID(),id,staff,body,requestId,now]);await con.execute('UPDATE support_tickets SET status=?,updated_at=? WHERE id=?',[staff?'answered':'open',now,id]);
    if(staff){await staffAudit(con,owner,ticket,'support-reply','support:'+requestId);await con.execute('INSERT INTO user_notifications(id,user_id,kind,title,body,url,created_at) VALUES(?,?,\'support\',?,?,?,?)',[randomUUID(),ticket.user_id,'پاسخ پشتیبانی',ticket.subject,'/dashboard/support/?ticket='+id,now]);}return {id};
  });},
  async ticketStatus(owner,id,status,staff){return transaction(async con=>{if(staff)await staffAccess(con,owner);const [[ticket]]=await con.execute('SELECT id,user_id,status FROM support_tickets WHERE id=?'+(staff?'':' AND user_id=?')+' FOR UPDATE',[id,...(staff?[]:[owner])]);if(!ticket)fail('تیکت پیدا نشد',404);if(ticket.status===status)return;await con.execute('UPDATE support_tickets SET status=?,updated_at=? WHERE id=?',[status,Date.now(),id]);if(staff)await staffAudit(con,owner,ticket,'support-'+status,randomUUID());});},
  async notify(owner,kind,title,body,url,reference){await execute('INSERT IGNORE INTO user_notifications(id,user_id,kind,title,body,url,reference,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),owner,kind,title,body,url,reference||null,Date.now()]);},
  async notifications(owner,{before=Date.now()+1,beforeId='',kind='',unread=false}){const rows=await execute('SELECT id,kind,title,body,url,created_at,read_at FROM user_notifications WHERE user_id=? AND (created_at<? OR (created_at=? AND id<?)) AND (?=\'\' OR kind=?)'+(unread?' AND read_at IS NULL':'')+' ORDER BY created_at DESC,id DESC LIMIT 30',[owner,before,before,beforeId,kind,kind]);const [count]=await execute('SELECT COUNT(*) total FROM user_notifications WHERE user_id=? AND read_at IS NULL',[owner]);const [settings]=await execute('SELECT preferences FROM notification_preferences WHERE user_id=?',[owner]);return {rows,unread:Number(count.total),preferences:settings?(typeof settings.preferences==='string'?JSON.parse(settings.preferences):settings.preferences):{publication:true,payments:true,support:true,product:true},next:rows.length===30?String(rows.at(-1).created_at)+':'+rows.at(-1).id:null};},
  async notificationSummary(owner){const [row]=await execute('SELECT COUNT(*) total,SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) unread,SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) seen,SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) recent FROM user_notifications WHERE user_id=?',[Date.now()-7*86400000,owner]);return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value||0)]));},
  async readNotifications(owner,id){await execute('UPDATE user_notifications SET read_at=COALESCE(read_at,?) WHERE user_id=?'+(id?' AND id=?':''),[Date.now(),owner,...(id?[id]:[])]);},
  async notificationPreferences(owner,preferences){await execute('INSERT INTO notification_preferences(user_id,preferences) VALUES(?,?) ON DUPLICATE KEY UPDATE preferences=VALUES(preferences)',[owner,JSON.stringify(preferences)]);},
});
