// Copies external image addresses that were stored before images were localized on save.
// Downloads happen outside any transaction; each row is then rewritten under a row lock with exact
// JSON-string replacement, so drafts, published copies and publication snapshots stay consistent.
// The revision is left unchanged: an editor that is still open re-sends the old address, which the
// save path localizes again from its cache instead of reporting a conflict.
module.exports=({execute,transaction})=>({
  async localizeStoredImages(download,{log=()=>{}}={}){
    const {externalImages}=require('../dashboard/model.cjs'),parse=v=>typeof v==='string'?JSON.parse(v):v;
    const swap=(text,map)=>{
      for(const [url,data] of map){
        text=text.split(JSON.stringify(url)).join(JSON.stringify(data));
        // pub.snap is JSON text stored inside JSON, so its quotes are escaped once more.
        text=text.split(JSON.stringify(JSON.stringify(url)).slice(1,-1)).join(JSON.stringify(JSON.stringify(data)).slice(1,-1));
      }
      return text;
    };
    const summary={rows:0,images:0,failed:0};
    for(const [table,columns] of [['dashboard_documents',['user_id']],['dashboard_workspaces',['user_id','slot']]]){
      const where=columns.map(c=>c+'=?').join(' AND ');
      const rows=await execute(`SELECT ${columns.join(',')} FROM ${table} WHERE draft LIKE '%https://%' OR published LIKE '%https://%'`);
      for(const row of rows){
        const keys=columns.map(c=>row[c]);
        try{
          const [current]=await execute(`SELECT draft,published FROM ${table} WHERE ${where}`,keys);if(!current)continue;
          const urls=new Set();
          for(const content of [parse(current.draft),...Object.values(parse(current.published)||{})])for(const url of externalImages(content))urls.add(url);
          if(!urls.size)continue;
          const map=new Map();
          for(const url of urls){try{map.set(url,await download(url));}catch(error){summary.failed++;log({event:'external_image_failed',table,code:error.code||error.name});}}
          if(!map.size)continue;
          await transaction(async con=>{
            const [[locked]]=await con.execute(`SELECT draft,published,pub FROM ${table} WHERE ${where} FOR UPDATE`,keys);if(!locked)return;
            const text=v=>typeof v==='string'?v:JSON.stringify(v),all=text(locked.draft)+text(locked.published);
            // Text replacement cannot tell fields apart; leave an address that is also used as a link target.
            for(const url of [...map.keys()])if(all.includes('"url":'+JSON.stringify(url))||all.includes('"url": '+JSON.stringify(url)))map.delete(url);
            if(!map.size)return;
            await con.execute(`UPDATE ${table} SET draft=?,published=?,pub=? WHERE ${where}`,[swap(text(locked.draft),map),locked.published==null?null:swap(text(locked.published),map),swap(text(locked.pub),map),...keys]);
          });
          summary.rows++;summary.images+=map.size;
        }catch(error){log({event:'external_image_row_failed',table,code:error.code||error.name});}
        // Yield between rows so a large backlog never starves live requests.
        await new Promise(resolve=>setImmediate(resolve));
      }
    }
    return summary;
  },
});
