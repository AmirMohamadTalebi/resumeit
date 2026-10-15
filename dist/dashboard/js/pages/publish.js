/* رزرو آدرس و انتشار مستقل صفحه‌ها روی سرور */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('publish', {
    title: 'آدرس و انتشار',
    render() {
      return RI.pageHead({title:'انتشار صفحه‌ها',actions:'<a class="btn btn--soft" href="/dashboard/studio/" data-go="studio">'+RI.icon('check')+'آمادگی در استودیو</a>'}) +
        '<div class="tabs workspace-tabs" role="tablist" id="ptabs">' + [['go','صفحه‌های عمومی'],['address', 'نام و آدرس'], ['share', 'کارت لینک و جست‌وجو']].map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div><div id="pbody"></div>';
    },
    mount(root, ctx) {
      let tab = (ctx.opts && ctx.opts.anchor === 'share') ? 'share' : (ctx.opts && ctx.opts.anchor === 'slug') ? 'address' : 'go';
      const body = RI.$('#pbody', root);
      const C = () => RI.C();
      let slugTimer = 0;
      let shareKind = RI.workspaceSlot===3?'links':'resume';

      /* ---- آدرس ---- */
      function slugMsg(r, checking) {
        if (checking) return '<div class="slugstat is-checking"><span class="spinner"></span>در حال بررسی آزاد بودن نام…</div>';
        if (r.state === 'ok') return '<div class="slugstat is-ok">' + RI.icon('check') + r.msg + '</div>';
        if (r.state === 'empty') return '<div class="slugstat">' + RI.icon('info') + r.msg + '</div>';
        let sug = '';
        if (r.state === 'taken') { const s = RI.suggestSlugs(C().slug); sug = s.length ? '<div class="sugs">پیشنهاد: ' + s.map((x) => '<button type="button" class="filter-chip ltr-inline" data-sug="' + x + '">' + x + '</button>').join('') + '</div>' : ''; }
        return '<div class="slugstat is-bad" role="alert">' + RI.icon('alert') + r.msg + '</div>' + sug;
      }
      function addressTab() {
        const u = RI.urls(), r = RI.slugCheck(C().slug), ok = r.state === 'ok';
        const pubR = RI.state.pub.resume.status === 'published', pubL = RI.state.pub.links.status === 'published';
        return '<div class="panel"><div class="panel__head"><h2>نام صفحه (زیردامنه)</h2><p>یک نام کوتاه و ماندگار؛ حروف کوچک انگلیسی، عدد و خط تیره <span class="field__req">پایهٔ انتشار</span></p></div>' +
          '<div class="field" id="slugField"><label class="field__label" for="slug">نام صفحه</label><div class="input-group"><input class="input" id="slug" value="' + esc(C().slug) + '" maxlength="24" autocomplete="off" spellcheck="false" aria-describedby="slugmsg" aria-invalid="' + (r.state === 'invalid' || r.state === 'taken') + '"><span class="input-group__addon">.' + RI.DOMAIN + '</span></div><div id="slugmsg" aria-live="polite">' + slugMsg(r) + '</div>' +
          '<div class="field__hint">نام‌هایی مانند admin و www برای سرویس رزرو شده‌اند.</div></div>' +
          (RI.state.pub.resume.status === 'published' && C().slug !== RI.savedSlug ? '<div class="banner banner--warn">' + RI.icon('alert') + '<div class="banner__body"><b>آدرس منتشرشده عوض می‌شود</b>پس از ذخیرهٔ نام جدید، آدرس قبلی دیگر کار نمی‌کند و لینک‌های اشتراک‌گذاری‌شده باید عوض شوند</div></div>' : '') + '</div>' +
          '<div class="panel"><div class="panel__head"><h2>آدرس‌های شما</h2><p>رزومه و صفحهٔ لینک دو صفحهٔ مستقل‌اند که از منوی خودشان به هم وصل می‌شوند</p></div><div class="urlrows">' +
          [['resume', 'صفحهٔ رزومه', 'resume', u.resume, pubR], ['links', 'صفحهٔ لینک‌ها', 'link', u.links, pubL]].map((x) => '<div class="urlrow ' + (ok ? '' : 'is-off') + '"><span class="row__ico">' + RI.icon(x[2]) + '</span><div class="row__main"><div class="row__title">' + x[1] + ' ' + (x[4] ? '<span class="chip chip--ok">منتشر شده</span>' : '<span class="chip">پیش‌نویس</span>') + '</div>' + (ok ? RI.urlChip(x[3], { open: x[3] }) : '<div class="field__hint">با انتخاب یک نام معتبر، آدرس این‌جا ظاهر می‌شود</div>') + '</div></div>').join('') + '</div></div>';
      }

      /* ---- دامنه ---- */
      function domainTab() { return '<div class="panel"><h2>آدرس شخصی شما</h2><p>رزومه و لینک‌ها روی زیردامنهٔ resumeit.ir منتشر می‌شوند. اتصال دامنهٔ مستقل فعلاً فعال نیست.</p><a class="btn btn--soft" href="/contact/">ارتباط با پشتیبانی</a></div>'; }

      /* ---- اشتراک‌گذاری ---- */
      function shareTab() {
        const s = C().share, u = RI.urls(), p = C().profile, card = RI.shareCard(C(),shareKind);
        const t = card.title, d = card.desc, address = u[shareKind];
        return '<div class="workspace-tools"><div class="segmented" role="group" aria-label="صفحهٔ کارت لینک">'+[['resume','رزومه'],['links','صفحهٔ لینک‌ها']].filter(([id])=>RI.workspaceSlot!==3||id==='links').map(([id,label])=>'<button type="button" data-share-kind="'+id+'" aria-pressed="'+(id===shareKind)+'">'+label+'</button>').join('')+'</div></div><div class="two"><div class="panel"><div class="panel__head"><h2>وقتی لینکت را می‌فرستند…</h2><p>عنوان، توضیح و تصویر پیشنهادی برای پیام‌رسان‌ها و جست‌وجو؛ نمایش نهایی به سرویس مقصد بستگی دارد.</p></div>' +
          '<div class="field"><label class="field__label" for="sh_t">عنوان<span class="field__count" id="shc1"></span></label><input class="input" id="sh_t" maxlength="60" value="' + esc(s.title) + '" placeholder="' + esc(p.name || 'نام و عنوان تو') + '"></div>' +
          '<div class="field"><label class="field__label" for="sh_d">توضیح<span class="field__count" id="shc2"></span></label><textarea class="textarea" id="sh_d" rows="3" maxlength="160" placeholder="یک جملهٔ جذاب دربارهٔ خودت">' + esc(s.desc) + '</textarea></div>' +
          '<div class="field"><div class="field__label">تصویر اشتراک‌گذاری</div>' + RI.imageFieldHtml('shimg', { value: s.image, wide: true, label: 'تصویر اشتراک‌گذاری' }) + '<div class="field__hint">اندازهٔ پیشنهادی ۱۲۰۰×۶۳۰</div></div></div>' +
          '<div class="panel"><div class="panel__head"><h2>پیش‌نمایش کارت</h2></div><div class="sharecard"><div class="sharecard__img" style="' + esc(RI.bg(card.image) || 'background:var(--ice-200)') + '"></div><div class="sharecard__body"><small class="ltr">' + esc(address) + '</small><b>' + esc(t) + '</b><p>' + esc(d) + '</p></div></div>' +
          '<div class="syncrow" style="margin-top:14px"><div><b>نمایش در نتایج جست‌وجو</b><div class="field__hint">خاموش کردن، درخواست noindex می‌فرستد؛ صفحهٔ عمومی را خصوصی نمی‌کند.</div></div>' + RI.switchHtml({ checked: RI.state.account.indexing, label: 'ایندکس در جست‌وجو' }).replace('<input', '<input id="idx"') + '</div><div class="btnrow"><button type="button" class="btn btn--soft" data-native-share>'+RI.icon('external')+'فرستادن این صفحه</button><button type="button" class="btn btn--ghost" data-copy="'+esc(address)+'">'+RI.icon('copy')+'کپی آدرس</button><button type="button" class="btn btn--ghost" data-share-qr>کد QR</button></div><p class="field__hint">متن و تصویر اختصاصی روی هر دو صفحه اعمال می‌شوند؛ بدون آن‌ها، مشخصات همان صفحه استفاده می‌شود. برای عمومی‌شدن تغییرات، همان صفحه را دوباره منتشر کن.</p></div></div>';
      }

      /* ---- چک‌لیست و انتشار ---- */
      function pubCard(k, rd) {
        const s = RI.state.pub[k], live = s.status === 'published', dirty = RI.pubDirty(k), ok = (k === 'resume' ? rd.resumeOk : rd.linksOk) && (RI.workspaceSlot===1||RI.hasSub()), u = RI.urls();
        return '<section class="panel pubcard"><div class="panel__head panel__head--row"><div><h2>' + (k === 'resume' ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها') + '</h2><p>' + (live ? (dirty ? 'نسخهٔ ' + RI.fa(s.version) + ' منتشر است و تغییرات تازه‌ای هنوز منتشر نشده' : 'نسخهٔ ' + RI.fa(s.version) + ' منتشر است، آخرین به‌روزرسانی ' + RI.date(s.at) + '.') : 'هنوز منتشر نشده؛ فقط تو می‌بینی‌اش') + '</p></div>' + (live ? (dirty ? '<span class="chip chip--warn">تغییرات منتشرنشده</span>' : '<span class="chip chip--ok">' + RI.icon('check') + 'منتشر شده</span>') : '<span class="chip">پیش‌نویس</span>') + '</div>' +
          '<div class="workspace-band">'+RI.urlChip(k==='resume'?u.resume:u.links,{})+'</div>'+
          (!ok ? '<p><a class="textlink" href="/dashboard/studio/" data-go="studio">ادامهٔ تکمیل در استودیو '+RI.icon('chevL')+'</a></p>' : '<p class="field__hint">آمادهٔ ساخت نسخهٔ عمومی</p>') +
          '<div class="btnrow"><button type="button" class="btn btn--soft" data-pv="' + k + '">' + RI.icon('eye') + 'پیش‌نمایش قبل از انتشار</button>' +
          (live ? '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (dirty && ok ? '' : 'disabled') + '>' + RI.icon('refresh') + 'به‌روزرسانی نسخهٔ منتشرشده</button><button type="button" class="btn btn--danger-soft" data-unpub="' + k + '">' + RI.icon('eyeOff') + 'برداشتن از انتشار</button>' : '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (ok ? '' : 'disabled') + '>' + RI.icon('rocket') + 'انتشار</button>') + '</div>' +
          (live ? '<div style="margin-top:12px">' + RI.urlChip(k === 'resume' ? u.resume : u.links, { open: k === 'resume' ? u.resume : u.links }) + '</div>' : '') + '</section>';
      }
      function goTab() { const rd = RI.readiness(),paused=!RI.canWorkspace(RI.workspaceSlot);return (paused?'<div class="banner banner--warn"><div class="banner__body"><b>این جایگاه با پایان اشتراک از نمایش عمومی خارج شده است.</b>پیش‌نویس و نسخه‌های قبلی حفظ شده‌اند؛ با تمدید اشتراک دوباره در دسترس قرار می‌گیرند.</div><a class="btn btn--soft" href="/dashboard/billing/" data-go="billing">تمدید اشتراک</a></div>':'')+'<div class="publication-grid">' + RI.pageKinds().map(kind=>pubCard(kind,rd)).join('') + '</div>'; }

      function paint() {
        body.innerHTML = tab === 'address' ? addressTab() : tab === 'domain' ? domainTab() : tab === 'share' ? shareTab() : goTab();
        if(tab==='address'){
          const routes=C().routing||(C().routing={resume:'',links:'link'}),extra=document.createElement('section');extra.className='workspace-band route-settings';extra.innerHTML='<h2>قانون انتخاب آدرس</h2><p>نام صفحه: ۳ تا ۲۴ حرف کوچک انگلیسی، عدد یا خط تیره؛ بدون فاصله، فارسی، خط تیرهٔ ابتدا/انتها یا دو خط تیرهٔ متوالی. نام گرفته‌شده و نام‌های سیستمی مثل admin، api، contact و payments قابل انتخاب نیستند.</p>'+(RI.workspaceSlot===3?'<p>این جایگاه فقط صفحهٔ لینک است: <b class="ltr-inline">resumeit.ir/'+esc(C().slug||'name3')+'</b></p>':'<div class="form-grid"><div class="field"><label class="field__label" for="resume-path">مسیر رزومه · به انتخاب تو</label><input class="input" id="resume-path" dir="ltr" maxlength="24" value="'+esc(routes.resume)+'" placeholder="خالی = ریشهٔ زیردامنه"><p class="field__hint">مثال: name.resumeit.ir/resume؛ ریشهٔ قدیمی هم کار می‌کند.</p></div><div class="field"><label class="field__label" for="links-path">مسیر صفحهٔ لینک · همیشه دارای نام</label><input class="input" id="links-path" dir="ltr" maxlength="24" value="'+esc(routes.links)+'" placeholder="link"><p class="field__hint">پیش‌فرض: /link؛ خالی مجاز نیست. /links قدیمی محفوظ است.</p></div></div><p>مسیرها ۱ تا ۲۴ نویسه‌اند و نباید یکسان یا سیستمی باشند؛ out، share-image، api و admin قابل انتخاب نیستند. تغییر مسیر بعد از انتشار دوباره عمومی می‌شود.</p>')+'<p role="status" data-route-message></p>';body.append(extra);
          if(RI.workspaceSlot===3){body.querySelector('#slugField .input-group__addon').textContent='resumeit.ir/';body.querySelector('.panel__head h2').textContent='نام صفحه روی دامنهٔ اصلی';body.querySelectorAll('.urlrow').forEach((row,index)=>{if(index===0)row.remove();});}
        }
        RI.$$('#ptabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        if (tab === 'share') { RI.bindImageField(body, 'shimg', { set: (v) => { C().share.image = v; RI.touch('share'); paint(); } }); counts(); }
        if (tab === 'address') { const i = RI.$('#slug', body); if (ctx.opts && ctx.opts.anchor === 'slug' && i) { i.focus(); ctx.opts = {}; } }
      }
      function counts() { const s = C().share; const a = RI.$('#shc1', body), b = RI.$('#shc2', body); if (a) a.textContent = RI.fa(s.title.length) + '/۶۰'; if (b) b.textContent = RI.fa(s.desc.length) + '/۱۶۰'; }
      function refreshAddresses(){const urls=RI.urls(),kinds=RI.pageKinds();body.querySelectorAll('.urlrow').forEach((row,index)=>{const chip=row.querySelector('.url-chip');if(chip)chip.outerHTML=RI.urlChip(urls[kinds[index]],{open:urls[kinds[index]]});});}

      /* رویدادها */
      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(root,'click','[data-share-kind]',(e,b)=>{shareKind=b.dataset.shareKind;paint();});
      RI.delegate(root,'click','[data-share-qr]',async(e,b)=>{b.disabled=true;try{const result=await RI.dashboardRequest('share-qr?kind='+shareKind);RI.modal({title:'کد QR صفحه',body:'<div class="font-proof"><img src="'+esc(result.image)+'" width="320" height="320" alt="کد QR برای '+esc(result.url)+'"><p class="ltr">'+esc(result.url)+'</p><a class="btn btn--soft" href="'+esc(result.image)+'" download="resumeit-'+shareKind+'-qr.png">'+RI.icon('download')+'دریافت تصویر</a></div>',actions:[{label:'بستن',kind:'ghost'}]});}catch(error){RI.toast(error.message,{kind:'error'});}finally{b.disabled=false;}});
      RI.delegate(root,'click','[data-native-share]',async()=>{if(RI.state.pub[shareKind].status!=='published'){RI.toast('لینک را پس از انتشار بفرست',{kind:'info'});return;}const card=RI.shareCard(C(),shareKind),data={title:card.title,text:card.desc,url:RI.urls()[shareKind]};try{if(navigator.share)await navigator.share(data);else await RI.copy(data.url);}catch(e){if(e.name!=='AbortError')RI.toast('لینک را با دکمهٔ کپی بردار',{kind:'info'});}});
      body.addEventListener('input', (e) => {
        const t = e.target;
        if(['resume-path','links-path'].includes(t.id)){const kind=t.id==='resume-path'?'resume':'links',value=t.value.trim().toLowerCase();C().routing[kind]=value;const valid=(kind==='resume'&&!value||RI.pagePathValid(value))&&!(kind==='resume'&&['link','links'].includes(value))&&C().routing.resume!==C().routing.links;t.setAttribute('aria-invalid',String(!valid));body.querySelector('[data-route-message]').textContent=valid?'مسیر معتبر است؛ برای عمومی‌شدن دوباره منتشر کن.':'مسیر خالی، تکراری یا سیستمی مجاز نیست؛ فقط حروف کوچک انگلیسی، عدد و خط تیره.';RI.touch('routing');if(valid)refreshAddresses();}
        if (t.id === 'slug') {
          C().slug = t.value.trim().toLowerCase(); RI.touch('slug');
          const r = RI.slugCheck(C().slug), box = RI.$('#slugmsg', body);
          clearTimeout(slugTimer);
          if (r.state === 'invalid' || r.state === 'empty') { box.innerHTML = slugMsg(r); t.setAttribute('aria-invalid', r.state === 'invalid'); }
          else { box.innerHTML = slugMsg(r, true); slugTimer = setTimeout(async () => { const value=C().slug;try{const result=await RI.dashboardRequest('slug?value='+encodeURIComponent(value));if(C().slug!==value||!box.isConnected)return;const rr=result.available?{state:'ok',msg:'این نام آزاد است.'}:{state:'taken',msg:'این نام رزرو شده یا قبلاً گرفته شده است.'};box.innerHTML=slugMsg(rr);t.setAttribute('aria-invalid',!result.available);}catch(e){if(box.isConnected)box.textContent=e.message;} },350); }
        }
        if (t.id === 'sh_t') { C().share.title = t.value; RI.touch('share'); counts(); paintCard(); }
        if (t.id === 'sh_d') { C().share.desc = t.value; RI.touch('share'); counts(); paintCard(); }
      });
      function paintCard() { const values=RI.shareCard(C(),shareKind),card = RI.$('.sharecard__body', body); if (!card) return; card.querySelector('b').textContent = values.title; card.querySelector('p').textContent = values.desc; }
      body.addEventListener('change', (e) => { if (e.target.id === 'idx') { RI.state.account.indexing = e.target.checked; RI.touch('preferences'); RI.toast('تنظیم به‌صورت خودکار ذخیره می‌شود',{kind:'info'}); } });
      RI.delegate(body, 'click', '[data-sug]', (e, b) => { C().slug = b.dataset.sug; RI.touch('slug'); paint(); });

      RI.delegate(body, 'click', '[data-fix]', (e, b) => {
        const all = RI.readiness(); const it = all.resume.concat(all.links).find((x) => x.id === b.dataset.fix);
        if (it.route === 'publish') { tab = it.anchor === 'share' ? 'share' : 'address'; paint(); if (tab === 'address') RI.$('#slug', body).focus(); } else RI.go(it.route, { step: it.step, tab: it.tab });
      });
      RI.delegate(body, 'click', '[data-pv]', async (e, b) => {try{if(b.dataset.pv==='resume')await RI.loadTemplates([RI.C().theme.resume]);RI.openPreview(b.dataset.pv, { title: 'پیش‌نمایش قبل از انتشار' });}catch(e){RI.toast(e.message,{kind:'error'});}});
      RI.delegate(body, 'click', '[data-pub]', async (e, b) => {
        const k = b.dataset.pub;
        if ((RI.state.ui.dirty || RI.state.ui.saving) && !(await RI.save())) return;
        runPublish(k);
      });
      function runPublish(k) {
        const update = RI.state.pub[k].status === 'published';
        const m = RI.modal({ title: update ? 'در حال به‌روزرسانی…' : 'در حال انتشار…', size: 'sm', dismissible: false, body: '<ol class="pubsteps" id="ps"></ol>', actions: [] });
        const draw = (i, steps) => { RI.$('#ps', m.body).innerHTML = steps.map((s, j) => '<li class="' + (j < i ? 'is-done' : j === i ? 'is-now' : '') + '">' + (j < i ? RI.icon('check') : j === i ? '<span class="spinner"></span>' : '<i></i>') + s + '</li>').join(''); };
        RI.publish(k, draw).then(() => {
          m.setTitle(update ? 'به‌روزرسانی شد' : 'منتشر شد'); const u = RI.urls();
          m.setBody('<div class="pay-state pay-state--ok"><div class="empty__art">' + RI.icon('rocket') + '</div><b>نسخهٔ عمومی صفحه منتشر شد</b><p>ویرایش‌ها تا انتشار دوباره عمومی نمی‌شوند.</p>' + RI.urlChip(k === 'resume' ? u.resume : u.links, {}) + '<p>اگر زیردامنه هنوز در دسترس نیست، از آدرس جایگزین استفاده کن:</p>'+RI.urlChip(k==='resume'?u.fallbackResume:u.fallbackLinks,{open:k==='resume'?u.fallbackResume:u.fallbackLinks})+'</div>');
          m.setActions([{ label: 'تمام', kind: 'primary', value: true }]); m.el.querySelector('[data-close]') || null; paint();
        }).catch((error) => {
          if (error.message === 'account-incomplete') {
            m.setTitle('مشخصات حسابت رو کامل کن');
            m.setBody('<p>برای انتشار صفحه باید اسم، فامیل و شماره موبایل تأییدشده داشته باشی</p>');
            m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تکمیل مشخصات', kind: 'primary', onClick: () => RI.go('settings') }]);
            return;
          }
          m.setTitle('انتشار انجام نشد'); m.setBody('<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>خطا در انتشار</b>' + esc(error.message) + '</div></div>');
          m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تلاش دوباره', kind: 'primary', icon: 'refresh', onClick: () => { setTimeout(() => runPublish(k), 220); } }]);
        });
      }
      RI.delegate(body, 'click', '[data-unpub]', async (e, b) => {
        const k = b.dataset.unpub;
        if (await RI.confirm({ title: 'برداشتن صفحه از انتشار', text: 'صفحهٔ ' + (k === 'resume' ? 'رزومه' : 'لینک‌ها') + ' برای بازدیدکننده‌ها «پیدا نشد» نشان می‌دهد محتوایت حذف نمی‌شود و هر وقت خواستی دوباره منتشرش کن', danger: true, icon: 'eyeOff', confirmLabel: 'برداشتن از انتشار' })) { try{await RI.unpublish(k);RI.toast('صفحه از انتشار برداشته شد',{kind:'info'});paint();}catch(e){RI.toast(e.message,{kind:'error'});} }
      });
      const off = RI.on('pub', () => paint());
      paint();
      return () => { off(); clearTimeout(slugTimer); };
    },
  });
})();
