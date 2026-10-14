(()=>{
  'use strict';
  const error=document.querySelector('#invoice-error'),form=document.querySelector('#invoice-pay'),result=document.querySelector('[data-order]');
  const show=message=>{error.textContent=message;error.hidden=false;};
  async function request(path,body){const response=await fetch('/api/payments/'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'درخواست انجام نشد');return data;}
  document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const button=document.querySelector('#invoice-submit');if(button.disabled||!form.reportValidity())return;
    const provider=form.querySelector('input[name=provider]:checked');if(!provider||provider.disabled){show('یک درگاه فعال انتخاب کن');return;}
    button.disabled=true;button.textContent='در حال اتصال به درگاه…';error.hidden=true;
    try{const data=await request('invoices/'+document.querySelector('[data-invoice]').dataset.invoice+'/pay',{provider:provider.value});location.assign(data.url);}
    catch(e){show(e.message==='Failed to fetch'?'ارتباط قطع شد؛ وضعیت پرداخت را بررسی کن و دوباره تلاش کن':e.message);button.disabled=false;button.textContent='تلاش دوباره برای پرداخت';}
  });
  if(result&&['creating','pending','verifying'].includes(result.dataset.status)){
    let attempts=0,busy=false;
    const check=async(manual=false)=>{if(busy)return;busy=true;const button=document.querySelector('#payment-recheck');if(button)button.disabled=true;try{const data=await request('orders/'+result.dataset.order+(manual?'/recheck':''),manual?{}:undefined);if(data.order.status!==result.dataset.status)location.reload();}catch(e){if(manual)show(e.message);}finally{busy=false;if(button)button.disabled=false;}};
    document.querySelector('#payment-recheck')?.addEventListener('click',()=>check(true));
    const timer=setInterval(()=>{if(++attempts>12||document.hidden){if(attempts>12)clearInterval(timer);return;}void check();},5000);
    addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
})();
