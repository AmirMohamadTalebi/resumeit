// Support desk tools beyond the conversation itself: departments, transfer between them, escalation to an admin,
// internal notes, the customer's account at a glance and wallet credit with a reason. Every staff action is audited.
const {randomUUID}=require('node:crypto'),{fail}=require('../dashboard/model.cjs');
const DEPARTMENTS={sales:'فروش',finance:'مالی',technical:'فنی',account:'حساب کاربری',general:'عمومی'};
const CATEGORY_DEPARTMENT={sales:'sales',payment:'finance',account:'account',editor:'technical',publication:'technical',other:'general'};
const IT_RATE=2000;
// A support agent (not an admin) may credit at most this much per action and per day; admins keep the owner limits.
const creditLimits=(env=process.env)=>{const n=(v,d)=>{const x=Number(v);return Number.isSafeInteger(x)&&x>=IT_RATE?x-x%IT_RATE:d;};const each=n(env.SUPPORT_CREDIT_MAX,200000);return {each,daily:Math.max(each,n(env.SUPPORT_CREDIT_DAILY,1000000))};};

async function initialize(execute){
  for(const [table,column,type] of [['support_tickets','department',"VARCHAR(16) NOT NULL DEFAULT 'general'"],['support_tickets','escalated_at','BIGINT NULL'],['support_tickets','escalated_by','CHAR(36) NULL'],['support_tickets','escalation_note','VARCHAR(500) NULL'],['support_messages','internal','BOOLEAN NOT NULL DEFAULT FALSE'],['support_messages','author_id','CHAR(36) NULL']]){
    const rows=await execute('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
    if(rows.length)continue;
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    if(column==='department'){
      await execute("UPDATE support_tickets SET department=CASE category WHEN 'payment' THEN 'finance' WHEN 'account' THEN 'account' WHEN 'editor' THEN 'technical' WHEN 'publication' THEN 'technical' ELSE 'general' END");
      await execute('ALTER TABLE support_tickets ADD INDEX support_department(department,status,updated_at)');
    }
  }
}

async function staff(con,actor){
  const [[row]]=await con.execute('SELECT u.id,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE AND (EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) OR EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id)) FOR UPDATE',[actor]);
  if(!row)fail('دسترسی پشتیبانی فعال نیست',403);
  return {id:row.id,admin:!!Number(row.is_admin)};
}
async function lockTicket(con,id){const [[ticket]]=await con.execute('SELECT * FROM support_tickets WHERE id=? FOR UPDATE',[id]);if(!ticket)fail('تیکت پیدا نشد',404);return ticket;}
// Same request id twice returns the first result instead of acting again (double clicks, retries).
async function repeated(con,requestId,actor,action){
  const [[prior]]=await con.execute('SELECT actor_id,action,details FROM admin_audit WHERE request_id=?',[requestId]);
  if(!prior)return null;
  if(prior.actor_id!==actor||prior.action!==action)fail('شناسهٔ درخواست تکراری است',409);
  return typeof prior.details==='string'?JSON.parse(prior.details):prior.details;
}
async function audit(con,actor,target,action,reason,details,requestId){
  await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),actor,target,action,reason,JSON.stringify(details),requestId,Date.now()]);
}
async function internalNote(con,ticketId,actor,body,now=Date.now()){
  await con.execute('INSERT INTO support_messages(id,ticket_id,staff,body,request_id,created_at,internal,author_id) VALUES(?,?,TRUE,?,?,?,TRUE,?)',[randomUUID(),ticketId,body,randomUUID(),now,actor]);
}
const note=(value,required)=>{
  if(value===undefined&&!required)return '';
  if(typeof value!=='string'||value.length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(value)||(required&&value.trim().length<5))fail(required?'توضیح را دست‌کم در پنج حرف بنویس':'توضیح معتبر نیست');
  return value.trim();
};

module.exports=({execute,transaction})=>({
  supportDepartments:()=>DEPARTMENTS,
  ticketDepartment:category=>CATEGORY_DEPARTMENT[category]||'general',
  supportCreditLimits:()=>creditLimits(),

  async transferTicket(actor,id,department,input){
    if(!Object.hasOwn(DEPARTMENTS,department))fail('بخش معتبر نیست');
    const text=note(input.note,false);
    return transaction(async con=>{
      const who=await staff(con,actor);
      if(await repeated(con,input.requestId,who.id,'support-transfer'))return {ok:true,repeated:true};
      const ticket=await lockTicket(con,id);
      if(ticket.department===department)fail('تیکت همین حالا در این بخش است',409);
      const now=Date.now();
      await con.execute('UPDATE support_tickets SET department=?,updated_at=? WHERE id=?',[department,now,id]);
      await internalNote(con,id,who.id,'انتقال از بخش '+(DEPARTMENTS[ticket.department]||'عمومی')+' به بخش '+DEPARTMENTS[department]+(text?'\n'+text:''),now);
      await audit(con,who.id,ticket.user_id,'support-transfer','انتقال تیکت',{ticketId:id,from:ticket.department,to:department},input.requestId);
      return {ok:true,department};
    });
  },

  // Escalation flags the ticket for admins; any admin can mark it handled. The customer only sees the department.
  async escalateTicket(actor,id,input){
    const resolve=input.resolve===true,text=note(input.note,!resolve);
    return transaction(async con=>{
      const who=await staff(con,actor),action=resolve?'support-escalation-done':'support-escalate';
      if(resolve&&!who.admin)fail('پیگیری ارجاع را فقط مدیر ثبت می‌کند',403);
      if(await repeated(con,input.requestId,who.id,action))return {ok:true,repeated:true};
      const ticket=await lockTicket(con,id),now=Date.now();
      if(resolve){
        if(!ticket.escalated_at)fail('این تیکت به مدیر ارجاع نشده است',409);
        await con.execute('UPDATE support_tickets SET escalated_at=NULL,escalated_by=NULL,escalation_note=NULL,updated_at=? WHERE id=?',[now,id]);
        await internalNote(con,id,who.id,'مدیر پیگیری را انجام داد'+(text?'\n'+text:''),now);
      }else{
        if(ticket.escalated_at)fail('این تیکت قبلاً به مدیر ارجاع شده است',409);
        await con.execute('UPDATE support_tickets SET escalated_at=?,escalated_by=?,escalation_note=?,updated_at=? WHERE id=?',[now,who.id,text,now,id]);
        await internalNote(con,id,who.id,'ارجاع به مدیر برای پیگیری\n'+text,now);
        const [admins]=await con.execute('SELECT a.user_id FROM admin_accounts a LEFT JOIN admin_controls c ON c.user_id=a.user_id WHERE COALESCE(c.suspended,FALSE)=FALSE');
        for(const admin of admins)if(admin.user_id!==who.id)await con.execute('INSERT INTO user_notifications(id,user_id,kind,title,body,url,created_at) VALUES(?,?,\'support\',?,?,?,?)',[randomUUID(),admin.user_id,'ارجاع تیکت به مدیر',ticket.subject+' — '+text.slice(0,120),'/staff/?ticket='+id,now]);
      }
      await audit(con,who.id,ticket.user_id,action,resolve?'پیگیری ارجاع':'ارجاع تیکت به مدیر',{ticketId:id,note:text},input.requestId);
      return {ok:true,escalated:!resolve};
    });
  },

  async ticketNote(actor,id,body,requestId){
    return transaction(async con=>{
      const who=await staff(con,actor);
      const [[prior]]=await con.execute('SELECT id FROM support_messages WHERE ticket_id=? AND request_id=?',[id,requestId]);if(prior)return {id};
      await lockTicket(con,id);
      await con.execute('INSERT INTO support_messages(id,ticket_id,staff,body,request_id,created_at,internal,author_id) VALUES(?,?,TRUE,?,?,?,TRUE,?)',[randomUUID(),id,body,requestId,Date.now(),who.id]);
      return {id};
    });
  },

  // What an agent needs to solve a problem: account, subscription, wallet, payments and invoices, pages, other tickets.
  async supportProfile(actor,userId){
    const [who]=await execute('SELECT u.id FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE AND (EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) OR EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id))',[actor]);
    if(!who)fail('دسترسی پشتیبانی فعال نیست',403);
    const [user]=await execute('SELECT u.id,u.phone,u.phone_verified,u.created_at,p.name,p.first_name,p.last_name,COALESCE(c.suspended,FALSE) suspended,COALESCE(c.publication_blocked,FALSE) publication_blocked FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=?',[userId]);
    if(!user)fail('حساب پیدا نشد',404);
    const [channels,social,sessions,payments,invoices,tickets]=await Promise.all([
      execute('SELECT email,email_verified FROM notification_channels WHERE user_id=?',[userId]).catch(()=>[]),
      execute('SELECT provider FROM social_identities WHERE user_id=?',[userId]).catch(()=>[]),
      execute('SELECT COUNT(*) total FROM sessions WHERE user_id=? AND expires_at>?',[userId,Date.now()]).catch(()=>[{}]),
      execute('SELECT id,provider,amount_toman,status,rrn,trace,created_at,updated_at FROM payment_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20',[userId]),
      execute('SELECT id,amount_toman,created_at,expires_at FROM payment_invoices WHERE user_id=? ORDER BY created_at DESC LIMIT 20',[userId]).catch(()=>[]),
      execute('SELECT id,subject,status,department,created_at,updated_at FROM support_tickets WHERE user_id=? ORDER BY updated_at DESC LIMIT 15',[userId]),
    ]);
    const wallet=this.wallet?await this.wallet(userId):{balance:0,transactions:[]},billing=this.billing?await this.billing(userId,true):{plan:null,purchases:[]};
    let pages=[];
    if(this.adminUser)pages=(await this.adminUser(userId).catch(()=>({documents:[]}))).documents||[];
    const paid=new Set(payments.filter(p=>p.status==='paid').map(p=>p.id));
    return {
      user:{...user,suspended:!!Number(user.suspended),publication_blocked:!!Number(user.publication_blocked),phone_verified:!!Number(user.phone_verified),email:channels[0]?.email||null,email_verified:!!Number(channels[0]?.email_verified||0),social:social.map(s=>s.provider),sessions:Number(sessions[0]?.total||0)},
      plan:billing.plan,purchases:billing.purchases||[],
      wallet:{balance:wallet.balance,transactions:(wallet.transactions||[]).slice(0,20)},
      payments:payments.map(p=>({id:p.id,provider:p.provider,amount:Number(p.amount_toman),status:p.status,rrn:p.rrn||null,trace:p.trace||null,at:Number(p.created_at),updated:Number(p.updated_at)})),
      invoices:invoices.map(i=>({id:i.id,amount:Number(i.amount_toman),at:Number(i.created_at),expires:Number(i.expires_at),paid:paid.has(i.id)})),
      pages:pages.map(d=>{const pub=typeof d.pub==='string'?JSON.parse(d.pub):d.pub||{};return {slot:Number(d.slot),slug:d.slug,template:d.template||null,resume:pub.resume?.status==='published',links:pub.links?.status==='published',revision:Number(d.revision||0)};}),
      tickets:tickets.map(t=>({...t,created_at:Number(t.created_at),updated_at:Number(t.updated_at)})),
      creditLimits:creditLimits(),
    };
  },

  async supportCredit(actor,userId,input){
    const toman=input.toman,reason=note(input.reason,true);
    if(!Number.isSafeInteger(toman)||toman<=0||toman>100000000||toman%IT_RATE)fail('مبلغ باید مضرب ۲٬۰۰۰ تومان باشد');
    return transaction(async con=>{
      const who=await staff(con,actor);
      const prior=await repeated(con,input.requestId,who.id,'support-credit');
      if(prior){if(prior.toman!==toman||prior.userId!==userId)fail('شناسهٔ درخواست تکراری است',409);return {ok:true,repeated:true,balance:prior.balance/IT_RATE};}
      if(who.id===userId)fail('شارژ حساب خودت از این مسیر مجاز نیست',409);
      if(!who.admin){
        // Parallel credits by the same agent queue on the agent's row, so the 24-hour cap cannot be passed together.
        await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[who.id]);
        const limits=creditLimits();
        if(toman>limits.each)fail('سقف هر شارژ پشتیبانی '+(limits.each/IT_RATE).toLocaleString('fa-IR')+' It است؛ برای مبلغ بیشتر تیکت را به مدیر ارجاع بده',403);
        const [today]=await con.execute("SELECT details FROM admin_audit WHERE actor_id=? AND action='support-credit' AND created_at>?",[who.id,Date.now()-86400000]);
        const used=today.reduce((sum,row)=>sum+Number((typeof row.details==='string'?JSON.parse(row.details):row.details).toman||0),0);
        if(used+toman>limits.daily)fail('سقف شارژ ۲۴ ساعت گذشتهٔ تو پر شده؛ تیکت را به مدیر ارجاع بده',403);
      }
      const [[target]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[userId]);if(!target)fail('حساب پیدا نشد',404);
      let ticket=null;
      if(input.ticketId){ticket=await lockTicket(con,input.ticketId);if(ticket.user_id!==userId)fail('این تیکت مال همین کاربر نیست',409);}
      await con.execute('INSERT IGNORE INTO wallets(user_id,balance_units) VALUES(?,0)',[userId]);
      const [[wallet]]=await con.execute('SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE',[userId]);
      const balance=Number(wallet.balance_units)+toman,now=Date.now();
      if(!Number.isSafeInteger(balance))fail('موجودی بیش از حد مجاز است');
      await con.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[balance,userId]);
      await con.execute('INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),userId,toman,balance,'شارژ پشتیبانی: '+reason.slice(0,90),'support:'+input.requestId,now]);
      if(ticket)await internalNote(con,ticket.id,who.id,'شارژ کیف پول: '+(toman/IT_RATE).toLocaleString('fa-IR')+' It ('+toman.toLocaleString('fa-IR')+' تومان)\n'+reason,now);
      await con.execute('INSERT INTO user_notifications(id,user_id,kind,title,body,url,created_at) VALUES(?,?,\'payments\',?,?,?,?)',[randomUUID(),userId,'کیف پولت شارژ شد',(toman/IT_RATE).toLocaleString('fa-IR')+' It از طرف پشتیبانی به کیف پولت اضافه شد.','/dashboard/wallet/',now]);
      await audit(con,who.id,userId,'support-credit',reason,{toman,balance,userId,ticketId:ticket?.id||null},input.requestId);
      return {ok:true,balance:balance/IT_RATE};
    });
  },
});
module.exports.initialize=initialize;
module.exports.DEPARTMENTS=DEPARTMENTS;
module.exports.DEPARTMENT_OF=category=>CATEGORY_DEPARTMENT[category]||'general';
