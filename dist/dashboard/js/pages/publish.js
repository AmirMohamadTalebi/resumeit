/* انتشار، در زبان صفحهٔ اصلی: بالای صفحه آسمان شب با نوار آدرس یک مرورگر که آدرس تو را زنده تایپ می‌کند و چراغ
   وضعیت هر صفحه؛ زیرش سه زبانه: «انتشار» (کارت هر صفحه با مسیر پیش‌نویس ← آماده ← منتشر، کارهای ماندهٔ ضروری و دکمه‌ها)،
   «آدرس» (سازندهٔ آدرس با بررسی زندهٔ آزاد بودن، پیشنهادها، مسیر رزومه و لینک‌ها و فهرست آدرس‌ها) و «کارت لینک»
   (عنوان، توضیح و تصویری که پیام‌رسان‌ها و جست‌وجو نشان می‌دهند، با پیش‌نمایش گفت‌وگو و نتیجهٔ جست‌وجو). */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const TABS = [['go', 'انتشار', 'rocket'], ['address', 'آدرس', 'globe'], ['share', 'کارت لینک و جست‌وجو', 'external']];
  const pageName = k => k === 'resume' ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها';

  RI.registerPage('publish', {
    title: 'آدرس و انتشار',
    render() {
      return '<div class="pb"><section class="pb-hero" aria-labelledby="page-title" data-workspace-anchor><div class="pb-hero__sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="pb-hero__copy"><p class="pb-eyebrow">' + RI.icon('rocket') + 'آدرس و انتشار</p><h1 id="page-title" tabindex="-1">صفحه‌ات را <em>به همه</em> نشان بده</h1><p>یک آدرس ماندگار انتخاب کن، قبل از انتشار ببین و هر وقت خواستی نسخهٔ تازه را عمومی کن.</p>' +
        '<a class="btn pb-ghost" href="' + RI.routeUrl('studio') + '" data-go="studio">' + RI.icon('check') + 'آمادگی انتشار</a></div>' +
        '<div class="pb-browser" aria-hidden="true"><div class="pb-browser__bar"><span class="pb-dots"><i></i><i></i><i></i></span><span class="pb-addr">' + RI.icon('shield') + '<bdi dir="ltr" data-pb-addr></bdi><i class="pb-caret"></i></span></div><div class="pb-browser__body" data-pb-lights></div></div></section>' +
        '<div class="tabs workspace-tabs pb-tabs" role="tablist" id="ptabs" aria-label="بخش‌های انتشار">' + TABS.map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + RI.icon(t[2]) + '<span>' + t[1] + '</span></button>').join('') + '<span class="pb-tabs__ink" aria-hidden="true"></span></div><div id="pbody" class="pb-body"></div></div>';
    },
    mount(root, ctx) {
      let tab = (ctx.opts && ctx.opts.anchor === 'share') ? 'share' : (ctx.opts && ctx.opts.anchor === 'slug') ? 'address' : 'go';
      const body = RI.$('#pbody', root), C = () => RI.C(), calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let slugTimer = 0, typeTimer = 0, shareKind = RI.workspaceSlot === 3 ? 'links' : 'resume';

      /* ---------- The browser bar in the hero: types the address, then follows every change ---------- */
      function heroAddress(animate) {
        const el = RI.$('[data-pb-addr]', root), u = RI.urls(), ok = RI.slugCheck(C().slug).state === 'ok';
        const text = ok ? (RI.workspaceSlot === 3 ? u.links : u.resume || u.links).replace(/^https:\/\//, '') : (RI.workspaceSlot === 3 ? RI.DOMAIN.toLowerCase() + '/your-name' : 'your-name.' + RI.DOMAIN.toLowerCase());
        clearTimeout(typeTimer);
        if (!animate || calm) { el.textContent = text; return; }
        let i = 0; const step = () => { el.textContent = text.slice(0, ++i); if (i < text.length) typeTimer = setTimeout(step, 38); }; el.textContent = ''; typeTimer = setTimeout(step, 450);
      }
      function heroLights() {
        RI.$('[data-pb-lights]', root).innerHTML = RI.pageKinds().map(k => { const s = RI.state.pub[k], live = s.status === 'published', dirty = RI.pubDirty(k); return '<span class="pb-light is-' + (live ? (dirty ? 'warn' : 'ok') : 'draft') + '"><i></i><b>' + pageName(k) + '</b><small>' + (live ? (dirty ? 'تغییر منتشرنشده' : 'روی هواست') : 'پیش‌نویس') + '</small></span>'; }).join('');
      }

      /* ---------- Publish tab ---------- */
      function pubCard(k, rd, n) {
        const s = RI.state.pub[k], live = s.status === 'published', dirty = RI.pubDirty(k), u = RI.urls(), url = k === 'resume' ? u.resume : u.links;
        const list = k === 'resume' ? rd.resume : rd.links, missing = list.filter(i => i.req && !i.done), ok = (k === 'resume' ? rd.resumeOk : rd.linksOk) && RI.canWorkspace(RI.workspaceSlot);
        const stage = live ? (dirty ? 2 : 3) : ok ? 1 : 0;
        const steps = [['پیش‌نویس', 'edit'], ['آماده', 'check'], ['منتشر', 'rocket']].map(([label, icon], i) => '<li class="' + (stage > i || (stage === 3 && i === 2) ? 'is-done' : stage === i ? 'is-now' : '') + '"><span>' + RI.icon(icon) + '</span>' + label + '</li>').join('');
        const chip = live ? (dirty ? '<span class="pb-chip is-warn">' + RI.icon('edit') + 'تغییرات منتشرنشده</span>' : '<span class="pb-chip is-ok">' + RI.icon('check') + 'منتشر شده</span>') : '<span class="pb-chip">پیش‌نویس</span>';
        return '<section class="pubcard pb-card" style="--i:' + n + '" aria-label="' + pageName(k) + '"><header class="pb-card__head"><span class="pb-card__ico is-' + k + '">' + RI.icon(k === 'resume' ? 'resume' : 'link') + '</span><div><h2>' + pageName(k) + '</h2><p>' + (live ? 'نسخهٔ ' + RI.fa(s.version) + (dirty ? ' منتشر است و تغییرات تازه هنوز عمومی نشده' : ' منتشر است؛ آخرین به‌روزرسانی ' + RI.date(s.at)) : 'هنوز منتشر نشده؛ فقط تو می‌بینی‌اش') + '</p></div>' + chip + '</header>' +
          '<ol class="pb-stages" aria-label="مرحلهٔ انتشار">' + steps + '</ol>' +
          '<div class="pb-urlbox"><span class="pb-urlbox__lock">' + RI.icon('shield') + '</span><bdi dir="ltr">' + esc(url) + '</bdi><button type="button" class="pb-icon" data-copy="' + esc(url) + '" aria-label="کپی آدرس">' + RI.icon('copy') + '</button>' + (live ? '<button type="button" class="pb-icon" data-open-url="' + esc(url) + '" aria-label="باز کردن صفحه">' + RI.icon('external') + '</button>' : '') + '</div>' +
          (missing.length ? '<div class="pb-todo"><b>' + RI.icon('alert') + RI.fa(missing.length) + ' کار ضروری مانده</b><ul>' + missing.slice(0, 4).map(i => '<li><button type="button" data-fix="' + i.id + '">' + esc(i.label) + RI.icon('chevL') + '</button></li>').join('') + '</ul></div>' : !RI.canWorkspace(RI.workspaceSlot) ? '' : '<p class="pb-ready">' + RI.icon('check') + 'آمادهٔ ساخت نسخهٔ عمومی</p>') +
          '<div class="pb-actions"><button type="button" class="btn btn--soft" data-pv="' + k + '">' + RI.icon('eye') + 'پیش‌نمایش</button>' +
          (live ? '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (dirty && ok ? '' : 'disabled') + '>' + RI.icon('refresh') + 'به‌روزرسانی نسخهٔ منتشرشده</button><button type="button" class="btn btn--danger-soft" data-unpub="' + k + '">' + RI.icon('eyeOff') + 'برداشتن از انتشار</button>' : '<button type="button" class="btn btn--primary" data-pub="' + k + '" ' + (ok ? '' : 'disabled') + '>' + RI.icon('rocket') + 'انتشار</button>') + '</div></section>';
      }
      function goTab() {
        const rd = RI.readiness(), paused = !RI.canWorkspace(RI.workspaceSlot);
        return (paused ? '<div class="pb-banner">' + RI.icon('alert') + '<div><b>این جایگاه با دسترسی یا سهمیهٔ فعلی قابل انتشار نیست.</b><p>پیش‌نویس و نسخه‌های قبلی حفظ شده‌اند؛ سهمیه و وضعیت اشتراک را بررسی کن.</p></div><a class="btn btn--soft" href="' + RI.routeUrl('billing') + '" data-go="billing">بررسی دسترسی</a></div>' : '') +
          '<div class="publication-grid pb-grid">' + RI.pageKinds().map((k, i) => pubCard(k, rd, i)).join('') + '</div>' +
          '<p class="pb-foot">' + RI.icon('info') + 'ویرایش‌ها تا وقتی دوباره منتشر نکنی عمومی نمی‌شوند؛ برداشتن از انتشار هم محتوایت را پاک نمی‌کند.</p>';
      }

      /* ---------- Address tab ---------- */
      function slugMsg(r, checking) {
        if (checking) return '<div class="slugstat pb-avail is-checking"><span class="spinner"></span>در حال بررسی آزاد بودن نام…</div>';
        if (r.state === 'ok') return '<div class="slugstat pb-avail is-ok">' + RI.icon('check') + r.msg + '</div>';
        if (r.state === 'empty') return '<div class="slugstat pb-avail">' + RI.icon('info') + r.msg + '</div>';
        let sug = '';
        if (r.state === 'taken') { const s = RI.suggestSlugs(C().slug); sug = s.length ? '<div class="pb-sugs"><span>پیشنهاد:</span>' + s.map((x, i) => '<button type="button" class="ltr-inline" data-sug="' + x + '" style="--i:' + i + '">' + x + '</button>').join('') + '</div>' : ''; }
        return '<div class="slugstat pb-avail is-bad" role="alert">' + RI.icon('alert') + r.msg + '</div>' + sug;
      }
      function addressWarning() { return RI.pageKinds().some(k => RI.state.pub[k].status === 'published') && C().slug !== RI.savedSlug ? '<div class="pb-banner is-warn">' + RI.icon('alert') + '<div><b>آدرس منتشرشده عوض می‌شود</b><p>پس از ذخیرهٔ نام جدید، آدرس قبلی دیگر کار نمی‌کند و لینک‌های اشتراک‌گذاری‌شده باید عوض شوند.</p></div></div>' : ''; }
      function addressRows() {
        const u = RI.urls(), ok = RI.slugCheck(C().slug).state === 'ok';
        return [['resume', 'resume', u.resume], ['links', 'link', u.links]].filter(x => RI.pageKinds().includes(x[0])).map(([k, icon, url], i) => {
          const live = RI.state.pub[k].status === 'published', dirty = RI.pubDirty(k);
          return '<div class="urlrow pb-row' + (ok ? '' : ' is-off') + '" style="--i:' + i + '"><span class="pb-row__ico">' + RI.icon(icon) + '</span><div class="pb-row__main"><div class="pb-row__title"><b>' + pageName(k) + '</b>' + (live ? '<span class="pb-chip is-ok">منتشر شده</span>' + (dirty ? '<span class="pb-chip is-warn">تغییرات منتشرنشده</span>' : '') : '<span class="pb-chip">پیش‌نویس</span>') + '</div>' +
            (ok ? '<div class="pb-urlbox is-small"><bdi dir="ltr">' + esc(url) + '</bdi><button type="button" class="pb-icon" data-copy="' + esc(url) + '" aria-label="کپی آدرس">' + RI.icon('copy') + '</button><button type="button" class="pb-icon" data-open-url="' + esc(url) + '" aria-label="باز کردن">' + RI.icon('external') + '</button></div>' : '<p class="pb-hint">با انتخاب یک نام معتبر، آدرس این‌جا ظاهر می‌شود.</p>') +
            (live && dirty ? '<p class="pb-hint">آدرس بر اساس پیش‌نویس فعلی است.</p>' : '') + '</div></div>';
        }).join('');
      }
      function addressTab() {
        const r = RI.slugCheck(C().slug), slot3 = RI.workspaceSlot === 3, routes = C().routing || (C().routing = { resume: '', links: 'link' });
        return '<div class="pb-two"><section class="pb-panel pb-builder" aria-labelledby="pb-name"><header><h2 id="pb-name">' + RI.icon('globe') + (slot3 ? 'نام صفحه روی دامنهٔ اصلی' : 'نام صفحه (زیردامنه)') + '</h2><p>کوتاه و ماندگار؛ حروف کوچک انگلیسی، عدد و خط تیره.</p></header>' +
          '<div class="pb-addrfield" id="slugField"><span class="pb-addrfield__fix" dir="ltr">' + (slot3 ? 'https://' + RI.DOMAIN.toLowerCase() + '/' : 'https://') + '</span><label class="sr-only" for="slug">نام صفحه</label><input id="slug" dir="ltr" value="' + esc(C().slug) + '" maxlength="24" autocomplete="off" spellcheck="false" placeholder="your-name" aria-describedby="slugmsg" aria-invalid="' + (r.state === 'invalid' || r.state === 'taken') + '">' + (slot3 ? '' : '<span class="pb-addrfield__fix input-group__addon" dir="ltr">.' + RI.DOMAIN.toLowerCase() + '</span>') + '</div>' +
          '<div id="slugmsg" aria-live="polite">' + slugMsg(r) + '</div><div data-address-warning>' + addressWarning() + '</div>' +
          '<ul class="pb-rules"><li>' + RI.icon('check') + '۳ تا ۲۴ نویسه: a تا z، ۰ تا ۹ و خط تیره</li><li>' + RI.icon('check') + 'بدون فاصله، حرف فارسی یا دو خط تیرهٔ پشت‌سرهم</li><li>' + RI.icon('check') + 'نام‌های سیستمی مثل admin، api و contact رزرو شده‌اند</li></ul></section>' +
          '<section class="pb-panel" aria-labelledby="pb-urls"><header><h2 id="pb-urls">' + RI.icon('link') + 'آدرس‌های تو</h2><p>رزومه و صفحهٔ لینک دو صفحهٔ مستقل‌اند که از منوی خودشان به هم وصل می‌شوند.</p></header><div class="urlrows pb-rows" data-address-rows>' + addressRows() + '</div>' +
          (slot3 ? '<p class="pb-hint">این جایگاه فقط صفحهٔ لینک است: <b class="ltr-inline">' + esc(RI.DOMAIN.toLowerCase() + '/' + (C().slug || 'name3')) + '</b></p>' :
            '<div class="pb-paths"><h3>' + RI.icon('settings') + 'مسیر هر صفحه</h3><label class="pb-field"><span>مسیر رزومه <small>اختیاری</small></span><span class="pb-path"><span dir="ltr">/</span><input id="resume-path" dir="ltr" maxlength="24" value="' + esc(routes.resume) + '" placeholder="خالی = ریشهٔ زیردامنه"></span></label><label class="pb-field"><span>مسیر صفحهٔ لینک <small>همیشه دارای نام</small></span><span class="pb-path"><span dir="ltr">/</span><input id="links-path" dir="ltr" maxlength="24" value="' + esc(routes.links) + '" placeholder="link"></span></label><p class="pb-hint">۱ تا ۲۴ نویسه، یکسان یا سیستمی نباشند؛ out، share-image، api و admin رزرو شده‌اند. تغییر مسیر بعد از انتشار دوباره عمومی می‌شود.</p><p role="status" class="pb-status" data-route-message></p></div>') + '</section></div>';
      }

      /* ---------- Link card tab ---------- */
      function shareTab() {
        const s = C().share, u = RI.urls(), p = C().profile, card = RI.shareCard(C(), shareKind), address = u[shareKind];
        const host = String(address || '').replace(/^https:\/\//, '');
        return '<div class="pb-kinds segmented" role="group" aria-label="صفحهٔ کارت لینک">' + [['resume', 'رزومه'], ['links', 'صفحهٔ لینک‌ها']].filter(([id]) => RI.workspaceSlot !== 3 || id === 'links').map(([id, label]) => '<button type="button" data-share-kind="' + id + '" aria-pressed="' + (id === shareKind) + '">' + label + '</button>').join('') + '</div>' +
          '<div class="pb-two"><section class="pb-panel" aria-labelledby="pb-card"><header><h2 id="pb-card">' + RI.icon('edit') + 'وقتی لینکت را می‌فرستند…</h2><p>عنوان، توضیح و تصویری که پیام‌رسان‌ها و جست‌وجو نشان می‌دهند؛ نمایش نهایی به سرویس مقصد بستگی دارد.</p></header>' +
          '<div class="field"><label class="field__label" for="sh_t">عنوان<span class="field__count" id="shc1"></span></label><input class="input" id="sh_t" maxlength="60" value="' + esc(s.title) + '" placeholder="' + esc(p.name || 'نام و عنوان تو') + '"></div>' +
          '<div class="field"><label class="field__label" for="sh_d">توضیح<span class="field__count" id="shc2"></span></label><textarea class="textarea" id="sh_d" rows="3" maxlength="160" placeholder="یک جملهٔ جذاب دربارهٔ خودت">' + esc(s.desc) + '</textarea></div>' +
          '<div class="field"><div class="field__label">تصویر اشتراک‌گذاری</div>' + RI.imageFieldHtml('shimg', { value: s.image, wide: true, label: 'تصویر اشتراک‌گذاری' }) + '<div class="field__hint">اندازهٔ پیشنهادی ۱۲۰۰×۶۳۰</div></div>' +
          '<div class="pb-switch"><div><b>نمایش در نتایج جست‌وجو</b><p class="pb-hint">خاموش کردن، درخواست noindex می‌فرستد؛ صفحهٔ عمومی را خصوصی نمی‌کند.</p></div>' + RI.switchHtml({ checked: RI.state.account.indexing, label: 'ایندکس در جست‌وجو' }).replace('<input', '<input id="idx"') + '</div></section>' +
          '<section class="pb-panel pb-previews" aria-labelledby="pb-look"><header><h2 id="pb-look">' + RI.icon('eye') + 'این‌طور دیده می‌شود</h2></header>' +
          '<div class="pb-chat"><span class="pb-chat__msg">این صفحهٔ منه 👇</span><div class="sharecard pb-sharecard"><div class="sharecard__img" style="' + esc(RI.bg(card.image) || '') + '"></div><div class="sharecard__body"><small class="ltr">' + esc(host) + '</small><b>' + esc(card.title) + '</b><p>' + esc(card.desc) + '</p></div></div></div>' +
          '<div class="pb-serp" aria-label="نتیجهٔ جست‌وجو"><small dir="ltr">' + esc(host) + '</small><b data-serp-title>' + esc(card.title) + '</b><p data-serp-desc>' + esc(card.desc) + '</p></div>' +
          '<div class="pb-actions"><button type="button" class="btn btn--soft" data-native-share>' + RI.icon('external') + 'فرستادن این صفحه</button><button type="button" class="btn btn--ghost" data-copy="' + esc(address) + '">' + RI.icon('copy') + 'کپی آدرس</button><button type="button" class="btn btn--ghost" data-share-qr>' + RI.icon('layers') + 'کد QR</button></div>' +
          '<p class="pb-hint">متن و تصویر اختصاصی روی هر دو صفحه اعمال می‌شوند؛ بدون آن‌ها، مشخصات همان صفحه استفاده می‌شود. برای عمومی‌شدن تغییرات، همان صفحه را دوباره منتشر کن.</p></section></div>';
      }

      function paint() {
        body.innerHTML = '<div class="pb-pane" data-pane="' + tab + '">' + (tab === 'address' ? addressTab() : tab === 'share' ? shareTab() : goTab()) + '</div>';
        RI.$$('#ptabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
        moveInk();
        if (tab === 'share') { RI.bindImageField(body, 'shimg', { set: v => { C().share.image = v; RI.touch('share'); paint(); } }); counts(); }
        if (tab === 'address') { const i = RI.$('#slug', body); if (ctx.opts && ctx.opts.anchor === 'slug' && i) { i.focus(); ctx.opts = {}; } }
        heroLights();
      }
      // The gold ink under the selected tab slides to it.
      function moveInk() { const on = RI.$('#ptabs [aria-selected=true]', root), ink = RI.$('.pb-tabs__ink', root); if (!on || !ink) return; ink.style.width = on.offsetWidth + 'px'; ink.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
      function counts() { const s = C().share, a = RI.$('#shc1', body), b = RI.$('#shc2', body); if (a) a.textContent = RI.fa(s.title.length) + '/۶۰'; if (b) b.textContent = RI.fa(s.desc.length) + '/۱۶۰'; }
      function refreshAddresses() { const rows = body.querySelector('[data-address-rows]'); if (rows) rows.innerHTML = addressRows(); const w = body.querySelector('[data-address-warning]'); if (w) w.innerHTML = addressWarning(); heroAddress(false); }
      function paintCard() { const v = RI.shareCard(C(), shareKind), card = RI.$('.sharecard__body', body); if (!card) return; card.querySelector('b').textContent = v.title; card.querySelector('p').textContent = v.desc; const st = RI.$('[data-serp-title]', body), sd = RI.$('[data-serp-desc]', body); if (st) st.textContent = v.title; if (sd) sd.textContent = v.desc; }

      /* ---------- Events ---------- */
      RI.delegate(root, 'click', '#ptabs [data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(root, 'click', '[data-share-kind]', (e, b) => { shareKind = b.dataset.shareKind; paint(); });
      RI.delegate(root, 'click', '[data-share-qr]', async (e, b) => { b.disabled = true; try { const result = await RI.dashboardRequest('share-qr?kind=' + shareKind); await RI.qrPoster({ image: result.image, url: result.url, kind: shareKind }); } catch (error) { RI.toast(error.message, { kind: 'error' }); } finally { b.disabled = false; } });
      RI.delegate(root, 'click', '[data-native-share]', async () => { if (RI.state.pub[shareKind].status !== 'published') { RI.toast('لینک را پس از انتشار بفرست', { kind: 'info' }); return; } const card = RI.shareCard(C(), shareKind), data = { title: card.title, text: card.desc, url: RI.urls()[shareKind] }; try { if (navigator.share) await navigator.share(data); else await RI.copy(data.url); } catch (e) { if (e.name !== 'AbortError') RI.toast('لینک را با دکمهٔ کپی بردار', { kind: 'info' }); } });
      body.addEventListener('input', e => {
        const t = e.target;
        if (['resume-path', 'links-path'].includes(t.id)) { const kind = t.id === 'resume-path' ? 'resume' : 'links', value = t.value.trim().toLowerCase(); C().routing[kind] = value; const valid = (kind === 'resume' && !value || RI.pagePathValid(value)) && !(kind === 'resume' && ['link', 'links'].includes(value)) && C().routing.resume !== C().routing.links; t.setAttribute('aria-invalid', String(!valid)); body.querySelector('[data-route-message]').textContent = valid ? 'مسیر معتبر است؛ برای عمومی‌شدن دوباره منتشر کن.' : 'مسیر خالی، تکراری یا سیستمی مجاز نیست؛ فقط حروف کوچک انگلیسی، عدد و خط تیره.'; RI.touch('routing'); if (valid) refreshAddresses(); }
        if (t.id === 'slug') {
          C().slug = t.value.trim().toLowerCase(); RI.touch('slug'); refreshAddresses();
          const r = RI.slugCheck(C().slug), box = RI.$('#slugmsg', body); clearTimeout(slugTimer);
          if (r.state === 'invalid' || r.state === 'empty') { box.innerHTML = slugMsg(r); t.setAttribute('aria-invalid', r.state === 'invalid'); }
          else { box.innerHTML = slugMsg(r, true); slugTimer = setTimeout(async () => { const value = C().slug; try { const result = await RI.dashboardRequest('slug?value=' + encodeURIComponent(value)); if (C().slug !== value || !box.isConnected) return; const rr = result.available ? { state: 'ok', msg: 'این نام آزاد است.' } : { state: 'taken', msg: 'این نام رزرو شده یا قبلاً گرفته شده است.' }; box.innerHTML = slugMsg(rr); t.setAttribute('aria-invalid', !result.available); } catch (err) { if (box.isConnected) box.textContent = err.message; } }, 350); }
        }
        if (t.id === 'sh_t') { C().share.title = t.value; RI.touch('share'); counts(); paintCard(); }
        if (t.id === 'sh_d') { C().share.desc = t.value; RI.touch('share'); counts(); paintCard(); }
      });
      body.addEventListener('change', e => { if (e.target.id === 'idx') { RI.state.account.indexing = e.target.checked; RI.touch('preferences'); RI.toast('تنظیم به‌صورت خودکار ذخیره می‌شود', { kind: 'info' }); } });
      RI.delegate(body, 'click', '[data-sug]', (e, b) => { C().slug = b.dataset.sug; RI.touch('slug'); paint(); heroAddress(true); });
      RI.delegate(body, 'click', '[data-fix]', (e, b) => {
        const all = RI.readiness(), it = all.resume.concat(all.links).find(x => x.id === b.dataset.fix); if (!it) return;
        if (it.route === 'publish') { tab = it.anchor === 'share' ? 'share' : 'address'; paint(); if (tab === 'address') RI.$('#slug', body).focus(); } else RI.go(it.route, { step: it.step, tab: it.tab });
      });
      RI.delegate(body, 'click', '[data-pv]', async (e, b) => { try { if (b.dataset.pv === 'resume') await RI.loadTemplates([RI.C().theme.resume]); RI.openPreview(b.dataset.pv, { title: 'پیش‌نمایش قبل از انتشار' }); } catch (err) { RI.toast(err.message, { kind: 'error' }); } });
      RI.delegate(body, 'click', '[data-pub]', async (e, b) => { const k = b.dataset.pub; if ((RI.state.ui.dirty || RI.state.ui.saving) && !(await RI.save())) return; runPublish(k); });
      function runPublish(k) {
        const update = RI.state.pub[k].status === 'published';
        const m = RI.modal({ title: update ? 'در حال به‌روزرسانی…' : 'در حال انتشار…', size: 'sm', dismissible: false, body: '<ol class="pubsteps" id="ps"></ol>', actions: [] });
        const draw = (i, steps) => { RI.$('#ps', m.body).innerHTML = steps.map((s, j) => '<li class="' + (j < i ? 'is-done' : j === i ? 'is-now' : '') + '">' + (j < i ? RI.icon('check') : j === i ? '<span class="spinner"></span>' : '<i></i>') + s + '</li>').join(''); };
        RI.publish(k, draw).then(() => {
          m.setTitle(update ? 'به‌روزرسانی شد' : 'منتشر شد'); const u = RI.urls();
          m.setBody('<div class="pay-state pay-state--ok pb-done"><div class="empty__art">' + RI.icon('rocket') + '</div><b>نسخهٔ عمومی صفحه منتشر شد</b><p>ویرایش‌ها تا انتشار دوباره عمومی نمی‌شوند.</p>' + RI.urlChip(k === 'resume' ? u.resume : u.links, {}) + '<p>اگر زیردامنه هنوز در دسترس نیست، از آدرس جایگزین استفاده کن:</p>' + RI.urlChip(k === 'resume' ? u.fallbackResume : u.fallbackLinks, { open: k === 'resume' ? u.fallbackResume : u.fallbackLinks }) + '</div>');
          m.setActions([{ label: 'تمام', kind: 'primary', value: true }]); paint();
        }).catch(error => {
          if (error.message === 'account-incomplete') { m.setTitle('مشخصات حسابت رو کامل کن'); m.setBody('<p>برای انتشار صفحه باید اسم، فامیل و شماره موبایل تأییدشده داشته باشی</p>'); m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تکمیل مشخصات', kind: 'primary', onClick: () => RI.go('settings') }]); return; }
          m.setTitle('انتشار انجام نشد'); m.setBody('<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>خطا در انتشار</b>' + esc(error.message) + '</div></div>');
          m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تلاش دوباره', kind: 'primary', icon: 'refresh', onClick: () => { setTimeout(() => runPublish(k), 220); } }]);
        });
      }
      RI.delegate(body, 'click', '[data-unpub]', async (e, b) => {
        const k = b.dataset.unpub;
        if (await RI.confirm({ title: 'برداشتن صفحه از انتشار', text: 'صفحهٔ ' + (k === 'resume' ? 'رزومه' : 'لینک‌ها') + ' برای بازدیدکننده‌ها «پیدا نشد» نشان می‌دهد؛ محتوایت حذف نمی‌شود و هر وقت خواستی دوباره منتشرش کن.', danger: true, icon: 'eyeOff', confirmLabel: 'برداشتن از انتشار' })) { try { await RI.unpublish(k); RI.toast('صفحه از انتشار برداشته شد', { kind: 'info' }); paint(); } catch (err) { RI.toast(err.message, { kind: 'error' }); } }
      });
      const off = RI.on('pub', () => paint()), onResize = () => moveInk();
      addEventListener('resize', onResize);
      paint(); heroAddress(true);
      return () => { off(); clearTimeout(slugTimer); clearTimeout(typeTimer); removeEventListener('resize', onResize); };
    },
  });
})();
