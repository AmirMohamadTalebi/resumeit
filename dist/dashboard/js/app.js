/* پوستهٔ برنامه: ناوبری، صفحات مستقل، نوار بالا، وضعیت ذخیره، اتصال به ورود و خروج */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  const NAV = [
    { group: 'استودیو', items: [['home', 'خانهٔ داشبورد', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'صفحهٔ لینک‌ها', 'link'], ['themes', 'ظاهر و قالب', 'palette'], ['studio', 'آمادگی انتشار', 'check']] },
    { group: 'انتشار', items: [['publish', 'آدرس و انتشار', 'globe'], ['stats', 'آمار', 'chart'], ['messages', 'پیام‌های رزومه', 'mail']] },
    { group: 'حساب', items: [['wallet', 'کیف پول It', 'card'], ['billing', 'اشتراک و خریدها', 'crown'], ['settings', 'تنظیمات حساب', 'settings']] },
    { group: 'پشتیبانی', items: [['support', 'تیکت‌ها', 'help'], ['support', 'تیکت جدید', 'plus', {tab:'new'}], ['contact', 'ارتباط با ما', 'mail', {href:'/contact/'}], ['telegram', 'پشتیبانی تلگرام', 'telegram', {href:'https://t.me/amirtalebi_x',external:true}], ['channel', 'کانال تلگرام', 'telegram', {href:'https://t.me/resumeit_ir',external:true}]] },
    { group: 'اعلان‌ها', items: [['notifications', 'همهٔ اعلان‌ها', 'bell'], ['notifications', 'خوانده‌نشده‌ها', 'eye', {tab:'unread'}], ['notifications', 'تنظیمات اعلان‌ها', 'settings', {tab:'preferences'}], ['changes', 'تغییرات رزومیت', 'refresh', {href:'/changes/'}]] },
  ];
  const BOTTOM = [['home', 'خانه', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'لینک‌ها', 'link'], ['themes', 'قالب‌ها', 'palette']];
  const LOGO = '<span class="ri-logo"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="2172" height="724"></span>';

  let current = null, cleanup = null, bootstrapping = true;
  function navGroup(g){
    const id=g.items[0][0],collapsible=['wallet','support','notifications'].includes(id);
    const links=g.items.filter(i=>i[0]!=='home').map(i=>{const opts=i[3]||{};return '<li><a class="nav__item" href="'+(opts.href||RI.routeUrl(i[0],opts))+'" '+(opts.href?'':('data-route="'+i[0]+'" '+(opts.tab?'data-tab="'+opts.tab+'"':'')))+(opts.external?' target="_blank" rel="noopener noreferrer"':'')+' title="'+i[1]+'">'+RI.icon(i[2])+'<span>'+i[1]+'</span></a></li>';}).join('');
    return '<ul class="menu nav__group'+(collapsible?' nav__group--collapse':'')+'" data-nav-group="'+id+'" data-open="false"><li class="menu-title nav__label"><span>'+g.group+'</span>'+(collapsible?'<button type="button" class="nav__disclosure" aria-expanded="false" aria-controls="nav-children-'+id+'">'+RI.icon(id==='wallet'?'card':id==='support'?'help':'bell')+'<span>'+g.group+'</span>'+RI.icon('chevD')+'</button>':'')+'</li><li class="nav__children" id="nav-children-'+id+'"><ul>'+links+'</ul></li></ul>';
  }

  /* ---------- ساخت پوسته ---------- */
  function buildShell() {
    const acc = RI.state.account;
    RI.$('#sidebar').innerHTML =
      '<div class="sidebar__glass"><div class="brand"><a href="/" aria-label="خانهٔ ResumeIt">' + LOGO + '</a><button type="button" class="btn btn--icon btn--ghost drawer-close" id="drawerClose" aria-label="بستن منو">'+RI.icon('x')+'</button></div>' +
      '<nav class="nav" aria-label="بخش‌های داشبورد">' + NAV.map(navGroup).join('')+'</nav>' +
      '<div class="sidebar__foot">'+(acc.isAdmin?'<a class="panel-switch" href="/admin/">'+RI.icon('shield')+'<span>ورود به مدیریت</span>'+RI.icon('chevL')+'</a>':'')+'<a class="panel-help" href="/dashboard/support/" data-route="support">'+RI.icon('help')+'پشتیبانی</a><button type="button" class="account-btn" id="accountBtn" aria-haspopup="menu"><img class="avatar" id="accAvatar" alt="تصویر پروفایل" src="/brand/resumeit-mark-v1.png"><span class="account-btn__info"><span class="account-btn__name" id="accName"></span><span class="account-btn__sub">پروفایل و دسترسی سریع</span></span>'+RI.icon('chevL')+'</button><small><a href="/changes/" data-site-version>تغییرات رزومیت</a></small></div></div>';
    if(acc.isSupport||acc.isAdmin)RI.$('.sidebar__foot').insertAdjacentHTML('afterbegin','<a class="panel-switch" href="/staff/">'+RI.icon('help')+'<span>پنل پشتیبانی</span>'+RI.icon('chevL')+'</a>');
    RI.$('#bottomNav').innerHTML = BOTTOM.filter(i=>RI.workspaceSlot!==3||i[0]!=='resume').map(i=>'<a href="'+RI.routeUrl(i[0])+'" data-route="'+i[0]+'">'+RI.icon(i[2])+'<span>'+i[1]+'</span></a>').join('')+'<button type="button" data-all-pages aria-label="همهٔ بخش‌ها">'+RI.icon('menu')+'<span>بیشتر</span></button>';
    paintAccount();RI.polishShell?.();
    const mobileGroups=matchMedia('(max-width:960px)'),groups=RI.$$('.nav__group--collapse');
    const syncGroups=()=>groups.forEach(g=>{const closed=mobileGroups.matches&&g.dataset.open!=='true',panel=g.querySelector('.nav__children');panel.inert=closed;if(closed)panel.setAttribute('aria-hidden','true');else panel.removeAttribute('aria-hidden');});
    RI.collapseMobileGroups=()=>{groups.forEach(g=>{g.dataset.open='false';g.querySelector('button').setAttribute('aria-expanded','false');});syncGroups();};
    RI.$('#sidebar').addEventListener('click',e=>{const button=e.target.closest('.nav__disclosure');if(!button)return;const group=button.closest('.nav__group'),opening=group.dataset.open!=='true';groups.forEach(g=>{const on=g===group&&opening;g.dataset.open=String(on);g.querySelector('button').setAttribute('aria-expanded',String(on));});syncGroups();});
    mobileGroups.addEventListener('change',syncGroups);syncGroups();
  }
  function paintAccount() {
    RI.$('#accName').textContent = RI.state.account.name;
    RI.$('#accAvatar').src = RI.avatarOf(RI.C().profile);RI.$('#accAvatar').alt='تصویر پروفایل '+RI.state.account.name;
  }

  /* ---------- نوار بالا و وضعیت ذخیره ---------- */
  // Phones show the save state and undo only once something has actually been saved in this visit.
  let savedOnce=false,wasSaving=false;
  function paintSave() {
    const ui = RI.state.ui, el = RI.$('#saveState');let btn=RI.$('#saveBtn');
    const tag=RI.manualSave()?'BUTTON':'SPAN';
    if(btn.tagName!==tag){const replacement=document.createElement(tag.toLowerCase());replacement.id='saveBtn';replacement.setAttribute('aria-live','off');btn.replaceWith(replacement);btn=replacement;if(tag==='BUTTON')btn.type='button';}
    let st = 'saved', txt = 'ذخیره شده', ic = 'check';
    if (ui.saving) { st = 'saving'; txt = 'در حال ذخیره…'; ic = 'refresh'; }
    else if (ui.saveError) { st = 'error'; txt = 'ذخیره نشد'; ic = 'alert'; }
    else if (ui.dirty) { st = 'dirty'; txt = 'در انتظار ذخیره…'; ic = 'edit'; }
    el.dataset.state = st;
    el.setAttribute('aria-label',txt); el.title=txt;
    el.innerHTML = RI.icon(ic, st === 'saving' ? 'spin' : '') + '<span class="save-state__txt">' + txt + '</span>';
    btn.hidden=false;btn.setAttribute('role',RI.manualSave()?'button':'timer');
    if(RI.manualSave()){
      btn.className='btn btn--soft btn--sm';
      btn.disabled=ui.saving||(!ui.dirty&&!ui.saveError);
      btn.innerHTML=RI.icon(ui.saving?'refresh':'save')+'<span class="hide-sm">'+(ui.saving?'در حال ذخیره…':'ذخیره')+'</span>';
    }else{
      btn.className='save-countdown';btn.disabled=true;
      const remaining=Math.max(0,(ui.saveDue||0)-Date.now());
      btn.hidden=!remaining&&!ui.saving;
      btn.textContent=remaining?RI.fa(Math.ceil(remaining/1000))+' ثانیه': 'در حال ذخیره…';
      btn.title=remaining?'ذخیره پس از آخرین تغییر':'ذخیره در پس‌زمینه';
    }
    const error=RI.$('#saveError');error.hidden=!ui.saveError;
    if(ui.saveError){error.innerHTML='<span>'+RI.esc(ui.saveMessage||'ذخیره انجام نشد؛ تغییراتت در این صفحه باقی است.')+'</span><button type="button" class="btn btn--soft btn--sm" data-save-retry>'+ (RI.conflict?'بررسی تداخل':'تلاش دوباره')+'</button>';}
    RI.$('#undoBtn').disabled = !RI.canUndo();
    if(ui.saving)wasSaving=true;else if(wasSaving){wasSaving=false;if(!ui.saveError)savedOnce=true;}
    document.body.classList.toggle('ri-save-active',savedOnce||ui.saving||!!ui.saveError);document.body.classList.toggle('ri-can-undo',savedOnce&&RI.canUndo());
    el.setAttribute('role', 'status');
  }
  RI.doSave = async function () {
    const ok = await (RI.conflict?RI.resolveConflict():RI.save());
    if (ok) RI.toast('تغییرات ذخیره شد');
    return ok;
  };

  /* ---------- مسیریاب ---------- */
  RI.go = function (id, opts) {
    navigate(id, opts);
  };
  RI.routeOpts = null;
  RI.routeUrl = (id, opts) => {
    const url = new URL(id === 'home' ? '/dashboard/' : '/dashboard/' + id + '/', location.origin);
    for (const key of ['step', 'tab', 'anchor']) if (opts && opts[key]) url.searchParams.set(key, opts[key]);
    return url.pathname + url.search;
  };
  let navigationEpoch=0,navigationGuard=null,currentUrl=location.pathname+location.search;
  RI.setRouteTab=(tab,initial)=>{const url=new URL(location.href);if(tab===initial)url.searchParams.delete('tab');else url.searchParams.set('tab',tab);history.replaceState(history.state,'',url.pathname+url.search+url.hash);currentUrl=url.pathname+url.search;};
  const pageLoads=new Map();
  RI.loadPage=async id=>{if(!NAV.some(g=>g.items.some(i=>i[0]===id)))throw new Error('بخش نامعتبر است');if(!RI.pages[id])await loadScript('/dashboard/js/pages/'+id+'.js');return RI.pages[id];};
  RI.setRouteStep=step=>{const url=new URL(location.href);url.searchParams.set('step',step);history.replaceState(history.state,'',url.pathname+url.search);currentUrl=url.pathname+url.search;};
  function loadScript(path) {
    if(!pageLoads.has(path)) pageLoads.set(path,new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=path+'?v='+document.documentElement.dataset.assetVersion;
      script.onload=resolve;script.onerror=()=>{pageLoads.delete(path);script.remove();reject(new Error('این بخش دریافت نشد؛ اتصال اینترنت را بررسی کن و دوباره بزن'));};
      document.head.append(script);
    }));
    return pageLoads.get(path);
  }
  RI.loadResumeEditor=()=>RI.mountImportedEditor?Promise.resolve():loadScript('/dashboard/js/template-editor.js');
  async function navigate(id, opts, back=false) {
    if (!NAV.some(g => g.items.some(i => i[0] === id))) return;
    if(bootstrapping){location.assign(RI.routeUrl(id,opts));return;}
    const epoch=++navigationEpoch,owner=RI.ownerId,slot=RI.workspaceSlot,previous=currentUrl;
    const latest=()=>epoch===navigationEpoch&&owner===RI.ownerId&&slot===RI.workspaceSlot;
    try {
      navigationGuard ||= RI.leaveGuard().finally(()=>{navigationGuard=null;});
      const allowed=await navigationGuard;if(!latest())return;
      if(!allowed){if(back)history.replaceState(null,'',previous);return;}
      RI.$('#routeLoading')?.remove();
      if(!RI.pages[id]){RI.$('#topTitle').setAttribute('aria-busy','true');RI.$('#view').inert=true;}
      if(!RI.pages[id]) await loadScript('/dashboard/js/pages/'+id+'.js');
      if(!latest())return;
      if(!RI.pages[id])throw new Error('بارگذاری بخش کامل نشد؛ صفحه را دوباره باز کن');
      if(!back)history.pushState(null,'',RI.routeUrl(id,opts));
      document.body.dataset.page=id;
      RI.routeOpts=opts||{};
      await render(id);currentUrl=location.pathname+location.search;
      paintSave();
      if(['home','links','stats'].includes(id)&&RI.statsRows===null&&!RI.statsLoading)RI.loadStats();
    } catch(e) { if(!latest())return;if(back)history.replaceState(null,'',previous);RI.toast(e.message,{kind:'error'}); }
    finally { if(latest()){RI.$('#routeLoading')?.remove();RI.$('#topTitle').removeAttribute('aria-busy');RI.$('#view').inert=false;} }
  }

  async function render(id, force) {
    const page = RI.pages[id];
    const previousView = RI.$('#view');
    if (cleanup) { try { cleanup(); } catch (e) { /* ok */ } cleanup = null; }
    // Each mount owns its listeners; replacing the root discards the previous mount's handlers.
    const view=previousView.cloneNode(false);view.inert=false;previousView.replaceWith(view);
    current = id;
    RI.$$('[data-route]').forEach((a) => { if (a.dataset.route === id && (!a.closest('#sidebar') || (a.dataset.tab||'') === (RI.routeOpts?.tab||''))) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    RI.$('#topTitle').textContent = id === 'resume' ? 'رزومهٔ من' : page.title;
    RI.$('.topbar__crumb').innerHTML = RI.icon(id === 'links' ? 'link' : 'file') + '<span>' + (NAV.find(g=>g.items.some(i=>i[0]===id))?.group || 'داشبورد') + '</span>' + RI.icon('chevL');
    document.title = page.title + ' | ResumeIt';
    closeDrawer();
    const opts = RI.routeOpts; RI.routeOpts = null;
    const ctx = { opts: opts || {} };


    view.innerHTML = page.render(ctx);
    RI.$$('a[data-go]', view).forEach(a => { a.href = RI.routeUrl(a.dataset.go, a.dataset); });
    cleanup = page.mount ? page.mount(view, ctx) : null;
    RI.polishView?.(view,id);
    RI.$$('#sidebar [data-route=resume]').forEach(link=>{link.hidden=RI.workspaceSlot===3;});
    RI.animateRings(view); RI.animateBars(view);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (!force) { const h = RI.$('#page-title', view); if (h) h.focus({ preventScroll: true }); }
  }
  RI.rerender = () => { if (current) render(current, true); };

  /* ---------- کشو (موبایل) ---------- */
  const mobile=matchMedia('(max-width:960px)');
  function setDrawer(open){
    if(open&&mobile.matches)RI.collapseMobileGroups?.();
    RI.$('#sidebar').dataset.open=String(open);RI.$('#scrim').dataset.open=String(open);
    RI.$('#menuBtn').setAttribute('aria-expanded',String(open));
    RI.$('.main').inert=open&&mobile.matches;RI.$('#bottomNav').inert=open&&mobile.matches;
    RI.$('#sidebar').inert=!open&&mobile.matches;
    if(open)RI.$('#drawerClose').focus();
  }
  let drawerOpener;
  function openDrawer(event){drawerOpener=event?.target?.closest('button')||document.activeElement;setDrawer(true);}
  function restoreDrawerFocus(){(drawerOpener?.isConnected?drawerOpener:RI.$('#menuBtn')).focus();}
  function closeDrawer(){setDrawer(false);}

  /* ---------- راه‌اندازی ---------- */
  async function boot() {
    const user = await window.resumeitSession;
    if (!user) return;
    RI.applyAccount(user);buildShell();
    RI.$('#view').innerHTML=RI.sectionLoading('در حال دریافت اطلاعات صفحه…');
    window.resumeitPageLoading?.finish();
    RI.$('#topPreview').disabled=true;
    RI.delegate(document,'click','[data-route]',(e,b)=>{if(!bootstrapping||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(b.dataset.route);});
    RI.$('#menuBtn').addEventListener('click',openDrawer);
    RI.$('#scrim').addEventListener('click',()=>{closeDrawer();restoreDrawerFocus();});
    RI.$('#drawerClose').addEventListener('click',()=>{closeDrawer();restoreDrawerFocus();});
    RI.delegate(document,'click','[data-all-pages]',openDrawer);mobile.addEventListener('change',closeDrawer);closeDrawer();
    try{await RI.loadDashboard(user.id);}catch(e){RI.$('#view').textContent=e.message;const retry=document.createElement('button');retry.className='btn';retry.textContent='تلاش دوباره';retry.addEventListener('click',()=>location.reload());RI.$('#view').appendChild(retry);document.dispatchEvent(new Event('ri:dashboard-ready'));return;}
    RI.applyAccount(user);
    paintAccount();bootstrapping=false;RI.$('#topPreview').disabled=false;
    if(user.is_admin&&sessionStorage.getItem('ri-panel-choice')!==user.id){
      const choice=RI.modal({title:'کدام پنل را باز کنیم؟',body:'<p>با این حساب به پنل کاربری و مدیریت دسترسی داری. هر زمان خواستی از منوی پنل می‌توانی جابه‌جا شوی.</p>',size:'sm'});
      choice.setActions([{label:'پنل کاربری',kind:'ghost',onClick:()=>sessionStorage.setItem('ri-panel-choice',user.id)},{label:'پنل مدیریت',kind:'primary',onClick:()=>{sessionStorage.setItem('ri-panel-choice',user.id);location.assign('/admin/');}}]);
    }
    fetch('/api/version',{cache:'no-store'}).then(r=>r.json()).then(v=>{RI.$$('[data-site-version]').forEach(el=>el.textContent='نسخهٔ '+(v.displayVersion||v.version));}).catch(()=>{});
    paintSave();
    RI.on('save', paintSave);
    RI.on('change', paintAccount);
    RI.on('demo', paintAccount);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'&&RI.$('#sidebar').dataset.open==='true') {closeDrawer();restoreDrawerFocus();}
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (RI.state.ui.dirty&&RI.manualSave()) RI.doSave(); }
      const list=e.target.closest('[role="tablist"]');
      if(!list||e.altKey||e.ctrlKey||e.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      const tabs=[...list.querySelectorAll('[role="tab"]')].filter(b=>!b.disabled),index=tabs.indexOf(e.target.closest('[role="tab"]'));
      if(index<0)return;
      e.preventDefault();
      const rtl=getComputedStyle(list).direction==='rtl',direction=((e.key==='ArrowLeft')===rtl)?1:-1;
      const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+direction+tabs.length)%tabs.length;
      const label=list.getAttribute('aria-label'),id=list.id;
      tabs[next].click();
      const selected=(id?document.getElementById(id):[...document.querySelectorAll('[role="tablist"]')].find(el=>el.getAttribute('aria-label')===label))?.querySelector('[role="tab"][aria-selected="true"]');
      const disclosure=selected?.closest('details');if(disclosure)disclosure.open=true;
      selected?.focus({preventScroll:true});
      selected?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    });
    RI.delegate(document,'click','#saveBtn',()=>{if(RI.manualSave())RI.doSave();});
    RI.delegate(document,'click','[data-save-retry]',RI.doSave);
    window.addEventListener('online',()=>{if(!RI.manualSave()&&RI.state.ui.saveError&&!RI.conflict)RI.save();});
    RI.$('#topPreview').addEventListener('click', async () => {try{const kind=current==='links'||RI.workspaceSlot===3?'links':'resume';if(kind==='resume')await RI.loadTemplates([RI.C().theme.resume]);RI.openPreview(kind);}catch(e){RI.toast(e.message,{kind:'error'});}});
    RI.$('#undoBtn').addEventListener('click', RI.undo);
    RI.$('#accountBtn').addEventListener('click', (e) => {
      RI.menu(e.currentTarget, [
        { label: 'پروفایل و رزومه', icon: 'user', onClick: () => RI.go('resume',{step:'profile'}) },
        { label: 'صفحهٔ لینک‌ها', icon: 'link', onClick: () => RI.go('links') },
        { label: 'تنظیمات حساب', icon: 'settings', onClick: () => RI.go('settings') },
        { label: 'اشتراک و خریدها', icon: 'card', onClick: () => RI.go('billing') },
        { label: 'اعلان‌ها', icon: 'bell', onClick: () => RI.go('notifications') },
        'hr',
        { label: 'خروج از حساب', icon: 'logout', danger: true, onClick: () => RI.logout() },
      ], { up: true });
    });
    const bell=document.createElement('button');bell.type='button';bell.className='btn btn--icon btn--soft btn--sm topbar__bell';bell.setAttribute('aria-label','اعلان‌ها');bell.innerHTML=RI.icon('bell');bell.addEventListener('click',()=>RI.go('notifications'));RI.$('.topbar__actions').append(bell);
    RI.on('inbox',()=>{const count=RI.inbox?.unread||0;bell.classList.toggle('has-unread',count>0);bell.setAttribute('aria-label',count?'اعلان‌ها؛ '+RI.fa(count)+' خوانده‌نشده':'اعلان‌ها');bell.title=bell.getAttribute('aria-label');});
    RI.delegate(document, 'click', '[data-copy]', (e, b) => RI.copy(b.dataset.copy));
    RI.delegate(document,'click','a[href="/admin/"]',async e=>{
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
      e.preventDefault();if(await RI.leaveGuard()&&RI.keepDraft())location.assign('/admin/');
    });
    RI.delegate(document, 'click', '[data-open-url]', (e, b) => {const urls=RI.urls(),k=[urls.links,urls.fallbackLinks].includes(b.dataset.openUrl)?'links':'resume';if(RI.state.pub[k].status!=='published'){RI.toast('ابتدا این صفحه را منتشر کن',{kind:'info'});return;}window.open('https://'+(b.dataset.openUrl.replace(/^https?:\/\//,'')),'_blank','noopener,noreferrer');});
    RI.delegate(document, 'click', '[data-go], [data-route]', (e, b) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      RI.go(b.dataset.go || b.dataset.route, { step: b.dataset.step, tab: b.dataset.tab, anchor: b.dataset.anchor });
    });
    window.addEventListener('popstate',()=>{const match=/^\/dashboard\/(?:([a-z]+)\/)?$/.exec(location.pathname);if(match)navigate(match[1]||'home',Object.fromEntries(new URLSearchParams(location.search)),true);});
    RI.delegate(document,'click','a[href]',async(e,a)=>{const u=new URL(a.href,location.origin);if(e.defaultPrevented||a.hasAttribute('download')||!['http:','https:'].includes(u.protocol)||u.origin!==location.origin||a.target||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;const match=/^\/dashboard\/(?:([a-z]+)\/)?$/.exec(u.pathname);if(match){e.preventDefault();navigate(match[1]||'home',Object.fromEntries(u.searchParams));}else if(!u.pathname.startsWith('/admin/')){e.preventDefault();if(await RI.leaveGuard())location.assign(u.href);}});
    window.addEventListener('beforeunload', (e) => { if (RI.state.ui.dirty) { e.preventDefault(); e.returnValue = ''; } });
    const legacy = /^#\/([a-z]+)$/.exec(location.hash);
    if (legacy && NAV.some(g => g.items.some(i => i[0] === legacy[1]))) { location.replace(RI.routeUrl(legacy[1])); return; }
    RI.routeOpts = Object.fromEntries(new URLSearchParams(location.search));
    async function openInitialPage(){
      const epoch=navigationEpoch,host=RI.$('#view');host.innerHTML=RI.sectionLoading(document.body.dataset.page==='resume'?'در حال آماده‌سازی ویرایشگر و قالب رزومه…':'در حال آماده‌سازی صفحه…');
      try{
        if(!host.isConnected||epoch!==navigationEpoch)return;
        await render(document.body.dataset.page);
      }catch(error){if(!host.isConnected||epoch!==navigationEpoch)return;host.innerHTML='<section class="section-loading"><p role="alert">'+RI.esc(error.message)+'</p><button type="button" class="btn btn--soft" data-initial-retry>تلاش دوباره</button></section>';host.querySelector('[data-initial-retry]').addEventListener('click',openInitialPage,{once:true});}
    }
    await openInitialPage();
    if(navigationEpoch===0&&['home','links','stats'].includes(document.body.dataset.page))requestAnimationFrame(()=>setTimeout(()=>{if(navigationEpoch===0&&RI.statsRows===null&&!RI.statsLoading&&!RI.statsError)RI.loadStats();},0));
    document.dispatchEvent(new Event('ri:dashboard-ready'));
    RI.startInbox?.();
  }

  RI.logout = async function () {
    const ok = await RI.confirm({ title: 'خروج از حساب', text: 'از حساب خارج می‌شوید و پیش‌نویس موقت این تب پاک می‌شود. ادامه می‌دهید؟', confirmLabel: 'خروج', icon: 'logout' });
    if (!ok) return;
    if (RI.state.ui.dirty && !(await RI.leaveGuard())) return;
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Logout failed');
      RI.advisorClear?.();
      if(window.BroadcastChannel){const channel=new BroadcastChannel('resumeit-session');channel.postMessage({owner:null});channel.close();}
    } catch { RI.toast('خروج انجام نشد؛ دوباره امتحان کنید.'); return; }
    RI.state.ui.dirty = false;
    RI.clearDraft();
    location.replace('/login/');
  };

  document.addEventListener('DOMContentLoaded', boot);
  RI.NAV = NAV;
})();
