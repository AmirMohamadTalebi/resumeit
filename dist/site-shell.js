/* Keep public navigation unchanged; only the session control reflects the account. */
(() => {
 'use strict';
 const menu=document.querySelector('.mobile-menu'),nav=document.querySelector('[data-public-nav]');
 function setMenu(open){menu?.setAttribute('aria-expanded',String(open));menu?.setAttribute('aria-label',open?'بستن منو':'باز کردن منو');nav?.classList.toggle('open',open);}
 if(nav&&menu){nav.id='public-navigation';menu.setAttribute('aria-controls',nav.id);menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));nav.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});}
 document.querySelectorAll('[data-public-nav] a,.site-footer a,.footer-bottom a').forEach(link=>{const url=new URL(link.href,location.href);if(url.origin===location.origin&&!url.hash&&url.pathname===location.pathname)link.setAttribute('aria-current','page');});
 const original=document.querySelector('[data-session-link]')?.cloneNode(true),startLinks=[...document.querySelectorAll('a[href="/register/"],[data-start-link]')];
 let pending=false,identity='',control=null,trigger=null,popover=null;
 const icons=new Promise(resolve=>{if(window.RI?.icon){resolve();return;}const script=document.createElement('script');script.src='/public-assets/icons.js';script.onload=resolve;script.onerror=resolve;document.head.append(script);});
 const icon=name=>window.RI?.icon(name,'account-icon')||'';
 function close(){if(!popover)return;popover.hidden=true;trigger.setAttribute('aria-expanded','false');}
 document.addEventListener('pointerdown',e=>{if(control&&!control.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(popover&&!popover.hidden){close();trigger.focus();}if(menu?.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
 async function paint(user){
  if(!original)return;
  if(!user){control?.replaceWith(original.cloneNode(true));control=trigger=popover=null;identity='';return;}
  const key=String(user.id);if(control&&identity===key)return;
  await icons;
  const link=document.querySelector('[data-session-link]');if(!link&&!control)return;
  const wrapper=document.createElement('div');wrapper.className='public-account';
  const dashboard=original.cloneNode(true);dashboard.href='/dashboard/';dashboard.innerHTML=icon('home')+'<span>داشبورد</span>';
  trigger=document.createElement('button');trigger.type='button';trigger.className='public-account__trigger';trigger.setAttribute('aria-label','دسترسی سریع حساب');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','public-account-menu');
  const avatar=document.createElement('img');avatar.src='/brand/resumeit-mark-v1.png';avatar.alt='تصویر پروفایل';avatar.width=40;avatar.height=40;trigger.append(avatar);
  popover=document.createElement('div');popover.id='public-account-menu';popover.className='public-account__menu';popover.hidden=true;
  const person=document.createElement('div');person.className='public-account__person';person.append(avatar.cloneNode(true));const text=document.createElement('div'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=[user.first_name,user.last_name].filter(Boolean).join(' ')||'حساب من';sub.textContent='دسترسی سریع';text.append(name,sub);person.append(text);popover.append(person);
  const links=[['/dashboard/resume/','پروفایل و رزومهٔ من','user'],['/dashboard/links/','صفحهٔ لینک‌ها','link'],['/dashboard/settings/','تنظیمات حساب','settings'],...(user.is_admin?[['/admin/','پنل مدیر','shield']]:[])];
  for(const [href,label,glyph]of links){const a=document.createElement('a');a.href=href;a.innerHTML=icon(glyph);const span=document.createElement('span');span.className='public-account__label';span.textContent=label;a.append(span);popover.append(a);}
  const logout=document.createElement('button');logout.type='button';logout.className='public-account__logout';logout.innerHTML=icon('logout')+'<span class="public-account__label">خروج از حساب</span>';popover.append(logout);
  wrapper.append(dashboard,trigger,popover);(control||link).replaceWith(wrapper);control=wrapper;identity=key;
  trigger.addEventListener('click',()=>{const open=popover.hidden;popover.hidden=!open;trigger.setAttribute('aria-expanded',String(open));});
  logout.addEventListener('click',async()=>{logout.disabled=true;try{const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw Error();close();await paint(null);startLinks.forEach(a=>a.href='/register/');}catch{logout.disabled=false;logout.querySelector('span').textContent='خروج انجام نشد؛ دوباره تلاش کن';}});
  try{const response=await fetch('/api/dashboard/document',{cache:'no-store',headers:{'X-Resumeit-Owner':key},signal:AbortSignal.timeout(5000)});if(!response.ok)return;const doc=await response.json();if(identity!==key||doc.ownerId!==key)return;const src=doc.content?.profile?.avatar;if(typeof src==='string'&&(/^(data:image\/(png|jpeg|webp);base64,|https:\/\/|\/api\/dashboard\/media\/[a-f0-9]{32}$)/.test(src))){wrapper.querySelectorAll('img').forEach(img=>{img.src=src;img.classList.add('has-photo');});}}catch{}
 }
 async function refresh(){if(pending)return;pending=true;try{const response=await fetch('/api/auth/session',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)return;const {user}=await response.json();await paint(user);startLinks.forEach(a=>a.href=user?'/dashboard/resume/':'/register/');}catch{}finally{pending=false;}}
 refresh();window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){close();refresh();}});
})();

(() => {
 // Phones get compact legal accordions; wider screens read the whole text beside the table of contents.
 if(!/^\/(privacy|terms)\/?$/.test(location.pathname)||!matchMedia('(max-width:860px)').matches)return;
 const sections=[...document.querySelectorAll('.info-content>section')];
 for(const section of sections){const heading=section.querySelector('h2');if(!heading)continue;const details=document.createElement('details'),summary=document.createElement('summary');details.className='info-accordion';details.id=section.id;summary.append(heading);details.append(summary,...section.childNodes);section.replaceWith(details);}
 function reveal(){const id=location.hash.slice(1),target=sections.length&&document.getElementById(id);if(target?.matches('.info-accordion'))target.open=true;}
 document.querySelector('.info-nav')?.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link){const target=document.getElementById(link.hash.slice(1));if(target?.matches('.info-accordion'))target.open=true;}});
 addEventListener('hashchange',reveal);reveal();
})();
