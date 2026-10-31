(() => {
  'use strict';const RI=window.RI;
  RI.workspaceSlot=1;try{const value=Number(new URLSearchParams(location.search).get('workspace')||sessionStorage.getItem('ri-workspace')||1);if(Number.isSafeInteger(value)&&value>=1&&value<=2147483647)RI.workspaceSlot=value;}catch{}
  RI.pageKinds=()=>RI.workspaceSlot===3?['links']:['resume','links'];
  RI.restorePublication=doc=>{if(doc.content&&doc.pub)for(const k of ['resume','links'])if(doc.pub[k]?.snapCurrent){doc.pub[k].snap=JSON.stringify(RI.pubData(k,doc.content));delete doc.pub[k].snapCurrent;}return doc;};
  RI.dashboardRequest=async(route,data,opts)=>{
    // The assistant may wait on a language model, so its questions get more time than ordinary requests.
    const wait=route==='assistant/ask'?45000:20000;
    const url=new URL('/api/dashboard/'+route,location.origin);if(['document','save','publish','unpublish','slug','share-qr','stats','stats/export','advisor','reset','reset/request','messages','messages/status','messages/delete'].includes(route.split('?')[0])&&!url.searchParams.has('workspace')&&RI.workspaceSlot>1)url.searchParams.set('workspace',RI.workspaceSlot);
    let r;try{r=await fetch(url.pathname+url.search,{method:data?'POST':'GET',credentials:'same-origin',headers:{...(data?{'Content-Type':'application/json'}:{}),...(RI.ownerId?{'X-ResumeIt-Owner':RI.ownerId}:{})},body:data?JSON.stringify(data):undefined,signal:opts?.signal&&AbortSignal.any?AbortSignal.any([AbortSignal.timeout(wait),opts.signal]):AbortSignal.timeout(wait)});}catch{if(opts?.signal?.aborted)throw Object.assign(new Error('متوقف شد'),{code:'ABORTED'});throw Object.assign(new Error('ارتباط با سرور برقرار نشد؛ تغییراتت را نگه دار و دوباره تلاش کن'),{code:'NETWORK_ERROR'});}
    let result;try{if(!r.headers.get('content-type')?.includes('application/json'))throw Error();result=await r.json();}catch{throw Object.assign(new Error('پاسخ سرور کامل دریافت نشد؛ تغییراتت حفظ شده، دوباره تلاش کن'),{status:r.status,code:'INVALID_RESPONSE'});}if(!r.ok){if(r.status===401||result.code==='ACCOUNT_CHANGED')RI.advisorClear?.();throw Object.assign(new Error(result.error||'درخواست انجام نشد'),{status:r.status,code:result.code,data:result});}return RI.restorePublication(result);
  };
  let statsRequest=0;
  RI.loadStats=()=>{const request=++statsRequest,owner=RI.ownerId,slot=RI.workspaceSlot;RI.statsLoading=true;RI.emit('stats');return RI.dashboardRequest('stats').then(r=>r.rows).catch(()=>null).then(rows=>{if(request!==statsRequest||owner!==RI.ownerId||slot!==RI.workspaceSlot)return;RI.statsRows=rows;RI.statsError=rows===null;RI.statsLoading=false;RI.emit('stats');});};
  RI.paymentRequest=async(route,data)=>{
    let r;try{r=await fetch('/api/payments/'+route,{method:data?'POST':'GET',credentials:'same-origin',headers:{...(data?{'Content-Type':'application/json'}:{}),...(RI.ownerId?{'X-ResumeIt-Owner':RI.ownerId}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});}catch{throw new Error('ارتباط پرداخت قطع شد؛ وضعیت کیف پول را بررسی کن و دوباره تلاش کن');}
    let result;try{if(!r.headers.get('content-type')?.includes('application/json'))throw Error();result=await r.json();}catch{throw new Error('پاسخ سرویس پرداخت دریافت نشد؛ قبل از تلاش دوباره وضعیت پرداخت‌های بانکی را بررسی کن');}if(!r.ok)throw new Error(result.error||'درخواست پرداخت انجام نشد');return result;
  };
  RI.loadDashboard=async(owner)=>{
    statsRequest++;RI.statsRows=null; RI.statsLoading=false;RI.statsError=false;
    let doc=RI.restorePublication(window.resumeitDocument?await window.resumeitDocument:await RI.dashboardRequest('document'));
    let previousOwner;try{previousOwner=sessionStorage.getItem('ri-workspace-owner');}catch{}
    if(previousOwner&&previousOwner!==owner){RI.workspaceSlot=1;doc=await RI.dashboardRequest('document?workspace=1');}
    try{sessionStorage.setItem('ri-workspace-owner',owner);sessionStorage.setItem('ri-workspace',String(doc.workspace||1));}catch{}
    if(doc.error)throw new Error(doc.error);
    if(doc.ownerId&&doc.ownerId!==owner)throw new Error('حساب فعال تغییر کرده؛ صفحه را دوباره باز کن');
    RI.workspaceSlot=doc.workspace||1;
    RI.applyCommerce(doc.commerce);RI.ownerSettings=doc.ownerSettings||{};
    let legacy=false;try{legacy=RI.workspaceSlot===1&&!!sessionStorage.getItem('resumeit-draft-v1:'+owner);}catch{}
    if(!doc.revision&&legacy){let id;try{id=JSON.parse(sessionStorage.getItem('resumeit-draft-v1:'+owner))?.content?.theme?.resume;}catch{}if(id)await RI.loadTemplates([id]);}
    RI.restoreDraft(owner,doc.revision>0);
    const old=RI.C();
    RI.state.content=Object.assign(RI.seed('empty'),doc.content);RI.state.pub=doc.pub;RI.revision=doc.revision;RI.savedSlug=doc.slug||'';RI.saved=JSON.stringify(RI.state.content);
    Object.assign(RI.state.account,doc.preferences);RI.state.billing=Object.assign(RI.seedBilling('free'),doc.billing||{});
    RI.savedIndexing=RI.state.account.indexing; RI.resetEdits();
    if(!doc.revision&&old.profile.name){const importOld=await RI.choice({title:'پیش‌نویس قبلی این تب',text:'یک پیش‌نویس موقت از نسخهٔ قبلی پیدا شد. آن را روی حساب ذخیره کنیم؟',options:[{label:'انتقال به حساب',kind:'primary',value:true},{label:'شروع خالی',kind:'ghost',value:false}]});if(importOld){RI.state.content=old;RI.touch();await RI.save();}}
  };
  RI.metricSeries=(n)=>{const day=Math.floor((Date.now()+12600000)/86400000),ser={views:Array(n).fill(0),linkViews:Array(n).fill(0),clicks:Array(n).fill(0)};for(const r of RI.statsRows||[]){const i=r.day-(day-n+1);if(i>=0&&i<n){const key={resume:'views',links:'linkViews',click:'clicks'}[r.event];if(key)ser[key][i]+=Number(r.total);}}return ser;};
  RI.linkClicks=(id,n=90)=>(RI.statsRows||[]).filter(r=>r.event==='click'&&r.link_id===id&&r.day>=Math.floor((Date.now()+12600000)/86400000)-n+1).reduce((s,r)=>s+Number(r.total),0);
})();
