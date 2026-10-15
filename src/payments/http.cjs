const { readJson,securityHeaders }=require('../http/security.cjs');
const { createPayments,uuid,publicOrder }=require('./service.cjs');
const { RI }=require('../dashboard/render.cjs');
const { fail }=require('../dashboard/model.cjs');

function paymentHandler(database,auth,options) {
  const service=createPayments(database,options);
  const html=(title,body,wide=false)=>'<!doctype html><html lang="fa" dir="rtl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+RI.esc(title)+' | ResumeIt</title><link rel="stylesheet" href="/assets/daisyui.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/payments/payment.css?v='+require('../../package.json').version+'"></head><body><main class="card payment-panel'+(wide?' payment-panel--invoice':'')+'"><a class="payment-brand" href="/"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="170" height="57"></a>'+(wide?'':'<h1>'+RI.esc(title)+'</h1>')+body+'<footer class="payment-version" dir="auto">نسخهٔ '+RI.esc(require('../version.cjs').displayVersion)+'</footer></main></body></html>';
  const handler=async(req,res,path,origin)=> {
    const paymentPage=/^\/payments\/(checkout|result|(sep|zibal)\/redirect)$/.exec(path);
    if(!paymentPage&&!path.startsWith('/api/payments/'))return false;
    const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
    const page=(status,title,body,transfer=false,wide=false)=>{const output=html(title,body,wide).replace('</head>','<link rel="stylesheet" href="/notifications.css"><script defer src="/notifications.js"></script></head>');securityHeaders(res,origin,output);if(transfer){res.setHeader('Referrer-Policy','origin');res.setHeader('Content-Security-Policy',res.getHeader('Content-Security-Policy').replace("form-action 'self'","form-action 'self' https://sep.shaparak.ir"));}res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});res.end(output);};
    res.setHeader('Vary','Cookie');
    try {
      if(req.headers.host!==new URL(origin).host)fail('مبدأ درخواست معتبر نیست',403);
      const url=new URL(req.url,origin);
      const callbackRoute=/^\/api\/payments\/(sep|zibal)\/callback$/.exec(path);
      if(callbackRoute) {
        const gateway=callbackRoute[1];
        if(!['GET','POST'].includes(req.method))fail('روش درخواست معتبر نیست',405);
        if(req.method==='GET'&&!url.search) {page(200,'مسیر بازگشت پرداخت '+(gateway==='sep'?'سپ':'زیبال'),'<p>مسیر بازگشت آماده است. پرداخت پس از تأیید پذیرندگی و تنظیم درگاه فعال می‌شود.</p><a href="/dashboard/wallet/">کیف پول It</a>');return true;}
        let body=new URLSearchParams();
        if(req.method==='POST') {
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')fail('نوع درخواست معتبر نیست',415);
          const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>8192)fail('اطلاعات بازگشت بیش از حد مجاز است',413);chunks.push(chunk);}body=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        }
        const fields={};
        for(const key of ['ResNum','RefNum','TerminalId','State','Status','Amount','trackId','orderId','success']) {const values=[...url.searchParams.getAll(key),...body.getAll(key)];if(values.length>1)fail('پارامتر تکراری است');fields[key]=values[0]||'';}
        if(url.searchParams.getAll('key').length!==1)fail('شناسهٔ بازگشت معتبر نیست');
        if(url.searchParams.getAll('id').length>1)fail('شناسهٔ تکراری است');
        if(gateway==='zibal')fields.ResNum=url.searchParams.get('id')||'';
        else if(url.searchParams.has('id')&&url.searchParams.get('id')!==fields.ResNum)fail('شناسهٔ سفارش مطابقت ندارد');
        const id=await service.callback(fields,url.searchParams.get('key'),gateway);
        res.writeHead(303,{Location:'/payments/result?id='+id});res.end();return true;
      }
      const user=await auth.account(req);if(!user){if(paymentPage){res.writeHead(303,{Location:'/login/'});res.end();return true;}fail('برای ادامه وارد حسابت شو',401);}
      if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id)fail('حساب فعال عوض شده؛ صفحه را دوباره باز کن',409);
      const csrf=()=>{if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);};
      if(path==='/api/payments/invoices'&&req.method==='POST'){csrf();reply(200,await service.invoice(user,await readJson(req)));return true;}
      const invoiceRoute=/^\/api\/payments\/invoices\/([a-f0-9-]{36})(\/pay)?$/.exec(path);
      if(path==='/payments/checkout'||invoiceRoute){
        const id=invoiceRoute?invoiceRoute[1]:url.searchParams.get('id');if(!uuid.test(id||''))fail('شناسهٔ پیش‌فاکتور معتبر نیست');
        const invoice=await database.invoice(id);if(!invoice||invoice.user_id!==user.id)fail('پیش‌فاکتور پیدا نشد',404);
        const order=await database.payment(id);
        if(invoiceRoute?.[2]){if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);csrf();const input=await readJson(req);if(!['sep','zibal'].includes(input.provider))fail('درگاه معتبر نیست');reply(200,await service.start(user,{invoiceId:id},origin,input.provider));return true;}
        if(req.method!=='GET')fail('روش درخواست معتبر نیست',405);
        if(invoiceRoute){reply(200,{invoice:{id,amount:Number(invoice.amount_toman),it:Number(invoice.amount_toman)/2000,at:Number(invoice.created_at),expiresAt:Number(invoice.expires_at)},order:order?publicOrder(order):null,gateways:await service.gateways()});return true;}
        if(order?.status==='paid'){res.writeHead(303,{Location:'/payments/result?id='+id});res.end();return true;}
        page(200,'پیش‌فاکتور و پرداخت',require('./pages.cjs').checkout(invoice,user,await service.gateways(),order),false,true);return true;
      }
      if(path==='/api/payments/options'&&req.method==='GET') {reply(200,{gateways:await service.gateways(),orders:database.paymentsForUser?(await database.paymentsForUser(user.id)).map(publicOrder):[]});return true;}
      const orderRoute=/^\/api\/payments\/orders\/([a-f0-9-]{36})(\/recheck)?$/.exec(path);
      if(paymentPage||orderRoute) {
        const id=orderRoute?orderRoute[1]:url.searchParams.get('id');if(!uuid.test(id||''))fail('شناسهٔ پرداخت معتبر نیست');
        const order=await database.payment(id);if(!order||order.user_id!==user.id)fail('پرداخت پیدا نشد',404);
        if(orderRoute&&req.method==='GET'&&!orderRoute[2]) {reply(200,{order:publicOrder(order)});return true;}
        if(orderRoute&&orderRoute[2]&&req.method==='POST') {if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);await readJson(req);await service.verify(id);reply(200,{order:publicOrder(await database.payment(id))});return true;}
        if(path==='/payments/result'&&req.method==='GET'){page(200,'نتیجهٔ پرداخت',require('./pages.cjs').result(order,user),false,true);return true;}
        if(paymentPage&&req.method==='GET') {
          const gateway=paymentPage[2];if(gateway!==order.provider)fail('درگاه انتخاب‌شده مطابقت ندارد',409);
          if(order.status==='paid'||(order.ref_num&&gateway==='sep')) {res.writeHead(303,{Location:'/payments/result?id='+id});res.end();return true;}
          if(order.status!=='pending'||!order.token||Number(order.expires_at)<=Date.now())fail('این درخواست قابل پرداخت نیست؛ از کیف پول درخواست تازه ایجاد کن',409);
          if(gateway==='zibal'){if(!/^[1-9]\d{0,15}$/.test(order.token))fail('شناسهٔ زیبال معتبر نیست');const bankUrl=require('./zibal.cjs').ROOT+'/start/'+order.token;page(200,'انتقال به درگاه زیبال','<p>برای پرداخت به صفحهٔ امن زیبال منتقل می‌شوی.</p><a id="zibal-transfer" class="btn payment-button" referrerpolicy="origin" href="'+RI.esc(bankUrl)+'">ورود به درگاه زیبال</a><a href="/dashboard/wallet/">بازگشت به کیف پول</a><script>document.getElementById("zibal-transfer").click();</script>',true);return true;}
          page(200,'انتقال به درگاه سپ','<p>شارژ کیف پول: <strong>'+RI.fa(Number(order.amount_toman))+' تومان</strong>، معادل '+RI.fa(Number(order.amount_toman)/2000)+' It</p><p>اطلاعات کارت را فقط در درگاه بانکی وارد کن.</p><form id="sep-transfer" method="post" action="'+RI.esc(service.payUrl)+'"><input type="hidden" name="Token" value="'+RI.esc(order.token)+'"><input type="hidden" name="GetMethod" value="true"><button class="btn payment-button" type="submit">ورود به درگاه پرداخت</button></form><a href="/dashboard/wallet/">بازگشت به کیف پول</a><script>document.getElementById("sep-transfer").submit();</script>',true);return true;
        }
        fail('روش درخواست معتبر نیست',405);
      }
      const startRoute=/^\/api\/payments\/(sep|zibal)\/start$/.exec(path);
      if(startRoute&&req.method==='POST') {if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);reply(200,await service.start(user,await readJson(req),origin,startRoute[1]));return true;}
      fail('مسیر پیدا نشد',404);
    }catch(e){const status=e.status||(e instanceof SyntaxError?400:503),message=e.status?e.message:e instanceof SyntaxError?'ساختار درخواست معتبر نیست':'پرداخت قابل تأیید نیست؛ موجودی را بررسی کن و دوباره تلاش کن';if(paymentPage)page(status,'درخواست پرداخت انجام نشد','<p role="alert">'+RI.esc(message)+'</p><a href="/dashboard/wallet/">بازگشت به کیف پول</a>');else reply(status,{error:message});}return true;
  };
  // Pausing new checkouts must still settle orders created before the pause.
  const timer=database.duePayments?setInterval(()=>{void service.reconcile().catch(()=>{});},service.enabled?15000:60000):null;
  timer?.unref();handler.stop=()=>clearInterval(timer);handler.service=service;
  return handler;
}
module.exports={paymentHandler};
