(() => {
 'use strict';
 const host=document.getElementById('releases'),search=document.getElementById('release-search'),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let releases=[],page=0;
 function paint(){
  const query=search.value.trim().toLocaleLowerCase('fa'),list=releases.filter(r=>JSON.stringify(r).toLocaleLowerCase('fa').includes(query)),pages=Math.ceil(list.length/5);
  page=Math.min(page,Math.max(0,pages-1));
  host.innerHTML=list.length?list.slice(page*5,page*5+5).map(r=>'<article><details><summary class="release-title"><h2>'+esc(r.title)+'</h2><div><b dir="ltr">'+esc(r.version)+'</b><time datetime="'+esc(r.date)+'">'+new Date(r.date+'T12:00:00Z').toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran',dateStyle:'long'})+'</time></div></summary>'+(r.summary?'<p class="release-summary">'+esc(r.summary)+'</p>':'')+r.groups.map(g=>'<section><h3>'+esc(g.title)+'</h3><ul>'+g.items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></section>').join('')+'</details></article>').join(''):'<p>تغییری با این جست‌وجو پیدا نشد.</p>';
  if(pages>1)host.insertAdjacentHTML('beforeend','<nav class="release-pagination" aria-label="صفحات نسخه‌ها"><button type="button" data-page="-1" '+(!page?'disabled':'')+'>قبلی</button><span>صفحهٔ '+(page+1).toLocaleString('fa-IR')+' از '+pages.toLocaleString('fa-IR')+'</span><button type="button" data-page="1" '+(page+1>=pages?'disabled':'')+'>بعدی</button></nav>');
 }
 host.addEventListener('click',e=>{const button=e.target.closest('[data-page]');if(!button||button.disabled)return;page+=Number(button.dataset.page);paint();host.scrollIntoView({block:'start'});});
 search.addEventListener('input',()=>{page=0;paint();});
 fetch('/api/changes').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{releases=data.releases;paint();}).catch(()=>{host.textContent='فهرست نسخه‌ها دریافت نشد؛ صفحه را دوباره باز کن.';});
})();
