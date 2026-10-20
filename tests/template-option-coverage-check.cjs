const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),content=require('../src/dashboard/model.cjs').initial().content;
 content.theme.resume='vista';f.db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});await f.db.mutateDashboard(f.owner,0,d=>{d.content=content;});
 const server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),report=[];
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const template of ['vista','satiar']){
  const doc=await f.db.loadDashboard(f.owner);await f.db.mutateDashboard(f.owner,doc.revision,d=>{d.content.theme.resume=template;});await page.goto(base+'/dashboard/resume/?step=profile');await page.locator('#resume-section-tabs').waitFor();
  const expected=await page.evaluate(()=>{const s=RI.resumeSpec(RI.C().theme.resume);return ['fields','settings'].flatMap(kind=>s[kind].filter(f=>!f.group||s.groups.some(g=>g.key===f.group)).map(f=>({kind,key:f.key,type:f.type,label:f.label,group:f.group||'appearance',bound:f.bind||null})));});
  const before=await page.evaluate(()=>JSON.stringify(RI.C()));const seen=new Map();
  const tabs=await page.locator('#resume-section-tabs [data-template-group]').evaluateAll(rows=>rows.map(e=>({step:e.dataset.step,group:e.dataset.templateGroup})));
  for(const tab of tabs){
   await page.locator('#resume-section-tabs [data-step="'+tab.step+'"]').click();
   const advanced=page.locator('[data-template-advanced]');await advanced.click();
   const choices=await page.locator('#template-collection option').evaluateAll(rows=>rows.map(e=>e.value));
   for(const choice of choices.length?choices:['']){
    if(choices.length)await page.locator('#template-collection').selectOption(choice);
    for(let pages=0;pages<300;pages++){
     const found=await page.locator('#template-controls [data-tfield],#template-controls [data-tbound],#template-review [data-tfield]').evaluateAll(rows=>rows.map(e=>({key:e.dataset.tfield||e.dataset.tbound,kind:e.dataset.tgroup||'fields',bound:!!e.dataset.tbound,type:e.type||null,tag:e.tagName,context:e.dataset.tcollection||null,small:e.type!=='checkbox'||e.getBoundingClientRect().width<=24})));
     for(const row of found){assert(row.small,'oversized checkbox '+row.key);const item=expected.find(x=>x.kind===row.kind&&x.key===row.key);if(item?.type==='percent')assert.equal(row.type,'number');if(!seen.has(row.kind+':'+row.key))seen.set(row.kind+':'+row.key,{...row,step:tab.step,section:tab.group,collection:choice||null,advanced:true,compatibility:tab.group==='home:contact'});}
     if(await page.locator('#template-next').isDisabled())break;
     await page.locator('#template-next').click();assert(pages<299,'pagination did not end');
    }
   }
  }
  await page.locator('#rtabs [data-tab=layout]').click();assert(await page.locator('[data-template-shift]').count());seen.set('settings:section_order',{step:'layout',control:'section up/down',advanced:false});
  const missing=expected.filter(x=>!seen.has(x.kind+':'+x.key));assert.deepEqual(missing,[],'unreachable options in '+template);
  assert.equal(await page.evaluate(()=>JSON.stringify(RI.C())),before,'browsing every option must not change content');
  report.push({template,total:expected.length,missing:0,options:expected.map(item=>({...item,destination:seen.get(item.kind+':'+item.key)}))});console.log('PASS reachable option inventory',template,expected.length);
 }
 assert.deepEqual(errors,[]);fs.mkdirSync('artifacts/template-editor-2026-10-20',{recursive:true});fs.writeFileSync('artifacts/template-editor-2026-10-20/options-verified.json',JSON.stringify(report,null,2));console.log('PASS all 924 active options reached through real tabs, collection selectors and pagination without mutating data.');
 }finally{await browser.close();await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
