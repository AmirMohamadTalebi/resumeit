const fs=require('node:fs'),path=require('node:path'),{RI,render}=require('../src/dashboard/render.cjs');
const root=path.resolve(__dirname,'../dist');
for(const [kind,items] of [['resume',RI.RESUME_TEMPLATES],['links',RI.LINK_TEMPLATES]])for(const item of items){
 const c=JSON.parse(JSON.stringify(RI.seed('full')));c.theme[kind]=item.id;c.slug='sample';c._linksOnly=kind==='links';
 if(kind==='links')for(const link of c.links.items)if(link.icon==='resume')link.url='https://resumeit.ir/resume'+c.theme.resume+'/';
 if(kind==='resume'&&['vista','satiar'].includes(item.id)){c.profile.name='ماهان رضایی';c.profile.title='توسعه‌دهندهٔ فرانت‌اند';c.profile.bio='روی ساخت رابط‌های وب خوانا و سریع کار می‌کنم. این رزومه، مسیر یادگیری و چند نمونه از کارهایم را نشان می‌دهد.';for(const contact of c.contacts){if(contact.type==='email')contact.value='mahan@example.com';if(contact.type==='website')contact.value='mahan.example.com';}c.socials.forEach(s=>s.handle='mahan-example');}
 if(kind==='resume'&&item.id==='vista'){c.resumeTemplates.vista={fields:{},settings:{},collections:{}};for(const field of RI.IMPORTED_TEMPLATES.vista.fields)if(field.group==='home:67d220d'&&typeof field.default==='string'&&field.default.includes('sigma_ui'))c.resumeTemplates.vista.fields[field.key]=field.default.replaceAll('sigma_ui','mahan-example');c.projects.forEach(project=>project.url='https://example.com/projects/'+project.id);}
 const directory=path.join(root,(kind==='resume'?'resume':'link')+item.id);fs.mkdirSync(directory,{recursive:true});
 for(const file of fs.readdirSync(directory))if(/^p\d+\.html$/.test(file))fs.unlinkSync(path.join(directory,file));
 const template=kind==='resume'&&RI.IMPORTED_TEMPLATES[item.id],pages=template?Object.keys(template.pages):['home'];
 for(const page of pages){
  const baseStyles=template?'':['tokens','base','preview'].map(id=>'<link rel="stylesheet" href="/public-assets/'+id+'.css">').join('');
  const rendered=render(c,kind,{},kind==='links'?undefined:'/'+path.basename(directory),page).replace('data-main="__RI_MAIN__"','data-main="" data-preview="1"');
  const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+RI.esc(item.name)+' · رزومهٔ نمونه</title><link rel="icon" href="/brand/favicon.svg"><link rel="stylesheet" href="/fonts/fonts.css">'+baseStyles+'<link rel="stylesheet" href="/template-samples.css"></head><body'+(template?' class="'+RI.esc(template.pages[page].bodyClass)+'"':'')+'><nav class="sample-navigation" aria-label="راهنمای نمونه"><a href="/#templates">بازگشت به قالب‌ها</a><a href="/register/">شروع ساخت رزومه</a></nav><main>'+rendered+'</main><aside class="sample-label">نمونهٔ قالب '+RI.esc(item.name)+' · اطلاعات آزمایشی</aside>'+(template?'<script src="/templates/template-runtime.js"></script>':'')+(kind==='resume'?'<script defer src="/public-assets/inbox.js"></script>':'')+'</body></html>';
  fs.writeFileSync(path.join(directory,page==='home'?'index.html':page+'.html'),html.replace('<main>','<main class="public-page">').replaceAll('href="/'+path.basename(directory)+'/links"','href="/link'+c.theme.links+'/"').replaceAll('href="https://resumeit.ir/resume'+c.theme.resume+'/"','href="/resume'+c.theme.resume+'/"').replace('<script src="/templates/template-runtime.js">',(template?'<script src="/templates/vista-runtime.js"></script>':'')+'<script src="/templates/template-runtime.js">').replace('</body>','<script src="/public-assets/projects.js"></script></body>').replace(/[ \t]+$/gm,''));
 }
}
fs.mkdirSync(path.join(root,'dashboard/template-data'),{recursive:true});
for(const [id,data] of Object.entries(RI.IMPORTED_TEMPLATES))fs.writeFileSync(path.join(root,'dashboard/template-data',id+'.json'),JSON.stringify(data));
console.log('Generated static sample pages and isolated active-template data.');
