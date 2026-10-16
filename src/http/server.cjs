const http = require('node:http');
const { authHandler } = require('../auth/auth.cjs');
const { publicOrigin, securityHeaders } = require('./security.cjs');
const { requestPath, serveStatic } = require('./static.cjs');

function createServer(database, options) {
  const auth = authHandler(database, options);
  const notifications=require('../notifications/service.cjs')(database,options?.notifications);
  const dashboard=require('../dashboard/http.cjs').dashboardHandler(database,auth,notifications,options);
  const admin=require('../admin/http.cjs').adminHandler(database,auth,notifications);
  const payments=require('../payments/http.cjs').paymentHandler(database,auth,options?.payments);
  const server = http.createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    securityHeaders(res, '');
    try {
      let origin, pathname;
      try { origin = publicOrigin(req); pathname = requestPath(req.url); }
      catch { res.writeHead(400); res.end('Invalid request'); return; }
      securityHeaders(res, origin);
      if (await payments(req,res,pathname,origin)) return;
      if (await admin(req,res,pathname,origin)) return;
      if (await dashboard(req,res,pathname,origin)) return;
      if (await auth.handle(req, res, pathname)) return;
      if (pathname.startsWith('/api/')) { res.writeHead(404); res.end('Not found'); return; }
      await serveStatic(req, res, pathname, origin, auth.account,auth.restricted);
    } catch {
      if (!res.headersSent) { res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'درخواست انجام نشد؛ کمی بعد دوباره امتحان کن' })); }
      else res.destroy();
    }
  });
  server.setTimeout(20000);
  server.maxRequestsPerSocket = 100;
  server.on('close',payments.stop);
  server.on('listening',notifications.start);
  server.on('close',notifications.stop);
  if(database.expireAccountNotices){let expiry;server.on('listening',()=>{expiry=setInterval(()=>database.expireAccountNotices().catch(()=>{}),30000);expiry.unref();});server.on('close',()=>clearInterval(expiry));}
  return server;
}
module.exports = { createServer };
