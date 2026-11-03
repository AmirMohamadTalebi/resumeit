const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash,randomBytes}=require('node:crypto');
const {createServer}=require('../src/http/server.cjs');
const {testStore}=require('./auth-test-store.cjs');
const digest=v=>createHash('sha256').update(v).digest('hex');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
  const db=testStore(),codes=new Map();let calls=0,subject='123456',failToken=false;
  const server=createServer(db,{send:async(p,c)=>codes.set(p,c),oauthFetch:async(url,options)=>{
    calls++;assert.equal(options.redirect,'error');
    if(url.includes('/token')||url.includes('/access_token')) {
      const body=new URLSearchParams(options.body);assert.equal(body.get('code_verifier').length,43);assert.equal(body.get('code'),'provider-code');
      return Response.json(failToken?{error:'invalid_grant'}:{access_token:'test-token',token_type:'bearer'});
    }
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return Response.json(url.includes('github')?{id:Number(subject),login:'test-user'}:{sub:subject,name:'Test User'});
  }});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;
  for(const k of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET'])delete process.env[k];
  let browser;
  const get=(path,cookie)=>fetch(base+path,{redirect:'manual',headers:cookie?{Cookie:cookie}:{}});
  const post=(path,data,cookie)=>fetch(base+'/api/auth/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
  const start=async(provider,owner,next)=>{
    await db.clearLoginAttempts('oauth:'+digest('127.0.0.1'));
    const response=await get('/api/auth/'+provider+'/start'+(owner?'?mode=link':'?next='+encodeURIComponent(next||'/dashboard/')),owner);
    assert.equal(response.status,303);const url=new URL(response.headers.get('location'));
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('redirect_uri'),base+'/api/auth/'+provider+'/callback');
    const cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
    return {state:url.searchParams.get('state'),cookie:cookie+(owner?'; '+owner:''),provider};
  };
  const finish=flow=>get('/api/auth/'+flow.provider+'/callback?state='+flow.state+'&code=provider-code',flow.cookie);
  try {
    assert.deepEqual(await(await get('/api/auth/providers')).json(),{google:false,github:false,email:false});
    for(const k of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET'])process.env[k]='test-credential';
    assert.deepEqual(await(await get('/api/auth/providers')).json(),{google:true,github:true,email:false});
    assert.equal((await get('/api/auth/google/start?mode=link')).headers.get('location'),'/login/?social_error=expired');
    const google=await start('google',null,'/dashboard/themes/?tab=fonts');
    assert.equal((await get('/api/auth/google/callback?state='+google.state+'&code=provider-code')).headers.get('location'),'/login/?social_error=invalid');assert.equal(calls,0);
    const signed=await finish(google);assert.equal(signed.headers.get('location'),'/dashboard/themes/?tab=fonts');
    assert(signed.headers.getSetCookie().some(c=>c.startsWith('ri_return=;')&&c.includes('Max-Age=0')));
    const socialCookie=signed.headers.getSetCookie().find(c=>c.startsWith('ri_session=')).split(';')[0];
    const socialUser=(await(await get('/api/auth/session',socialCookie)).json()).user;assert.equal(socialUser.phone,null);assert(socialUser.google);
    assert.equal((await(await get('/api/auth/publication-check',socialCookie)).json()).canPublish,false);
    const previousCalls=calls;assert.equal((await finish(google)).headers.get('location'),'/login/?social_error=expired');assert.equal(calls,previousCalls);
    const fresh=await start('google');assert.match(fresh.cookie,/ri_return=%2Fdashboard%2F(?:;|$)/);
    const repeat=await finish(fresh);assert.equal(repeat.headers.get('location'),'/dashboard/');const repeatCookie=repeat.headers.getSetCookie().find(c=>c.startsWith('ri_session=')).split(';')[0];
    assert.equal((await(await get('/api/auth/session',repeatCookie)).json()).user.id,socialUser.id);
    assert.equal((await post('social/unlink',{provider:'google'},socialCookie)).status,409);
    const {hashPassword}=require('../src/auth/auth.cjs');await db.provisionAccount('09120000901',await hashPassword('Password123!'));
    const login=await post('login',{phone:'09120000901',password:'Password123!'},'');const phoneCookie=login.headers.get('set-cookie').split(';')[0];
    const phoneUser=(await(await get('/api/auth/session',phoneCookie)).json()).user;
    subject='345678';const githubLink=await start('github',phoneCookie);assert.equal((await finish(githubLink)).headers.get('location'),'/dashboard/settings/');
    assert((await(await get('/api/auth/session',phoneCookie)).json()).user.github);
    const githubLogin=await finish(await start('github'));const githubCookie=githubLogin.headers.getSetCookie().find(c=>c.startsWith('ri_session=')).split(';')[0];
    assert.equal((await(await get('/api/auth/session',githubCookie)).json()).user.id,phoneUser.id);
    assert.equal((await finish(await start('github',socialCookie))).headers.get('location'),'/login/?social_error=failed');
    assert.equal((await post('account/names',{firstName:'سارا',lastName:'محمدی'},socialCookie)).status,200);
    const priorSends=codes.size;assert.equal((await post('phone/request',{phone:'09120000901'},socialCookie)).status,200);assert.equal(codes.size,priorSends);
    const request=await post('phone/request',{phone:'09120000902'},socialCookie);const challenge=await request.json();
    assert.equal((await post('phone/verify',{challengeId:challenge.challengeId,code:codes.get('09120000902')},phoneCookie)).status,401);
    assert.equal((await post('phone/verify',{challengeId:challenge.challengeId,code:'000000'},socialCookie)).status,401);
    assert.equal((await post('phone/verify',{challengeId:challenge.challengeId,code:codes.get('09120000902')},socialCookie)).status,200);
    assert.equal((await post('phone/verify',{challengeId:challenge.challengeId,code:codes.get('09120000902')},socialCookie)).status,401);
    assert.equal((await(await get('/api/auth/publication-check',socialCookie)).json()).canPublish,true);
    assert.equal((await(await get('/api/auth/session',socialCookie)).json()).user.phone,'09120000902');
    const linkExpired=await start('google',phoneCookie);await post('logout',{},phoneCookie);assert.equal((await finish(linkExpired)).headers.get('location'),'/login/?social_error=expired');
    const expired=await start('google');await db.consumeOAuthState(digest(expired.state),'google',Date.now()+600001);assert.equal((await finish(expired)).headers.get('location'),'/login/?social_error=expired');
    failToken=true;assert.equal((await finish(await start('google'))).headers.get('location'),'/login/?social_error=failed');failToken=false;
    browser=await chromium.launch({channel: process.platform === 'win32' ? 'msedge' : undefined,headless:true});const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    fs.mkdirSync('artifacts/social-account',{recursive:true});
    await page.goto(base+'/login/');await page.locator('[data-social=google]').waitFor();assert.equal(await page.locator('[data-social=github]').getAttribute('href'),'/api/auth/github/start?next=%2Fdashboard%2F');
    await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'artifacts/social-account/login-mobile.png',fullPage:true});
    await page.goto(base+'/register/');await page.locator('[data-social=github]').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.context().addCookies([{name:'ri_session',value:socialCookie.split('=')[1],url:base}]);
    await page.goto(base+'/dashboard/settings/');await page.locator('#a_last').waitFor();assert.equal(await page.locator('#a_name').inputValue(),'سارا');assert.equal(await page.locator('#a_last').inputValue(),'محمدی');
    await page.setViewportSize({width:320,height:740});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/social-account/settings-mobile.png',fullPage:true});
    await page.locator('#a_last').fill('احمدی');await page.locator('[data-name]').tap();await page.waitForFunction(()=>RI.state.account.lastName==='احمدی');
    await page.reload();await page.locator('#a_last').waitFor();assert.equal(await page.locator('#a_last').inputValue(),'احمدی');
    await page.locator('[data-mobile]').tap();await page.locator('#account-phone').fill('09120000903');await page.locator('.modal__foot .btn--primary').tap();await page.locator('#account-code').waitFor();await page.locator('#account-code').tap();await page.locator('#account-code').fill(codes.get('09120000903'));await page.screenshot({path:'artifacts/social-account/phone-code-mobile.png',fullPage:true});await page.locator('.modal__foot .btn--primary').tap();await page.waitForFunction(()=>RI.state.account.mobile==='09120000903');
    await page.locator('.modal-overlay').waitFor({state:'detached'});await page.evaluate(()=>RI.go('resume',{step:'profile'}));await page.locator('#rs-sec-profile').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    // The verified phone is no longer a publication gap, so the studio does not ask for it again.
    assert.equal(await page.locator('[data-account-phone]').count(),0,'verified phone is not listed as missing');
    assert.deepEqual(errors,[]);
    console.log('PASS: OAuth PKCE/cookie state/single-use/repeat login/link ownership/expiry/provider failures, last-method protection, bound real phone proof/uniqueness/publication prerequisites and mobile persisted settings; providers/SMS mocked');
  } finally {await browser?.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
