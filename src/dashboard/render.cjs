const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Render the same trusted templates as the editor; user content is data, never executable code.
const context=vm.createContext({window:{},location:{origin:'https://resumeit.ir'},URL,Intl,Date,encodeURIComponent});
for(const file of ['icons','core','ui','data','imported-templates','template-vista','template-satiar','resume-templates','preview','template-shabtab'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../dist/dashboard/js',file+'.js'),'utf8'),context,{timeout:3000});
const RI=context.window.RI;
RI.findTemplate=(kind,id)=>(kind==='links'?RI.LINK_TEMPLATES:RI.RESUME_TEMPLATES).find(t=>t.id===id);
function blank(){return JSON.parse(JSON.stringify(RI.seed('empty')));}
function render(content,kind,preferences,base,page){
  RI.state={account:preferences};
  return (kind==='resume'?RI.resumeHtml(content,{publicBase:base,page}):RI.linksHtml(content,{publicBase:base}));
}
// Plain, script-free version of a résumé for applicant-tracking systems (council N2-a): real headings and lists, no
// images or layout tricks. Only contacts marked public with a value appear, because publicContent keeps private ones.
function atsHtml(c){
  const e=RI.esc,range=x=>[x.from,x.current?'اکنون':x.to].filter(Boolean).join(' تا '),p=t=>t?'<p>'+e(t)+'</p>':'';
  const list=(title,items,row)=>items.length?'<h2>'+title+'</h2><ul>'+items.map(i=>'<li>'+row(i)+'</li>').join('')+'</ul>':'';
  const blocks={
    contacts:()=>list('راه‌های تماس',c.contacts.filter(x=>x.public&&String(x.value||'').trim()),x=>e(x.label)+': <bdi dir="ltr">'+e(x.value)+'</bdi>'),
    socials:()=>list('شبکه‌ها',c.socials,x=>e(x.platform)+': <bdi dir="ltr">'+e(x.handle)+'</bdi>'),
    skills:()=>list('مهارت‌ها',c.skills,x=>e(x.name)),
    experience:()=>list('تجربه‌های کاری',c.experience,x=>'<b>'+e(x.role)+'</b> — '+e(x.org)+' ('+e(range(x))+')'+p(x.desc)),
    education:()=>list('تحصیلات',c.education,x=>'<b>'+e(x.degree)+'</b> — '+e(x.school)+' ('+e(range(x))+')'+p(x.desc)),
    projects:()=>list('پروژه‌ها',c.projects,x=>'<b>'+e(x.title||x.name)+'</b>'+p(x.desc)+(x.url?' <bdi dir="ltr">'+e(x.url)+'</bdi>':'')),
    certs:()=>list('گواهی‌ها',c.certs,x=>'<b>'+e(x.title)+'</b> — '+e(x.issuer)+(x.year?' ('+e(x.year)+')':'')),
    languages:()=>list('زبان‌ها',c.languages,x=>e(x.name)),
  };
  const body=c.sections.map(s=>s.visible!==false&&blocks[s.key]?blocks[s.key]():'').join('');
  return '<h1>'+e(c.profile.name)+'</h1>'+(c.profile.title?'<p><b>'+e(c.profile.title)+'</b>'+(c.profile.location?' — '+e(c.profile.location):'')+'</p>':'')+p(c.profile.bio)+body;
}
module.exports={RI,blank,render,atsHtml};
