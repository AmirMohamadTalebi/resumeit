const assert=require('node:assert/strict'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const db=testStore(),owner=await db.provisionAccount('09120000682',null);await db.setAccountNames(owner,'آوا','مهر');await db.markPhoneVerified(owner);await db.createSession(digest('a'.repeat(64)),owner,Date.now()+60000);
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,headers={Cookie:'ri_session='+'a'.repeat(64)};
 const request=async(path,body)=>{const r=await fetch(base+'/api/dashboard/'+path,{method:body?'POST':'GET',headers:{...headers,...(body?{Origin:base,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 try{
  const c=JSON.parse(JSON.stringify(RI.seed('full'))),image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';c.slug='card-check';c.profile.cover=image;c.profile.avatar=null;c.share={title:'',desc:'',image:null};c.links.header={sync:false,name:'نام مستقل لینک',bio:'معرفی مستقل لینک'};c.theme.resume='glacier';c.theme.links='frost';
  assert.equal(RI.shareCard(c,'links').title,c.links.header.name);assert.equal(RI.shareCard(c,'resume').image,image);
  assert.equal((await request('save',{revision:0,content:c})).status,200);assert.equal((await request('share-qr?kind=links')).status,409);assert.equal((await request('share-qr?kind=evil')).status,400);
  assert.equal((await request('publish',{revision:1,kind:'resume'})).status,200);assert.equal((await request('publish',{revision:2,kind:'links'})).status,200);
  for(const [kind,path,title,description]of [['resume','',c.profile.name,c.profile.bio],['links','/links',c.links.header.name,c.links.header.bio]]){
   const response=await fetch(base+'/u/card-check'+path),html=await response.text();assert.equal(response.status,200);assert(html.includes('<title>'+RI.esc(title)+'</title>'));assert(html.includes('name="description" content="'+RI.esc(description)+'"'));assert(html.includes('property="og:image" content="'+base+'/u/card-check'+ (kind==='links'?'/link':path) +'/share-image"'));assert(html.includes('name="twitter:card" content="summary_large_image"'));
   const png=await fetch(base+'/u/card-check'+path+'/share-image');assert.equal(png.status,200);assert.equal(png.headers.get('content-type'),'image/png');assert(Buffer.from(await png.arrayBuffer()).equals(Buffer.from(image.split(',')[1],'base64')));
   const qr=await request('share-qr?kind='+kind);assert.equal(qr.status,200);assert.equal(qr.body.url,'https://card-check.resumeit.ir'+(kind==='links'?'/link':path));assert.match(qr.body.image,/^data:image\/png;base64,/);assert(Buffer.from(qr.body.image.split(',')[1],'base64').length>1000);
  }
  c.share={title:'عنوان اختصاصی <script>',desc:'شرح اختصاصی',image:null};assert.equal(RI.shareCard(c,'links').title,c.share.title);
  for(const path of ['/','/contact/','/about/','/terms/','/privacy/','/login/','/register/']){const response=await fetch(base+path),html=await response.text();assert.equal(response.status,200);assert(html.includes('/notifications.js'),'toast runtime '+path);assert(!html.includes('پرداخت آنلاین در حال حاضر غیرفعال است'),'stale payment claim '+path);}
  console.log('PASS shared card fallback/escaping, independent links identity, identical public image, Twitter metadata, authorized published-only QR and public-page toast/stale-copy coverage.');
 }finally{await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
