const assert=require('node:assert/strict');
const {RI,blank,render}=require('../src/dashboard/render.cjs');
for(const id of ['vista','satiar']){
 const raw=RI.importedSpec(id),before=JSON.stringify(raw),effective=RI.effectiveTemplateSpec(id),content=blank();
 content.theme.resume=id;content.profile.name='نام واقعی';content.profile.title='عنوان واقعی';content.profile.bio='معرفی واقعی';content.profile.avatar='https://example.test/avatar.png';content.contacts[0].value='test@example.test';content.contacts[0].public=true;
 content.projects=[{id:'actual-project',title:'پروژه واقعی',desc:'اطلاعات واقعی پروژه',image:'',url:'https://example.test/project'}];
 content.resumeTemplates[id]={fields:Object.fromEntries(effective.fields.filter(field=>!field.bind).map(field=>[field.key,field.default])),settings:{},collections:{}};
 const values=content.resumeTemplates[id],html=()=>render(content,'resume',{},'/u/audit','home'),baseline=html();
 const changedValue=field=>field.type==='icon'?'github':field.type==='image'?'https://example.test/changed-image.png':['link','url','contact'].includes(field.type)?'https://example.test/changed-destination':field.type==='percent'?'37%':'EFFECTIVE_CONTROL_'+field.key;
 const activeRaw=raw.fields.filter(field=>raw.groups.some(group=>group.key===field.group));
 const removed=activeRaw.filter(field=>!effective.fields.some(current=>current.key===field.key));assert(removed.length>0);
 for(const field of removed){values.fields[field.key]=changedValue(field);assert.equal(html(),baseline,id+' excluded field unexpectedly changes output: '+field.key);delete values.fields[field.key];}
 const projected=require('../dist/dashboard/js/advisor-core.js').project(content,effective);assert(projected.filter(source=>source.section==='template').every(source=>!removed.some(field=>field.key===source.field)),'quality review excludes ignored template fields');
 for(const key of ['f1','f2'])assert(!effective.fields.some(field=>field.key===key),id+' generated header fields must not be offered');
 assert(!effective.groups.some(group=>group.key==='home:contact'));assert(!effective.collections.some(collection=>collection.group==='home:contact'||collection.group==='home:portfolio'||collection.group==='home:07793c2'));
 assert(effective.collections.every(collection=>raw.collections.includes(collection)));assert(raw.settings.filter(setting=>!setting.group).every(setting=>effective.settings.some(current=>current.key===setting.key)),'global responsive/hover/color settings retained');
 assert(effective.settings.every(setting=>!setting.group||effective.groups.some(group=>group.key===setting.group)),'every effective setting has a reachable editor group');
 if(id==='vista')assert.equal(effective.settings.find(setting=>setting.key==='show_home_07793c2').group,undefined,'real project visibility belongs to reachable general settings');
 const live=effective.fields.find(field=>field.type==='text'&&!field.bind&&!field.key.startsWith('compose_'));assert(live);values.fields[live.key]=changedValue(live);assert.notEqual(html(),baseline,id+' live text must change output');values.fields[live.key]=live.default;
 const percent=effective.fields.find(field=>field.type==='percent');if(percent){values.fields[percent.key]='37%';assert(html().includes('width:37%'));values.fields[percent.key]=percent.default;}
 const image=effective.fields.find(field=>field.type==='image');assert(image);if(image.bind){const old=content.profile[image.bind];content.profile[image.bind]=changedValue(image);assert(html().includes(changedValue(image)));content.profile[image.bind]=old;}else{values.fields[image.key]=changedValue(image);assert(html().includes(changedValue(image)));values.fields[image.key]=image.default;}
 const collection=effective.collections.find(collection=>collection.group!=='legacy');assert(collection);values.collections[collection.key]=[];assert.notEqual(html(),baseline,id+' reachable collection removal must change output');delete values.collections[collection.key];
 assert.equal(JSON.stringify(RI.importedSpec(id)),before,'effective editor projection must not mutate raw storage/validation contract');
 console.log('PASS effective template controls',JSON.stringify({template:id,activeRawFields:activeRaw.length,effectiveFields:effective.fields.length,removedFields:removed.length,effectiveCollections:effective.collections.length}));
}
