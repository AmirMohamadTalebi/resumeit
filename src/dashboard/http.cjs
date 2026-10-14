const {readJson,securityHeaders}=require('../http/security.cjs');
const model=require('./model.cjs'),{render,RI}=require('./render.cjs');
const {gzipSync}=require('node:zlib');
const {serveStatic,publicAssets}=require('../http/static.cjs');
const pubData=(c,k)=>k==='resume'?{slug:c.slug,profile:c.profile,contacts:c.contacts,skills:c.skills,experience:c.experience,education:c.education,projects:c.projects,certs:c.certs,languages:c.languages,socials:c.socials,sections:c.sections,resumeTemplates:c.resumeTemplates,theme:{resume:c.theme.resume,font:c.theme.font,palette:c.theme.palette,radius:c.theme.radius},share:c.share}:{slug:c.slug,links:c.links,name:c.profile.name,bio:c.profile.bio,avatar:c.profile.avatar,theme:{links:c.theme.links,font:c.theme.font,linksPalette:c.theme.linksPalette}};
function dashboardHandler(database,auth){return async(req,res,pathname,origin)=>{
  if(publicAssets.has(pathname)||pathname.startsWith('/templates/')||pathname.startsWith('/fonts/')){await serveStatic(req,res,pathname,origin);return true;}
  const root=new URL(origin),host=(req.headers.host||'').toLowerCase(),domain=root.hostname.startsWith('127.')||root.hostname==='localhost'?'resumeit.ir':root.hostname;
  const sub=host.endsWith('.'+domain)?host.slice(0,-domain.length-1):null;
  const local=/^\/u\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
  const reply=(status,body)=>{
    // The client can reconstruct identical publication snapshots from the draft it already receives.
    if(body.content&&body.pub){body={...body,pub:structuredClone(body.pub)};for(const k of ['resume','links'])if(body.pub[k]?.snap===JSON.stringify(pubData(body.content,k))){body.pub[k].snap=null;body.pub[k].snapCurrent=true;}}
    let output=Buffer.from(JSON.stringify(body));if(output.length>1024 && /\bgzip\b/.test(req.headers['accept-encoding']||'')){output=gzipSync(output);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':output.length});res.end(output);};
  if(sub!==null||local){
    const slug=sub||local[1],route=local?local[2]||'/':pathname,base=local?'/u/'+slug:'';
    if(!model.slugValid(slug)){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
    const outgoing=/^\/out\/([a-z0-9_-]+)$/i.exec(route),kind=route==='/links'||route==='/links/'||route==='/links/share-image'||outgoing?'links':'resume';
    if(!['/','/links','/links/','/share-image','/links/share-image'].includes(route)&&!outgoing){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const page=await database.publicPage(slug,kind);if(!page){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(outgoing){const link=page.content.links.items.find(x=>x.id===outgoing[1]&&x.type==='link'&&x.active);const url=link&&model.webUrl(link.url);if(!url){res.writeHead(404);res.end();return true;}if(req.method==='GET')await database.recordMetric(page.id,'click',link.id);res.writeHead(302,{Location:url});res.end();return true;}
    if(route.endsWith('/share-image')){const img=page.content.share.image||page.content.profile.avatar,m=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(img||'');if(!m){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'image/'+m[1]});res.end(req.method==='HEAD'?undefined:Buffer.from(m[2],'base64'));return true;}
    const c=model.publicContent(page.content,database.billing?await database.billing(page.id):{}),esc=RI.esc,canonical=local?origin+base+(kind==='links'?'/links':''):root.protocol+'//'+slug+'.'+domain+(kind==='links'?'/links':'');
    const image=c.share.image||c.profile.avatar,ogImage=/^https:\/\//.test(image||'')?image:/^data:image\//.test(image||'')?canonical+'/share-image':null;
    const templatePage=new URL(req.url,origin).searchParams.get('page')||'home',imported=kind==='resume'&&RI.IMPORTED_TEMPLATES[c.theme.resume];
    if(imported&&!Object.hasOwn(imported.pages,templatePage)){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(c.share.title||c.profile.name)+'</title><meta name="description" content="'+esc(c.share.desc||c.profile.bio)+'"><meta name="robots" content="'+(page.preferences.indexing?'index,follow':'noindex,nofollow')+'"><link rel="canonical" href="'+esc(canonical+(imported&&templatePage!=='home'?'/?page='+templatePage:''))+'"><meta property="og:title" content="'+esc(c.share.title||c.profile.name)+'"><meta property="og:description" content="'+esc(c.share.desc||c.profile.bio)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+'<link rel="icon" href="/brand/favicon.svg">'+(imported?'':'<link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/public-assets/preview.css">')+'</head><body'+(imported?' class="'+esc(imported.pages[templatePage].bodyClass)+'"':'')+'><main class="public-page">'+render(c,kind,page.preferences,base,templatePage)+'</main>'+(imported?'<script src="/templates/template-runtime.js"></script>':'')+'</body></html>';
    securityHeaders(res,origin,html);
    res.setHeader('Cache-Control','private, no-store');
    if(req.method==='GET'){
      const marker='ri_seen_'+kind,seen=(req.headers.cookie||'').split(';').some(c=>c.trim()===marker+'=1');
      // shortcut: cookie-based visits; clearing cookies or using another browser starts a new visit.
      if(!seen){await database.recordMetric(page.id,kind);res.setHeader('Set-Cookie',marker+'=1; Path='+(base||'/')+'; HttpOnly; SameSite=Lax; Max-Age=86400'+(origin.startsWith('https:')?'; Secure':''));}
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:html);return true;
  }
  if(!pathname.startsWith('/api/dashboard/'))return false;
  try{
    if(req.headers.host!==root.host)model.fail('مبدأ درخواست معتبر نیست',403);
    const user=await auth.account(req);if(!user)model.fail('دوباره وارد حسابت شو',401);
    if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id)model.fail('حساب فعال عوض شده است؛ این صفحه را دوباره باز کن',409,'ACCOUNT_CHANGED');
    if(req.method==='GET'){
      if(pathname==='/api/dashboard/document'){const [doc,billing]=await Promise.all([database.loadDashboard(user.id),database.billing?database.billing(user.id):{}]);reply(200,{...doc,billing,ownerId:user.id});}
      else if(pathname==='/api/dashboard/wallet')reply(200,await database.wallet(user.id));
      else if(pathname==='/api/dashboard/stats')reply(200,{rows:await database.dashboardStats(user.id)});
      else if(pathname==='/api/dashboard/slug'){const slug=new URL(req.url,origin).searchParams.get('value');reply(200,{available:model.slugValid(slug)&&await database.slugAvailable(slug,user.id)});}
      else model.fail('مسیر پیدا نشد',404);return true;
    }
    if(req.method!=='POST')model.fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')model.fail('مبدأ درخواست معتبر نیست',403);
    const input=await readJson(req,8*1024*1024);
    if(pathname==='/api/dashboard/delete'){if(input.confirm!=='DELETE')model.fail('تأیید حذف لازم است');await database.deleteAccount(user.id);res.setHeader('Set-Cookie','ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(origin.startsWith('https:')?'; Secure':''));reply(200,{ok:true});return true;}
    if(pathname==='/api/dashboard/wallet/purchase'){await database.purchaseWithWallet(user.id,input.ref,input.requestId);reply(200,{wallet:await database.wallet(user.id),billing:await database.billing(user.id)});return true;}
    if(!Number.isSafeInteger(input.revision)||input.revision<0)model.fail('نسخهٔ اطلاعات معتبر نیست');
    if(!['/api/dashboard/save','/api/dashboard/publish','/api/dashboard/unpublish'].includes(pathname))model.fail('مسیر پیدا نشد',404);
    const billing=database.billing?await database.billing(user.id):{};
    const saving=pathname.endsWith('/save'),patch=saving&&input.patch!==undefined?model.validatePatch(input.patch):null;
    const result=await database.mutateDashboard(user.id,input.revision,doc=>{
      if(saving){doc.content=model.content(patch?{...doc.content,...patch}:input.content,billing,doc.content);doc.preferences=model.preferences(input.preferences);doc.slug=doc.content.slug||null;return;}
      const k=input.kind;if(!['resume','links'].includes(k))model.fail('نوع صفحه معتبر نیست');
      if(pathname.endsWith('/unpublish')){doc.pub[k].status='draft';doc.pub[k].snap=null;delete doc.published[k];return;}
      if(!user.first_name||!user.last_name||!user.phone_verified||!user.phone)model.fail('نام، نام خانوادگی و شمارهٔ تأییدشده را در تنظیمات کامل کن');
      model.ready(doc.content,k,billing);doc.slug=doc.content.slug;doc.published[k]=structuredClone(doc.content);doc.pub[k]={status:'published',version:doc.pub[k].version+1,at:Date.now(),snap:JSON.stringify(pubData(doc.content,k))};
    },{draftOnly:saving});reply(200,saving&&input.compact===true?{revision:result.revision,slug:result.slug,preferences:result.preferences}:result);
  }catch(e){reply(e.status||503,{error:e.status?e.message:'درخواست انجام نشد؛ دوباره تلاش کن',code:['REVISION_CONFLICT','ACCOUNT_CHANGED'].includes(e.code)?e.code:undefined});}return true;
};}
module.exports={dashboardHandler};
