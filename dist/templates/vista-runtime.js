(function(){
 'use strict';
 window.bindVistaPage=function(doc,options={}){
  const root=doc.querySelector('.ri-imported[data-template="vista"],.ri-imported[data-template="satiar"]');if(!root||root.dataset.vistaBound)return;root.dataset.vistaBound='true';
  const view=doc.defaultView,toggle=doc.getElementById('menuToggle'),panel=doc.getElementById('mobile-nav-panel'),overlay=doc.getElementById('mobileNavOverlay'),mode=doc.getElementById('themeToggleBtn');
  let returnFocus=null,previousOverflow='',blocked=[];
  const setMode=value=>{doc.documentElement.dataset.theme=value;mode?.setAttribute('aria-label',value==='dark'?'تغییر به حالت روشن':'تغییر به حالت تیره');mode?.setAttribute('aria-pressed',String(value==='light'));};
  const key='ri-'+root.dataset.template+'-mode';let saved;try{saved=view.localStorage.getItem(key);}catch{}
  setMode(['dark','light'].includes(saved)?saved:['dark','light'].includes(root.dataset.templateMode)?root.dataset.templateMode:(view.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
  mode?.addEventListener('click',()=>{const next=doc.documentElement.dataset.theme==='dark'?'light':'dark';setMode(next);try{view.localStorage.setItem(key,next);}catch{}});
  function closeMenu(){if(!panel||panel.hidden)return;panel.inert=true;panel.hidden=true;overlay.hidden=true;toggle.setAttribute('aria-expanded','false');doc.documentElement.style.overflow=previousOverflow;doc.body.classList.remove('vista-menu-open');blocked.forEach(([el,inert])=>el.inert=inert);blocked=[];returnFocus?.focus();}
  toggle?.addEventListener('click',()=>{if(!panel.hidden){closeMenu();return;}returnFocus=doc.activeElement;previousOverflow=doc.documentElement.style.overflow;panel.hidden=false;panel.inert=false;overlay.hidden=false;toggle.setAttribute('aria-expanded','true');doc.body.classList.add('vista-menu-open');doc.documentElement.style.overflow='hidden';blocked=[...root.querySelectorAll('.vista-header,#page-content,.pages-stack,.ri-template-contact,.vista-footer')].map(el=>{const previous=el.inert;el.inert=true;return [el,previous];});doc.getElementById('mobileNavClose').focus();});
  doc.getElementById('mobileNavClose')?.addEventListener('click',closeMenu);overlay?.addEventListener('click',closeMenu);
  // The editor preview re-binds after swapping the page body; its signal removes the previous document listener.
  doc.addEventListener('keydown',event=>{if(!panel||panel.hidden)return;if(event.key==='Escape'){event.preventDefault();closeMenu();}if(event.key==='Tab'){const items=[...panel.querySelectorAll('button,a[href]')],first=items[0],last=items[items.length-1];if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}}},{signal:options.signal});
  root.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(!href.startsWith('#')){if(options.preview){event.preventDefault();options.onExternal?.();}return;}const target=doc.getElementById(href.slice(1));if(!target)return;event.preventDefault();const parent=target.closest('details');if(parent)parent.open=true;closeMenu();target.scrollIntoView({behavior:view.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});});
  doc.getElementById('vistaBackToTop')?.addEventListener('click',()=>view.scrollTo({top:0,behavior:'auto'}));
  const grid=root.querySelector('.techstack-grid');if(grid&&grid.children.length>6){[...grid.children].slice(6).forEach(el=>el.classList.add('vista-extra-skill'));const more=doc.createElement('button');more.type='button';more.className='btn vista-skill-toggle';more.textContent='بقیهٔ مهارت‌ها ('+(grid.children.length-6)+')';more.setAttribute('aria-expanded','false');grid.after(more);more.addEventListener('click',()=>{const on=grid.toggleAttribute('data-expanded');more.setAttribute('aria-expanded',String(on));more.textContent=on?'نمایش خلاصهٔ مهارت‌ها':'بقیهٔ مهارت‌ها ('+(grid.children.length-6)+')';});}
  // The visitor message form posts through /public-assets/inbox.js; in the dashboard preview it only explains itself.
  if(options.preview)root.querySelector('[data-inbox-form]')?.addEventListener('submit',event=>{event.preventDefault();options.onExternal?.();});
  const observer=new view.IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('vista-offscreen',!entry.isIntersecting)),{rootMargin:'100px'});root.querySelectorAll('.vista-hi-img-col').forEach(el=>observer.observe(el));options.signal?.addEventListener('abort',()=>observer.disconnect(),{once:true});
  // «اعداد و ارقام»: each number counts up and its bars rise the first time the cards come into view; the final
  // number is already in the page, so reduced motion and no-script readers see it as is.
  const cells=[...root.querySelectorAll('.ri-vista-stats .bento-cell')];
  if(cells.length&&!view.matchMedia('(prefers-reduced-motion:reduce)').matches&&view.IntersectionObserver){
   const fa=n=>Math.round(n).toLocaleString('fa-IR',{useGrouping:false});
   cells.forEach((cell,i)=>{cell.classList.add('ri-count-wait');cell.style.setProperty('--ri-i',i);const n=cell.querySelector('.bento-count');if(n)n.textContent=fa(0);});
   const count=new view.IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;count.unobserve(entry.target);const cell=entry.target,n=cell.querySelector('.bento-count'),end=Number(n?.dataset.count||0),start=view.performance.now()+Number(cell.style.getPropertyValue('--ri-i'))*120;cell.classList.replace('ri-count-wait','ri-count-in');
    const step=now=>{const k=Math.min(1,Math.max(0,(now-start)/1100));if(n)n.textContent=fa(end*(1-Math.pow(1-k,3)));if(k<1)view.requestAnimationFrame(step);};view.requestAnimationFrame(step);}),{threshold:.35});
   cells.forEach(cell=>count.observe(cell));options.signal?.addEventListener('abort',()=>count.disconnect(),{once:true});
  }
 };
 if(document.querySelector('.ri-imported'))window.bindVistaPage(document);
})();
