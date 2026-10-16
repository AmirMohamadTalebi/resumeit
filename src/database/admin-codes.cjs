const prefixes={users:'Rol',pages:'Page',payments:'peycard',transactions:'paywallet',tickets:'Tecket',audit:'AdminLogs'};
const key=(kind,row)=>kind==='pages'?row.id+':'+(row.slot||1):kind==='catalog'?row.ref:row.id;
function prefix(kind,record){if(kind!=='catalog')return prefixes[kind];const [type,id]=record.split(':');return ({rt:'Tem-R',lt:'Tem-L',font:'Font'})[type]||(type==='subscription'?({q:'Rakhsh',h:'Simorgh',y:'Homa'})[id]:null);}
const code=(kind,record,id)=>prefix(kind,record)+'-'+id;
module.exports=({execute})=>({
 async adminCodes(kind,rows){
  const keys=[...new Set(rows.map(r=>key(kind,r)).filter(k=>k&&prefix(kind,k)))];if(!keys.length)return rows;
  // Allocate only records actually read by staff; never rewrite foreign keys or bank references.
  const select='SELECT id,entity_key FROM admin_codes WHERE entity_kind=? AND entity_key IN ('+keys.map(()=>'?').join(',')+')',args=[kind,...keys];let found=await execute(select,args);const known=new Set(found.map(r=>r.entity_key)),missing=keys.filter(k=>!known.has(k));
  if(missing.length){await execute('INSERT IGNORE INTO admin_codes(entity_kind,entity_key) VALUES '+missing.map(()=>'(?,?)').join(','),missing.flatMap(k=>[kind,k]));found=await execute(select,args);}
  let roles=new Map();if(kind==='users'){const users=await execute("SELECT u.id,CASE WHEN EXISTS(SELECT 1 FROM owner_accounts WHERE user_id=u.id) THEN 'Owner' WHEN EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) THEN 'Admin' WHEN EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id) THEN 'Support' ELSE 'User' END role FROM users u WHERE u.id IN ("+keys.map(()=>'?').join(',')+')',keys);roles=new Map(users.map(u=>[u.id,u.role]));}
  const labels=new Map(found.map(r=>[r.entity_key,kind==='users'?(roles.get(r.entity_key)||'User')+'-'+r.id:code(kind,r.entity_key,r.id)]));return rows.map(r=>labels.has(key(kind,r))?{...r,admin_code:labels.get(key(kind,r))}:r);
 },
 async adminFindCode(value){
  const match=/^(Owner|Admin|Support|User|Rol|Page|Tem-R|Tem-L|Font|Rakhsh|Simorgh|Homa|peycard|paywallet|Tecket|AdminLogs)-([1-9][0-9]{0,15})$/i.exec(value);if(!match)return null;
  const [row]=await execute('SELECT id,entity_kind,entity_key FROM admin_codes WHERE id=?',[match[2]]);if(!row)return null;const userAlias=row.entity_kind==='users'&&/^(Rol|Owner|Admin|Support|User)$/i.test(match[1]);if(!userAlias&&code(row.entity_kind,row.entity_key,row.id).toLowerCase()!==value.toLowerCase())return null;return {kind:row.entity_kind,key:row.entity_key};
 }
});
