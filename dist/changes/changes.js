// Changelog: releases on a timeline with a month index, search, deep links and batches of older versions.
(() => {
  'use strict';
  const host=document.getElementById('releases'),index=document.getElementById('cl-index'),search=document.getElementById('release-search'),result=document.getElementById('cl-result'),toggle=document.getElementById('cl-toggle');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fa=n=>Number(n).toLocaleString('fa-IR'),BATCH=8;
  const day=iso=>new Date(iso+'T12:00:00Z');
  const longDate=iso=>day(iso).toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran',dateStyle:'long'});
  const month=iso=>day(iso).toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran',month:'long',year:'numeric'});
  const anchor=version=>'v'+version.replace(/[^0-9a-z]+/gi,'-');
  const label=version=>version.replace('-beta',' Beta');
  let releases=[],shown=BATCH,open=new Set();
  const terms=()=>search.value.trim().toLocaleLowerCase('fa').split(/\s+/).filter(Boolean);
  const matches=(r,words)=>{const text=JSON.stringify(r).toLocaleLowerCase('fa');return words.every(w=>text.includes(w));};
  // Highlight search words inside already-escaped text.
  const mark=(text,words)=>{let html=esc(text);for(const w of words){const safe=esc(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');html=html.replace(new RegExp('('+safe+')','gi'),'<mark>$1</mark>');}return html;};
  const count=r=>r.groups.reduce((n,g)=>n+g.items.length,0);
  function card(r,i,words,latest){
    const id=anchor(r.version),isOpen=open.has(r.version);
    return '<article class="cl-release'+(latest?' is-latest':'')+'" id="'+id+'" data-version="'+esc(r.version)+'"><span class="cl-dot" aria-hidden="true"></span><details'+(isOpen?' open':'')+'><summary class="release-title"><span class="cl-meta"><b class="cl-version" dir="ltr">'+esc(label(r.version))+'</b><time datetime="'+esc(r.date)+'">'+longDate(r.date)+'</time>'+(latest?'<span class="cl-new">تازه‌ترین</span>':'')+'</span><h2>'+mark(r.title,words)+'</h2><span class="cl-peek">'+fa(count(r))+' تغییر در '+fa(r.groups.length)+' بخش</span><svg class="cl-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary><div class="cl-body">'+(r.summary?'<p class="release-summary">'+mark(r.summary,words)+'</p>':'')+'<div class="cl-groups">'+r.groups.map(g=>'<section class="cl-group"><h3>'+mark(g.title,words)+'</h3><ul>'+g.items.map(item=>'<li>'+mark(item,words)+'</li>').join('')+'</ul></section>').join('')+'</div><div class="cl-actions"><button type="button" class="cl-link" data-copy-link="'+id+'"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg><span>کپی پیوند این نسخه</span></button></div></div></details></article>';
  }
  function paint(){
    const words=terms(),list=releases.filter(r=>matches(r,words)),visible=words.length?list:list.slice(0,shown);
    result.textContent=words.length?(list.length?fa(list.length)+' نسخه با این جست‌وجو':'نسخه‌ای با این جست‌وجو پیدا نشد'):'نمایش '+fa(visible.length)+' نسخه از '+fa(releases.length);
    if(!list.length){host.innerHTML='<p class="cl-state">چیزی پیدا نشد. واژهٔ دیگری امتحان کن یا جست‌وجو را پاک کن.</p>';index.innerHTML='';return;}
    host.innerHTML=visible.map((r,i)=>card(r,i,words,r===releases[0])).join('')+(!words.length&&list.length>shown?'<button type="button" class="cl-more" data-more>نسخه‌های قبلی <span>('+fa(list.length-shown)+' نسخهٔ دیگر)</span></button>':'');
    // Month index: every matching release, so a click can bring in versions that are not drawn yet.
    const months=[];for(const r of list){const m=month(r.date);if(months.at(-1)?.name!==m)months.push({name:m,items:[]});months.at(-1).items.push(r);}
    index.innerHTML='<p class="cl-index__title">فهرست نسخه‌ها</p>'+months.map(m=>'<div class="cl-month"><span>'+esc(m.name)+'</span><ul>'+m.items.map(r=>'<li><a href="#'+anchor(r.version)+'" data-jump="'+esc(r.version)+'"><b dir="ltr">'+esc(r.version.replace('-beta',''))+'</b><small>'+esc(r.title)+'</small></a></li>').join('')+'</ul></div>').join('');
    const all=visible.every(r=>open.has(r.version));toggle.textContent=all?'بستن همه':'باز کردن همه';toggle.setAttribute('aria-pressed',String(all));
    spy();
  }
  function reveal(version,scroll=true){
    const i=releases.findIndex(r=>r.version===version);if(i<0)return;
    if(!terms().length&&i>=shown)shown=Math.ceil((i+1)/BATCH)*BATCH;
    open.add(version);paint();
    if(scroll)document.getElementById(anchor(version))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  // Index highlights the release nearest the top of the viewport.
  let frame=0;function spy(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const cards=[...host.querySelectorAll('.cl-release')];let current=cards[0];for(const c of cards)if(c.getBoundingClientRect().top<innerHeight*.35)current=c;index.querySelectorAll('a').forEach(a=>a.dataset.jump===current?.dataset.version?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current'));});}
  addEventListener('scroll',spy,{passive:true});
  host.addEventListener('toggle',e=>{const article=e.target.closest?.('.cl-release');if(!article)return;e.target.open?open.add(article.dataset.version):open.delete(article.dataset.version);const all=[...host.querySelectorAll('details')].every(d=>d.open);toggle.textContent=all?'بستن همه':'باز کردن همه';toggle.setAttribute('aria-pressed',String(all));},true);
  host.addEventListener('click',async e=>{
    if(e.target.closest('[data-retry]')){location.reload();return;}
    if(e.target.closest('[data-more]')){const first=releases[shown]?.version;shown+=BATCH;paint();if(first)document.getElementById(anchor(first))?.querySelector('summary')?.focus();return;}
    const copy=e.target.closest('[data-copy-link]');if(!copy)return;
    const url=location.origin+location.pathname+'#'+copy.dataset.copyLink,text=copy.querySelector('span');
    try{await navigator.clipboard.writeText(url);text.textContent='پیوند کپی شد';}catch{text.textContent='کپی نشد؛ از نوار آدرس بردار';}
    history.replaceState(null,'','#'+copy.dataset.copyLink);setTimeout(()=>{text.textContent='کپی پیوند این نسخه';},1800);
  });
  index.addEventListener('click',e=>{const link=e.target.closest('[data-jump]');if(!link)return;e.preventDefault();history.replaceState(null,'','#'+anchor(link.dataset.jump));reveal(link.dataset.jump);});
  toggle.addEventListener('click',()=>{const visible=[...host.querySelectorAll('.cl-release')].map(a=>a.dataset.version),all=visible.every(v=>open.has(v));for(const v of visible)all?open.delete(v):open.add(v);paint();});
  let timer=0;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(paint,120);});
  search.addEventListener('keydown',e=>{if(e.key==='Escape'&&search.value){search.value='';paint();}});
  const fromHash=()=>releases.find(r=>'#'+anchor(r.version)===location.hash)?.version;
  addEventListener('hashchange',()=>{const v=fromHash();if(v)reveal(v);});
  fetch('/api/changes').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
    releases=data.releases;if(!releases.length){host.innerHTML='<p class="cl-state">هنوز نسخه‌ای ثبت نشده است.</p>';return;}
    const latest=releases[0];open.add(latest.version);
    document.getElementById('cl-current').textContent=label(latest.version);document.getElementById('cl-latest').textContent=longDate(latest.date);document.getElementById('cl-count').textContent=fa(releases.length);
    const linked=fromHash();if(linked)reveal(linked);else paint();
  }).catch(()=>{host.innerHTML='<p class="cl-state" role="alert">فهرست نسخه‌ها دریافت نشد. <button type="button" class="cl-link" data-retry>تلاش دوباره</button></p>';});
})();
