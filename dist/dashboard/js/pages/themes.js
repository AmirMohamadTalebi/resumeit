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
        '<div class="tabs" role="tablist" id="ttabs">' + [['rt', 'قالب رزومه'], ['lt', 'قالب صفحهٔ لینک'], ['font', 'فونت'], ['pal', 'رنگ‌ها و شکل']].filter(([id])=>RI.workspaceSlot!==3||id!=='rt').map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div>' +
        '<div id="tbody"></div>';
    },
    mount(root) {
      let tab = RI.workspaceSlot===3?'lt':'rt', cat = 'all', acc = 'all', galleryPage = 0,query='',sort='newest',searchTimer;
      const body = RI.$('#tbody', root);
      const th = () => RI.C().theme;

      function applyTheme(patch, msg) { Object.assign(th(), patch); RI.touch('theme'); RI.toast(msg || 'ظاهر انتخاب شد'); paint(); }

      /* پیش‌نمایش پیش از اعمال */
      async function tryAndApply(kind, override, it, ref, patch, label) {
        try { if(kind==='resume') await RI.loadTemplates([override.resume || th().resume]); } catch(e) { RI.toast(e.message,{kind:'error'}); return; }
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
        return '<div class="workspace-tools"><div class="field"><label class="field__label" for="template-query">جست‌وجوی قالب</label><input class="input" type="search" id="template-query" value="'+esc(query)+'" placeholder="نام، کاربرد یا ویژگی"></div><div class="field"><label class="field__label" for="template-sort">مرتب‌سازی</label><select class="select" id="template-sort">'+[['newest','جدیدترین'],['cheap','ارزان‌ترین خرید تکی'],['expensive','گران‌ترین خرید تکی'],['name','نام قالب']].map(([id,label])=>'<option value="'+id+'" '+(sort===id?'selected':'')+'>'+label+'</option>').join('')+'</select></div></div><div class="filters"><div class="chiprow" role="group" aria-label="دسته">' + CATS.map((c) => '<button type="button" class="filter-chip" data-cat="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + c[1] + '</button>').join('') + '</div><div class="chiprow" role="group" aria-label="دسترسی">' + ACC.map((c) => '<button type="button" class="filter-chip" data-acc="' + c[0] + '" aria-pressed="' + (acc === c[0]) + '">' + c[1] + '</button>').join('') + '</div></div>';
      }

      function gallery(kind) {
        const list = (kind === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES).filter((t) => RI.matches(query,t.name,t.desc,...t.cats.map(c=>CATS.find(x=>x[0]===c)?.[1]))&&(cat === 'all' || t.cats.indexOf(cat) > -1) && (acc === 'all' || t.access === acc || (acc === 'sub' && t.subscription)));
        const price=t=>t.price??(t.access==='free'?0:Number.MAX_SAFE_INTEGER);
        if(sort==='cheap')list.sort((a,b)=>price(a)-price(b));else if(sort==='expensive')list.sort((a,b)=>price(b)-price(a));else if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
        const curId = kind === 'rt' ? th().resume : th().links;
        const cur = RI.findTemplate(kind === 'rt' ? 'resume' : 'links', curId);
        const pageCount = Math.ceil(list.length / 6);
        galleryPage = Math.min(galleryPage, Math.max(0, pageCount - 1));
        const cards = list.slice(galleryPage * 6, (galleryPage + 1) * 6).map((t) => {
          const ref = kind + ':' + t.id, on = t.id === curId, usable = RI.canUse(ref, t);
          return '<article class="tcard' + (on ? ' is-current' : '') + '" data-id="' + t.id + '"><button type="button" class="tcard__preview" data-template-preview="'+t.id+'" aria-label="پیش‌نمایش قالب '+esc(t.name)+'"><span class="tcard__thumb">' + RI.thumbHtml(kind === 'rt' ? 'resume' : 'links', t.id) + (!usable ? '<span class="tcard__lock">' + RI.icon('lock') + '</span>' : '') + (on ? '<span class="tcard__on">' + RI.icon('check') + 'در حال استفاده</span>' : '') + '</span></button>' +
            '<div class="tcard__body"><div class="tcard__title"><h3>' + t.name + '</h3>' + RI.accessBadge(ref, t) + '</div><p>' + t.desc + '</p><div class="tcard__cats">' + t.cats.map((c) => '<span class="chip">' + CATS.find((x) => x[0] === c)[1] + '</span>').join('') + '</div>' +
            '<div class="tcard__actions"><button type="button" class="btn btn--soft btn--sm" data-use="'+t.id+'" '+(on?'disabled':'')+'>'+RI.icon(on?'check':usable?'plus':'lock')+(on?'در حال استفاده':'استفاده')+'</button></div></div></article>';
        }).join('');
        return '<div class="current"><div><span>' + RI.icon('check') + 'قالب فعلی</span><b>' + cur.name + '</b></div>' + RI.accessBadge(kind + ':' + cur.id, cur) + '</div>' + filters() +
          (list.length ? '<div class="tgrid">' + cards + '</div>' + (pageCount > 1 ? '<nav class="btnrow gallery-pages" aria-label="صفحه‌های قالب‌ها"><button type="button" class="btn btn--soft" data-gallery-page="'+(galleryPage-1)+'" '+(galleryPage===0?'disabled':'')+'>قبلی</button><span role="status">صفحهٔ '+RI.fa(galleryPage+1)+' از '+RI.fa(pageCount)+'</span><button type="button" class="btn btn--soft" data-gallery-page="'+(galleryPage+1)+'" '+(galleryPage===pageCount-1?'disabled':'')+'>بعدی</button></nav>' : '') : RI.empty({ icon: 'search', title: 'قالبی با این فیلتر پیدا نشد', text: 'فیلتر دسته یا دسترسی را عوض کن', action: '<button type="button" class="btn btn--soft" data-reset>پاک کردن فیلترها</button>' }));
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
        const colors=RI.PALETTES.find(p=>p.id===cur)?.colors||['#286d7c','#e0eef3'];
        return '<div class="panel"><div class="panel__head"><h2>ترکیب رنگ</h2><p>رنگ تأکید رزومه و صفحهٔ لینک با هم عوض می‌شود تا هویتشان یکی بماند</p></div><div class="pgrid">' + RI.PALETTES.map((p) => {
          const ref = 'pal:' + p.id, on = cur === p.id, usable = RI.canUse(ref, p);
          return '<button type="button" class="pcard' + (on ? ' is-current' : '') + '" data-pal="' + p.id + '" aria-pressed="' + on + '"><span class="pcard__sw">' + (p.colors ? '<i style="background:' + p.colors[0] + '"></i><i style="background:' + p.colors[1] + '"></i>' : '<i class="pcard__auto">' + RI.icon('sparkle') + '</i>') + '</span><b>' + p.name + '</b>' + RI.accessBadge(ref, p) + '</button>';
        }).join('') + '</div><div class="palette-proof" style="--proof-accent:'+colors[0]+';--proof-surface:'+colors[1]+'" aria-label="پیش‌نمایش ترکیب رنگ"><div><small>پیش‌نمایش ترکیب رنگ</small><h3>رها کیانی</h3><p>طراحی برای تجربه‌های ماندگار</p><span>'+RI.icon('link')+'نمونه‌کارهای من</span></div><div class="palette-proof__tiles"><span></span><span></span><span></span></div></div></div>' +
          '<div class="panel"><div class="panel__head"><h2>گردی گوشه‌ها</h2><p>رزومه و صفحهٔ لینک با یک انتخاب هماهنگ می‌شوند.</p></div><div class="segmented" id="radius">' + Object.keys(RI.RADII).map((k) => '<button type="button" data-radius="' + k + '" aria-pressed="' + (r === k) + '">' + RI.RADII[k][0] + '</button>').join('') + '</div><div class="shape-proof" style="--shape-radius:'+RI.RADII[r][1]+';--shape-color:'+(RI.PALETTES.find(p=>p.id===cur)?.colors?.[0]||'#286d7c')+'"><span>نام و نام خانوادگی</span><span>'+RI.icon('link')+'نمونهٔ لینک</span></div></div>';
      }

      function paint() {
        body.innerHTML = tab === 'rt' ? gallery('rt') : tab === 'lt' ? gallery('lt') : tab === 'font' ? fonts() : palettes();
        RI.$$('#ttabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        RI.fitThumbs(body);
      }
      const ro = new ResizeObserver(() => RI.fitThumbs(body)); ro.observe(body);

      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; galleryPage = 0; paint(); });
      body.addEventListener('input',e=>{if(e.target.id!=='template-query')return;query=e.target.value;galleryPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const position=e.target.selectionStart;paint();const input=body.querySelector('#template-query');input?.focus();if(input?.type==='search'&&position!==null)input.setSelectionRange(position,position);},200);});
      body.addEventListener('change',e=>{if(e.target.id==='template-sort'){sort=e.target.value;galleryPage=0;paint();}});
      function previewTemplate(id){const kind=tab==='rt'?'resume':'links',it=RI.findTemplate(kind,id),patch=tab==='rt'?{resume:id}:{links:id};return tryAndApply(kind,patch,{...it,kind:tab},tab+':'+id,patch,it.name);}
      RI.delegate(body,'click','.tcard',(event,card)=>{if(event.target.closest('[data-use]'))return;previewTemplate(card.dataset.id);});
      RI.delegate(body, 'click', '[data-cat]', (e, b) => { cat = b.dataset.cat; galleryPage = 0; paint(); });
      RI.delegate(body, 'click', '[data-acc]', (e, b) => { acc = b.dataset.acc; galleryPage = 0; paint(); });
      RI.delegate(body, 'click', '[data-reset]', () => { cat = 'all'; acc = 'all'; galleryPage = 0; paint(); });
      RI.delegate(body, 'click', '[data-gallery-page]', (e, b) => { galleryPage = Number(b.dataset.galleryPage); paint(); RI.$('.gallery-pages button:not([disabled])', body)?.focus(); });
      RI.delegate(body, 'click', '[data-use]', (e, b) => choose(tab, b.dataset.use));
      RI.delegate(body, 'click', '[data-try]', (e, b) => {
        const kind = tab === 'rt' ? 'resume' : 'links', list = tab === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES, it = list.find((x) => x.id === b.dataset.try);
        tryAndApply(kind, kind === 'resume' ? { resume: it.id } : { links: it.id }, Object.assign({ kind: tab }, it), tab + ':' + it.id, tab === 'rt' ? { resume: it.id } : { links: it.id }, it.name);
      });
      RI.delegate(body, 'click', '[data-ftry]', (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.ftry);RI.modal({title:'فونت '+f.name,body:'<div class="font-proof" style="font-family:'+f.stack+'"><b style="font-family:'+(f.heading||f.stack)+'">رها کیانی</b><span>طراح تجربه‌های روشن و ماندگار</span><p>ResumeIt · ۰۱۲۳۴۵۶۷۸۹</p></div>',actions:[{label:'بستن',kind:'ghost'},{label:'انتخاب این فونت',kind:'primary',onClick:async()=>{if(RI.canUse('font:'+f.id,f)||await RI.lockedExplain({...f,kind:'font'}))applyTheme({font:f.id});}}]}); });
      RI.delegate(body, 'click', '[data-fuse]', async (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.fuse); if (!RI.canUse('font:' + f.id, f)) { if (!(await RI.lockedExplain(Object.assign({ kind: 'font' }, f)))) return paint(); } applyTheme({ font: f.id }, 'فونت «' + f.name + '» انتخاب شد'); });
      RI.delegate(body, 'click', '[data-pal]', async (e, b) => {
        const p = RI.PALETTES.find((x) => x.id === b.dataset.pal);
        if (!RI.canUse('pal:' + p.id, p)) { const ok = await RI.lockedExplain(Object.assign({ kind: 'pal' }, p)); if (!ok) return paint(); }
        applyTheme({ palette: p.id, linksPalette: p.id }, 'ترکیب رنگ «' + p.name + '» اعمال شد');
      });
      RI.delegate(body, 'click', '[data-radius]', (e, b) => applyTheme({ radius: b.dataset.radius }, 'گردی گوشه‌ها تغییر کرد'));
      paint();
      return () => {ro.disconnect();clearTimeout(searchTimer);};
    },
  });
})();
