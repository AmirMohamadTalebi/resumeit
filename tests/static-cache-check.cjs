const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('../src/http/server.cjs'),{assetRevision}=require('../src/http/static.cjs');
(async()=>{
  delete process.env.PUBLIC_ORIGIN;
  const fixture=await require('./admin-fixture.cjs')(),server=createServer(fixture.db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const root=path.resolve(__dirname,'../dist'),originalRead=fs.readFile,reads=new Map();
  const large=['brand/resumeit-mark-v1.png','brand/resumeit-logo-v1.png','brand/template-vista-thumb.png','brand/template-satiar-thumb.png','brand/favicon.svg'];
  fs.readFile=async(file,...args)=>{
    const relative=path.relative(root,String(file)).split(path.sep).join('/');
    reads.set(relative,(reads.get(relative)||0)+1);
    if(large.includes(relative))return Buffer.alloc(8*1024*1024);
    if(relative==='brand/it-coin.svg')return Buffer.alloc(33*1024*1024);
    return originalRead(file,...args);
  };
  const get=(url,headers={})=>new Promise((resolve,reject)=>{
    const req=http.get({hostname:'127.0.0.1',port:server.address().port,path:url,headers},res=>{
      let size=0;res.on('data',b=>size+=b.length);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,size}));
    });req.on('error',reject);
  });
  try{
    const first=await get('/version.js?v='+assetRevision);
    assert.equal(first.status,200);assert(first.headers['cache-control'].includes('immutable'));
    const repeats=await Promise.all([get('/version.js'),get('/version.js?v='+assetRevision)]);
    assert(repeats.every(r=>r.status===200&&r.size===first.size));assert.equal(reads.get('version.js'),1);
    assert.equal((await get('/version.js',{'If-None-Match':first.headers.etag})).status,304);
    assert.equal(reads.get('version.js'),1);
    // Concurrent cold requests must not count the same entry twice in the byte budget.
    await Promise.all([get('/site-shell.js'),get('/site-shell.js')]);const coldReads=reads.get('site-shell.js');
    await get('/site-shell.js');assert.equal(reads.get('site-shell.js'),coldReads);
    for(const route of ['/about/','/contact/','/terms/']){
      const response=await get(route);assert.equal(response.status,200);assert(response.size>1000);assert.equal(response.headers['cache-control'],'no-store');
    }
    for(const [asset,authorized]of [['/dashboard/js/app.js','b'],['/admin/admin.js','a']]){
      const headers={Cookie:'ri_session='+authorized.repeat(64)};
      assert.equal((await get(asset,headers)).status,200);
      assert.equal((await get(asset)).status,303,'cached private files still require login');
      if(asset.startsWith('/admin/'))assert.equal((await get(asset,{Cookie:'ri_session='+'b'.repeat(64)})).status,403);
      assert.equal((await get(asset,headers)).status,200);
      assert.equal(reads.get(asset.slice(1)),1);
    }
    for(const [url,file] of [['/public-assets/preview.css','dashboard/css/preview.css'],['/assets/fonts/Vazirmatn.woff2','dashboard/assets/fonts/Vazirmatn.woff2']]) {
      const first=await get(url+'?v='+assetRevision);assert.equal(first.status,200);assert(first.headers.etag);assert(first.headers['cache-control'].includes('immutable'));
      assert.equal((await get(url)).status,200);assert.equal(reads.get(file),1,'public aliases use the shared file cache');
      assert.equal((await get(url,{'If-None-Match':first.headers.etag})).status,304);
      assert.equal((await get('/'+file)).status,303,'the source dashboard path remains private');
      const head=await fetch('http://127.0.0.1:'+server.address().port+url,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.text()).length,0);
    }
    const zipped=await get('/public-assets/preview.css',{'Accept-Encoding':'gzip'});assert.equal(zipped.headers['content-encoding'],'gzip');
    for(const file of large)assert.equal((await get('/'+file)).status,200);
    assert.equal(reads.get(large[0]),1);await get('/'+large[0]);assert.equal(reads.get(large[0]),2,'old entries are evicted at the byte limit');
    await get('/brand/it-coin.svg');await get('/brand/it-coin.svg');assert.equal(reads.get('brand/it-coin.svg'),2,'oversized files bypass the cache');
    assert.equal((await get('/../.env')).status,400);
    console.log('PASS: warm/concurrent static reads, public alias font/CSS cache/ETag/gzip/HEAD, source path authorization, info pages, byte-budget eviction and oversized bypass.');
  }finally{fs.readFile=originalRead;await new Promise(r=>server.close(r));await fixture.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
