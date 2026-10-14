(function(){
  'use strict';
  const RI=window.RI,esc=RI.esc;
  const statuses={creating:'در حال آماده‌سازی',pending:'تأیید نشده',verifying:'در حال تأیید بانک',paid:'شارژ انجام شد',failed:'اتصال ناموفق',review:'نیاز به بررسی پشتیبانی',reversed:'برگشت به کارت',cancelled:'انصراف از پرداخت',expired:'مهلت پرداخت تمام شد'};
  RI.registerPage('wallet',{title:'کیف پول It',render(){return RI.pageHead({title:'کیف پول It',desc:'اعتبار ResumeIt برای خرید قالب و اشتراک؛ هر It برابر ۲٬۰۰۰ تومان است.'})+'<div id="wallet-content" aria-busy="true"><p role="status">در حال دریافت موجودی…</p></div>';},mount(root){
    const host=root.querySelector('#wallet-content');let active=true,checkout={gateways:[],orders:[]},timer=null,polls=0,requestId=crypto.randomUUID(),paying=false,topup='100000';
    const paymentId=new URL(location.href).searchParams.get('payment');
    function history(){
      const node=root.querySelector('#payment-history');if(!node)return;
      const orders=checkout.orders,result=orders.find(o=>o.id===paymentId);
      node.innerHTML='<h2>پرداخت‌های بانکی</h2><p class="field__hint">آخرین ۵۰ درخواست شارژ؛ موجودی فقط پس از تأیید بانک اضافه می‌شود.</p>'+(result?'<p class="banner" role="status">'+esc(statuses[result.status]||'وضعیت نامشخص')+' · '+RI.toman(result.amount)+' · '+RI.fa(result.it)+' It</p>':'')+(orders.length?'<ul class="rows">'+orders.map(o=>'<li class="row"><div class="row__main"><b>'+RI.toman(o.amount)+' · '+RI.fa(o.it)+' It</b><p>'+RI.date(o.at)+' · '+(o.provider==='sep'?'سپ':'زیبال')+'</p><p>'+esc(statuses[o.status]||'وضعیت نامشخص')+(o.rrn?' · شمارهٔ مرجع: '+esc(o.rrn):'')+'</p></div><div class="row__actions">'+(['pending','verifying'].includes(o.status)?'<button type="button" class="btn btn--soft btn--sm" data-payment-recheck="'+esc(o.id)+'">بررسی مجدد</button>':'')+(o.status==='paid'?'<button type="button" class="btn btn--soft btn--sm" data-payment-receipt="'+esc(o.id)+'">رسید</button>':'')+'</div></li>').join('')+'</ul>':'<p>هنوز درخواست پرداخت بانکی ثبت نشده است.</p>');
    }
    function updateOrder(order){const index=checkout.orders.findIndex(o=>o.id===order.id);if(index<0)checkout.orders.unshift(order);else checkout.orders[index]=order;history();}
    function paintCheckout(configuration,startPoll=true){
      if(!active||!root.querySelector('#wallet-pay'))return;
      checkout=configuration||{gateways:[],orders:[]};const enabled=!!checkout.gateways.find(g=>g.id==='sep')?.enabled;
      root.querySelector('#wallet-gateway option[value=sep]').textContent='سپ — '+(enabled?'آمادهٔ پرداخت':'در انتظار فعال‌سازی');
      root.querySelector('#wallet-pay').disabled=!enabled||paying;
      root.querySelector('#gateway-note').textContent=enabled?'پرداخت از طریق درگاه بانکی سپ انجام می‌شود؛ پس از تأیید، اعتبار It اضافه می‌شود.':configuration?'پذیرندگی سپ در حال آماده‌سازی است؛ شارژ آنلاین هنوز فعال نیست. موجودی فعلی برای خرید قابل استفاده است.':'وضعیت درگاه دریافت نشد؛ دوباره تلاش کن.';
      history();if(startPoll&&paymentId){clearInterval(timer);timer=setInterval(refreshOrder,5000);void refreshOrder();}
    }
    async function refreshOrder(){
      if(!active||!paymentId||polls++>=12){clearInterval(timer);return;}
      try{const {order}=await RI.paymentRequest('orders/'+encodeURIComponent(paymentId));if(!active)return;updateOrder(order);if(!['creating','pending','verifying'].includes(order.status)){clearInterval(timer);if(order.status==='paid')await load(false);}}
      catch{clearInterval(timer);}
    }
    async function load(startPoll=true){
      try{
        const configurationRequest=RI.paymentRequest('options').catch(()=>null);
        const wallet=await RI.dashboardRequest('wallet');if(!active)return;RI.wallet=wallet;
        host.setAttribute('aria-busy','false');host.innerHTML=
          '<div class="wallet-overview"><section class="panel wallet-balance"><img src="/brand/it-coin.svg" width="104" height="104" alt="سکهٔ It"><div><span>موجودی قابل استفاده</span><h2 class="ltr-inline">'+RI.fa(wallet.balance)+' It</h2><p>معادل '+RI.toman(wallet.balance*wallet.rate)+'</p></div></section>'+
          '<section class="panel wallet-topup"><h2>شارژ کیف پول</h2><form id="wallet-payment"><div class="field"><label class="field__label" for="wallet-topup">مبلغ شارژ (تومان)</label><input class="input" id="wallet-topup" type="number" inputmode="numeric" min="2000" max="100000000" step="2000" value="'+esc(topup)+'" required><p class="field__hint" id="wallet-conversion" role="status" aria-live="polite">'+RI.fa(Number(topup)/RI.IT_RATE)+' It دریافت می‌کنی</p></div><div class="field"><label class="field__label" for="wallet-gateway">درگاه پرداخت</label><select class="select" id="wallet-gateway"><option value="sep">سپ — در حال بررسی وضعیت</option><option value="zibal" disabled>زیبال — هنوز متصل نشده</option></select></div><p id="gateway-note">در حال دریافت وضعیت درگاه…</p><p class="field__error" id="payment-error" role="alert" hidden></p><div class="btnrow"><button type="submit" class="btn btn--primary" id="wallet-pay" disabled>پرداخت و دریافت It</button><button type="button" class="btn btn--soft" data-wallet-support>پشتیبانی شارژ</button><a class="btn btn--soft" href="/dashboard/themes/">انتخاب قالب</a></div></form></section></div>'+
          '<section class="panel" id="payment-history" aria-live="polite"></section><section class="panel"><h2>تاریخچهٔ کیف پول</h2><p class="field__hint">آخرین ۵۰ تراکنش؛ مبلغ‌ها برحسب It هستند.</p>'+(wallet.transactions.length?'<ul class="rows">'+wallet.transactions.map(t=>'<li class="row"><div class="row__main"><b>'+esc(t.label)+'</b><p>'+RI.date(t.at)+' · موجودی پس از تراکنش: '+RI.fa(t.balance)+' It</p></div><strong class="ltr-inline">'+(t.amount>0?'+':'')+RI.fa(t.amount)+' It</strong></li>').join('')+'</ul>':'<p>هنوز تراکنشی ثبت نشده است.</p>')+'</section>';
        history();void configurationRequest.then(configuration=>paintCheckout(configuration,startPoll));
      }catch(e){if(active){host.setAttribute('aria-busy','false');host.innerHTML='<p role="alert">'+esc(e.message)+'</p><button class="btn" type="button" data-wallet-retry>تلاش دوباره</button>';}}
    }
    root.addEventListener('input',e=>{if(e.target.id==='wallet-topup'){topup=e.target.value;requestId=crypto.randomUUID();const value=Number(e.target.value);root.querySelector('#wallet-conversion').textContent=e.target.validity.valid&&Number.isFinite(value)?RI.fa(value/RI.IT_RATE)+' It دریافت می‌کنی':'مبلغ معتبر با گام ۲٬۰۰۰ تومان وارد کن';}});
    root.addEventListener('submit',async e=>{
      if(e.target.id!=='wallet-payment')return;e.preventDefault();const button=root.querySelector('#wallet-pay'),error=root.querySelector('#payment-error');if(button.disabled||paying)return;paying=true;button.disabled=true;button.textContent='در حال اتصال به سپ…';error.hidden=true;
      try{const result=await RI.paymentRequest('sep/start',{amount:Number(root.querySelector('#wallet-topup').value),requestId});if(active)location.assign(result.url);}
      catch(ex){paying=false;if(active){error.textContent=ex.message;error.hidden=false;button.disabled=false;button.textContent='پرداخت و دریافت It';requestId=crypto.randomUUID();}}
    });
    RI.delegate(root,'click','[data-payment-recheck]',async(e,b)=>{if(b.disabled)return;b.disabled=true;try{const {order}=await RI.paymentRequest('orders/'+b.dataset.paymentRecheck+'/recheck',{});if(!active)return;updateOrder(order);if(order.status==='paid')await load(false);}catch(ex){if(active)RI.toast(ex.message,{kind:'error'});}finally{b.disabled=false;}});
    RI.delegate(root,'click','[data-payment-receipt]',(e,b)=>{const pay=checkout.orders.find(o=>o.id===b.dataset.paymentReceipt);if(pay)RI.receiptModal({...pay,title:'شارژ کیف پول با سپ'});});
    RI.delegate(root,'click','[data-wallet-retry]',()=>load());RI.delegate(root,'click','[data-wallet-support]',()=>location.assign('/contact/'));void load();return()=>{active=false;clearInterval(timer);};
  }});
})();
