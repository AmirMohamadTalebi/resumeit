const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,owner,target}=f,server=createServer(db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=async(route,data,who='a',slot=1)=>{const r=await fetch(base+'/api/dashboard/'+route+(route.includes('?')?'&':'?')+'workspace='+slot,{method:data?'POST':'GET',headers:{Cookie:'ri_session='+who.repeat(64),...(data?{Origin:base,'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};};
 try{
  for(const route of ['advisor','support','reset/request'])for(const body of ['{','null','[]','"text"']){
   const response=await fetch(base+'/api/dashboard/'+route,{method:'POST',headers:{Cookie:'ri_session='+'a'.repeat(64),Origin:base,'Content-Type':'application/json'},body});
   assert.equal(response.status,400,route+' rejects malformed/non-object JSON as a client error');
  }
  let state=await request('advisor');assert.equal(state.body.version,0);assert.equal((await request('advisor',{version:0,operations:[{kind:'context',goal:'تحلیل داده'}]})).status,200);
  assert.equal((await request('advisor',null,'b')).body.state.context.goal,'');assert.equal((await request('advisor',null,'a',2)).body.state.context.goal,'');
  assert.equal((await request('advisor',{version:0,operations:[]})).status,409);
  assert.equal((await request('advisor',{version:1,operations:[{kind:'context',goal:'<script>bad</script>'}]})).status,200,'text remains inert data');
  assert.equal((await request('advisor',{version:2,operations:[{kind:'confirm',target:'template:vista:f1',digest:'bad'}]})).status,400);
  assert.equal((await request('advisor',null,'a',3)).status,400);
  const attachment={name:'evidence.txt',type:'text/plain',data:Buffer.from('Synthetic diagnostic evidence').toString('base64')};
  const input={subject:'آزمون پیوست',body:'این متن فقط برای بررسی پیوست تیکت است.',category:'editor',priority:'normal',requestId:randomUUID(),attachments:[attachment]};
  const ticket=await request('support',input,'b');assert.equal(ticket.status,200,JSON.stringify(ticket.body));const thread=(await request('support?id='+ticket.body.id,null,'b')).body;assert.equal(thread.messages[0].attachments.length,1);
  const id=thread.messages[0].attachments[0].id,url=base+'/api/dashboard/support/attachment?id='+id;
  const file=await fetch(url,{headers:{Cookie:'ri_session='+'b'.repeat(64)}});assert.equal(file.status,200);assert.match(file.headers.get('content-disposition'),/^attachment/);assert.equal(file.headers.get('content-type'),'application/octet-stream');assert.equal(await file.text(),'Synthetic diagnostic evidence');
  assert.equal((await fetch(url,{headers:{Cookie:'ri_session='+'a'.repeat(64)}})).status,404);assert.equal((await fetch(url+'&staff=1',{headers:{Cookie:'ri_session='+'a'.repeat(64)}})).status,200);assert.equal((await fetch(url+'&staff=1',{headers:{Cookie:'ri_session='+'b'.repeat(64)}})).status,403);assert.equal((await fetch(url)).status,401);
  for(const bad of [{...attachment,name:'evil.exe'},{...attachment,name:'evil.php.txt',data:Buffer.from('<?php echo 1;').toString('base64')},{...attachment,type:'image/png',name:'fake.png'},{...attachment,data:Buffer.alloc(401*1024,65).toString('base64')}])assert.equal((await request('support',{...input,requestId:randomUUID(),attachments:[bad]},'b')).status,400);
  assert.equal((await request('support',{...input,requestId:randomUUID(),attachments:[attachment,attachment]},'b')).status,400);
  await db.creditWallet(target,2000000,'subscriber-test-credit');await db.purchaseWithWallet(target,'subscription:y',randomUUID());
  const large={name:'large.txt',type:'text/plain',data:Buffer.alloc(2*1024*1024,65).toString('base64')},paid=await request('support',{...input,requestId:randomUUID(),attachments:[large,attachment,attachment,attachment,attachment]},'b');assert.equal(paid.status,200,'subscriber can attach 2MB and five files');
  assert.equal((await request('support',{...input,requestId:randomUUID(),attachments:Array(6).fill(attachment)},'b')).status,400);assert.equal((await request('support',{...input,requestId:randomUUID(),attachments:Array(5).fill(large)},'b')).status,413,'oversize body rejected before processing');
  const content=JSON.parse(JSON.stringify(RI.seed('full')));content.slug='reset-proof';await db.mutateDashboard(owner,0,d=>{d.content=content;d.pub.resume={status:'published',version:1,snap:'x'};d.published.resume=content;});
  assert.equal((await request('reset',{kind:'resume',revision:1,challengeId:randomUUID(),code:'123456'})).status,401);
  const challenge=await request('reset/request',{kind:'resume'});assert.equal(challenge.status,200);const code=f.codes.get('09120000123'),proof={kind:'resume',revision:1,challengeId:challenge.body.challengeId,code};
  assert.equal((await request('reset',{...proof,kind:'links'})).status,401);assert.equal((await request('reset',{...proof,revision:0},'a',2)).status,401);
  assert.equal((await request('reset',{...proof,code:code==='000000'?'111111':'000000'})).status,401);assert.equal((await db.loadDashboard(owner)).content.profile.name,content.profile.name);
  const reset=await request('reset',proof);assert.equal(reset.status,200,JSON.stringify(reset.body));assert.equal(reset.body.content.profile.name,'');assert(reset.body.content.links.items.length);assert.equal(reset.body.pub.resume.status,'draft');assert.equal(reset.body.content.slug,'reset-proof');assert.equal((await request('reset',{...proof,revision:reset.body.revision})).status,401,'proof single use');assert.equal((await request('advisor')).body.version,0,'confirmations removed with resume');
  f.nextSms();const next=(await request('reset/request',{kind:'links'})).body;const links=await request('reset',{kind:'links',revision:reset.body.revision,challengeId:next.challengeId,code:f.codes.get('09120000123')});assert.equal(links.status,200);assert.equal(links.body.content.links.items.length,0);assert.equal(links.body.content.links.header.sync,true);
  console.log('PASS advisor CAS/ownership/workspaces, private downloadable attachments/type/signature/free quota/staff access, OTP-bound per-page reset, no mutation before confirmation, replay protection and independent reset. SQLite; SMS simulated.');
 }finally{await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
