const {readJson,securityHeaders}=require('../http/security.cjs');
const model=require('./model.cjs'),{render,RI}=require('./render.cjs');
const {gzipSync}=require('node:zlib');
const {serveStatic,publicAssets}=require('../http/static.cjs');
const pubData=(c,k)=>RI.publicationData(k,c);
function dashboardHandler(database,auth,notifications){return async(req,res,pathname,origin)=>{
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
    if(!model.slugValid(slug)&&!samplePages&&!(sub&&slug.length<=24&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
    const pages=pathPages||(database.publicWorkspace?await database.publicWorkspace(slug):{resume:await database.publicPage(slug,'resume'),links:await database.publicPage(slug,'links')});
    const linksPath=pathPages?'':'/'+(pages?.links?.content.routing?.links||'link'),resumePath=pages?.resume?.content.routing?.resume?'/'+pages.resume.content.routing.resume:'';
    const outgoing=/^\/out\/([a-z0-9_-]+)$/i.exec(route),linkRoutes=pathPages?['/','/share-image']:['/link','/links',linksPath,'/link/share-image','/links/share-image',linksPath+'/share-image'],kind=linkRoutes.includes(route)||outgoing?'links':'resume';
    if(![...linkRoutes,'/','/share-image',resumePath,resumePath+'/share-image'].includes(route)&&!outgoing){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const page=pages?.[kind];if(!page){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    if(outgoing){const link=page.content.links.items.find(x=>x.id===outgoing[1]&&x.type==='link'&&x.active);const url=link&&model.webUrl(link.url);if(!url){res.writeHead(404);res.end();return true;}if(req.method==='GET')await database.recordMetric(page.id,'click',link.id,Date.now(),page.slot||1);res.writeHead(302,{Location:url});res.end();return true;}
    if(route.endsWith('/share-image')){const img=RI.shareCard(page.content,kind).image,m=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(img||'');if(!m){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'image/'+m[1]});res.end(req.method==='HEAD'?undefined:Buffer.from(m[2],'base64'));return true;}
    const c=model.publicContent(page.content,database.billing?await database.billing(page.id):{}),esc=RI.esc,canonical=pathPages?root.protocol+'//'+domain+base:local?origin+base+(kind==='links'?linksPath:resumePath):root.protocol+'//'+slug+'.'+domain+(kind==='links'?linksPath:resumePath);
    if(pathPages)c._linksOnly=true;
    const card=RI.shareCard(c,kind),image=card.image,ogImage=/^https:\/\//.test(image||'')?image:/^data:image\//.test(image||'')?canonical+'/share-image':null;
    const templatePage=new URL(req.url,origin).searchParams.get('page')||'home',imported=kind==='resume'&&RI.IMPORTED_TEMPLATES[c.theme.resume];
    if(imported&&!Object.hasOwn(imported.pages,templatePage)){res.writeHead(404);res.end('صفحه پیدا نشد');return true;}
    const rendered=render(c,kind,page.preferences,base,templatePage).replaceAll('href="'+base+'/links"','href="'+base+linksPath+'"').replaceAll('href="'+base+'/"','href="'+base+(resumePath||'/')+'"').replaceAll('href="'+base+'/?page=','href="'+base+resumePath+'/?page=');
    const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(card.title)+'</title><meta name="description" content="'+esc(card.desc)+'"><meta name="robots" content="'+(page.preferences.indexing?'index,follow':'noindex,nofollow')+'"><link rel="canonical" href="'+esc(canonical+(imported&&templatePage!=='home'?'/?page='+templatePage:''))+'"><meta property="og:title" content="'+esc(card.title)+'"><meta property="og:description" content="'+esc(card.desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+'<link rel="icon" href="/brand/favicon.svg">'+(imported?'':'<link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/public-assets/preview.css">')+'</head><body'+(imported?' class="'+esc(imported.pages[templatePage].bodyClass)+'"':'')+'><main class="public-page">'+rendered+'</main>'+(imported?'<script src="/templates/template-runtime.js"></script>':'')+'</body></html>';
    const output=html.replace('</head>','<meta property="og:type" content="website"><meta name="twitter:card" content="'+(ogImage?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+esc(card.title)+'"><meta name="twitter:description" content="'+esc(card.desc)+'">'+(ogImage?'<meta name="twitter:image" content="'+esc(ogImage)+'">':'')+'</head>');
    securityHeaders(res,origin,output);
    res.setHeader('Cache-Control','private, no-store');
    if(req.method==='GET'){
      const marker='ri_seen_'+kind,seen=(req.headers.cookie||'').split(';').some(c=>c.trim()===marker+'=1');
      // shortcut: cookie-based visits; clearing cookies or using another browser starts a new visit.
      if(!seen){await database.recordMetric(page.id,kind,'',Date.now(),page.slot||1);res.setHeader('Set-Cookie',marker+'=1; Path='+(base||'/')+'; HttpOnly; SameSite=Lax; Max-Age=86400'+(origin.startsWith('https:')?'; Secure':''));}
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:output);return true;
  }
  if(!pathname.startsWith('/api/dashboard/'))return false;
  try{
    if(req.headers.host!==root.host)model.fail('مبدأ درخواست معتبر نیست',403);
    const user=await auth.account(req);if(!user)model.fail('دوباره وارد حسابت شو',401);
    const scoped=['document','save','publish','unpublish','slug','share-qr'].some(route=>pathname==='/api/dashboard/'+route)||pathname.startsWith('/api/dashboard/media/');
    const workspace=Number(new URL(req.url,origin).searchParams.get('workspace')||1);if(!require('../owner/settings.cjs').validSlot(workspace))model.fail('جایگاه صفحه معتبر نیست');
    activeWorkspace=workspace;
    if(scoped&&workspace>1&&req.method==='POST'&&pathname!=='/api/dashboard/unpublish'){const billing=await database.billing(user.id),owner=database.ownerUserSettings?await database.ownerUserSettings(user.id):{};if(!require('../owner/settings.cjs').workspaceAllowed(workspace,billing,owner))model.fail('این جایگاه به اشتراک فعال یا سهمیهٔ اضافهٔ مالک نیاز دارد',403);}
    if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id)model.fail('حساب فعال عوض شده است؛ این صفحه را دوباره باز کن',409,'ACCOUNT_CHANGED');
    if(notifications&&await notifications.handle(req,pathname,origin,user,reply))return true;
    if(await require('./support.cjs')(database,req,pathname,origin,user,reply))return true;
    if(req.method==='GET'){
      const media=/^\/api\/dashboard\/media\/([a-f0-9]{32})$/.exec(pathname);
      if(media){const doc=await database.loadDashboard(user.id,workspace),value=require('./media.cjs').images(doc.content).get(media[1]);if(!value)model.fail('تصویر پیدا نشد',404);const m=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(value);res.setHeader('Cache-Control','private, max-age=3600');res.setHeader('Vary','Cookie');res.writeHead(200,{'Content-Type':'image/'+m[1]});res.end(Buffer.from(m[2],'base64'));return true;}
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
      else if(pathname==='/api/dashboard/share-qr'){const kind=new URL(req.url,origin).searchParams.get('kind');if(!['resume','links'].includes(kind))model.fail('صفحه معتبر نیست');const doc=await database.loadDashboard(user.id,workspace);if(doc.pub[kind].status!=='published'||!model.slugValid(doc.content.slug))model.fail('ابتدا این صفحه را منتشر کن',409);if(workspace===3&&kind==='resume')model.fail('جایگاه سوم رزومه ندارد');const page=await database.publicPage(doc.content.slug,kind,workspace===3?'path':'subdomain');if(!page)model.fail('این صفحه در حال حاضر عمومی نیست',409);const routes=page.content.routing||{resume:'',links:'link'},url=workspace===3?'https://'+domain+'/'+doc.content.slug:'https://'+doc.content.slug+'.'+domain+(kind==='links'?'/'+routes.links:routes.resume?'/'+routes.resume:'');reply(200,{url,image:await require('qrcode').toDataURL(url,{errorCorrectionLevel:'M',margin:4,width:320})});}
      else model.fail('مسیر پیدا نشد',404);return true;
    }
    if(req.method!=='POST')model.fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')model.fail('مبدأ درخواست معتبر نیست',403);
    const input=await readJson(req,8*1024*1024);
    if(pathname==='/api/dashboard/delete'){if(input.confirm!=='DELETE')model.fail('تأیید حذف لازم است');await database.deleteAccount(user.id);res.setHeader('Set-Cookie','ri_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(origin.startsWith('https:')?'; Secure':''));reply(200,{ok:true});return true;}
    if(pathname==='/api/dashboard/wallet/purchase'){await database.purchaseWithWallet(user.id,input.ref,input.requestId,input.expectedPrice);if(database.notify)await database.notify(user.id,'payments','خرید ثبت شد','جزئیات و مبلغ خرید در گردش کیف پول ثبت شده است.','/dashboard/billing/?tab=purchases','purchase:'+input.requestId).catch(()=>{});reply(200,{wallet:await database.wallet(user.id),billing:await database.billing(user.id)});return true;}
    if(!Number.isSafeInteger(input.revision)||input.revision<0)model.fail('نسخهٔ اطلاعات معتبر نیست');
    if(!['/api/dashboard/save','/api/dashboard/publish','/api/dashboard/unpublish'].includes(pathname))model.fail('مسیر پیدا نشد',404);
    const billing=database.billing?await database.billing(user.id):{};
    if(database.commerceSettings)billing.commerce=await database.commerceSettings();
    const saving=pathname.endsWith('/save'),patch=saving&&input.patch!==undefined?model.validatePatch(input.patch):null;
    const result=await database.mutateDashboard(user.id,input.revision,doc=>{
      if(saving){doc.content=model.content(patch?{...doc.content,...patch}:input.content,billing,doc.content);doc.preferences=model.preferences(input.preferences);doc.slug=doc.content.slug||null;return;}
      const k=input.kind;if(!['resume','links'].includes(k))model.fail('نوع صفحه معتبر نیست');
      if(workspace===3&&k==='resume')model.fail('جایگاه سوم مخصوص صفحهٔ لینک‌هاست');
      if(pathname.endsWith('/unpublish')){doc.pub[k].status='draft';doc.pub[k].snap=null;delete doc.published[k];return;}
      if(!user.first_name||!user.last_name||!user.phone_verified||!user.phone)model.fail('نام، نام خانوادگی و شمارهٔ تأییدشده را در تنظیمات کامل کن');
      model.ready(doc.content,k,billing,!!doc.slug&&doc.slug===doc.content.slug);doc.slug=doc.content.slug;doc.published[k]=structuredClone(doc.content);doc.pub[k]={status:'published',version:doc.pub[k].version+1,at:Date.now(),snap:JSON.stringify(pubData(doc.content,k))};
    },{draftOnly:saving,workspace,checkAccess:!pathname.endsWith('/unpublish')});
    if(!saving&&database.notify)await database.notify(user.id,'publication',pathname.endsWith('/unpublish')?'صفحه از انتشار برداشته شد':'نسخهٔ تازه منتشر شد',input.kind==='resume'?'رزومه':'صفحهٔ لینک‌ها','/dashboard/publish/','pub:'+user.id+':'+workspace+':'+result.revision).catch(()=>{});
    reply(200,saving&&input.compact===true?{revision:result.revision,slug:result.slug,preferences:result.preferences}:result);
  }catch(e){reply(e.status||503,{error:e.status?e.message:'درخواست انجام نشد؛ دوباره تلاش کن',code:['REVISION_CONFLICT','ACCOUNT_CHANGED'].includes(e.code)?e.code:undefined});}return true;
};}
module.exports={dashboardHandler};
