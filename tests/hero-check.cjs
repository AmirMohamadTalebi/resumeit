const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel: process.platform === 'win32' ? 'msedge' : undefined,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:4191');
  assert.equal(response.status(),200);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.sig-tile').count(),8);assert.equal(await page.locator('h1').count(),1);
  fs.mkdirSync('artifacts/hero',{recursive:true});await page.screenshot({path:'artifacts/hero/start.png'});
  const before=await page.locator('[data-piece="person"]').getAttribute('style');
  await page.evaluate(()=>{const h=document.querySelector('.sig-hero');scrollTo({top:h.offsetTop+parseFloat(getComputedStyle(h).getPropertyValue('--sig-distance'))*.85,behavior:'instant'})});
  await page.waitForTimeout(200);assert.notEqual(await page.locator('[data-piece="person"]').getAttribute('style'),before);
  await page.screenshot({path:'artifacts/hero/scrolled.png'});assert.deepEqual(errors,[]);
  console.log('PASS: site loads, eight cards, one H1, scroll moves the hero, no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
