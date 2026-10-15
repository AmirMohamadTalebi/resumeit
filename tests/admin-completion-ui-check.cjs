const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
  const f=await require('./admin-fixture.cjs')(),server=createServer(f.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),errors=[];
  fs.mkdirSync('artifacts/admin-completion',{recursive:true});
  try{
    const context=await browser.newContext();await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:950});await page.goto(base+'/admin/users/?user='+f.target);await page.locator('[data-action="edit-profile"]').waitFor();
      await page.locator('[data-action="edit-profile"]').click();await page.locator('#edit-first').fill('نگار');await page.locator('#edit-last').fill('مهر');await page.locator('#reason').fill('اصلاح مشخصات به درخواست مالک');
      await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'artifacts/admin-completion/edit-'+width+'.png'});
      assert(await page.locator('#profile-fields').isVisible());assert(!(await page.locator('#delete-field').isVisible()));await page.locator('#action-submit').click();await page.waitForFunction(()=>!document.querySelector('#action-dialog').open);
      assert.equal(f.actions.at(-1).profile.first_name,'نگار');
      await page.locator('[data-action="delete-account"]').click();assert(await page.locator('#delete-field').isVisible());assert(!(await page.locator('#profile-fields').isVisible()));await page.locator('#action-cancel').click();
      await page.goto(base+'/admin/health/');const form=page.locator('#admin-payment-gateways');await form.waitFor();await form.locator('[name=sep]').uncheck();await form.locator('[type=submit]').click();await form.locator('[role=status]').filter({hasText:'ذخیره شد'}).waitFor();assert.equal((await f.db.paymentPolicy()).sep,false);
      await page.screenshot({path:'artifacts/admin-completion/gateways-'+width+'.png',fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    assert.deepEqual(errors,[]);console.log('PASS: admin edit/delete forms and persistent gateway controls at desktop/mobile widths, no JS errors; synthetic accounts only.');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
