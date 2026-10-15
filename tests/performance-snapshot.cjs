const fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(f.db,[f.owner,f.target]),server=createServer(f.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),results=[];
 try{for(const route of ['/','/dashboard/themes/']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:500000,uploadThroughput:250000});
  await page.addInitScript(()=>{window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});document.addEventListener('ri:dashboard-ready',()=>window.readyAt=performance.now());});
  await page.goto(base+route,{waitUntil:'load',timeout:120000});if(route.includes('dashboard'))await page.waitForFunction(()=>window.readyAt,{timeout:120000});
  await page.evaluate(async()=>{for(let n=0;n<12;n++){scrollBy(0,260);await new Promise(r=>setTimeout(r,90));}});
  results.push(await page.evaluate(route=>({route,ready:Math.round(window.readyAt||performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),nodes:document.querySelectorAll('*').length,frames:document.querySelectorAll('iframe').length,bytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.encodedBodySize,0),longTaskMs:Math.round(longTasks.reduce((a,b)=>a+b,0)),largeTasks:longTasks.length,resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize})).sort((a,b)=>b.bytes-a.bytes).slice(0,8)}),route));await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));store.close();}
 fs.mkdirSync('artifacts/performance',{recursive:true});fs.writeFileSync('artifacts/performance/'+(process.argv[2]||'latest')+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
