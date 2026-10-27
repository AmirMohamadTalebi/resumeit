/* حساب، روش‌های ورود، خروجی و حذف؛ امکانات آماده‌نشده غیرفعال‌اند */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('settings', {
    title: 'تنظیمات حساب',
    render() {
      const a = RI.state.account, c = RI.C();
      const conn = (k, label, ic) => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(ic) + '</span><div><b>' + label + '</b><div class="field__hint">' + (a[k] ? 'متصل است؛ می‌توانی با آن وارد شوی' : 'متصل نیست') + '</div></div></div><button type="button" class="btn ' + (a[k] ? 'btn--soft' : 'btn--primary') + ' btn--sm" data-conn="' + k + '">' + (a[k] ? 'قطع اتصال' : 'اتصال') + '</button></div>';
      return RI.pageHead({ eyebrow: 'حساب', eyebrowIcon: 'settings', title: 'تنظیمات حساب', desc: 'مشخصات و روش‌های ورود حسابت رو اینجا مدیریت کن' }) +
        '<div class="setgrid"><div class="setcol">' +
        '<section class="panel"><div class="panel__head"><h2>مشخصات حساب</h2></div><div class="form-grid"><div class="field"><label class="field__label" for="a_name">نام</label><input class="input" id="a_name" autocomplete="given-name" value="' + esc(a.firstName||'') + '" maxlength="39"></div><div class="field"><label class="field__label" for="a_last">نام خانوادگی</label><input class="input" id="a_last" autocomplete="family-name" maxlength="39" value="' + esc(a.lastName||'') + '"></div></div><div class="btnrow"><button type="button" class="btn btn--soft" data-name>' + RI.icon('check') + 'ذخیره مشخصات</button></div><p class="field__hint">برای انتشار صفحه، نام، نام خانوادگی و شماره تأییدشده‌ات باید کامل باشن</p>' +
        '<div class="syncrow"><div><b>شمارهٔ موبایل</b><div class="mobrow"><span class="ltr-inline mono">' + esc(a.mobile.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')) + '</span> ' + (a.mobileVerified ? '<span class="chip chip--ok">' + RI.icon('check') + 'تأیید شده</span>' : '<span class="chip chip--warn">تأییدنشده</span>') + '</div></div><button type="button" class="btn btn--soft btn--sm" data-mobile>' + RI.icon('phone') + (a.mobile ? 'تغییر یا تأیید شماره' : 'اضافه‌کردن شماره') + '</button></div></section>' +
        '<section class="panel"><div class="panel__head"><h2>امنیت ورود</h2><p>ورود با رمز عبور یا کد یک‌بارمصرف پیامکی</p></div><div class="syncrow"><div><b>رمز عبور</b><div class="field__hint">تغییر رمز با تأیید پیامکی شمارهٔ حساب انجام می‌شود و نشست‌های قبلی را می‌بندد</div></div><button type="button" class="btn btn--soft btn--sm" data-pass>' + RI.icon('key') + 'تغییر رمز</button></div><hr class="divider">' + conn('google', 'گوگل', 'google') + conn('github', 'گیت‌هاب', 'github') + '<hr class="divider"><div class="syncrow"><div><b>دستگاه‌های فعال</b><div class="field__hint">مرورگرهایی که الان با این حساب وارد شده‌اند؛ هر نشست ناآشنا را ببند</div></div><button type="button" class="btn btn--soft btn--sm" data-revoke-others hidden>' + RI.icon('logout') + 'خروج از همهٔ دستگاه‌های دیگر</button></div><div data-sessions aria-live="polite" aria-busy="true"><p class="field__hint">در حال دریافت فهرست دستگاه‌ها…</p></div></section>' +
        '<section class="panel"><div class="panel__head"><h2>نمایش عمومی اطلاعات تماس</h2><p>همان مقدارهای بخش «تماس» در رزومه؛ این‌جا فقط نمایش آن‌ها را کنترل می‌کنی</p></div>' + c.contacts.map((x) => '<div class="syncrow"><div><b>' + esc(x.label) + '</b><div class="field__hint ltr">' + (x.value ? esc(x.value) : 'وارد نشده') + '</div></div>' + RI.switchHtml({ checked: x.public && !!x.value, disabled: !x.value, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '</div>').join('') + '</section></div>' +
        '<div class="setcol">' +
        '<section class="panel"><div class="panel__head"><h2>اطلاعات و حذف حساب</h2></div><div class="syncrow"><div><b>خروجی محتوای جایگاه فعال</b><div class="field__hint">فایل JSON از محتوا، تنظیمات و وضعیت انتشار همین جایگاه؛ بدون رمز یا نشست</div></div><button type="button" class="btn btn--soft btn--sm" data-export>' + RI.icon('download') + 'خروجی</button></div>' +
        '<div class="syncrow"><div><b>خروج از حساب</b><div class="field__hint">پایان نشست در این دستگاه</div></div><button type="button" class="btn btn--soft btn--sm" data-logout>' + RI.icon('logout') + 'خروج</button></div>' +
        (a.isOwner?'<div class="syncrow"><div><b>مالکیت این حساب</b><div class="field__hint">پیش از حذف حساب، یک مالک دیگر باید نقش مالکیت تو را تغییر دهد.</div></div><a class="btn btn--soft btn--sm" href="/admin/users/">'+RI.icon('shield')+'مدیریت نقش‌ها</a></div>':'<div class="danger"><div><b>حذف حساب</b><div class="field__hint">رزومه، لینک‌ها، موجودی و خریدهای حساب حذف می‌شوند؛ این عمل برگشت‌ناپذیر است</div></div><button type="button" class="btn btn--danger-soft btn--sm" data-delete>' + RI.icon('trash') + 'حذف حساب</button></div>')+'</section></div></div>';
    },
    mount(root) {
      const a = RI.state.account, owner=RI.ownerId, active=()=>root.isConnected&&owner===RI.ownerId;
      const tabs=document.createElement('div');tabs.innerHTML=RI.tabsHtml([['profile','مشخصات'],['security','ورود و امنیت'],['privacy','حریم خصوصی'],['data','اطلاعات و حساب']],'profile');root.querySelector('.setgrid').before(tabs);
      const sections=[...root.querySelectorAll('.setgrid section')],keys=['profile','security','privacy','data'];
      const select=id=>{sections.forEach((section,i)=>{section.hidden=keys[i]!==id;});tabs.querySelectorAll('button').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.workspaceTab===id)));};
      const initial=new URLSearchParams(location.search).get('tab');select(keys.includes(initial)?initial:'profile');
      RI.delegate(tabs,'click','[data-workspace-tab]',(e,b)=>{select(b.dataset.workspaceTab);RI.setRouteTab(b.dataset.workspaceTab,'profile');});
      RI.delegate(root, 'click', '[data-name]', async (e,b) => {
        if(b.disabled)return;const fields=[RI.$('#a_name',root),RI.$('#a_last',root)],values={firstName:fields[0].value.trim(),lastName:fields[1].value.trim()};
        let feedback=root.querySelector('[data-name-status]');if(!feedback){feedback=document.createElement('p');feedback.dataset.nameStatus='';b.closest('.btnrow').after(feedback);}feedback.setAttribute('role','status');feedback.textContent='در حال ذخیرهٔ مشخصات…';b.disabled=true;fields.forEach(input=>input.disabled=true);
        try{await RI.accountRequest('account/names',values);if(!active())return;await RI.reloadAccount();if(active()){RI.rerender();RI.toast('مشخصاتت ذخیره شد');}}
        catch(error){if(active()){feedback.setAttribute('role','alert');feedback.textContent=error.message;}}
        finally{b.disabled=false;fields.forEach(input=>input.disabled=false);}
      });
      RI.delegate(root, 'click', '[data-mobile]', () => RI.phoneDialog());
      RI.delegate(root, 'click', '[data-pass]', async () => { if(await RI.leaveGuard()) location.assign('/forgot-password/'); });
      RI.delegate(root, 'click', '[data-conn]', async (e, b) => {
        const k = b.dataset.conn, nm = k === 'google' ? 'گوگل' : 'گیت‌هاب';
        if(b.disabled)return;b.disabled=true;
        try {
        if(a[k]) {if(await RI.confirm({title:'قطع اتصال '+nm,text:'با قطع اتصال، دیگه با '+nm+' وارد این حساب نمی‌شی',danger:true,icon:'link',confirmLabel:'قطع اتصال'})&&active()){await RI.accountRequest('social/unlink',{provider:k});if(!active())return;await RI.reloadAccount();if(active()){RI.rerender();RI.toast('اتصال '+nm+' قطع شد',{kind:'info'});}}}
        else {window.location.href='/api/auth/'+k+'/start?mode=link';}
        } catch(error){if(active())RI.toast(error.message,{kind:'error'});
        } finally {b.disabled=false;}
      });
      root.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.cpub) { const x = RI.C().contacts.find((k) => k.id === t.dataset.cpub); x.public = t.checked; RI.touch('contacts'); }
      });
      RI.delegate(root, 'click', '[data-export]', () => {
        const data = { _note: 'خروجی اطلاعات ResumeIt', account:{name:a.name,mobile:a.mobile},content:RI.C(),preferences:{indexing:a.indexing,brand:a.brand},publication:RI.state.pub };
        const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); l.download = 'resumeit-export.json'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 500); RI.toast('فایل اطلاعات دانلود شد');
      });
      RI.delegate(root, 'click', '[data-logout]', () => RI.logout());
      const sessionsBox = RI.$('[data-sessions]', root), othersButton = RI.$('[data-revoke-others]', root);
      const when = t => { try { return t ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(t) : 'نامشخص'; } catch { return 'نامشخص'; } };
      const drawSessions = rows => {
        if (!active()) return;
        sessionsBox.removeAttribute('aria-busy');
        othersButton.hidden = !rows.some(r => !r.current);
        sessionsBox.innerHTML = rows.length ? rows.map(r => '<div class="syncrow"><div class="connrow"><span class="row__ico">' + RI.icon(r.device.mobile ? 'phone' : 'monitor') + '</span><div><b>' + esc(r.device.browser + (r.device.os ? ' روی ' + r.device.os : '')) + '</b>' + (r.current ? ' <span class="chip chip--ok">همین دستگاه</span>' : '') + '<div class="field__hint">آخرین فعالیت: ' + esc(when(r.lastSeen || r.createdAt)) + '</div></div></div>' + (r.current ? '' : '<button type="button" class="btn btn--soft btn--sm" data-revoke="' + esc(r.id) + '" aria-label="خروج از ' + esc(r.device.browser) + '">' + RI.icon('logout') + 'خروج</button>') + '</div>').join('') : '<p class="field__hint">نشست فعالی پیدا نشد</p>';
      };
      RI.accountRequest('sessions').then(r => drawSessions(r.sessions)).catch(e => { if (active()) { sessionsBox.removeAttribute('aria-busy'); sessionsBox.innerHTML = '<p class="field__hint">' + esc(e.message) + '</p>'; } });
      RI.delegate(root, 'click', '[data-revoke]', async (e, b) => {
        if (b.disabled) return; b.disabled = true;
        try { drawSessions((await RI.accountRequest('sessions/revoke', { id: b.dataset.revoke })).sessions); RI.toast('نشست آن دستگاه بسته شد'); }
        catch (err) { RI.toast(err.message, { kind: 'error' }); b.disabled = false; }
      });
      RI.delegate(root, 'click', '[data-revoke-others]', async (e, b) => {
        if (b.disabled) return;
        if (!await RI.confirm({ title: 'خروج از همهٔ دستگاه‌های دیگر', text: 'همهٔ نشست‌ها به‌جز همین مرورگر بسته می‌شوند و آن دستگاه‌ها باید دوباره وارد شوند.', danger: true, icon: 'logout', confirmLabel: 'خروج از بقیه' })) return;
        b.disabled = true;
        try { const r = await RI.accountRequest('sessions/revoke-others', {}); drawSessions(r.sessions); RI.toast(r.closed ? RI.fa(r.closed) + ' نشست دیگر بسته شد' : 'نشست دیگری باز نبود'); }
        catch (err) { RI.toast(err.message, { kind: 'error' }); }
        finally { b.disabled = false; }
      });
      RI.delegate(root, 'click', '[data-delete]', () => {
        const m = RI.modal({ title: 'حذف حساب', size: 'sm', body: '<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>این کار برگشت‌ناپذیر است</b>رزومه، صفحهٔ لینک، آمار، موجودی و خریدهای حساب حذف می‌شوند و آدرس صفحه آزاد می‌شود. پیش از حذف، برای تعیین تکلیف موجودی با پشتیبانی تماس بگیر. سوابق پرداخت بدون اتصال به حساب برای پیگیری مالی باقی می‌مانند</div></div><div class="field" style="margin-top:16px" data-field="w"><label class="field__label" for="dw">برای تأیید، کلمهٔ «حذف» را بنویس</label><input class="input" id="dw" autocomplete="off"><div class="field__error" role="alert" hidden></div></div><div class="field" data-field="p"><label class="field__label" for="dp">رمز فعلی حساب</label><input class="input" id="dp" type="password" autocomplete="current-password" maxlength="128"><div class="field__hint">اگر فقط با گوگل یا گیت‌هاب وارد می‌شوی و رمز نساختی، خالی بگذار.</div><div class="field__error" role="alert" hidden></div></div>', actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'حذف حساب', kind: 'danger', icon: 'trash', keepOpen: true, onClick: async (api,event,button) => { if (RI.$('#dw', api.body).value.trim() !== 'حذف') { RI.showFieldError(api.body, 'w', 'برای ادامه باید دقیقاً «حذف» را بنویسی'); return false; } button.disabled=true;try{await RI.dashboardRequest('delete',{confirm:'DELETE',password:RI.$('#dp', api.body).value});RI.state.ui.dirty=false;RI.clearDraft();location.replace('/register/');}catch(e){if(e.code==='PASSWORD_REQUIRED')RI.showFieldError(api.body,'p',e.message);else RI.toast(e.message,{kind:'error'});button.disabled=false;} } }] });
      });
    },
  });
})();
