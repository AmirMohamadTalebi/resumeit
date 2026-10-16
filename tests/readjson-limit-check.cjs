const assert=require('node:assert/strict'),http=require('node:http'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
(async()=>{const server=createServer(testStore());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const status=await new Promise((resolve,reject)=>{const req=http.request(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','Transfer-Encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.write('{"phone":"');req.write('x'.repeat(3000));req.end('"}');});assert.equal(status,413);
  const sized=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'x'.repeat(3000)});assert.equal(sized.status,413);
  console.log('PASS oversized chunked and declared-length requests return 413 without resetting the client connection.');
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
