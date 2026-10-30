/* ذخیرهٔ حساب روی سرور، پشتیبان تب و انتشار مستقل صفحه‌ها */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  RI.state = {
    content: RI.seed('empty'),
    billing: RI.seedBilling('free'),
    account: RI.seedAccount(),
    pub: {
      resume: { status: 'draft', version: 0, at: null, snap: null },
      links: { status: 'draft', version: 0, at: null, snap: null },
    },
    ui: { dirty: false, saving: false, saveError: false, savedAt: Date.now(), sim: { slow: false, failNext: false, nodata: false, netError: false }, profile: 'partial', plan: 'free', pubDemo: 'draft' },
  };
  RI.saved = JSON.stringify(RI.state.content);
  RI.S = () => RI.state;
  RI.C = () => RI.state.content;

  // Keep a tab backup for migration; MySQL is authoritative once the account has a saved revision.
  let draftKey;
  function validateDraft(value, sample, key = '') {
    if (sample === null) {
      if (key === 'at' && typeof value === 'number' && Number.isFinite(value)) return value;
      if (value !== null && (typeof value !== 'string' || value.length > 3 * 1024 * 1024)) throw new Error('Invalid image or snapshot');
      return value;
    }
    if (Array.isArray(sample)) {
      if (!Array.isArray(value) || value.length > 100 || (!sample.length && value.length)) throw new Error('Invalid list');
      return value.map(item => validateDraft(item, sample.find(s => s.type && s.type === item?.type) || sample[0]));
    }
    if (typeof sample === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object');
      return Object.fromEntries(Object.keys(sample).map(k => [k, validateDraft(value[k] === undefined ? sample[k] : value[k], sample[k], k)]));
    }
    if (typeof value !== typeof sample || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > 10000)) throw new Error('Invalid field');
    if (key === 'id' && !/^[a-z0-9_-]{1,64}$/i.test(value)) throw new Error('Invalid identifier');
    return value;
  }
  RI.restoreDraft = function (owner, serverSaved) {
    draftKey = 'resumeit-draft-v1:' + owner+(RI.workspaceSlot>1?':workspace:'+RI.workspaceSlot:'');
    if(serverSaved) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey));
      if (draft && draft.content && draft.content.profile && draft.pub) {
        const content = validateDraft(draft.content, RI.seed('full'));
        content.resumeTemplates = RI.validateResumeValues ? RI.validateResumeValues(draft.content.resumeTemplates || {}) : {};
        const publication = validateDraft(draft.pub, RI.state.pub);
        if (content.sections.some(s => !RI.seed('empty').sections.some(known => known.key === s.key))) throw new Error('Invalid section');
        RI.state.content = content; RI.state.pub = publication;
        RI.saved = JSON.stringify(content); RI.savedSlug = content.slug;
      }
    } catch { RI.toast('پیش‌نویس موقت قابل بازیابی نبود.', { kind: 'error' }); }
  };
  RI.keepDraft = function () {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ content: JSON.parse(RI.saved), pub: RI.state.pub }));
      return true;
    } catch { if(RI.revision)return true;RI.toast('ذخیرهٔ پشتیبان این تب انجام نشد؛ اطلاعات را روی حساب ذخیره کن.', { kind: 'error' }); return false; }
  };
  RI.clearDraft = () => { try { sessionStorage.removeItem(draftKey); } catch {} };

  /* ---------- تغییر و ذخیره ---------- */
  let saveTimer, savingPromise, saveAgain=false, observed, lastScope, lastEdit=0;
  const history=[];
  // The resume page saves on request on wide screens; phones have no save button, so it saves on its own there.
  RI.manualSave=()=>document.body.dataset.page==='resume'&&!(typeof matchMedia==='function'&&matchMedia('(max-width:960px)').matches);
  const editSnapshot=()=>JSON.stringify({content:RI.C(),indexing:RI.state.account.indexing});
  function cancelCountdown(){clearTimeout(saveTimer);RI.state.ui.saveDue=0;}
  RI.resetEdits=function(){cancelCountdown();history.length=0;observed=editSnapshot();lastScope=null;};
  RI.canUndo=()=>history.length>0;
  function scheduleSave(){
    cancelCountdown();
    if(RI.manualSave() || RI.conflict)return;
    RI.state.ui.saveDue=Date.now()+2000;
    function tick(){
      RI.emit('save');
      if(Date.now()>=RI.state.ui.saveDue){RI.save();return;}
      saveTimer=setTimeout(tick,100);
    }
    saveTimer=setTimeout(tick,100);RI.emit('save');
  }
  RI.touch=function(scope){
    const next=editSnapshot(),now=Date.now();
    if(next!==observed){
      if(observed&&(scope==='theme'||scope!==lastScope||now-lastEdit>800||!history.length)){
        history.push(observed);if(history.length>10)history.shift();
      }
      observed=next;lastScope=scope;lastEdit=now;
    }
    RI.state.ui.dirty=true;RI.state.ui.saveError=!!RI.conflict;
    RI.emit('change',{scope});scheduleSave();RI.emit('save');
  };

  // Different fields merge; overlapping edits require a deliberate choice.
  RI.mergeEdits=function(base,local,remote,preferLocal=false){
    const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    if(equal(local,remote)||equal(base,remote))return local;
    if(equal(base,local))return remote;
    if(base&&local&&remote&&typeof base==='object'&&typeof local==='object'&&typeof remote==='object'){
      if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)){
        const ids=a=>a.map(x=>x?.id||x?.key);
        if(equal(ids(base),ids(local))&&equal(ids(base),ids(remote)))return local.map((x,i)=>RI.mergeEdits(base[i],x,remote[i],preferLocal));
      }else if(!Array.isArray(base)&&!Array.isArray(local)&&!Array.isArray(remote)){
        return Object.fromEntries([...new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])].map(k=>[k,RI.mergeEdits(base[k],local[k],remote[k],preferLocal)]).filter(([,v])=>v!==undefined));
      }
    }
    if(preferLocal)return local;
    throw Object.assign(new Error('این بخش در تب دیگری هم تغییر کرده؛ برای انتخاب نسخه روی «بررسی تداخل» بزن.'),{code:'EDIT_CONFLICT'});
  };
  function applyMerged(target,source){
    for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
    for(const [key,value]of Object.entries(source)){
      if(Array.isArray(value)&&Array.isArray(target[key])&&value.every(row=>row&&typeof row==='object'&&(row.id||row.key))){
        const previous=new Map(target[key].map(row=>[row.id||row.key,row]));
        const rows=value.map(row=>{const old=previous.get(row.id||row.key);if(old){applyMerged(old,row);return old;}return row;});
        target[key].splice(0,target[key].length,...rows);
      }else if(value&&typeof value==='object'&&!Array.isArray(value)&&target[key]&&typeof target[key]==='object'&&!Array.isArray(target[key]))applyMerged(target[key],value);
      else target[key]=value;
    }
  }
  async function recoverVersion(error){
    const doc=await RI.dashboardRequest('document');
    if(error.code==='NETWORK_ERROR'&&doc.revision===RI.revision)throw error;
    const base={content:JSON.parse(RI.saved),indexing:RI.savedIndexing},local=JSON.parse(editSnapshot()),remote={content:doc.content,indexing:doc.preferences.indexing};
    let merged;
    try{merged=RI.mergeEdits(base,local,remote);}catch(e){RI.conflict={base,doc};throw e;}
    applyMerged(RI.C(),merged.content);RI.state.account.indexing=merged.indexing;
    RI.saved=JSON.stringify(doc.content);RI.savedIndexing=doc.preferences.indexing;RI.revision=doc.revision;RI.state.pub=doc.pub;
    history.length=0;observed=editSnapshot();RI.emit('change');
  }
  RI.resolveConflict=async function(){
    if(!RI.conflict)return RI.save();
    const pick=await RI.choice({title:'ویرایش هم‌زمان در دو تب',text:'اطلاعات تغییرکرده در بخش‌های دیگر حفظ می‌شود. برای بخش مشترک، کدام نسخه را نگه داریم؟',options:[{label:'تغییرات این صفحه',kind:'primary',value:'local'},{label:'نسخهٔ ذخیره‌شده',kind:'soft',value:'remote'},{label:'بعداً تصمیم می‌گیرم',kind:'ghost',value:null}]});
    if(!pick)return false;
    const {base,doc}=RI.conflict,remote={content:doc.content,indexing:doc.preferences.indexing},local=JSON.parse(editSnapshot());
    const merged=pick==='local'?RI.mergeEdits(base,local,remote,true):RI.mergeEdits(base,remote,local,true);
    applyMerged(RI.C(),merged.content);RI.state.account.indexing=merged.indexing;RI.saved=JSON.stringify(doc.content);RI.savedIndexing=doc.preferences.indexing;RI.revision=doc.revision;RI.state.pub=doc.pub;RI.conflict=null;observed=editSnapshot();RI.rerender();return RI.save();
  };
  RI.save=function(){
    cancelCountdown();
    if(savingPromise){saveAgain=true;return savingPromise;}
    if(RI.conflict)return Promise.resolve(false);
    const ui=RI.state.ui;
    savingPromise=(async()=>{
      ui.saving=true;ui.saveError=false;RI.emit('save');let recovered=false;
      try{
        do{
          saveAgain=false;
          const snapshot=JSON.stringify(RI.C()),indexing=RI.state.account.indexing;
          let doc;const base=JSON.parse(RI.saved),content=JSON.parse(snapshot),patch=RI.revision===0?content:Object.fromEntries(Object.entries(content).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(base[key])));
          try{doc=await RI.dashboardRequest('save',{revision:RI.revision,patch,preferences:{indexing},compact:true});}
          catch(e){if(!recovered&&['REVISION_CONFLICT','NETWORK_ERROR'].includes(e.code)){recovered=true;await recoverVersion(e);saveAgain=true;continue;}throw e;}
          RI.revision=doc.revision;RI.saved=JSON.stringify(doc.content||JSON.parse(snapshot));RI.savedSlug=doc.slug||'';RI.savedIndexing=doc.preferences.indexing;
          ui.dirty=snapshot!==JSON.stringify(RI.C())||indexing!==RI.state.account.indexing;
          if(!ui.dirty){Object.assign(RI.state.account,doc.preferences);observed=editSnapshot();}
          ui.savedAt=Date.now();RI.keepDraft();
        }while(ui.dirty&&(saveAgain||!RI.manualSave()&&(!ui.saveDue||Date.now()>=ui.saveDue)));
        return !ui.dirty;
      }catch(e){ui.saveError=true;ui.saveMessage=e.message;cancelCountdown();RI.toast(e.message,{kind:'error'});return false;}
      finally{ui.saving=false;savingPromise=null;RI.emit('save');}
    })();return savingPromise;
  };

  RI.undo = function () {
    if(!history.length) return;
    const previous=JSON.parse(history.pop());
    RI.state.content=previous.content; RI.state.account.indexing=previous.indexing;
    observed=editSnapshot(); lastScope=null;
    RI.state.ui.dirty=true; RI.state.ui.saveError=false;
    RI.emit('change'); RI.emit('save'); RI.rerender(); scheduleSave();
  };
  RI.revert = function () {
    cancelCountdown();RI.conflict=null;
    RI.state.content=JSON.parse(RI.saved);
    RI.state.account.indexing=RI.savedIndexing;
    RI.state.ui.dirty=false; RI.state.ui.saveError=false;
    RI.resetEdits(); RI.emit('change'); RI.emit('save');
  };

  RI.leaveGuard = async function () {
    if (!RI.state.ui.dirty && !RI.state.ui.saving) return true;
    if(!RI.manualSave()&&await RI.save()) return true;
    const c=await RI.choice({
      title:RI.manualSave()?'تغییرات رزومه ذخیره نشده‌اند':'تغییرات هنوز ذخیره نشده‌اند',
      text:'قبل از رفتن، تغییرات را ذخیره کنیم؟ خروج بدون ذخیره ویرایش‌های اخیرت را از بین می‌برد.',
      options:[
        {label:'تلاش دوباره و ادامه',kind:'primary',icon:'save',value:'save'},
        {label:'دور انداختن تغییرات',kind:'danger',value:'discard'},
        {label:'ماندن در صفحه',kind:'ghost',value:'stay'}
      ]
    });
    if(c==='save') return await RI.save();
    if(c==='discard'){ RI.revert(); return true; }
    return false;
  };

  /* ---------- دسترسی و خرید ---------- */
  RI.hasSub = () => { const p = RI.state.billing.plan; return !!(p && p.end > Date.now()); };
  RI.owns = (ref) => RI.state.billing.purchases.some((p) => p.ref === ref);
  /* ref: rt:id | lt:id | font:id | pal:id */
  RI.accessOf = function (ref, item) {
    if (item.access === 'free') return 'free';
    if (item.access === 'buy') return RI.owns(ref) ? 'owned' : item.subscription && RI.hasSub() ? 'sub-ok' : item.subscription ? 'locked-special' : 'locked-buy';
    return RI.hasSub() ? 'sub-ok' : 'locked-sub';
  };
  RI.canUse = (ref, item) => ['free', 'owned', 'sub-ok'].indexOf(RI.accessOf(ref, item)) > -1;
  RI.findTemplate = (kind, id) => (kind === 'links' ? RI.LINK_TEMPLATES : RI.RESUME_TEMPLATES).find((t) => t.id === id) || (kind === 'links' ? RI.LINK_TEMPLATES[0] : RI.RESUME_TEMPLATES[0]);

  /* ---------- نام صفحه ---------- */
  RI.slugCheck = function (v) {
    const s = (v || '').trim();
    if (!s) return { state: 'empty', msg: 'نام صفحه را وارد کنید.' };
    if (s.length < 3) return { state: 'invalid', msg: 'نام صفحه دست‌کم ۳ نویسه باید باشد.' };
    if (s.length > 24) return { state: 'invalid', msg: 'نام صفحه حداکثر ۲۴ نویسه می‌تواند باشد.' };
    if (/[A-Z]/.test(s)) return { state: 'invalid', msg: 'فقط حروف کوچک انگلیسی مجاز است.' };
    if (!/^[a-z0-9-]+$/.test(s)) return { state: 'invalid', msg: 'فقط حروف انگلیسی، عدد و خط تیره مجاز است (بدون فاصله و فارسی).' };
    if (/^-|-$/.test(s)) return { state: 'invalid', msg: 'نام صفحه نباید با خط تیره شروع یا تمام شود.' };
    if (/--/.test(s)) return { state: 'invalid', msg: 'دو خط تیرهٔ پشت‌سرهم مجاز نیست.' };
    const own = (RI.savedSlug || '');
    if (RI.TAKEN_SLUGS.indexOf(s) > -1 && s !== own) return { state: 'taken', msg: 'این نام رزرو شده است.' };
    return { state: 'ok', msg: 'نام معتبر است؛ آزاد بودن آن هنگام ذخیره بررسی می‌شود.' };
  };
  RI.savedSlug = RI.state.content.slug;
  RI.suggestSlugs = (s) => [s + '-dev', s + '-' + (new Date().getFullYear() % 100), 'the-' + s].filter((x) => RI.slugCheck(x).state === 'ok');
  RI.urls = function () {
    const sl = RI.C().slug || 'username';
    const host = 'https://' + sl + '.' + RI.DOMAIN.toLowerCase();
    const routes=RI.C().routing||{resume:'',links:'link'},resumePath=routes.resume?'/'+routes.resume:'',linksPath='/'+routes.links;
    if(RI.workspaceSlot===3)return {resume:'',links:'https://'+RI.DOMAIN.toLowerCase()+'/'+sl,base:RI.DOMAIN+'/'+sl,fallbackResume:'',fallbackLinks:location.origin+'/'+sl};
    return { resume: host+resumePath, links: host+linksPath, base: sl + '.' + RI.DOMAIN, fallbackResume:location.origin+'/u/'+sl+(resumePath||'/'),fallbackLinks:location.origin+'/u/'+sl+linksPath };
  };

  /* ---------- پیشرفت و چک‌لیست ---------- */
  RI.completion = function () {
    const c = RI.C(), p = c.profile;
    if(RI.workspaceSlot===3){const items=RI.readiness().links;return {items,pct:Math.round(100*items.filter(i=>i.done).length/items.length),next:items.find(i=>!i.done)||null};}
    const items = [
      { id: 'name', label: 'نام و عنوان حرفه‌ای', w: 15, done: !!(p.name.trim() && p.title.trim()), route: 'resume', step: 'profile' },
      { id: 'bio', label: 'معرفی کوتاه (حداقل ۴۰ نویسه)', w: 10, done: p.bio.trim().length >= 40, route: 'resume', step: 'profile' },
      { id: 'avatar', label: 'عکس پروفایل', w: 10, done: !!p.avatar, route: 'resume', step: 'profile' },
      { id: 'contact', label: 'یک راه تماس عمومی', w: 10, done: c.contacts.some((x) => x.public && x.value.trim()), route: 'resume', step: 'contacts' },
      { id: 'skills', label: 'حداقل سه مهارت', w: 10, done: c.skills.length >= 3, route: 'resume', step: 'skills' },
      { id: 'history', label: 'یک تجربه یا سابقهٔ تحصیلی', w: 10, done: c.experience.length + c.education.length >= 1, route: 'resume', step: 'experience' },
      { id: 'projects', label: 'یک پروژه یا نمونه‌کار', w: 10, done: c.projects.length >= 1, route: 'resume', step: 'projects' },
      { id: 'links', label: 'حداقل دو لینک فعال', w: 10, done: c.links.items.filter((i) => i.type === 'link' && i.active).length >= 2, route: 'links' },
      { id: 'look', label: 'شخصی‌سازی ظاهر', w: 5, done: c.theme.resume !== 'glacier' || c.theme.font !== 'vazir' || c.theme.palette !== 'default' || c.theme.links !== 'frost', route: 'themes' },
      { id: 'slug', label: 'انتخاب نام صفحه', w: 5, done: RI.slugCheck(c.slug).state === 'ok', route: 'publish' },
      { id: 'publish', label: 'انتشار صفحه', w: 5, done: RI.state.pub.resume.status === 'published', route: 'publish' },
    ];
    const pct = items.reduce((a, i) => a + (i.done ? i.w : 0), 0);
    return { items: items, pct: pct, next: items.find((i) => !i.done) || null };
  };

  RI.BADGES = [
    { id: 'start', label: 'شروع‌کننده', at: 15, icon: 'flag' },
    { id: 'alive', label: 'پروفایل جان‌دار', at: 50, icon: 'sparkle' },
    { id: 'serious', label: 'رزومهٔ جدی', at: 75, icon: 'award' },
    { id: 'ready', label: 'محتوای پربار', at: 90, icon: 'rocket' },
    { id: 'live', label: 'منتشر شد', at: 101, icon: 'trophy' },
  ];
  RI.badgeState = function () {
    const comp = RI.completion(), live = RI.state.pub.resume.status === 'published';
    return RI.BADGES.map((b) => ({ id: b.id, label: b.label, icon: b.icon, at: b.at, got: b.id === 'live' ? live : comp.pct >= b.at }));
  };

  RI.readiness = function () {
    const c = RI.C(), p = c.profile, slug = RI.slugCheck(c.slug);
    const hasBody = c.skills.length + c.experience.length + c.education.length + c.projects.length > 0;
    const resume = [
      {id:'account-first',req:true,label:'نام حساب',done:!!RI.state.account.firstName,route:'settings'},
      {id:'account-last',req:true,label:'نام خانوادگی حساب',done:!!RI.state.account.lastName,route:'settings'},
      {id:'account-phone',req:true,label:'تأیید شمارهٔ موبایل',done:RI.state.account.mobileVerified&&!!RI.state.account.mobile,route:'settings'},
      ...RI.resumeRequirements(c),
      { id: 'slug', req: true, label: 'قالب معتبر نام صفحه', done: slug.state === 'ok', route: 'publish', anchor: 'slug' },
      { id: 'avatar', req: false, label: 'عکس پروفایل', done: !!p.avatar, route: 'resume', step: 'profile' },
      { id: 'bio', req: false, label: 'معرفی کوتاه', done: p.bio.trim().length >= 40, route: 'resume', step: 'profile' },
      { id: 'proj', req: false, label: 'حداقل یک پروژه', done: c.projects.length > 0, route: 'resume', step: 'projects' },
      { id: 'share', req: false, label: 'عنوان و توضیح اشتراک‌گذاری', done: !!(c.share.title.trim() && c.share.desc.trim()), route: 'publish', anchor: 'share' },
    ];
    const links = [
      {id:'account-first',req:true,label:'نام حساب',done:!!RI.state.account.firstName,route:'settings'},
      {id:'account-last',req:true,label:'نام خانوادگی حساب',done:!!RI.state.account.lastName,route:'settings'},
      {id:'account-phone',req:true,label:'تأیید شمارهٔ موبایل',done:RI.state.account.mobileVerified&&!!RI.state.account.mobile,route:'settings'},
      { id: 'lslug', req: true, label: 'قالب معتبر نام صفحه', done: slug.state === 'ok', route: 'publish', anchor: 'slug' },
      { id: 'litem', req: true, label: 'حداقل یک لینک فعال', done: c.links.items.some((i) => i.type === 'link' && i.active), route: 'links' },
      { id: 'lname', req: true, label: 'نام نمایشی بالای صفحه', done: !!((c.links.header.sync ? p.name : c.links.header.name).trim()), route: 'links', tab: 'header' },
      { id: 'lbio', req: false, label: 'معرفی کوتاه بالای صفحه', done: !!((c.links.header.sync ? p.bio : c.links.header.bio).trim()), route: 'links', tab: 'header' },
    ];
    return { resume: resume, links: links, resumeOk: resume.filter((i) => i.req).every((i) => i.done), linksOk: links.filter((i) => i.req).every((i) => i.done) };
  };

  /* ---------- نسخهٔ منتشرشده ---------- */
  RI.pubData = function (k, c = RI.C()) {
    return RI.publicationData(k,c);
  };
  RI.pubDirty = function (k) { const s = RI.state.pub[k]; return s.status === 'published' && JSON.stringify(RI.pubData(k)) !== s.snap; };

  /* انتشار آخرین محتوای ذخیره‌شده روی سرور */
  RI.publish = async function (k, onStep) {
    const owner=RI.ownerId,slot=RI.workspaceSlot;
    const sameContext=()=>owner===RI.ownerId&&slot===RI.workspaceSlot;
    const changed=()=>Object.assign(new Error('حساب یا صفحهٔ فعال تغییر کرده؛ وضعیت انتشار را در صفحهٔ اصلی بررسی کن'),{code:'ACCOUNT_CHANGED'});
    const eligibility=await RI.accountRequest('publication-check');
    if(!sameContext())throw changed();
    if(!eligibility.canPublish){RI.toast('قبل از انتشار '+eligibility.missing.join('، ')+' رو در تنظیمات کامل کن',{kind:'error'});throw new Error('account-incomplete');}
    const steps = ['بررسی اطلاعات صفحه', 'ساخت نسخهٔ جدید', 'آماده‌سازی آدرس عمومی'];
    onStep && onStep(0,steps);
    if(RI.state.ui.dirty||!RI.revision){if(!await RI.save())throw new Error('ابتدا تغییرات را ذخیره کن');}
    if(!sameContext())throw changed();
    onStep && onStep(1,steps);
    const revision=RI.revision,version=Number(RI.state.pub[k].version);let doc;
    try{doc=await RI.dashboardRequest('publish',{revision,kind:k,compact:true});}
    catch(error){
      if(!sameContext())throw changed();
      if(!['NETWORK_ERROR','INVALID_RESPONSE'].includes(error.code))throw error;
      // A lost response is not a failed transaction. Read once; never repeat the publication POST.
      try{const fresh=await RI.dashboardRequest('document');if(fresh.revision===revision+1&&fresh.pub?.[k]?.status==='published'&&Number(fresh.pub[k].version)===version+1)doc=fresh;}catch{}
      if(!sameContext())throw changed();
      if(!doc)throw error;
    }
    if(!sameContext()||RI.revision!==revision)throw changed();
    RI.revision=doc.revision;RI.state.pub=doc.pub;RI.savedSlug=doc.slug;
    onStep && onStep(steps.length, steps);
    RI.emit('pub');
  };
  RI.unpublish = async function (k) {const doc=await RI.dashboardRequest('unpublish',{revision:RI.revision,kind:k});RI.revision=doc.revision;RI.state.pub=doc.pub;RI.emit('pub');};

})();
