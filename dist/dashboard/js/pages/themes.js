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
    mount(root,options={}) {
      const owner=RI.ownerId,slot=RI.workspaceSlot;let alive=true;
      const current=()=>alive&&root.isConnected&&owner===RI.ownerId&&slot===RI.workspaceSlot;
      const initialTab=RI.workspaceSlot===3?'lt':'rt',requestedTab=options.journey?null:new URLSearchParams(location.search).get('tab');
      let choiceSerial=0;
      let tab = ['lt','font','pal',...(RI.workspaceSlot===3?[]:['rt'])].includes(requestedTab)?requestedTab:initialTab, cat = 'all', acc = 'all', galleryPage = 0,query='',sort='newest',searchTimer;
      const body = RI.$('#tbody', root);
      const compactGallery = matchMedia('(max-width:600px)');
      const resizeGallery = () => { galleryPage = 0; paint(); };
      compactGallery.addEventListener('change', resizeGallery);
      const th = () => RI.C().theme;

      function applyTheme(patch, msg) {if(!current())return; Object.assign(th(), patch); RI.touch('theme'); RI.toast(msg || 'ظاهر انتخاب شد'); paint(); }


      async function choose(kind, id) {
        const choice=++choiceSerial;
        const list = kind === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES, it = list.find((x) => x.id === id), ref = kind + ':' + id;
        if (!RI.canUse(ref, it)) { const ok = await RI.lockedExplain(Object.assign({ kind: kind }, it)); if (!ok) return paint(); }
        if(!current())return;
        if(kind==='rt')try{if(!RI.templateTransition)await import('/dashboard/js/template-loading.js?v='+encodeURIComponent(document.documentElement.dataset.assetVersion||''));if(!current())return;await RI.templateTransition(id);}catch(error){if(current()&&choice===choiceSerial&&error.name!=='AbortError')RI.toast(error.message,{kind:'error'});return;}
        if(!current()||choice!==choiceSerial)return;
        applyTheme(kind === 'rt' ? { resume: id } : { links: id }, 'قالب «' + it.name + '» انتخاب شد');
      }

      function filters() {
        return '<div class="workspace-tools"><div class="field"><label class="field__label" for="template-query">جست‌وجوی قالب</label><input class="input" type="search" id="template-query" value="'+esc(query)+'" placeholder="نام، کاربرد یا ویژگی"></div><div class="field"><label class="field__label" for="template-sort">مرتب‌سازی</label><select class="select" id="template-sort">'+[['newest','جدیدترین'],['cheap','ارزان‌ترین خرید تکی'],['expensive','گران‌ترین خرید تکی'],['name','نام قالب']].map(([id,label])=>'<option value="'+id+'" '+(sort===id?'selected':'')+'>'+label+'</option>').join('')+'</select></div></div><div class="filters"><div class="chiprow" role="group" aria-label="دسته">' + CATS.map((c) => '<button type="button" class="filter-chip" data-cat="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + c[1] + '</button>').join('') + '</div><div class="chiprow" role="group" aria-label="دسترسی">' + ACC.map((c) => '<button type="button" class="filter-chip" data-acc="' + c[0] + '" aria-pressed="' + (acc === c[0]) + '">' + c[1] + '</button>').join('') + '</div></div>';
      }

      function gallery(kind) {
        const list = (kind === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES).filter((t) => RI.matches(query,t.name,t.desc,...t.cats.map(c=>CATS.find(x=>x[0]===c)?.[1]))&&(cat === 'all' || t.cats.indexOf(cat) > -1) && (acc === 'all' || t.access === acc || (acc === 'sub' && t.subscription)));
        const price=t=>t.price??(t.access==='free'?0:null);const priced=(a,b,descending)=>price(a)===null?(price(b)===null?0:1):price(b)===null?-1:descending?price(b)-price(a):price(a)-price(b);
        if(sort==='cheap')list.sort((a,b)=>priced(a,b,false));else if(sort==='expensive')list.sort((a,b)=>priced(a,b,true));else if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
        const curId = kind === 'rt' ? th().resume : th().links;
        const cur = RI.findTemplate(kind === 'rt' ? 'resume' : 'links', curId);
        const pageSize = compactGallery.matches ? 2 : options.journey ? 4 : 6;
        const pageCount = Math.ceil(list.length / pageSize);
        galleryPage = Math.min(galleryPage, Math.max(0, pageCount - 1));
        const cards = list.slice(galleryPage * pageSize, (galleryPage + 1) * pageSize).map((t) => {
          const ref = kind + ':' + t.id, on = t.id === curId, usable = RI.canUse(ref, t);
          return '<article class="tcard' + (on ? ' is-current' : '') + '" data-id="' + t.id + '"><button type="button" class="tcard__preview" data-template-preview="'+t.id+'" aria-label="پیش‌نمایش قالب '+esc(t.name)+'"><span class="tcard__thumb">' + RI.thumbHtml(kind === 'rt' ? 'resume' : 'links', t.id) + (!usable ? '<span class="tcard__lock">' + RI.icon('lock') + '</span>' : '') + (on ? '<span class="tcard__on">' + RI.icon('check') + 'در حال استفاده</span>' : '') + '</span></button>' +
            '<div class="tcard__body"><div class="tcard__title"><h3>' + t.name + '</h3>' + RI.accessBadge(ref, t) + '</div><p>' + t.desc + '</p><div class="tcard__cats">' + t.cats.map((c) => '<span class="chip">' + CATS.find((x) => x[0] === c)[1] + '</span>').join('') + '</div>' +
            '<div class="tcard__actions"><button type="button" class="btn btn--soft btn--sm" data-use="'+t.id+'" '+(on?'disabled':'')+'>'+RI.icon(on?'check':usable?'plus':'lock')+(on?'در حال استفاده':'استفاده')+'</button></div></div></article>';
        }).join('');
        return '<div class="current"><div><span>' + RI.icon('check') + 'قالب فعلی</span><b>' + cur.name + '</b></div>' + RI.accessBadge(kind + ':' + cur.id, cur) + '</div>' + (options.journey?'<details class="journey-details"><summary>جست‌وجو و فیلتر قالب‌ها</summary>'+filters()+'</details>':filters()) +
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

      // Colour studio: palettes grouped by mood, a custom colour, and a live sample drawn with the current templates'
      // real variables. Swatches show the colour as it will appear on this template, after readability adjustment.
      function resumeTemplate(){return RI.findTemplate('resume',th().resume)||RI.RESUME_TEMPLATES[0];}
      function linksTemplate(){return RI.findTemplate('links',th().links)||RI.LINK_TEMPLATES[0];}
      // What to draw: undefined = the saved choice, a palette id, or [accent, second] for an unsaved custom colour.
      function themeWith(choice){const t=Object.assign({},th());if(choice===undefined)return t;if(typeof choice==='string'){t.palette=t.linksPalette=choice;return t;}t.palette=t.linksPalette='custom';t.custom=choice[0];return t;}
      function proof(colors){
        const theme=themeWith(colors),tpl=resumeTemplate(),lt=linksTemplate(),seeds=RI.paletteColors(theme),v=RI.harmonize(Object.assign({},tpl.v),seeds),ratio=RI.color.contrast(v.accent,v.bg),dark=RI.color.lum(tpl.v.bg)<.2;
        const grade=ratio>=7?['عالی','is-best']:ratio>=4.5?['خوب','is-good']:['کم','is-low'];
        return '<div class="cs-proof__frame"><div class="pv cs-mini" style="'+esc(RI.resumeVars(tpl,theme))+'"><div class="cs-mini__hero"></div><div class="cs-mini__body"><span class="cs-mini__avatar">ر</span><h3 class="pv-name">رها کیانی</h3><p class="pv-title">طراح محصول · تهران</p><div class="pv-sec"><h3>مهارت‌ها</h3><ul class="pv-chips"><li>طراحی رابط<span class="pv-dots"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span></li><li>پژوهش کاربر</li></ul></div><div class="pv-sec"><h3>سوابق</h3><ul class="pv-tl"><li><b>طراح ارشد</b><p>استودیو نقش · ۱۴۰۱ تا اکنون</p></li></ul></div><a class="pv-url">resumeit.ir/raha</a></div></div>'+
          '<div class="lv cs-mini cs-mini--links" style="'+esc(RI.linksVars(lt,theme,RI.C().links.style))+'"><span class="lv-btn"><span class="lv-btn__txt"><b>نمونه‌کارهای من</b></span></span></div></div>'+
          '<p class="cs-meter '+grade[1]+'">'+RI.icon(ratio>=4.5?'check':'alert')+'<span>خوانایی رنگ روی «'+esc(tpl.name)+'»: <b>'+grade[0]+'</b> <small dir="ltr">'+ratio.toFixed(1)+':1</small></span></p>'+
          (seeds&&dark?'<p class="cs-note">'+RI.icon('info')+'این قالب تیره است؛ رنگ کمی روشن‌تر نمایش داده می‌شود تا روی زمینه خوانا بماند.</p>':seeds?'<p class="cs-note">'+RI.icon('info')+'رنگ‌ها برای هر قالب خودکار تنظیم می‌شوند؛ با عوض‌کردن قالب، هماهنگی حفظ می‌شود.</p>':'<p class="cs-note">'+RI.icon('info')+'رنگ‌های اصلی طراح قالب استفاده می‌شوند.</p>');
      }
      function swatch(colors){const tpl=resumeTemplate(),v=RI.harmonize(Object.assign({},tpl.v),colors);return '<span class="pcard__sw"><i style="background:'+v.accent+'"></i><i style="background:'+v.accent2+'"></i></span>';}
      function palettes() {
        const cur = th().palette, r = th().radius, custom = RI.color.isHex(th().custom) ? th().custom : '#3d6b8a', customRef = 'pal:custom', customItem = RI.PALETTES.find(x => x.id === 'custom');
        const card = (p) => { const ref = 'pal:' + p.id, on = cur === p.id; return '<button type="button" class="pcard' + (on ? ' is-current' : '') + '" data-pal="' + p.id + '" aria-pressed="' + on + '">' + swatch(p.colors) + '<span class="pcard__name"><b>' + esc(p.name) + '</b>' + RI.accessBadge(ref, p) + '</span>' + (on ? '<span class="pcard__tick" aria-hidden="true">' + RI.icon('check') + '</span>' : '') + '</button>'; };
        const def = RI.PALETTES[0];
        return '<div class="panel color-studio"><div class="panel__head"><h2>رنگ صفحه‌ها</h2><p>یک ترکیب انتخاب کن؛ رزومه و صفحهٔ لینک با هم عوض می‌شوند و رنگ برای هر قالب طوری تنظیم می‌شود که متن همیشه خوانا بماند.</p></div><div class="cs-layout"><div class="cs-picker">' +
          '<button type="button" class="pcard pcard--default' + (cur === 'default' ? ' is-current' : '') + '" data-pal="default" aria-pressed="' + (cur === 'default') + '"><span class="pcard__auto">' + RI.icon('sparkle') + '</span><span class="pcard__name"><b>' + esc(def.name) + '</b><small>همان رنگ‌هایی که طراح برای «' + esc(resumeTemplate().name) + '» انتخاب کرده</small></span>' + (cur === 'default' ? '<span class="pcard__tick" aria-hidden="true">' + RI.icon('check') + '</span>' : '') + '</button>' +
          RI.PALETTE_GROUPS.map(([g, label]) => '<section class="cs-group" aria-label="' + esc(label) + '"><h3>' + esc(label) + '</h3><div class="pgrid">' + RI.PALETTES.filter(p => p.group === g).map(card).join('') + '</div></section>').join('') +
          '<section class="cs-group cs-custom' + (cur === 'custom' ? ' is-current' : '') + '" aria-labelledby="cs-custom-title"><h3 id="cs-custom-title">رنگ دلخواه ' + RI.accessBadge(customRef, customItem) + '</h3><p class="field__hint">رنگ برند یا رنگ محبوبت را بده؛ رنگ دوم هماهنگ و تنظیم خوانایی خودکار ساخته می‌شوند.</p><div class="cs-custom__row"><label class="cs-color"><span class="sr-only">انتخاب رنگ</span><input type="color" id="cs-custom" value="' + esc(custom) + '"></label><label class="cs-hex"><span class="sr-only">کد رنگ</span><input class="input" id="cs-custom-hex" dir="ltr" maxlength="7" value="' + esc(custom) + '" spellcheck="false" autocomplete="off"></label><button type="button" class="btn btn--primary btn--sm" data-custom-apply>' + RI.icon('check') + (cur === 'custom' ? 'به‌روزرسانی رنگ' : 'استفاده از این رنگ') + '</button></div></section>' +
          '</div><aside class="cs-proof" aria-label="پیش‌نمایش رنگ روی قالب فعلی"><p class="cs-proof__title">پیش‌نمایش روی قالب فعلی</p><div id="cs-proof">' + proof() + '</div><p class="cs-proof__hint">نشانگر را روی هر رنگ ببر تا اینجا امتحانش کنی.</p></aside></div></div>' +
          '<div class="panel"><div class="panel__head"><h2>گردی گوشه‌ها</h2><p>رزومه و صفحهٔ لینک با یک انتخاب هماهنگ می‌شوند.</p></div><div class="segmented" id="radius">' + Object.keys(RI.RADII).map((k) => '<button type="button" data-radius="' + k + '" aria-pressed="' + (r === k) + '">' + RI.RADII[k][0] + '</button>').join('') + '</div><div class="shape-proof" style="--shape-radius:' + RI.RADII[r][1] + ';--shape-color:' + (RI.harmonize(Object.assign({}, resumeTemplate().v), RI.paletteColors(th())).accent) + '"><span>نام و نام خانوادگی</span><span>' + RI.icon('link') + 'نمونهٔ لینک</span></div></div>';
      }
      function showProof(colors){const host=RI.$('#cs-proof',body);if(host)host.innerHTML=proof(colors);}
      function customValue(){const v=(RI.$('#cs-custom-hex',body)?.value||'').trim().toLowerCase(),hex=/^#?[0-9a-f]{6}$/.test(v)?(v[0]==='#'?v:'#'+v):null;return hex;}
      function paint() {
        if(!current())return;
        body.innerHTML = tab === 'rt' ? gallery('rt') : tab === 'lt' ? gallery('lt') : tab === 'font' ? fonts() : palettes();
        RI.$$('#ttabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
      }

      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab;if(!options.journey)RI.setRouteTab(tab,initialTab); galleryPage = 0; paint(); });
      body.addEventListener('input',e=>{if(e.target.id!=='template-query')return;query=e.target.value;galleryPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const position=e.target.selectionStart;paint();const input=body.querySelector('#template-query');input?.focus();if(input?.type==='search'&&position!==null)input.setSelectionRange(position,position);},200);});
      body.addEventListener('change',e=>{if(e.target.id==='template-sort'){sort=e.target.value;galleryPage=0;paint();}});
      function previewTemplate(id){const kind=tab==='rt'?'resume':'links',it=RI.findTemplate(kind,id),url='/'+(kind==='resume'?'resume':'link')+id+'/';return RI.modal({title:'پیش‌نمایش «'+it.name+'»',body:'<p>نمونه با اطلاعات آزمایشی در پنجرهٔ تازه باز می‌شود؛ ویرایشگر و تغییراتت همین‌جا باقی می‌مانند.</p>',actions:[{label:'انصراف',kind:'ghost'},{label:'باز کردن نمونه',kind:'primary',icon:'external',onClick:()=>{window.open(url,'_blank','noopener,noreferrer');}}]});}
      RI.delegate(body,'click','.tcard',(event,card)=>{if(event.target.closest('[data-use]'))return;previewTemplate(card.dataset.id);});
      RI.delegate(body, 'click', '[data-cat]', (e, b) => { cat = b.dataset.cat; galleryPage = 0; paint(); });
      RI.delegate(body, 'click', '[data-acc]', (e, b) => { acc = b.dataset.acc; galleryPage = 0; paint(); });
      RI.delegate(body, 'click', '[data-reset]', () => {clearTimeout(searchTimer);query='';cat = 'all'; acc = 'all'; galleryPage = 0; paint();body.querySelector('#template-query')?.focus(); });
      RI.delegate(body, 'click', '[data-gallery-page]', (e, b) => { galleryPage = Number(b.dataset.galleryPage); paint(); RI.$('.gallery-pages button:not([disabled])', body)?.focus(); });
      RI.delegate(body, 'click', '[data-use]', (e, b) => choose(tab, b.dataset.use));
      RI.delegate(body, 'click', '[data-try]', (e, b) => {
        const kind = tab === 'rt' ? 'resume' : 'links', list = tab === 'rt' ? RI.RESUME_TEMPLATES : RI.LINK_TEMPLATES, it = list.find((x) => x.id === b.dataset.try);
        previewTemplate(it.id);
      });
      RI.delegate(body, 'click', '[data-ftry]', (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.ftry);RI.modal({title:'فونت '+f.name,body:'<div class="font-proof" style="font-family:'+f.stack+'"><b style="font-family:'+(f.heading||f.stack)+'">رها کیانی</b><span>طراح تجربه‌های روشن و ماندگار</span><p>ResumeIt · ۰۱۲۳۴۵۶۷۸۹</p></div>',actions:[{label:'بستن',kind:'ghost'},{label:'انتخاب این فونت',kind:'primary',onClick:async()=>{if(RI.canUse('font:'+f.id,f)||await RI.lockedExplain({...f,kind:'font'}))applyTheme({font:f.id});}}]}); });
      RI.delegate(body, 'click', '[data-fuse]', async (e, b) => { const f = RI.FONTS.find((x) => x.id === b.dataset.fuse); if (!RI.canUse('font:' + f.id, f)) { if (!(await RI.lockedExplain(Object.assign({ kind: 'font' }, f)))) return paint(); } applyTheme({ font: f.id }, 'فونت «' + f.name + '» انتخاب شد'); });
      RI.delegate(body, 'click', '[data-pal]', async (e, b) => {
        const p = RI.PALETTES.find((x) => x.id === b.dataset.pal);
        if (!RI.canUse('pal:' + p.id, p)) { const ok = await RI.lockedExplain(Object.assign({ kind: 'pal' }, p)); if (!ok) return paint(); }
        applyTheme({ palette: p.id, linksPalette: p.id }, 'ترکیب رنگ «' + p.name + '» اعمال شد');
      });
      // Trying a colour only redraws the sample; leaving the card shows the saved choice again.
      const tryPalette = (e) => { const b = e.target.closest?.('[data-pal]'); if (!b || !body.contains(b)) return; const p = RI.PALETTES.find((x) => x.id === b.dataset.pal); showProof(p.id); };
      const restoreProof = (e) => { if (e.target.closest?.('[data-pal]') && !e.relatedTarget?.closest?.('[data-pal]')) showProof(undefined); };
      body.addEventListener('mouseover', tryPalette); body.addEventListener('focusin', tryPalette);
      body.addEventListener('mouseout', restoreProof); body.addEventListener('focusout', restoreProof);
      body.addEventListener('input', (e) => {
        if (e.target.id === 'cs-custom') { const hex = RI.$('#cs-custom-hex', body); if (hex) hex.value = e.target.value; showProof([e.target.value, RI.secondColor(e.target.value)]); }
        if (e.target.id === 'cs-custom-hex') { const v = customValue(); e.target.setAttribute('aria-invalid', String(!v)); if (v) { RI.$('#cs-custom', body).value = v; showProof([v, RI.secondColor(v)]); } }
      });
      RI.delegate(body, 'click', '[data-custom-apply]', async () => {
        const v = customValue(), item = RI.PALETTES.find((x) => x.id === 'custom');
        if (!v) { RI.toast('کد رنگ را شش‌رقمی بنویس؛ مثل #3d6b8a', { kind: 'error' }); RI.$('#cs-custom-hex', body)?.focus(); return; }
        if (!RI.canUse('pal:custom', item)) { const ok = await RI.lockedExplain(Object.assign({ kind: 'pal' }, item)); if (!ok) return paint(); }
        applyTheme({ palette: 'custom', linksPalette: 'custom', custom: v }, 'رنگ دلخواه اعمال شد');
      });
      RI.delegate(body, 'click', '[data-radius]', (e, b) => applyTheme({ radius: b.dataset.radius }, 'گردی گوشه‌ها تغییر کرد'));
      paint();
      return () => {alive=false;clearTimeout(searchTimer);compactGallery.removeEventListener('change',resizeGallery);};
    },
  });
})();
