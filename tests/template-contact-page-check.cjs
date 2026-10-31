// Vista and Satiar: the resume leads to a separate contact page in the template's own look, which carries the
// message form, the ways to reach the person and the template header pointing back at the resume.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
(async()=>{
 const db=testStore(),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  for(const id of ['vista','satiar'])for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/resume'+id+'/',{waitUntil:'networkidle'});
   const invite=page.locator('.ri-cc__invite');assert(await invite.isVisible(),id+': invite card');assert.equal(await page.locator('#ri-contact [data-inbox-form]').count(),0,id+': the form is not on the resume');
   await page.goto(base+new URL(await invite.getAttribute('href'),base).pathname+'?page=contact',{waitUntil:'networkidle'});
   assert.equal(await page.locator('.ri-imported').getAttribute('data-template-page'),'contact');
   assert(await page.locator('[data-inbox-form]').isVisible(),id+': form on the contact page');
   assert.equal(await page.locator('h1').count(),1);assert(await page.locator('.ri-cp .ri-cc__item').first().isVisible());
   assert.equal(await page.locator('.ri-cp__back').getAttribute('href'),'/resume'+id+'/');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+width+': no sideways scroll');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS template contact pages: invite on the resume, separate contact page with form, ways, header back to the resume, phone width.');
 }finally{await browser.close();await new Promise(r=>server.close(r));db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
