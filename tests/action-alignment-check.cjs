const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,out=path.resolve('artifacts/action-alignment');fs.mkdirSync(out,{recursive:true});let browser;
 try{
 browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);const page=await context.newPage(),evidence=[];let compared=0;
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['resume/?step=profile','links/','themes/','publish/','settings/','wallet/','stats/','studio/']){
   await page.goto(base+'/dashboard/'+route);await page.locator('#page-title').waitFor();await page.evaluate(()=>document.fonts.ready);
   const groups=await page.locator('.page-head__actions,.btnrow,.row__actions').evaluateAll(groups=>groups.filter(g=>g.getBoundingClientRect().width>0).map(g=>({group:g.className,display:getComputedStyle(g).display,buttons:[...g.children].filter(e=>e.matches('.btn')&&e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),top:r.top,bottom:r.bottom,center:r.top+r.height/2};})})));
   for(const group of groups)for(let i=0;i<group.buttons.length;i++)for(let j=i+1;j<group.buttons.length;j++){const a=group.buttons[i],b=group.buttons[j];if(Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>10){compared++;assert(Math.abs(a.center-b.center)<=1.5,JSON.stringify({route,width,...group,a,b}));}}
   evidence.push({route,width,groups});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflow '+width);
   if(route.startsWith('resume'))await page.locator('.page-head').screenshot({path:path.join(out,'resume-header-'+width+'.png')});
  }
 }
 assert(compared>10);fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({compared,evidence},null,2));console.log('PASS action alignment across 8 dashboard routes at 1440/390/320px;',compared,'same-row button pairs.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
