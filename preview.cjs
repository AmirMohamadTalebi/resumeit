// Development preview only; share production path and browser protections.
const http = require('node:http');
const {requestPath,serveStatic}=require('./src/http/static.cjs');
const {securityHeaders}=require('./src/http/security.cjs');
http.createServer(async(req,res)=>{try{securityHeaders(res,'http://127.0.0.1:4173');await serveStatic(req,res,requestPath(req.url),'http://127.0.0.1:4173');}catch{if(!res.headersSent)res.writeHead(400).end('Invalid request');else res.destroy();}}).listen(4173,'127.0.0.1',()=>console.log('Static preview: http://127.0.0.1:4173'));
