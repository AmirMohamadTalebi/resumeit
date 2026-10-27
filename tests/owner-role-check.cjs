const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createServer}=require('../src/http/server.cjs'),{digest}=require('../src/auth/auth.cjs');
(async()=>{
  const {db,owner,target}=await require('./admin-fixture.cjs')(),support=await db.provisionAccount('09120000126',null),customer=await db.provisionAccount('09120000127',null),store=require('./workspace-test-store.cjs')(db,[owner,target,support,customer]);
  for(const [id,token]of [[support,'c'],[customer,'d']])await db.createSession(digest(token.repeat(64)),id,Date.now()+600000);
  store.sql.exec('CREATE TABLE payment_policy(id INTEGER PRIMARY KEY,sep_enabled INTEGER,zibal_enabled INTEGER);INSERT INTO payment_policy VALUES(1,1,1);');
  await store.execute("UPDATE users SET phone='09120000999' WHERE id=?",[owner]);await store.execute('DELETE FROM owner_accounts');
  await require('../src/database/ownership.cjs').bootstrapOwner(store.execute,null);assert.notEqual((await db.accountRole(owner)).role,'owner','without OWNER_PHONE no account is promoted');
  assert.equal(require('../src/admin/access.cjs').ownerPhone({OWNER_PHONE:'founder'}),null);
  await require('../src/database/ownership.cjs').bootstrapOwner(store.execute,require('../src/admin/access.cjs').ownerPhone({OWNER_PHONE:' 09120000999 '}));assert.equal((await db.accountRole(owner)).role,'owner');
  store.sql.exec("ALTER TABLE profiles ADD COLUMN first_name TEXT;ALTER TABLE profiles ADD COLUMN last_name TEXT;CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,expires_at INTEGER);CREATE TABLE social_identities(user_id TEXT,provider TEXT);");await store.execute('INSERT INTO profiles(user_id,name) VALUES(?,?)',[owner,'مالک آزمایشی']);await store.execute('INSERT INTO sessions VALUES(?,?,?)',['f'.repeat(64),owner,Date.now()+600000]);const actualSessions=require('../src/database/sessions.cjs')({execute:store.execute});assert.equal((await actualSessions.session('f'.repeat(64))).account_role,'owner');
  const admin=require('../src/database/admin.cjs')(store);db.savePaymentPolicy=admin.savePaymentPolicy;db.paymentPolicy=admin.paymentPolicy;
  const input=role=>({role,reason:'تعیین سطح دسترسی آزمایشی',requestId:randomUUID()});
  await db.saveAccountRole(owner,target,input('admin'));await db.saveAccountRole(owner,support,input('support'));
  await assert.rejects(admin.adminAction(target,owner,'revoke-sessions',{reason:'تلاش مدیر عادی برای خروج مالک',requestId:randomUUID()}),e=>e.status===403);
  const server=createServer(db,{notifications:{provider:{available:{email:false,sms:false,push:false}}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const request=async(path,who='a',body,headers={})=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Cookie:'ri_session='+who.repeat(64),...(body?{Origin:base,'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
  const purge={reason:'حذف سابقهٔ آزمایشی قدیمی',requestId:randomUUID(),before:Date.now()-1000,confirmation:'حذف لاگ‌ها'};
  try{
    for(const [who,role]of [['a','owner'],['b','admin'],['c','support'],['d','user']])assert.equal((await request('/api/auth/session',who)).body.user.account_role,role);
    assert.equal((await request('/api/admin/health','b')).status,200);assert.equal((await request('/api/dashboard/support?staff=1','c')).status,200);
    for(const who of ['b','c','d'])for(const [path,body]of [['/api/admin/payment-gateways',{sep:false,zibal:false}],['/api/admin/notification-channels',{email:false,sms:false,push:false}],['/api/admin/audit/purge',purge],['/api/admin/users/'+customer+'/role',input('owner')]])assert.equal((await request(path,who,body,{'X-Is-Owner':'true'})).status,403,path+who);
    for(const actor of [target,support,customer]){
      await assert.rejects(db.savePaymentPolicy(actor,{sep:false,zibal:false}),e=>e.status===403);
      await assert.rejects(db.saveNotificationPolicy(actor,{email:false,sms:false,push:false}),e=>e.status===403);
      await assert.rejects(db.purgeAdminAudit(actor,purge),e=>e.status===403);
      await assert.rejects(db.saveAccountRole(actor,customer,input('owner')),e=>e.status===403);
      for(const action of ['credit','delete-account'])await assert.rejects(admin.adminAction(actor,customer,action,{reason:'عملیات حساس آزمایشی',requestId:randomUUID(),toman:10000}),e=>e.status===403);
    }
    assert.equal((await request('/api/admin/payment-gateways','a',{sep:false,zibal:true},{Origin:'https://evil.example'})).status,403);
    assert.equal((await request('/api/admin/payment-gateways','a',{sep:false,zibal:true})).status,200);assert.deepEqual(await db.paymentPolicy(),{sep:false,zibal:true});
    assert.equal((await request('/api/admin/notification-channels','a',{email:false,sms:true,push:false})).status,200);assert.deepEqual(await db.notificationPolicy(),{email:false,sms:true,push:false});
    await assert.rejects(db.saveAccountRole(owner,owner,input('user')),e=>e.status===409);
    const roleRequest=input('owner');assert.equal((await request('/api/admin/users/'+customer+'/role','a',roleRequest)).status,200);assert((await db.saveAccountRole(owner,customer,roleRequest)).repeated);assert.equal((await db.accountRole(customer)).role,'owner');
    assert.equal((await request('/api/admin/notification-channels','d',{email:true,sms:true,push:true})).status,200);
    await db.saveAccountRole(customer,owner,input('user'));await require('../src/database/ownership.cjs').bootstrapOwner(store.execute);assert.equal((await db.accountRole(owner)).role,'user','restart must not re-promote a revoked founder');assert.equal((await actualSessions.session('f'.repeat(64))).account_role,'user');await db.saveAccountRole(customer,owner,input('owner'));
    await assert.rejects(db.saveAccountRole(owner,customer,{...roleRequest,role:'admin'}),e=>e.status===409);
    await db.saveAccountRole(owner,customer,input('user'));assert.equal((await request('/api/admin/notification-channels','d',{email:true,sms:true,push:true})).status,403);
    const guarded=require('../src/database/dashboard.cjs')(store);await assert.rejects(guarded.deleteAccount(owner),e=>e.status===409);
    await store.execute('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),owner,null,'test-old','قديم',JSON.stringify({}),randomUUID(),purge.before-1]);
    const receiptId=randomUUID();await store.execute('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',[receiptId,owner,null,'audit-purge','رسید قدیمی',JSON.stringify({}),randomUUID(),purge.before-2]);
    const deleted=await request('/api/admin/audit/purge','a',purge);assert.equal(deleted.status,200);assert.equal(deleted.body.deleted,1);assert((await request('/api/admin/audit/purge','a',purge)).body.repeated);
    assert.equal((await store.execute('SELECT COUNT(*) n FROM admin_audit WHERE id=?',[receiptId]))[0].n,1);assert.equal((await store.execute("SELECT COUNT(*) n FROM admin_audit WHERE action='audit-purge'"))[0].n,2);
    await assert.rejects(db.purgeAdminAudit(owner,{...purge,requestId:randomUUID(),confirmation:'wrong'}),e=>e.status===400);await assert.rejects(db.purgeAdminAudit(owner,{...purge,requestId:randomUUID(),before:Date.now()+60000}),e=>e.status===400);
    await db.saveAccountRole(owner,target,input('support'));assert.equal((await request('/api/admin/health','b')).status,403);assert.equal((await request('/api/dashboard/support?staff=1','b')).status,200);assert.equal((await store.execute('SELECT COUNT(*) n FROM admin_accounts WHERE user_id=?',[target]))[0].n,0);
    await db.saveAccountRole(owner,target,input('user'));assert.equal((await request('/api/dashboard/support?staff=1','b')).status,403);
    await store.execute('UPDATE users SET phone_verified=0 WHERE id=?',[target]);await assert.rejects(db.saveAccountRole(owner,target,input('admin')),e=>e.status===409);
    await store.execute('UPDATE users SET phone_verified=1 WHERE id=?',[target]);await store.execute('INSERT INTO admin_controls(user_id,suspended) VALUES(?,1)',[target]);await assert.rejects(db.saveAccountRole(owner,target,input('owner')),e=>e.status===409);
    await store.execute('INSERT INTO admin_controls(user_id,suspended) VALUES(?,1)',[owner]);await assert.rejects(db.savePaymentPolicy(owner,{sep:true,zibal:true}),e=>e.status===403);assert.equal(await actualSessions.session('f'.repeat(64)),undefined);
    console.log('PASS: four roles, owner-only sensitive HTTP and production SQL, no header escalation, CSRF, role changes/replay and immediate revocation, verified/active grants, self-demotion/deletion protection, bounded audit purge with retained receipts. SQLite and local HTTP only.');
  }finally{await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
