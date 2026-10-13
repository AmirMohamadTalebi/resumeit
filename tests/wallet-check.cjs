const assert=require('node:assert/strict');
const {RI,blank}=require('../src/dashboard/render.cjs'),model=require('../src/dashboard/model.cjs');
(async()=>{
 for(const id of ['vista','satiar']){
  const c=blank();c.theme.resume=id;c.slug='wallet-test';c.profile.name='آزمایش';c.profile.title='طراح';c.contacts[0].public=true;c.contacts[0].value='hello@example.com';c.resumeTemplates[id]={fields:{},settings:{reviewed:true}};
  const item=RI.RESUME_TEMPLATES.find(t=>t.id===id);assert.equal(item.price,118000);assert.equal(item.price/RI.IT_RATE,59);assert(item.subscription);
  assert.throws(()=>model.content(c),e=>e.status===403);
  const owned={purchases:[{ref:'rt:'+id}]},sub={plan:{id:'q',end:Date.now()+100000}};
  model.content(c,owned);model.ready(c,'resume',owned);model.content(c,sub);model.ready(c,'resume',sub);
  c.resumeTemplates[id].settings.font='naskh';assert.throws(()=>model.content(c,owned),e=>e.status===403);model.content(c,{purchases:owned.purchases.concat({ref:'font:naskh'})});c.resumeTemplates[id].settings.font='theme';
  assert.throws(()=>model.content(c,{plan:{id:'q',end:Date.now()-1}}));assert.equal(model.publicContent(c).theme.resume,'glacier');assert.equal(model.publicContent(c,owned).theme.resume,id);
 }
 assert.equal(RI.FONTS.length,6);assert.equal(RI.FONTS.filter(f=>f.access==='free').length,3);for(const list of [RI.RESUME_TEMPLATES,RI.LINK_TEMPLATES,RI.FONTS,RI.PALETTES,Object.values(RI.PLANS)])for(const item of list)if(item.price)assert.equal(item.price%RI.IT_RATE,0);for(const f of RI.FONTS.filter(f=>f.access==='buy'))assert(f.price>=45000&&f.price<=60000);
 let credits=0;await require('../src/database/owner-wallet-credit.cjs')({creditWallet:async(id,amount,ref)=>{assert.equal(id,'owner');assert.equal(amount/RI.IT_RATE,500);assert.equal(ref,'owner-credit-20261013');credits++;}},async(sql,params)=>{if(sql.includes('wallet_credit_claims'))return [];assert(sql.includes('SHA2'));assert.equal(params[0].length,64);return [{id:'owner'}];});assert.equal(credits,1);
 await require('../src/database/owner-wallet-credit.cjs')({creditWallet:async()=>{throw Error('Credit must not repeat');}},async()=>[{reference:'owner-credit-20261013'}]);
 console.log('PASS: special template price, purchase/subscription/expiry rules, free fallback without data loss, three free and three paid fonts and authorized owner credit.');
})().catch(e=>{console.error(e);process.exitCode=1;});
