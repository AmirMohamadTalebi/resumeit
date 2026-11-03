const {readJson,securityHeaders}=require('../http/security.cjs');
const model=require('./model.cjs'),{render,RI}=require('./render.cjs');
const {gzipSync}=require('node:zlib');
const {serveStatic,publicAssets}=require('../http/static.cjs'),{notFound}=require('../http/not-found.cjs');
const pubData=(c,k)=>RI.publicationData(k,c);
const metrics=require('./metrics.cjs'),mediaCache=require('./media-cache.cjs'),stored=require('./media.cjs');
const extension=type=>type==='image/jpeg'?'jpg':type.slice(6);
// schema.org data for a public page: a ProfilePage about a Person (name, job, photo, skills, social profiles), so search
// engines can show the person properly. "<" is escaped so the JSON can never close its script tag.
function structured(c,kind,url,image){
  const p=c.profile||{},sameAs=(c.socials||[]).map(s=>{try{return RI.socialUrl(s)}catch{return null}}).filter(u=>typeof u==='string'&&/^https:\/\//.test(u)).slice(0,10);
  const person={'@type':'Person',name:String(p.name||'').slice(0,120)||undefined,jobTitle:String(p.title||'').slice(0,160)||undefined,description:String(p.bio||'').slice(0,300)||undefined,url,image:image||undefined,sameAs:sameAs.length?sameAs:undefined,knowsAbout:kind==='resume'&&(c.skills||[]).length?(c.skills||[]).map(x=>String(x?.name||x||'')).filter(Boolean).slice(0,20):undefined};
  if(!person.name)return '';
  const data={'@context':'https://schema.org','@type':'ProfilePage',url,inLanguage:'fa-IR',mainEntity:person,isPartOf:{'@type':'WebSite',name:'رزومیت',alternateName:['ResumeIt','رزومه ساز رزومیت'],url:'https://resumeit.ir/'}};
  return '<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
}
function dashboardHandler(database,auth,notifications,options){const reset=require('./reset.cjs')(database,options);return async(req,res,pathname,origin)=>{
  if(publicAssets.has(pathname)||pathname.startsWith('/templates/')||pathname.startsWith('/fonts/')){await serveStatic(req,res,pathname,origin);return true;}
  const root=new URL(origin),host=(req.headers.host||'').toLowerCase(),domain=root.hostname.startsWith('127.')||root.hostname==='localhost'?'resumeit.ir':root.hostname;
  const sampleName=pathname.split('/')[1],sampleRoute=host===root.host&&[...RI.RESUME_TEMPLATES.map(t=>'resume'+t.id),...RI.LINK_TEMPLATES.map(t=>'link'+t.id)].includes(sampleName),samplePages=sampleRoute&&database.publicWorkspace?await database.publicWorkspace(sampleName,'path'):null;
  if(sampleRoute&&!samplePages){await serveStatic(req,res,pathname,origin);return true;}
  const sub=host.endsWith('.'+domain)?host.slice(0,-domain.length-1):null;
  const local=/^\/u\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
  let activeWorkspace=1;
  const reply=(status,body)=>{
    // The client can reconstruct identical publication snapshots from the draft it already receives.
    if(body.content&&body.pub){body={...body,pub:structuredClone(body.pub)};for(const k of ['resume','links'])if(body.pub[k]?.snap===JSON.stringify(pubData(body.content,k))){body.pub[k].snap=null;body.pub[k].snapCurrent=true;}}
    if(body.content)body=require('./media.cjs').lightweight(body,activeWorkspace);
    let output=Buffer.from(JSON.stringify(body));if(output.length>1024 && /\bgzip\b/.test(req.headers['accept-encoding']||'')){output=gzipSync(output);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':output.length});res.end(output);};
  const pathAddress=sub===null&&!local?/^\/([a-z0-9-]+)(\/.*)?$/.exec(pathname):null;
  const pathPages=samplePages||(pathAddress&&model.slugValid(pathAddress[1])&&database.publicWorkspace?await database.publicWorkspace(pathAddress[1],'path'):null);
  if(sub!==null||local||pathPages){
    const slug=sub||local?.[1]||pathAddress[1],rawRoute=local?local[2]||'/':pathPages?pathAddress[2]||'/':pathname,route=rawRoute==='/'?'/':rawRoute.replace(/\/$/,''),base=local?'/u/'+slug:pathPages?'/'+slug:'';
    if(!model.slugValid(slug)&&!samplePages&&!(sub&&slug.length<=24&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))){notFound(req,res,pathname,{home:new URL('/',origin).href});return true;}
    // Visitor message from the page's «ارتباط با من» form, accepted only from the page's own origin.
    if(route==='/message'&&req.method==='POST'){
      const found=pathPages||(database.publicWorkspace?await database.publicWorkspace(slug):{resume:await database.publicPage(slug,'resume')}),page=found?.resume;
      if(!page){res.writeHead(404,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'این رزومه منتشر نشده است'}));return true;}
      await require('./inbox.cjs').publicMessage(database,req,res,page,root.protocol+'//'+host);return true;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
    // Published images are served as content-hashed files instead of base64 inside every HTML response.
    const mediaRoute=/^\/media\/([a-f0-9]{32})\.(?:png|jpg|webp)$/.exec(route),mediaScope='p:'+host+base;
    if(mediaRoute){
      let entry=mediaCache.get(mediaScope,mediaRoute[1]);
      const allowedOwner=!entry&&database.dashboardMedia&&mediaCache.allowedOwner(mediaScope,mediaRoute[1]);
      if(allowedOwner){const row=await database.dashboardMedia(allowedOwner,mediaRoute[1]);if(row)entry=mediaCache.set(mediaScope,mediaRoute[1],row);}
      if(!entry){
        const found=pathPages||(database.publicWorkspace?await database.publicWorkspace(slug):{resume:await database.publicPage(slug,'resume'),links:await database.publicPage(slug,'links')}),owner=found?.resume||found?.links;
        const billing=owner&&database.billing?await database.billing(owner.id):{};
        const contents=['resume','links'].filter(k=>found?.[k]).map(k=>model.publicContent(found[k].content,billing));
        for(const c of contents)mediaCache.fill(mediaScope,c);
        entry=mediaCache.get(mediaScope,mediaRoute[1]);
        // Only images the published pages use are public; their bytes come from the account's image table.
        if(!entry&&owner&&database.dashboardMedia&&contents.some(c=>stored.hashes(c).has(mediaRoute[1]))){const row=await database.dashboardMedia(owner.id,mediaRoute[1]);if(row)entry=mediaCache.set(mediaScope,mediaRoute[1],row);}
      }
      if(!entry){res.writeHead(404);res.end();return true;}
      res.writeHead(200,{'Content-Type':entry.type,'Content-Length':entry.body.length,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:entry.body);return true;
    }
    const pages=pathPages||(database.publicWorkspace?await database.publicWorkspace(slug):{resume:await database.publicPage(slug,'resume'),links:await database.publicPage(slug,'links')});
    const linksPath=pathPages?'':'/'+(pages?.links?.content.routing?.links||'link'),resumePath=pages?.resume?.content.routing?.resume?'/'+pages.resume.content.routing.resume:'';
    const outgoing=/^\/out\/([a-z0-9_-]+)$/i.exec(route),linkRoutes=pathPages?['/','/share-image']:['/link','/links',linksPath,'/link/share-image','/links/share-image',linksPath+'/share-image'],kind=linkRoutes.includes(route)||outgoing?'links':'resume';
    if(![...linkRoutes,'/','/share-image',resumePath,resumePath+'/share-image'].includes(route)&&!outgoing||!pages?.[kind]){
      // A wrong path under a real address still offers that address's own page.
      notFound(req,res,pathname,{home:new URL('/',origin).href,page:pathPages?(pages?.links?base:null):pages?.resume?base+'/':pages?.links?base+linksPath:null});return true;
    }
    const page=pages[kind];
    if(outgoing){const link=page.content.links.items.find(x=>x.id===outgoing[1]&&x.type==='link'&&x.active);const url=link&&model.webUrl(link.url);if(!url){res.writeHead(404);res.end();return true;}if(metrics.countable(req,'click|'+page.id+'|'+link.id+'|'+host))await database.recordMetric(page.id,'click',link.id,Date.now(),page.slot||1);res.writeHead(302,{Location:url});res.end();return true;}
    if(route.endsWith('/share-image')){const img=RI.shareCard(page.content,kind).image,ref=stored.refHash(img),row=ref&&database.dashboardMedia?await database.dashboardMedia(page.id,ref):null;if(row){res.writeHead(200,{'Content-Type':row.type,'Content-Length':row.body.length});res.end(req.method==='HEAD'?undefined:row.body);return true;}const m=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(img||'');if(!m){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'image/'+m[1]});res.end(req.method==='HEAD'?undefined:Buffer.from(m[2],'base64'));return true;}
    const c=model.publicContent(page.content,database.billing?await database.billing(page.id):{}),esc=RI.esc,canonical=pathPages?root.protocol+'//'+domain+base:local?origin+base+(kind==='links'?linksPath:resumePath):root.protocol+'//'+slug+'.'+domain+(kind==='links'?linksPath:resumePath);
    c._publicPages={resume:!!pages?.resume,links:!!pages?.links};
    if(pathPages)c._linksOnly=true;
    const card=RI.shareCard(c,kind),image=card.image,ogImage=/^https:\/\//.test(image||'')?image:/^data:image\//.test(image||'')||stored.refHash(image)?canonical+'/share-image':null;
    const templatePage=new URL(req.url,origin).searchParams.get('page')||'home',imported=kind==='resume'&&RI.IMPORTED_TEMPLATES[c.theme.resume];
    if(imported&&!Object.hasOwn(imported.pages,templatePage)&&templatePage!=='contact'){if((imported.legacyPages||[]).includes(templatePage)){res.writeHead(308,{Location:canonical+'#ri-projects'});res.end();return true;}res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const rendered=render(c,kind,page.preferences,base,templatePage).replaceAll('href="'+base+'/links"','href="'+base+linksPath+'"').replaceAll('href="'+base+'/"','href="'+base+(resumePath||'/')+'"').replaceAll('href="'+base+'/?page=','href="'+base+resumePath+'/?page=');
    const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(card.title)+'</title><meta name="description" content="'+esc(card.desc)+'"><meta name="robots" content="'+(page.preferences.indexing?'index,follow':'noindex,nofollow')+'"><link rel="canonical" href="'+esc(canonical+(imported&&templatePage!=='home'?'/?page='+templatePage:''))+'"><meta property="og:title" content="'+esc(card.title)+'"><meta property="og:description" content="'+esc(card.desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+'<link rel="icon" href="/brand/favicon.svg">'+(imported?'':'<link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/public-assets/preview.css">')+'</head><body'+(imported?' class="'+esc((imported.pages[templatePage]||imported.pages.home).bodyClass)+'"':'')+'><main class="public-page">'+rendered+'</main>'+(imported?'<script src="/templates/template-runtime.js"></script>':'')+'</body></html>';
    const inline=mediaCache.fill(mediaScope,c),inlined=new Set(inline.values()),refs=[...stored.hashes(c)].filter(h=>!inlined.has(h)),types=await mediaCache.types(page.id,refs,database.dashboardMediaTypes?ids=>database.dashboardMediaTypes(page.id,ids):async()=>new Map());
    mediaCache.allow(mediaScope,page.id,[...types.keys()]);
    // Stored image addresses (the renderer makes them absolute) become public, content-hashed files.
    const output=html.replace(/(?:https:\/\/resumeit\.ir)?\/api\/dashboard\/media\/([a-f0-9]{32})/g,(value,hash)=>types.has(hash)?base+'/media/'+hash+'.'+extension(types.get(hash)):value).replace(/data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}/g,(value,type)=>inline.has(value)?base+'/media/'+inline.get(value)+'.'+(type==='jpeg'?'jpg':type):value).replace('<script src="/templates/template-runtime.js">',(imported?'<script src="/templates/vista-runtime.js"></script>':'')+'<script src="/templates/template-runtime.js">').replace('</body>','<script src="/public-assets/projects.js"></script><script src="/public-assets/inbox.js"></script></body>').split('__RI_MAIN__').join(root.origin).replace('</head>','<meta property="og:type" content="'+(kind==='resume'?'profile':'website')+'"><meta property="og:site_name" content="رزومیت"><meta property="og:locale" content="fa_IR">'+structured(c,kind,canonical,ogImage)+'<meta name="twitter:card" content="'+(ogImage?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+esc(card.title)+'"><meta name="twitter:description" content="'+esc(card.desc)+'">'+(ogImage?'<meta name="twitter:image" content="'+esc(ogImage)+'">':'')+'</head>');
    securityHeaders(res,origin,output);
    res.setHeader('Cache-Control','private, no-store');
    if(req.method==='GET'){
      const marker='ri_seen_'+kind,seen=(req.headers.cookie||'').split(';').some(c=>c.trim()===marker+'=1');
      // shortcut: cookie-based visits; clearing cookies or using another browser starts a new visit.
      if(!seen&&metrics.countable(req,kind+'|'+page.id+'|'+host+pathname)){await database.recordMetric(page.id,kind,'',Date.now(),page.slot||1);res.setHeader('Set-Cookie',marker+'=1; Path='+(base||'/')+'; HttpOnly; SameSite=Lax; Max-Age=86400'+(origin.startsWith('https:')?'; Secure':''));}
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:output);return true;
  }
  if(!pathname.startsWith('/api/dashboard/'))return false;
  try{
    if(req.headers.host!==root.host)model.fail('مبدأ درخواست معتبر نیست',403);
    const user=await auth.account(req);if(!user)model.fail('دوباره وارد حسابت شو',401);
    const scoped=['document','save','publish','unpublish','slug','share-qr','share-check','advisor'].some(route=>pathname==='/api/dashboard/'+route)||pathname.startsWith('/api/dashboard/media/');
    const workspace=Number(new URL(req.url,origin).searchParams.get('workspace')||1);if(!require('../owner/settings.cjs').validSlot(workspace))model.fail('جایگاه صفحه معتبر نیست');
    activeWorkspace=workspace;
    if(scoped&&workspace>1&&req.method==='POST'&&pathname!=='/api/dashboard/unpublish'){const billing=await database.billing(user.id),owner=database.ownerUserSettings?await database.ownerUserSettings(user.id):{};if(!require('../owner/settings.cjs').workspaceAllowed(workspace,billing,owner))model.fail('این جایگاه به اشتراک فعال یا سهمیهٔ اضافهٔ مالک نیاز دارد',403);}
    if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id)model.fail('حساب فعال عوض شده است؛ این صفحه را دوباره باز کن',409,'ACCOUNT_CHANGED');
    if(await require('./inbox.cjs').ownerRoute(database,req,pathname,origin,user,workspace,reply))return true;
    // The signed-in person's published resume address, for the «الصاق رزومهٔ من» window on the main site.
    if(pathname==='/api/dashboard/my-resume'&&req.method==='GET'){
      const doc=await database.loadDashboard(user.id,1),live=doc.pub?.resume?.status==='published'&&model.slugValid(doc.slug||'');
      const devHost=/^(127\.|localhost$)/.test(root.hostname),resumePath=doc.content?.routing?.resume?doc.content.routing.resume+'/':'';
      reply(200,live?{url:(devHost?root.origin+'/u/'+doc.slug+'/':root.protocol+'//'+doc.slug+'.'+domain+'/')+resumePath,name:doc.content.profile?.name||''}:{url:'',name:''});return true;
    }
    if(notifications&&await notifications.handle(req,pathname,origin,user,reply))return true;
    if(await require('./support.cjs')(database,req,pathname,origin,user,reply,res))return true;
    if(await require('./assistant.cjs')(database,req,pathname,origin,user,reply))return true;
    if(await require('./advisor.cjs').handle(database,req,pathname,origin,user,workspace,reply))return true;
    if(await reset(req,pathname,origin,user,workspace,reply))return true;
    if(req.method==='GET'){
      const media=/^\/api\/dashboard\/media\/([a-f0-9]{32})$/.exec(pathname);
      if(media){
        // The URL is the image's content hash, so the browser may keep it forever; the server fills its cache
        // from one document read instead of re-reading the whole document for every image.
        const scope='u:'+user.id+':'+workspace,etag='"'+media[1]+'"',cacheable=()=>{res.setHeader('Cache-Control','private, max-age=31536000, immutable');res.setHeader('Vary','Cookie');res.setHeader('ETag',etag);};
        // A matching validator can only describe these exact bytes, so revalidation needs no document read.
        if((req.headers['if-none-match']||'').split(',').map(v=>v.trim()).includes(etag)){cacheable();res.writeHead(304);res.end();return true;}
        let entry=mediaCache.get(scope,media[1]);
        if(!entry&&database.dashboardMedia){const row=await database.dashboardMedia(user.id,media[1]);if(row)entry=mediaCache.set(scope,media[1],row);}
        // Rows not yet moved by the startup migration still hold their images inline.
        if(!entry){mediaCache.fill(scope,(await database.loadDashboard(user.id,workspace)).content);entry=mediaCache.get(scope,media[1]);}
        if(!entry)model.fail('تصویر پیدا نشد',404);
        cacheable();res.writeHead(200,{'Content-Type':entry.type,'Content-Length':entry.body.length});res.end(entry.body);return true;
      }
      if(pathname==='/api/dashboard/document'){const [doc,billing,commerce,ownerSettings]=await Promise.all([database.loadDashboard(user.id,workspace),database.billing?database.billing(user.id,true):{},database.commerceSettings?database.commerceSettings():require('../owner/settings.cjs').defaults(),database.ownerUserSettings?database.ownerUserSettings(user.id):{}]);reply(200,{...doc,workspace,billing,commerce,ownerSettings,ownerId:user.id});}
      else if(pathname==='/api/dashboard/workspaces'){
        const cursor=Number(new URL(req.url,origin).searchParams.get('cursor')||0);if(!Number.isSafeInteger(cursor)||cursor<0||cursor>10000000)model.fail('صفحهٔ فهرست معتبر نیست');
        const billing=await database.billing(user.id),owner=database.ownerUserSettings?await database.ownerUserSettings(user.id):{},quota=require('../owner/settings.cjs'),limit=quota.workspaceLimit(billing,owner),stored=database.workspaceList?await database.workspaceList(user.id,{offset:cursor}):[{slot:1,slug:(await database.loadDashboard(user.id)).content.slug}],summary=database.workspaceSummary?await database.workspaceSummary(user.id):{maxSlot:Math.max(1,...stored.map(x=>x.slot))};let nextSlot=Math.max(2,summary.maxSlot+1);if(nextSlot===3)nextSlot=4;
        const slots=[...new Set([...(cursor===0?[1,2,3]:[]),...stored.map(r=>r.slot),...(quota.workspaceAllowed(nextSlot,billing,owner)?[nextSlot]:[])])].sort((a,b)=>a-b),rows=slots.map(slot=>({slot,slug:'',name:'',...stored.find(row=>row.slot===slot),locked:!quota.workspaceAllowed(slot,billing,owner)}));reply(200,{rows,limit,nextSlot:quota.workspaceAllowed(nextSlot,billing,owner)?nextSlot:null,nextCursor:stored.length===100?cursor+100:null});
      }
      else if(pathname==='/api/dashboard/history')reply(200,await database.financialHistory(user.id,new URL(req.url,origin).searchParams));
      else if(pathname==='/api/dashboard/billing')reply(200,database.billing?await database.billing(user.id):{});
      else if(pathname==='/api/dashboard/stats/export'){
        const billing=database.billing?await database.billing(user.id):{};if(!billing.plan||billing.plan.end<=Date.now())model.fail('خروجی آمار به اشتراک فعال نیاز دارد',403);
        const cell=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
        const rows=await database.dashboardStats(user.id,90,workspace),csv='\ufeffday,event,link_id,total\r\n'+rows.map(r=>[r.day,r.event,r.link_id,r.total].map(cell).join(',')).join('\r\n');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="resumeit-stats.csv"'});res.end(csv);return true;
      }
      else if(pathname==='/api/dashboard/wallet')reply(200,await database.wallet(user.id));
      else if(pathname==='/api/dashboard/stats')reply(200,{rows:await database.dashboardStats(user.id,90,workspace)});
      else if(pathname==='/api/dashboard/slug'){const slug=new URL(req.url,origin).searchParams.get('value');reply(200,{available:model.slugValid(slug)&&await database.slugAvailable(slug,user.id,workspace)});}
      else if(pathname==='/api/dashboard/share-check'){
        // What a messenger or search engine gets from the live page now, beside the draft card, so the person sees what still needs publishing.
        const kind=new URL(req.url,origin).searchParams.get('kind');if(!['resume','links'].includes(kind))model.fail('صفحه معتبر نیست');
        const doc=await database.loadDashboard(user.id,workspace),card=x=>({title:x.title||'',desc:x.desc||'',image:!!x.image}),out={kind,published:doc.pub?.[kind]?.status==='published',indexing:doc.preferences?.indexing!==false,draft:card(RI.shareCard(doc.content,kind)),live:null,url:null};
        if(out.published&&model.slugValid(doc.content.slug)&&!(workspace===3&&kind==='resume')){const page=await database.publicPage(doc.content.slug,kind,workspace===3?'path':'subdomain');if(page){const routes=page.content.routing||{resume:'',links:'link'};out.url=workspace===3?'https://'+domain+'/'+doc.content.slug:'https://'+doc.content.slug+'.'+domain+(kind==='links'?'/'+routes.links:routes.resume?'/'+routes.resume:'');out.live=card(RI.shareCard(model.publicContent(page.content,{}),kind));out.indexing=page.preferences?.indexing!==false;}}
        reply(200,out);
      }
      else if(pathname==='/api/dashboard/share-qr'){const kind=new URL(req.url,origin).searchParams.get('kind');if(!['resume','links'].includes(kind))model.fail('صفحه معتبر نیست');const doc=await database.loadDashboard(user.id,workspace);if(doc.pub[kind].status!=='published'||!model.slugValid(doc.content.slug))model.fail('ابتدا این صفحه را منتشر کن',409);if(workspace===3&&kind==='resume')model.fail('جایگاه سوم رزومه ندارد');const page=await database.publicPage(doc.content.slug,kind,workspace===3?'path':'subdomain');if(!page)model.fail('این صفحه در حال حاضر عمومی نیست',409);const routes=page.content.routing||{resume:'',links:'link'},url=workspace===3?'https://'+domain+'/'+doc.content.slug:'https://'+doc.content.slug+'.'+domain+(kind==='links'?'/'+routes.links:routes.resume?'/'+routes.resume:'');reply(200,{url,image:await require('qrcode').toDataURL(url,{errorCorrectionLevel:'Q',margin:4,width:640})});}
      else model.fail('مسیر پیدا نشد',404);return true;
    }
    if(req.method!=='POST')model.fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')model.fail('مبدأ درخواست معتبر نیست',403);
    const input=await readJson(req,8*1024*1024);
    if(pathname==='/api/dashboard/delete'){if(input.confirm!=='DELETE')model.fail('تأیید حذف لازم است');await require('../auth/confirm.cjs').confirmPassword(database,user,input.password);await database.deleteAccount(user.id);res.setHeader('Set-Cookie','ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(origin.startsWith('https:')?'; Secure':''));reply(200,{ok:true});return true;}
    if(pathname==='/api/dashboard/wallet/purchase'){await database.purchaseWithWallet(user.id,input.ref,input.requestId,input.expectedPrice);if(database.notify)await database.notify(user.id,'payments','خرید ثبت شد','جزئیات و مبلغ خرید در گردش کیف پول ثبت شده است.','/dashboard/billing/?tab=purchases','purchase:'+input.requestId).catch(()=>{});reply(200,{wallet:await database.wallet(user.id),billing:await database.billing(user.id)});return true;}
    if(!Number.isSafeInteger(input.revision)||input.revision<0)model.fail('نسخهٔ اطلاعات معتبر نیست');
    if(!['/api/dashboard/save','/api/dashboard/publish','/api/dashboard/unpublish'].includes(pathname))model.fail('مسیر پیدا نشد',404);
    const billing=database.billing?await database.billing(user.id):{};
    if(database.commerceSettings)billing.commerce=await database.commerceSettings();
    const saving=pathname.endsWith('/save'),patch=saving&&input.patch!==undefined?model.validatePatch(input.patch):null;
    // External image addresses are copied onto ResumeIt before anything is stored or published; the transaction
    // stops with EXTERNAL_IMAGES, the files are downloaded outside it, and the mutation runs once more.
    const localized=new Map(),media=require('./media.cjs');let result;
    // Images the editor sends back (as addresses or still inline) that this account already stores.
    const sent=media.hashes(patch??input.content),known=sent.size&&database.dashboardMediaKnown?await database.dashboardMediaKnown(user.id,[...sent]):new Set();
    for(let attempt=0;;attempt++){
      try{
        result=await database.mutateDashboard(user.id,input.revision,doc=>{
          if(saving){doc.content=model.content(patch?{...doc.content,...patch}:input.content,billing,doc.content,{localized,known});doc.preferences=model.preferences(input.preferences);doc.slug=doc.content.slug||null;return;}
          const k=input.kind;if(!['resume','links'].includes(k))model.fail('نوع صفحه معتبر نیست');
          if(workspace===3&&k==='resume')model.fail('جایگاه سوم مخصوص صفحهٔ لینک‌هاست');
          if(pathname.endsWith('/unpublish')){doc.pub[k].status='draft';doc.pub[k].snap=null;delete doc.published[k];return;}
          if(!user.first_name||!user.last_name||!((user.phone&&user.phone_verified)||user.email_ok))model.fail('نام، نام خانوادگی و یک راه ارتباطی تأییدشده (شماره یا ایمیل) را در تنظیمات کامل کن');
          const external=model.externalImages(doc.content).filter(url=>localized.get(url)!==url);
          if(external.some(url=>!localized.has(url)))throw Object.assign(new Error('تصویرهای اینترنتی هنوز کپی نشده‌اند'),{status:400,code:'EXTERNAL_IMAGES',urls:external,existing:external});
          doc.content=media.replaceValues(doc.content,localized);
          model.ready(doc.content,k,billing,!!doc.slug&&doc.slug===doc.content.slug);doc.slug=doc.content.slug;doc.published[k]=structuredClone(doc.content);doc.pub[k]={status:'published',version:doc.pub[k].version+1,at:Date.now(),snap:JSON.stringify(pubData(doc.content,k))};
        },{draftOnly:saving,workspace,checkAccess:!pathname.endsWith('/unpublish')});
        break;
      }catch(error){
        if(error.code!=='EXTERNAL_IMAGES'||attempt>=2)throw error;
        await (options?.remoteImages||require('./remote-image.cjs')).localize(error.urls,error.existing,localized);
      }
    }
    if(!saving&&database.notify)await database.notify(user.id,'publication',pathname.endsWith('/unpublish')?'صفحه از انتشار برداشته شد':'نسخهٔ تازه منتشر شد',input.kind==='resume'?'رزومه':'صفحهٔ لینک‌ها','/dashboard/publish/','pub:'+user.id+':'+workspace+':'+result.revision).catch(()=>{});
    const compact=input.compact===true?(saving?{revision:result.revision,slug:result.slug,preferences:result.preferences}:{revision:result.revision,slug:result.slug,pub:require('./media.cjs').lightweight({pub:result.pub},workspace).pub}):result;
    reply(200,compact);
  }catch(e){if(!e.status)require('../http/log.cjs').logFailure('dashboard',req,e);reply(e.status||503,{error:e.status?e.message:'درخواست انجام نشد؛ دوباره تلاش کن',code:['REVISION_CONFLICT','ACCOUNT_CHANGED','ADVISOR_CONFLICT','PASSWORD_REQUIRED'].includes(e.code)?e.code:undefined});}return true;
};}
module.exports={dashboardHandler};
