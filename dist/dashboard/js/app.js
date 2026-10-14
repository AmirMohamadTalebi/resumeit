/* پوستهٔ برنامه: ناوبری، صفحات مستقل، نوار بالا، وضعیت ذخیره، اتصال به ورود و خروج */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  const NAV = [
    { group: 'ساخت', items: [['home', 'خانهٔ داشبورد', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'صفحهٔ لینک‌ها', 'link'], ['themes', 'ظاهر و قالب', 'palette']] },
    { group: 'انتشار', items: [['publish', 'آدرس و انتشار', 'globe'], ['stats', 'آمار', 'chart']] },
    { group: 'حساب', items: [['wallet', 'کیف پول It', 'card'], ['billing', 'اشتراک و خریدها', 'card'], ['settings', 'تنظیمات حساب', 'settings']] },
  ];
  const BOTTOM = [['home', 'خانه', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'لینک‌ها', 'link'], ['themes', 'قالب‌ها', 'palette']];
  const LOGO = '<span class="ri-logo"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="2172" height="724"></span>';

  let current = null, cleanup = null, bootstrapping = true;

  /* ---------- ساخت پوسته ---------- */
  function buildShell() {
    const acc = RI.state.account;
    RI.$('#sidebar').innerHTML =
      '<div class="sidebar__glass"><div class="brand"><a href="/" aria-label="خانهٔ ResumeIt">' + LOGO + '</a><button type="button" class="btn btn--icon btn--ghost drawer-close" id="drawerClose" aria-label="بستن منو">'+RI.icon('close')+'</button></div>' +
      '<nav class="nav" aria-label="بخش‌های داشبورد">' + NAV.map(g => '<ul class="menu nav__group"><li class="menu-title nav__label">'+g.group+'</li>'+g.items.map(i=>'<li><a class="nav__item" href="'+RI.routeUrl(i[0])+'" data-route="'+i[0]+'">'+RI.icon(i[2])+'<span>'+i[1]+'</span></a></li>').join('')+'</ul>').join('')+'</nav>' +
      '<div class="sidebar__foot">'+(acc.isAdmin?'<a class="panel-switch" href="/admin/">'+RI.icon('shield')+'<span>ورود به مدیریت</span>'+RI.icon('chevL')+'</a>':'')+'<a class="panel-help" href="/contact/">'+RI.icon('help')+'راهنما و پشتیبانی</a><button type="button" class="account-btn" id="accountBtn" aria-haspopup="menu"><img class="avatar" id="accAvatar" alt="" src="/brand/resumeit-mark-v1.png"><span><span class="account-btn__name" id="accName"></span><br><span class="account-btn__sub">تنظیمات و خروج</span></span>'+RI.icon('chevL')+'</button><small data-site-version></small></div></div>';
    RI.$('#bottomNav').innerHTML = BOTTOM.map(i=>'<a href="'+RI.routeUrl(i[0])+'" data-route="'+i[0]+'">'+RI.icon(i[2])+'<span>'+i[1]+'</span></a>').join('')+'<button type="button" data-all-pages aria-label="همهٔ بخش‌ها">'+RI.icon('menu')+'<span>بیشتر</span></button>';
    paintAccount();
  }
  function paintAccount() {
    RI.$('#accName').textContent = RI.state.account.name;
    RI.$('#accAvatar').src = RI.avatarOf(RI.C().profile);
  }

  /* ---------- نوار بالا و وضعیت ذخیره ---------- */
  function paintSave() {
    const ui = RI.state.ui, el = RI.$('#saveState');let btn=RI.$('#saveBtn');
    const tag=RI.manualSave()?'BUTTON':'SPAN';
    if(btn.tagName!==tag){const replacement=document.createElement(tag.toLowerCase());replacement.id='saveBtn';replacement.setAttribute('aria-live','off');btn.replaceWith(replacement);btn=replacement;if(tag==='BUTTON')btn.type='button';}
    let st = 'saved', txt = 'همهٔ تغییرات ذخیره شد', ic = 'check';
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
    el.setAttribute('role', 'status');
  }
  RI.doSave = async function () {
    const ok = await (RI.conflict?RI.resolveConflict():RI.save());
    if (ok) RI.toast('تغییرات ذخیره شد');
    return ok;
  };

  /* ---------- مسیریاب ---------- */
  RI.go = function (id, opts) {
    if (opts) RI.routeOpts = opts;
    if (id === current) { render(id, true); return; }
    navigate(id, opts);
  };
  RI.routeOpts = null;
  RI.routeUrl = (id, opts) => {
    const url = new URL(id === 'home' ? '/dashboard/' : '/dashboard/' + id + '/', location.origin);
    for (const key of ['step', 'tab', 'anchor']) if (opts && opts[key]) url.searchParams.set(key, opts[key]);
    return url.pathname + url.search;
  };
  let navigating=false,pendingNavigation=null,currentUrl=location.pathname+location.search;
  const pageLoads=new Map();
  function loadScript(path) {
    if(!pageLoads.has(path)) pageLoads.set(path,new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=path+'?v='+document.documentElement.dataset.assetVersion;
      script.onload=resolve;script.onerror=()=>{pageLoads.delete(path);script.remove();reject(new Error('این بخش دریافت نشد؛ اتصال اینترنت را بررسی کن و دوباره بزن'));};
      document.head.append(script);
    }));
    return pageLoads.get(path);
  }
  async function navigate(id, opts, back=false) {
    if (!NAV.some(g => g.items.some(i => i[0] === id))) return;
    if(navigating){pendingNavigation=[id,opts,back];return;}
    if(bootstrapping){location.assign(RI.routeUrl(id,opts));return;}
    navigating=true;
    const previous=currentUrl;
    try {
      if (!(await RI.leaveGuard())) { if(back)history.replaceState(null,'',previous);return; }
      window.resumeitPageLoading?.start(true);
      if(id==='resume') {
        if(!RI.mountImportedEditor) await loadScript('/dashboard/js/template-editor.js');
        await RI.loadTemplates([RI.C().theme.resume]);
      }
      if(!RI.pages[id]) await loadScript('/dashboard/js/pages/'+id+'.js');
      if(!RI.pages[id])throw new Error('بارگذاری بخش کامل نشد؛ صفحه را دوباره باز کن');
      if(!back)history.pushState(null,'',RI.routeUrl(id,opts));
      document.body.dataset.page=id;
      RI.routeOpts=opts||{};
      await render(id);currentUrl=location.pathname+location.search;
      paintSave();
      if(['home','links','stats'].includes(id)&&RI.statsRows===null&&!RI.statsLoading)RI.loadStats();
    } catch(e) { if(back)history.replaceState(null,'',previous);RI.toast(e.message,{kind:'error'}); }
    finally { navigating=false;window.resumeitPageLoading?.finish();if(pendingNavigation){const next=pendingNavigation;pendingNavigation=null;navigate(...next);} }
  }

  async function render(id, force) {
    const page = RI.pages[id];
    const previousView = RI.$('#view');
    if (cleanup) { try { cleanup(); } catch (e) { /* ok */ } cleanup = null; }
    // Each mount owns its listeners; replacing the root discards the previous mount's handlers.
    const view=previousView.cloneNode(false);previousView.replaceWith(view);
    current = id;
    RI.$$('[data-route]').forEach((a) => { if (a.dataset.route === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    RI.$('#topTitle').textContent = page.title;
    document.title = page.title + ' | ResumeIt';
    closeDrawer();
    const opts = RI.routeOpts; RI.routeOpts = null;
    const ctx = { opts: opts || {} };


    view.innerHTML = page.render(ctx);
    RI.$$('a[data-go]', view).forEach(a => { a.href = RI.routeUrl(a.dataset.go, a.dataset); });
    cleanup = page.mount ? page.mount(view, ctx) : null;
    RI.animateRings(view); RI.animateBars(view);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (!force) { const h = RI.$('#page-title', view); if (h) h.focus({ preventScroll: true }); }
  }
  RI.rerender = () => { if (current) render(current, true); };

  /* ---------- کشو (موبایل) ---------- */
  const mobile=matchMedia('(max-width:960px)');
  function setDrawer(open){
    RI.$('#sidebar').dataset.open=String(open);RI.$('#scrim').dataset.open=String(open);
    RI.$('#menuBtn').setAttribute('aria-expanded',String(open));
    RI.$('.main').inert=open&&mobile.matches;RI.$('#bottomNav').inert=open&&mobile.matches;
    RI.$('#sidebar').inert=!open&&mobile.matches;
    if(open)RI.$('#drawerClose').focus();
  }
  function openDrawer(){setDrawer(true);}
  function closeDrawer(){setDrawer(false);}

  /* ---------- راه‌اندازی ---------- */
  async function boot() {
    const user = await window.resumeitSession;
    if (!user) return;
    RI.applyAccount(user);buildShell();
    RI.$('#view').innerHTML='<p role="status">در حال دریافت اطلاعات این بخش…</p>';
    RI.$('#topPreview').disabled=true;
    RI.delegate(document,'click','[data-route]',(e,b)=>{if(!bootstrapping||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(b.dataset.route);});
    RI.$('#menuBtn').addEventListener('click',openDrawer);
    RI.$('#scrim').addEventListener('click',()=>{closeDrawer();RI.$('#menuBtn').focus();});
    RI.$('#drawerClose').addEventListener('click',()=>{closeDrawer();RI.$('#menuBtn').focus();});
    RI.delegate(document,'click','[data-all-pages]',openDrawer);mobile.addEventListener('change',closeDrawer);closeDrawer();
    try{await RI.loadDashboard(user.id); const page=document.body.dataset.page; await RI.loadTemplates(page==='resume'?[RI.C().theme.resume]:[]);}catch(e){RI.$('#view').textContent=e.message;const retry=document.createElement('button');retry.className='btn';retry.textContent='تلاش دوباره';retry.addEventListener('click',()=>location.reload());RI.$('#view').appendChild(retry);document.dispatchEvent(new Event('ri:dashboard-ready'));return;}
    RI.applyAccount(user);
    paintAccount();bootstrapping=false;RI.$('#topPreview').disabled=false;
    if(user.is_admin&&sessionStorage.getItem('ri-panel-choice')!==user.id){
      const choice=RI.modal({title:'کدام پنل را باز کنیم؟',body:'<p>با این حساب به پنل کاربری و مدیریت دسترسی داری. هر زمان خواستی از منوی پنل می‌توانی جابه‌جا شوی.</p>',size:'sm'});
      choice.setActions([{label:'پنل کاربری',kind:'ghost',onClick:()=>sessionStorage.setItem('ri-panel-choice',user.id)},{label:'پنل مدیریت',kind:'primary',onClick:()=>{sessionStorage.setItem('ri-panel-choice',user.id);location.assign('/admin/');}}]);
    }
    fetch('/api/version',{cache:'no-store'}).then(r=>r.json()).then(v=>{RI.$$('[data-site-version]').forEach(el=>el.textContent='نسخهٔ '+v.version);}).catch(()=>{});
    paintSave();
    RI.on('save', paintSave);
    RI.on('change', paintAccount);
    RI.on('demo', paintAccount);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'&&RI.$('#sidebar').dataset.open==='true') {closeDrawer();RI.$('#menuBtn').focus();}
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
      selected?.focus({preventScroll:true});
      selected?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    });
    RI.delegate(document,'click','#saveBtn',()=>{if(RI.manualSave())RI.doSave();});
    RI.delegate(document,'click','[data-save-retry]',RI.doSave);
    window.addEventListener('online',()=>{if(!RI.manualSave()&&RI.state.ui.saveError&&!RI.conflict)RI.save();});
    RI.$('#topPreview').addEventListener('click', async () => {try{if(current!=='links') await RI.loadTemplates([RI.C().theme.resume]); RI.openPreview(current === 'links' ? 'links' : 'resume');}catch(e){RI.toast(e.message,{kind:'error'});}});
    RI.$('#undoBtn').addEventListener('click', RI.undo);
    RI.$('#accountBtn').addEventListener('click', (e) => {
      RI.menu(e.currentTarget, [
        { label: 'تنظیمات حساب', icon: 'settings', onClick: () => RI.go('settings') },
        { label: 'اشتراک و خریدها', icon: 'card', onClick: () => RI.go('billing') },
        'hr',
        { label: 'خروج از حساب', icon: 'logout', danger: true, onClick: () => RI.logout() },
      ], { up: true });
    });
    RI.delegate(document, 'click', '[data-copy]', (e, b) => RI.copy(b.dataset.copy));
    RI.delegate(document,'click','a[href="/admin/"]',async e=>{
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
      e.preventDefault();if(await RI.leaveGuard()&&RI.keepDraft())location.assign('/admin/');
    });
    RI.delegate(document, 'click', '[data-open-url]', (e, b) => {const k=/\/links$/.test(b.dataset.openUrl)?'links':'resume';if(RI.state.pub[k].status!=='published'){RI.toast('ابتدا این صفحه را منتشر کن',{kind:'info'});return;}window.open('https://'+(b.dataset.openUrl.replace(/^https?:\/\//,'')),'_blank','noopener,noreferrer');});
    RI.delegate(document, 'click', '[data-go], [data-route]', (e, b) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      RI.go(b.dataset.go || b.dataset.route, { step: b.dataset.step, tab: b.dataset.tab, anchor: b.dataset.anchor });
    });
    window.addEventListener('popstate',()=>{const match=/^\/dashboard\/(?:([a-z]+)\/)?$/.exec(location.pathname);if(match)navigate(match[1]||'home',Object.fromEntries(new URLSearchParams(location.search)),true);});
    RI.delegate(document,'click','a[href]',async(e,a)=>{const u=new URL(a.href,location.origin);if(e.defaultPrevented||u.origin!==location.origin||a.target||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;const match=/^\/dashboard\/(?:([a-z]+)\/)?$/.exec(u.pathname);if(match){e.preventDefault();navigate(match[1]||'home',Object.fromEntries(u.searchParams));}else if(!u.pathname.startsWith('/admin/')){e.preventDefault();if(await RI.leaveGuard())location.assign(u.href);}});
    window.addEventListener('beforeunload', (e) => { if (RI.state.ui.dirty) { e.preventDefault(); e.returnValue = ''; } });
    const legacy = /^#\/([a-z]+)$/.exec(location.hash);
    if (legacy && NAV.some(g => g.items.some(i => i[0] === legacy[1]))) { location.replace(RI.routeUrl(legacy[1])); return; }
    RI.routeOpts = Object.fromEntries(new URLSearchParams(location.search));
    await render(document.body.dataset.page);
    document.dispatchEvent(new Event('ri:dashboard-ready'));
  }

  RI.logout = async function () {
    const ok = await RI.confirm({ title: 'خروج از حساب', text: 'از حساب خارج می‌شوید و پیش‌نویس موقت این تب پاک می‌شود. ادامه می‌دهید؟', confirmLabel: 'خروج', icon: 'logout' });
    if (!ok) return;
    if (RI.state.ui.dirty && !(await RI.leaveGuard())) return;
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Logout failed');
    } catch { RI.toast('خروج انجام نشد؛ دوباره امتحان کنید.'); return; }
    RI.state.ui.dirty = false;
    RI.clearDraft();
    location.replace('/login/');
  };

  document.addEventListener('DOMContentLoaded', boot);
  RI.NAV = NAV;
})();
