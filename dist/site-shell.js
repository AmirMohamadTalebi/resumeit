/* Public navigation reflects the live session without delaying page content. */
(() => {
 'use strict';
 const menu=document.querySelector('.mobile-menu'),nav=document.querySelector('[data-public-nav]');
 if(!document.querySelector('script[src*="/app.js"]')) {
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav?.classList.toggle('open',open);});
  nav?.addEventListener('click',e=>{if(e.target.closest('a')){menu?.setAttribute('aria-expanded','false');nav.classList.remove('open');}});
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');nav?.classList.remove('open');menu.focus();}});
 const guestNav=nav?.innerHTML, startLinks=[...document.querySelectorAll('a[href="/register/"], [data-start-link]')];
 let pending=false;
 async function refresh(){
  if(pending)return;pending=true;
  try{
   const response=await fetch('/api/auth/session',{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)return;const {user}=await response.json();
   const link=document.querySelector('[data-session-link]');
   if(link){link.href=user?'/dashboard/':'/login/';link.textContent=user?'داشبورد من':'ورود / ثبت‌نام';}
   if(nav){if(user){nav.replaceChildren();const items=[['/dashboard/resume/','رزومهٔ من'],['/dashboard/links/','لینک‌های من'],['/dashboard/themes/','قالب‌ها'],['/contact/','پشتیبانی'],...(user.is_admin?[['/admin/','مدیریت']]:[])];for(const [url,title]of items){const a=document.createElement('a');a.href=url;a.textContent=title;nav.append(a);}}else nav.innerHTML=guestNav;}
   startLinks.forEach(a=>{a.href=user?'/dashboard/resume/':'/register/';});
  }catch{}finally{pending=false;}
 }
 refresh();window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
