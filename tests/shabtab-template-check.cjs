// «شب‌تاب»: every visible section renders with escaped content, the sample page moves when motion is allowed and is
// completely still under reduced motion, and it fits phone widths without sideways scroll.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const c=JSON.parse(JSON.stringify(RI.seed('full')));c.theme.resume='shabtab';c.profile.name='<b>نام</b>';
 const html=RI.resumeHtml(c,{publicBase:'/u/sample'});
 for(const id of ['st-skills','st-experience','st-education','st-projects','st-contact'])assert(html.includes('id="'+id+'"'),id);
 assert(!html.includes('<b>نام</b>')&&html.includes('&lt;b&gt;'),'user text is escaped');
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 c.sections.find(s=>s.key==='skills').visible=false;assert(!RI.resumeHtml(c,{publicBase:''}).includes('id="st-skills"'),'hidden sections stay hidden');
 const db=testStore(),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/resumeshabtab/',{waitUntil:'networkidle'});
   assert(await page.evaluate(()=>document.getAnimations().length>10),'the template moves');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll at '+width);
   assert.deepEqual(errors,[]);await page.close();
  }
  const calm=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});await calm.goto(base+'/resumeshabtab/',{waitUntil:'networkidle'});
  assert.equal(await calm.evaluate(()=>document.getAnimations().length),0,'reduced motion is still');
  assert.equal(await calm.locator('.st-name').evaluate(e=>getComputedStyle(e).clipPath),'none','the name is fully shown without motion');
  console.log('PASS shabtab: sections, escaping, visibility, motion, reduced motion and phone widths.');
 }finally{await browser.close();await new Promise(r=>server.close(r));db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
