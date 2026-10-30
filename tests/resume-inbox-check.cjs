const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
  process.env.RESUMEIT_QUIET_ERRORS='1';
  const f=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(f.db,[f.owner,f.target],{workspaces:true});
  const c=structuredClone(RI.seed('full'));c.slug='inboxowner';
  await f.db.mutateDashboard(f.owner,0,d=>{d.content=c;d.slug='inboxowner';d.published={resume:structuredClone(c)};d.pub.resume={status:'published',version:1,at:Date.now(),snap:null};});
  const server=createServer(f.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const send=(body,headers={})=>fetch(base+'/u/inboxowner/message',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Forwarded-For':headers.ip||'',...headers},body:JSON.stringify(body)}).then(async r=>({status:r.status,body:await r.json()}));
  const good={name:'سارا رحیمی',contact:'۰۹۱۲۳۴۵۶۷۸۹',message:'سلام، برای یک همکاری طراحی با شما تماس می‌گیرم.',resumeUrl:'https://sara.resumeit.ir/',elapsed:5000};
  const owner=(path,body)=>fetch(base+'/api/dashboard/'+path,{method:body?'POST':'GET',headers:{Cookie:'ri_session='+'a'.repeat(64),...(body?{'Content-Type':'application/json',Origin:base}:{})},body:body?JSON.stringify(body):undefined}).then(async r=>({status:r.status,body:await r.json()}));
  let browser;
  try{
    // Public page: the form is there, served with its script and the main-site origin filled in.
    const page=await (await fetch(base+'/u/inboxowner/')).text();
    assert(page.includes('data-inbox-form')&&page.includes('/public-assets/inbox.js'),'form and script on the public page');
    assert(!page.includes('__RI_MAIN__')&&page.includes('data-main="'+base+'"'),'main-site origin for the attach window');
    assert.equal((await fetch(base+'/public-assets/inbox.js')).status,200);

    // Valid message; the phone number is normalised from Persian digits.
    assert.deepEqual((await send(good)).body,{ok:true});
    // Spam and abuse checks.
    assert.equal((await send({...good,website:'http://spam'})).status,400,'hidden field filled');
    assert.equal((await send({...good,elapsed:300})).status,400,'submitted instantly');
    assert.equal((await send({...good,contact:'not a contact'})).status,400);
    assert.equal((await send({...good,message:'کوتاه'})).status,400);
    assert.equal((await send({...good,resumeUrl:'javascript:alert(1)'})).status,400);
    assert.equal((await fetch(base+'/u/inboxowner/message',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify(good)})).status,403,'other origins are refused');
    assert.equal((await fetch(base+'/u/nobody-here/message',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(good)})).status,404);
    for(let i=0;i<4;i++)assert.equal((await send({...good,contact:'s'+i+'@mail.com'})).status,200);
    assert.equal((await send(good)).status,429,'five messages an hour per network');

    // Owner sees, triages and deletes; another account sees nothing.
    const list=await owner('messages');assert.equal(list.status,200);assert.equal(list.body.total,5);assert.equal(list.body.summary.new,5);
    const first=list.body.rows.at(-1);assert.equal(first.contact,'09123456789');assert.equal(first.contactType,'phone');assert.equal(first.resumeUrl,'https://sara.resumeit.ir/');
    assert.equal((await owner('messages/status',{id:first.id,status:'done'})).status,200);
    assert.equal((await owner('messages?status=done')).body.total,1);
    assert.equal((await owner('messages?q='+encodeURIComponent('همکاری'))).body.total,5);
    const other=await fetch(base+'/api/dashboard/messages',{headers:{Cookie:'ri_session='+'b'.repeat(64)}}).then(r=>r.json());assert.equal(other.total,0);
    assert.equal((await fetch(base+'/api/dashboard/messages/delete',{method:'POST',headers:{Cookie:'ri_session='+'b'.repeat(64),'Content-Type':'application/json',Origin:base},body:JSON.stringify({id:first.id})})).status,404,'only the owner can delete');
    assert.equal((await owner('messages/delete',{id:first.id})).status,200);assert.equal((await owner('messages')).body.total,4);

    // The attach window reads the signed-in person's own published address.
    const mine=await owner('my-resume');assert.equal(mine.body.url,base+'/u/inboxowner/');
    // Turning the form off (and republishing) stops new messages.
    const saved=await f.db.loadDashboard(f.owner);await f.db.mutateDashboard(f.owner,saved.revision,d=>{d.content.inbox={enabled:false};d.published.resume=structuredClone(d.content);});
    assert.equal((await send({...good,contact:'off@mail.com'},{ip:'10.9.9.9'})).status,403);
    assert(!(await (await fetch(base+'/u/inboxowner/')).text()).includes('data-inbox-form'),'no form when switched off');

    // Dashboard page lists the messages with contact actions.
    browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
    const ctx=await browser.newContext({viewport:{width:1366,height:900}});await ctx.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await ctx.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);
    const tab=await ctx.newPage(),errors=[];tab.on('pageerror',e=>errors.push(e.message));
    await tab.goto(base+'/dashboard/messages/');await tab.locator('.msg-card').first().waitFor();
    assert.equal(await tab.locator('.msg-card').count(),4);assert(await tab.locator('.msg-card a[href^="mailto:"]').count()>0);
    await tab.locator('.msg-card [data-mstatus="done"]').first().click();await tab.locator('[data-mfilter="done"] b').filter({hasText:'۱'}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: public message form, normalised contact, honeypot/timing/origin/rate limits, owner-only list/status/search/delete, attach address, switch-off and dashboard inbox page.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
