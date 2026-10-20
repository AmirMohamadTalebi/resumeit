const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const safe=require('../src/auth/return-to.cjs');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
(async()=>{
 const cases=['https://evil.test/','//evil.test/','/\\evil.test/','/dashboard/../admin/','/dashboard/%2f/','/dashboard/themes/\n','/admin/','/dashboard/nope/'];
 for(const value of cases)assert.equal(safe(value),'/dashboard/');
 const good='/dashboard/themes/?tab=fonts&workspace=3#font';assert.equal(safe(good),good);
 for(const value of [...cases,good]){const box={window:{},URL,URLSearchParams,location:{origin:'https://resumeit.test',search:'?next='+encodeURIComponent(value)}};box.window.RIA={};box.RIA=box.window.RIA;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/auth-ui/js/config.js'),'utf8'),box);assert.equal(box.RIA.destination(),safe(value));}
 const db=testStore(),codes=new Map(),id=await db.provisionAccount('09120000617',await require('../src/auth/auth.cjs').hashPassword('OnlyTestPassword123!'));
 require('./workspace-test-store.cjs')(db,[id],{workspaces:true});
 const server=createServer(db,{send:async(phone,code)=>codes.set(phone,code)});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 for(const mode of ['password','otp']){
  await page.goto(base+'/dashboard/themes/?tab=fonts');await page.waitForURL('**/login/?next=*');
  assert.equal(await page.getByLabel('رمز عبور',{exact:true}).count(),1);
  if(mode==='otp')await page.locator('[data-mode=otp]').click();await page.locator('#mobile').fill('09120000617');
  if(mode==='password')await page.locator('#pass').fill('OnlyTestPassword123!');await page.locator('#sb').click();
  if(mode==='otp'){await page.locator('#otp-code').fill(codes.get('09120000617'));await page.locator('#vb').click();}
  await page.locator('#goDash').click();await page.waitForURL('**/dashboard/themes/?tab=fonts');
  await page.goto(base+'/login/?next='+encodeURIComponent('/dashboard/themes/?tab=fonts'));
  const link=page.getByRole('link',{name:'ادامه با حساب فعلی'});await link.waitFor();assert.equal(await link.getAttribute('href'),'/dashboard/themes/?tab=fonts');assert.equal(await page.locator('#mobile').count(),1);
  await page.screenshot({path:path.join(__dirname,'../artifacts/council-audit-2026-10-20/12-current-session-after.png')});
  await page.request.post(base+'/api/auth/logout',{headers:{Origin:base},data:{}});
 }
 console.log('PASS audit12: safe destination server/browser parity, password/OTP intended route, optional session continuation and clean password name.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
