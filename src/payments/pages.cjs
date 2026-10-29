const {RI}=require('../dashboard/render.cjs');
const esc=RI.esc;
const labels={creating:'در حال آماده‌سازی',pending:'در انتظار پرداخت یا تأیید',verifying:'در حال تأیید بانک',paid:'پرداخت موفق',cancelled:'پرداخت لغو شد',expired:'مهلت پرداخت تمام شد',failed:'پرداخت ناموفق',review:'نیازمند بررسی پشتیبانی',reversed:'برگشت وجه تأیید شد'};
const money=n=>RI.fa(Number(n))+' تومان';
const date=n=>new Date(Number(n)).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'});
const icon=(path,size=22)=>'<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const glyph={
  card:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M10 8v8m4-8v8M8 8h8"/>',
  print:'<path d="M7 8V3h10v5M7 17H5V8h14v9h-2M7 14h10v7H7z"/>',check:'<path d="m6 12 4 4 8-8"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  wallet:'<path d="M4 7a2 2 0 0 1 2-2h12v4"/><path d="M4 7v10a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1.2"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>'};
const credit=row=>Number(row.credit_units??row.amount_toman)/2000;
const number=id=>'RI-'+String(id).replace(/-/g,'').slice(0,8).toUpperCase();
const steps=current=>'<ol class="pay-steps" aria-label="مراحل پرداخت">'+['بررسی پیش‌فاکتور','انتخاب درگاه','پرداخت در بانک','نتیجه'].map((label,i)=>'<li class="'+(i<current?'is-done':i===current?'is-current':'')+'"'+(i===current?' aria-current="step"':'')+'><span>'+(i<current?icon(glyph.check,14):RI.fa(i+1))+'</span>'+label+'</li>').join('')+'</ol>';

// The printable document: issuer, customer, dates, one line item and the total. Printing shows only this.
function details(row,user,paid=false){
  const name=[user.first_name,user.last_name].filter(Boolean).join(' ')||user.name||'کاربر ResumeIt',it=credit(row),rate=Number(row.it_rate||2000);
  return '<article class="invoice-paper'+(paid?' is-paid':'')+'" aria-labelledby="invoice-title">'+
   '<header class="inv-head"><div class="inv-brand"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="150" height="50"><span>کیف پول It</span></div><div class="inv-title"><h2 id="invoice-title">'+(paid?'فاکتور شارژ کیف پول':'پیش‌فاکتور شارژ کیف پول')+'</h2><span class="inv-badge'+(paid?' is-paid':'')+'">'+(paid?icon(glyph.check,14)+'پرداخت شده':icon(glyph.clock,14)+'پرداخت نشده')+'</span></div></header>'+
   '<dl class="inv-ids"><div><dt>شمارهٔ '+(paid?'فاکتور':'پیش‌فاکتور')+'</dt><dd dir="ltr">'+number(row.id)+'</dd></div><div><dt>تاریخ صدور (تهران)</dt><dd>'+date(row.created_at)+'</dd></div>'+(!paid&&row.expires_at?'<div><dt>مهلت پرداخت</dt><dd>'+date(row.expires_at)+'</dd></div>':'')+(paid&&row.updated_at?'<div><dt>تاریخ پرداخت</dt><dd>'+date(row.updated_at)+'</dd></div>':'')+'</dl>'+
   '<div class="inv-parties"><section><h3>صادرکننده</h3><p><b>ResumeIt</b></p><p dir="ltr">resumeit.ir</p><p dir="ltr">pokcidman@gmail.com</p></section><section><h3>خریدار</h3><p><b>'+esc(name)+'</b></p><p dir="ltr">'+esc(user.phone||'—')+'</p><p class="inv-muted">حساب کاربری ResumeIt</p></section></div>'+
   '<table class="inv-table"><caption class="inv-sr">اقلام '+(paid?'فاکتور':'پیش‌فاکتور')+'</caption><thead><tr><th scope="col">شرح</th><th scope="col">مقدار</th><th scope="col">نرخ هر It</th><th scope="col">مبلغ</th></tr></thead><tbody><tr><td><span class="inv-item">'+icon(glyph.coin,18)+'<span><b>اعتبار کیف پول ResumeIt</b><small>قابل استفاده برای اشتراک، قالب و فونت</small></span></span></td><td data-label="مقدار" dir="ltr">'+RI.fa(it)+' It</td><td data-label="نرخ هر It">'+money(rate)+'</td><td data-label="مبلغ">'+money(row.amount_toman)+'</td></tr></tbody></table>'+
   '<div class="invoice-total"><span>'+(paid?'مبلغ پرداخت‌شده':'مبلغ قابل پرداخت')+'</span><strong>'+money(row.amount_toman)+'</strong></div>'+
   '<p class="inv-note">'+(paid?'این فاکتور مربوط به شارژ تأییدشدهٔ کیف پول است و اعتبار آن به همین حساب اضافه شده است.':'اعتبار پس از تأیید بانک به کیف پول همین حساب اضافه می‌شود. تا پرداخت انجام نشود، هیچ مبلغی کسر نمی‌شود.')+'</p>'+
   '<footer class="inv-foot"><span dir="ltr">'+esc(row.id)+'</span><span>پشتیبانی: resumeit.ir/contact</span></footer></article>';
}

function checkout(invoice,user,gateways,order){
  const chosen=order?.provider,available=gateways.some(g=>g.enabled),expired=Number(invoice.expires_at)<=Date.now(),blocked=expired||!!order&&['failed','cancelled','expired','review','reversed'].includes(order.status);
  const firstOpen=gateways.findIndex(g=>g.enabled);
  const option=(g,i)=>{const off=!g.enabled||chosen&&chosen!==g.id,on=chosen===g.id||!chosen&&i===firstOpen;return '<label class="gateway-option'+(!g.enabled?' gateway-option--disabled':'')+'"><input type="radio" name="provider" value="'+g.id+'" '+(off?'disabled ':'')+(on?'checked ':'')+'><span class="gateway-mark">'+icon(glyph.card)+'</span><span class="gateway-text"><b>'+esc(g.id==='sep'?'درگاه سپ':'درگاه زیبال')+'</b><small>'+esc(g.enabled?'پرداخت امن با همهٔ کارت‌های شتاب':'در انتظار فعال‌سازی')+'</small></span><span class="gateway-tick" aria-hidden="true">'+icon(glyph.check,14)+'</span></label>';};
  return '<div class="pay-headline"><div><span class="pay-kicker">شارژ کیف پول</span><h1>تکمیل پرداخت</h1><p>مبلغ و مشخصات پیش‌فاکتور را بررسی کن، درگاه را انتخاب کن و در صفحهٔ بانک پرداخت را تمام کن.</p></div><button class="pay-ghost invoice-print" type="button" data-print>'+icon(glyph.print,18)+'چاپ یا ذخیرهٔ PDF</button></div>'+steps(1)+
   '<div class="invoice-layout" data-invoice="'+esc(invoice.id)+'">'+details(invoice,user)+
   '<aside class="invoice-payment" aria-labelledby="pay-title"><div class="pay-sum"><span>مبلغ قابل پرداخت</span><strong>'+money(invoice.amount_toman)+'</strong><small>معادل '+RI.fa(credit(invoice))+' It</small></div>'+
   (blocked?'':'<p class="pay-timer" data-expires="'+Number(invoice.expires_at)+'">'+icon(glyph.clock,16)+'<span>مهلت پرداخت تا '+date(invoice.expires_at)+'</span></p>')+
   '<h2 id="pay-title">روش پرداخت</h2><form id="invoice-pay"><fieldset><legend class="inv-sr">انتخاب درگاه بانکی</legend>'+gateways.map(option).join('')+'</fieldset>'+
   '<label class="invoice-consent"><input type="checkbox" id="invoice-confirm" required '+(blocked?'disabled':'')+'><span>مبلغ '+money(invoice.amount_toman)+' و دریافت '+RI.fa(credit(invoice))+' It را تأیید می‌کنم.</span></label>'+
   '<p id="invoice-error" class="invoice-error" role="alert" hidden></p><button class="payment-button" id="invoice-submit" type="submit" '+(!available||blocked?'disabled':'')+'>'+icon(glyph.lock,18)+'پرداخت '+money(invoice.amount_toman)+'</button>'+
   '<p class="invoice-hint">'+(blocked?'این درخواست قابل پرداخت نیست؛ از کیف پول پیش‌فاکتور تازه بساز.':available?'شماره و رمز کارت فقط در صفحهٔ بانک وارد می‌شوند.':'درگاه‌ها هنوز فعال نشده‌اند؛ پیش‌فاکتور آماده است و هیچ مبلغی کسر نمی‌شود.')+'</p></form>'+
   '<nav class="pay-links" aria-label="گزینه‌های دیگر">'+(order?'<a href="/payments/result?id='+esc(order.id)+'">'+icon(glyph.clock,16)+'وضعیت این پرداخت</a>':'')+'<a href="/dashboard/wallet/">'+icon(glyph.edit,16)+'تغییر مبلغ یا پیش‌فاکتور تازه</a><a href="/contact/">'+icon(glyph.help,16)+'پشتیبانی پرداخت</a></nav></aside></div>'+
   '<script defer src="/payments/checkout.js?v='+require('../../package.json').version+'"></script>';
}

function result(order,user){
  const paid=order.status==='paid',waiting=['pending','verifying','creating'].includes(order.status),name=order.provider==='sep'?'سپ':'زیبال',tone=paid?'success':waiting?'pending':'attention';
  const copyable=(label,value)=>'<div><dt>'+label+'</dt><dd><span dir="ltr">'+esc(value||'—')+'</span>'+(value?'<button type="button" class="pay-copy" data-copy="'+esc(value)+'" aria-label="کپی '+label+'">'+icon(glyph.copy,15)+'</button>':'')+'</dd></div>';
  return '<div class="pay-headline"><div><span class="pay-kicker">شارژ کیف پول</span><h1>نتیجهٔ پرداخت</h1></div>'+(paid?'<button class="pay-ghost invoice-print" type="button" data-print>'+icon(glyph.print,18)+'چاپ یا ذخیرهٔ PDF فاکتور</button>':'')+'</div>'+steps(paid?4:waiting?2:3)+
   '<section class="payment-result payment-result--'+tone+'" data-order="'+esc(order.id)+'" data-status="'+esc(order.status)+'"><span class="result-icon">'+icon(paid?glyph.check:waiting?glyph.clock:glyph.alert,30)+'</span><div class="result-text"><h2 id="payment-status">'+esc(labels[order.status]||'وضعیت نامشخص')+'</h2><p>'+(paid?RI.fa(credit(order))+' It به کیف پولت اضافه شد.':waiting?'نتیجهٔ بانک در حال بررسی است؛ این صفحه خودکار به‌روز می‌شود.':'اعتباری از این پرداخت به کیف پول اضافه نشده است. برای پیگیری، شمارهٔ فاکتور را به پشتیبانی بده.')+'</p></div><div class="result-actions"><a class="payment-button" href="/dashboard/wallet/">'+icon(glyph.wallet,18)+'مشاهدهٔ کیف پول</a>'+(waiting?'<button type="button" class="pay-ghost" id="payment-recheck">'+icon(glyph.clock,16)+'بررسی دوباره</button>':'')+'<a class="pay-ghost" href="/contact/">'+icon(glyph.help,16)+'پشتیبانی</a></div><p class="invoice-error" id="invoice-error" role="alert" hidden></p></section>'+
   '<div class="result-details">'+details(order,user,paid)+'<aside class="invoice-bank" aria-labelledby="bank-title"><h2 id="bank-title">اطلاعات پرداخت</h2><dl><div><dt>درگاه</dt><dd>'+name+'</dd></div><div><dt>وضعیت</dt><dd><span class="inv-state inv-state--'+tone+'">'+esc(labels[order.status]||order.status)+'</span></dd></div>'+copyable('شمارهٔ مرجع',order.rrn)+copyable('کد رهگیری',order.trace)+'<div><dt>آخرین به‌روزرسانی (تهران)</dt><dd>'+date(order.updated_at)+'</dd></div></dl><p class="inv-muted">این اطلاعات را برای پیگیری پرداخت نزد بانک یا پشتیبانی نگه دار.</p></aside></div>'+
   '<script defer src="/payments/checkout.js?v='+require('../../package.json').version+'"></script>';
}
module.exports={checkout,result,labels};
