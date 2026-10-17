const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),core=require('../dist/dashboard/js/advisor-core.js'),{RI}=require('../src/dashboard/render.cjs');
const source=(raw,extra={})=>({section:'projects',itemId:'p1',field:'desc',raw,visibility:'public',provenance:'user-authored',maxLength:280,...extra});
const run=(sources,context={})=>core.analyze({sources,context,analysisDate:'2026-10-17'});
(async()=>{
 let checks=0;
 for(const skill of ['SQL','Python','React','Excel','Figma'])for(const [sentence,expected]of [[`با ${skill} نمودار ساختم.`,'practical-supported'],[`با ${skill} کار نکرده‌ام.`,'negated'],[`قصد دارم ${skill} یاد بگیرم.`,'intended-learning'],[`در حال یادگیری ${skill} هستم.`,'intended-learning'],[`دوستم با ${skill} نمودار ساخت.`,'third-party']]){
   const result=await run([source(sentence)],{goal:skill});assert.equal(result.skills[skill.toLowerCase()].status,expected,sentence);assert(!result.findings.some(f=>f.ruleId==='CLAIM-CONTEXT'));checks++;
 }
 for(const visibility of ['hidden','public'])for(const provenance of ['unknown','template-example','user-authored','user-confirmed']){
  const result=await run([source('با SQL نمودار ساختم.',{visibility,provenance})]);assert.equal(result.skills.sql.status,visibility==='public'&&['user-authored','user-confirmed'].includes(provenance)?'practical-supported':'absent');checks++;
 }
 let result=await run([source('در تیم React مستندات API را نوشتم؛ مدیر تیم نبودم.')]);assert.notEqual(result.skills.react.status,'practical-supported');assert.equal(result.skills.documentation.status,'practical-supported');
 result=await run([source('Python بلد نیستم و قصد دارم یاد بگیرم.')],{goal:'Python'});assert(!result.findings.some(f=>f.ruleId==='CLAIM-CONTEXT'));
 result=await run([source('نه تنها با SQL داده‌ها را استخراج کردم، بلکه نمودار فروش هم ساختم.')]);assert.equal(result.skills.sql.status,'practical-supported');
 result=await run([source('با React کار نکردم و با SQL نمودار ساختم.')]);assert.equal(result.skills.react.status,'negated');assert.equal(result.skills.sql.status,'practical-supported');
 result=await run([source('رزومه من',{section:'profile',field:'title'})]);assert(result.findings.some(f=>f.ruleId==='HEADLINE-CLARITY'));
 result=await run([source('http://127.0.0.1/report',{field:'url'})]);assert(result.findings.some(f=>f.ruleId==='URL-SYNTAX'));
 const mention=source('SQL',{section:'skills',itemId:'s1',field:'name'}),practical=source('با SQL نمودار ساختم.');
 result=await run([mention],{goal:'SQL'});assert(result.findings.some(f=>f.ruleId==='CLAIM-CONTEXT'));const queryBefore=result.queryDigests.sql;
 result=await run([mention,practical],{goal:'SQL'});assert(!result.findings.some(f=>f.ruleId==='CLAIM-CONTEXT'));assert.notEqual(queryBefore,result.queryDigests.sql);
 const hidden=await run([mention,{...practical,visibility:'hidden'}],{goal:'SQL'});assert(hidden.findings.some(f=>f.ruleId==='CLAIM-CONTEXT'));assert.equal(hidden.queryDigests.sql,queryBefore);
 const repeated=await run([practical,practical,practical]);assert.equal(repeated.skills.sql.score,.8);
 const copied=await run([practical,{...practical,itemId:'copy1'},{...practical,itemId:'copy2'}]);assert.equal(copied.skills.sql.score,.8,'copied project does not become independent evidence');
 result=await run([source('در سال ۱۴۰۰ با SQL گزارش ساختم؛ اکنون از SQL استفاده نمی‌کنم.')]);assert(!result.findings.some(f=>f.ruleId==='FACT-CONFLICT'));
 for(const before of ['در محیط آزمایشی، با SQL گزارشی ساختم.','در دوره آزمایشی، فقط با داده کامل گزارش می‌ساختم.','با تیم کمک کردم؛ p95 از 900ms به 180ms رسید.']){assert.equal(core.safeRewrite(before,'گزارش ساختم.',280),false);checks++;}
 assert(core.safeRewrite('در محیط آزمایشی،  با SQL گزارشی ساختم.','در محیط آزمایشی، با SQL گزارشی ساختم.',280));assert(!core.safeRewrite('a','a',0));
 for(const value of ['۱۳۹۹','۱۴۰۲/۰۶','2024-02-29','2024/02','2000/12/31']){assert(core.dateRange(value));checks++;}
 for(const value of ['99','2024/13/01','2023/02/29','۱۴۰۲/۱۲/۳۰','yesterday','امسال']){assert.equal(core.dateRange(value),null);checks++;}
 result=await run([source('۱۴۰۳',{section:'experience',field:'from'}),source('۱۴۰۱',{section:'experience',field:'to'})]);assert(result.findings.some(f=>f.ruleId==='DATE-ORDER'));
 for(const confidence of ['high','medium','low'])assert.equal(core.priority({I:.9,G:1,A:.75,D:1,E:0,confidence}),{high:90.5,medium:60,low:30}[confidence]);
 const content=RI.seed('full'),projected=core.project(content);assert(projected.every(s=>!s.raw.startsWith('data:image')));assert(projected.every(s=>s.raw.length<=10000));
 const blank=RI.seed('empty');blank.profile.title='';blank.profile.bio='';
 for(const goal of ['تدریس','معلم','مدرس','برنامه نویس','برنامه‌نویس','developer']){const guidance=await run(core.project(blank),{goal});assert(guidance.findings.some(f=>f.basis==='goal'),goal);assert(guidance.findings.filter(f=>f.basis==='goal').every(f=>f.type==='question'&&f.evidence.length===0&&!f.before&&!f.after));}
 const taught=structuredClone(blank);taught.profile.title='معلم ریاضی پایه هفتم';taught.profile.bio='طرح درس و کاربرگ برای کلاس آماده کردم.';assert(!(await run(core.project(taught),{goal:'معلم'})).findings.some(f=>f.basis==='goal'));
 assert.equal(core.goalRole('همکار برنامه‌نویس من'), 'development');assert.equal(core.goalRole('مهاجرت'),null);
 const importedContent=structuredClone(content);importedContent.theme.resume='vista';
 const importedSources=core.project(importedContent,{sections:[],groups:[{key:'about'}],fields:[{key:'f69',group:'about',type:'textarea',default:'با SQL  کار کردم.',max:1000}],collections:[]});
 const description=importedSources.find(s=>s.section==='template');assert.equal(description.textRole,'description');
 assert(!(await run(importedSources)).findings.some(f=>f.target.field==='f69'),'unconfirmed template text stays excluded');
 description.provenance='user-confirmed';const importedFinding=(await run(importedSources)).findings.find(f=>f.target.field==='f69');assert(importedFinding);assert.equal(importedFinding.type,'question','template edits use the correct editor, not unsupported automatic rewriting');
 const repeatedSpec={sections:[],groups:[{key:'about'}],fields:[{key:'f69',group:'about',type:'textarea',default:'متن نمونه'}],collections:[{key:'r1',group:'about',node:{field:'f69'}}]};
 let repeatedSources=core.project(importedContent,repeatedSpec).filter(s=>s.section==='template');assert.deepEqual(repeatedSources.map(s=>s.itemId),['vista:r1:original']);
 importedContent.resumeTemplates.vista={fields:{},settings:{},collections:{r1:[{id:'row1',fields:{f69:'متن واقعی من'}}]}};repeatedSources=core.project(importedContent,repeatedSpec).filter(s=>s.section==='template');assert.equal(repeatedSources[0].itemId,'vista:r1:row1');assert.equal(repeatedSources[0].raw,'متن واقعی من');
 importedContent.resumeTemplates.vista.collections.r1=[];assert.equal(core.project(importedContent,repeatedSpec).filter(s=>s.section==='template').length,0,'removed original rows do not survive as phantom advisor sources');
 const privateResult=await core.analyze({sources:[source('شماره 09120000000')],privateContacts:['09120000000']});const leak=privateResult.findings.find(f=>f.ruleId==='PRIV-EXPOSE');assert(leak);assert.equal(leak.evidence.length,0);assert(!JSON.stringify(leak).includes('09120000000'));
 const big=Array.from({length:100},(_,i)=>source('با SQL نمودار ساختم. '.repeat(100),{itemId:'p'+i}));const started=performance.now();const partial=await run(big);assert.equal(partial.status,'partial');assert(partial.coverage.deferred>0);
 const elapsedMs=performance.now()-started;assert(elapsedMs<1500,`bounded analysis ${elapsedMs}ms`);
 assert.equal(await core.analyze({sources:big},()=>true),null);
 result=await run([source('ابزار تخصصی ناشناخته',{section:'skills',field:'name'})]);assert.equal(result.skills['ابزار تخصصی ناشناخته'].score,null);
 for(const skill of core.lexicon){assert(core.mentions(core.normalize('با '+skill.aliases[0]+' کار کردم'),skill));assert(!core.mentions('xyz'+skill.aliases[0]+'xyz',skill));checks+=2;}
 const span='یک نمودار فروش با SQL ساختم.';assert.equal(span.length,28);assert.deepEqual(await run(projected),await run(projected));
 const duplicated=await run([source('عنوان بدون نقطه با  فاصله '.repeat(15))]);assert.equal(new Set(duplicated.findings.map(f=>f.id)).size,duplicated.findings.length);
 console.log(JSON.stringify({status:'PASS',semanticCases:checks+20,largeInputMs:Math.round(elapsedMs),coverage:partial.coverage,features:'provenance, scope, negation, intent, team ownership, partial coverage, absence dependency, dates, privacy, rewrite guards, determinism'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
