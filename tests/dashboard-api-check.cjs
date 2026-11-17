const assert=require('node:assert/strict');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs'),model=require('../src/dashboard/model.cjs');
(async()=>{const old=process.env.PUBLIC_ORIGIN,db=testStore(),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;
const a=await db.provisionAccount('09120000801',null),b=await db.provisionAccount('09120000802',null);await db.setAccountNames(a,'امیر','طالبی');await db.markPhoneVerified(a);await db.createSession(digest('a'.repeat(64)),a,Date.now()+60000);await db.createSession(digest('b'.repeat(64)),b,Date.now()+60000);
const request=(route,data,owner='a',origin=base)=>fetch(base+'/api/dashboard/'+route,{method:data?'POST':'GET',headers:{Cookie:'ri_session='+owner.repeat(64),...(data?{Origin:origin,'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
const subRequest=route=>new Promise((resolve,reject)=>{require('node:http').get(base+route,{headers:{Host:'amir.resumeit.ir',Cookie:'ri_session='+'a'.repeat(64)}},r=>{let body='';r.on('data',c=>body+=c);r.on('end',()=>resolve({status:r.statusCode,body}));}).on('error',reject);});
try{
 assert.equal((await request('document',null,'c')).status,401);
 const switched=await fetch(base+'/api/dashboard/save',{method:'POST',headers:{Cookie:'ri_session='+'b'.repeat(64),Origin:base,'Content-Type':'application/json','X-ResumeIt-Owner':a},body:JSON.stringify({revision:0,patch:{profile:{name:'must not write'}}})});assert.equal(switched.status,409);assert.equal((await switched.json()).code,'ACCOUNT_CHANGED');assert.equal((await db.loadDashboard(b)).revision,0);
 const initial=await(await request('document')).json();assert.equal(initial.revision,0);assert.equal(initial.content.profile.name,'');
 const c=initial.content;c.slug='amir';c.profile.name='امیر <script>alert(1)</script>';c.profile.title='توسعه‌دهنده';c.contacts[0].value='public@example.com';c.contacts[0].public=true;c.contacts[1].value='09129999999';c.contacts[1].public=false;c.skills=[{id:'skill1',name:'جاوااسکریپت',level:3}];c.links.items=[{id:'link1',type:'link',title:'گیت‌هاب',url:'https://github.com/test',icon:'github',active:true,featured:true},{id:'hidden',type:'link',title:'SECRET_LINK',url:'https://private.example.com',icon:'link',active:false}];
 assert.equal((await request('save',{revision:0,content:c},'a','https://evil.example')).status,403);
 const bad=structuredClone(c);bad.links.items[0].url='javascript:alert(1)';assert.equal((await request('save',{revision:0,content:bad})).status,400);
 const reserved=structuredClone(c);reserved.slug='admin';assert.equal((await request('save',{revision:0,content:reserved})).status,400);
 const paid=structuredClone(c);paid.theme.resume='terminal';assert.equal((await request('save',{revision:0,content:paid})).status,403);
 assert.equal((await request('save',{revision:0,content:c})).status,200);
 assert.equal((await request('save',{revision:0,content:c})).status,409);
 assert.equal((await request('save',{revision:0,content:c},'b')).status,409);
 assert.equal((await(await request('document',null,'b')).json()).content.slug,'');
 assert.equal((await fetch(base+'/u/amir/')).status,404);
 assert.equal((await request('publish',{revision:1,kind:'resume'})).status,200);
 assert.equal((await request('publish',{revision:2,kind:'links'})).status,200);
 const small=await(await request('document')).json();assert.equal(small.pub.resume.snap,null);assert.equal(small.pub.resume.snapCurrent,true);assert.equal(small.pub.links.snapCurrent,true);assert((await db.loadDashboard(a)).pub.resume.snap,'stored snapshot retained');
 let r=await fetch(base+'/u/amir/'),html=await r.text();assert.equal(r.status,200);assert(html.includes('public@example.com'));assert(!html.includes('09129999999'));assert(!html.includes('<script>alert'));assert(html.includes('&lt;script&gt;'));
 // Plain version for applicant-tracking systems (N2-a): public contacts only, no script or image, never indexed, canonical without the parameter, not a counted visit.
 {const ats=await fetch(base+'/u/amir/?format=ats'),text=await ats.text();assert.equal(ats.status,200);assert(text.includes('public@example.com'),'public contact is listed');assert(!text.includes('09129999999'),'private contact is not');assert(!/<script|<img|<iframe|<form/i.test(text),'plain text only');
  assert(text.includes('<meta name="robots" content="noindex,nofollow">'));assert.match(text,/<link rel="canonical" href="[^"]*\/u\/amir\/?">/);assert(!/canonical[^>]*format=ats/.test(text));assert.equal(ats.headers.get('set-cookie'),null,'not counted as a visit');assert(text.includes('<h1>'),'real heading');
  assert(text.includes('رزومهٔ متنی'));
  const plain=await (await fetch(base+'/u/amir/')).text();assert(!/window\.print|\bprint\(\)/.test(plain),'the public page never opens the print dialog by itself');
  const css=await fetch(base+'/public-assets/print.css');assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);assert((await css.text()).includes('@page{size:A4'));}
 r=await fetch(base+'/u/amir/links');html=await r.text();assert.equal(r.status,200);assert(html.includes('/u/amir/out/link1'));assert(!html.includes('SECRET_LINK'));
 const seenCookie=r.headers.get('set-cookie');assert.match(seenCookie,/ri_seen_links=1; Path=\/u\/amir; HttpOnly; SameSite=Lax; Max-Age=86400/);
 for(let i=0;i<3;i++){const refreshed=await fetch(base+'/u/amir/links',{headers:{Cookie:seenCookie.split(';')[0]}});assert.equal(refreshed.status,200);assert.equal(refreshed.headers.get('set-cookie'),null);}
 assert.equal((await(await request('stats')).json()).rows.find(x=>x.event==='links').total,1);
 r=await fetch(base+'/u/amir/out/link1',{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://github.com/test');
 assert.equal((await fetch(base+'/u/amir/out/hidden',{redirect:'manual'})).status,404);
 r=await subRequest('/');assert.equal(r.status,200);assert(r.body.includes('//amir.resumeit.ir'));
 assert.equal((await subRequest('/api/auth/session')).status,404);
 assert.equal((await subRequest('/public-assets/preview.css')).status,200);
 await fetch(base+'/u/amir/',{method:'HEAD'});
 let rows=(await(await request('stats')).json()).rows;assert.equal(rows.find(x=>x.event==='resume').total,2);assert.equal(rows.find(x=>x.event==='click').total,1);
 c.profile.title='PRIVATE DRAFT';assert.equal((await request('save',{revision:3,content:c,preferences:{indexing:false}})).status,200);
 const changed=await(await request('document')).json();assert(!changed.pub.resume.snapCurrent);assert(changed.pub.resume.snap.includes('توسعه‌دهنده'),'changed snapshot retained');
 html=await(await fetch(base+'/u/amir/')).text();assert(!html.includes('PRIVATE DRAFT'));assert(html.includes('noindex,nofollow'));
 assert.equal((await request('unpublish',{revision:4,kind:'links'})).status,200);assert.equal((await fetch(base+'/u/amir/links')).status,404);
 const compact=await(await request('save',{revision:5,patch:{theme:{...c.theme,font:'sahel'}},preferences:{indexing:false},compact:true})).json();assert.equal(compact.revision,6);assert(!Object.hasOwn(compact,'content'));assert((await(await request('document')).json()).content.profile.title==='PRIVATE DRAFT');
 assert.equal((await request('save',{revision:6,patch:{theme:{...c.theme,font:'lalezar'}},compact:true})).status,403);
 assert.equal((await request('save',{revision:6,patch:JSON.parse('{"__proto__":{}}'),compact:true})).status,400);
 // Resume inputs are accepted as written (no format gate on save); only size limits still apply.
 assert.equal((await request('save',{revision:6,patch:{contacts:[{...c.contacts[0],value:'x'.repeat(201)}]},compact:true})).status,400);
 assert.equal((await request('save',{revision:6,patch:{contacts:[{...c.contacts[0],value:'invalid'}],socials:[{id:'s1',platform:'github',handle:'نام با فاصله'}]},compact:true})).status,200);assert.equal((await(await request('document')).json()).content.contacts[0].value,'invalid');
 const stale=await request('save',{revision:5,patch:{theme:c.theme},compact:true});assert.equal(stale.status,409);assert.equal((await stale.json()).code,'REVISION_CONFLICT');
 await db.mutateDashboard(b,0,d=>{d.content.theme.resume='vista';d.content.resumeTemplates.vista={fields:{},settings:{reviewed:true},collections:{}};});assert.equal((await request('save',{revision:1,patch:{profile:{...initial.content.profile,title:'edit expired draft'}}},'b')).status,200);assert.equal((await request('save',{revision:2,patch:{theme:{...(await db.loadDashboard(b)).content.theme,resume:'satiar'}}},'b')).status,403);
 assert.equal((await request('delete',{confirm:'no'})).status,400);assert.equal((await request('delete',{confirm:'DELETE'})).status,200);assert.equal((await fetch(base+'/u/amir/')).status,404);assert.equal((await request('document')).status,401);
 console.log('PASS: dashboard persistence, account isolation, revision conflicts, slug ownership, validated free themes/URLs, snapshot publishing, private fields, subdomain routing/assets, real counts, unpublish and account deletion.');
}finally{if(old===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=old;await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
