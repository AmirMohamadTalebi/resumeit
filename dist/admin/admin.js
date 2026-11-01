(() => {
  "use strict";
  const sections = {
    overview: [
      "نمای کلی",
      "home",
      "آنچه امروز در ResumeIt می‌گذرد؛ از رشد کاربران تا استفاده و خرید.",
    ],
    users: [
      "کاربران",
      "user",
      "حساب‌ها، دسترسی‌ها و وضعیت فعالیت کاربران را مدیریت کنید.",
    ],
    pages: [
      "صفحات کاربران",
      "globe",
      "آدرس‌ها و وضعیت انتشار رزومه و صفحهٔ لینک‌ها.",
    ],
    traffic: [
      "بازدید و کلیک",
      "chart",
      "روند استفاده از صفحات عمومی در بازهٔ انتخاب‌شده.",
    ],
    transactions: [
      "کیف پول و تراکنش‌ها",
      "card",
      "گردش It، شارژهای مدیریتی و خریدهای انجام‌شده.",
    ],
    payments: ["پرداخت‌های بانکی", "card", "درخواست‌های شارژ، نتیجهٔ تأیید بانک و موارد نیازمند بررسی؛ اطلاعات کارت ذخیره نمی‌شود."],
    purchases: [
      "خریدها و اشتراک‌ها",
      "star",
      "دسترسی‌های خریداری‌شده و زمان پایان اشتراک‌ها.",
    ],
    catalog: [
      "قالب‌ها و فونت‌ها",
      "palette",
      "فهرست محصولات و قیمت‌های واقعی مورد استفاده در سایت.",
    ],
    otp: [
      "پیامک و OTP",
      "phone",
      "تعداد درخواست‌های ارسال، پذیرش سرویس پیامک و تأیید کدها.",
    ],
    audit: [
      "سابقهٔ مدیریت",
      "history",
      "عملیات مدیر همراه با دلیل، زمان و حساب هدف ثبت می‌شود.",
    ],
    health: [
      "وضعیت سرویس‌ها",
      "settings",
      "نسخهٔ سایت، اتصال سرویس‌ها و محدودیت‌های فعال.",
    ],
    assistant:['فندق، دستیار هوشمند','sparkle','سهمیهٔ پیام‌ها، اشتراک دستیار، آمار استفاده و اتصال به سرویس‌های هوش مصنوعی.'],
    retention:['نگهداری و پاک‌سازی','history','پیش‌نمایش بازه، بایگانی قابل‌بازیابی اسناد و حذف محدود داده‌های قدیمی.'],
  };
  const section = document.body.dataset.section || "overview",
    $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      ),
    fa = (v) => Number(v || 0).toLocaleString("fa-IR",{maximumFractionDigits:4}),
    date = (v) =>
      v
        ? new Date(
            typeof v === "string" && !/^\d+$/.test(v) ? v : Number(v),
          ).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })
        : "—",
    icon = (n) => window.RI.icon(n),
    parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
  let ownerId, detailUser, fullAdmin=false;
  const roleNames={owner:'مالک / فول ادمین',admin:'ادمین',support:'ساپورت',user:'کاربر'};
  let page = 1,
    rows = [],
    total = 0,
    loadToken = 0;
  const actionNames = {
    'owner-page-quota':'تعیین سقف ریزدامنه',
    'catalog-product':'ویرایش محصول',
    'retention-run':'نگهداری و پاک‌سازی',
    'owner-password':'بازنشانی رمز توسط مالک',
    'owner-subscription':'اصلاح اشتراک توسط مالک',
    'owner-profile':'ویرایش پیشرفتهٔ مشخصات',
    'owner-access':'تغییر دسترسی محصول',
    'owner-wallet':'اصلاح اعتبار توسط مالک',
    'owner-extra-subdomain':'تغییر سهمیهٔ ریزدامنه',
    'owner-commerce':'تغییر قیمت‌گذاری و نرخ It',
    'account-role':'تغییر نقش حساب',
    'support-role':'تغییر نقش ساپورت',
    'audit-purge':'پاک‌سازی لاگ مدیریتی',
    'support-reply':'پاسخ پشتیبانی',
    'support-open':'باز کردن تیکت',
    'support-closed':'بستن تیکت',
    credit: "شارژ کیف پول",
    suspend: "تعلیق حساب",
    restore: "رفع تعلیق",
    "block-publication": "توقف انتشار",
    "unblock-publication": "اجازهٔ انتشار",
    "revoke-sessions": "خروج از همهٔ نشست‌ها",
    "edit-profile": "ویرایش مشخصات",
    "delete-account": "حذف دائمی حساب",
    "payment-gateways": "تغییر درگاه‌های پرداخت",
  };
  const statuses = {
    accepted: "پذیرفته‌شده",
    failed: "ارسال ناموفق",
    pending: "در انتظار نتیجه",
    register: "ثبت‌نام",
    login: "ورود",
    reset: "بازیابی رمز",
    phone: "تأیید شماره",
  };
  const badge = (s, label) =>
    '<span class="badge ' +
    (s ? "badge-success" : "badge-warning") +
    '">' +
    esc(label || (s ? "فعال" : "غیرفعال")) +
    "</span>";
  async function api(route, data) {
    const response = await fetch("/api/admin/" + route, {
      cache: "no-store",
      method: data ? "POST" : "GET",
      headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(ownerId ? { "X-ResumeIt-Owner": ownerId } : {}) },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) location.assign("/login/");
      throw new Error(result.error || "درخواست انجام نشد");
    }
    return result;
  }
  function summary(items) {
    return (
      '<dl class="summary-list">' +
      items
        .map(([k, v]) => "<div><dt>" + esc(k) + "</dt><dd>" + v + "</dd></div>")
        .join("") +
      "</dl>"
    );
  }
  function table(headers, data) {
    return (
      '<p class="table-hint">اگر همهٔ ستون‌ها دیده نمی‌شوند، جدول را افقی جابه‌جا کنید.</p><div class="table-scroll" tabindex="0" role="region" aria-label="جدول ' + esc(headers.join('، ')) + '"><table class="table"><thead><tr>' +
      headers.map((h) => '<th scope="col">' + esc(h) + "</th>").join("") +
      "</tr></thead><tbody>" +
      data
        .map(
          (row) =>
            "<tr>" + row.map((v) => "<td>" + v + "</td>").join("") + "</tr>",
        )
        .join("") +
      "</tbody></table></div>"
    );
  }
  function chart(data, otp = false) {
    const map = new Map();
    for (const r of data) {
      const day = Number(r.day);
      if (!map.has(day)) map.set(day, [0, 0]);
      if (otp) map.set(day, [Number(r.accepted), Number(r.failed)]);
      else map.get(day)[r.event === "click" ? 1 : 0] += Number(r.total);
    }
    const vals = [...map].sort((a, b) => a[0] - b[0]),
      max = Math.max(1, ...vals.flatMap((x) => x[1]));
    if (!vals.length)
      return '<p class="empty">هنوز آماری برای این بازه ثبت نشده است.</p>';
    // Same chart as the dashboard: one chosen kind (column, line, area, pie) for every chart on the site.
    const labels = vals.map(([day]) => new Date(day * 86400000).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }));
    return window.RICharts.placeholder({
      title: otp ? "پذیرش و خطای ارسال OTP" : "بازدید و کلیک صفحات",
      labelTitle: "تاریخ",
      labels,
      series: [
        { name: otp ? "پذیرش سرویس" : "بازدید", values: vals.map(([, [a]]) => a), color: "#52788d" },
        { name: otp ? "خطای ارسال" : "کلیک", values: vals.map(([, [, b]]) => b), color: otp ? "#b0443a" : "#a47248" },
      ],
    });
  }
  function overview(d) {
    const views = d.traffic
      .filter((r) => r.event !== "click")
      .reduce((a, r) => a + Number(r.total), 0);
    return (
      '<div class="overview-kpis">' +
      [
        [
          d.users.total,
          "کل کاربران",
          fa(d.users.recent) + " حساب جدید در بازه",
        ],
        [views, "بازدید صفحات", "در بازهٔ انتخاب‌شده"],
        [
          d.otp.accepted,
          "ارسال پذیرفته‌شدهٔ OTP",
          fa(d.otp.failed) + " ارسال ناموفق",
        ],
        [
          Number(d.purchases.spent) / 2000,
          "خرید با It",
          fa(d.purchases.total) + " تراکنش خرید",
        ],
      ]
        .map(
          ([v, k, sub]) =>
            '<div class="kpi"><span>' +
            k +
            "</span><strong>" +
            fa(v) +
            "</strong><small>" +
            sub +
            "</small></div>",
        )
        .join("") +
      '</div><div class="admin-grid"><section class="panel"><h2>روند بازدید و کلیک<a class="section-link" href="/admin/traffic/">گزارش بازدید</a></h2>' +
      chart(d.traffic) +
      '</section><section class="panel"><h2>حساب‌ها و صفحات<a class="section-link" href="/admin/users/">کاربران</a></h2>' +
      summary([
        ["شماره‌های تأییدشده", fa(d.users.verified)],
        ["کاربران دارای نشست فعال", fa(d.sessions.total)],
        ["رزومه‌های منتشرشده", fa(d.pages.resumes)],
        ["صفحه‌های لینک منتشرشده", fa(d.pages.links)],
        ["اشتراک‌های فعال", fa(d.subscriptions.total)],
        ["موجودی کل کیف پول‌ها", fa(Number(d.wallet.balance) / 2000) + " It"],
      ]) +
      '</section><section class="panel"><h2>ارسال پیامک<a class="section-link" href="/admin/otp/">گزارش OTP</a></h2>' +
      chart(d.otpDaily, true) +
      '</section><section class="panel"><h2>تأیید و کنترل دسترسی</h2>' +
      summary([
        ["درخواست ارسال در بازه", fa(d.otp.total)],
        ["کدهای تأییدشده", fa(d.otp.verified)],
        ["حساب‌های محدودشده", fa(d.controls.suspended)],
        ["شروع داده‌های OTP در بازه", date(d.otp.started)],
      ]) +
      '<p class="notice">پذیرش سرویس به معنی تحویل به گوشی نیست. آمار ماندگار OTP از نسخهٔ ۲۱ ثبت می‌شود.</p></section></div>'
    );
  }
  const userLink = (id, name) =>
    '<a href="/admin/users/?user=' +
    encodeURIComponent(id) +
    '">' +
    esc(name || "مشاهدهٔ حساب") +
    "</a>";
  const recordKey=(r,kind=section)=>kind==='catalog'?r.ref:kind==='purchases'?r.user_id+':'+r.ref:kind==='pages'?r.id+':'+(r.slot||1):r.id;
  let catalogData=null,catalogView='products',catalogPage=1;
  let retentionBefore=Date.now()-90*86400000;
  function retention(d){const labels={audit:'گزارش‌های مدیریت',payments:'گزارش پرداخت‌های نهایی',transactions:'گردش کیف پول',purchases:'گزارش دسترسی‌ها',tickets:'تیکت‌های بسته',otp:'رویدادهای OTP',notifications:'اعلان‌های خوانده‌شده'};return '<form id="retention-preview" class="catalog-filters"><label>داده‌های قدیمی‌تر از<input class="input" type="datetime-local" name="before" value="'+new Date(d.before-new Date(d.before).getTimezoneOffset()*60000).toISOString().slice(0,16)+'" required></label><button class="btn" type="submit">پیش‌نمایش تعداد</button></form><p class="notice">حداقل سن داده هفت روز؛ هر اجرا حداکثر ۲۰۰ رکورد. اسناد مالی و رسید عملیات مدیریت حذف نمی‌شوند: از فهرست جاری بایگانی و از همین صفحه قابل‌بازگردانی‌اند. تیکت باز، اعلان نخوانده و پرداخت در جریان پاک نمی‌شوند.</p>'+table(['بخش','واجد شرایط','بایگانی‌شده','عملیات'],d.rows.map(row=>[labels[row.kind],fa(row.eligible),row.mode==='archive'?fa(row.archived):'—','<div class="btnrow"><button class="btn" type="button" data-retention-kind="'+row.kind+'" data-retention-action="'+row.mode+'" '+(!row.eligible?'disabled':'')+'>'+(row.mode==='archive'?'بایگانی':'حذف قدیمی‌ها')+'</button>'+(row.mode==='archive'?'<button class="btn" type="button" data-retention-kind="'+row.kind+'" data-retention-action="restore" '+(!row.archived?'disabled':'')+'>بازگردانی</button>':'')+'</div>']))+'<p role="status" id="retention-result"></p>';}
  function retentionDialog(kind,action){const before=retentionBefore,phrase=action==='archive'?'بایگانی گزارش‌ها':action==='restore'?'بازگردانی گزارش‌ها':'اجرای پاک‌سازی',dialog=document.createElement('dialog');dialog.className='batch-dialog';dialog.innerHTML='<form><h2>'+phrase+'</h2><p>بخش '+esc(kind)+'؛ حداکثر ۲۰۰ مورد از بازهٔ انتخاب‌شده.'+(action==='delete'?' حذف این داده‌ها برگشت‌پذیر نیست.':'')+'</p><label>دلیل<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید بنویس: '+phrase+'<input class="input" name="confirmation" required autocomplete="off"></label><div class="btnrow"><button class="btn btn-primary" type="submit">اجرای این نوبت</button><button class="btn" type="button" data-cancel>انصراف</button></div><p role="status"></p></form>';document.body.append(dialog);let busy=false,requestId=crypto.randomUUID();dialog.addEventListener('input',()=>{if(!busy)requestId=crypto.randomUUID();});dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.target,token=loadToken,controls=[...form.elements].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);form.querySelector('[role=status]').textContent='در حال ثبت…';try{const result=await api('retention/run',{kind,action,before,reason:form.elements.reason.value,confirmation:form.elements.confirmation.value,requestId});if(!dialog.isConnected)return;if(token===loadToken){await load();const output=$('#retention-result');if(loadToken===token+1&&output)output.textContent=fa(result.count)+' مورد پردازش شد؛ رسید عملیات ثبت شد. برای ادامه تعداد تازه را بررسی کن.';}dialog.close();}catch(error){if(dialog.isConnected)form.querySelector('[role=status]').textContent=error.message;}finally{busy=false;controls.forEach(el=>el.disabled=false);}};dialog.showModal();}
  const salesSummary=d=>d?'<div class="overview-kpis">'+[['today','خرید امروز'],['week','هفت روز اخیر'],['month','سی روز اخیر'],['total','کل خریدها']].map(([key,label])=>'<div class="kpi"><span>'+label+'</span><strong>'+fa(d.totals[key])+'</strong></div>').join('')+'</div>'+(Number(d.totals.unassigned)?'<p class="notice">'+fa(d.totals.unassigned)+' خرید قدیمی شناسهٔ محصول ندارد؛ در آمار کل هست اما به محصول خاص نسبت داده نمی‌شود.</p>':''):'';
  const recordId=(id,label=id)=>'<button class="btn record-id" type="button" data-record-id="'+esc(id)+'" data-copy-id="'+esc(label)+'" title="کپی شناسهٔ '+esc(label)+'" aria-label="کپی شناسهٔ '+esc(label)+'">'+icon('copy')+'<span dir="ltr">'+esc(label)+'</span></button>';
  function batchDialog(chosen,button){
    const product=!!button.dataset.bulkCatalog,requestIds=chosen.map(()=>crypto.randomUUID()),dlg=document.createElement('dialog');dlg.className='batch-dialog';
    dlg.innerHTML='<form><h2>'+esc(button.textContent)+'</h2><p>'+fa(chosen.length)+' مورد انتخاب شده؛ هر مورد جداگانه کنترل و ثبت می‌شود.</p>'+(button.dataset.bulkUser==='suspend'?'<p>این دلیل به صاحب حساب هم نمایش داده می‌شود؛ تعلیق گروهی تا رفع آن توسط مدیریت ادامه دارد.</p>':'')+'<label>دلیل عملیات<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید تعداد را با ارقام انگلیسی بنویس<input class="input" name="count" required inputmode="numeric"></label><div class="btnrow"><button class="btn btn-primary" type="submit">اجرای عملیات</button><button class="btn" type="button" data-cancel>انصراف</button></div><p role="status"></p></form>';document.body.append(dlg);let busy=false;
    dlg.querySelector('[data-cancel]').onclick=()=>dlg.close();dlg.oncancel=e=>{if(busy)e.preventDefault();};dlg.onclose=()=>dlg.remove();
    dlg.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;const form=e.target,status=form.querySelector('[role=status]');if(form.elements.count.value!==String(chosen.length)){status.textContent='تعداد را دقیق وارد کن';return;}busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);let ok=0;const failed=[];
      for(let i=0;i<chosen.length;i++){const r=chosen[i];try{if(product)await api('catalog/product',{ref:r.ref,data:{paused:button.dataset.bulkCatalog==='pause'},expected:{price:r.price,paused:r.paused,metadata:catalogData.policy.products?.[r.ref]||null},confirmation:r.ref,reason:form.elements.reason.value,requestId:requestIds[i]});else await api('users/'+r.id+'/actions',{action:button.dataset.bulkUser,reason:form.elements.reason.value,...(button.dataset.bulkUser==='suspend'?{publicReason:form.elements.reason.value,until:null}:{}),requestId:requestIds[i]});ok++;}catch(error){failed.push(recordKey(r)+': '+error.message);}status.textContent=fa(ok+failed.length)+' از '+fa(chosen.length);}
      busy=false;await load();status.textContent=fa(ok)+' موفق، '+fa(failed.length)+' ناموفق'+(failed.length?'\n'+failed.join('\n'):'');form.querySelector('[type=submit]').remove();form.querySelector('[data-cancel]').disabled=false;form.querySelector('[data-cancel]').textContent='بستن';
    };dlg.showModal();
  }
  function advancedFilters(){
    $('#search').placeholder='نام، شناسهٔ مدیریت یا تاریخ';$('#search').title=({users:'Rol-12 · نقش:ادمین · تاریخ:1405/07/24',payments:'peycard-12 · Rol-1 · درگاه:زیبال · وضعیت:موفق',transactions:'paywallet-12 · Rol-1 · جهت:کاهش',purchases:'Rol-1 · محصول:Tem-R-12',pages:'Page-12 · وضعیت:published',audit:'AdminLogs-12 · Rol-1',otp:'شماره · تاریخ:1405/07/24'})[section]||'';
    const select=(name,label,options)=>'<label>'+label+'<select class="select" data-list-filter="'+name+'">'+options.map(([value,text])=>'<option value="'+value+'">'+text+'</option>').join('')+'</select></label>';
    const field=(name,label,type='number')=>'<label>'+label+'<input class="input" type="'+type+'" data-list-filter="'+name+'" '+(type==='number'?'min="0" step="0.0005"':'')+'></label>';
    const common=select('pageSize','تعداد ردیف',[[10,'۱۰'],[25,'۲۵'],[50,'۵۰'],[100,'۱۰۰']])+select('sort','ترتیب',[['newest','جدیدترین'],['oldest','قدیمی‌ترین'],['name','نام'],['highest','بیشترین مبلغ/موجودی'],['lowest','کمترین مبلغ/موجودی']]);
    const financial=['users','payments','purchases','transactions'].includes(section),dated=section!=='pages';
    let html=common+(dated?field('after','از زمان','datetime-local')+field('before','تا زمان','datetime-local'):'')+(financial?field('min',section==='payments'?'حداقل تومان':'حداقل It')+field('max',section==='payments'?'حداکثر تومان':'حداکثر It'):'');
    if(section==='users')html+=select('role','نقش',[['','همه'],['owner','مالک'],['admin','ادمین'],['support','ساپورت'],['user','کاربر']])+select('verified','تأیید شماره',[['','همه'],['yes','تأییدشده'],['no','تأییدنشده']])+select('plan','اشتراک',[['','همه'],['paid','فعال'],['free','بدون اشتراک فعال'],['q','رخش'],['h','سیمرغ'],['y','هما']]);
    if(section==='payments')html+=select('provider','درگاه',[['','همه'],['zibal','زیبال'],['sep','سپ']]);
    if(section==='transactions')html+=select('direction','جهت اعتبار',[['','همه'],['credit','افزایش'],['debit','کاهش']]);
    if(section==='purchases')html+=field('ref','شناسهٔ محصول','search')+select('access','دسترسی',[['','همه'],['active','دارای تاریخ پایان و فعال'],['expired','پایان‌یافته'],['permanent','دائمی']]);
    if(['payments','transactions','purchases','audit'].includes(section))html+=select('archive','فهرست',[['','جاری'],['archived','بایگانی'],['all','همهٔ سوابق']]);
    $('#filters').insertAdjacentHTML('beforeend','<details class="advanced-filters"><summary>فیلترهای بیشتر</summary><div>'+html+'<button class="btn" type="button" data-reset-filters>پاک‌کردن فیلترها</button></div></details>');
    const saved=new URL(location.href).searchParams;document.querySelector('[data-list-filter=pageSize]').value=matchMedia('(max-width:760px)').matches?'10':'25';document.querySelectorAll('[data-list-filter]').forEach(el=>{const value=saved.get(el.dataset.listFilter);if(value===null)return;if(el.type==='datetime-local'){const date=new Date(Number(value));if(Number.isFinite(date.getTime()))el.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}else el.value=value;});
    for(const key of ['q','status','days'])if(saved.has(key))$('#'+({q:'search'}[key]||key)).value=saved.get(key);
    if([...saved.keys()].some(key=>document.querySelector('[data-list-filter="'+key.replace(/[^a-zA-Z]/g,'')+'"]'))) $('.advanced-filters').open=true;
  }
  function detailTabs(){
    const content=$('#content'),grid=content.querySelector('.admin-grid'),owner=content.querySelector('.owner-workspace');if(!grid)return;
    const panels=[...grid.children].map((node,i)=>({node,key:i?'pages':'account',label:i?'صفحه‌ها و محصولات':'حساب و دسترسی'}));if(owner)panels.push({node:owner,key:'owner',label:'کنترل پیشرفتهٔ مالک'});
    const tabs=document.createElement('div');tabs.className='tabs detail-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','بخش‌های حساب');content.prepend(tabs);
    for(const {node,key,label}of panels){node.id='detail-'+key;node.setAttribute('role','tabpanel');node.setAttribute('aria-labelledby','detail-tab-'+key);tabs.insertAdjacentHTML('beforeend','<button class="tab" role="tab" id="detail-tab-'+key+'" aria-controls="detail-'+key+'" data-detail-tab="'+key+'">'+label+'</button>');content.append(node);}grid.remove();const notice=content.querySelector(':scope>.notice');if(notice)content.append(notice);
    const choose=(key,focus=false)=>{if(!panels.some(x=>x.key===key))key='account';for(const x of panels){const button=tabs.querySelector('[data-detail-tab='+x.key+']');x.node.hidden=x.key!==key;button.setAttribute('aria-selected',String(x.key===key));button.tabIndex=x.key===key?0:-1;if(focus&&x.key===key)button.focus();}const url=new URL(location.href);url.searchParams.set('detailTab',key);history.replaceState(null,'',url);};
    choose(new URL(location.href).searchParams.get('detailTab'));tabs.addEventListener('click',e=>{const b=e.target.closest('[data-detail-tab]');if(b)choose(b.dataset.detailTab);});tabs.addEventListener('keydown',e=>{if(!['Home','End','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const buttons=[...tabs.children],index=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowLeft'?1:-1)+buttons.length)%buttons.length;choose(buttons[next].dataset.detailTab,true);});
  }
  function publication(v) {
    const p = parse(v) || {};
    return (
      "رزومه: " +
      (p.resume?.status === "published" ? "منتشرشده" : "پیش‌نویس") +
      " / لینک: " +
      (p.links?.status === "published" ? "منتشرشده" : "پیش‌نویس")
    );
  }
  function listContent(kind, data) {
    const configs = {
      users: [
        ["کاربر", "شماره", "وضعیت", "موجودی It", "تاریخ عضویت", "جزئیات"],
        (r) => [
          userLink(
            r.id,
            [r.first_name, r.last_name].filter(Boolean).join(" ") ||
              r.name ||
              "بدون نام",
          ),
          '<span class="ltr">' + esc(r.phone || "ورود اجتماعی") + "</span>",
          r.suspended
            ? badge(false, "تعلیق‌شده")
            : badge(true, r.is_admin ? "مدیر" : "فعال"),
          fa(Number(r.balance_units) / 2000),
          date(r.created_at),
          userLink(r.id),
        ],
      ],
      pages: [
        ["مالک", "جایگاه", "آدرس", "انتشار", "کنترل انتشار", "ویرایش"],
        (r) => [
          userLink(r.id, r.name),
          fa(r.slot||1),
          r.slug
            ? '<a class="ltr" href="https://' +
              (Number(r.slot)===3?'resumeit.ir/'+esc(r.slug):esc(r.slug)+'.resumeit.ir') +
              '" target="_blank" rel="noopener">' +
              (Number(r.slot)===3?'resumeit.ir/'+esc(r.slug):esc(r.slug)+'.resumeit.ir') + '</a>'
            : "بدون آدرس",
          esc(publication(r.pub)),
          badge(
            !r.publication_blocked && !r.suspended,
            r.suspended ? "حساب تعلیق‌شده" : r.publication_blocked ? "متوقف‌شده" : "مجاز",
          ),
          fa(r.revision),
        ],
      ],
      transactions: [
        ["مالک", "عنوان", "تغییر It", "موجودی پس از تراکنش", "زمان"],
        (r) => [
          userLink(r.user_id, r.name || r.phone),
          esc(r.label),
          fa(Number(r.delta_units) / 2000),
          fa(Number(r.balance_units) / 2000),
          date(r.created_at),
        ],
      ],
      purchases: [
        ["مالک", "محصول", "قیمت It", "نوع دسترسی", "زمان خرید"],
        (r) => [
          userLink(r.user_id, r.name || r.phone),
          esc(r.ref),
          fa(Number(r.price_units) / 2000),
          r.expires_at ? "اشتراک تا " + date(r.expires_at) : "خرید یک‌باره",
          date(r.created_at),
        ],
      ],
      payments: [
        ["مالک", "درگاه", "مبلغ تومان", "وضعیت", "شماره مرجع", "رهگیری", "بررسی‌ها", "آخرین خطا", "زمان"],
        r => [r.user_id?userLink(r.user_id,r.name||r.phone):'حساب حذف‌شده',r.provider==='sep'?'سپ':'زیبال',fa(r.amount_toman),esc(({creating:'آماده‌سازی',pending:'تأیید نشده',verifying:'در حال تأیید',paid:'شارژ انجام شد',review:'نیاز به بررسی',failed:'ناموفق',reversed:'برگشت به کارت',cancelled:'انصراف',expired:'مهلت تمام‌شده'})[r.status]||r.status),esc(r.rrn||'—'),esc(r.trace||'—'),fa(r.attempts),esc(r.last_error||'—'),date(r.created_at)],
      ],
      otp: [
        ["شماره", "کاربرد", "نتیجهٔ ارسال", "زمان درخواست", "تأیید کد"],
        (r) => [
          '<span class="ltr">' + esc(r.phone) + "</span>",
          esc(statuses[r.purpose] || r.purpose),
          badge(r.status === "accepted", statuses[r.status] || r.status),
          date(r.created_at),
          date(r.verified_at),
        ],
      ],
      audit: [
        ["مدیر", "عملیات", "حساب هدف", "دلیل", "زمان"],
        (r) => [
          esc(r.name || r.actor_id),
          esc(actionNames[r.action] || r.action),
          userLink(r.target_id),
          esc(r.reason),
          date(r.created_at),
        ],
      ],
    };
    const otpSummary =
      kind === "otp" && data.stats
        ? '<div class="overview-kpis">' +
          [
            ["accepted", "پذیرفته‌شده"],
            ["failed", "ناموفق"],
            ["pending", "در انتظار نتیجه"],
            ["verified", "کد تأییدشده"],
          ]
            .map(
              ([key, label]) =>
                '<div class="kpi"><span>' +
                label +
                "</span><strong>" +
                fa(data.stats[key]) +
                "</strong><small>با فیلتر انتخاب‌شده</small></div>",
            )
            .join("") +
          '</div><p class="notice">ثبت ماندگار از نسخهٔ ۲۱ شروع شده است. کد پیامک ذخیره یا نمایش داده نمی‌شود و پذیرش سرویس، تحویل به گوشی را اثبات نمی‌کند.</p>'
        : "";
    const [headers, mapper] = configs[kind];
    return (
      otpSummary + salesSummary(data.sales)+
      '<section class="panel">' +
      (!data.rows.length
        ? '<div class="empty">موردی با این فیلتر پیدا نشد. بازه یا عبارت جست‌وجو را تغییر دهید.</div>'
        : '<div class="bulk-tools"><label><input type="checkbox" class="checkbox" data-select-page>انتخاب این صفحه</label><button type="button" class="btn" data-export-selected>خروجی منتخب</button><button type="button" class="btn" data-copy-selected>کپی شناسه‌ها</button>'+(kind==='users'?'<button type="button" class="btn" data-bulk-user="suspend">تعلیق منتخب</button><button type="button" class="btn" data-bulk-user="restore">رفع تعلیق</button><button type="button" class="btn" data-bulk-user="revoke-sessions">خروج نشست‌ها</button>':'')+'<span role="status" data-bulk-status></span></div>'+table(['انتخاب',kind==='otp'||kind==='purchases'?'شناسه':'شناسهٔ مدیریت',...headers,...(['payments','transactions','purchases'].includes(kind)?['سند']:[])], data.rows.map((r,index)=>['<input class="checkbox" type="checkbox" data-record-key="'+esc(recordKey(r,kind))+'" aria-label="انتخاب '+esc(recordKey(r,kind))+'">',recordId(recordKey(r,kind),r.admin_code||recordKey(r,kind)),...mapper(r),...(['payments','transactions','purchases'].includes(kind)?['<button type="button" class="btn" data-admin-receipt="'+index+'">رسید</button>']:[])]))) +
      '<div class="pager"><span>' +
      fa(data.total) +
      " مورد · صفحهٔ " +
      fa(data.page) +
      " از " +
      fa(Math.max(1, Math.ceil(data.total / data.pageSize))) +
      '</span><div><button class="btn" id="prev" ' +
      (page === 1 ? "disabled" : "") +
      '>قبلی</button><button class="btn" id="next" ' +
      (page * data.pageSize >= data.total ? "disabled" : "") +
      ">بعدی</button></div></div></section>"
    );
  }
  function detail(d) {
    const u = d.user;
    detailUser=u;
    return (
      '<div class="admin-grid"><section class="panel"><h2>' +
      esc(
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
          u.name ||
          "حساب بدون نام",
      ) +
      "</h2>" +
      summary([
        ["شناسهٔ مدیریت",recordId(u.id,u.admin_code||u.id)],
        ["شماره", '<span class="ltr">' + esc(u.phone || "—") + "</span>"],
        ["تأیید شماره", badge(u.phone_verified)],
        ["نقش", roleNames[u.account_role] || (u.is_owner ? roleNames.owner : u.is_admin ? roleNames.admin : u.is_support ? roleNames.support : roleNames.user)],
        ["وضعیت", badge(!u.suspended, u.suspended ? "تعلیق‌شده" : "فعال")],
        ...(d.restriction?[["دلیل اعلام‌شده",esc(d.restriction.reason)],["پایان تعلیق",d.restriction.until?date(d.restriction.until):'تا رفع محدودیت توسط مدیریت'],["مدیر ثبت‌کننده",esc(d.restriction.actorCode)]]:[]),
        ["تاریخ عضویت", date(u.created_at)],
        ["موجودی", fa(Number(d.balance_units) / 2000) + " It"],
        ["نشست‌های فعال", fa(d.sessions.total)],
        [
          "ورود اجتماعی",
          esc(d.social.map((x) => x.provider).join("، ") || "ندارد"),
        ],
      ]) +
      '<div class="detail-actions">' +
      [
        ["credit", "شارژ کیف پول"],
        ["revoke-sessions", "خروج نشست‌ها"],
        ...(!u.is_admin
          ? [
              ['edit-profile','ویرایش مشخصات'],
              ['delete-account','حذف دائمی حساب'],
              [
                u.suspended ? "restore" : "suspend",
                u.suspended ? "رفع تعلیق" : "تعلیق حساب",
              ],
              [
                u.publication_blocked
                  ? "unblock-publication"
                  : "block-publication",
                u.publication_blocked ? "اجازهٔ انتشار" : "توقف انتشار",
              ],
            ]
          : []),
      ]
        .map(
          ([action, label]) =>
            '<button class="btn detail-act detail-act--' + ({credit:'go','revoke-sessions':'soft','edit-profile':'soft',restore:'ok','unblock-publication':'ok'}[action] || 'risk') + (action === "credit" ? " btn-primary" : "") +
            '" data-action="' +
            action +
            '" data-user="' +
            esc(u.id) +
            '">' + icon({credit:'plus','revoke-sessions':'logout','edit-profile':'edit','delete-account':'trash',suspend:'lock',restore:'check','block-publication':'eye',  'unblock-publication':'globe'}[action] || 'info') +
            label +
            "</button>",
        )
        .join("") +
      '</div>' + (!u.is_admin?'<form id="support-role-form" class="staff-role-form"><h3>نقش ساپورت</h3><p>فقط پاسخ‌گویی به تیکت‌ها؛ بدون دسترسی به مدیریت، پرداخت‌ها، OTP یا تغییر حساب کاربران.</p><label class="admin-channel-row"><span>دسترسی پنل پشتیبانی</span><input type="checkbox" class="toggle" name="enabled" '+(u.is_support?'checked':'')+'></label><label>دلیل تغییر<input class="input" name="reason" required minlength="5" maxlength="500"></label><button class="btn" type="submit">ذخیرهٔ نقش ساپورت</button><p role="status"></p></form>':'')+'</section><section class="panel"><h2>صفحه و دسترسی‌های کاربر</h2>' +
      summary([
        ["آدرس", esc(d.document?.slug || "انتخاب نشده")],
        [
          "وضعیت انتشار",
          esc(d.document ? publication(d.document.pub) : "صفحه ساخته نشده"),
        ],
        ["قالب رزومه", esc(d.document?.template || "—")],
        ["تعداد دسترسی‌ها", fa(d.access.length)],
      ]) +
      (d.documents?.length?table(['جایگاه','آدرس','وضعیت ثبت‌شده'],d.documents.map(doc=>[fa(doc.slot),esc(doc.slug||'انتخاب نشده'),esc(publication(doc.pub))])):'')+
      (d.access.length
        ? table(
            ["محصول", "پایان دسترسی"],
            d.access.map((a) => [esc(a.ref), date(a.expires_at) || "دائمی"]),
          )
        : "") +
      '</section></div><p class="notice">تغییرات مدیریتی به همراه دلیل ثبت می‌شوند. تعلیق، نشست‌ها را می‌بندد و نمایش عمومی را متوقف می‌کند؛ محتوای کاربر حذف نمی‌شود.</p>'
    );
  }
  function catalog(d) {
    catalogData=d;const group=$('#catalog-kind').value,items=group==='plans'?Object.values(d.plans):d[group],kind=({templates:'rt',linkTemplates:'lt',fonts:'font',palettes:'pal',plans:'subscription'})[group];
    return '<div class="tabs detail-tabs catalog-tabs" role="tablist" aria-label="دستهٔ محصولات">'+[['templates','رزومه'],['linkTemplates','لینک'],['fonts','فونت'],['palettes','رنگ'],['plans','اشتراک']].map(([id,label])=>'<button class="tab" type="button" role="tab" data-catalog-group="'+id+'" aria-selected="'+(group===id&&catalogView==='products')+'">'+label+'</button>').join('')+(fullAdmin?'<button class="tab" type="button" role="tab" data-catalog-settings aria-selected="'+(catalogView==='settings')+'">نرخ It و محدودیت‌ها</button>':'')+'</div><section class="catalog-products">'+salesSummary(d.sales)+'<div class="catalog-filters"><label>جست‌وجوی محصول<input class="input" type="search" data-catalog-search placeholder="نام، توضیح یا شناسه"></label><label>فروش<select class="select" data-catalog-status><option value="">همه</option><option value="active">فعال</option><option value="paused">متوقف</option><option value="free">رایگان</option><option value="paid">پولی</option></select></label><label>ترتیب<select class="select" data-catalog-sort><option value="recent">آخرین ویرایش</option><option value="name">نام</option><option value="cheap">ارزان‌ترین It</option><option value="expensive">گران‌ترین It</option><option value="sales">پرفروش سی‌روزه</option></select></label></div><div data-catalog-results>'+table(['محصول','شناسه','قیمت It','فروش ۳۰ روز / کل','وضعیت فروش',...(fullAdmin?['ویرایش']:[])],items.map(x=>{const ref=kind+':'+x.id,sale=d.sales?.products.find(p=>p.ref===ref);return ['<b>'+esc(x.name)+'</b><p class="catalog-description">'+esc(x.desc||x.description||'')+'</p>',recordId(ref,x.admin_code||ref),x.price?fa(x.price/2000)+' It<br><small>'+fa(Math.round(x.price*d.rate/2000))+' تومان</small>':'رایگان',fa(sale?.month||0)+' / '+fa(sale?.total||0),fullAdmin&&x.price?'<label class="admin-channel-row catalog-toggle"><span>'+(x.paused?'متوقف':'فعال')+'</span><input class="toggle" type="checkbox" data-catalog-toggle="'+ref+'" '+(!x.paused?'checked':'')+' aria-label="فروش '+esc(x.name)+'"></label>':x.paused?'متوقف':x.price?'فعال':'رایگان',...(fullAdmin?['<div class="btnrow"><button class="btn" type="button" data-catalog-edit="'+ref+'" data-edit-mode="metadata">ویرایش مشخصات</button>'+(x.price?'<button class="btn" type="button" data-catalog-edit="'+ref+'" data-edit-mode="price">ویرایش قیمت</button>':'')+'</div>']:[])];}))+'</div><p class="notice">نرخ تومان به It یک تنظیم سراسری است؛ قیمت هر محصول به It مستقل است. رسیدهای قبلی تغییر نمی‌کنند.</p></section>';
  }
  function catalogState(){
    if(section!=='catalog')return;const products=$('.catalog-products');products.hidden=catalogView==='settings';const owner=$('#content>.owner-workspace');if(owner)owner.hidden=catalogView!=='settings';
    if(!products.querySelector('[data-catalog-size]')){
      const results=$('[data-catalog-results]');results.insertAdjacentHTML('beforebegin','<div class="bulk-tools"><label><input type="checkbox" class="checkbox" data-select-page>انتخاب این صفحه</label><button type="button" class="btn" data-export-selected>خروجی منتخب</button><button type="button" class="btn" data-copy-selected>کپی شناسه‌ها</button>'+(fullAdmin?'<button type="button" class="btn" data-bulk-catalog="pause">توقف فروش منتخب پولی</button><button type="button" class="btn" data-bulk-catalog="resume">ادامهٔ فروش منتخب پولی</button>':'')+'<span role="status" data-bulk-status></span></div>');
      results.querySelector('thead tr').insertAdjacentHTML('afterbegin','<th>انتخاب</th>');results.querySelectorAll('tbody tr').forEach(row=>row.insertAdjacentHTML('afterbegin','<td><input class="checkbox" type="checkbox" data-record-key="'+esc(row.querySelector('[data-record-id]').dataset.recordId)+'" aria-label="انتخاب محصول"></td>'));
      products.insertAdjacentHTML('beforeend','<nav class="pager"><span data-catalog-count></span><label>تعداد ردیف<select class="select" data-catalog-size><option value="8">۸</option><option value="16">۱۶</option><option value="32">۳۲</option></select></label><div><button class="btn" type="button" data-catalog-page="-1">قبلی</button><button class="btn" type="button" data-catalog-page="1">بعدی</button></div></nav>');
    }filterCatalog();
  }
  function filterCatalog(){
    const normalize=v=>String(v||'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g,(_,y,m,d)=>y+'/'+Number(m)+'/'+Number(d)).toLocaleLowerCase('fa'),q=normalize($('[data-catalog-search]').value).trim().split(/\s+/).filter(Boolean),status=$('[data-catalog-status]').value,sort=$('[data-catalog-sort]').value,group=$('#catalog-kind').value,items=group==='plans'?Object.values(catalogData.plans):catalogData[group],list=[...$('[data-catalog-results] tbody').rows],byRef=new Map(items.map(x=>[x.ref,x])),item=row=>byRef.get(row.querySelector('[data-record-id]').dataset.recordId);
    const matched=list.filter(row=>{const x=item(row);return q.every(word=>{const feature=/^(حداقل|min|حداکثر|max):(\d+)$/.exec(word);if(feature)return ['min','حداقل'].includes(feature[1])?x.price/2000>=Number(feature[2]):x.price/2000<=Number(feature[2]);const state=/^(وضعیت|status):(.+)$/.exec(word);if(state)return ({active:!x.paused,'فعال':!x.paused,paused:x.paused,'متوقف':x.paused,free:!x.price,'رایگان':!x.price,paid:!!x.price,'پولی':!!x.price})[state[2]]===true;return normalize(row.textContent+' '+x.ref+' '+(x.updated_at?new Date(x.updated_at).toLocaleDateString('fa-IR')+' '+new Date(x.updated_at).toISOString().slice(0,10):'')).includes(word.replace(/^(تاریخ|date|نام|name|شناسه|id):/,''));})&&(!status||status==='free'&&!x.price||status==='paid'&&!!x.price||status==='paused'&&x.paused||status==='active'&&!x.paused);});
    matched.sort((a,b)=>{const x=item(a),y=item(b);return sort==='name'?x.name.localeCompare(y.name,'fa'):sort==='cheap'?x.price-y.price:sort==='expensive'?y.price-x.price:sort==='sales'?Number(catalogData.sales?.products.find(p=>p.ref===y.ref)?.month||0)-Number(catalogData.sales?.products.find(p=>p.ref===x.ref)?.month||0):Number(y.updated_at||0)-Number(x.updated_at||0);});
    const size=Number($('[data-catalog-size]').value),pages=Math.max(1,Math.ceil(matched.length/size));catalogPage=Math.max(1,Math.min(catalogPage,pages));const visible=new Set(matched.slice((catalogPage-1)*size,catalogPage*size));for(const row of list)row.hidden=!visible.has(row);for(const row of matched)row.parentElement.append(row);
    $('[data-catalog-count]').textContent=fa(matched.length)+' محصول · صفحهٔ '+fa(catalogPage)+' از '+fa(pages);$('[data-catalog-page="-1"]').disabled=catalogPage===1;$('[data-catalog-page="1"]').disabled=catalogPage===pages;
  }
  function productDialog(ref,mode,paused){const item=[...catalogData.templates,...catalogData.linkTemplates,...catalogData.fonts,...catalogData.palettes,...Object.values(catalogData.plans)].find(x=>x.ref===ref);if(!item)return;const policy=catalogData.policy,expected={price:item.price,paused:item.paused,metadata:policy.products?.[ref]||null},dialog=document.createElement('dialog');dialog.className='batch-dialog';dialog.innerHTML='<form><h2>'+esc(mode==='price'?'ویرایش قیمت':mode==='toggle'?'تغییر وضعیت فروش':'ویرایش مشخصات')+' · '+esc(item.name)+'</h2><p dir="ltr">'+esc(item.admin_code||ref)+'</p>'+(mode==='price'?'<label>قیمت It<input class="input" name="price" type="number" min="1" max="50000" step="1" value="'+item.price/2000+'" required></label>':mode==='metadata'?'<label>نام<input class="input" name="name" maxlength="80" value="'+esc(item.name)+'" required></label><label>توضیح<textarea class="textarea" name="desc" maxlength="500">'+esc(item.desc||item.description||'')+'</textarea></label>':'<p>'+(paused?'شروع خرید جدید متوقف می‌شود؛ خریدهای قبلی حفظ می‌شوند.':'فروش دوباره فعال می‌شود.')+'</p>')+'<label>دلیل<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید شناسهٔ محصول را وارد کن<input class="input" name="confirmation" required autocomplete="off"></label><div class="btnrow"><button class="btn btn-primary" type="submit">ثبت تغییر</button><button class="btn" type="button" data-cancel>انصراف</button></div><p role="status"></p></form>';document.body.append(dialog);let requestId=crypto.randomUUID(),busy=false;dialog.addEventListener('input',()=>{if(!busy)requestId=crypto.randomUUID();});dialog.onclose=()=>dialog.remove();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.target,status=form.querySelector('[role=status]'),token=loadToken,controls=[...form.elements].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);status.textContent='در حال ثبت…';try{const data=mode==='price'?{price:Number(form.elements.price.value)*2000}:mode==='metadata'?{name:form.elements.name.value,desc:form.elements.desc.value}:{paused};await api('catalog/product',{ref,data,expected,reason:form.elements.reason.value,confirmation:form.elements.confirmation.value===item.admin_code?ref:form.elements.confirmation.value,requestId});if(dialog.isConnected&&token===loadToken)await load();dialog.close();}catch(error){if(dialog.isConnected)status.textContent=error.message;}finally{busy=false;controls.forEach(el=>el.disabled=false);}};dialog.showModal();}
  function health(d) {
    const channels=d.notificationChannels;
    return (
      (d.paymentPolicy?'<section class="panel"><h2>شروع پرداخت بانکی</h2><form id="admin-payment-gateways">'+[['sep','سپ'],['zibal','زیبال']].map(([id,label])=>'<label class="admin-channel-row"><span><b>'+label+'</b><small>'+(d.gateways?.find(g=>g.id===id)?.enabled?'اطلاعات پذیرندگی تنظیم شده':'اطلاعات پذیرندگی در میزبان تنظیم نشده')+'</small></span><input class="toggle" type="checkbox" name="'+id+'" '+(d.paymentPolicy[id]?'checked':'')+' aria-label="اجازهٔ پرداخت جدید با '+label+'"></label>').join('')+'<p>توقف درگاه فقط شروع پرداخت تازه را می‌بندد؛ تأیید و پیگیری پرداخت‌های قبلی ادامه دارد.</p><button class="btn" type="submit">ذخیرهٔ درگاه‌ها</button><p role="status"></p></form></section>':'')+
      (channels?'<section class="panel"><h2>کانال‌های اعلان سایت</h2><p>این کلیدها اجازهٔ سراسری ارسال‌اند؛ دریافت هر کاربر به انتخاب خودش هم وابسته است. پیامک ورود و بازیابی رمز مستقل باقی می‌ماند.</p><form id="admin-notification-channels">'+[['email','ایمیل'],['sms','پیامک اعلان'],['push','پوش مرورگر']].map(([id,label])=>'<label class="admin-channel-row"><span><b>'+label+'</b><small>'+(channels.configured[id]?'پیکربندی سرویس موجود است':'نیازمند پیکربندی امن سرویس')+'</small></span><input class="toggle" type="checkbox" name="'+id+'" '+(channels.enabled[id]?'checked':'')+' aria-label="اجازهٔ سراسری '+label+'"></label>').join('')+'<p>خاموش‌کردن، ارسال‌های بعدی را متوقف می‌کند؛ پیام در حال ارسال قابل پس‌گرفتن نیست. ترجیحات کاربران حفظ می‌شود.</p><button class="btn btn-primary" type="submit">ذخیرهٔ کانال‌های سایت</button><p role="status" data-admin-channel-status></p></form></section>':'')+
      '<div class="admin-grid"><section class="panel"><h2>سرویس‌های فعال</h2>' +
      summary([
        ["پایگاه داده", badge(true, d.database)],
        [
          "پیامک SMS.ir",
          badge(
            d.smsConfigured,
            d.smsConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        [
          "ورود گوگل",
          badge(
            d.googleConfigured,
            d.googleConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        [
          "ورود گیت‌هاب",
          badge(
            d.githubConfigured,
            d.githubConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        ["درگاه سپ", d.gateways?.find(g=>g.id==='sep')?.enabled?"فعال در تنظیمات؛ نیازمند تأیید اتصال واقعی":"در انتظار فعال‌سازی"],
        ["درگاه زیبال", d.gateways?.find(g=>g.id==='zibal')?.enabled?"فعال در تنظیمات؛ نیازمند تأیید اتصال واقعی":"در انتظار فعال‌سازی"],
        ["دامنه", esc(d.origin)],
      ]) +
      '</section><section class="panel"><h2>نسخه و محدودیت‌ها</h2>' +
      summary([
        ["نسخه", '<span class="ltr">' + esc(d.displayVersion||d.version) + "</span>"],
        ["زمان فعالیت سرور", fa(Math.floor(d.uptime / 60000)) + " دقیقه"],
        ["سقف روزانهٔ OTP", fa(d.limits.otpDaily)],
        ["سقف روزانهٔ هر شماره", fa(d.limits.phoneDaily)],
        ["فاصلهٔ ارسال مجدد", fa(d.limits.resendSeconds) + " ثانیه"],
        ["اعتبار کد", fa(d.limits.otpSeconds) + " ثانیه"],
      ]) +
      '</section></div><p class="notice">پیکربندی‌شده بودن، سلامت لحظه‌ای سرویس یا تحویل پیامک را تضمین نمی‌کند. کلیدها و رمزهای سرویس‌ها در این پنل نمایش داده نمی‌شوند.</p>'
    );
  }
  async function load() {
    const token = ++loadToken;
    $("#content").setAttribute("aria-busy", "true");
    $("#content").innerHTML =
      '<div class="loading" role="status">در حال دریافت اطلاعات…</div>';
    $("#export").disabled = true;
    try {
      const detailId = new URL(location.href).searchParams.get("user");
      let route = section === "traffic" ? "overview" : section;
      if (section === "users" && detailId) {
        if (!/^[a-f0-9-]{36}$/.test(detailId))
          throw new Error("شناسهٔ حساب معتبر نیست");
        route = "users/" + detailId;
      }
      const params = new URLSearchParams({
          page,
          days: $("#days").value,
          q: $("#search").value,
          status: $("#status").value,
        });
      document.querySelectorAll('[data-list-filter]').forEach(el=>{if(el.value)params.set(el.dataset.listFilter,el.type==='datetime-local'?String(new Date(el.value).getTime()):el.value);});
      if(section==='retention')params.set('before',String(retentionBefore));
      if(!detailId&&document.querySelector('[data-list-filter]')){const url=new URL(location.href);url.search=params.toString();history.replaceState(null,'',url);}
      const d = await api(route + "?" + params);
      if (token !== loadToken) return;
      rows = section==='catalog'?($('#catalog-kind').value==='plans'?Object.values(d.plans):d[$('#catalog-kind').value]):d.rows || [];
      total = d.total || 0;
      $("#content").innerHTML =
        section === "overview"
          ? overview(d)
          : section === "traffic"
            ? '<section class="panel"><h2>روند بازدید صفحات</h2>' +
              chart(d.traffic) +
              table(
                ["تاریخ", "نوع", "تعداد"],
                d.traffic.map((r) => [
                  new Date(Number(r.day) * 86400000).toLocaleDateString(
                    "fa-IR",
                  ),
                  esc(r.event),
                  fa(r.total),
                ]),
              ) +
              "</section>"
            : section === "catalog"
              ? catalog(d)
              : section==='assistant'?window.ownerAssistant(d):section==='retention'?retention(d):section === "health"
                ? health(d)
                : detailId && section === "users"
                  ? detail(d)
                  : listContent(section, d);
      permissions(d,detailId);
      if(fullAdmin&&detailId&&section==='users')$('#content').insertAdjacentHTML('beforeend',window.ownerUserControls(d));
      if(detailId&&section==='users')detailTabs();
      if(fullAdmin&&section==='catalog'&&d.policy)$('#content').insertAdjacentHTML('beforeend',window.ownerCommerceControls(d));
      catalogState();
      document.querySelectorAll('.owner-product-row').forEach(row=>{if(!row.querySelector('[data-owner-price]'))row.querySelector('[data-owner-paused]').disabled=true;});
      $("#updated").textContent = "آخرین دریافت: " + date(Date.now());
      $("#export").disabled = !rows.length;
    } catch (e) {
      if (token === loadToken)
        $("#content").innerHTML =
          '<div class="notice error" role="alert">' +
          esc(e.message) +
          ' <button class="btn" id="retry">تلاش دوباره</button></div>';
    } finally {
      if (token === loadToken) {
        $("#content").removeAttribute("aria-busy");
        if($("#refresh"))$("#refresh").disabled = false;
      }
    }
  }
  function permissions(data,detailId){
    if(!fullAdmin){
      document.querySelectorAll('[data-action="credit"],[data-action="delete-account"]').forEach(button=>button.remove());
      for(const id of ['admin-payment-gateways','admin-notification-channels']){const form=document.getElementById(id);if(form){const notice=document.createElement('p');notice.className='notice';notice.textContent='تغییر تنظیمات سراسری این بخش فقط برای مالک سایت مجاز است.';form.replaceWith(notice);}}
      return;
    }
    if(section==='users'&&detailId){
      $('#support-role-form')?.remove();
      const role=detailUser.account_role||(detailUser.is_admin?'admin':detailUser.is_support?'support':'user');
      if(detailId===ownerId)return;
      $('#content .detail-actions').insertAdjacentHTML('afterend','<form id="account-role-form" class="staff-role-form"><h3>نقش حساب</h3><p>مالک می‌تواند تنظیمات حساس و نقش مدیرها را تغییر دهد. ادمین به کنترل‌های سراسری سرویس‌ها و پاک‌کردن لاگ‌ها دسترسی ندارد.</p><label>سطح دسترسی<select class="select" name="role">'+Object.entries(roleNames).map(([id,label])=>'<option value="'+id+'" '+(role===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>دلیل تغییر<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید، نام نقش انتخاب‌شده را بنویس<input class="input" name="confirmation" required autocomplete="off" placeholder="'+esc(roleNames[role])+'"></label><label>رمز فعلی حساب خودت<input class="input" name="password" type="password" autocomplete="current-password" maxlength="128"><small>اگر حسابت رمز ندارد خالی بگذار.</small></label><button class="btn" type="submit">ذخیرهٔ نقش حساب</button><p role="status"></p></form>');
    }
    if(section==='audit')$('#content').insertAdjacentHTML('afterbegin','<section class="panel audit-purge"><h2>بایگانی گزارش‌های مدیریتی</h2><p>گزارش‌ها از فهرست جاری کنار می‌روند؛ سند اصلی و رسید عملیات برای پیگیری حفظ می‌شوند. هر نوبت حداکثر ۲۰۰ گزارش بایگانی می‌شود. <a href="/admin/retention/">نگهداری و بازگردانی سوابق</a></p><form id="audit-purge-form" class="staff-role-form"><label>بازهٔ بایگانی<select class="select" name="range"><option value="90">قدیمی‌تر از ۹۰ روز</option><option value="30">قدیمی‌تر از ۳۰ روز</option><option value="7">قدیمی‌تر از ۷ روز</option><option value="0">تمام لاگ‌ها تا همین لحظه</option></select></label><label>دلیل بایگانی<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید بنویس: بایگانی لاگ‌ها<input class="input" name="confirmation" required autocomplete="off"></label><button class="btn" type="submit">بایگانی گزارش‌های این بازه</button><p role="status"></p></form></section>');
  }
  function actionDialog(id, action) {
    $('#reason').closest('label').firstChild.textContent=['suspend','delete-account'].includes(action)?'یادداشت داخلی مدیر':'دلیل عملیات';
    $('#restriction-fields')?.remove();if(['suspend','delete-account'].includes(action))$('#action-error').insertAdjacentHTML('beforebegin','<fieldset id="restriction-fields"><legend>اطلاع به صاحب حساب</legend><label>دلیل قابل نمایش به کاربر<textarea class="textarea" id="public-reason" required minlength="5" maxlength="1000"></textarea></label>'+(action==='suspend'?'<label>پایان تعلیق<input class="input" id="suspend-until" type="datetime-local"></label><small>خالی بماند: تا بررسی و رفع محدودیت توسط مدیریت.</small>':'<p>این توضیح و شناسهٔ مدیر، پس از تأیید هویت به صاحب حساب نشان داده می‌شوند.</p>')+'</fieldset>');
    $('#owner-password-field')?.remove();if(['credit','delete-account'].includes(action))$('#action-error').insertAdjacentHTML('beforebegin','<label id="owner-password-field">رمز فعلی حساب خودت<input class="input" id="owner-password" type="password" autocomplete="current-password" maxlength="128"><small>برای عملیات مالی و حذف دائمی، رمز دوباره بررسی می‌شود. اگر حسابت رمز ندارد خالی بگذار.</small></label>');
    const dlg = $("#action-dialog");
    $("#action-title").textContent = actionNames[action];
    $("#action-explain").textContent =
      action==='delete-account'?'حذف برگشت‌ناپذیر است: صفحات، نشست‌ها، تیکت‌ها و کیف پول حذف می‌شوند. رسیدهای بانکی برای پیگیری بدون حساب نگه داشته می‌شوند. تأیید: '+(detailUser.phone||id):"این عملیات روی حساب انتخاب‌شده انجام می‌شود و در سابقهٔ مدیریت باقی می‌ماند.";
    $('#profile-fields').hidden=action!=='edit-profile';
    $('#delete-field').hidden=action!=='delete-account';
    $('#delete-confirm').required=action==='delete-account';$('#delete-confirm').value='';
    for(const [field,key] of [['first','first_name'],['last','last_name'],['role','role'],['bio','bio']])$('#edit-'+field).value=detailUser?.[key]||'';
    $('#edit-first').required=$('#edit-last').required=action==='edit-profile';
    $("#amount-field").hidden = action !== "credit";
    $("#amount").required = action === "credit";
    $("#action-error").textContent = "";
    $("#reason").value = "";
    $("#amount").value = "";
    let requestId = crypto.randomUUID().replace(/-/g, "");
    let pending = false;
    $("#action-form").oninput=()=>{if(!pending)requestId=crypto.randomUUID().replace(/-/g, "");};
    $("#action-form").onsubmit = async (e) => {
      e.preventDefault();
      if (pending) return;
      pending = true;
      const token=loadToken,controls=[...e.target.elements].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);
      try {
        const reason = $("#reason").value.trim(),
          toman = Number($("#amount").value);
        await api("users/" + id + "/actions", {
          action,
          reason,
          requestId,
          ...(action === "credit" ? { toman } : {}),
          ...(action==='edit-profile'?{profile:Object.fromEntries([['first','first_name'],['last','last_name'],['role','role'],['bio','bio']].map(([field,key])=>[key,$('#edit-'+field).value]))}:{}),
          ...(action==='delete-account'?{confirmation:$('#delete-confirm').value}:{}),
          ...(['credit','delete-account'].includes(action)?{password:$('#owner-password').value}:{}),
          ...(['suspend','delete-account'].includes(action)?{publicReason:$('#public-reason').value,...(action==='suspend'?{until:$('#suspend-until').value?new Date($('#suspend-until').value).getTime():null}:{})}:{}),
        });
        dlg.close();
        if(token===loadToken){if(action==='delete-account')history.replaceState(null,'','/admin/users/');await load();}
      } catch (error) {
        $("#action-error").textContent = error.message;
      } finally {
        pending = false;
        controls.forEach(el=>el.disabled=false);
      }
    };
    dlg.oncancel = (e) => {
      if (pending) e.preventDefault();
    };
    $("#action-cancel").onclick = () => dlg.close();
    dlg.showModal();
  }
  function exportCsv(selected=rows) {
    if(!Array.isArray(selected))selected=rows;
    const keys = Object.keys(selected[0] || {}),
      cell = (v) =>
        '"' +
        String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
          .replace(/^[\s]*[=+@\-\t\r]/, "'$&")
          .replace(/"/g, '""') +
        '"',
      csv =
        "\uFEFF" +
        [keys, ...selected.map((r) => keys.map((k) => r[k]))]
          .map((row) => row.map(cell).join(","))
          .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "resumeit-" + section + "-page-" + page + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function boot() {
    window.bindOwnerControls(api,load,()=>ownerId);
    const response = await fetch("/api/auth/session", { cache: "no-store" }),
      { user } = await response.json();
    if (!user) {
      location.replace("/login/");
      return;
    }
    if (!user.is_admin) {
      location.replace("/dashboard/");
      return;
    }
    ownerId=user.id;
    fullAdmin=!!user.is_owner;
    const info = sections[section];
    $("#page-title").textContent = info[0];
    $("#page-desc").textContent = info[2];
    $("#section-title").textContent = info[0];
    $("#admin-name").textContent =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      "مدیر ResumeIt";
    const groups=[['دید کلی','chart',['overview','traffic']],['کاربران و صفحات','user',['users','pages']],['امور مالی','card',['payments','transactions','purchases']],['محصولات','palette',['catalog',...(fullAdmin?['assistant']:[])]],['امنیت و سرویس‌ها','shield',['health','otp','audit',...(fullAdmin?['retention']:[])]]],active=groups.find(g=>g[2].includes(section));
    const href=id=>id==='overview'?'/admin/':'/admin/'+id+'/';
    $("#admin-nav").innerHTML='<ul class="menu">'+groups.map(([label,symbol,ids])=>'<li><a title="'+label+'" href="'+href(ids.includes(section)?section:ids[0])+'" '+(ids.includes(section)?'aria-current="page"':'')+'>'+icon(symbol)+'<span>'+label+'</span></a></li>').join('')+'<li><a href="/staff/" title="پنل پشتیبانی">'+icon('help')+'<span>پشتیبانی و تیکت‌ها</span></a></li><li><a href="/staff/?escalated=1" title="تیکت‌هایی که پشتیبانی به مدیر ارجاع داده">'+icon('shield')+'<span>ارجاع‌های پشتیبانی</span></a></li></ul>';
    $("#admin-menu").innerHTML = icon("menu");
    const topnav=document.createElement('nav');topnav.className='admin-topnav';topnav.setAttribute('aria-label','دسترسی سریع مدیریت');topnav.append($('#admin-menu'));
    for(const id of active[2]){const a=document.createElement('a');a.href=href(id);a.innerHTML=icon(sections[id][1])+'<span>'+sections[id][0]+'</span>';if(id===section)a.setAttribute('aria-current','page');topnav.append(a);}
    $('.admin-head').after(topnav);$('#admin-menu').setAttribute('aria-controls','admin-side');$('#admin-menu').title='باز و بسته کردن منوی مدیریت';
    $('#admin-close').innerHTML=icon('x');
    $('.admin-payment').remove();$('#refresh').remove();
    const footer=$('.admin-side footer'),name=$('#admin-name'),logout=$('#logout'),profile=document.createElement('details');profile.className='admin-profile';
    profile.innerHTML='<summary title="پروفایل و دسترسی سریع"><img src="/brand/resumeit-mark-v1.png" alt="" width="42" height="42"><span><strong></strong><small>مدیر · دسترسی سریع</small></span>'+icon('chevD')+'</summary><div class="admin-profile-menu"><div class="apm-head"><span class="apm-sky" aria-hidden="true"></span><img src="/brand/resumeit-mark-v1.png" alt="" width="44" height="44"><span><b data-apm-name></b><small data-apm-role></small></span></div>'+
      '<p class="apm-sec">رفتن به</p><a class="apm-row" href="/dashboard/">'+icon('home')+'<span>پنل کاربری</span></a><a class="apm-row" href="/staff/">'+icon('help')+'<span>میز پشتیبانی</span></a><a class="apm-row" href="/dashboard/settings/">'+icon('user')+'<span>تنظیمات حساب</span></a><a class="apm-row" href="/">'+icon('globe')+'<span>صفحهٔ اصلی سایت</span></a></div>';
    profile.querySelector('strong').replaceWith(name);logout.innerHTML=icon('logout')+'<span>خروج از حساب</span>';profile.querySelector('.admin-profile-menu').append(logout);footer.prepend(profile);
    profile.querySelector('summary small').textContent=(fullAdmin?'مالک / فول ادمین':'ادمین')+' · دسترسی سریع';
    profile.querySelector('[data-apm-role]').textContent=fullAdmin?'مالک / فول ادمین':'ادمین';profile.addEventListener('toggle',()=>{if(profile.open)profile.querySelector('[data-apm-name]').textContent=name.textContent.trim()||'مدیر';});
    document.addEventListener('click',e=>{if(!profile.contains(e.target))profile.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&profile.open){profile.open=false;profile.querySelector('summary').focus();}});
    $("#search-wrap").hidden = ![
      "users",
      "pages",
      "transactions",
      "payments",
      "purchases",
      "otp",
      "audit",
    ].includes(section);
    $("#days-wrap").hidden = ["users", "pages", "catalog", "health"].includes(
      section,
    );
    $("#status-wrap").hidden = !["users", "otp", "payments"].includes(section);
    $("#status").innerHTML =
      '<option value="">همهٔ وضعیت‌ها</option>' +
      (section === "payments"
        ? '<option value="paid">شارژ انجام شد</option><option value="pending">تأیید نشده</option><option value="verifying">در حال تأیید</option><option value="review">نیاز به بررسی</option><option value="failed">ناموفق</option><option value="reversed">برگشت به کارت</option><option value="cancelled">انصراف</option><option value="expired">مهلت تمام‌شده</option>'
        : section === "users"
        ? '<option value="active">فعال</option><option value="suspended">تعلیق‌شده</option>'
        : '<option value="accepted">پذیرفته‌شده</option><option value="failed">ناموفق</option><option value="pending">در انتظار</option>');
    $("#catalog-controls").hidden = true;
    if(section==='retention'||section==='assistant')$('#filters').hidden=true;
    $("#export").hidden = ["overview", "traffic", "catalog", "health", "assistant"].includes(
      section,
    );
    if (new URL(location.href).searchParams.has("user")) {
      $("#filters").hidden = true;
      $("#export").hidden = true;
    }
    $("#filters").onsubmit = (e) => {
      e.preventDefault();
      page = 1;
      load();
    };
    $("#days").onchange = () => {
      page = 1;
      load();
    };
    $("#status").onchange = () => {
      page = 1;
      load();
    };
    $("#catalog-kind").onchange = load;
    if(['users','pages','transactions','payments','purchases','otp','audit'].includes(section))advancedFilters();
    $("#export").onclick = exportCsv;
    document.addEventListener('change',event=>{const form=event.target.closest('#account-role-form');if(form&&event.target.name==='role'){const confirmation=form.elements.namedItem('confirmation');confirmation.value='';confirmation.placeholder=roleNames[event.target.value];form.querySelector('[role=status]').textContent='';delete form.dataset.requestId;}});
    document.addEventListener('input',event=>{const form=event.target.closest('#account-role-form,#support-role-form,#audit-purge-form');if(form&&!form.querySelector('[type=submit]').disabled){delete form.dataset.requestId;delete form.dataset.before;}});
    document.addEventListener('submit',async event=>{
      if(event.target.id==='retention-preview'){event.preventDefault();retentionBefore=new Date(event.target.elements.before.value).getTime();await load();return;}
      if(['account-role-form','audit-purge-form'].includes(event.target.id)){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;
        const role=form.elements.namedItem('role')?.value;
        if(role&&form.elements.namedItem('confirmation').value.trim()!==roleNames[role]){status.textContent='نام نقش انتخاب‌شده را دقیق وارد کن: '+roleNames[role];return;}
        const input={reason:form.elements.namedItem('reason').value,requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID()),...(role?{role,password:form.elements.namedItem('password')?.value||''}:{before:Number(form.dataset.before||(form.dataset.before=Date.now()-Number(form.elements.namedItem('range').value)*86400000)),confirmation:form.elements.namedItem('confirmation').value})};
        const token=loadToken,userId=detailUser?.id,controls=[...form.elements].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);form.setAttribute('aria-busy','true');status.textContent='در حال ثبت…';
        try{const result=await api(role?'users/'+userId+'/role':'audit/purge',input);if(!form.isConnected||token!==loadToken)return;const message=role?'نقش «'+roleNames[role]+'» ذخیره شد.':fa(result.deleted)+' گزارش بایگانی شد؛ رسید عملیات ثبت شد.';if(form.closest('[hidden]')){status.textContent=message+' برای دریافت اطلاعات تازه، صفحه را تازه کن.';return;}await load();if(loadToken!==token+1)return;const output=document.querySelector('#'+form.id+' [role=status]');if(output)output.textContent=message;}catch(error){if(form.isConnected)status.textContent=error.message;}finally{controls.forEach(el=>el.disabled=false);form.removeAttribute('aria-busy');}return;
      }
      if(event.target.id==='support-role-form'){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;const token=loadToken,userId=detailUser.id,controls=[...form.elements].filter(el=>!el.disabled),enabled=form.elements.namedItem('enabled').checked,reason=form.elements.namedItem('reason').value;controls.forEach(el=>el.disabled=true);
        const requestId=form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID());
        try{await api('users/'+userId+'/support-role',{enabled,reason,requestId});if(form.isConnected&&token===loadToken){if(form.closest('[hidden]'))status.textContent='تغییر ذخیره شد؛ برای دریافت اطلاعات تازه، صفحه را تازه کن.';else await load();}}catch(error){if(form.isConnected)status.textContent=error.message;}finally{controls.forEach(el=>el.disabled=false);}return;
      }
      if(event.target.id==='admin-payment-gateways'){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;const controls=[...form.elements].filter(el=>!el.disabled),input=Object.fromEntries(['sep','zibal'].map(key=>[key,form.elements.namedItem(key).checked]));controls.forEach(el=>el.disabled=true);status.textContent='در حال ذخیره…';
        try{await api('payment-gateways',input);if(form.isConnected)status.textContent='تنظیم درگاه‌ها ذخیره شد؛ پیگیری پرداخت‌های قبلی ادامه دارد.';}catch(error){if(form.isConnected)status.textContent=error.message;}finally{controls.forEach(el=>el.disabled=false);}return;
      }
      if(event.target.id!=='admin-notification-channels')return;event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[data-admin-channel-status]');if(button.disabled)return;const controls=[...form.elements].filter(el=>!el.disabled),input=Object.fromEntries(['email','sms','push'].map(key=>[key,form.elements.namedItem(key).checked]));controls.forEach(el=>el.disabled=true);status.textContent='در حال ذخیره…';
      try{await api('notification-channels',input);if(form.isConnected)status.textContent='تنظیم کانال‌های سایت ذخیره شد؛ انتخاب کاربران حفظ شده است.';}
      catch(error){if(form.isConnected)status.textContent=error.message;}finally{controls.forEach(el=>el.disabled=false);}
    });
    document.addEventListener("click", (e) => {
      const retentionAction=e.target.closest('[data-retention-kind]');if(retentionAction){retentionDialog(retentionAction.dataset.retentionKind,retentionAction.dataset.retentionAction);return;}
      const catalogGroup=e.target.closest('[data-catalog-group]');if(catalogGroup){$('#catalog-kind').value=catalogGroup.dataset.catalogGroup;catalogView='products';catalogPage=1;load();return;}
      if(e.target.closest('[data-catalog-settings]')){catalogView='settings';document.querySelectorAll('[data-catalog-group]').forEach(b=>b.setAttribute('aria-selected','false'));$('[data-catalog-settings]').setAttribute('aria-selected','true');catalogState();return;}
      const product=e.target.closest('[data-catalog-edit]');if(product){productDialog(product.dataset.catalogEdit,product.dataset.editMode);return;}
      const receipt=e.target.closest('[data-admin-receipt]');if(receipt){const r=rows[Number(receipt.dataset.adminReceipt)];if(!r)return;const dialog=document.createElement('dialog');dialog.className='batch-dialog admin-receipt';const fields=section==='payments'?[['وضعیت',r.status],['مبلغ تومان',fa(r.amount_toman)],['درگاه',r.provider],['مرجع بانکی',r.rrn||'ثبت نشده'],['رهگیری',r.trace||'ثبت نشده'],['نرخ همین پرداخت',fa(r.it_rate||2000)+' تومان/It'],[r.status==='paid'?'اعتبار همین پرداخت':'اعتبار در صورت تأیید',fa(Number(r.credit_units??(Number(r.amount_toman)*2000/Number(r.it_rate||2000)))/2000)+' It']]:section==='transactions'?[['عنوان',r.label],['تغییر اعتبار',fa(r.delta_units/2000)+' It'],['موجودی بعد',fa(r.balance_units/2000)+' It'],['مرجع',r.reference||'—'],['محصول',r.product_ref||'ثبت نشده']]:[['محصول',r.ref],['قیمت ثبت‌شده',fa(r.price_units/2000)+' It'],['پایان دسترسی',r.expires_at?date(r.expires_at):'دائمی']];dialog.innerHTML='<h2>'+(section==='payments'&&r.status==='paid'?'رسید پرداخت تأییدشده':section==='payments'?'گزارش پرداخت؛ تأیید نشده':section==='transactions'?'رسید دفتر کیف پول':'گواهی دسترسی فعلی')+'</h2>'+summary([['شناسهٔ سند',esc(recordKey(r))],['حساب',esc(r.name||r.phone||r.user_id||'حساب حذف‌شده')],['زمان ثبت',date(r.created_at)],...fields.map(([key,value])=>[key,esc(value)])])+'<p class="notice">'+(section==='purchases'?'این سند، دسترسی فعلی است و اثبات پرداخت بانکی یا فاکتور خرید تاریخی نیست.':'رسید داخلی رزومیت؛ وضعیت پرداخت بانکی فقط با تأیید درگاه تغییر می‌کند.')+'</p><div class="btnrow"><button class="btn" type="button" data-print>چاپ</button><button class="btn" type="button" data-download>خروجی سند</button><button class="btn" type="button" data-close>بستن</button></div>';document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-print]').onclick=()=>window.print();dialog.querySelector('[data-download]').onclick=()=>{const {admin_code,...document}=r;exportCsv([document]);};dialog.onclose=()=>dialog.remove();dialog.showModal();return;}
      const copy=e.target.closest('[data-copy-id]');if(copy){navigator.clipboard.writeText(copy.dataset.copyId).then(()=>{copy.title='شناسه کپی شد';}).catch(()=>{copy.title='کپی ممکن نشد؛ شناسه را انتخاب و کپی کن';});return;}
      if(e.target.closest('[data-reset-filters]')){document.querySelectorAll('[data-list-filter]').forEach(el=>el.value=el.tagName==='SELECT'?el.options[0].value:'');$('#search').value='';$('#status').value='';page=1;load();return;}
      const selected=()=>{const keys=new Set([...document.querySelectorAll('[data-record-key]:checked')].map(el=>el.dataset.recordKey));return rows.filter(r=>keys.has(recordKey(r)));},feedback=$('[data-bulk-status]');
      if(e.target.closest('[data-export-selected]')){const chosen=selected();if(chosen.length)exportCsv(chosen);else feedback.textContent='ابتدا ردیف‌ها را انتخاب کن';return;}
      if(e.target.closest('[data-copy-selected]')){const chosen=selected();if(!chosen.length){feedback.textContent='ابتدا ردیف‌ها را انتخاب کن';return;}navigator.clipboard.writeText(chosen.map(r=>r.admin_code||recordKey(r)).join('\n')).then(()=>feedback.textContent='شناسه‌ها کپی شدند').catch(()=>feedback.textContent='کپی ممکن نشد؛ از خروجی استفاده کن');return;}
      const batch=e.target.closest('[data-bulk-user],[data-bulk-catalog]');if(batch){const chosen=selected().filter(r=>!batch.dataset.bulkCatalog||r.price>0);if(!chosen.length){feedback.textContent='ابتدا موارد مناسب را انتخاب کن؛ توقف فروش برای محصول پولی است';return;}batchDialog(chosen,batch);return;}
      const catalogPaging=e.target.closest('[data-catalog-page]');if(catalogPaging){catalogPage+=Number(catalogPaging.dataset.catalogPage);filterCatalog();return;}
      const a = e.target.closest("[data-action]");
      if (a) actionDialog(a.dataset.user, a.dataset.action);
      if (e.target.closest("#prev")) {
        page--;
        load();
      }
      if (e.target.closest("#next")) {
        page++;
        load();
      }
      if (e.target.closest("#retry")) load();
    });
    document.addEventListener('input',e=>{if(e.target.matches('[data-catalog-search]')){catalogPage=1;filterCatalog();}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-select-page]'))document.querySelectorAll('[data-record-key]').forEach(el=>{if(!el.closest('tr')?.hidden)el.checked=e.target.checked;});if(e.target.matches('[data-catalog-status],[data-catalog-sort],[data-catalog-size]')){catalogPage=1;filterCatalog();}if(e.target.matches('[data-catalog-toggle]')){const paused=!e.target.checked;e.target.checked=!e.target.checked;productDialog(e.target.dataset.catalogToggle,'toggle',paused);}});
    const mobile = matchMedia("(max-width:760px)");
    const drawer = (open) => {
      const wasOpen = $("#admin-side").dataset.open === "true";
      $(".admin-main").inert = open && mobile.matches;
      $("#admin-side").inert = !open && mobile.matches;
      $("#admin-side").dataset.open = open;
      $("#admin-backdrop").dataset.open = open;
      $("#admin-menu").setAttribute("aria-expanded", String(open));
      $('.admin-shell').classList.toggle('admin-compact',!open&&!mobile.matches);
      $('.admin-brand img').src=!open&&!mobile.matches?'/brand/resumeit-mark-v1.png':'/brand/resumeit-logo-v1.png';
      $('#admin-menu').setAttribute('aria-label',open?'جمع کردن منوی مدیریت':'باز کردن منوی مدیریت');
      if (open&&mobile.matches) $("#admin-close").focus();
      else if (mobile.matches && wasOpen) $("#admin-menu").focus();
    };
    drawer(!mobile.matches);
    mobile.addEventListener("change", () => drawer(!mobile.matches));
    $("#admin-close").onclick = () => drawer(false);
    $("#admin-menu").onclick = () =>
      drawer($("#admin-side").dataset.open !== "true");
    $("#admin-backdrop").onclick = () => drawer(false);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#admin-side").dataset.open === "true") drawer(false);
    });
    $("#user-panel").onclick = () => {
      sessionStorage.setItem("ri-panel-choice", user.id);
    };
    $("#logout").onclick = async () => {
      try {
        const r = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw new Error();
        sessionStorage.removeItem("ri-panel-choice");
        location.assign("/login/");
      } catch {
        $("#content").innerHTML =
          '<p class="notice error" role="alert">خروج انجام نشد؛ دوباره تلاش کنید.</p>';
      }
    };
    await load();
  }
  boot().catch(() => {
    $("#content").innerHTML =
      '<p class="notice error">پنل آماده نشد؛ صفحه را دوباره باز کنید.</p>';
  });
})();
