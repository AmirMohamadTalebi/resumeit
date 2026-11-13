const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
  const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target]);
  for(const sql of ['ALTER TABLE users ADD COLUMN created_at INTEGER','ALTER TABLE profiles ADD COLUMN first_name TEXT','ALTER TABLE profiles ADD COLUMN last_name TEXT','CREATE TABLE IF NOT EXISTS wallets(user_id TEXT PRIMARY KEY,balance_units INTEGER)','CREATE TABLE IF NOT EXISTS dashboard_documents(user_id TEXT PRIMARY KEY,draft TEXT,published TEXT)','CREATE TABLE IF NOT EXISTS dashboard_workspaces(user_id TEXT,slot INTEGER,draft TEXT,published TEXT)','CREATE TABLE IF NOT EXISTS account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref))'])try{store.sql.exec(sql);}catch{}
  const wallet=require('../src/database/wallet.cjs')(store);for(const key of ['wallet','billing'])db[key]=wallet[key];
  await db.markPhoneVerified(target);await db.setAccountNames(target,'نگار','مهر');await store.execute("UPDATE profiles SET name='نگار مهر' WHERE user_id=?",[target]);
  const paid=await db.createTicket(target,{subject:'شارژ کیف پول انجام نشد',body:'مبلغ از کارت کم شد ولی موجودی کیف پول تغییری نکرد.',category:'payment',priority:'high',requestId:randomUUID()});
  await db.createTicket(target,{subject:'تخفیف اشتراک سالانه',body:'برای اشتراک سالانه تخفیف دانشجویی دارید؟',category:'sales',priority:'normal',requestId:randomUUID()});
  await store.execute("INSERT INTO payment_orders(id,user_id,provider,amount_toman,status,rrn,trace,created_at,updated_at) VALUES(?,?,'zibal',50000,'pending','884213','551902',?,?)",[randomUUID(),target,Date.now()-3600000,Date.now()-3600000]);
  const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const out=path.resolve('artifacts/support-desk');await fs.mkdir(out,{recursive:true});const errors=[];let browser;
  try{
    browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:950}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(base+'/staff/');await page.locator('.ticket-row').first().waitFor();
    assert.equal(await page.locator('#departments [data-dept]').count(),6,'all departments plus «all»');
    assert.match(await page.locator('#departments [data-dept=finance]').innerText(),/مالی\s*۱/);
    await page.locator('#departments [data-dept=sales]').click();await page.waitForFunction(()=>document.querySelectorAll('.ticket-row').length===1);
    assert.match(await page.locator('.ticket-row').innerText(),/تخفیف اشتراک/);
    await page.locator('#departments [data-dept=""]').click();await page.waitForFunction(()=>document.querySelectorAll('.ticket-row').length===2);

    // Transfer the sales question to finance, with a note the customer never sees.
    await page.locator('.ticket-row',{hasText:'تخفیف اشتراک'}).click();await page.locator('[data-transfer]').waitFor();
    await page.locator('[data-transfer]').click();await page.locator('dialog select[name=department]').selectOption('finance');await page.locator('dialog textarea[name=note]').fill('پرداخت اقساطی؛ با مالی هماهنگ شود');await page.locator('dialog [type=submit]').click();
    await page.locator('.message.internal',{hasText:'بخش مالی'}).waitFor();assert.match(await page.locator('.thread-title').innerText(),/بخش مالی/);

    // Internal note through the composer toggle.
    await page.locator('[data-mode=note]').click();await page.locator('.composer.is-note').waitFor();await page.locator('#reply-body').fill('کاربر دانشجو است؛ کد تخفیف ۲۰٪ پیشنهاد شود.');await page.locator('#reply [type=submit]').click();
    await page.locator('.message.internal',{hasText:'کد تخفیف'}).waitFor();await page.locator('[data-mode=reply]').click();

    // Escalate the payment ticket, then follow up as admin.
    await page.locator('.ticket-row',{hasText:'شارژ کیف پول'}).click();await page.locator('[data-escalate]').waitFor();
    await page.locator('[data-escalate]').click();await page.locator('dialog textarea[name=note]').fill('تراکنش در پنل زیبال بررسی شود');await page.locator('dialog [type=submit]').click();
    await page.locator('.escalation').waitFor();await page.locator('#departments [data-escalated]').click();await page.waitForFunction(()=>document.querySelectorAll('.ticket-row').length===1);
    await page.screenshot({path:path.join(out,'desk-escalated-desktop.png')});

    // Customer file: tabs, payments, and a wallet credit linked to the ticket.
    await page.locator('[data-profile]').click();await page.locator('.customer-file .cf-tabs').waitFor();
    assert.match(await page.locator('.cf-panel').innerText(),/09120000123/);
    await page.locator('[data-cf-tab=payments]').click();await page.locator('.cf-panel',{hasText:'884213'}).waitFor();
    await page.locator('[data-cf-tab=wallet]').click();await page.locator('[data-credit]').waitFor();
    await page.locator('[data-credit] [name=amount]').fill('25');await page.locator('[data-credit] [name=reason]').fill('جبران پرداخت زیبال ۸۸۴۲۱۳');
    await page.screenshot({path:path.join(out,'customer-wallet-desktop.png')});
    await page.locator('[data-credit] [type=submit]').click();await page.locator('.cf-balance strong',{hasText:'۲۵'}).waitFor();
    assert.equal((await db.wallet(target)).balance,25);
    // Refund from the ticket: the customer buys a template with that credit, staff returns it to the wallet.
    await wallet.purchaseWithWallet(target,'rt:terminal',randomUUID().replace(/-/g,''));assert.equal((await db.wallet(target)).balance,0);
    await page.locator('[data-cf-tab=account]').click();await page.locator('[data-cf-tab=wallet]').click();await page.locator('[data-refund] select[name=ref]').waitFor();
    assert.match(await page.locator('[data-refund]').innerText(),/۷۲ ساعت/);await page.locator('[data-refund] select[name=ref]').selectOption('rt:terminal');await page.locator('[data-refund] [name=reason]').fill('قالب را اشتباهی خرید و استفاده نکرد');
    await page.screenshot({path:path.join(out,'customer-refund-desktop.png')});
    await page.locator('[data-refund] [type=submit]').click();await page.locator('.cf-balance strong',{hasText:'۲۵'}).waitFor();
    assert.equal((await db.wallet(target)).balance,25);assert(!(await db.billing(target)).purchases.some(p=>p.ref==='rt:terminal'),'access removed');
    const customerPost=await fetch(base+'/api/dashboard/support/refund',{method:'POST',headers:{'content-type':'application/json',origin:base,cookie:'ri_session='+'b'.repeat(64)},body:JSON.stringify({userId:target,ticketId:paid.id,ref:'rt:terminal',reason:'دوباره پس بده',requestId:randomUUID()})});
    assert.notEqual(customerPost.status,200,'no refund path for anyone without a staff session');
    await page.keyboard.press('Escape');await page.locator('.message.internal',{hasText:'شارژ کیف پول'}).waitFor();
    await page.locator('[data-escalation-done]').click();await page.locator('dialog [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.escalation'));

    // The customer sees the department but none of the internal notes.
    const customer=await db.ticket(target,paid.id);assert(!customer.messages.some(m=>m.internal));assert.equal(customer.department,'finance');

    await page.setViewportSize({width:390,height:844});await page.locator('[data-profile]').click();await page.locator('.customer-file .cf-tabs').waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow on phones');
    await page.screenshot({path:path.join(out,'customer-file-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS support desk UI: department tabs and counts, transfer with hidden note, internal notes, admin escalation and follow-up, customer file with payments and audited wallet credit, phone layout.');
  }finally{await browser?.close();server.close();store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
