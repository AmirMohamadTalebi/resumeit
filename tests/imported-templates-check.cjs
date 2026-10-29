const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {RI,blank,render}=require('../src/dashboard/render.cjs'),model=require('../src/dashboard/model.cjs');
for(const id of ['vista','satiar']){
 const billing={purchases:[{ref:'rt:'+id}]};const t=RI.IMPORTED_TEMPLATES[id],spec=RI.resumeSpec(id),c=blank();c.slug='template-test';c.theme.resume=id;c.profile.name='نام واقعی';c.profile.title='توسعه‌دهنده';c.contacts[0].value='PRIVATE@example.com';c.contacts[1].value='09129999999';
 const fullRequirements=JSON.stringify(RI.resumeRequirements(c));delete RI.IMPORTED_TEMPLATES[id];assert.equal(JSON.stringify(RI.resumeRequirements(c)),fullRequirements,'Lightweight requirements must match the full contract');RI.IMPORTED_TEMPLATES[id]=t;
 assert.equal(new Set(t.fields.map(x=>x.key)).size,t.fields.length);assert.equal(new Set(t.collections.map(x=>x.key)).size,t.collections.length);
 for(const f of spec.fields.concat(spec.settings))assert(RI.templateFieldValid(f,f.default),id+' invalid default '+f.key);
 assert.throws(()=>model.ready(c,'resume',billing));c.contacts[1].public=true;c.resumeTemplates[id]={fields:{},settings:{reviewed:true},collections:{}};model.ready(c,'resume',billing);
 const def=t.collections.find(x=>x.group.startsWith('home:')),keys=[];
 const visit=n=>{if(!n||typeof n!=='object')return;if(n.field)keys.push(n.field);if(n.attrs)Object.values(n.attrs).forEach(visit);if(n.children)n.children.forEach(visit);};visit(def.node);
 const field=t.fields.find(x=>keys.includes(x.key)&&['text','textarea'].includes(x.type)&&!x.bind);
 if(field){c.resumeTemplates[id].collections[def.key]=[{id:'first',fields:{[field.key]:'<script>alert(1)</script>'}},{id:'second',fields:{[field.key]:'SECOND_ROW'}}];}
 c.resumeTemplates[id].settings[Object.values(t.colors)[0]]='#123456';
 const icon=t.fields.find(f=>f.type==='icon'&&f.group.startsWith('home:'));c.resumeTemplates[id].fields[icon.key]='github';
 const percent=t.fields.find(f=>f.type==='percent');if(percent)c.resumeTemplates[id].fields[percent.key]='55%';
 const groups=t.groups.filter(g=>g.page==='home'&&!g.key.endsWith(':body'));c.resumeTemplates[id].settings.section_order=groups.map(g=>g.key).reverse().join(',');
 let safe=model.content(c,billing),html=render(safe,'resume',{},'/u/template-test','home');assert(!html.includes('PRIVATE@example.com'));assert(html.includes('09129999999'));assert(html.includes('--ri-'+Object.values(t.colors)[0]+':#123456'));
 if(field){assert(html.includes('&lt;script&gt;alert(1)'));assert(html.includes('SECOND_ROW'));c.resumeTemplates[id].collections[def.key]=[];assert(!render(model.content(c,billing),'resume',{},'/u/template-test','home').includes('SECOND_ROW'));}
 if(percent)assert(html.includes('width:55%'));
 for(const [page,definition] of Object.entries(t.pages)){
  const output=render(safe,'resume',{},'/u/template-test',page);assert(!/<script\b|<iframe\b|<form\b|\son\w+\s*=/i.test(output),id+' '+page);assert(output.includes('data-template-page="'+page+'"'));
  for(const url of definition.css)assert(fs.existsSync(path.join(__dirname,'../dist',url)));
 }
 const link=t.fields.find(x=>x.type==='url');if(link){c.resumeTemplates[id].fields[link.key]='javascript:alert(1)';assert.throws(()=>model.content(c,billing));delete c.resumeTemplates[id].fields[link.key];}
 const image=t.fields.find(x=>x.type==='image'&&!x.bind);c.resumeTemplates[id].fields[image.key]='data:image/png;base64,YmFk';assert.throws(()=>model.content(c,billing));delete c.resumeTemplates[id].fields[image.key];
 c.resumeTemplates[id].fields[image.key]='https://example.com/</style><script/src=https://evil.com>';assert.throws(()=>model.content(c,billing));delete c.resumeTemplates[id].fields[image.key];
 c.theme.palette='ice';const accent=t.colors[id==='vista'?'#00b894':'#a04dff'],bg=RI.RESUME_TEMPLATES.find(x=>x.id===id).v.bg,recoloured=RI.remapAccent(id==='vista'?'#00b894':'#a04dff',[id==='vista'?'#00b894':'#a04dff'],['#52788d','#a47248'],bg);assert(render(model.content(c,billing),'resume',{},'/u/template-test','home').includes('--ri-'+accent+':'+recoloured),'palette recolours the main accent');assert.notEqual(recoloured,id==='vista'?'#00b894':'#a04dff');assert(RI.color.contrast(recoloured,bg)>=3,'recoloured accent stays readable on the template background');
 c.resumeTemplates[id].settings[accent]='#abcdef';assert(render(model.content(c,billing),'resume',{},'/u/template-test','home').includes('--ri-'+accent+':#abcdef'));
 c.resumeTemplates[id].settings[Object.values(t.colors)[0]]='red;position:fixed';assert.throws(()=>model.content(c,billing));c.resumeTemplates[id].settings[Object.values(t.colors)[0]]='#123456';
 c.theme.resume='glacier';assert(model.content(c,billing).resumeTemplates[id]);
}
console.log('PASS: both compact single-page templates, unique editable contracts, safe URLs/images/colors, private contacts, independent repeated rows, removal, publication review and preserved switching.');
