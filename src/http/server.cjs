const http = require('node:http');
const { authHandler } = require('../auth/auth.cjs');
const { publicOrigin, securityHeaders } = require('./security.cjs');
const { requestPath, serveStatic } = require('./static.cjs');

function createServer(database, options) {
  const auth = authHandler(database, options);
  const server = http.createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    securityHeaders(res, '');
    try {
      let origin, pathname;
      try { origin = publicOrigin(req); pathname = requestPath(req.url); }
      catch { res.writeHead(400); res.end('Invalid request'); return; }
      securityHeaders(res, origin);
      if (await auth.handle(req, res, pathname)) return;
      if (pathname.startsWith('/api/')) { res.writeHead(404); res.end('Not found'); return; }
      await serveStatic(req, res, pathname, origin, auth.account);
    } catch {
      if (!res.headersSent) { res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'درخواست انجام نشد؛ کمی بعد دوباره امتحان کن' })); }
      else res.destroy();
    }
  });
  server.setTimeout(20000);
  server.maxRequestsPerSocket = 100;
  return server;
}
module.exports = { createServer };
