const fs=require('node:fs'),path=require('node:path'),{RI,blank,render}=require('../src/dashboard/render.cjs');
const root=path.resolve(__dirname,'../dist');
for(const [kind,items] of [['resume',RI.RESUME_TEMPLATES],['links',RI.LINK_TEMPLATES]])for(const item of items){
 const c=JSON.parse(JSON.stringify(RI.seed('full')));c.theme[kind]=item.id;c.slug='sample';c._linksOnly=kind==='links';
 const directory=path.join(root,(kind==='resume'?'resume':'link')+item.id);fs.mkdirSync(directory,{recursive:true});
 for(const file of fs.readdirSync(directory))if(/^p\d+\.html$/.test(file))fs.unlinkSync(path.join(directory,file));
 const template=kind==='resume'&&RI.IMPORTED_TEMPLATES[item.id],pages=template?Object.keys(template.pages):['home'];
 for(const page of pages){
  const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+RI.esc(item.name)+' · رزومهٔ نمونه</title><link rel="icon" href="/brand/favicon.svg"><link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/public-assets/preview.css"><link rel="stylesheet" href="/template-samples.css"></head><body'+(template?' class="'+RI.esc(template.pages[page].bodyClass)+'"':'')+'><main>'+render(c,kind,{},'/'+path.basename(directory),page)+'</main><aside class="sample-label">نمونهٔ قالب '+RI.esc(item.name)+' · اطلاعات آزمایشی</aside>'+(template?'<script src="/templates/template-runtime.js"></script>':'')+'</body></html>';
  fs.writeFileSync(path.join(directory,page==='home'?'index.html':page+'.html'),html.replace('</body>','<script src="/public-assets/projects.js"></script></body>').replace(/[ \t]+$/gm,''));
 }
}
fs.mkdirSync(path.join(root,'dashboard/template-data'),{recursive:true});
for(const [id,data] of Object.entries(RI.IMPORTED_TEMPLATES))fs.writeFileSync(path.join(root,'dashboard/template-data',id+'.json'),JSON.stringify(data));
console.log('Generated static sample pages and isolated active-template data.');
