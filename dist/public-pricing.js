(() => {
  const status=document.querySelector('#catalog-status'),retry=document.querySelector('#catalog-retry');
  const buttons=[...document.querySelectorAll('[data-months]')],number=new Intl.NumberFormat('fa-IR');
  let catalog=null,months=3;
  function render(){
    const plan=catalog.plans.find(plan=>plan.months===months);
    document.querySelector('#plan-price').textContent=plan.paused?'فعلاً متوقف':number.format(Math.ceil(plan.price/months));
    document.querySelector('#plan-total').textContent='مبلغ کل دورهٔ '+number.format(months)+' ماهه: '+number.format(plan.price)+' تومان';
    document.querySelectorAll('.shop-prices b').forEach((node,i)=>{const value=i?catalog.fontFrom:catalog.templateFrom;node.textContent=value===null?'فعلاً متوقف':number.format(value);});
    buttons.forEach(button=>{const selected=Number(button.dataset.months)===months;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{if(catalog){months=Number(button.dataset.months);render();}}));
  async function load(){
    catalog=null;retry.disabled=true;buttons.forEach(button=>button.disabled=true);
    document.querySelector('#plan-price').textContent='—';document.querySelector('#plan-total').textContent='مبلغ دوره هنوز دریافت نشده است';
    document.querySelectorAll('.shop-prices b').forEach(node=>node.textContent='—');
    status.textContent='در حال دریافت تعرفه‌ها…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch('/api/catalog',{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('catalog');
      const data=await response.json();
      if(!Number.isSafeInteger(data.rate)||data.rate<=0||!Array.isArray(data.plans)||![3,6,12].every(months=>data.plans.filter(plan=>plan.months===months&&Number.isSafeInteger(plan.price)&&plan.price>0&&typeof plan.paused==='boolean').length===1)||!['templateFrom','fontFrom'].every(key=>data[key]===null||(Number.isSafeInteger(data[key])&&data[key]>0)))throw new Error('catalog');
      catalog=data;render();buttons.forEach(button=>button.disabled=catalog.plans.find(plan=>plan.months===Number(button.dataset.months)).paused);
      status.textContent='نرخ جاری هر It: '+number.format(data.rate)+' تومان. مبلغ نهایی و وضعیت درگاه را پیش از تأیید خرید در داشبورد بررسی کن.';
      retry.hidden=true;
    }catch{
      status.textContent='تعرفه‌ها دریافت نشدند؛ قیمت معتبری برای نمایش نداریم. دوباره تلاش کن.';
      retry.hidden=false;
    }finally{clearTimeout(timer);retry.disabled=false;}
  }
  retry.addEventListener('click',load);load();
})();
