/* تنظیمات حساب: مشخصات، ورود و امنیت و داده‌ها؛ نمایش عمومی راه‌های تماس فقط در مرحلهٔ تماس رزومه است */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const SECTIONS = [['profile', 'مشخصات', 'user', 'نام و شمارهٔ موبایل'], ['security', 'ورود و امنیت', 'shield', 'رمز، گوگل، گیت‌هاب و دستگاه‌ها'], ['data', 'داده‌ها و حساب', 'download', 'خروجی و حذف حساب']];
  const phone = n => esc(String(n || '').replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3'));

  function profile(a) {
    const c = RI.C(), plan = RI.hasSub() && RI.PLANS[RI.state.billing.plan.id];
    return '<div class="nv-identity"><img src="' + esc(RI.avatarOf(c.profile)) + '" alt="" width="64" height="64"><div><b>' + esc(a.name || 'بدون نام') + '</b><span><bdi dir="ltr">' + phone(a.mobile) + '</bdi>' + (a.mobileVerified ? '<span class="nv-chip nv-chip--ok">' + RI.icon('check') + 'تأییدشده</span>' : '<span class="nv-chip nv-chip--warn">تأییدنشده</span>') + '<span class="nv-chip nv-chip--accent">' + RI.icon('crown') + (plan ? 'اشتراک ' + esc(plan.name) : 'حساب رایگان') + '</span></span></div></div>' +
      '<section class="nv-set"><div class="nv-set__head"><h3>نام حساب</h3><p>نامی که در فاکتورها، پشتیبانی و پیام‌ها دیده می‌شود. برای انتشار صفحه، نام و نام خانوادگی لازم است.</p></div><div class="nv-form"><div class="nv-form__row"><div class="field"><label class="field__label" for="a_name">نام</label><input class="input" id="a_name" autocomplete="given-name" value="' + esc(a.firstName || '') + '" maxlength="39"></div><div class="field"><label class="field__label" for="a_last">نام خانوادگی</label><input class="input" id="a_last" autocomplete="family-name" maxlength="39" value="' + esc(a.lastName || '') + '"></div></div><div class="nv-actions"><button type="button" class="btn btn--primary" data-name>' + RI.icon('check') + 'ذخیرهٔ نام</button><p class="nv-status" data-name-status></p></div></div></section>' +
      '<section class="nv-set"><div class="nv-set__head"><h3>شمارهٔ موبایل</h3><p>کد ورود و تأییدها به این شماره پیامک می‌شود.</p></div><div class="nv-row"><span class="nv-ico' + (a.mobileVerified ? ' nv-ico--ok' : ' nv-ico--warn') + '">' + RI.icon('phone') + '</span><span class="nv-row__main"><span class="nv-row__title"><bdi dir="ltr">' + (a.mobile ? phone(a.mobile) : 'شماره‌ای ثبت نشده') + '</bdi></span><span class="nv-row__meta">' + (a.mobileVerified ? 'تأیید شده و برای ورود قابل استفاده است' : 'برای انتشار و امنیت حساب، شماره را تأیید کن') + '</span></span><button type="button" class="btn btn--soft btn--sm" data-mobile>' + (a.mobile ? 'تغییر یا تأیید' : 'افزودن شماره') + '</button></div></section>' +
      '<a class="nv-link" href="' + RI.routeUrl('resume', { step: 'contacts' }) + '" data-go="resume" data-step="contacts">نمایش عمومی راه‌های تماس را در مرحلهٔ تماس رزومه تعیین کن' + RI.icon('chevL') + '</a>';
  }
  function security(a) {
    const provider = (k, label) => '<div class="nv-provider' + (a[k] ? ' is-on' : '') + '"><span class="nv-provider__logo">' + RI.icon(k) + '</span><span class="nv-row__main"><span class="nv-row__title">' + label + '</span><span class="nv-row__meta">' + (a[k] ? 'متصل است؛ می‌توانی با آن وارد شوی' : 'متصل نیست') + '</span></span><button type="button" class="btn btn--sm ' + (a[k] ? 'btn--ghost' : 'btn--soft') + '" data-conn="' + k + '">' + (a[k] ? 'قطع اتصال' : 'اتصال') + '</button></div>';
    return '<section class="nv-set"><div class="nv-set__head"><h3>رمز عبور</h3><p>تغییر رمز با کد پیامکی انجام می‌شود و همهٔ نشست‌های قبلی را می‌بندد.</p></div><div class="nv-row"><span class="nv-ico">' + RI.icon('key') + '</span><span class="nv-row__main"><span class="nv-row__title">رمز حساب</span><span class="nv-row__meta">ورود با رمز یا کد یک‌بارمصرف پیامکی</span></span><button type="button" class="btn btn--soft btn--sm" data-pass>تغییر رمز</button></div></section>' +
      '<section class="nv-set"><div class="nv-set__head"><h3>ورود با حساب‌های دیگر</h3><p>با اتصال، بدون رمز و فقط با یک کلیک وارد می‌شوی.</p></div><div class="nv-providers">' + provider('google', 'گوگل') + provider('github', 'گیت‌هاب') + '</div></section>' +
      '<section class="nv-set"><div class="nv-set__head nv-set__head--row"><div><h3>دستگاه‌های واردشده</h3><p>هر دستگاهی که نمی‌شناسی را خارج کن.</p></div><button type="button" class="btn btn--ghost btn--sm" data-revoke-others hidden>' + RI.icon('logout') + 'خروج همهٔ دستگاه‌های دیگر</button></div><div data-sessions aria-live="polite" aria-busy="true"><div class="nv-skeleton" style="height:48px"></div></div></section>';
  }
  function data(a) {
    return '<section class="nv-set"><div class="nv-set__head"><h3>خروجی اطلاعات</h3><p>فایل JSON از محتوا، تنظیمات و وضعیت انتشار جایگاه فعال؛ بدون رمز یا نشست.</p></div><div class="nv-row"><span class="nv-ico nv-ico--blue">' + RI.icon('download') + '</span><span class="nv-row__main"><span class="nv-row__title">دریافت فایل خروجی</span><span class="nv-row__meta">resumeit-export.json</span></span><button type="button" class="btn btn--soft btn--sm" data-export>دریافت</button></div></section>' +
      (a.isOwner ? '<section class="nv-set"><div class="nv-set__head"><h3>مالکیت این حساب</h3><p>تو مالک سایت هستی؛ پیش از حذف حساب، مالک دیگری باید نقش تو را تغییر دهد.</p></div><a class="btn btn--soft btn--sm" href="/admin/users/">' + RI.icon('shield') + 'مدیریت نقش‌ها</a></section>'
        : '<section class="nv-set nv-danger"><div class="nv-set__head"><h3>حذف حساب</h3><p>رزومه، صفحهٔ لینک، آمار، موجودی و خریدها پاک می‌شوند و آدرس صفحه آزاد می‌شود. این کار برگشت ندارد.</p></div><button type="button" class="btn btn--danger-soft" data-delete>' + RI.icon('trash') + 'حذف همیشگی حساب</button></section>');
  }

  RI.registerPage('settings', {
    title: 'تنظیمات حساب',
    render(ctx) {
      const a = RI.state.account, initial = new URLSearchParams(location.search).get('tab'), tab = SECTIONS.some(s => s[0] === initial) ? initial : 'profile';
      const panels = { profile: profile(a), security: security(a), data: data(a) };
      return '<div class="nv nv-settings"><header class="nv-head"><div><p class="nv-head__eyebrow">' + RI.icon('settings') + 'حساب</p><h1 id="page-title" tabindex="-1">تنظیمات حساب</h1><p>مشخصات، روش‌های ورود و داده‌های حسابت.</p></div></header>' +
        '<div class="nv-settings__layout"><nav class="nv-vtabs" role="tablist" aria-label="بخش‌های تنظیمات" aria-orientation="vertical">' + SECTIONS.map(([id, label, glyph, hint]) => '<button type="button" role="tab" id="set-tab-' + id + '" aria-controls="set-panel-' + id + '" data-workspace-tab="' + id + '" aria-selected="' + (id === tab) + '"><span class="nv-ico">' + RI.icon(glyph) + '</span><span><b>' + label + '</b><small>' + hint + '</small></span></button>').join('') + '</nav>' +
        '<div class="nv-card nv-settings__panel">' + SECTIONS.map(([id]) => '<div role="tabpanel" id="set-panel-' + id + '" aria-labelledby="set-tab-' + id + '"' + (id === tab ? '' : ' hidden') + '>' + panels[id] + '</div>').join('') + '</div></div></div>';
    },
    mount(root) {
      const a = RI.state.account, owner = RI.ownerId, active = () => root.isConnected && owner === RI.ownerId;
      RI.delegate(root, 'click', '[data-workspace-tab]', (e, b) => { const id = b.dataset.workspaceTab; root.querySelectorAll('[data-workspace-tab]').forEach(t => t.setAttribute('aria-selected', String(t === b))); root.querySelectorAll('[role=tabpanel]').forEach(p => { p.hidden = p.id !== 'set-panel-' + id; }); RI.setRouteTab(id, 'profile'); });
      RI.delegate(root, 'click', '[data-name]', async (e, b) => {
        if (b.disabled) return; const fields = [RI.$('#a_name', root), RI.$('#a_last', root)], values = { firstName: fields[0].value.trim(), lastName: fields[1].value.trim() }, feedback = root.querySelector('[data-name-status]');
        feedback.removeAttribute('data-kind'); feedback.setAttribute('role', 'status'); feedback.textContent = 'در حال ذخیره…'; b.disabled = true; fields.forEach(input => input.disabled = true);
        try { await RI.accountRequest('account/names', values); if (!active()) return; await RI.reloadAccount(); if (active()) { RI.rerender(); RI.toast('نام حساب ذخیره شد'); } }
        catch (error) { if (active()) { feedback.dataset.kind = 'error'; feedback.setAttribute('role', 'alert'); feedback.textContent = error.message; } }
        finally { b.disabled = false; fields.forEach(input => input.disabled = false); }
      });
      RI.delegate(root, 'click', '[data-mobile]', () => RI.phoneDialog());
      RI.delegate(root, 'click', '[data-pass]', async () => { if (await RI.leaveGuard()) location.assign('/forgot-password/'); });
      RI.delegate(root, 'click', '[data-conn]', async (e, b) => {
        const k = b.dataset.conn, nm = k === 'google' ? 'گوگل' : 'گیت‌هاب'; if (b.disabled) return; b.disabled = true;
        try {
          if (a[k]) { if (await RI.confirm({ title: 'قطع اتصال ' + nm, text: 'با قطع اتصال، دیگر با ' + nm + ' وارد این حساب نمی‌شوی.', danger: true, icon: 'link', confirmLabel: 'قطع اتصال' }) && active()) { await RI.accountRequest('social/unlink', { provider: k }); if (!active()) return; await RI.reloadAccount(); if (active()) { RI.rerender(); RI.toast('اتصال ' + nm + ' قطع شد', { kind: 'info' }); } } }
          else window.location.href = '/api/auth/' + k + '/start?mode=link';
        } catch (error) { if (active()) RI.toast(error.message, { kind: 'error' }); }
        finally { b.disabled = false; }
      });
      RI.delegate(root, 'click', '[data-export]', async () => {
        let versions = []; try { versions = (await RI.dashboardRequest('versions?full=1')).versions; } catch { /* the export still works without them */ }
        const out = { _note: 'خروجی اطلاعات ResumeIt', account: { name: a.name, mobile: a.mobile }, content: RI.C(), preferences: { indexing: a.indexing, brand: a.brand }, publication: RI.state.pub, versions };
        const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); l.download = 'resumeit-export.json'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 500); RI.toast('فایل اطلاعات دانلود شد');
      });
      const box = RI.$('[data-sessions]', root), others = RI.$('[data-revoke-others]', root);
      const when = t => { try { return t ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(t) : 'نامشخص'; } catch { return 'نامشخص'; } };
      const draw = rows => {
        if (!active()) return; box.removeAttribute('aria-busy'); others.hidden = !rows.some(r => !r.current);
        box.innerHTML = rows.length ? '<ul class="nv-list">' + rows.map(r => '<li class="nv-row"><span class="nv-ico' + (r.current ? ' nv-ico--ok' : ' nv-ico--blue') + '">' + RI.icon(r.device.mobile ? 'phone' : 'monitor') + '</span><span class="nv-row__main"><span class="nv-row__title">' + esc(r.device.browser + (r.device.os ? ' روی ' + r.device.os : '')) + (r.current ? ' <span class="nv-chip nv-chip--ok">همین دستگاه</span>' : '') + '</span><span class="nv-row__meta">آخرین فعالیت: ' + esc(when(r.lastSeen || r.createdAt)) + '</span></span>' + (r.current ? '' : '<button type="button" class="btn btn--ghost btn--sm" data-revoke="' + esc(r.id) + '" aria-label="خروج از ' + esc(r.device.browser) + '">خروج</button>') + '</li>').join('') + '</ul>' : '<p class="nv-status">نشست فعالی پیدا نشد</p>';
      };
      RI.accountRequest('sessions').then(r => draw(r.sessions)).catch(e => { if (active()) { box.removeAttribute('aria-busy'); box.innerHTML = '<p class="nv-status" data-kind="error">' + esc(e.message) + '</p>'; } });
      RI.delegate(root, 'click', '[data-revoke]', async (e, b) => { if (b.disabled) return; b.disabled = true; try { draw((await RI.accountRequest('sessions/revoke', { id: b.dataset.revoke })).sessions); RI.toast('نشست آن دستگاه بسته شد'); } catch (err) { RI.toast(err.message, { kind: 'error' }); b.disabled = false; } });
      RI.delegate(root, 'click', '[data-revoke-others]', async (e, b) => {
        if (b.disabled) return; if (!await RI.confirm({ title: 'خروج همهٔ دستگاه‌های دیگر', text: 'همهٔ نشست‌ها به‌جز همین مرورگر بسته می‌شوند.', danger: true, icon: 'logout', confirmLabel: 'خروج بقیه' })) return; b.disabled = true;
        try { const r = await RI.accountRequest('sessions/revoke-others', {}); draw(r.sessions); RI.toast(r.closed ? RI.fa(r.closed) + ' نشست دیگر بسته شد' : 'نشست دیگری باز نبود'); } catch (err) { RI.toast(err.message, { kind: 'error' }); } finally { b.disabled = false; }
      });
      RI.delegate(root, 'click', '[data-delete]', () => {
        RI.modal({ title: 'حذف حساب', size: 'sm', body: '<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>این کار برگشت‌ناپذیر است</b>رزومه، صفحهٔ لینک، آمار، موجودی و خریدهای حساب حذف می‌شوند و آدرس صفحه آزاد می‌شود. پیش از حذف، برای تعیین تکلیف موجودی با پشتیبانی تماس بگیر. سوابق پرداخت بدون اتصال به حساب برای پیگیری مالی باقی می‌مانند</div></div><div class="field" style="margin-top:16px" data-field="w"><label class="field__label" for="dw">برای تأیید، کلمهٔ «حذف» را بنویس</label><input class="input" id="dw" autocomplete="off"><div class="field__error" role="alert" hidden></div></div><div class="field" data-field="p"><label class="field__label" for="dp">رمز فعلی حساب</label><input class="input" id="dp" type="password" autocomplete="current-password" maxlength="128"><div class="field__hint">اگر فقط با گوگل یا گیت‌هاب وارد می‌شوی و رمز نساختی، خالی بگذار.</div><div class="field__error" role="alert" hidden></div></div>', actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'حذف حساب', kind: 'danger', icon: 'trash', keepOpen: true, onClick: async (api, event, button) => { if (RI.$('#dw', api.body).value.trim() !== 'حذف') { RI.showFieldError(api.body, 'w', 'برای ادامه باید دقیقاً «حذف» را بنویسی'); return false; } button.disabled = true; try { await RI.dashboardRequest('delete', { confirm: 'DELETE', password: RI.$('#dp', api.body).value }); RI.state.ui.dirty = false; RI.clearDraft(); location.replace('/register/'); } catch (e) { if (e.code === 'PASSWORD_REQUIRED') RI.showFieldError(api.body, 'p', e.message); else RI.toast(e.message, { kind: 'error' }); button.disabled = false; } } }] });
      });
    },
  });
})();
