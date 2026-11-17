// Dashboard images live here, one row per account and content hash; documents keep only the address.
// Before this table every load and every autosave read and rewrote all of an account's images.
const {fail}=require('../dashboard/model.cjs'),media=require('../dashboard/media.cjs');
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const ORPHAN_GRACE=24*3600000;
const list=values=>values.map(()=>'?').join(',');
const tables=[['dashboard_documents',['user_id'],1],['dashboard_workspaces',['user_id','slot'],null]];

async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS dashboard_media(user_id CHAR(36) NOT NULL,hash CHAR(32) CHARACTER SET ascii NOT NULL,mime VARCHAR(16) NOT NULL,size INT UNSIGNED NOT NULL,data MEDIUMBLOB NOT NULL,created_at BIGINT NOT NULL,orphaned_at BIGINT NULL,PRIMARY KEY(user_id,hash),INDEX(orphaned_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
}

// Moves inline images of a document about to be written into the table and keeps orphan marks current.
// before: hashes the row used when it was read; publishedLoaded: whether doc.published is the stored copy.
async function store(con,id,slot,before,doc,publishedLoaded){
  const files=new Map();
  doc.content=media.externalize(doc.content,files);doc.pub=media.externalizePub(doc.pub,files);
  if(publishedLoaded)doc.published=media.externalize(doc.published,files);
  for(const [hash,value] of files){const {type,body}=media.decode(value);await con.execute('INSERT IGNORE INTO dashboard_media(user_id,hash,mime,size,data,created_at) VALUES(?,?,?,?,?,?)',[id,hash,type,body.length,body,Date.now()]);}
  const after=media.documentHashes(doc),added=[...after].filter(h=>!before.has(h)),removed=[...before].filter(h=>!after.has(h));
  if(added.length){
    // An address copied from another page or kept by an undo must still name a stored image.
    const [rows]=await con.execute('SELECT hash FROM dashboard_media WHERE user_id=? AND hash IN ('+list(added)+')',[id,...added]),have=new Set(rows.map(r=>r.hash));
    if(added.some(h=>!have.has(h)))fail('تصویر قبلی در دسترس نیست؛ صفحه را تازه کن',409);
    await con.execute('UPDATE dashboard_media SET orphaned_at=NULL WHERE user_id=? AND orphaned_at IS NOT NULL AND hash IN ('+list(added)+')',[id,...added]);
  }
  if(removed.length){
    // Other pages of the account (and this row's published copy when it was not loaded) may still use them.
    const still=new Set();
    for(const [table,,single] of tables){
      const [rows]=await con.execute('SELECT '+(single?'1 slot':'slot')+',draft,published,pub FROM '+table+' WHERE user_id=?',[id]);
      for(const row of rows){
        const own=Number(row.slot)===slot;if(own&&publishedLoaded)continue;
        const used=own?media.documentHashes({published:parse(row.published)}):media.documentHashes({content:parse(row.draft),published:parse(row.published),pub:parse(row.pub)});
        for(const h of used)still.add(h);
      }
    }
    // A saved version (council C1-a) keeps its images too; its rows are read once, here, and only when something was removed.
    const [kept]=await con.execute('SELECT content FROM dashboard_versions WHERE user_id=?',[id]);
    for(const v of kept)for(const h of media.documentHashes({content:parse(v.content)}))still.add(h);
    const orphans=removed.filter(h=>!still.has(h));
    if(orphans.length)await con.execute('UPDATE dashboard_media SET orphaned_at=? WHERE user_id=? AND orphaned_at IS NULL AND hash IN ('+list(orphans)+')',[Date.now(),id,...orphans]);
  }
}

module.exports=({execute,transaction})=>({
  async dashboardMedia(id,hash){const [row]=await execute('SELECT mime,data FROM dashboard_media WHERE user_id=? AND hash=?',[id,hash]);return row?{type:row.mime,body:Buffer.from(row.data)}:null;},
  async dashboardMediaKnown(id,hashes){if(!hashes.length)return new Set();const rows=await execute('SELECT hash FROM dashboard_media WHERE user_id=? AND hash IN ('+list(hashes)+')',[id,...hashes]);return new Set(rows.map(r=>r.hash));},
  async dashboardMediaTypes(id,hashes){if(!hashes.length)return new Map();const rows=await execute('SELECT hash,mime FROM dashboard_media WHERE user_id=? AND hash IN ('+list(hashes)+')',[id,...hashes]);return new Map(rows.map(r=>[r.hash,r.mime]));},
  // Images nothing has used for a day are removed; the grace period lets an undo or an older tab bring one back.
  async sweepDashboardMedia(now=Date.now()){return (await execute('DELETE FROM dashboard_media WHERE orphaned_at IS NOT NULL AND orphaned_at<?',[now-ORPHAN_GRACE])).affectedRows||0;},
  // Moves images still stored inline in documents into the table. Safe to repeat; the revision is left
  // unchanged so open editors keep saving, and each row is rewritten under the same locks as a save.
  async externalizeStoredImages({log=()=>{}}={}){
    const summary={rows:0,images:0,failed:0};
    for(const [table,columns] of tables){
      const where=columns.map(c=>c+'=?').join(' AND ');
      const rows=await execute(`SELECT ${columns.join(',')} FROM ${table} WHERE draft LIKE '%data:image/%' OR published LIKE '%data:image/%' OR pub LIKE '%data:image/%'`);
      for(const row of rows){
        const keys=columns.map(c=>row[c]);
        try{
          await transaction(async con=>{
            const [[user]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[keys[0]]);if(!user)return;
            const [[locked]]=await con.execute(`SELECT draft,published,pub FROM ${table} WHERE ${where} FOR UPDATE`,keys);if(!locked)return;
            const doc={content:parse(locked.draft),published:parse(locked.published)||{},pub:parse(locked.pub)},before=media.documentHashes(doc),inline=media.images(doc.content).size;
            await store(con,keys[0],keys[1]??1,before,doc,true);
            await con.execute(`UPDATE ${table} SET draft=?,published=?,pub=? WHERE ${where}`,[JSON.stringify(doc.content),JSON.stringify(doc.published),JSON.stringify(doc.pub),...keys]);
            summary.rows++;summary.images+=inline;
          });
        }catch(error){summary.failed++;log({event:'dashboard_media_row_failed',table,code:error.code||error.name});}
        // Yield between rows so a large backlog never starves live requests.
        await new Promise(resolve=>setImmediate(resolve));
      }
    }
    return summary;
  },
});
module.exports.initialize=initialize;
module.exports.store=store;
