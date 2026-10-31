// Vista's «اعداد و ارقام» and «work together» blocks, restored from the original page: the numbers come from the
// resume (projects, years since the first job, skills), they sit before and after the social section, each can be
// switched off, too little data hides the stats, and the call to action leads to the contact page and projects.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{RI,render}=require('../src/dashboard/render.cjs'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
(async()=>{
 const seed=()=>{const c=JSON.parse(JSON.stringify(RI.seed('full')));c.theme.resume='vista';return c;};
 let c=seed();c.experience=[{id:'x1',role:'توسعه‌دهنده',company:'نمونه',from:'۱۳۹۸',to:'۱۴۰۱'},{id:'x2',role:'ارشد',company:'نمونه',from:'2022',current:true}];
 let html=render(c,'resume',{},'','home');
 const stats=html.indexOf('ri-vista-stats'),social=html.indexOf('elementor-element-67d220d'),cta=html.indexOf('ri-vista-cta'),contact=html.indexOf('id="ri-contact"');
 assert(stats>0&&stats<social&&social<cta&&cta<contact,'stats before social, call to action after it, contact last');
 const counts=[...html.matchAll(/data-count="(\d+)"/g)].map(m=>+m[1]);assert.equal(counts.length,3);
 assert.equal(counts[0],c.projects.length,'projects first');assert.equal(counts[1],new Date().getFullYear()-2019,'years from the first job (Jalali 1398 = 2019) to now');assert.equal(counts[2],c.skills.length);
 assert(!/رضایت مشتریان|۱۰۰٪/.test(html),'no sample claims');assert(html.includes('?page=contact')&&html.includes('href="#ri-projects"'));
 // Too little data: no stats block; switched off: neither block.
 c=seed();c.projects=[];c.experience=[];c.education=[];c.certs=[];c.languages=[];html=render(c,'resume',{},'','home');assert(!html.includes('ri-vista-stats'),'one number is not a stats section');assert(html.includes('ri-vista-cta'));
 c=seed();c.resumeTemplates={vista:{fields:{},settings:{show_vista_stats:false,show_vista_cta:false}}};html=render(c,'resume',{},'','home');assert(!html.includes('ri-vista-stats')&&!html.includes('ri-vista-cta'));
 assert(RI.importedSpec('vista').settings.some(s=>s.key==='show_vista_stats')&&RI.importedSpec('vista').settings.some(s=>s.key==='show_vista_cta'));
 assert(!RI.importedSpec('satiar').settings.some(s=>s.key==='show_vista_stats'));
 console.log('PASS Vista sections: stats from the resume between education and social, call to action after social, no sample claims, hide rules and settings.');
 // In the browser: the numbers count up to their final value; reduced motion shows it at once.
 const db=testStore(),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  for(const reducedMotion of ['no-preference','reduce'])for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/resumevista/',{waitUntil:'networkidle'});const first=page.locator('.ri-vista-stats .bento-count').first(),end=await first.getAttribute('data-count');
   if(reducedMotion==='reduce')assert.equal(await first.innerText(),RI.fa(+end));
   await page.locator('.ri-vista-stats').scrollIntoViewIfNeeded();await page.waitForFunction(e=>document.querySelector('.ri-vista-stats .bento-count').textContent===Number(e).toLocaleString('fa-IR',{useGrouping:false}),end,{timeout:5000});
   assert(await page.locator('.ri-vista-cta .vista-section-title').nth(1).isVisible(),'the call to action shows its headline');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll at '+width);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS Vista sections in the browser: count-up to the real value, reduced motion, headline visible, desktop and phone.');
 }finally{await browser.close();await new Promise(r=>server.close(r));db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
