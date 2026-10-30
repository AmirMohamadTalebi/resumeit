// Messages visitors send from a published resume. There is no reply channel: the owner answers by the phone
// number or email the visitor left, so only what is needed for that answer is stored.
const {randomUUID}=require('node:crypto'),{fail}=require('../dashboard/model.cjs');
const STATUSES=['new','read','done'],PAGE=20;

async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS resume_messages(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,slot INT NOT NULL DEFAULT 1,name VARCHAR(80) NOT NULL,contact VARCHAR(120) NOT NULL,contact_type VARCHAR(8) NOT NULL,resume_url VARCHAR(300) NULL,body TEXT NOT NULL,status VARCHAR(8) NOT NULL DEFAULT \'new\',ip_hash CHAR(64) NOT NULL,created_at BIGINT NOT NULL,INDEX(user_id,slot,created_at),INDEX(ip_hash,created_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
}

module.exports=({execute})=>({
  // Accepts a message unless the sender or the page has sent too many recently.
  async createResumeMessage(owner,slot,input,ipHash,now=Date.now()){
    const [sender]=await execute('SELECT COUNT(*) total FROM resume_messages WHERE ip_hash=? AND created_at>?',[ipHash,now-3600000]);
    if(Number(sender.total)>=5)fail('پیام‌های زیادی از این اینترنت فرستاده شده؛ یک ساعت دیگر دوباره امتحان کن',429);
    const [page]=await execute('SELECT COUNT(*) total FROM resume_messages WHERE user_id=? AND created_at>?',[owner,now-86400000]);
    if(Number(page.total)>=100)fail('این صفحه امروز پیام زیادی گرفته؛ فردا دوباره امتحان کن',429);
    const id=randomUUID();
    await execute('INSERT INTO resume_messages(id,user_id,slot,name,contact,contact_type,resume_url,body,status,ip_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,owner,slot,input.name,input.contact,input.contactType,input.resumeUrl||null,input.body,'new',ipHash,now]);
    return {id};
  },
  async resumeMessages(owner,slot,{status='',page=1,q=''}={}){
    if(status&&!STATUSES.includes(status))fail('وضعیت پیام معتبر نیست');
    if(!Number.isSafeInteger(page)||page<1||page>10000||typeof q!=='string'||q.length>100)fail('فیلتر معتبر نیست');
    const parts=['user_id=?','slot=?'],args=[owner,slot];if(status){parts.push('status=?');args.push(status);}
    for(const word of q.trim().split(/\s+/).filter(Boolean)){parts.push("CONCAT_WS(' ',name,contact,body,COALESCE(resume_url,'')) LIKE ? ESCAPE '='");args.push('%'+word.replace(/[=%_]/g,v=>'='+v)+'%');}
    const where=parts.join(' AND ');
    const [total]=await execute('SELECT COUNT(*) total FROM resume_messages WHERE '+where,args);
    const rows=await execute('SELECT id,name,contact,contact_type,resume_url,body,status,created_at FROM resume_messages WHERE '+where+' ORDER BY created_at DESC,id DESC LIMIT '+PAGE+' OFFSET '+((page-1)*PAGE),args);
    const counts=await execute('SELECT status,COUNT(*) total FROM resume_messages WHERE user_id=? AND slot=? GROUP BY status',[owner,slot]);
    const summary={new:0,read:0,done:0};for(const r of counts)summary[r.status]=Number(r.total);summary.total=summary.new+summary.read+summary.done;
    return {rows:rows.map(r=>({id:r.id,name:r.name,contact:r.contact,contactType:r.contact_type,resumeUrl:r.resume_url||'',body:r.body,status:r.status,at:Number(r.created_at)})),total:Number(total.total),page,size:PAGE,summary};
  },
  async resumeMessageStatus(owner,id,status){
    if(!STATUSES.includes(status))fail('وضعیت پیام معتبر نیست');
    const result=await execute('UPDATE resume_messages SET status=? WHERE id=? AND user_id=?',[status,id,owner]);
    if(!result.affectedRows)fail('پیام پیدا نشد',404);return {ok:true};
  },
  async deleteResumeMessage(owner,id){
    const result=await execute('DELETE FROM resume_messages WHERE id=? AND user_id=?',[id,owner]);
    if(!result.affectedRows)fail('پیام پیدا نشد',404);return {ok:true};
  },
  async unreadResumeMessages(owner){const [row]=await execute("SELECT COUNT(*) total FROM resume_messages WHERE user_id=? AND status='new'",[owner]);return Number(row?.total||0);},
});
module.exports.initialize=initialize;
module.exports.STATUSES=STATUSES;
