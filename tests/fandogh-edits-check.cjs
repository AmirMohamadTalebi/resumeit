// Fandogh's resume edits: the model's list is checked against the real resume (fields, ids, lengths, https links,
// no duplicates), labelled with before/after, applied in place and undone exactly; older tags still become edits.
const assert=require('node:assert/strict'),E=require('../dist/dashboard/js/assistant-edits.js'),llm=require('../src/ai/assistant-llm.cjs');
const c={profile:{name:'امیر',title:'دانشجوری کامپیوتر',bio:'',location:'',avatar:''},skills:[{id:'s1',name:'HTML',level:3}],
 experience:[{id:'x1',role:'کارآموز',org:'استودیو',from:'1402',to:'',current:true,desc:''}],education:[],projects:[{id:'p1',title:'ResumeIt',desc:'',url:'',image:null}],certs:[],languages:[]};
const raw=[{op:'set',field:'title',value:'دانشجوی مهندسی کامپیوتر'},{op:'set',field:'email',value:'x'},{op:'add_skill',name:'CSS',level:4},{op:'add_skill',name:'html'},
 {op:'skill_level',id:'s1',level:5},{op:'edit',section:'experience',id:'x1',field:'desc',value:'پیاده‌سازی صفحه‌ها'},{op:'edit',section:'experience',id:'nope',field:'desc',value:'x'},
 {op:'edit',section:'projects',id:'p1',field:'url',value:'javascript:alert(1)'},{op:'add',section:'languages',fields:{name:'انگلیسی',level:4}},{op:'replace',wrong:'دانشجوری',right:'دانشجوی'},{op:'remove',section:'projects',id:'p1'}];
const edits=E.normalize(raw,c);
assert.deepEqual(edits.map(e=>e.op),['set','add_skill','skill_level','edit','add','replace','remove'],'unknown fields, duplicate skills, missing ids and unsafe links are dropped');
assert.equal(edits[0].before,'دانشجوری کامپیوتر');assert(edits.every(e=>typeof e.label==='string'&&e.label));
const before=JSON.stringify(c),snap=E.snapshot(c),scopes=E.apply(c,edits);
assert.equal(c.profile.title,'دانشجوی مهندسی کامپیوتر');assert.equal(c.skills.length,2);assert.equal(c.skills[0].level,5);assert.equal(c.experience[0].desc,'پیاده‌سازی صفحه‌ها');
assert.equal(c.languages[0].name,'انگلیسی');assert.equal(c.projects.length,0);assert(scopes.includes('skills')&&scopes.includes('profile'));
E.restore(c,snap);assert.equal(JSON.stringify(c),before,'undo puts everything back');
assert.equal(E.normalize('not json',c).length,0);assert(E.normalize(Array.from({length:40},(_,i)=>({op:'add_skill',name:'S'+i})),c).length<=E.MAX);
const p=llm.parse('این‌ها را پیشنهاد می‌کنم. <<EDITS>>```json\n[{"op":"set","field":"bio","value":"من برنامه‌نویسم."}]\n```<</EDITS>> مهارت‌ها: <<SKILLS>>Git|React<</SKILLS>>');
assert.equal(p.edits.length,3);assert(p.text.includes('«Git»، «React»')&&!p.text.includes('<<'),'older tags become edits and stay readable');
assert(llm.trim(c).skills[0].id==='s1','the model sees item ids');
console.log('PASS Fandogh edits: checked against the resume, labelled, applied, undone, older tags and ids for the model.');
