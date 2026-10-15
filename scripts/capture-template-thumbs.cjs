const fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('../tests/auth-test-store.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 const db=testStore(),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});fs.mkdirSync('dist/brand/template-thumbs',{recursive:true});
 try{const page=await browser.newPage({viewport:{width:1200,height:857},deviceScaleFactor:.4,reducedMotion:'reduce'});for(const [kind,list]of [['resume',RI.RESUME_TEMPLATES],['links',RI.LINK_TEMPLATES]])for(const template of list){
  const response=await page.goto(base+'/'+(kind==='resume'?'resume':'link')+template.id+'/',{waitUntil:'networkidle'});if(response.status()!==200)throw Error('Missing sample '+template.id);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'dist/brand/template-thumbs/'+kind+'-'+template.id+'.jpg',type:'jpeg',quality:78});
 }console.log('Captured static image thumbnails for all resume and link templates.');}finally{await browser.close();await new Promise(r=>server.close(r));db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
