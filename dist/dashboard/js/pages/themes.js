/* ظاهر و قالب: گالری، فونت، رنگ؛ با پیش‌نمایش پیش از اعمال و قفل شفاف */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const CATS = [['all', 'همه'], ['student', 'دانشجو و دانش‌آموز'], ['dev', 'برنامه‌نویس'], ['creator', 'تولیدکنندهٔ محتوا']];
  const ACC = [['all', 'همهٔ دسترسی‌ها'], ['free', 'رایگان'], ['buy', 'خرید یک‌بار'], ['sub', 'با اشتراک']];

  RI.registerPage('themes', {
    title: 'ظاهر و قالب',
    render() {
      return RI.pageHead({ eyebrow: 'استودیو', eyebrowIcon: 'palette', title: 'ظاهر صفحه‌هایت', desc: 'قالب، فونت و رنگ را انتخاب کن؛ انتخابت خودکار ذخیره می‌شود. برای نمایش تغییرات در سایت، نسخهٔ عمومی را از بخش آدرس و انتشار به‌روزرسانی کن.' }) +
        '<div class="tabs" role="tablist" id="ttabs">' + [['rt', 'قالب رزومه'], ['lt', 'قالب صفحهٔ لینک'], ['font', 'فونت'], ['pal', 'رنگ‌ها و شکل']].map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div>' +
        '<div id="tbody"></div>';
    },
    mount(root) {
      let tab = 'rt', cat = 'all', acc = 'all';
      const body = RI.$('#tbody', root);
      const th = () => RI.C().theme;

      function applyTheme(patch, msg) { Object.assign(th(), patch); RI.touch('theme'); RI.toast(msg || 'ظاهر انتخاب شد'); paint(); }

      /* پیش‌نمایش پیش از اعمال */
      async function tryAndApply(kind, override, it, ref, patch, label) {
        let applied = false;
        const locked = !RI.canUse(ref, it);
        const m = RI.openPreview(kind, {
          title: 'پیش‌نمایش «' + esc(label) + '»', device: kind === 'links' ? 'mobile' : 'desktop', theme: () => override,
          actions: [{ label: 'بستن', kind: 'ghost' }, locked ? { label: it.subscription ? 'خرید یا اشتراک' : it.access === 'buy' ? 'خرید و استفاده' : 'مشاهدهٔ اشتراک', kind: 'primary', icon: 'lock', push: true, onClick: () => { applied = 'unlock'; } } : { label: 'اعمال این ظاهر', kind: 'primary', icon: 'check', push: true, onClick: () => { applied = true; } }],
          device_: 0,
        });
        const origClose = m.close; m.close = (v) => origClose(v);
        const wait = () => new Promise((r) => { const t = setInterval(() => { if (m.closed) { clearInterval(t); r(); } }, 60); });
        await wait();
        if (applied === 'unlock') { const ok = await RI.lockedExplain(it); if (ok) applyTheme(patch, '«' + label + '» اعمال شد'); }
        else if (applied) applyTheme(patch, '«' + label + '» اعمال شد');
      }

      async function choose(kind, id) {
        const list = kind === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES, it = list.find((x) => x.id === id), ref = kind + ':' + id;
        if (!RI.canUse(ref, it)) { const ok = await RI.lockedExplain(Object.assign({ kind: kind }, it)); if (!ok) return paint(); }
        applyTheme(kind === 'rt' ? { resume: id } : { links: id }, 'قالب «' + it.name + '» انتخاب شد');
      }

      function filters() {
        return '<div class="filters"><div class="chiprow" role="group" aria-label="دسته">' + CATS.map((c) => '<button type="button" class="filter-chip" data-cat="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + c[1] + '</button>').join('') + '</div><div class="chiprow" role="group" aria-label="دسترسی">' + ACC.map((c) => '<button type="button" class="filter-chip" data-acc="' + c[0] + '" aria-pressed="' + (acc === c[0]) + '">' + c[1] + '</button>').join('') + '</div></div>';
      }

      function gallery(kind) {
        const list = (kind === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES).filter((t) => (cat === 'all' || t.cats.indexOf(cat) > -1) && (acc === 'all' || t.access === acc || (acc === 'sub' && t.subscription)));
        const curId = kind === 'rt' ? th().resume : th().links;
        const cur = RI.findTemplate(kind === 'rt' ? 'resume' : 'links', curId);
        const cards = list.map((t) => {
          const ref = kind + ':' + t.id, on = t.id === curId, usable = RI.canUse(ref, t);
          return '<article class="tcard' + (on ? ' is-current' : '') + '" data-id="' + t.id + '"><div class="tcard__thumb">' + RI.thumbHtml(kind === 'rt' ? 'resume' : 'links', t.id) + (!usable ? '<span class="tcard__lock">' + RI.icon('lock') + '</span>' : '') + (on ? '<span class="tcard__on">' + RI.icon('check') + 'در حال استفاده</span>' : '') + '</div>' +
            '<div class="tcard__body"><div class="tcard__title"><h3>' + t.name + '</h3>' + RI.accessBadge(ref, t) + '</div><p>' + t.desc + '</p><div class="tcard__cats">' + t.cats.map((c) => '<span class="chip">' + CATS.find((x) => x[0] === c)[1] + '</span>').join('') + '</div>' +
            '<div class="tcard__actions"><button type="button" class="btn btn--soft btn--sm" data-try="' + t.id + '">' + RI.icon('eye') + 'پیش‌نمایش</button>' + (on ? '<button type="button" class="btn btn--sm" disabled>' + RI.icon('check') + 'انتخاب‌شده</button>' : '<button type="button" class="btn btn--sm ' + (usable ? 'btn--primary' : 'btn--ice') + '" data-use="' + t.id + '">' + (usable ? 'استفاده' : RI.icon('lock') + (t.subscription ? 'خرید یا اشتراک' : t.access === 'buy' ? 'خرید' : 'اشتراک')) + '</button>') + '</div></div></article>';
        }).join('');
        return '<div class="current"><div><span class="eyebrow">' + RI.icon('check') + 'قالب انتخاب‌شده</span><b>' + cur.name + '</b> ' + RI.accessBadge(kind + ':' + cur.id, cur) + '</div></div>' + filters() +
          (list.length ? '<div class="tgrid">' + cards + '</div>' : RI.empty({ icon: 'search', title: 'قالبی با این فیلتر پیدا نشد', text: 'فیلتر دسته یا دسترسی را عوض کن', action: '<button type="button" class="btn btn--soft" data-reset>پاک کردن فیلترها</button>' }));
      }

      function fonts() {
        const cur = th().font;
        return '<div class="fgrid">' + RI.FONTS.map((f) => {
          const ref = 'font:' + f.id, on = cur === f.id, usable = RI.canUse(ref, f);
          return '<article class="fcard' + (on ? ' is-current' : '') + '"><div class="fcard__sample" style="font-family:' + f.stack + ';font-weight:' + f.hw + ';letter-spacing:' + (f.spacing || 0) + '"><b style="font-family:' + (f.heading || f.stack) + '">من می‌سازم، پس هستم</b><span>نمونه‌کار، مهارت، پروژه ۰۱۲۳۴۵</span></div>' +
            '<div class="tcard__title"><h3>' + f.name + '</h3>' + RI.accessBadge(ref, f) + '</div><p class="field__hint">' + f.note + '</p><div class="tcard__actions"><button type="button" class="btn btn--soft btn--sm" data-ftry="' + f.id + '">' + RI.icon('eye') + 'پیش‌نمایش</button>' +
            (on ? '<button class="btn btn--sm" disabled type="button">' + RI.icon('check') + 'انتخاب‌شده</button>' : '<button type="button" class="btn btn--sm ' + (usable ? 'btn--primary' : 'btn--ice') + '" data-fuse="' + f.id + '">' + (usable ? 'استفاده' : RI.icon('lock') + (f.access === 'buy' ? 'خرید' : 'اشتراک')) + '</button>') + '</div></article>';
        }).join('') + '</div>';
      }

      function palettes() {
        const cur = th().palette, r = th().radius;
        return '<div class="panel"><div class="panel__head"><h2>ترکیب رنگ</h2><p>رنگ تأکید رزومه و صفحهٔ لینک با هم عوض می‌شود تا هویتشان یکی بماند</p></div><div class="pgrid">' + RI.PALETTES.map((p) => {
          const ref = 'pal:' + p.id, on = cur === p.id, usable = RI.canUse(ref, p);
          return '<button type="button" class="pcard' + (on ? ' is-current' : '') + '" data-pal="' + p.id + '" aria-pressed="' + on + '"><span class="pcard__sw">' + (p.colors ? '<i style="background:' + p.colors[0] + '"></i><i style="background:' + p.colors[1] + '"></i>' : '<i class="pcard__auto">' + RI.icon('sparkle') + '</i>') + '</span><b>' + p.name + '</b>' + RI.accessBadge(ref, p) + '</button>';
        }).join('') + '</div></div>' +
          '<div class="panel"><div class="panel__head"><h2>گردی گوشه‌ها</h2><p>حال‌وهوای کارت‌ها و دکمه‌ها</p></div><div class="segmented" id="radius">' + Object.keys(RI.RADII).map((k) => '<button type="button" data-radius="' + k + '" aria-pressed="' + (r === k) + '">' + RI.RADII[k][0] + '</button>').join('') + '</div></div>';
      }

      function paint() {
        body.innerHTML = tab === 'rt' ? gallery('rt') : tab === 'lt' ? gallery('lt') : tab === 'font' ? fonts() : palettes();
        RI.$$('#ttabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        RI.fitThumbs(body);
      }
      const ro = new ResizeObserver(() => RI.fitThumbs(body)); ro.observe(body);

      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(body, 'click', '[data-cat]', (e, b) => { cat = b.dataset.cat; paint(); });
      RI.delegate(body, 'click', '[data-acc]', (e, b) => { acc = b.dataset.acc; paint(); });
      RI.delegate(body, 'click', '[data-reset]', () => { cat = 'all'; acc = 'all'; paint(); });
      RI.delegate(body, 'click', '[data-use]', (e, b) => choose(tab, b.dataset.use));
      RI.delegate(body, 'click', '[data-try]', (e, b) => {
        const kind = tab === 'rt' ? 'resume' : 'links', list = tab === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES, it = list.find((x) => x.id === b.dataset.try);
        tryAndApply(kind, kind === 'resume' ? { resume: it.id } : { links: it.id }, Object.assign({ kind: tab }, it), tab + ':' + it.id, tab === 'rt' ? { resume: it.id } : { links: it.id }, it.name);
      });
      RI.delegate(body, 'click', '[data-ftry]', (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.ftry); tryAndApply('resume', { font: f.id }, Object.assign({ kind: 'font' }, f), 'font:' + f.id, { font: f.id }, f.name); });
      RI.delegate(body, 'click', '[data-fuse]', async (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.fuse); if (!RI.canUse('font:' + f.id, f)) { if (!(await RI.lockedExplain(Object.assign({ kind: 'font' }, f)))) return paint(); } applyTheme({ font: f.id }, 'فونت «' + f.name + '» انتخاب شد'); });
      RI.delegate(body, 'click', '[data-pal]', async (e, b) => {
        const p = RI.PALETTES.find((x) => x.id === b.dataset.pal);
        if (!RI.canUse('pal:' + p.id, p)) { const ok = await RI.lockedExplain(Object.assign({ kind: 'pal' }, p)); if (!ok) return paint(); }
        applyTheme({ palette: p.id, linksPalette: p.id }, 'ترکیب رنگ «' + p.name + '» اعمال شد');
      });
      RI.delegate(body, 'click', '[data-radius]', (e, b) => applyTheme({ radius: b.dataset.radius }, 'گردی گوشه‌ها تغییر کرد'));
      paint();
      return () => ro.disconnect();
    },
  });
})();
