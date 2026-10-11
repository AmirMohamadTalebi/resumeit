const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
try { require('node:process').loadEnvFile(path.join(__dirname, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const { openDatabase } = require('./database.cjs');
const { authHandler } = require('./auth.cjs');
const port = Number(process.env.PORT || 5077), host = process.env.HOST || '127.0.0.1';
const root = path.join(__dirname, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };

function createServer(database, options) {
  const auth = authHandler(database, options);
  return http.createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const route = req.url.split('?')[0];
    if (await auth.handle(req, res, route)) return;
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); send(405, 'Method not allowed'); return; }
    let file;
    try {
      const rawPath = req.url.split('?')[0];
      if (!rawPath.startsWith('/') || /%2f|%5c/i.test(rawPath)) throw new Error('Invalid path');
      const pathname = decodeURIComponent(rawPath);
      if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
        let account;
        try { account = await auth.account(req); } catch { send(503, 'Database unavailable'); return; }
        if (!account) { res.writeHead(303, { Location: '/login/', 'Cache-Control': 'no-store' }); res.end(); return; }
      }
      if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) res.setHeader('Cache-Control', 'no-store');
      if (/[\\\0]/.test(pathname) || pathname.split('/').some(part => part === '..')) throw new Error('Invalid path');
      file = path.resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    } catch { send(400, 'Invalid request path'); return; }
    try {
      if ((await fs.stat(file)).isDirectory()) {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.endsWith('/')) {
          res.writeHead(308, { Location: url.pathname + '/' + url.search }); res.end(); return;
        }
        file = path.join(file, 'index.html');
      }
      const realFile = await fs.realpath(file);
      if (!realFile.startsWith(root + path.sep)) { send(403, 'Forbidden'); return; }
      send(200, await fs.readFile(realFile), mime[path.extname(file)] || 'application/octet-stream');
    } catch (err) {
      if (!['ENOENT', 'ENOTDIR', 'EISDIR'].includes(err.code)) { send(500, 'Unable to serve page'); return; }
      try { send(404, await fs.readFile(path.join(root, '404.html')), mime['.html']); }
      catch { send(404, 'Page not found'); }
    }
  });
}
if (require.main === module) (async () => {
  const database = await openDatabase();
  if (process.env.SQLITE_MIGRATION_PATH) {
    const migrated = await database.importSqlite(process.env.SQLITE_MIGRATION_PATH);
    console.log('MySQL migration verified: ' + migrated.users + ' account(s).');
  }
  if (process.env.BOOTSTRAP_PHONE && process.env.BOOTSTRAP_PASSWORD_HASH) await database.provisionAccount(process.env.BOOTSTRAP_PHONE, process.env.BOOTSTRAP_PASSWORD_HASH);
  const server = createServer(database);
  server.listen(port, host, () => console.log(`ResumeIt: http://localhost:${port} (listening on ${host})`)).on('error', err => { database.close(); console.error(err.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await database.close(); process.exit(0); }));
})().catch(() => { console.error('MySQL startup failed; check connection settings and migration source.'); process.exitCode = 1; });
module.exports = { createServer };
