const {createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,owner}=f;
 await db.creditWallet(owner,2000000,'preview-seed');await db.purchaseWithWallet(owner,'subscription:y',require('node:crypto').randomUUID());
 const content=JSON.parse(JSON.stringify(RI.seed('full')));content.profile.bio='در محیط آزمایشی،  با SQL نمودار فروش ساختم.';await db.mutateDashboard(owner,0,d=>{d.content=content;});
 const server=createServer(db,{...f.options,payments:{...f.options.payments,env:{SEP_ENABLED:'false',ZIBAL_ENABLED:'false'}}}),handler=server.listeners('request')[0];server.removeAllListeners('request');
 server.on('request',async(req,res)=>{
  if(req.url==='/__preview__/'){await db.createSession(f.hash('a'.repeat(64)),owner,Date.now()+3600000);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':'ri_session='+'a'.repeat(64)+'; Path=/; HttpOnly; SameSite=Lax'});res.end('<!doctype html><html lang="fa"><head><meta charset="utf-8"><script defer src="/__preview__/boot.js"></script></head><body>پیش‌نمایش محلی با دادهٔ آزمایشی</body></html>');return;}
  if(req.url==='/__preview__/boot.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('sessionStorage.setItem("ri-panel-choice",'+JSON.stringify(owner)+');location.replace("/dashboard/resume/");');return;}
  if(req.url==='/__preview__/sms'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('فقط کدهای مصنوعی همین پیش‌نمایش:\n'+[...f.codes].map(([phone,code])=>phone+': '+code).join('\n'));return;}
  return handler(req,res);
 });
 await new Promise(r=>server.listen(Number(process.env.PREVIEW_PORT||12566),'127.0.0.1',r));console.log('Synthetic local preview: http://127.0.0.1:'+server.address().port+'/__preview__/');
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>{f.store.close();process.exit(0);}));
})().catch(error=>{console.error(error);process.exitCode=1;});
