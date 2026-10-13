const fs = require('node:fs/promises');
const path = require('node:path');
const {gzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const { securityHeaders } = require('./security.cjs');
const {version}=require('../version.cjs');
const root = path.resolve(__dirname, '../../dist');
const assetHash=createHash('sha256'),localFiles=require('node:fs');
function fingerprint(directory){
  for(const item of localFiles.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const file=path.join(directory,item.name);
    if(item.isDirectory())fingerprint(file);
    else if(item.isFile()&&/\.(?:html|js|css|woff2|woff|ttf|png|jpe?g|svg|webp|ico)$/.test(item.name)){assetHash.update(path.relative(root,file).split(path.sep).join('/'));assetHash.update(localFiles.readFileSync(file));}
  }
}
fingerprint(root);
const assetRevision=version+'-'+assetHash.digest('hex').slice(0,16);
// Bundle only shared workspace files; editable source modules remain independent.
const bundles=new Map();
for(const [url,files] of [
  ['/dashboard/js/workspace.js',['icons','core','ui','data','imported-templates','resume-templates','state','api','account','preview','commerce','app','toolbar'].map(n=>'dashboard/js/'+n+'.js')],
  ['/dashboard/css/workspace.css',['tokens','base','shell','components','preview','pages'].map(n=>'dashboard/css/'+n+'.css')]
])bundles.set(url,Buffer.from(files.map(file=>{
  let source=localFiles.readFileSync(path.join(root,file),'utf8');
  if(file.endsWith('.css'))source=source.replace(/url\((["']?)(?!data:|https?:|\/\/)([^)"'?#]+)\1\)/g,(_,quote,url)=>`url(${quote}${path.posix.resolve('/',path.posix.dirname(file),url)}${quote})`);
  return source;
}).join(url.endsWith('.css')?'\n':'\n;\n')));
const compressedAssets=new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
Object.assign(mime,{'.jpeg':'image/jpeg','.gif':'image/gif','.woff':'font/woff','.ttf':'font/ttf'});

function requestPath(url) {
  const raw = url.split('?')[0];
  if (!raw.startsWith('/') || raw.startsWith('//') || /%2f|%5c/i.test(raw)) throw new Error('Invalid path');
  const decoded = decodeURIComponent(raw);
  if (/[\\\x00-\x1f\x7f:]/.test(decoded) || decoded.includes('//') || decoded.split('/').some(p => p === '..' || p === '.' || p.startsWith('.') || /[. ]$/.test(p))) throw new Error('Invalid path');
  return decoded;
}

async function serveStatic(req, res, pathname, origin, account) {
  const send = (status, body, type = 'text/plain; charset=utf-8') => {
    if (/^(text\/|application\/(javascript|xml)|image\/svg)/.test(type)) res.setHeader('Vary','Accept-Encoding');
    if (type.startsWith('text/html')) securityHeaders(res, origin, body.toString('utf8'), pathname.startsWith('/demo/'));
    if (status===200 && /^(text\/|application\/(javascript|xml)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length>1024) {
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
  let file = path.resolve(root, '.' + pathname);
  try {
    // Authenticate the resolved file as well as the URL (case aliases and symlinks included).
    const adminPath=pathname.toLowerCase()==='/admin'||pathname.toLowerCase().startsWith('/admin/');
    if(adminPath){const user=account&&await account(req);if(!user){res.writeHead(303,{Location:'/login/'});res.end();return;}if(!require('../admin/access.cjs').isAdmin(user)){send(403,'Forbidden');return;}}
    const guarded = pathname.toLowerCase() === '/dashboard' || pathname.toLowerCase().startsWith('/dashboard/');
    if (guarded) {
      res.setHeader('Cache-Control', 'no-store');
      if (account && !await account(req)) { res.writeHead(303, { Location: '/login/' }); res.end(); return; }
    }
    if(!bundles.has(pathname)&& (await fs.stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: pathname + '/' + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '') }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    const realFile = bundles.has(pathname)?file:await fs.realpath(file), realRoot = await fs.realpath(root);
    if (!realFile.startsWith(realRoot + path.sep)) { send(403, 'Forbidden'); return; }
    const relative = path.relative(realRoot, realFile);
    if(!adminPath&&relative.toLowerCase().startsWith('admin'+path.sep)){const user=account&&await account(req);if(!user){res.writeHead(303,{Location:'/login/'});res.end();return;}if(!require('../admin/access.cjs').isAdmin(user)){send(403,'Forbidden');return;}}
    if (relative.split(path.sep).some(p => p.startsWith('.')) || !mime[path.extname(realFile).toLowerCase()]) { send(403, 'Forbidden'); return; }
    if (!guarded && relative.toLowerCase().startsWith('dashboard' + path.sep)) {
      res.setHeader('Cache-Control', 'no-store');
      if (account && !await account(req)) { res.writeHead(303, { Location: '/login/' }); res.end(); return; }
    }
    const type=mime[path.extname(realFile).toLowerCase()];let body=bundles.get(pathname)||await fs.readFile(realFile);
    if(type.startsWith('text/html'))body=Buffer.from(body.toString('utf8').replace(/<html\b([^>]*)>/i,`<html$1 data-asset-version="${assetRevision}">`).replace(/\b(src|href)=(["'])(\/[^"'?#]+\.(?:js|css|woff2|png|svg))\2/g,(_,attr,quote,url)=>`${attr}=${quote}${url}?v=${assetRevision}${quote}`));
    if(type.startsWith('text/css'))body=Buffer.from(body.toString('utf8').replace(/url\((["']?)(?!data:|https?:|\/\/)([^)"'?#]+\.(?:woff2|woff|ttf|png|svg|webp|jpg))\1\)/g,(_,quote,url)=>`url(${quote}${url}?v=${assetRevision}${quote})`));
    send(200,body,type);
  } catch (error) {
    send(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 503, 'Page unavailable');
  }
}

module.exports = { requestPath, serveStatic, assetRevision };
