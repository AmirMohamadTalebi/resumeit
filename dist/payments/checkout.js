(()=>{
  'use strict';
  const error=document.querySelector('#invoice-error'),form=document.querySelector('#invoice-pay'),result=document.querySelector('[data-order]');
  const show=message=>{error.textContent=message;error.hidden=false;window.ResumeItNotify?.(message,{kind:'error'});};
  if(result?.dataset.status==='paid')window.ResumeItNotify?.('پرداخت تأیید شد و اعتبار به کیف پول اضافه شد',{kind:'success'});
  async function request(path,body){const response=await fetch('/api/payments/'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});if(!response.headers.get('content-type')?.includes('application/json'))throw Error('پاسخ معتبر از سرویس پرداخت دریافت نشد؛ پیش از تلاش دوباره، وضعیت پرداخت را در کیف پول بررسی کن');let data;try{data=await response.json();}catch{throw Error('پاسخ سرویس پرداخت ناقص است؛ وضعیت پرداخت را در کیف پول بررسی کن');}if(!response.ok)throw Error(data.error||'درخواست انجام نشد');return data;}
  document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
  // Live countdown to the invoice deadline; at zero the pay button is disabled instead of failing at the bank.
  const deadline=document.querySelector('[data-expires]');
  if(deadline){
    const end=Number(deadline.dataset.expires),text=deadline.querySelector('span'),submit=document.querySelector('#invoice-submit'),fa=n=>n.toLocaleString('fa-IR'),two=n=>(n<10?'۰':'')+fa(n);
    const tick=()=>{const left=end-Date.now();if(left<=0){deadline.classList.add('is-late');text.textContent='مهلت این پیش‌فاکتور تمام شد؛ از کیف پول پیش‌فاکتور تازه بساز.';if(submit)submit.disabled=true;clearInterval(clock);return false;}
      const h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);text.textContent='زمان باقی‌مانده برای پرداخت: '+(h?fa(h)+':'+two(m):fa(m))+':'+two(s);if(left<120000)deadline.classList.add('is-late');return true;};
    const clock=setInterval(tick,1000);tick();
  }
  document.addEventListener?.('click',async event=>{
    const button=event.target.closest?.('[data-copy]');if(!button)return;
    try{await navigator.clipboard.writeText(button.dataset.copy);button.classList.add('is-done');window.ResumeItNotify?.('کپی شد',{kind:'success'});setTimeout(()=>button.classList.remove('is-done'),1500);}catch{window.ResumeItNotify?.('کپی ممکن نشد؛ متن را انتخاب و کپی کن',{kind:'error'});}
  });
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const button=document.querySelector('#invoice-submit');if(button.disabled||!form.reportValidity())return;
    const provider=form.querySelector('input[name=provider]:checked');if(!provider||provider.disabled){show('یک درگاه فعال انتخاب کن');return;}
    button.disabled=true;button.textContent='در حال اتصال به درگاه…';error.hidden=true;
    try{const data=await request('invoices/'+document.querySelector('[data-invoice]').dataset.invoice+'/pay',{provider:provider.value});location.assign(data.url);}
    catch(e){show(e.message==='Failed to fetch'?'ارتباط قطع شد؛ وضعیت پرداخت را بررسی کن و دوباره تلاش کن':e.message);button.disabled=false;button.textContent='تلاش دوباره برای پرداخت';}
  });
  if(result&&['creating','pending','verifying'].includes(result.dataset.status)){
    let busy=false;const deadline=Date.now()+25*60*1000;
    const check=async(manual=false)=>{if(busy)return;busy=true;const button=document.querySelector('#payment-recheck');if(button)button.disabled=true;try{const data=await request('orders/'+result.dataset.order+(manual?'/recheck':''),manual?{}:undefined);if(data.order.status!==result.dataset.status)location.reload();}catch(e){if(manual)show(e.message);}finally{busy=false;if(button)button.disabled=false;}};
    document.querySelector('#payment-recheck')?.addEventListener('click',()=>check(true));
    const visible=()=>{if(!document.hidden&&Date.now()<deadline)void check();};
    const timer=setInterval(()=>{if(Date.now()>=deadline){clearInterval(timer);return;}if(!document.hidden)void check();},5000);
    document.addEventListener('visibilitychange',visible);
    addEventListener('pagehide',()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);},{once:true});
  }
})();
