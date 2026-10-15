const assert=require('node:assert/strict'),{digest}=require('../src/auth/auth.cjs'),{createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const {db,owner,target,options}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true});
 db.billing=async()=>({plan:{id:'y',end:Date.now()+300*86400000},purchases:[],payments:[]});db.wallet=async()=>({balance:120,rate:2000,transactions:[]});const content=JSON.parse(JSON.stringify(RI.seed('full')));content.profile.name='آوا مهر';await db.mutateDashboard(owner,0,doc=>{doc.content=content;});
 const server=createServer(db,{...options,payments:{env:{SEP_ENABLED:'false',ZIBAL_ENABLED:'false'}},notifications:{provider:{available:{email:false,sms:false,push:false},publicKey:null}}}),handler=server.listeners('request')[0];server.removeAllListeners('request');
 server.on('request',async(req,res)=>{
  if(req.url==='/__preview__/'){await db.createSession(digest('a'.repeat(64)),owner,Date.now()+3600000);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':'ri_session='+'a'.repeat(64)+'; Path=/; HttpOnly; SameSite=Lax'});res.end('<!doctype html><html lang="fa"><head><meta charset="utf-8"><script defer src="/__preview__/boot.js"></script></head><body>پیش‌نمایش محلی با دادهٔ آزمایشی</body></html>');return;}
  if(req.url==='/__preview__/boot.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('sessionStorage.setItem("ri-panel-choice",'+JSON.stringify(owner)+');location.replace("/dashboard/resume/");');return;}return handler(req,res);
 });
 await new Promise(r=>server.listen(Number(process.env.PREVIEW_PORT||0),'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const response=await fetch(base+'/__preview__/');assert.equal(response.status,200);assert(response.headers.get('set-cookie').includes('HttpOnly'));assert.equal((await fetch(base+'/api/version')).status,200);console.log('LOCAL PREVIEW (mock data; payments, email, SMS and push disabled): '+base+'/__preview__/');
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>{store.close();process.exit(0);}));
})().catch(error=>{console.error(error);process.exitCode=1;});
