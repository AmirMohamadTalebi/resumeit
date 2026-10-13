(() => {
  'use strict';const RI=window.RI;
  RI.dashboardRequest=async(route,data)=>{
    let r;try{r=await fetch('/api/dashboard/'+route,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(new Error('ارتباط با سرور برقرار نشد؛ تغییراتت را نگه دار و دوباره تلاش کن'),{code:'NETWORK_ERROR'});}
    const result=await r.json();if(!r.ok)throw Object.assign(new Error(result.error||'درخواست انجام نشد'),{status:r.status,code:result.code});return result;
  };
  RI.loadDashboard=async(owner)=>{
    RI.statsRows=null; RI.statsLoading=['home','links','stats'].includes(document.body.dataset.page);
    if(RI.statsLoading) RI.dashboardRequest('stats').then(r=>r.rows).catch(()=>null).then(rows=>{RI.statsRows=rows; RI.statsLoading=false; RI.emit('stats');});
    const doc=window.resumeitDocument?await window.resumeitDocument:await RI.dashboardRequest('document');
    if(doc.error)throw new Error(doc.error);
    if(doc.ownerId&&doc.ownerId!==owner)throw new Error('حساب فعال تغییر کرده؛ صفحه را دوباره باز کن');
    let legacy=false;try{legacy=!!sessionStorage.getItem('resumeit-draft-v1:'+owner);}catch{}
    if(!doc.revision && legacy) await RI.loadTemplates(['vista','satiar']);
    RI.restoreDraft(owner,doc.revision>0);
    const old=RI.C();
    RI.state.content=doc.content;RI.state.pub=doc.pub;RI.revision=doc.revision;RI.savedSlug=doc.slug||'';RI.saved=JSON.stringify(doc.content);
    Object.assign(RI.state.account,doc.preferences);RI.state.billing=Object.assign(RI.seedBilling('free'),doc.billing||{});
    RI.savedIndexing=RI.state.account.indexing; RI.resetEdits();
    if(!doc.revision&&old.profile.name){const importOld=await RI.choice({title:'پیش‌نویس قبلی این تب',text:'یک پیش‌نویس موقت از نسخهٔ قبلی پیدا شد. آن را روی حساب ذخیره کنیم؟',options:[{label:'انتقال به حساب',kind:'primary',value:true},{label:'شروع خالی',kind:'ghost',value:false}]});if(importOld){RI.state.content=old;RI.touch();await RI.save();}}
  };
  RI.metricSeries=(n)=>{const day=Math.floor((Date.now()+12600000)/86400000),ser={views:Array(n).fill(0),linkViews:Array(n).fill(0),clicks:Array(n).fill(0)};for(const r of RI.statsRows||[]){const i=r.day-(day-n+1);if(i>=0&&i<n){const key={resume:'views',links:'linkViews',click:'clicks'}[r.event];if(key)ser[key][i]+=Number(r.total);}}return ser;};
  RI.linkClicks=(id,n=90)=>(RI.statsRows||[]).filter(r=>r.event==='click'&&r.link_id===id&&r.day>=Math.floor((Date.now()+12600000)/86400000)-n+1).reduce((s,r)=>s+Number(r.total),0);
})();
