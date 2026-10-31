const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
const light=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>(Math.max(light(a),light(b))+.05)/(Math.min(light(a),light(b))+.05),warm=c=>c.map((x,i)=>x*[1,.85,.55][i]);
const styles=e=>{
 const rgba=s=>(s.match(/[\d.]+/g)||[]).map(Number),blend=(a,b)=>a.slice(0,3).map((v,i)=>v*(a[3]??1)+b[i]*(1-(a[3]??1))),chain=[];
 for(let p=e;p;p=p.parentElement)chain.unshift(getComputedStyle(p));
 let bg=[255,255,255];for(const s of chain)bg=blend(rgba(s.backgroundColor),bg);
 const s=getComputedStyle(e);return {fg:blend(rgba(s.color),bg),bg,outline:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),disabled:e.disabled||false};
};
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true});
 db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});db.wallet=async()=>({balance:120,rate:2000,transactions:[]});
 await db.createTicket(owner,{subject:'بررسی خوانایی کنترل‌ها',body:'تیکت محلی برای بررسی حالت هاور و فوکوس.',category:'editor',priority:'normal',requestId:randomUUID()});
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,out=path.resolve('artifacts/nightlight/site');await fs.mkdir(out,{recursive:true});let browser;
 const report={local:true,note:'Computed flat-surface contrast and approximate warm transform; not display calibration or a complete accessibility audit.',routes:[],states:[],failures:[]};
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),owner);const page=await context.newPage();
  const routes=['/','/about/','/contact/','/privacy/','/terms/','/changes/','/login/','/register/','/forgot-password/','/demo/','/signature/',...['','resume','links','themes','studio','publish','stats','wallet','billing','settings','support','notifications'].map(s=>'/dashboard/'+(s?s+'/':'')),...['','users','pages','traffic','transactions','payments','purchases','catalog','otp','audit','health'].map(s=>'/admin/'+(s?s+'/':'')),'/staff/'];
  for(const route of routes){
   const response=await page.goto(base+route);assert.equal(response.status(),200,route);if(route.startsWith('/dashboard/'))await page.waitForFunction(()=>document.querySelector('#view')?.children.length&&!document.querySelector('.ri-page-loading'));if(route.startsWith('/admin/'))await page.waitForFunction(()=>document.querySelector('#updated')?.textContent);if(route==='/staff/')await page.waitForFunction(()=>document.querySelector('#workspace')?.getAttribute('aria-busy')==='false');
   report.routes.push(route);
   const selectors=route.startsWith('/dashboard/')?['.dn-nav .dn-item:not([aria-current])','#view .nv-seg button:not([aria-selected=true]):not([aria-pressed=true])','.topbar .btn:not(:disabled)','#view .workspace-tabs button','#view .segmented button','#view .filter-chip']:route.startsWith('/admin/')?['.admin-nav a:not([aria-current])','.admin-topnav>a','#export']:route==='/staff/'?['.staff-side nav .menu a:not([aria-current])','.ticket-row','.staff-main .btn:not(:disabled)']:['.header nav a','.header .enter','.info-nav a','.template-filters .btn','.billing .btn','.auth .segmented button','.auth .eye','.auth .btn:not(:disabled)'];
   for(const selector of selectors){const item=page.locator(selector).first();if(!await item.count()||!await item.isVisible()||await item.isDisabled())continue;await page.mouse.move(0,0);await page.waitForTimeout(240);const before=await item.evaluate(styles);await item.hover();await page.waitForTimeout(550);await item.evaluate(e=>new Promise(r=>{const t=Date.now(),tick=()=>{const b=(getComputedStyle(e).backgroundColor.match(/[d.]+/g)||[]).map(Number);if(getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'&&(b.length<4||b[3]===1)||Date.now()-t>3000)r();else requestAnimationFrame(tick);};tick();}));const hover=await item.evaluate(styles),contrast=ratio(hover.fg,hover.bg),warmContrast=ratio(warm(hover.fg),warm(hover.bg));const record={route,selector,contrast,warmContrast,surfaceChange:ratio(before.bg,hover.bg)};report.states.push(record);if(contrast<4.5||warmContrast<4.5)report.failures.push(record);
    if(/nav|rail/.test(selector)&&!selector.includes('.header')&&record.surfaceChange<3)report.failures.push({...record,reason:'Hover must be distinct from the resting surface by 3:1.'});
    await item.focus();await page.waitForTimeout(100);const focus=await item.evaluate(styles);if(focus.outline==='none'||focus.outlineWidth<2)report.failures.push({...record,reason:'Missing keyboard focus outline.'});
   }
   if(['/dashboard/resume/','/dashboard/themes/','/staff/'].includes(route)){await page.evaluate(()=>document.activeElement?.blur());await page.locator(selectors[0]).first().hover();await page.waitForTimeout(550);await page.screenshot({path:path.join(out,route.replaceAll('/','-')+'neutral.png')});}
  }
  // Forced-colors and reduced-motion remain usable without depending on color animation.
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto(base+'/admin/users/');await page.waitForFunction(()=>document.querySelector('#updated')?.textContent);const nav=page.locator('.admin-nav a:not([aria-current])').first();await nav.focus();assert.notEqual((await nav.evaluate(styles)).outline,'none');await context.close();
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));assert.deepEqual(report.failures,[]);console.log('PASS: '+report.routes.length+' routes, '+report.states.length+' hover/focus states, neutral + warm approximation, forced colors and reduced motion.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
