(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fa=n=>Number(n||0).toLocaleString('fa-IR');
  const statuses={open:'در انتظار پاسخ',answered:'پاسخ داده شده',closed:'بسته شده'},date=n=>new Date(Number(n)).toLocaleString('fa-IR',{dateStyle:'short',timeStyle:'short'});
  let owner,page=1,serial=0,ticket=null,replyId=null,busy=false;
  const workspace=$('#workspace'),filters=$('#filters'),feedback=$('#feedback');
  function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.insertAdjacentHTML('afterbegin',window.RI.icon(el.dataset.icon==='help'||el.dataset.icon==='send'?'mail':el.dataset.icon));el.removeAttribute('data-icon');});}
  async function request(route,data){
    const response=await fetch('/api/dashboard/support'+route,{method:data?'POST':'GET',headers:{'X-ResumeIt-Owner':owner,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'اطلاعات دریافت نشد');return result;
  }
  function error(e){feedback.textContent=e.name==='TimeoutError'?'دریافت اطلاعات طول کشید؛ دوباره تلاش کنید.':e.message;}
  async function list(){
    if(busy)return;const token=++serial;ticket=null;filters.hidden=false;workspace.setAttribute('aria-busy','true');feedback.textContent='';
    const params=new URLSearchParams({staff:'1',page,q:filters.elements.q.value,status:filters.elements.status.value});
    try{const data=await request('?'+params);if(token!==serial)return;
      $('#summary').innerHTML=[['total','همهٔ تیکت‌ها'],['open','منتظر پاسخ شما'],['answered','پاسخ داده شده'],['closed','بسته شده']].map(([key,label])=>'<div class="stat"><span>'+label+'</span><strong>'+fa(data.summary[key])+'</strong></div>').join('');
      workspace.innerHTML=data.rows.length?data.rows.map(t=>'<button class="ticket-row" data-ticket="'+esc(t.id)+'"><span><strong>'+esc(t.subject)+'</strong><small>'+esc(t.priority==='high'?'اولویت بالا':'اولویت عادی')+' · '+esc(t.id.slice(0,8))+'</small></span><span class="badge '+esc(t.status)+'">'+esc(statuses[t.status])+'</span><time>'+esc(date(t.updated_at))+'</time></button>').join(''):'<p class="empty">گفت‌وگویی با این مشخصات پیدا نشد.</p>';
      workspace.insertAdjacentHTML('beforeend','<nav class="pagination" aria-label="صفحه‌های تیکت"><button class="btn" data-page="'+(page-1)+'" '+(page===1?'disabled':'')+'>قبلی</button><span>صفحهٔ '+fa(page)+' از '+fa(Math.max(1,Math.ceil(data.total/25)))+'</span><button class="btn" data-page="'+(page+1)+'" '+(page*25>=data.total?'disabled':'')+'>بعدی</button></nav>');
    }catch(e){if(token===serial)error(e);}finally{if(token===serial)workspace.setAttribute('aria-busy','false');}
  }
  async function open(id){
    const token=++serial;workspace.setAttribute('aria-busy','true');feedback.textContent='';
    try{const data=await request('?staff=1&id='+encodeURIComponent(id));if(token!==serial)return;ticket=data;replyId=crypto.randomUUID();filters.hidden=true;
      workspace.innerHTML='<section class="thread"><div class="thread-head"><div><small>گفت‌وگو · '+esc(data.id.slice(0,8))+'</small><h2>'+esc(data.subject)+'</h2><span class="badge '+esc(data.status)+'">'+esc(statuses[data.status])+'</span></div><div><button class="btn" data-back>همهٔ تیکت‌ها</button> <button class="btn" data-status="'+(data.status==='closed'?'open':'closed')+'">'+(data.status==='closed'?'باز کردن دوباره':'بستن تیکت')+'</button></div></div><div class="conversation">'+data.messages.map(m=>'<article class="message '+(m.staff?'staff':'')+'"><small>'+esc(m.staff?'پشتیبانی':'کاربر')+' · '+esc(date(m.created_at))+'</small><p>'+esc(m.body)+'</p></article>').join('')+'</div>'+(data.status!=='closed'?'<form class="reply" id="reply"><label for="reply-body">پاسخ شما</label><textarea class="textarea" id="reply-body" name="body" required maxlength="6000" rows="4"></textarea><button class="btn btn-primary" type="submit" data-icon="send">ارسال پاسخ</button></form>':'')+'</section>';icons(workspace);
      if(data.customer)workspace.querySelector('.thread-head').insertAdjacentHTML('afterend','<div class="customer"><span>کاربر: <strong>'+esc(data.customer.name||'بدون نام')+'</strong></span><span class="badge">'+esc(data.customer.suspended?'حساب تعلیق‌شده':'حساب فعال')+'</span><small dir="ltr">'+esc(data.customer.id)+'</small></div>');
    }catch(e){if(token===serial)error(e);}finally{if(token===serial)workspace.setAttribute('aria-busy','false');}
  }
  filters.onsubmit=e=>{e.preventDefault();page=1;list();};filters.elements.status.onchange=()=>{page=1;list();};
  workspace.addEventListener('click',async e=>{
    if(busy)return;const row=e.target.closest('[data-ticket]'),paging=e.target.closest('[data-page]'),state=e.target.closest('[data-status]');
    if(row)open(row.dataset.ticket);if(paging){page=Number(paging.dataset.page);list();}if(e.target.closest('[data-back]'))list();
    if(state&&ticket){busy=true;state.disabled=true;try{await request('/status?staff=1',{id:ticket.id,status:state.dataset.status});await open(ticket.id);}catch(e){error(e);}finally{busy=false;state.disabled=false;}}
  });
  workspace.addEventListener('submit',async e=>{
    if(e.target.id!=='reply')return;e.preventDefault();if(busy)return;busy=true;const button=e.target.querySelector('button');button.disabled=true;
    try{await request('/reply?staff=1',{id:ticket.id,body:e.target.elements.body.value,requestId:replyId});await open(ticket.id);feedback.textContent='پاسخ ثبت شد.';}catch(e){error(e);}finally{busy=false;button.disabled=false;}
  });
  $('#logout').onclick=async()=>{if(busy)return;try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('خروج انجام نشد');location.assign('/login/');}catch(e){error(e);}};
  (async()=>{icons();const r=await fetch('/api/auth/session'),{user}=await r.json();if(!user){location.replace('/login/');return;}if(!user.is_owner&&!user.is_admin&&!user.is_support){location.replace('/dashboard/');return;}owner=user.id;$('#staff-name').textContent=[user.first_name,user.last_name].filter(Boolean).join(' ')||'پشتیبان رزومیت';const role=user.is_owner?'مالک / فول ادمین':user.is_admin?'ادمین':'ساپورت';$('.staff-profile small').textContent=role;$('.role-badge').textContent='میز پشتیبانی · '+role;await list();})().catch(error);
})();
