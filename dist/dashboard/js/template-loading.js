(() => {
 'use strict';const RI=window.RI;
 RI.templateTransition=async id=>{
  if(!['vista','satiar'].includes(id)||RI.IMPORTED_TEMPLATES[id]){RI.releaseInactiveTemplates(id);return;}
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='template-loading';dialog.setAttribute('aria-labelledby','template-loading-title');
  dialog.innerHTML='<section><div class="template-loading__heading"><span>'+RI.icon('palette')+'</span><h2 id="template-loading-title">قالب تازه‌ات در راه است</h2><p>تا آماده‌شدنش، یک دست دوز؟</p></div><div class="template-game" role="group" aria-label="بازی دوز">'+Array.from({length:9},(_,i)=>'<button type="button" data-cell="'+i+'" aria-label="خانهٔ '+RI.fa(i+1)+'"></button>').join('')+'</div><p class="template-game-status" role="status">نوبت توست؛ ضربدر</p><button class="btn btn--soft" data-new-game type="button">'+RI.icon('refresh')+'دست تازه</button><div class="template-load-status"><span>دریافت و آماده‌سازی قالب</span><strong data-load-percent>۰٪</strong><progress class="progress" value="0" max="100" aria-label="پیشرفت بارگذاری قالب"></progress></div></section>';
  const controller=new AbortController(),cancel=document.createElement('button');cancel.className='btn btn--ghost';cancel.type='button';cancel.textContent='انصراف از تغییر قالب';dialog.querySelector('section').append(cancel);cancel.onclick=()=>controller.abort();
  document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();controller.abort();});
  let board=Array.from({length:9},(_,i)=>i),busy=false,finished=false,worker;
  const status=dialog.querySelector('.template-game-status');
  const paint=()=>dialog.querySelectorAll('[data-cell]').forEach((button,i)=>{const value=board[i];button.innerHTML=typeof value==='number'?'':RI.icon(value==='X'?'x':'circle');button.dataset.symbol=typeof value==='number'?'':value;button.disabled=busy||finished||typeof value!=='number';button.setAttribute('aria-label','خانهٔ '+RI.fa(i+1)+(typeof value==='string'?' '+(value==='X'?'ضربدر':'دایره'):''));});
  dialog.querySelector('[data-new-game]').onclick=()=>{if(busy)return;board=Array.from({length:9},(_,i)=>i);finished=false;status.textContent='نوبت توست؛ ضربدر';paint();};
  dialog.querySelector('.template-game').onclick=e=>{const button=e.target.closest('[data-cell]');if(!button||busy||finished||!worker)return;const i=Number(button.dataset.cell);if(typeof board[i]!=='number')return;board[i]='X';busy=true;status.textContent='نوبت رزومیت؛ دایره';paint();worker.postMessage({type:'game',board});};
  try{
   await RI.loadTemplates([id],{signal:controller.signal,progress:percent=>{if(percent===null)return;dialog.querySelector('[data-load-percent]').textContent=RI.fa(percent)+'٪';dialog.querySelector('progress').value=percent;},worker:value=>{worker=value;worker.addEventListener('message',({data})=>{if(data.type==='game'){board=data.board;finished=!!data.winner;busy=false;status.textContent=data.winner?{huPlayer:'تو بردی!',aiPlayer:'این دست برای رزومیت بود',draw:'مساوی؛ یک دست دیگر؟'}[data.winner]:'نوبت توست؛ ضربدر';paint();}else if(data.type==='game-error'){busy=false;status.textContent='بازی دریافت نشد؛ بارگذاری قالب ادامه دارد';paint();}});}});
   dialog.querySelector('[data-load-percent]').textContent='۱۰۰٪';dialog.querySelector('progress').value=100;
   await new Promise(requestAnimationFrame);
  }finally{dialog.close();dialog.remove();previous?.focus?.({preventScroll:true});}
 };
})();
