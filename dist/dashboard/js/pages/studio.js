(() => {
 'use strict';const RI=window.RI,esc=RI.esc;
 RI.registerPage('studio',{title:'آمادگی انتشار',render(){
  const ready=RI.readiness(),kinds=RI.pageKinds(),all=kinds.flatMap(kind=>ready[kind]);
  const required=all.filter(x=>x.req),missing=required.filter(x=>!x.done).length,allowed=RI.canWorkspace(RI.workspaceSlot);
  const title=missing?'پایه‌های صفحه‌ها نیاز به تکمیل دارند':!allowed?'محتوا کامل است؛ دسترسی انتشار غیرفعال است':RI.workspaceSlot===3?'صفحهٔ لینک آماده است':'هر دو صفحه آماده‌اند';
  const hint=missing?'موارد پایه را تکمیل کن؛ جزئیات تکمیلی اختیاری‌اند.':allowed?'پایه‌های انتشار کامل است؛ از نوار بالای صفحه منتشر یا به‌روزرسانی کن.':'پیش‌نویس حفظ شده است؛ برای انتشار، دسترسی این جایگاه را در اشتراک بررسی کن.';
  const access=allowed?'':'<p class="field__hint">انتشار این جایگاه به دسترسی اشتراک نیاز دارد. <a class="link" href="/dashboard/billing/" data-go="billing">بررسی اشتراک و دسترسی انتشار</a></p>';
  const summary='<section class="studio-overview" aria-label="وضعیت آمادگی صفحه‌ها"><div><span class="studio-overview__icon">'+RI.icon(missing||!allowed?'edit':'check')+'</span><h2>'+title+'</h2><p>'+hint+'</p>'+access+'</div><dl>'+[['پایه‌های تکمیل‌شده',RI.fa(required.length-missing)+' از '+RI.fa(required.length)],['نیاز به تکمیل',RI.fa(missing)],['جزئیات تکمیلی',RI.fa(all.filter(x=>!x.req&&x.done).length)]].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+'</dl></section>';
  return RI.pageHead({title:'آمادگی انتشار'})+summary+kinds.map(kind=>{
   const name=kind==='resume'?'رزومه':'صفحهٔ لینک‌ها';
   return '<section class="studio-ready"><h2>'+RI.icon(kind==='resume'?'resume':'link')+name+'</h2>'+[['پایهٔ انتشار',true],['جزئیات تکمیلی',false]].map(([label,req])=>'<details class="allsteps" '+(req?'open':'')+'><summary>'+label+RI.icon('chevD')+'</summary><ul class="chklist">'+ready[kind].filter(x=>!!x.req===req).map(x=>'<li class="chk '+(x.done?'is-done':'')+'"><span class="chk__tick">'+RI.icon(x.done?'check':req?'edit':'plus')+'</span><span class="chk__t">'+esc(x.label)+'</span>'+(!x.done?'<a class="btn btn--ghost btn--sm" aria-label="'+esc('تکمیل '+x.label+' برای '+name)+'" href="'+esc(RI.routeUrl(x.route,{step:x.step,tab:x.tab,anchor:x.anchor}))+'" data-go="'+x.route+'" '+(x.step?'data-step="'+x.step+'"':'')+(x.tab?' data-tab="'+x.tab+'"':'')+(x.anchor?' data-anchor="'+x.anchor+'"':'')+'>تکمیل'+RI.icon('chevL')+'</a>':'')+'</li>').join('')+'</ul></details>').join('')+'</section>';
  }).join('');
 }});
})();
