// Support desk: ticket list and the open conversation side by side (stacked on phones), status tiles that filter,
// bulk status changes with typed confirmation, and a reply composer with canned openers and Ctrl+Enter.
(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fa=n=>Number(n||0).toLocaleString('fa-IR');
  const statuses={open:'در انتظار پاسخ',answered:'پاسخ داده شده',closed:'بسته شده'};
  const categories={account:'حساب',payment:'پرداخت',editor:'ویرایشگر',publication:'انتشار',other:'سایر'};
  const date=n=>new Date(Number(n)).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'});
  const ago=n=>{const s=Math.max(0,(Date.now()-Number(n))/1000);if(s<60)return 'همین حالا';if(s<3600)return fa(Math.floor(s/60))+' دقیقه پیش';if(s<86400)return fa(Math.floor(s/3600))+' ساعت پیش';if(s<604800)return fa(Math.floor(s/86400))+' روز پیش';return new Date(Number(n)).toLocaleDateString('fa-IR',{dateStyle:'medium',timeZone:'Asia/Tehran'});};
  const icon=name=>window.RI?.icon(name)||'';
  const canned=[['سلام','سلام، وقت شما بخیر. ممنون که پیام دادید.\n'],['شمارهٔ فاکتور','برای پیگیری پرداخت، لطفاً شمارهٔ فاکتور یا کد رهگیری بانک را بفرستید. رمز کارت یا کد پیامکی را هرگز نفرستید.'],['تصویر خطا','اگر ممکن است، تصویری از صفحه هنگام خطا پیوست کنید تا دقیق‌تر بررسی کنیم.'],['حل شد','مشکل برطرف شد. اگر دوباره پیش آمد، در همین گفت‌وگو بنویسید.']];
  let owner,page=1,serial=0,ticket=null,replyId=null,busy=false,rows=[],total=0,summary=null;
  const workspace=$('#workspace'),filters=$('#filters'),feedback=$('#feedback');
  function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.insertAdjacentHTML('afterbegin',icon(el.dataset.icon));el.removeAttribute('data-icon');});}
  async function request(route,data){
    const response=await fetch('/api/dashboard/support'+route,{method:data?'POST':'GET',headers:{'X-ResumeIt-Owner':owner,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'اطلاعات دریافت نشد');return result;
  }
  function error(e){feedback.textContent=e.name==='TimeoutError'?'دریافت اطلاعات طول کشید؛ دوباره تلاش کن.':e.message;feedback.dataset.kind='error';}
  function note(text){feedback.textContent=text;feedback.dataset.kind='ok';}

  // Desk frame: list column and conversation column; the list stays put while conversations change.
  function frame(){if(!workspace.querySelector('.desk-list'))workspace.innerHTML='<section class="desk-list" aria-label="فهرست گفت‌وگوها"></section><section class="desk-thread" aria-live="polite"></section>';return {list:workspace.querySelector('.desk-list'),thread:workspace.querySelector('.desk-thread')};}
  function paintSummary(){
    const current=filters.elements.status.value;
    $('#summary').innerHTML=[['','total','همهٔ تیکت‌ها','mail'],['open','open','منتظر پاسخ شما','clock'],['answered','answered','پاسخ داده شده','check'],['closed','closed','بسته شده','lock']].map(([value,key,label,glyph])=>'<button type="button" class="stat stat--'+key+'" data-filter="'+value+'" aria-pressed="'+(current===value)+'"><span class="stat__icon">'+icon(glyph)+'</span><span class="stat__label">'+label+'</span><strong>'+fa(summary?.[key])+'</strong></button>').join('');
    const badge=$('#menu-open');if(badge){badge.hidden=!summary?.open;badge.textContent=fa(summary?.open);}
  }
  function paintList(){
    const {list}=frame(),pages=Math.max(1,Math.ceil(total/25));
    list.innerHTML=rows.length?'<div class="staff-bulk-tools"><label class="check-all"><input type="checkbox" data-ticket-select-all>همهٔ این صفحه</label><span class="bulk-count" data-bulk-count>انتخاب نشده</span><span class="bulk-actions"><button class="btn btn-sm" type="button" data-bulk-status="closed">بستن منتخب</button><button class="btn btn-sm" type="button" data-bulk-status="open">باز کردن منتخب</button><button class="btn btn-sm btn-icon" type="button" data-copy-tickets title="کپی شناسه‌های منتخب" aria-label="کپی شناسه‌های منتخب">'+icon('copy')+'</button></span></div><ul class="ticket-list">'+rows.map(t=>'<li class="ticket-entry is-'+esc(t.status)+(ticket?.id===t.id?' is-active':'')+'"><input type="checkbox" value="'+esc(t.id)+'" data-ticket-code="'+esc(t.admin_code||t.id)+'" data-ticket-check aria-label="انتخاب تیکت '+esc(t.subject)+'"><button type="button" class="ticket-row" data-ticket="'+esc(t.id)+'"'+(ticket?.id===t.id?' aria-current="true"':'')+'><span class="ticket-top"><strong>'+esc(t.subject)+'</strong><time datetime="'+new Date(Number(t.updated_at)).toISOString()+'" title="'+esc(date(t.updated_at))+'">'+esc(ago(t.updated_at))+'</time></span><span class="ticket-meta"><span class="badge '+esc(t.status)+'">'+esc(statuses[t.status])+'</span><span class="tag">'+esc(categories[t.category]||'سایر')+'</span>'+(t.priority==='high'?'<span class="tag tag--high">اولویت بالا</span>':'')+'<bdi class="code">'+esc(t.admin_code||t.id.slice(0,8))+'</bdi></span></button></li>').join('')+'</ul>':'<div class="desk-empty"><b>گفت‌وگویی پیدا نشد</b><p>جست‌وجو یا وضعیت را تغییر بده.</p></div>';
    list.insertAdjacentHTML('beforeend','<nav class="pagination" aria-label="صفحه‌های تیکت"><button class="btn btn-sm" type="button" data-page="'+(page-1)+'" '+(page===1?'disabled':'')+'>قبلی</button><span>صفحهٔ '+fa(page)+' از '+fa(pages)+' · '+fa(total)+' تیکت</span><button class="btn btn-sm" type="button" data-page="'+(page+1)+'" '+(page*25>=total?'disabled':'')+'>بعدی</button></nav>');
  }
  function paintEmpty(){const {thread}=frame();workspace.classList.remove('is-reading');thread.innerHTML='<div class="desk-empty desk-empty--thread">'+icon('mail')+'<b>یک گفت‌وگو را انتخاب کن</b><p>پیام‌ها، مشخصات کاربر و پاسخ‌نویس این‌جا باز می‌شوند.</p></div>';}
  async function list(keepThread=false){
    if(busy)return;const token=++serial;workspace.setAttribute('aria-busy','true');
    const params=new URLSearchParams({staff:'1',page,q:filters.elements.q.value,status:filters.elements.status.value});
    try{const data=await request('?'+params);if(token!==serial)return;rows=data.rows;total=data.total;summary=data.summary;paintSummary();paintList();if(!keepThread||!ticket){ticket=null;paintEmpty();}}
    catch(e){if(token===serial)error(e);}finally{if(token===serial)workspace.setAttribute('aria-busy','false');}
  }
  function bubble(m,i,data){
    const staff=!!m.staff;return '<article class="message'+(staff?' staff':'')+'"><header><span class="who">'+(staff?icon('shield')+'پشتیبانی':icon('user')+esc(data.customer?.name||'کاربر'))+'</span><time title="'+esc(date(m.created_at))+'">'+esc(ago(m.created_at))+'</time></header><p>'+esc(m.body)+'</p><div class="files" data-files="'+i+'"></div></article>';
  }
  async function open(id,{focus=true}={}){
    const token=++serial;workspace.setAttribute('aria-busy','true');feedback.textContent='';
    try{const data=await request('?staff=1&id='+encodeURIComponent(id));if(token!==serial)return;ticket=data;replyId=crypto.randomUUID();
      const {thread}=frame();workspace.classList.add('is-reading');
      workspace.querySelectorAll('.ticket-entry').forEach(li=>{const on=li.querySelector('[data-ticket]').dataset.ticket===id;li.classList.toggle('is-active',on);on?li.querySelector('[data-ticket]').setAttribute('aria-current','true'):li.querySelector('[data-ticket]').removeAttribute('aria-current');});
      const code=data.admin_code||data.id.slice(0,8),closed=data.status==='closed';
      thread.innerHTML='<div class="thread"><div class="thread-head"><button class="btn btn-sm btn-ghost thread-back" type="button" data-back>'+icon('menu')+'همهٔ تیکت‌ها</button><div class="thread-title"><h2>'+esc(data.subject)+'</h2><p><span class="badge '+esc(data.status)+'">'+esc(statuses[data.status])+'</span><span class="tag">'+esc(categories[data.category]||'سایر')+'</span>'+(data.priority==='high'?'<span class="tag tag--high">اولویت بالا</span>':'')+'<button type="button" class="code code-copy" data-copy-ticket="'+esc(code)+'" title="کپی شناسهٔ تیکت">'+icon('copy')+'<bdi>'+esc(code)+'</bdi></button></p><small>ثبت '+esc(date(data.created_at))+' · '+fa(data.messages.length)+' پیام</small></div><button class="btn btn-sm '+(closed?'btn-primary':'')+'" type="button" data-status="'+(closed?'open':'closed')+'">'+icon(closed?'undo':'check')+(closed?'باز کردن دوباره':'بستن تیکت')+'</button></div>'+
        (data.customer?'<div class="customer"><span class="avatar" aria-hidden="true">'+esc((data.customer.name||'ک').trim().charAt(0))+'</span><div><strong>'+esc(data.customer.name||'بدون نام')+'</strong><small dir="ltr">'+esc(data.customer.admin_code||data.customer.id)+'</small></div><span class="badge '+(data.customer.suspended?'suspended':'active')+'">'+esc(data.customer.suspended?'حساب تعلیق‌شده':'حساب فعال')+'</span></div>':'')+
        '<div class="conversation">'+data.messages.map((m,i)=>bubble(m,i,data)).join('')+'</div>'+
        (closed?'<p class="thread-closed">'+icon('lock')+'این تیکت بسته است. برای پاسخ، اول آن را دوباره باز کن.</p>':'<div class="composer"><div class="canned" aria-label="شروع آماده">'+canned.map(([label],i)=>'<button type="button" class="chip" data-canned="'+i+'">'+esc(label)+'</button>').join('')+'</div><form class="reply" id="reply"><label for="reply-body" class="sr">پاسخ شما</label><textarea id="reply-body" name="body" required maxlength="6000" rows="4" placeholder="پاسخ به '+esc(data.customer?.name||'کاربر')+'… (Ctrl+Enter برای ارسال)"></textarea><div class="reply-foot"><span class="counter" data-counter>۰ / ۶٬۰۰۰</span><button class="btn btn-primary" type="submit">'+icon('mail')+'ارسال پاسخ</button></div></form></div>')+'</div>';
      thread.querySelectorAll('[data-files]').forEach(el=>{el.innerHTML=ResumeSupportFiles.links(data.messages[Number(el.dataset.files)].attachments,true);});
      thread.querySelector('#reply .reply-foot')?.insertAdjacentHTML('beforebegin',ResumeSupportFiles.input(true));
      const convo=thread.querySelector('.conversation');convo.scrollTop=convo.scrollHeight;
      if(focus)(thread.querySelector('#reply-body')||thread.querySelector('[data-back]'))?.focus({preventScroll:true});
      if(matchMedia('(max-width:980px)').matches)thread.scrollIntoView({block:'start'});
    }catch(e){if(token===serial)error(e);}finally{if(token===serial)workspace.setAttribute('aria-busy','false');}
  }
  function selected(){return [...workspace.querySelectorAll('[data-ticket-check]:checked')];}
  function countSelected(){const n=selected().length,label=workspace.querySelector('[data-bulk-count]');if(label)label.textContent=n?fa(n)+' انتخاب‌شده':'انتخاب نشده';}

  let timer=0;filters.elements.q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;list(true);},350);});
  filters.onsubmit=e=>{e.preventDefault();clearTimeout(timer);page=1;list(true);};filters.elements.status.onchange=()=>{page=1;list(true);};
  $('#summary').addEventListener('click',e=>{const tile=e.target.closest('[data-filter]');if(!tile||busy)return;filters.elements.status.value=tile.dataset.filter;page=1;list(true);});
  $('#staff-refresh').addEventListener('click',async()=>{await list(true);if(ticket)await open(ticket.id,{focus:false});note('فهرست به‌روز شد.');});
  workspace.addEventListener('change',e=>{if(e.target.matches('[data-ticket-select-all]'))workspace.querySelectorAll('[data-ticket-check]').forEach(input=>input.checked=e.target.checked);if(e.target.matches('[data-ticket-check],[data-ticket-select-all]'))countSelected();});
  workspace.addEventListener('input',e=>{if(e.target.id!=='reply-body')return;const c=workspace.querySelector('[data-counter]');if(c){c.textContent=fa(e.target.value.length)+' / ۶٬۰۰۰';c.classList.toggle('is-near',e.target.value.length>5400);}});
  workspace.addEventListener('keydown',e=>{if(e.target.id==='reply-body'&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.target.form.requestSubmit();}});
  workspace.addEventListener('click',async e=>{
    const copy=e.target.closest('[data-copy-ticket]'),copySelected=e.target.closest('[data-copy-tickets]'),batch=e.target.closest('[data-bulk-status]'),cannedButton=e.target.closest('[data-canned]');
    if(cannedButton){const box=workspace.querySelector('#reply-body'),text=canned[Number(cannedButton.dataset.canned)][1];box.value=box.value?box.value.replace(/\s*$/,'\n')+text:text;box.dispatchEvent(new Event('input',{bubbles:true}));box.focus();return;}
    if(copy||copySelected){const ids=copy?[copy.dataset.copyTicket]:selected().map(x=>x.dataset.ticketCode||x.value);if(!ids.length){note('ابتدا تیکت‌ها را انتخاب کن');return;}try{await navigator.clipboard.writeText(ids.join('\n'));note(ids.length>1?fa(ids.length)+' شناسه کپی شد':'شناسه کپی شد');}catch{error(Error('کپی ممکن نشد؛ شناسه را انتخاب و کپی کن'));}return;}
    if(batch&&!busy){const ids=selected().map(x=>x.value);if(!ids.length){note('ابتدا تیکت‌ها را انتخاب کن');return;}const dialog=document.createElement('dialog');dialog.className='staff-bulk-dialog';dialog.innerHTML='<form><h2>'+esc(batch.textContent)+'</h2><p>'+fa(ids.length)+' تیکت انتخاب شده؛ نتیجهٔ هر مورد جداگانه ثبت می‌شود.</p><label>برای تأیید، تعداد را با ارقام انگلیسی بنویس<input name="count" required inputmode="numeric" autocomplete="off"></label><div class="dialog-actions"><button class="btn btn-primary" type="submit">اجرا</button><button class="btn" type="button" data-cancel>انصراف</button></div><p role="status"></p></form>';document.body.append(dialog);let pending=false;dialog.oncancel=event=>{if(pending)event.preventDefault();};dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
      dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(pending)return;const form=event.target,status=form.querySelector('[role=status]');if(form.elements.count.value!==String(ids.length)){status.textContent='تعداد را دقیق وارد کن';return;}pending=busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);let ok=0;const failures=[];for(const id of ids){try{await request('/status?staff=1',{id,status:batch.dataset.bulkStatus});ok++;}catch(err){failures.push(id+': '+err.message);}}pending=busy=false;await list(true);if(ticket&&ids.includes(ticket.id))await open(ticket.id,{focus:false});status.textContent=fa(ok)+' موفق، '+fa(failures.length)+' ناموفق'+(failures.length?'\n'+failures.join('\n'):'');form.querySelector('[type=submit]').remove();form.querySelector('[data-cancel]').disabled=false;form.querySelector('[data-cancel]').textContent='بستن';};dialog.showModal();return;}
    if(busy)return;const row=e.target.closest('[data-ticket]'),paging=e.target.closest('[data-page]'),state=e.target.closest('[data-status]');
    if(row)open(row.dataset.ticket);
    if(paging&&!paging.disabled){page=Number(paging.dataset.page);list(true);workspace.querySelector('.desk-list')?.scrollIntoView({block:'start'});}
    if(e.target.closest('[data-back]')){const last=ticket?.id;ticket=null;paintEmpty();workspace.querySelectorAll('.ticket-entry.is-active').forEach(li=>{li.classList.remove('is-active');li.querySelector('[data-ticket]').removeAttribute('aria-current');});workspace.querySelector('[data-ticket="'+last+'"]')?.focus();list(true);}
    if(state&&ticket){busy=true;state.disabled=true;try{await request('/status?staff=1',{id:ticket.id,status:state.dataset.status});busy=false;await open(ticket.id,{focus:false});await list(true);note(state.dataset.status==='closed'?'تیکت بسته شد.':'تیکت دوباره باز شد.');}catch(err){error(err);}finally{busy=false;state.disabled=false;}}
  });
  workspace.addEventListener('submit',async e=>{
    if(e.target.id!=='reply')return;e.preventDefault();if(busy)return;busy=true;const button=e.target.querySelector('button');button.disabled=true;
    try{const attachments=await ResumeSupportFiles.read(e.target.querySelector('#ticket-files'),true);await request('/reply?staff=1',{id:ticket.id,body:e.target.elements.body.value,requestId:replyId,attachments});busy=false;await open(ticket.id,{focus:false});await list(true);note('پاسخ ثبت شد.');}catch(err){error(err);}finally{busy=false;button.disabled=false;}
  });
  $('#logout').onclick=async()=>{if(busy)return;try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('خروج انجام نشد');location.assign('/login/');}catch(e){error(e);}};
  // Quietly refresh the list every minute while the tab is visible and nothing is being typed or sent.
  setInterval(()=>{if(document.hidden||busy||document.querySelector('dialog[open]'))return;if(document.activeElement?.id==='reply-body'&&document.activeElement.value)return;list(true);},60000);
  (async()=>{icons();const r=await fetch('/api/auth/session'),{user}=await r.json();if(!user){location.replace('/login/');return;}if(!user.is_owner&&!user.is_admin&&!user.is_support){location.replace('/dashboard/');return;}owner=user.id;$('#staff-name').textContent=[user.first_name,user.last_name].filter(Boolean).join(' ')||'پشتیبان ResumeIt';const role=user.is_owner?'مالک / فول ادمین':user.is_admin?'ادمین':'ساپورت';$('.staff-profile small').textContent=role;$('.role-badge').textContent='میز پشتیبانی · '+role;if(user.is_owner||user.is_admin)document.querySelector('[data-admin-only]').hidden=false;await list();})().catch(error);
})();
