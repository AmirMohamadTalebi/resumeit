const {initial,fail}=require('../dashboard/model.cjs');
const parse=v=>typeof v==='string'?JSON.parse(v):v;
module.exports=({execute,transaction})=>({
  async loadDashboard(id){const [r]=await execute('SELECT draft,preferences,pub,revision,slug FROM dashboard_documents WHERE user_id=?',[id]);if(r)return {content:parse(r.draft),preferences:parse(r.preferences),pub:parse(r.pub),revision:r.revision,slug:r.slug};const doc=initial(),[legacy]=await execute('SELECT name,role,bio FROM profiles WHERE user_id=?',[id]);if(legacy){Object.assign(doc.content.profile,{name:legacy.name,title:legacy.role,bio:legacy.bio});doc.content.links.items=(await execute('SELECT name,url FROM links WHERE user_id=? ORDER BY position',[id])).map((l,i)=>({id:'legacy-'+i,type:'link',title:l.name,url:l.url,icon:'link',active:true,featured:false,image:null}));}return doc;},
  async slugAvailable(slug,id){return !(await execute('SELECT user_id FROM dashboard_documents WHERE slug=? AND user_id<>?',[slug,id])).length;},
  async mutateDashboard(id,expected,action){try{return await transaction(async con=>{
    const [[user]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[id]);if(!user)fail('حساب پیدا نشد',401);
    const [[r]]=await con.execute('SELECT * FROM dashboard_documents WHERE user_id=? FOR UPDATE',[id]);
    const doc=r?{content:parse(r.draft),preferences:parse(r.preferences),pub:parse(r.pub),revision:r.revision,slug:r.slug,published:parse(r.published)}:{...initial(),slug:null,published:{}};
    if(doc.revision!==expected)fail('نسخهٔ جدیدتری ذخیره شده است؛ صفحه را دوباره باز کن',409);
    await action(doc);doc.revision++;
    // Never upsert on the unique slug: a collision must not update another account's row.
    const values=[doc.slug,JSON.stringify(doc.content),JSON.stringify(doc.preferences),JSON.stringify(doc.pub),JSON.stringify(doc.published),doc.revision];
    if(r)await con.execute('UPDATE dashboard_documents SET slug=?,draft=?,preferences=?,pub=?,published=?,revision=? WHERE user_id=?',[...values,id]);
    else await con.execute('INSERT INTO dashboard_documents(slug,draft,preferences,pub,published,revision,user_id) VALUES(?,?,?,?,?,?,?)',[...values,id]);
    const {published,...result}=doc;return result;
  });}catch(e){if(e.code==='ER_DUP_ENTRY')fail('این نام صفحه قبلاً گرفته شده است',409);throw e;}},
  async publicPage(slug,kind){const [r]=await execute('SELECT user_id,published,pub,preferences FROM dashboard_documents WHERE slug=?',[slug]);if(!r)return null;const pub=parse(r.pub),published=parse(r.published);return pub[kind].status==='published'&&published[kind]?{id:r.user_id,content:published[kind],preferences:parse(r.preferences)}:null;},
  async recordMetric(id,kind,link='',now=Date.now()){const day=Math.floor((now+12600000)/86400000);await execute('INSERT INTO dashboard_metrics(user_id,day,event,link_id,total) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE total=total+1',[id,day,kind,link]);},
  async dashboardStats(id,days=90){return execute('SELECT day,event,link_id,total FROM dashboard_metrics WHERE user_id=? AND day>=? ORDER BY day',[id,Math.floor((Date.now()+12600000)/86400000)-days+1]);},
  async deleteAccount(id){await transaction(async con=>{const [[user]]=await con.execute('SELECT phone FROM users WHERE id=? FOR UPDATE',[id]);if(!user)return;await con.execute('DELETE FROM oauth_states WHERE owner_id=?',[id]);await con.execute('DELETE FROM otp_challenges WHERE owner_id=? OR phone=?',[id,user.phone]);await con.execute('DELETE FROM users WHERE id=?',[id]);});},
});
