const { readJson,securityHeaders }=require('../http/security.cjs');
const { createPayments,uuid,publicOrder }=require('./service.cjs');
const { RI }=require('../dashboard/render.cjs');
const { fail }=require('../dashboard/model.cjs');

function paymentHandler(database,auth,options) {
  const service=createPayments(database,options);
  const html=(title,body)=>'<!doctype html><html lang="fa" dir="rtl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+RI.esc(title)+' | ResumeIt</title><link rel="stylesheet" href="/assets/daisyui.css"><link rel="stylesheet" href="/public-assets/tokens.css"><link rel="stylesheet" href="/public-assets/base.css"><link rel="stylesheet" href="/payments/payment.css"></head><body><main class="card payment-panel"><a class="payment-brand" href="/"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="170" height="57"></a><h1>'+RI.esc(title)+'</h1>'+body+'</main></body></html>';
  const handler=async(req,res,path,origin)=> {
    if(path!=='/payments/sep/redirect'&&!path.startsWith('/api/payments/'))return false;
    const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
    const page=(status,title,body,transfer=false)=>{const output=html(title,body);securityHeaders(res,origin,output);if(transfer){res.setHeader('Referrer-Policy','origin');res.setHeader('Content-Security-Policy',res.getHeader('Content-Security-Policy').replace("form-action 'self'","form-action 'self' https://sep.shaparak.ir"));}res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});res.end(output);};
    res.setHeader('Vary','Cookie');
    try {
      if(req.headers.host!==new URL(origin).host)fail('مبدأ درخواست معتبر نیست',403);
      const url=new URL(req.url,origin);
      if(path==='/api/payments/sep/callback') {
        if(!['GET','POST'].includes(req.method))fail('روش درخواست معتبر نیست',405);
        if(req.method==='GET'&&!url.search) {page(200,'مسیر بازگشت پرداخت سپ','<p>مسیر بازگشت آماده است. پرداخت پس از تأیید پذیرندگی و تنظیم درگاه فعال می‌شود.</p><a href="/dashboard/wallet/">کیف پول It</a>');return true;}
        let body=new URLSearchParams();
        if(req.method==='POST') {
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')fail('نوع درخواست معتبر نیست',415);
          const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>8192)fail('اطلاعات بازگشت بیش از حد مجاز است',413);chunks.push(chunk);}body=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        }
        const fields={};
        for(const key of ['ResNum','RefNum','TerminalId','State','Status','Amount']) {const values=[...url.searchParams.getAll(key),...body.getAll(key)];if(values.length>1)fail('پارامتر تکراری است');fields[key]=values[0]||'';}
        if(url.searchParams.getAll('key').length!==1)fail('شناسهٔ بازگشت معتبر نیست');
        const id=await service.callback(fields,url.searchParams.get('key'));
        res.writeHead(303,{Location:'/dashboard/wallet/?payment='+id});res.end();return true;
      }
      const user=await auth.account(req);if(!user)fail('برای ادامه وارد حسابت شو',401);
      if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id)fail('حساب فعال عوض شده؛ صفحه را دوباره باز کن',409);
      if(path==='/api/payments/options'&&req.method==='GET') {reply(200,{gateways:service.gateways(),orders:database.paymentsForUser?(await database.paymentsForUser(user.id)).map(publicOrder):[]});return true;}
      const orderRoute=/^\/api\/payments\/orders\/([a-f0-9-]{36})(\/recheck)?$/.exec(path);
      if(path==='/payments/sep/redirect'||orderRoute) {
        const id=orderRoute?orderRoute[1]:url.searchParams.get('id');if(!uuid.test(id||''))fail('شناسهٔ پرداخت معتبر نیست');
        const order=await database.payment(id);if(!order||order.user_id!==user.id)fail('پرداخت پیدا نشد',404);
        if(orderRoute&&req.method==='GET'&&!orderRoute[2]) {reply(200,{order:publicOrder(order)});return true;}
        if(orderRoute&&orderRoute[2]&&req.method==='POST') {if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);await readJson(req);await service.verify(id);reply(200,{order:publicOrder(await database.payment(id))});return true;}
        if(path==='/payments/sep/redirect'&&req.method==='GET') {
          if(order.status==='paid'||order.ref_num) {res.writeHead(303,{Location:'/dashboard/wallet/?payment='+id});res.end();return true;}
          if(!service.enabled||order.status!=='pending'||!order.token||Number(order.expires_at)<=Date.now())fail('این درخواست قابل پرداخت نیست؛ از کیف پول درخواست تازه ایجاد کن',409);
          page(200,'انتقال به درگاه سپ','<p>شارژ کیف پول: <strong>'+RI.fa(Number(order.amount_toman))+' تومان</strong>، معادل '+RI.fa(Number(order.amount_toman)/2000)+' It</p><p>اطلاعات کارت را فقط در درگاه بانکی وارد کن.</p><form id="sep-transfer" method="post" action="'+RI.esc(service.payUrl)+'"><input type="hidden" name="Token" value="'+RI.esc(order.token)+'"><input type="hidden" name="GetMethod" value="true"><button class="btn payment-button" type="submit">ورود به درگاه پرداخت</button></form><a href="/dashboard/wallet/">بازگشت به کیف پول</a><script>document.getElementById("sep-transfer").submit();</script>',true);return true;
        }
        fail('روش درخواست معتبر نیست',405);
      }
      if(path==='/api/payments/sep/start'&&req.method==='POST') {if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);reply(200,await service.start(user,await readJson(req),origin));return true;}
      fail('مسیر پیدا نشد',404);
    }catch(e){reply(e.status||(e instanceof SyntaxError?400:503),{error:e.status?e.message:e instanceof SyntaxError?'ساختار درخواست معتبر نیست':'پرداخت قابل تأیید نیست؛ موجودی را بررسی کن و دوباره تلاش کن'});}return true;
  };
  // Pausing new checkouts must still settle orders created before the pause.
  const timer=database.duePayments?setInterval(()=>{void service.reconcile().catch(()=>{});},service.enabled?15000:60000):null;
  timer?.unref();handler.stop=()=>clearInterval(timer);handler.service=service;
  return handler;
}
module.exports={paymentHandler};
