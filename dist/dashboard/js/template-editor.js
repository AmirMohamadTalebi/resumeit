/* Editing surfaces follow the imported design's pages, sections and repeated items. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const fieldsOf = node => {
    const keys = new Set();
    const walk = n => { if (!n || typeof n !== 'object') return; if (n.field) keys.add(n.field); if (n.icon) keys.add(n.icon); if (n.original) walk(n.original); if (n.attrs) Object.values(n.attrs).forEach(walk); if (n.children) n.children.forEach(walk); };
    walk(node); return keys;
  };
  RI.importedEditorHtml = function () {
    return '<section class="panel template-workspace"><div class="panel__head"><h2>جزئیات همین رزومه</h2><p>همهٔ بخش‌ها در یک صفحه‌اند. پروژه‌ها را از تب «پروژه‌ها و نمونه‌کارها» اضافه کن؛ جزئیاتشان با کلیک باز می‌شود.</p></div>'+
      '<div class="form-grid template-selectors"><div class="field"><label for="template-page" class="field__label">صفحهٔ قالب</label><select id="template-page" class="select input"></select></div><div class="field"><label for="template-section" class="field__label">بخش این صفحه</label><select id="template-section" class="select input"></select></div></div>'+
      '<nav id="template-section-nav" class="template-section-nav" aria-label="بخش‌های صفحهٔ قالب"></nav>'+
      '<div class="template-tools"><label for="template-search" class="sr-only">جست‌وجو در محتوای بخش</label><input class="input" id="template-search" type="search" placeholder="جست‌وجوی متن، تصویر یا لینک در این بخش"><div class="row__actions"><button type="button" class="btn btn--soft btn--sm" data-tsection-shift="-1">بخش به بالا</button><button type="button" class="btn btn--soft btn--sm" data-tsection-shift="1">بخش به پایین</button></div></div>'+
      '<div class="tabs tabs-border template-categories" role="tablist" aria-label="نوع تنظیمات">'+[['all','همه'],['text','متن‌ها'],['media','تصاویر و آیکن'],['links','لینک و تماس'],['settings','نمایش و رنگ']].map(([key,title])=>'<button type="button" class="tab" role="tab" data-tcategory="'+key+'" aria-selected="'+(key==='all')+'">'+title+'</button>').join('')+'</div>'+
      '<div id="template-items"></div><div id="template-controls" class="template-fields"></div><div id="template-pager" class="template-pager"></div><div id="template-review" class="template-review"></div></section>';
  };
  RI.mountImportedEditor = function (root, preview) {
    const c = RI.C(), id = c.theme.resume, spec = RI.importedSpec(id);
    const page = root.querySelector('#template-page'), section = root.querySelector('#template-section'), search = root.querySelector('#template-search'), controls = root.querySelector('#template-controls');
    const itemHost=root.querySelector('#template-items'),pager=root.querySelector('#template-pager');
    let category='all',fieldPage=0,collectionKey='',rowIndex=0,focusField='';
    const state = () => { c.resumeTemplates ||= {}; return c.resumeTemplates[id] ||= { fields: {}, settings: {}, collections: {} }; };
    const changed = (review) => { if (!review) state().settings.reviewed = false; RI.touch('resumeTemplates'); };
    const control = (f, values, attrs, suffix) => {
      const value = RI.resumeValue(values || {}, f), key = 'tf-' + f.key + (suffix || '');
      let html;
      if (f.bind) return '<p class="field__hint">' + esc(f.label) + ' — از بخش «معرفی» تنظیم می‌شود: ' + esc(c.profile[f.bind] || 'هنوز وارد نشده') + RI.templateFieldHelp(f,spec)+'</p>';
      const extra = ' id="' + key + '" ' + attrs + ' data-tfield="' + f.key + '" data-ttype="' + f.type + '" aria-describedby="' + key + '-error"';
      if (f.type === 'checkbox') html = '<input type="checkbox" class="checkbox"' + extra + (value ? ' checked' : '') + '>';
      else if (f.type === 'icon') html = '<select class="select input"' + extra + '>' + [['original','آیکن اصلی قالب'],...RI.LINK_ICONS.map(key=>[key,RI.LINK_ICON_NAMES[key]])].map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===value?' selected':'')+'>'+esc(o[1])+'</option>').join('') + '</select>';
      else if (f.type === 'select') html = '<select class="select input"' + extra + '>' + f.options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0]===value?' selected':'') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      else if (f.type === 'textarea') html = '<textarea class="textarea" rows="3" maxlength="' + (f.max || 1000) + '"' + extra + '>' + esc(value) + '</textarea>';
      else html = '<input class="input" type="' + (f.type === 'color' ? 'color' : 'text') + '"' + extra + ' value="' + esc(value) + '" maxlength="' + (f.max || 1000) + '"' + (['url','link','image','contact'].includes(f.type) ? ' dir="ltr"' : '') + '>';
      if (f.type === 'link') html += '<label class="field__label" for="' + key + '-target">یا یک صفحهٔ داخلی انتخاب کن</label><select class="select input" id="' + key + '-target" ' + attrs + ' data-tfield="' + f.key + '"><option value="">انتخاب صفحه</option>' + Object.entries(spec.pages).map(([page, p]) => '<option value="/?page=' + page + '">' + esc(p.title) + '</option>').join('') + '<option value="#ri-contact">راه‌های تماس عمومی</option></select>';
      if (f.type === 'image') html += (value ? '<img src="' + esc(value) + '" alt="پیش‌نمایش" style="max-width:100%;height:100px;object-fit:contain">' : '') + '<label class="field__label" for="' + key + '-file">بارگذاری PNG، JPEG یا WebP (حداکثر '+RI.fa(Math.floor(RI.imageLimit()/1024))+' کیلوبایت برای این حساب)</label><input class="file-input" type="file" id="' + key + '-file" accept="image/png,image/jpeg,image/webp" ' + attrs + ' data-tupload="' + f.key + '">';
      return '<div class="field"><label class="field__label" for="' + key + '">' + esc(f.label) +RI.templateFieldHelp(f,spec)+ '</label>' + html + (['text','textarea'].includes(f.type)?'<div class="field__hint">متن پیش‌فرض را می‌توانی تغییر بدهی یا کاملاً پاک کنی.</div><button type="button" class="btn btn--ghost btn--sm" data-advisor-confirm="'+esc(f.key)+'" '+attrs+'>این متن اطلاعات واقعی من است</button>':'') + '<div class="field__error" id="' + key + '-error" role="alert" hidden></div></div>';
    };
    function rowsFor(def) {
      const values = state(); values.collections ||= {};
      return values.collections[def.key] === undefined ? [{ id: 'original', fields: {} }] : values.collections[def.key];
    }
    function paint() {
      const values=state(),query=search.value.trim().toLowerCase(),group=section.value;
      const defs=spec.collections.filter(x=>x.group===group),repeated=new Set(defs.flatMap(x=>[...fieldsOf(x.node)]));
      if(!defs.some(x=>x.key===collectionKey))collectionKey='';
      const def=defs.find(x=>x.key===collectionKey),rows=def?rowsFor(def):[],selectedKeys=def?fieldsOf(def.node):new Set();
      rowIndex=Math.max(0,Math.min(rowIndex,rows.length-1));
      const label=f=>f.label.replace(/^(alt|title|aria-label|placeholder):/,m=>({'alt:':'توضیح تصویر:','title:':'عنوان راهنما:','aria-label:':'نام دسترس‌پذیر:','placeholder:':'راهنمای ورودی:'})[m]);
      const match=(f,data)=>{
        const kind=['image','icon'].includes(f.type)?'media':['url','link','contact'].includes(f.type)?'links':['color','checkbox','select'].includes(f.type)?'settings':'text';
        return (category==='all'||category===kind)&&(!query||(label(f)+' '+RI.resumeValue(data,f)).toLowerCase().includes(query));
      };
      const entries=[];
      if(!def){
        for(const f of spec.settings.filter(f=>f.type!=='order'&&f.key!=='reviewed'&&(page.value==='appearance'&&!f.group||f.group===group)))if(match(f,values.settings))entries.push([f,values.settings,'data-tgroup="settings"','']);
        for(const f of spec.fields.filter(f=>f.group===group&&!repeated.has(f.key)))if(match(f,values.fields))entries.push([f,values.fields,'data-tgroup="fields"','']);
      }else if(rows.length){
        const data=Object.assign({},values.fields,rows[rowIndex].fields);
        for(const f of spec.fields.filter(f=>selectedKeys.has(f.key)))if(match(f,data))entries.push([f,data,'data-tcollection="'+def.key+'" data-trow="'+rows[rowIndex].id+'"','-'+def.key+'-'+rows[rowIndex].id]);
      }
      const pages=Math.max(1,Math.ceil(entries.length/8));if(focusField){const index=entries.findIndex(([f])=>f.key===focusField);if(index>=0)fieldPage=Math.floor(index/8);}fieldPage=Math.min(fieldPage,pages-1);
      controls.innerHTML=entries.slice(fieldPage*8,fieldPage*8+8).map(([f,v,attrs,suffix])=>control({...f,label:label(f)},v,attrs,suffix)).join('')||'<p class="template-empty">فیلدی با این فیلتر پیدا نشد. نوع تنظیمات یا عبارت جست‌وجو را عوض کن.</p>';
      itemHost.innerHTML=defs.length?'<div class="template-item-tools"><label for="template-collection">محتوای ثابت یا مجموعهٔ تکرارشونده</label><select class="input select" id="template-collection"><option value="">محتوای ثابت این بخش</option>'+defs.map((d,i)=>'<option value="'+d.key+'"'+(d.key===collectionKey?' selected':'')+'>مجموعهٔ '+RI.fa(i+1)+' — '+esc(d.label.replace(/\s+/g,' ').trim().slice(0,60))+'</option>').join('')+'</select>'+ (def?'<label for="template-row">مورد قابل ویرایش</label><select class="input select" id="template-row">'+rows.map((r,i)=>'<option value="'+i+'"'+(i===rowIndex?' selected':'')+'>مورد '+RI.fa(i+1)+'</option>').join('')+'</select><div class="row__actions"><button type="button" class="btn btn--soft btn--sm" data-tadd="'+def.key+'"'+(rows.length>=30?' disabled':'')+'>افزودن مورد</button>'+(rows.length?'<button type="button" class="btn btn--soft btn--sm" data-tmove="-1" data-tlist="'+def.key+'" data-rowid="'+rows[rowIndex].id+'"'+(!rowIndex?' disabled':'')+'>بالا</button><button type="button" class="btn btn--soft btn--sm" data-tmove="1" data-tlist="'+def.key+'" data-rowid="'+rows[rowIndex].id+'"'+(rowIndex===rows.length-1?' disabled':'')+'>پایین</button><button type="button" class="btn btn--ghost btn--sm" data-tremove="'+def.key+'" data-rowid="'+rows[rowIndex].id+'">حذف این مورد</button>':'')+'</div>':'')+'</div>':'';
      pager.innerHTML='<span>'+RI.fa(entries.length)+' فیلد · صفحهٔ '+RI.fa(fieldPage+1)+' از '+RI.fa(pages)+'</span><div><button type="button" class="btn btn--soft btn--sm" data-tpage="-1"'+(!fieldPage?' disabled':'')+'>قبلی</button><button type="button" class="btn btn--soft btn--sm" data-tpage="1"'+(fieldPage===pages-1?' disabled':'')+'>بعدی</button></div>';
      root.querySelector('#template-review').innerHTML=control(spec.settings.find(f=>f.key==='reviewed'),values.settings,'data-tgroup="settings"');
      root.querySelectorAll('[data-tcategory]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tcategory===category)));
      root.querySelectorAll('[data-tsection]').forEach(b=>b.setAttribute('aria-current',b.dataset.tsection===group?'true':'false'));
      preview?.setTemplateSection?.(group);
      if(focusField){controls.querySelector('[data-tfield="'+focusField+'"]')?.focus();focusField='';}
    }
    function sections() {
      const groups = spec.groups.filter(g => g.page === page.value);
      section.innerHTML = groups.map(g => '<option value="' + esc(g.key) + '">' + esc(g.label) + '</option>').join('');
      section.disabled = !groups.length;fieldPage=0;collectionKey='';rowIndex=0;
      root.querySelector('#template-section-nav').innerHTML=groups.map(g=>'<button type="button" data-tsection="'+esc(g.key)+'">'+esc(g.label)+'</button>').join('');paint();
      if (preview) preview.setTemplatePage(page.value === 'appearance' ? 'home' : page.value);
    }
    page.innerHTML = Object.entries(spec.pages).map(([key, p]) => '<option value="' + key + '">' + esc(p.title) + '</option>').join('') + '<option value="appearance">رنگ‌های قالب</option>';
    page.addEventListener('change', sections); section.addEventListener('change',()=>{fieldPage=0;collectionKey='';rowIndex=0;paint();});search.addEventListener('input',()=>{fieldPage=0;paint();});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-tcategory],[data-tpage],[data-tsection]');if(!b)return;if(b.dataset.tcategory){category=b.dataset.tcategory;fieldPage=0;}if(b.dataset.tpage)fieldPage+=Number(b.dataset.tpage);if(b.dataset.tsection){section.value=b.dataset.tsection;fieldPage=0;collectionKey='';rowIndex=0;}paint();});
    itemHost.addEventListener('change',e=>{if(e.target.id==='template-collection'){collectionKey=e.target.value;rowIndex=0;}if(e.target.id==='template-row')rowIndex=Number(e.target.value);fieldPage=0;paint();});
    root.querySelectorAll('[data-tsection-shift]').forEach(b=>b.addEventListener('click',()=>{
      const keys=spec.groups.filter(g=>g.page===page.value&&!g.key.endsWith(':body')&&g.key!=='home:compose').map(g=>g.key),saved=(state().settings.section_order||'').split(',').filter(Boolean);
      keys.sort((a,b)=>{const ai=saved.indexOf(a),bi=saved.indexOf(b);return (ai<0?99999:ai)-(bi<0?99999:bi);});
      const index=keys.indexOf(section.value),to=index+Number(b.dataset.tsectionShift);if(index<0||to<0||to>=keys.length)return;
      RI.move(keys,index,to);state().settings.section_order=saved.filter(k=>!keys.includes(k)).concat(keys).join(',');changed();paint();
    }));
    function update(el, value) {
      const f = [...spec.fields, ...spec.settings].find(x => x.key === (el.dataset.tfield || el.dataset.tupload));
      if (!f) return;
      if(f.key==='font'&&el.dataset.tgroup==='settings'){const font=RI.FONTS.find(x=>x.id===value);if(font&&!RI.canUse('font:'+font.id,font)){RI.lockedExplain(Object.assign({kind:'font'},font));paint();return;}}
      const error = root.querySelector('#' + el.id.replace(/-file$/, '') + '-error');
      if (!RI.templateFieldValid(f, value)) { el.setAttribute('aria-invalid', 'true'); if (error) { error.hidden = false; error.textContent = 'مقدار معتبر نیست؛ آدرس تصویر باید HTTPS یا تصویر بارگذاری‌شده باشد.'; } return; }
      el.removeAttribute('aria-invalid'); if (error) error.hidden = true;
      let target = state()[el.dataset.tgroup || 'fields'];
      if (el.dataset.tcollection) { const def = spec.collections.find(x => x.key === el.dataset.tcollection); state().collections[def.key] ||= rowsFor(def); target = state().collections[def.key].find(x => x.id === el.dataset.trow).fields; }
      target[f.key] = value; changed(f.key === 'reviewed');
      if (el.id.endsWith('-target')) { const input = root.querySelector('#' + el.id.slice(0,-7)); if (input) input.value = value; }
      const review = root.querySelector('[data-tfield="reviewed"]'); if (review) review.checked = state().settings.reviewed === true;
    }
    RI.delegate(root,'click','[data-advisor-confirm]',(event,button)=>{
      const field=spec.fields.find(f=>f.key===button.dataset.advisorConfirm);if(!field)return;
      const collection=button.dataset.tcollection,row=button.dataset.trow,values=collection?state().collections[collection]?.find(r=>r.id===row)?.fields:state().fields;
      const target='template:'+id+(collection?':'+collection+':'+row:'')+':'+field.key;
      if(RI.confirmAdvisorSource)RI.confirmAdvisorSource(target,RI.resumeValue(values||{},field));else RI.toast('راهنمای کیفیت هنوز آماده نیست؛ کمی بعد دوباره بزن',{kind:'info'});
    });
    root.addEventListener('ri:template-focus',event=>{
      const target=event.detail,field=spec.fields.find(f=>f.key===target.field);if(!field||!spec.groups.some(g=>g.key===field.group))return;
      page.value='home';sections();section.value=field.group;search.value='';category='all';
      const parts=target.itemId.split(':');collectionKey=parts[1]||'';const def=spec.collections.find(c=>c.key===collectionKey);rowIndex=def?rowsFor(def).findIndex(r=>r.id===parts[2]):0;
      focusField=field.key;paint();
    });
    root.addEventListener('input', e => { const el = e.target; if (el.dataset.tfield) update(el, el.type === 'checkbox' ? el.checked : el.value); });
    root.addEventListener('change', e => {
      const el = e.target, file = el.files && el.files[0]; if (!el.dataset.tupload || !file) return;
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > RI.imageLimit()) { RI.toast('PNG، JPEG یا WebP تا '+RI.fa(Math.floor(RI.imageLimit()/1024))+' کیلوبایت برای این حساب انتخاب کن.', { kind: 'error' }); el.value = ''; return; }
      const reader = new FileReader(); reader.onload = () => { const image=new Image();image.onload=()=>{if(image.naturalWidth*image.naturalHeight>16000000){RI.toast('ابعاد تصویر بیش از حد بزرگ است.',{kind:'error'});return;}update(el,String(reader.result));paint();};image.onerror=()=>RI.toast('این فایل تصویر معتبر نیست.',{kind:'error'});image.src=String(reader.result); }; reader.onerror = () => RI.toast('خواندن تصویر انجام نشد.', { kind: 'error' }); reader.readAsDataURL(file);
    });
    itemHost.addEventListener('click', e => {
      const b = e.target.closest('[data-tadd],[data-tremove],[data-tmove]'); if (!b) return;
      const key = b.dataset.tadd || b.dataset.tremove || b.dataset.tlist, def = spec.collections.find(x => x.key === key);
      const rows = state().collections[key] ||= rowsFor(def), i = rows.findIndex(x => x.id === b.dataset.rowid);
      if (b.dataset.tadd && rows.length < 30) {rows.push({ id: RI.uid(), fields: Object.assign({}, rows[rows.length - 1]?.fields || {}) });rowIndex=rows.length-1;}
      else if (b.dataset.tremove && i >= 0) rows.splice(i, 1);
      else if (b.dataset.tmove && i >= 0) { const to = i + Number(b.dataset.tmove); if (to >= 0 && to < rows.length) {RI.move(rows, i, to);rowIndex=to;} }
      changed(); paint();
    });
    sections();
  };
})();
