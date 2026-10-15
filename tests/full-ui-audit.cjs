const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
  const phase=process.env.UI_AUDIT_PHASE||'after',out=path.resolve('artifacts/full-ui-audit/'+phase);await fs.mkdir(out,{recursive:true});
  const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true});
  db.billing=async()=>({plan:{id:'y',end:Date.now()+300*86400000},purchases:[],payments:[]});db.wallet=async()=>({balance:120,rate:2000,transactions:[]});
  for(const id of [owner,target]){const content=structuredClone(RI.seed('full'));content.profile.name='آوا مهر';content.profile.title='طراح محصول و توسعه‌دهندهٔ تجربه‌های دیجیتال';await db.mutateDashboard(id,0,doc=>{doc.content=content;});}
  for(let i=0;i<4;i++)await db.notify(owner,i%2?'support':'product','رویداد آزمایشی '+i,'این پیام فقط برای بررسی چیدمان رابط و طول متن استفاده می‌شود.','/changes/',randomUUID());
  await db.createTicket(owner,{subject:'راهنمای انتخاب قالب مناسب',body:'برای تنظیم اطلاعات رزومه و انتخاب قالب به راهنمایی نیاز دارم.',category:'editor',priority:'normal',requestId:randomUUID()});
  await db.saveAccountRole(owner,target,{role:'admin',reason:'ادمین آزمایشی بررسی رابط',requestId:randomUUID()});
  const server=createServer(db,{payments:{env:{SEP_ENABLED:'false',ZIBAL_ENABLED:'false'}},notifications:{provider:{available:{email:false,sms:false,push:false},publicKey:null}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const report={phase,engine:'installed Edge / Chromium',local:true,states:0,selects:0,menus:0,issues:[],errors:[],failed:[],coverage:[]};let browser;
  const record=(kind,meta,details)=>{if(!report.issues.some(i=>i.kind===kind&&JSON.stringify(i.meta)===JSON.stringify(meta)))report.issues.push({kind,meta,details});};
  try{
    browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
    const contexts={};for(const [name,token]of [['public',null],['owner','a'],['admin','b']]){const c=await browser.newContext({reducedMotion:'reduce'});if(token){await c.addCookies([{name:'ri_session',value:token.repeat(64),url:base}]);await c.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),token==='a'?owner:target);}contexts[name]=c;}
    const publicRoutes=['/','/about/','/contact/','/privacy/','/terms/','/changes/','/login/','/register/','/forgot-password/','/demo/','/signature/'];
    const dashRoutes=['/dashboard/','/dashboard/resume/','/dashboard/links/','/dashboard/themes/','/dashboard/studio/','/dashboard/publish/','/dashboard/stats/','/dashboard/wallet/','/dashboard/billing/','/dashboard/settings/','/dashboard/support/','/dashboard/notifications/'];
    const adminRoutes=['/admin/',...['users','pages','traffic','transactions','payments','purchases','catalog','otp','audit','health'].map(p=>'/admin/'+p+'/'),'/staff/'];
    const page=await contexts.public.newPage();let active=page;
    function track(p){p.on('pageerror',e=>report.errors.push({url:p.url(),message:e.message}));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)&&!r.url().includes('/brand/enamad'))report.failed.push({url:r.url().replace(base,''),status:r.status()});});}
    track(page);
    const shot=async(meta,suffix='')=>{const file=meta.route.replace(/[^a-z0-9]/gi,'-')+'-'+meta.width+'-'+(meta.state||'main').replace(/[^a-z0-9]/gi,'-')+suffix+'.png';await active.screenshot({path:path.join(out,file),fullPage:false});};
    async function inspect(meta){
      report.states++;report.coverage.push(meta);
      const result=await active.evaluate(()=>{
        const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[inert]');};
        const selector=e=>e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className||'').split(/\s+/).slice(0,3).join('.');
        const main=document.querySelector('#view,.admin-view,.staff-main main,main')||document.body,overlaps=[];
        for(const parent of [main,...main.querySelectorAll('*')]){
          if(parent.children.length<2||parent.children.length>30||!visible(parent)||parent.closest('.sig-art,.auth-piece,.pcard__sw,.stage[aria-hidden=true]'))continue;
          const display=getComputedStyle(parent).display;if(!['flex','inline-flex','grid','inline-grid'].includes(display))continue;
          const children=[...parent.children].filter(e=>visible(e)&&!['absolute','fixed','sticky'].includes(getComputedStyle(e).position)&&!e.matches('svg,.sr-only'));
          for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){const a=children[i].getBoundingClientRect(),b=children[j].getBoundingClientRect(),x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(x>3&&y>3&&!children[i].contains(children[j])&&!children[j].contains(children[i]))overlaps.push({parent:selector(parent),a:selector(children[i]),b:selector(children[j]),x:Math.round(x),y:Math.round(y)});}
        }
        const clipped=[...main.querySelectorAll('button,h1,h2,h3,label')].filter(e=>visible(e)&&e.clientWidth>20&&e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).textOverflow!=='ellipsis').slice(0,12).map(e=>({selector:selector(e),text:e.textContent.trim().slice(0,65),width:e.clientWidth,scroll:e.scrollWidth}));
        const images=[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth&&!/enamad/.test(e.src)).map(e=>e.src);
        return {width:innerWidth,scroll:document.documentElement.scrollWidth,overlaps:overlaps.slice(0,18),clipped,images};
      });
      if(result.scroll>meta.width+1)record('horizontal-overflow',meta,result);
      if(result.overlaps.length)record('sibling-overlap',meta,result.overlaps);
      if(result.clipped.length)record('clipped-control-text',meta,result.clipped);
      if(result.images.length)record('broken-image',meta,result.images);
      if(report.issues.some(i=>JSON.stringify(i.meta)===JSON.stringify(meta)))await shot(meta,'-issue');
    }
    async function selects(meta){
      const count=await active.locator('main select,#view select,.admin-view select').count();
      for(let i=0;i<Math.min(count,12);i++){
        const control=active.locator('main select,#view select,.admin-view select').nth(i);if(!await control.isVisible()||await control.isDisabled())continue;
        const custom=await control.evaluate(el=>getComputedStyle(el).appearance==='base-select');report.selects++;
        if(!custom)continue;
        await control.click();await active.waitForTimeout(60);
        const items=await control.locator('option').evaluateAll(options=>options.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim().slice(0,45),top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};}).filter(r=>r.height>0));
        const gaps=items.slice(1).map((r,j)=>r.top-items[j].bottom);if(gaps.some(g=>g<4))record('select-option-gap',{...meta,select:i},{gaps,items:items.slice(0,6)});
        if(items.some(r=>r.left<0||r.right>meta.width+1))record('select-option-overflow',{...meta,select:i},items.slice(0,6));
        if(i===0&&[390,1440].includes(meta.width))await shot({...meta,state:'select-'+i});
        await active.keyboard.press('Escape');
      }
    }
    for(const [group,routes]of [['public',publicRoutes],['owner',[...dashRoutes,...adminRoutes]]]){
      active=group==='public'?page:await contexts.owner.newPage();if(group!=='public')track(active);
      for(const width of [320,390,768,1024,1440,1920]){
        await active.setViewportSize({width,height:width<500?844:900});
        for(const route of routes){const meta={group,route,width,state:'main'};
          try{
            const response=await active.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});if(response.status()!==200){record('page-status',meta,response.status());continue;}
            if(route.startsWith('/dashboard/'))await active.waitForFunction(()=>document.querySelector('#view')?.children.length&&!document.querySelector('.ri-page-loading'),{timeout:15000});
            if(route.startsWith('/admin/'))await active.waitForFunction(()=>document.querySelector('#updated')?.textContent,{timeout:15000});
            if(route==='/staff/')await active.waitForFunction(()=>document.querySelector('#workspace')?.getAttribute('aria-busy')==='false',{timeout:15000});
            await active.evaluate(()=>document.fonts.ready);await inspect(meta);
            if([390,1440].includes(width)){
              await selects(meta);
              const tabs=await active.locator('#view [role=tab]').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().height>0).map(e=>({text:e.textContent,attrs:Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]))})));
              for(let i=0;i<Math.min(tabs.length,16);i++){const tab=active.locator('#view [role=tab]').filter({hasText:tabs[i].text}).first();if(!await tab.isVisible())continue;await tab.click();await active.waitForTimeout(70);await inspect({...meta,state:'tab-'+i});await selects({...meta,state:'tab-'+i});}
              if(route.startsWith('/dashboard/')){
                if(width<961){const more=active.locator('[data-all-pages]');if(await more.isVisible())await more.click();}
                const profile=active.locator('#accountBtn');if(await profile.isVisible()){await profile.click();await active.locator('[role=menu]').waitFor();const metrics=await active.locator('[role=menu] [role=menuitem]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));report.menus++;const gaps=metrics.slice(1).map((r,i)=>r.top-metrics[i].bottom);if(gaps.some(g=>g<4))record('menu-item-gap',meta,gaps);if(metrics.some(r=>r.left<0||r.right>width||r.top<0))record('menu-overflow',meta,metrics);await active.locator('[role=menuitem]').first().hover();await shot({...meta,state:'profile-menu'});await active.keyboard.press('Escape');}
              }
              if(route==='/admin/'){if(width<761)await active.locator('#admin-menu').click();await active.locator('.admin-profile summary').click();await active.waitForTimeout(100);await shot({...meta,state:'profile-menu'});await active.keyboard.press('Escape');}
            }
          }catch(e){record('interaction-error',meta,e.message);}
        }
        console.log('Audited '+group+' width '+width+'; states='+report.states+' issues='+report.issues.length);
      }
      if(group!=='public')await active.close();
    }
    const admin=await contexts.admin.newPage();track(admin);active=admin;for(const route of ['/admin/health/','/admin/audit/','/admin/users/?user='+owner]){await admin.goto(base+route);await admin.waitForFunction(()=>document.querySelector('#updated')?.textContent);await inspect({group:'admin',route,width:1280,state:'permissions'});assert.equal(await admin.locator('#admin-payment-gateways,#admin-notification-channels,#audit-purge-form,#account-role-form').count(),0);}
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,states:report.states,selects:report.selects,menus:report.menus,issues:report.issues.length,errors:report.errors.length,failed:report.failed.length,report:path.join(out,'report.json')}));
    if(phase==='after'){assert.deepEqual(report.issues,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.failed,[]);}
  }finally{await browser?.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
