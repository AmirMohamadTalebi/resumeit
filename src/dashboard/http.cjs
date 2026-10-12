const {readJson,securityHeaders}=require('../http/security.cjs');
const model=require('./model.cjs'),{render,RI}=require('./render.cjs');
const fs=require('node:fs'),path=require('node:path');
const assets=new Map([['/public-assets/tokens.css','dashboard/css/tokens.css'],['/public-assets/base.css','dashboard/css/base.css'],['/public-assets/preview.css','dashboard/css/preview.css'],['/assets/fonts/Vazirmatn.woff2','dashboard/assets/fonts/Vazirmatn.woff2'],['/brand/resumeit-logo-v1.png','brand/resumeit-logo-v1.png'],['/brand/favicon.svg','brand/favicon.svg']]);
const pubData=(c,k)=>k==='resume'?{slug:c.slug,profile:c.profile,contacts:c.contacts,skills:c.skills,experience:c.experience,education:c.education,projects:c.projects,certs:c.certs,languages:c.languages,socials:c.socials,sections:c.sections,resumeTemplates:c.resumeTemplates,theme:{resume:c.theme.resume,font:c.theme.font,palette:c.theme.palette,radius:c.theme.radius},share:c.share}:{slug:c.slug,links:c.links,name:c.profile.name,bio:c.profile.bio,avatar:c.profile.avatar,theme:{links:c.theme.links,font:c.theme.font,linksPalette:c.theme.linksPalette}};
function dashboardHandler(database,auth){return async(req,res,pathname,origin)=>{
  const root=new URL(origin),host=(req.headers.host||'').toLowerCase(),domain=root.hostname.startsWith('127.')||root.hostname==='localhost'?'resumeit.ir':root.hostname;
  const sub=host.endsWith('.'+domain)?host.slice(0,-domain.length-1):null;
  const local=/^\/u\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  if(sub!==null||local){
    const slug=sub||local[1],route=local?local[2]||'/':pathname,base=local?'/u/'+slug:'';
    if(!model.slugValid(slug)){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(assets.has(pathname)&&req.method==='GET'){const file=assets.get(pathname);res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.woff2')?'font/woff2':file.endsWith('.svg')?'image/svg+xml':'image/png'});res.end(fs.readFileSync(path.join(__dirname,'../../dist',file)));return true;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
    const outgoing=/^\/out\/([a-z0-9_-]+)$/i.exec(route),kind=route==='/links'||route==='/links/'||route==='/links/share-image'||outgoing?'links':'resume';
    if(!['/','/links','/links/','/share-image','/links/share-image'].includes(route)&&!outgoing){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const page=await database.publicPage(slug,kind);if(!page){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(outgoing){const link=page.content.links.items.find(x=>x.id===outgoing[1]&&x.type==='link'&&x.active);const url=link&&model.webUrl(link.url);if(!url){res.writeHead(404);res.end();return true;}if(req.method==='GET')await database.recordMetric(page.id,'click',link.id);res.writeHead(302,{Location:url});res.end();return true;}
    if(route.endsWith('/share-image')){const img=page.content.share.image||page.content.profile.avatar,m=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(img||'');if(!m){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'image/'+m[1]});res.end(req.method==='HEAD'?undefined:Buffer.from(m[2],'base64'));return true;}
    const c=page.content,esc=RI.esc,canonical=local?origin+base+(kind==='links'?'/links':''):root.protocol+'//'+slug+'.'+domain+(kind==='links'?'/links':'');
    const image=c.share.image||c.profile.avatar,ogImage=/^https:\/\//.test(image||'')?image:/^data:image\//.test(image||'')?canonical+'/share-image':null;
    const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(c.share.title||c.profile.name)+'</title><meta name="description" content="'+esc(c.share.desc||c.profile.bio)+'"><meta name="robots" content="'+(page.preferences.indexing?'index,follow':'noindex,nofollow')+'"><link rel="canonical" href="'+esc(canonical)+'"><meta property="og:title" content="'+esc(c.share.title||c.profile.name)+'"><meta property="og:description" content="'+esc(c.share.desc||c.profile.bio)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+'<link rel="icon" href="/brand/favicon.svg"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/public-assets/preview.css"></head><body><main class="public-page">'+render(c,kind,page.preferences,base)+'</main></body></html>';
    securityHeaders(res,origin,html);
    res.setHeader('Cache-Control','private, no-store');
    if(req.method==='GET'){
      const marker='ri_seen_'+kind,seen=(req.headers.cookie||'').split(';').some(c=>c.trim()===marker+'=1');
      // shortcut: cookie-based visits; clearing cookies or using another browser starts a new visit.
      if(!seen){await database.recordMetric(page.id,kind);res.setHeader('Set-Cookie',marker+'=1; Path='+(base||'/')+'; HttpOnly; SameSite=Lax; Max-Age=86400'+(origin.startsWith('https:')?'; Secure':''));}
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:html);return true;
  }
  if(assets.has(pathname)&&(pathname.startsWith('/public-assets/')||pathname.endsWith('.woff2'))&&req.method==='GET'){res.writeHead(200,{'Content-Type':pathname.endsWith('.woff2')?'font/woff2':'text/css; charset=utf-8'});res.end(fs.readFileSync(path.join(__dirname,'../../dist',assets.get(pathname))));return true;}
  if(!pathname.startsWith('/api/dashboard/'))return false;
  try{
    if(req.headers.host!==root.host)model.fail('مبدأ درخواست معتبر نیست',403);
    const user=await auth.account(req);if(!user)model.fail('دوباره وارد حسابت شو',401);
    if(req.method==='GET'){
      if(pathname==='/api/dashboard/document')reply(200,await database.loadDashboard(user.id));
      else if(pathname==='/api/dashboard/stats')reply(200,{rows:await database.dashboardStats(user.id)});
      else if(pathname==='/api/dashboard/slug'){const slug=new URL(req.url,origin).searchParams.get('value');reply(200,{available:model.slugValid(slug)&&await database.slugAvailable(slug,user.id)});}
      else model.fail('مسیر پیدا نشد',404);return true;
    }
    if(req.method!=='POST')model.fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')model.fail('مبدأ درخواست معتبر نیست',403);
    const input=await readJson(req,8*1024*1024);
    if(pathname==='/api/dashboard/delete'){if(input.confirm!=='DELETE')model.fail('تأیید حذف لازم است');await database.deleteAccount(user.id);res.setHeader('Set-Cookie','ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(origin.startsWith('https:')?'; Secure':''));reply(200,{ok:true});return true;}
    if(!Number.isSafeInteger(input.revision)||input.revision<0)model.fail('نسخهٔ اطلاعات معتبر نیست');
    if(!['/api/dashboard/save','/api/dashboard/publish','/api/dashboard/unpublish'].includes(pathname))model.fail('مسیر پیدا نشد',404);
    const c=pathname.endsWith('/save')?model.content(input.content):null;
    const result=await database.mutateDashboard(user.id,input.revision,doc=>{
      if(c){doc.content=c;doc.preferences=model.preferences(input.preferences);doc.slug=c.slug||null;return;}
      const k=input.kind;if(!['resume','links'].includes(k))model.fail('نوع صفحه معتبر نیست');
      if(pathname.endsWith('/unpublish')){doc.pub[k].status='draft';doc.pub[k].snap=null;delete doc.published[k];return;}
      if(!user.first_name||!user.last_name||!user.phone_verified||!user.phone)model.fail('نام، نام خانوادگی و شمارهٔ تأییدشده را در تنظیمات کامل کن');
      model.ready(doc.content,k);doc.slug=doc.content.slug;doc.published[k]=structuredClone(doc.content);doc.pub[k]={status:'published',version:doc.pub[k].version+1,at:Date.now(),snap:JSON.stringify(pubData(doc.content,k))};
    });reply(200,result);
  }catch(e){reply(e.status||503,{error:e.status?e.message:'درخواست انجام نشد؛ دوباره تلاش کن'});}return true;
};}
module.exports={dashboardHandler};
