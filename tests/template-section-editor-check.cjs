const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),content=require('../src/dashboard/model.cjs').initial().content;
 content.theme.resume='vista';content.projects=[{id:'auditproject',title:'پروژه آزمایش',desc:'نمونه برای بررسی ترتیب بخش‌ها',url:'https://example.test',image:''}];content.profile.name='آزمایش رابط';content.profile.title='طراح محصول';content.contacts[0].value='test@example.test';content.contacts[0].public=true;
 f.db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});await f.db.mutateDashboard(f.owner,0,d=>{d.content=content;});
 const server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),out=path.resolve('artifacts/template-editor-2026-10-20');fs.mkdirSync(out,{recursive:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const template of ['vista','satiar']){
  const saved=await f.db.loadDashboard(f.owner);await f.db.mutateDashboard(f.owner,saved.revision,d=>{d.content.theme.resume=template;});
  await page.goto(base+'/dashboard/resume/?step=profile');await page.locator('#resume-section-tabs').waitFor();await page.evaluate(()=>document.fonts.ready);
  const help=page.getByRole('button',{name:'راهنمای نام و نام خانوادگی',exact:true});await help.hover();await page.getByRole('tooltip').waitFor();assert.match(await page.getByRole('tooltip').innerText(),/نامی که/);await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').isVisible(),false);
  await help.focus();await page.getByRole('tooltip').waitFor();await help.click();await page.locator('.field-help-details').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#template-section').isVisible(),false);assert.equal(await page.locator('.template-categories').isVisible(),false);
  await page.screenshot({path:path.join(out,template+'-profile-desktop.png')});
  const groups=await page.evaluate(()=>RI.templateEditorGroups(RI.C()).map(g=>({key:g.key,label:g.label})));assert(groups.length>3);
  const group=groups.find(g=>/مهارت/.test(g.label));const step='template-'+group.key.replace(/:/g,'-');await page.locator('#resume-section-tabs [data-step="'+step+'"]').click();
  assert.notEqual(await page.locator('#resume-section-tabs [aria-selected=true]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(54, 95, 115)');
  assert.equal(await page.locator('#template-section').inputValue(),group.key);assert.equal(await page.locator('#panel').getAttribute('aria-labelledby'),'resume-step-'+step);
  await page.screenshot({path:path.join(out,template+'-section-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,template+'-section-mobile.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1440,height:1000});
  if(template==='satiar'){
   const target=await page.evaluate(()=>{const spec=RI.resumeSpec(RI.C().theme.resume);for(const def of spec.collections.filter(d=>d.group==='home:resume')){let key;const walk=n=>{if(!n||typeof n!=='object')return;if(n.progress)key=n.progress;n.children?.forEach(walk);};walk(def.node);if(key)return {collection:def.key,key};}});assert(target);
   await page.locator('#template-collection').selectOption(target.collection);
   const percent=page.locator('#template-controls [data-tfield="'+target.key+'"]');while(!await percent.count()&&!await page.locator('#template-next').isDisabled())await page.locator('#template-next').click();await percent.waitFor();assert.equal(await percent.getAttribute('type'),'number');
   const stored=()=>page.evaluate(({collection,key})=>RI.resumeValues(RI.C()).collections[collection]?.[0]?.fields[key],target);
   await percent.fill('0');assert.equal(await stored(),'0%');await percent.fill('100');assert.equal(await stored(),'100%');
   for(const invalid of ['-1','1.5','101']){await percent.fill(invalid);assert.equal(await percent.getAttribute('aria-invalid'),'true');assert.equal(await stored(),'100%');}
   await percent.fill('77');assert.equal(await stored(),'77%');await page.evaluate(()=>RI.save());await page.waitForFunction(()=>!RI.state.ui.dirty&&!RI.state.ui.saving);
   await page.reload();await page.locator('#template-collection').waitFor();await page.locator('#template-collection').selectOption(target.collection);while(!await percent.count()&&!await page.locator('#template-next').isDisabled())await page.locator('#template-next').click();assert.equal(await percent.inputValue(),'77');
  }
  await page.locator('#resume-section-tabs [data-step=template]').click();await page.locator('[data-tfield=reviewed]').waitFor();
  const boxes=await page.locator('.template-toggle input[type=checkbox]').evaluateAll(rows=>rows.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert(boxes.every(b=>b.w<=24&&b.h<=24));
  const upload=page.locator('#template-controls [data-tupload]').first();assert(await upload.count(),'image upload is exercised');{
   const key=await upload.getAttribute('data-tupload'),fileId=await upload.getAttribute('id');assert((await upload.getAttribute('aria-describedby')).includes(fileId.replace(/-file$/,'')+'-error'));
   await upload.setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});await page.locator('#'+fileId.replace(/-file$/,'')+'-error').waitFor({state:'visible'});assert.equal(await upload.getAttribute('aria-invalid'),'true');
   const avatar=await page.evaluate(()=>RI.C().profile.avatar);await upload.setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
   await page.waitForFunction(key=>[...Object.values(RI.resumeValues(RI.C()).fields),...Object.values(RI.resumeValues(RI.C()).settings)].some(value=>typeof value==='string'&&value.startsWith('data:image/')),key);
   const clear=page.locator('[data-timage-clear="'+fileId.replace(/-file$/,'')+'"]').first();
   await page.evaluate(()=>{window.originalReader=FileReader;window.pendingReaders=[];window.FileReader=class{readAsDataURL(file){const reader=new originalReader();reader.onload=()=>{this.result=reader.result;pendingReaders.push(()=>this.onload());};reader.readAsDataURL(file);}};});
   const pixel={name:'latest.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')};
   await upload.setInputFiles(pixel);await page.waitForFunction(()=>pendingReaders.length===1);await upload.setInputFiles({...pixel,name:'second.png'});await page.waitForFunction(()=>pendingReaders.length===2);
   await page.evaluate(()=>pendingReaders[1]());await clear.click();await page.evaluate(()=>{pendingReaders[0]();window.FileReader=originalReader;});await page.waitForTimeout(80);
   assert.equal(await page.evaluate(key=>RI.resumeValues(RI.C()).fields[key]??RI.resumeValues(RI.C()).settings[key],key),'','late earlier upload cannot restore a cleared image');assert.equal(await page.evaluate(()=>RI.C().profile.avatar),avatar);
  }
  await page.locator('#template-search').fill('مقصد');const address=page.locator('#template-controls input[data-ttype=link]').first();assert(await address.count(),'link mode is exercised');{
   const field=await address.getAttribute('data-tfield'),kind=await address.getAttribute('data-tgroup')||'fields',id=await address.getAttribute('id'),select=page.locator('#'+id+'-target');
   await select.selectOption('');await address.fill('https://example.test/work');assert.equal(await page.evaluate(({field,kind})=>RI.resumeValues(RI.C())[kind][field],{field,kind}),'https://example.test/work');
   await select.selectOption('#ri-contact');assert.equal(await page.evaluate(({field,kind})=>RI.resumeValues(RI.C())[kind][field],{field,kind}),'#ri-contact');assert.equal(await address.isVisible(),false);await select.selectOption('');assert.equal(await address.inputValue(),'#ri-contact');assert.equal(await address.isVisible(),true);
  }await page.locator('#template-search').fill('');
  await page.screenshot({path:path.join(out,template+'-general-desktop.png')});
  await page.locator('[data-template-advanced]').click();assert.equal(await page.locator('[data-template-advanced]').getAttribute('aria-expanded'),'true');
  await page.locator('#rtabs [data-tab=layout]').click();const move=page.locator('[data-template-shift][data-direction="1"]').first();const key=await move.getAttribute('data-template-shift');await move.click();
  const reordered=await page.evaluate(()=>RI.templateEditorGroups(RI.C()).map(g=>g.key));assert.notEqual(reordered[0],key);
  await page.waitForFunction(expected=>{const doc=document.querySelector('.device__vp iframe')?.contentDocument;if(!doc)return false;const source=RI.IMPORTED_TEMPLATES[RI.C().theme.resume],portfolio=source.groups.find(g=>/portfolio|نمونه کار|نمونه‌کار/i.test(g.key+' '+g.label))?.key;const actual=[...doc.querySelectorAll('[data-ri-section],#ri-projects')].map(e=>e.id==='ri-projects'?portfolio:e.dataset.riSection).filter(k=>expected.includes(k));return JSON.stringify([...new Set(actual)])===JSON.stringify(expected);},reordered);

  await page.locator('#rtabs [data-tab=content]').click();assert.equal(await page.locator('#resume-section-tabs [aria-selected=true]').count(),1);
 }
 assert.deepEqual(errors,[]);console.log('PASS template editor section navigation, shared visual order, compact controls, hover/focus/click help and responsive UI for Vista/Satiar.');
 }finally{await browser.close();await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
