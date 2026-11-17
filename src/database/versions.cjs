// Résumé versions (council C1-a): a copy of the page content at every publish, and a backup of what a reset or a restore replaces.
// At most 20 per page (slot); only a draft comes back from a restore. A copy that changes nothing is not stored twice.
const {createHash,randomUUID}=require('node:crypto');
const media=require('../dashboard/media.cjs'),model=require('../dashboard/model.cjs');
const CAP=20,parse=v=>typeof v==='string'?JSON.parse(v):v;
// Same text for the same content, whatever order the keys were written in (MySQL reorders JSON keys).
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v);
async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS dashboard_versions(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,slot INT NOT NULL,reason VARCHAR(8) NOT NULL,revision INT UNSIGNED NOT NULL,created_at BIGINT NOT NULL,hash CHAR(64) NOT NULL,content JSON NOT NULL,INDEX(user_id,slot,created_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
}
// Inside the page's own transaction, after its images are stored.
async function add(con,userId,slot,reason,content,revision,now=Date.now()){
  const hash=createHash('sha256').update(canon(content)).digest('hex');
  const [[last]]=await con.execute('SELECT hash FROM dashboard_versions WHERE user_id=? AND slot=? ORDER BY created_at DESC,id DESC LIMIT 1',[userId,slot]);
  if(last?.hash===hash)return false;
  await con.execute('INSERT INTO dashboard_versions(id,user_id,slot,reason,revision,created_at,hash,content) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),userId,slot,reason,revision,now,hash,JSON.stringify(content)]);
  // An image this copy keeps must not be swept as unused.
  const hashes=[...media.documentHashes({content})];
  if(hashes.length)await con.execute('UPDATE dashboard_media SET orphaned_at=NULL WHERE user_id=? AND orphaned_at IS NOT NULL AND hash IN ('+hashes.map(()=>'?').join(',')+')',[userId,...hashes]);
  await con.execute('DELETE FROM dashboard_versions WHERE user_id=? AND slot=? AND id NOT IN (SELECT id FROM (SELECT id FROM dashboard_versions WHERE user_id=? AND slot=? ORDER BY created_at DESC,id DESC LIMIT '+CAP+') keep)',[userId,slot,userId,slot]);
  return true;
}
module.exports=({execute})=>({
  async listVersions(userId,slot,full=false){
    const rows=await execute('SELECT id,reason,revision,created_at'+(full?',content':'')+' FROM dashboard_versions WHERE user_id=? AND slot=? ORDER BY created_at DESC,id DESC',[userId,slot]);
    return rows.map(r=>({id:r.id,reason:r.reason,revision:Number(r.revision),at:Number(r.created_at),...(full?{content:parse(r.content)}:{})}));
  },
  // Only the draft changes; the public page stays as published. Address, domain and routes stay the current ones, and a paid
  // template, font or colour the person does not have falls back to a free one, which is named in the answer.
  async restoreVersion(userId,slot,versionId,expectedRevision,billing){
    const [row]=await execute('SELECT content FROM dashboard_versions WHERE id=? AND user_id=? AND slot=?',[versionId,userId,slot]);
    if(!row)model.fail('این نسخه پیدا نشد',404);
    let downgraded=[];
    // The stored addresses in the copy are known images of this account unless the sweep already removed them.
    const known=await this.dashboardMediaKnown(userId,[...media.documentHashes({content:parse(row.content)})]);
    const result=await this.mutateDashboard(userId,expectedRevision,doc=>{
      const raw=structuredClone(parse(row.content));downgraded=model.downgradeAccess(raw,billing,doc.content);
      // Text and image blocks on the links page need a subscription unless the draft already has them.
      if(!(billing.plan&&billing.plan.end>Date.now())&&raw.links?.items){const had=raw.links.items.length;raw.links.items=raw.links.items.filter(x=>!['text','image'].includes(x.type)||doc.content.links.items.some(o=>o.id===x.id&&JSON.stringify(o)===JSON.stringify(x)));if(raw.links.items.length<had)downgraded.push('بلوک‌های متن و تصویر (نیاز به اشتراک)');}
      const next=model.content(raw,billing,doc.content,{known});
      for(const key of ['slug','domain','routing'])next[key]=doc.content[key];
      doc.content=next;
    },{workspace:slot,version:'restore'});
    return {...result,downgraded};
  },
  async clearVersions(userId,slot){return (await execute('DELETE FROM dashboard_versions WHERE user_id=? AND slot=?',[userId,slot])).affectedRows||0;},
});
module.exports.initialize=initialize;module.exports.add=add;module.exports.CAP=CAP;
