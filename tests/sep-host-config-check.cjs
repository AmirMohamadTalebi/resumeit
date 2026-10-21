const assert=require('node:assert/strict'),http=require('node:http'),{randomUUID}=require('node:crypto');
const {createServer}=require('../src/http/server.cjs');
(async()=>{
  const f=await require('./payments-fixture.cjs')(),saved=process.env.PUBLIC_ORIGIN;
  process.env.PUBLIC_ORIGIN='https://resumeit.ir';
  const server=createServer(f.db,f.options);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const result=await new Promise((resolve,reject)=>{
      const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/payments/sep/start',method:'POST',headers:{Host:'resumeit.ir',Cookie:'ri_session='+'a'.repeat(64),Origin:'https://resumeit.ir','Content-Type':'application/json'}},res=>{
        let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));
      });
      req.on('error',reject);req.end(JSON.stringify({amount:100000,requestId:randomUUID()}));
    });
    assert.equal(result.status,200);
    const {id}=JSON.parse(result.body),callback=new URL(f.bank.tokens.get(id).url);
    assert.equal(callback.origin,'https://resumeit.ir');assert.equal(callback.port,'');
    assert.equal(callback.pathname,'/api/payments/sep/callback');
    assert.equal(callback.searchParams.get('id'),id);assert.match(callback.searchParams.get('key'),/^[a-f0-9]{64}$/);
    console.log('PASS SEP public HTTPS callback behind proxy: public port 443, independent of internal listening port; bank mocked.');
  }finally{
    if(saved===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=saved;
    await new Promise(r=>server.close(r));await f.db.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
