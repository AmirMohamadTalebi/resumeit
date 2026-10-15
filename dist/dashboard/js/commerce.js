/* تعرفه‌های خرید و اشتراک؛ پرداخت تا اتصال به درگاه غیرفعال است. */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;

  const pending = new Map();
  RI.walletPurchase = async function (ref, name, price) {
    let wallet;
    try { wallet = await RI.dashboardRequest('wallet'); } catch(e) { RI.toast(e.message,{kind:'error'});return false; }
    const enough = wallet.balance * RI.IT_RATE >= price;
    return new Promise(resolve => {
      let bought=false,busy=false;
      const modal=RI.modal({title:'خرید «'+name+'» با It',size:'sm',
        body:'<dl class="kv"><dt>مبلغ</dt><dd>'+RI.it(price)+' · '+RI.toman(price)+'</dd><dt>موجودی</dt><dd>'+RI.fa(wallet.balance)+' It</dd></dl><p>هر It برابر ۲٬۰۰۰ تومان است. '+(enough?'پس از تأیید، اعتبار از کیف پول کم می‌شود.':'موجودی کافی نیست. از صفحهٔ کیف پول، وضعیت شارژ آنلاین را بررسی کن.')+'</p><p class="wallet-feedback" role="status" aria-live="polite"></p>',
        actions:[{label:'بستن',kind:'ghost'},enough?{label:'تأیید خرید با It',kind:'primary',keepOpen:true,onClick:async()=>{
          if(busy)return;busy=true;
          if(!pending.has(ref))pending.set(ref,crypto.randomUUID());
          try{const result=await RI.dashboardRequest('wallet/purchase',{ref,requestId:pending.get(ref)});RI.state.billing=result.billing;RI.wallet=result.wallet;pending.delete(ref);bought=true;modal.close();RI.toast('خرید ثبت شد؛ موجودی '+RI.fa(result.wallet.balance)+' It');}
          catch(e){const feedback=document.querySelector('.wallet-feedback');if(feedback)feedback.textContent=e.message;}
          finally{busy=false;}
        }}:{label:'کیف پول',kind:'soft',onClick:()=>RI.go('wallet')}],onClose:()=>resolve(bought)});
    });
  };
  RI.purchaseFlow = it => RI.walletPurchase((it.kind||'rt')+':'+it.id,it.name,it.price);
  RI.subscribeFlow = id => RI.walletPurchase('subscription:'+id,'اشتراک '+RI.PLANS[id].name+' '+RI.PLANS[id].period,RI.PLANS[id].price);

  RI.receiptModal = function(pay) {
    const no=String(pay.id),status=pay.status==='paid'?'موفق؛ کیف پول شارژ شد':'تأیید نشده';
    RI.modal({title:'رسید پرداخت',size:'sm',body:'<div class="receipt"><div class="receipt__head"><b class="ltr-inline">ResumeIt</b><span>رسید شارژ کیف پول</span></div><dl class="kv"><dt>شناسهٔ پرداخت</dt><dd class="ltr-inline mono">'+esc(no)+'</dd><dt>شرح</dt><dd>'+esc(pay.title||'شارژ کیف پول')+'</dd><dt>تاریخ</dt><dd>'+RI.date(pay.updatedAt||pay.at)+'</dd><dt>درگاه</dt><dd>'+esc(pay.provider==='sep'?'سپ':'زیبال')+'</dd><dt>وضعیت</dt><dd>'+status+'</dd><dt>شمارهٔ مرجع</dt><dd class="ltr-inline">'+esc(pay.rrn||'—')+'</dd><dt>کد رهگیری</dt><dd class="ltr-inline">'+esc(pay.trace||'—')+'</dd></dl><div class="receipt__total"><span>مبلغ</span><b class="num">'+RI.toman(pay.amount)+'</b></div></div>',actions:[{label:'دانلود رسید',kind:'soft',icon:'download',keepOpen:true,onClick:()=>{const text='رسید پرداخت ResumeIt\nشناسه: '+no+'\nمبلغ: '+pay.amount+' تومان\nوضعیت: '+status+'\nشماره مرجع: '+(pay.rrn||'—')+'\nکد رهگیری: '+(pay.trace||'—')+'\nتاریخ: '+RI.date(pay.updatedAt||pay.at);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download='resumeit-payment-'+no+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}},{label:'بستن',kind:'ghost',push:true}]});
  };

  /* توضیح روشن برای موردی که قفل است */
  RI.lockedExplain = async function (it) {
    if(it.subscription){const choice=await RI.choice({title:'فعال‌سازی «'+it.name+'»',text:'خرید یک‌باره '+RI.it(it.price)+' ('+RI.toman(it.price)+') یا استفاده در مدت اشتراک فعال.',options:[{label:'خرید یک‌باره با It',kind:'primary',value:'buy'},{label:'مشاهدهٔ اشتراک‌ها',kind:'soft',value:'sub'},{label:'فعلاً نه',kind:'ghost',value:null}]});if(choice==='buy')return RI.purchaseFlow(it);if(choice==='sub')RI.go('billing');return false;}
    if (it.access === 'buy') return RI.purchaseFlow(it);
    const c = await RI.choice({
      title: '«' + it.name + '» با اشتراک باز می‌شود',
      text: 'این مورد جزو مجموعهٔ اشتراکی است. با هر اشتراک (سه‌ماهه، شش‌ماهه یا سالانه) تمام مجموعهٔ قالب‌های اشتراکی در دسترس شما قرار می‌گیرد. استفاده از موارد رایگان بدون محدودیت ادامه دارد.',
      options: [{ label: 'مشاهدهٔ اشتراک‌ها', kind: 'primary', icon: 'crown', value: 'plans' }, { label: 'فعلاً نه', kind: 'ghost', value: null }],
    });
    if (c === 'plans') RI.go('billing');
    return false;
  };

  RI.accessBadge = function (ref, it) {
    const a = RI.accessOf(ref, it);
    if (a === 'free') return '<span class="chip chip--ok">رایگان</span>';
    if (a === 'owned') return '<span class="chip chip--ok">' + RI.icon('check') + 'خریده‌اید</span>';
    if (a === 'sub-ok') {const plan=RI.state.billing.plan,remaining=Math.max(1,(plan.end-Date.now())/86400000/30),nearest=[3,6,9,12].reduce((best,n)=>Math.abs(n-remaining)<Math.abs(best-remaining)?n:best,3);return '<span class="chip chip--brown">'+RI.icon('crown')+'اشتراک '+(Math.abs(remaining-nearest)>.1?'≈ ':'')+(nearest===12?'یک‌ساله':RI.fa(nearest)+'ماهه')+'</span>';}
    if(a==='locked-special')return '<span class="chip chip--brown">ویژه · '+RI.it(it.price)+' · '+RI.toman(it.price)+' یا اشتراک</span>';
    if (a === 'locked-buy') return '<span class="chip chip--brown">' + RI.icon('lock') + 'خرید یک‌بار · ' + RI.it(it.price) + ' · ' + RI.toman(it.price) + '</span>';
    return '<span class="chip chip--brown">' + RI.icon('lock') + 'با اشتراک</span>';
  };
})();
