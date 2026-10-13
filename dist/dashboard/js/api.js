(() => {
  'use strict';const RI=window.RI;
  RI.dashboardRequest=async(route,data)=>{
    let r;try{r=await fetch('/api/dashboard/'+route,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});}catch{throw new Error('ارتباط با سرور برقرار نشد؛ تغییراتت را نگه دار و دوباره تلاش کن');}
    const result=await r.json();if(!r.ok)throw new Error(result.error||'درخواست انجام نشد');return result;
  };
  RI.loadDashboard=async()=>{
    const old=RI.C(),doc=await RI.dashboardRequest('document');
    RI.state.content=doc.content;RI.state.pub=doc.pub;RI.revision=doc.revision;RI.savedSlug=doc.slug||'';RI.saved=JSON.stringify(doc.content);
    Object.assign(RI.state.account,doc.preferences);RI.state.billing=Object.assign(RI.seedBilling('free'),doc.billing||{});
    RI.savedIndexing=RI.state.account.indexing; RI.resetEdits();
    if(!doc.revision&&old.profile.name){const importOld=await RI.choice({title:'پیش‌نویس قبلی این تب',text:'یک پیش‌نویس موقت از نسخهٔ قبلی پیدا شد. آن را روی حساب ذخیره کنیم؟',options:[{label:'انتقال به حساب',kind:'primary',value:true},{label:'شروع خالی',kind:'ghost',value:false}]});if(importOld){RI.state.content=old;RI.touch();await RI.save();}}
    try{RI.statsRows=(await RI.dashboardRequest('stats')).rows;}catch{RI.statsRows=null;}
  };
  RI.metricSeries=(n)=>{const day=Math.floor((Date.now()+12600000)/86400000),ser={views:Array(n).fill(0),linkViews:Array(n).fill(0),clicks:Array(n).fill(0)};for(const r of RI.statsRows||[]){const i=r.day-(day-n+1);if(i>=0&&i<n){const key={resume:'views',links:'linkViews',click:'clicks'}[r.event];if(key)ser[key][i]+=Number(r.total);}}return ser;};
  RI.linkClicks=(id,n=90)=>(RI.statsRows||[]).filter(r=>r.event==='click'&&r.link_id===id&&r.day>=Math.floor((Date.now()+12600000)/86400000)-n+1).reduce((s,r)=>s+Number(r.total),0);
})();
