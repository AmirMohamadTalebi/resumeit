const fs = require('node:fs/promises');
const path = require('node:path');
const {gzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const { securityHeaders } = require('./security.cjs');
const root = path.resolve(__dirname, '../../dist');
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
      res.setHeader('Cache-Control','private, max-age=0, must-revalidate');
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
    const guarded = pathname.toLowerCase() === '/dashboard' || pathname.toLowerCase().startsWith('/dashboard/');
    if (guarded) {
      res.setHeader('Cache-Control', 'no-store');
      if (account && !await account(req)) { res.writeHead(303, { Location: '/login/' }); res.end(); return; }
    }
    if ((await fs.stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: pathname + '/' + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '') }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    const realFile = await fs.realpath(file), realRoot = await fs.realpath(root);
    if (!realFile.startsWith(realRoot + path.sep)) { send(403, 'Forbidden'); return; }
    const relative = path.relative(realRoot, realFile);
    if (relative.split(path.sep).some(p => p.startsWith('.')) || !mime[path.extname(realFile).toLowerCase()]) { send(403, 'Forbidden'); return; }
    if (!guarded && relative.toLowerCase().startsWith('dashboard' + path.sep)) {
      res.setHeader('Cache-Control', 'no-store');
      if (account && !await account(req)) { res.writeHead(303, { Location: '/login/' }); res.end(); return; }
    }
    send(200, await fs.readFile(realFile), mime[path.extname(realFile).toLowerCase()]);
  } catch (error) {
    send(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 503, 'Page unavailable');
  }
}

module.exports = { requestPath, serveStatic };
