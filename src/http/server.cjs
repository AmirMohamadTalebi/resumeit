const http = require('node:http');
const { authHandler } = require('../auth/auth.cjs');
const { publicOrigin, securityHeaders } = require('./security.cjs');
const { requestPath, serveStatic } = require('./static.cjs');

function createServer(database, options) {
  const notifications=require('../notifications/service.cjs')(database,options?.notifications);
  // Login codes by email go through the same mail provider as notifications.
  const auth = authHandler(database, { mailer: notifications.provider, ...options });
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
      // An invite link (?ref=code) keeps its code for 30 days so it can be attached at sign-up; nothing else is tracked.
      if (req.method === 'GET') { const ref = /^\/(?:\?|$)/.test(req.url) && new URL(req.url, origin).searchParams.get('ref'); if (ref && /^[a-z0-9]{8}$/.test(ref)) res.appendHeader('Set-Cookie', `ri_ref=${ref}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${origin.startsWith('https:') ? '; Secure' : ''}`); }
      if (await notifications.marketing.handlePublic(req,res,pathname)) return;
      if (await payments(req,res,pathname,origin)) return;
      if (await admin(req,res,pathname,origin)) return;
      if (await dashboard(req,res,pathname,origin)) return;
      if (await auth.handle(req, res, pathname)) return;
      if (pathname.startsWith('/api/')) { res.writeHead(404); res.end('Not found'); return; }
      await serveStatic(req, res, pathname, origin, auth.account,auth.restricted);
    } catch (error) {
      require('./log.cjs').logFailure('server', req, error);
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
  // Dashboard images no page has used for a day are removed.
  if(database.sweepDashboardMedia){let sweep;server.on('listening',()=>{sweep=setInterval(()=>database.sweepDashboardMedia().catch(()=>{}),3600000);sweep.unref();});server.on('close',()=>clearInterval(sweep));}
  return server;
}
module.exports = { createServer };
