/* The accepted coral shell keeps existing routes, form mounts and save contracts. */
(() => {
 'use strict';
 const RI=window.RI,groups=[['home','خانه','home'],['resume','استودیو','resume'],['publish','انتشار','globe'],['wallet','حساب','card']];
 function preference(key,value){try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,String(value));}catch{}return null;}
 RI.polishShell=()=>{
  const app=document.querySelector('.app');if(document.querySelector('.coral-rail'))return;
  const rail=document.createElement('aside');rail.className='coral-rail';rail.setAttribute('aria-label','بخش‌های اصلی');
  rail.innerHTML='<a class="coral-brand" href="/" aria-label="خانه رزومیت"><img src="/brand/resumeit-mark-v1.png" alt="رزومیت" width="28" height="28"></a><button type="button" class="btn btn--icon coral-collapse" data-coral-collapse="rail" aria-label="جمع کردن منوی اصلی" aria-expanded="true">'+RI.icon('chevR')+'</button><nav>'+groups.map(([id,label,glyph])=>'<a href="'+RI.routeUrl(id)+'" data-route="'+id+'" data-coral-group="'+id+'" title="'+label+'">'+RI.icon(glyph)+'<span>'+label+'</span></a>').join('')+'</nav>'+(RI.state.account.isAdmin?'<a class="coral-admin" href="/admin/" title="پنل مدیر">'+RI.icon('shield')+'</a>':'');
  app.prepend(rail);const toggle=document.createElement('button');toggle.type='button';toggle.className='btn btn--icon coral-collapse coral-context-toggle';toggle.dataset.coralCollapse='context';toggle.setAttribute('aria-label','جمع کردن منوی این بخش');toggle.innerHTML=RI.icon('chevR');document.querySelector('#sidebar .brand').append(toggle);
  for(const button of app.querySelectorAll('[data-coral-collapse]')){
   const name=button.dataset.coralCollapse,key='ri-coral-'+name;
   const paint=closed=>{app.classList.toggle('coral-hide-'+name,closed);button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-label',(closed?'باز کردن':'جمع کردن')+(name==='rail'?' منوی اصلی':' منوی این بخش'));button.innerHTML=RI.icon(closed?'chevL':'chevR');};
   paint(preference(key)==='true');button.addEventListener('click',()=>{const closed=!app.classList.contains('coral-hide-'+name);paint(closed);preference(key,closed);});
  }
  const nav=rail.querySelector('nav');const mark=element=>{if(!element)return;const y=element.getBoundingClientRect().top-nav.getBoundingClientRect().top;nav.style.setProperty('--coral-slot-y',y+'px');nav.style.setProperty('--coral-slot-h',element.offsetHeight+'px');};
  rail.querySelectorAll('[data-coral-group]').forEach(a=>{a.addEventListener('pointerenter',()=>mark(a));a.addEventListener('focus',()=>mark(a));});nav.addEventListener('pointerleave',()=>mark(nav.querySelector('[aria-current="page"]')));new ResizeObserver(()=>mark(nav.querySelector('[aria-current="page"]'))).observe(nav);
 };
 RI.polishView=(root,id)=>{
  const group=['publish','stats'].includes(id)?'publish':['wallet','billing','settings'].includes(id)?'wallet':id==='home'?'home':'resume';
  document.querySelectorAll('[data-coral-group]').forEach(a=>{if(a.dataset.coralGroup===group)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelectorAll('#sidebar .nav__group').forEach((el,i)=>{el.hidden=i!==(group==='publish'?1:group==='wallet'?2:0);});
  const active=document.querySelector('.coral-rail [aria-current="page"]'),nav=active?.parentElement;if(active){nav.style.setProperty('--coral-slot-y',(active.getBoundingClientRect().top-nav.getBoundingClientRect().top)+'px');nav.style.setProperty('--coral-slot-h',active.offsetHeight+'px');}
  const editor=root.querySelector('.editor'),side=editor?.querySelector('.editor__side');if(!editor||!side)return;
  const divider=document.createElement('div');divider.className='coral-divider';divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-label','تنظیم عرض فرم و پیش‌نمایش');divider.setAttribute('aria-orientation','vertical');divider.setAttribute('aria-valuemin','300');divider.setAttribute('aria-valuemax','800');divider.setAttribute('aria-valuenow','360');divider.innerHTML='<span></span>';side.before(divider);
  let dragging=false;
  const set=x=>{if(innerWidth<1101)return;const rect=editor.getBoundingClientRect(),max=Math.max(300,Math.min(800,rect.width-380)),width=Math.max(300,Math.min(max,x-rect.left));editor.style.setProperty('--coral-preview-width',width+'px');divider.setAttribute('aria-valuemax',String(Math.round(max)));divider.setAttribute('aria-valuenow',String(Math.round(width)));};
  divider.addEventListener('pointerdown',e=>{dragging=true;divider.setPointerCapture(e.pointerId);});divider.addEventListener('pointermove',e=>{if(dragging)set(e.clientX);});divider.addEventListener('pointerup',()=>dragging=false);divider.addEventListener('lostpointercapture',()=>dragging=false);
  divider.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const rect=editor.getBoundingClientRect(),width=side.getBoundingClientRect().width;set(rect.left+(e.key==='Home'?300:e.key==='End'?rect.width:width+(e.key==='ArrowLeft'?-24:24)));});
 };
})();
