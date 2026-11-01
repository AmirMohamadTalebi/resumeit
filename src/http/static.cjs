const {analyticsTag}=require('./analytics.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const {gzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const { securityHeaders } = require('./security.cjs');
const {version}=require('../version.cjs');
const root = path.resolve(__dirname, '../../dist');
const publicAssets=new Map([['/public-assets/tokens.css','dashboard/css/tokens.css'],['/public-assets/base.css','dashboard/css/base.css'],['/public-assets/preview.css','dashboard/css/preview.css'],['/assets/fonts/Vazirmatn.woff2','dashboard/assets/fonts/Vazirmatn.woff2'],['/brand/resumeit-logo-v1.png','brand/resumeit-logo-v1.png'],['/brand/favicon.svg','brand/favicon.svg']]);
const assetHash=createHash('sha256'),localFiles=require('node:fs');
publicAssets.set('/public-assets/icons.js','dashboard/js/icons.js');
publicAssets.set('/public-assets/projects.js','dashboard/js/projects.js');
publicAssets.set('/public-assets/inbox.js','dashboard/js/inbox-form.js');
publicAssets.set('/public-assets/charts.js','dashboard/js/charts.js');
publicAssets.set('/public-assets/fandogh.js','dashboard/js/fandogh.js');
// Fandogh's full-body art also appears on the 404 page, which people's subdomains serve too.
publicAssets.set('/brand/fandogh/full.webp','brand/fandogh/full.webp');
publicAssets.set('/public-assets/fandogh.css','dashboard/css/fandogh.css');
publicAssets.set('/public-assets/charts.css','dashboard/css/charts.css');
function fingerprint(directory){
  for(const item of localFiles.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const file=path.join(directory,item.name);
    if(item.isDirectory())fingerprint(file);
    else if(item.isFile()&&/\.(?:html|js|json|css|woff2|woff|ttf|png|jpe?g|svg|webp|ico)$/.test(item.name)){assetHash.update(path.relative(root,file).split(path.sep).join('/'));assetHash.update(localFiles.readFileSync(file));}
  }
}
fingerprint(root);
const assetRevision=version+'-'+assetHash.digest('hex').slice(0,16);
// Bundle only shared workspace files; editable source modules remain independent.
const bundles=new Map();
for(const [url,files] of [
  ['/dashboard/js/workspace.js',['icons','core','ui','data','imported-templates','resume-templates','state','api','account','projects','support-files','preview','template-shabtab','commerce','workspace-tools','reset-ui','notification-channels','charts','advisor-brain','notice-center','qr-poster','app','fandogh','assistant-edits','fandogh-core','assistant-pet','coral','toolbar','liquid'].map(n=>'dashboard/js/'+n+'.js').concat('templates/vista-runtime.js')],
  ['/dashboard/css/workspace.css',['tokens','base','shell','components','preview','pages','charts','abgoon','performance','resume-studio','liquid','nova','fandogh','pet','fandogh-studio','night','hub','hub-publish','notice-center','quick-access'].map(n=>'dashboard/css/'+n+'.css')]
])bundles.set(url,Buffer.from(files.map(file=>{
  let source=localFiles.readFileSync(path.join(root,file),'utf8');
  if(file.endsWith('.css'))source=source.replace(/url\((["']?)(?!data:|https?:|\/\/)([^)"'?#]+)\1\)/g,(_,quote,url)=>`url(${quote}${path.posix.resolve('/',path.posix.dirname(file),url)}${quote})`);
  return source;
}).join(url.endsWith('.css')?'\n':'\n;\n')));
const compressedAssets=new Map();
// dist is fixed for the process lifetime, so its real path is resolved once.
const realRootPath=fs.realpath(root);
const fileBodies=new Map(),fileCacheLimit=32*1024*1024,rewrittenBodies=new Map();
let fileCacheBytes=0;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
Object.assign(mime,{'.jpeg':'image/jpeg','.gif':'image/gif','.woff':'font/woff','.ttf':'font/ttf'});
mime['.json']='application/json; charset=utf-8';

function requestPath(url) {
  const raw = url.split('?')[0];
  if (!raw.startsWith('/') || raw.startsWith('//') || /%2f|%5c/i.test(raw)) throw new Error('Invalid path');
  const decoded = decodeURIComponent(raw);
  if (/[\\\x00-\x1f\x7f:]/.test(decoded) || decoded.includes('//') || decoded.split('/').some(p => p === '..' || p === '.' || p.startsWith('.') || /[. ]$/.test(p))) throw new Error('Invalid path');
  return decoded;
}

async function serveStatic(req, res, pathname, origin, account, restricted) {
  const signin=async()=>{
    if(restricted&&await restricted(req))return '/account-status/';
    const destination=require('../auth/return-to.cjs')(req.url);
    if(destination==='/dashboard/')return '/login/';
    return '/login/?next='+encodeURIComponent(destination);
  };
  const send = (status, body, type = 'text/plain; charset=utf-8') => {
    if(status===200&&/^\/dashboard\/template-data\/(vista|satiar)\.json$/.test(pathname))res.setHeader('X-Uncompressed-Length',body.length);
    if (/^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(type)) res.setHeader('Vary','Accept-Encoding');
    if (type.startsWith('text/html')) securityHeaders(res, origin, body.toString('utf8'), pathname.startsWith('/demo/'));
    if (status===200 && /^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length>1024) {
      let cached=compressedAssets.get(pathname);if(!cached||!cached.source.equals(body)){cached={source:body,body:gzipSync(body)};if(compressedAssets.size>=64)compressedAssets.delete(compressedAssets.keys().next().value);compressedAssets.set(pathname,cached);}
      body=cached.body;res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');
    }
    if(status===200 && !type.startsWith('text/html')) {
      const etag='"'+createHash('sha256').update(body).digest('hex')+'"';
      const versioned=new URL(req.url,origin).searchParams.get('v')===assetRevision;
      res.setHeader('Cache-Control',versioned?'private, max-age=31536000, immutable':'private, max-age=0, must-revalidate');
      res.setHeader('ETag',etag);
      if((req.headers['if-none-match']||'').split(',').map(v=>v.trim()).includes(etag)) {
        res.removeHeader('Content-Encoding'); res.writeHead(304); res.end(); return;
      }
    }
    res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); send(405, 'Method not allowed'); return; }
  const publicAsset=publicAssets.has(pathname);
  let file = path.resolve(root, publicAssets.get(pathname) || '.' + pathname);
  const sample=/^\/(resume|link)([a-z0-9-]+)\/$/.exec(pathname),samplePage=new URL(req.url,origin).searchParams.get('page');
  if(sample&&samplePage&&/^[a-z0-9]+$/.test(samplePage)&&samplePage!=='home')file=path.join(file,samplePage+'.html');
  const workspacePage=/^\/dashboard\/(support|notifications|studio|messages|fandogh|assistant)\/$/.exec(pathname);
  if(workspacePage)file=path.join(root,'dashboard/index.html');
  const retentionPage=pathname==='/admin/retention/';if(retentionPage)file=path.join(root,'admin/health/index.html');
  // Fandogh's settings hold provider keys and allowances: the owner's page, like retention.
  const ownerPage=retentionPage||pathname==='/admin/assistant/';
  try {
    const staffPath=pathname.toLowerCase()==='/staff'||pathname.toLowerCase().startsWith('/staff/');
    if(staffPath){res.setHeader('Cache-Control','no-store');const user=account&&await account(req);if(!user){res.writeHead(303,{Location:await signin()});res.end();return;}if(!require('../admin/access.cjs').isSupport(user)){send(403,'Forbidden');return;}}
    // Authenticate the resolved file as well as the URL (case aliases and symlinks included).
    const adminPath=pathname.toLowerCase()==='/admin'||pathname.toLowerCase().startsWith('/admin/');
    if(adminPath){const user=account&&await account(req);if(!user){res.writeHead(303,{Location:await signin()});res.end();return;}if(!require('../admin/access.cjs').isAdmin(user)||ownerPage&&!require('../admin/access.cjs').isOwner(user)){send(403,'Forbidden');return;}}
    const guarded = pathname.toLowerCase() === '/dashboard' || pathname.toLowerCase().startsWith('/dashboard/');
    if (guarded) {
      res.setHeader('Cache-Control', 'no-store');
      // Versionable files (JS/CSS/fonts/images/data) hold shared code, not user data: a recently verified session is enough.
      const check=account&&/\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|json)$/i.test(pathname)&&account.asset?account.asset:account;
      if (check && !await check(req)) { res.writeHead(303, { Location: await signin() }); res.end(); return; }
    }
    if(!bundles.has(pathname)&& (await fs.stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: pathname + '/' + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '') }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    const realFile = bundles.has(pathname)?file:await fs.realpath(file), realRoot = await realRootPath;
    if (!realFile.startsWith(realRoot + path.sep)) { send(403, 'Forbidden'); return; }
    const relative = path.relative(realRoot, realFile);
    if(!staffPath&&relative.toLowerCase().startsWith('staff'+path.sep)){const user=account&&await account(req);if(!require('../admin/access.cjs').isSupport(user)){send(403,'Forbidden');return;}}
    if(!adminPath&&relative.toLowerCase().startsWith('admin'+path.sep)){const user=account&&await account(req);if(!user){res.writeHead(303,{Location:await signin()});res.end();return;}if(!require('../admin/access.cjs').isAdmin(user)){send(403,'Forbidden');return;}}
    if (relative.split(path.sep).some(p => p.startsWith('.')) || !mime[path.extname(realFile).toLowerCase()]) { send(403, 'Forbidden'); return; }
    if (!guarded && !publicAsset && relative.toLowerCase().startsWith('dashboard' + path.sep)) {
      res.setHeader('Cache-Control', 'no-store');
      if (account && !await account(req)) { res.writeHead(303, { Location: await signin() }); res.end(); return; }
    }
    const type=mime[path.extname(realFile).toLowerCase()];let body=bundles.get(pathname)||fileBodies.get(realFile);
    if(!body){
      body=await fs.readFile(realFile);
      // Static releases are immutable during a process lifetime; restart after changing dist.
      if(!fileBodies.has(realFile)&&body.length<=fileCacheLimit){
        while(fileCacheBytes+body.length>fileCacheLimit){const oldest=fileBodies.keys().next().value;fileCacheBytes-=fileBodies.get(oldest).length;fileBodies.delete(oldest);}
        fileBodies.set(realFile,body);fileCacheBytes+=body.length;
      }
    }
    // The rewrites below depend only on the file and the URL path, so reuse them instead of redoing the regex work per request.
    const rewriteKey=/^text\/(html|css)/.test(type)?pathname+'\0'+realFile:null,cached=rewriteKey&&rewrittenBodies.get(rewriteKey);
    if(cached){send(200,cached,type);return;}
    if(workspacePage)body=Buffer.from(body.toString('utf8').replace('data-page="home"','data-page="'+workspacePage[1]+'"').replace('/dashboard/js/pages/home.js','/dashboard/js/pages/'+workspacePage[1]+'.js'));
    if(retentionPage)body=Buffer.from(body.toString('utf8').replace('data-section="health"','data-section="retention"').replace('<title>','<title>پاک‌سازی و بایگانی | '));
    if(type.startsWith('text/html')&&!pathname.startsWith('/templates/')&&!body.includes('/notifications.js'))body=Buffer.from(body.toString('utf8').replace('</head>','<link rel="stylesheet" href="/notifications.css"><script defer src="/notifications.js"></script></head>'));
    if(type.startsWith('text/html')&&!pathname.startsWith('/templates/'))body=Buffer.from(body.toString('utf8').replace('</head>','<link rel="stylesheet" href="/control-surfaces.css">'+analyticsTag(pathname)+'</head>'));
    if(type.startsWith('text/html')&&pathname.toLowerCase().startsWith('/admin/'))body=Buffer.from(body.toString('utf8').replace('<script defer src="/admin/admin.js">','<link rel="stylesheet" href="/admin/owner-controls.css"><link rel="stylesheet" href="/public-assets/charts.css"><script defer src="/public-assets/charts.js"></script><script defer src="/admin/owner-controls.js"></script><script defer src="/admin/admin.js">'));
    if(type.startsWith('text/html'))body=Buffer.from(body.toString('utf8').replace(/<html\b([^>]*)>/i,`<html$1 data-asset-version="${assetRevision}">`).replace(/\b(src|href)=(["'])(\/[^"'?#]+\.(?:js|css|woff2|png|svg))\2/g,(_,attr,quote,url)=>`${attr}=${quote}${url}?v=${assetRevision}${quote}`));
    if(type.startsWith('text/css'))body=Buffer.from(body.toString('utf8').replace(/url\((["']?)(?!data:|https?:|\/\/)([^)"'?#]+\.(?:woff2|woff|ttf|png|svg|webp|jpg))\1\)/g,(_,quote,url)=>`url(${quote}${url}?v=${assetRevision}${quote})`));
    if(rewriteKey){if(rewrittenBodies.size>=256)rewrittenBodies.delete(rewrittenBodies.keys().next().value);rewrittenBodies.set(rewriteKey,body);}
    send(200,body,type);
  } catch (error) {
    if(['ENOENT','ENOTDIR','EISDIR'].includes(error.code))require('./not-found.cjs').notFound(req,res,pathname,{home:origin?new URL('/',origin).href:'/'});
    else send(503,'Page unavailable');
  }
}

module.exports = { requestPath, serveStatic, assetRevision, publicAssets };
