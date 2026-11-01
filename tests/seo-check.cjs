const assert=require('node:assert/strict'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
// Search basics for the brand and its main phrases: titles, headings, structured data, internal links and the sitemap.
(async()=>{
 const server=createServer(testStore());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const get=async p=>{const r=await fetch(base+p);assert.equal(r.status,200,p);return r.text();};
 const lds=html=>[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
 const text=html=>html.replace(/<[^>]+>/g,' ');
 try{
  const home=await get('/');
  assert.match(/<title>(.*?)<\/title>/.exec(home)[1],/^رزومیت \| رزومه ساز آنلاین رایگان/);
  assert.match(/<meta name="description" content="([^"]*)"/.exec(home)[1],/رزومیت.*رزومه ساز آنلاین رایگان.*وبسایت رزومه/);
  assert.match(/<h1[^>]*>(.*?)<\/h1>/s.exec(home)[1],/رزومیت، رزومه‌ساز آنلاین رایگان/);
  assert(home.includes('<meta property="og:site_name" content="رزومیت">'));
  const graph=lds(home)[0]['@graph'],site=graph.find(x=>x['@type']==='WebSite'),faq=graph.find(x=>x['@type']==='FAQPage');
  assert.equal(site.name,'رزومیت');assert(site.alternateName.includes('ResumeIt'));assert(graph.some(x=>x['@type']==='Organization'&&x.alternateName.includes('رزومه ساز رزومیت')));
  assert.equal(faq.mainEntity.length,(home.match(/<details id="faq-/g)||[]).length,'every visible question is in the FAQ data, and only those');
  for(const [path,phrase]of [['/resume-builder/','رزومه ساز آنلاین رایگان'],['/resume-website/','ساخت وبسایت رزومه']]){
   const html=await get(path);assert(/<title>(.*?)<\/title>/.exec(html)[1].includes(phrase),path);assert(/<h1>(.*?)<\/h1>/.exec(html)[1].includes(phrase.split(' ')[0]),path);
   assert(html.includes('<link rel="canonical" href="https://resumeit.ir'+path+'">'),path);
   const data=lds(html)[0]['@graph'];assert(data.some(x=>x['@type']==='BreadcrumbList'));const q=data.find(x=>x['@type']==='FAQPage').mainEntity;assert.equal(q.length,(html.match(/<details>/g)||[]).length);
   assert(text(html).split(/\s+/).length>500,'a guide page carries real content: '+path);assert(home.includes('href="'+path+'"'),'the landing footer links '+path);
  }
  for(const p of ['/about/','/contact/','/privacy/','/terms/','/changes/']){const html=await get(p);assert(html.includes('href="/resume-builder/"'),p);assert(/\| رزومیت<\/title>|رزومیت \(ResumeIt\)/.test(html),p);}
  const map=await get('/sitemap.xml');for(const p of ['','resume-builder/','resume-website/','demo/'])assert(map.includes('<loc>https://resumeit.ir/'+p+'</loc>'),p);
  const robots=await get('/robots.txt');assert(robots.includes('Sitemap: https://resumeit.ir/sitemap.xml'));assert(!/Disallow: \/resume-/.test(robots));
 }finally{server.close();}
 console.log('PASS SEO: brand-first titles, keyword heading, Organization/WebSite/FAQ data, two guide pages with breadcrumbs and FAQ, footer links and sitemap.');
})().catch(e=>{console.error(e);process.exit(1);});
