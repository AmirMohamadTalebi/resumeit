/* مدیریت صفحهٔ لینک‌ها */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const linkFields = [
    { key: 'title', label: 'عنوان دکمه', required: true, max: 40, placeholder: 'مثلاً نمونه‌کارها' },
    { key: 'url', label: 'آدرس لینک', type: 'url', required: true, ltr: true, placeholder: 'example.com/page', hint: 'با یا بدون https بنویس' },
    { key: 'icon', label: 'آیکن', type: 'select', options: RI.LINK_ICONS.map((i) => [i, RI.LINK_ICON_NAMES[i]]) },
    { key: 'image', label: 'یا تصویر کوچک به‌جای آیکن', type: 'image', optional: true },
  ];
  const divFields = [{ key: 'title', label: 'عنوان جداکننده', required: true, max: 30, placeholder: 'مثلاً پروژه‌ها' }];

  RI.registerPage('links', {
    title: 'صفحهٔ لینک‌ها',
    render() {
      const u = RI.urls();
      return RI.pageHead({ eyebrow: 'استودیو', eyebrowIcon: 'link', title: 'صفحهٔ لینک‌های تو', desc: 'یک صفحهٔ ساده و تمیز برای همهٔ جاهایی که می‌خواهی دیده شوی' +
        ' آدرس: <span class="ltr-inline mono">' + esc(u.links) + '</span>',
        actions: '<button type="button" class="btn btn--soft btn--sm show-sm" data-live>' + RI.icon('eye') + 'پیش‌نمایش زنده</button>' }) +
        '<div class="editor"><div class="editor__main"><div class="segmented" role="tablist" id="ltabs">' +
        [['items', 'لینک‌ها', 'link'], ['header', 'مشخصات بالای صفحه', 'user'], ['style', 'ظاهر صفحه', 'palette']].map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + RI.icon(t[2]) + t[1] + '</button>').join('') +
        '</div><div id="lbody"></div></div><aside class="editor__side" aria-label="پیش‌نمایش زندهٔ صفحهٔ لینک"><div class="sticky"><div id="lpv"></div></div></aside></div>';
    },
    mount(root, ctx) {
      let tab = (ctx.opts && ctx.opts.tab) || 'items';
      const body = RI.$('#lbody', root);
      const pv = new RI.Preview(RI.$('#lpv', root), { kind: 'links', device: 'mobile', fitHeight: 200 });
      let raf = 0; const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => pv.refresh(false)); };
      const off = RI.on('change', refresh);
      const L = () => RI.C().links;

      function itemsPanel() {
        const items = L().items, n = items.filter((i) => i.type === 'link').length;
        const rows = items.map((x, i) => {
          const div = x.type === 'divider';
          return '<li class="row' + (div ? ' row--divider' : '') + (!div && !x.active ? ' is-off' : '') + '" data-id="' + x.id + '"><span class="row__grip" aria-hidden="true">' + RI.icon('grip') + '</span>' +
            (div ? '<span class="row__ico">' + RI.icon('divider') + '</span>' : x.image ? '<span class="row__thumb" style="' + esc(RI.bg(x.image)) + '"></span>' : '<span class="row__ico">' + RI.icon(x.icon || 'link') + '</span>') +
            '<div class="row__main"><div class="row__title">' + esc(x.title) + (div ? ' <span class="chip">جداکننده</span>' : '') + '</div>' +
            (div ? '' : '<div class="row__sub ltr">' + esc(x.url) + '</div>') + '</div>' +
            (div ? '' : '<span class="clicks" title="تعداد کلیک نمونه">' + RI.icon('cursor') + '<b class="num">' + RI.fa(x.clicks || 0) + '</b><small>نمونه</small></span>') +
            '<div class="row__actions">' + (div ? '' : '<button type="button" class="btn btn--icon btn--sm ' + (x.featured ? 'btn--primary' : 'btn--ghost') + '" data-feat="' + x.id + '" aria-pressed="' + !!x.featured + '" aria-label="برجسته" title="لینک برجسته">' + RI.icon('star') + '</button>') +
            '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-up="' + x.id + '" aria-label="بالا" ' + (i === 0 ? 'disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-down="' + x.id + '" aria-label="پایین" ' + (i === items.length - 1 ? 'disabled' : '') + '>' + RI.icon('down') + '</button>' +
            '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-edit="' + x.id + '" aria-label="ویرایش">' + RI.icon('edit') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-del="' + x.id + '" aria-label="حذف">' + RI.icon('trash') + '</button></div>' +
            (div ? '' : RI.switchHtml({ checked: x.active, label: (x.active ? 'غیرفعال کردن ' : 'فعال کردن ') + x.title }).replace('<input', '<input data-active="' + x.id + '"')) + '</li>';
        }).join('');
        return '<div class="panel"><div class="panel__head panel__head--row"><div><h2>لینک‌ها</h2><p>' + RI.fa(n) + ' لینک · کلیدِ کنار هر لینک آن را فعال یا غیرفعال می‌کند آمار کلیک‌ها نمونه است</p></div><div class="btnrow"><button type="button" class="btn btn--soft btn--sm" data-add-div>' + RI.icon('divider') + 'جداکننده</button><button type="button" class="btn btn--primary btn--sm" data-add>' + RI.icon('plus') + 'افزودن لینک</button></div></div>' +
          (items.length ? '<ul class="rows" id="llist">' + rows + '</ul>' : RI.empty({ icon: 'link', title: 'هنوز لینکی نداری', text: 'اولین لینکت را اضافه کن؛ مثلاً رزومهٔ آنلاین، گیت‌هاب یا کانال تلگرام', action: '<button type="button" class="btn btn--primary" data-add>' + RI.icon('plus') + 'افزودن اولین لینک</button>' })) + '</div>';
      }
      function headerPanel() {
        const h = L().header, p = RI.C().profile;
        return '<div class="panel"><div class="panel__head"><h2>مشخصات بالای صفحه</h2><p>عکس، نام و معرفی کوتاهی که بالای لینک‌ها دیده می‌شود</p></div>' +
          '<div class="syncrow"><div><b>همگام با رزومه</b><div class="field__hint">نام، عکس و معرفی از رزومه برداشته می‌شود تا یک جا ویرایش کنی</div></div>' + RI.switchHtml({ checked: h.sync, label: 'همگام با رزومه' }).replace('<input', '<input id="sync"') + '</div>' +
          '<div class="syncprev"><img class="avatar" src="' + esc(RI.avatarOf(p)) + '" alt=""><div><b>' + esc(h.sync ? p.name || '—' : h.name || '—') + '</b><div class="field__hint">عکس همیشه از رزومه می‌آید <a href="/dashboard/resume/" data-go="resume" data-step="profile" class="textlink">تغییر عکس</a></div></div></div>' +
          '<div class="field"><label class="field__label" for="h_name">نام نمایشی' + (h.sync ? '<span class="field__opt">از رزومه</span>' : '<span class="field__req">ضروری</span>') + '</label><input class="input" id="h_name" value="' + esc(h.sync ? p.name : h.name) + '" ' + (h.sync ? 'disabled' : '') + ' maxlength="50"></div>' +
          '<div class="field"><label class="field__label" for="h_bio">معرفی کوتاه<span class="field__opt">اختیاری</span></label><textarea class="textarea" id="h_bio" rows="3" maxlength="160" ' + (h.sync ? 'disabled' : '') + '>' + esc(h.sync ? p.bio : h.bio) + '</textarea></div></div>';
      }
      function stylePanel() {
        const st = L().style, th = RI.C().theme, t = RI.findTemplate('links', th.links);
        return '<div class="panel"><div class="panel__head"><h2>ظاهر صفحهٔ لینک</h2><p>پایهٔ ظاهر از قالب و فونتِ مشترک با رزومه می‌آید؛ این‌جا فقط چند شخصی‌سازی ویژهٔ صفحهٔ لینک است</p></div>' +
          '<div class="syncrow"><div><b>قالب فعلی: ' + esc(t.name) + '</b><div class="field__hint">برای عوض کردن قالب، فونت یا رنگ‌ها به بخش «ظاهر و قالب» برو</div></div><a class="btn btn--soft btn--sm" href="/dashboard/themes/" data-go="themes">' + RI.icon('palette') + 'تغییر قالب</a></div><hr class="divider">' +
          '<div class="field"><div class="field__label">چیدمان نوشته‌ها</div><div class="segmented" id="alignSeg">' + [['center', 'وسط‌چین'], ['start', 'راست‌چین']].map((o) => '<button type="button" data-align="' + o[0] + '" aria-pressed="' + (st.align === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>' +
          '<div class="syncrow"><div><b>حلقهٔ دور عکس</b><div class="field__hint">یک قاب رنگی دور عکس پروفایل</div></div>' + RI.switchHtml({ checked: st.ring, label: 'حلقهٔ دور عکس' }).replace('<input', '<input id="ring"') + '</div>' +
          '<div class="field" style="margin-top:16px"><div class="field__label">پس‌زمینهٔ ویژهٔ این صفحه</div><div class="swatches" role="group" aria-label="پس‌زمینه">' + RI.LINK_BGS.map((b) => '<button type="button" class="swatch' + ((st.bgOverride || 'tpl') === b.id ? ' is-on' : '') + '" data-bg="' + b.id + '" aria-pressed="' + ((st.bgOverride || 'tpl') === b.id) + '"><span style="background:' + (b.bg || 'linear-gradient(135deg,#fff,#dbe7ed)') + '"></span>' + b.name + '</button>').join('') + '</div></div></div>';
      }
      function paint() {
        body.innerHTML = tab === 'items' ? itemsPanel() : tab === 'header' ? headerPanel() : stylePanel();
        RI.$$('#ltabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        const ul = RI.$('#llist', body);
        if (ul) RI.sortable(ul, { onReorder: (f, t) => RI.flip(ul, () => { RI.move(L().items, f, t); RI.touch('links'); paint(); }) });
      }
      function openForm(id, divider) {
        const cur = id ? L().items.find((x) => x.id === id) : null, isDiv = divider || (cur && cur.type === 'divider');
        RI.formModal({ title: isDiv ? (cur ? 'ویرایش جداکننده' : 'افزودن جداکننده') : (cur ? 'ویرایش لینک' : 'افزودن لینک'), fields: isDiv ? divFields : linkFields, values: cur ? RI.clone(cur) : { icon: 'link' }, submitLabel: cur ? 'ذخیرهٔ تغییر' : 'افزودن',
          onSubmit: (v) => { if (cur) Object.assign(cur, v); else L().items.push(isDiv ? { id: RI.uid(), type: 'divider', title: v.title } : Object.assign({ id: RI.uid(), type: 'link', active: true, featured: false, clicks: 0 }, v)); RI.touch('links'); paint(); RI.toast(cur ? 'تغییر اعمال شد' : 'به صفحهٔ لینک اضافه شد'); } });
      }
      RI.delegate(body, 'click', '[data-add]', () => openForm(null));
      RI.delegate(body, 'click', '[data-add-div]', () => openForm(null, true));
      RI.delegate(body, 'click', '[data-edit]', (e, b) => openForm(b.dataset.edit));
      RI.delegate(body, 'click', '[data-feat]', (e, b) => { const x = L().items.find((k) => k.id === b.dataset.feat); const on = !x.featured; L().items.forEach((k) => { k.featured = false; }); x.featured = on; RI.touch('links'); paint(); RI.toast(on ? 'لینک برجسته شد' : 'برجسته‌سازی برداشته شد', { kind: 'info' }); });
      RI.delegate(body, 'click', '[data-up],[data-down]', (e, b) => { const items = L().items, id = b.dataset.up || b.dataset.down, i = items.findIndex((k) => k.id === id), j = i + (b.dataset.up ? -1 : 1); if (j < 0 || j >= items.length) return; RI.flip(RI.$('#llist', body), () => { RI.move(items, i, j); RI.touch('links'); paint(); }); });
      RI.delegate(body, 'click', '[data-del]', async (e, b) => {
        const x = L().items.find((k) => k.id === b.dataset.del);
        if (!(await RI.confirm({ title: 'حذف «' + esc(x.title) + '»', text: x.type === 'divider' ? 'این جداکننده برداشته می‌شود' : 'این لینک و آمار کلیک نمونه‌اش حذف می‌شود اگر فقط می‌خواهی موقتاً نمایش داده نشود، به‌جای حذف آن را غیرفعال کن', danger: true, icon: 'trash', confirmLabel: 'حذف' }))) return;
        const el = RI.$('[data-id="' + x.id + '"]', body); if (el && !RI.reduceMotion()) await el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 220 }).finished.catch(() => {});
        L().items.splice(L().items.indexOf(x), 1); RI.touch('links'); paint(); RI.toast('حذف شد', { kind: 'info' });
      });
      body.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.active) { const x = L().items.find((k) => k.id === t.dataset.active); x.active = t.checked; t.closest('.row').classList.toggle('is-off', !x.active); RI.touch('links'); }
        if (t.id === 'sync') { L().header.sync = t.checked; if (!t.checked && !L().header.name) { L().header.name = RI.C().profile.name; L().header.bio = RI.C().profile.bio; } RI.touch('links'); paint(); }
        if (t.id === 'ring') { L().style.ring = t.checked; RI.touch('links'); }
      });
      body.addEventListener('input', (e) => { if (e.target.id === 'h_name') { L().header.name = e.target.value; RI.touch('links'); } if (e.target.id === 'h_bio') { L().header.bio = e.target.value; RI.touch('links'); } });
      RI.delegate(body, 'click', '[data-align]', (e, b) => { L().style.align = b.dataset.align; RI.touch('links'); RI.$$('[data-align]', body).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      RI.delegate(body, 'click', '[data-bg]', (e, b) => { L().style.bgOverride = b.dataset.bg === 'tpl' ? null : b.dataset.bg; RI.touch('links'); RI.$$('[data-bg]', body).forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); }); });
      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(root, 'click', '[data-live]', () => RI.openPreview('links', { device: 'mobile' }));
      paint();
      return () => { off(); pv.destroy(); };
    },
  });
})();
