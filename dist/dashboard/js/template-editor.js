/* Editing surfaces follow the imported design's pages, sections and repeated items. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const fieldsOf = node => {
    const keys = new Set();
    const walk = n => { if (!n || typeof n !== 'object') return; if (n.field) keys.add(n.field); if (n.icon) keys.add(n.icon); if (n.progress) keys.add(n.progress); if (n.original) walk(n.original); if (n.attrs) Object.values(n.attrs).forEach(walk); if (n.children) n.children.forEach(walk); };
    walk(node); return keys;
  };
  RI.importedEditorHtml = function (options={}) {
    return '<section class="panel template-workspace' + (options.section?' is-section-editor':'') + '"><div class="panel__head"><h2>' + esc(options.title||'جزئیات همین رزومه') + '</h2><p>این گزینه‌ها فقط همین بخش از پیش‌نمایش را تغییر می‌دهند. راهنمای هر گزینه با ماوس، صفحه‌کلید یا لمس در دسترس است.</p></div>'+
      '<div class="form-grid template-selectors"><div class="field"><label for="template-page" class="field__label">صفحهٔ قالب</label><select id="template-page" class="select input"></select></div><div class="field"><label for="template-section" class="field__label">بخش این صفحه</label><select id="template-section" class="select input"></select></div></div>'+
      '<nav id="template-section-nav" class="template-section-nav" aria-label="بخش‌های صفحهٔ قالب"></nav>'+
      '<button type="button" class="btn btn--ghost btn--sm template-advanced" data-template-advanced aria-expanded="false">گزینه‌های بیشتر این بخش</button><div class="template-tools"><label for="template-search" class="sr-only">جست‌وجو در محتوای بخش</label><input class="input" id="template-search" type="search" placeholder="جست‌وجوی متن، تصویر یا لینک در این بخش"><div class="row__actions"><button type="button" class="btn btn--soft btn--sm" data-tsection-shift="-1">بخش به بالا</button><button type="button" class="btn btn--soft btn--sm" data-tsection-shift="1">بخش به پایین</button></div></div>'+
      '<div class="tabs tabs-border template-categories" role="tablist" aria-label="نوع تنظیمات">'+[['all','همه'],['text','متن‌ها'],['media','تصاویر و آیکن'],['links','لینک و تماس'],['settings','نمایش و رنگ']].map(([key,title])=>'<button type="button" class="tab" role="tab" data-tcategory="'+key+'" aria-selected="'+(key==='all')+'">'+title+'</button>').join('')+'</div>'+
      '<div id="template-items"></div><div id="template-controls" class="template-fields"></div><div id="template-pager" class="template-pager"></div><div id="template-review" class="template-review"></div></section>';
  };
  RI.mountImportedEditor = function (root, preview, options={}) {
    const c = RI.C(), id = c.theme.resume, spec = RI.effectiveTemplateSpec(id),owner=RI.ownerId,slot=RI.workspaceSlot,guided=options.guided===true;
    const current=()=>root.isConnected&&owner===RI.ownerId&&slot===RI.workspaceSlot&&RI.C()===c;
    const uploads=new Map();
    const groupLabel=RI.templateGroupLabel;
    if(guided){root.querySelector('.template-workspace').classList.add('journey-template');root.querySelector('.template-workspace .panel__head p').textContent='بخش و مورد را انتخاب کن و متن نمونه را با اطلاعات واقعی خودت عوض کن؛ تنظیمات پیشرفته در ویرایش مستقیم باقی می‌مانند.';}
    const page = root.querySelector('#template-page'), section = root.querySelector('#template-section'), search = root.querySelector('#template-search'), controls = root.querySelector('#template-controls');
    const itemHost=root.querySelector('#template-items'),pager=root.querySelector('#template-pager');
    let advanced=false,category=guided?'text':'all',fieldPage=0,collectionKey='',rowIndex=0,focusField='';
    const state = () => { c.resumeTemplates ||= {}; return c.resumeTemplates[id] ||= { fields: {}, settings: {}, collections: {} }; };
    const changed = (review) => { if (!review) state().settings.reviewed = false; RI.touch('resumeTemplates'); };
    const imageCaptions=new Map();
    const findCaptions=node=>{if(!node||typeof node!=='object')return;const image=node.tag==='img'&&node.attrs?.src?.field,caption=node.attrs?.alt?.field;if(image&&caption)imageCaptions.set(image,caption);node.children?.forEach(findCaptions);if(node.original)findCaptions(node.original);};
    Object.values(RI.IMPORTED_TEMPLATES[id].pages).forEach(page=>findCaptions(page.node));spec.collections.forEach(collection=>findCaptions(collection.node));
    const control = (f, values, attrs, suffix) => {
      const value=RI.resumeValue(values||{},f),key='tf-'+f.key+(suffix||''),help=RI.templateFieldHelp(f,spec);
      const error='<div class="field__error" id="'+key+'-error" role="alert" hidden></div>';
      if(f.bind)return '<div class="field template-bound" data-tbound="' + esc(f.key) + '"><span>'+esc(f.label)+' — '+(f.bind==='avatar'?'عکس مشترک پروفایل':esc(c.profile[f.bind]||'هنوز وارد نشده'))+'</span>'+help+'<button type="button" class="textlink" data-template-source="'+esc(f.bind)+'">ویرایش در معرفی</button></div>';
      const extra=' id="'+key+'" '+attrs+' data-tfield="'+f.key+'" data-ttype="'+f.type+'" aria-describedby="'+key+'-error"';
      const label='<div class="template-field-label"><label class="field__label" for="'+key+(f.type==='image'?'-file':'')+'">'+esc(f.label)+'</label>'+help+'</div>';
      if(f.type==='checkbox')return '<div class="field template-toggle"><label class="template-check" for="'+key+'"><input type="checkbox" class="checkbox checkbox-sm"'+extra+(value?' checked':'')+'><span>'+esc(f.key==='show_home_body'?'نمایش بخش اصلی قالب':f.key.startsWith('show_')?'نمایش '+groupLabel(spec.groups.find(g=>g.key===f.group)||{key:f.group,label:f.label}):f.label)+'</span></label>'+help+error+'</div>';
      let html;
      if(f.type==='icon')html='<select class="select input"'+extra+'>'+[['original','آیکن اصلی قالب'],...RI.LINK_ICONS.map(key=>[key,RI.LINK_ICON_NAMES[key]])].map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===value?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
      else if(f.type==='select')html='<select class="select input"'+extra+'>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===value?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
      else if(f.type==='textarea')html='<textarea class="textarea" rows="3" maxlength="'+(f.max||1000)+'"'+extra+'>'+esc(value)+'</textarea>';
      else if(f.type==='percent')html='<div class="template-percent"><input class="input" type="number" min="0" max="100" step="1" inputmode="numeric"'+extra+' value="'+esc(String(value).replace('%',''))+'"><span>درصد از ۱۰۰</span></div>';
      else html='<input class="input" type="'+(f.type==='color'?'color':'text')+'"'+extra+' value="'+esc(value)+'" maxlength="'+(f.max||1000)+'"'+(['url','link','image','contact'].includes(f.type)?' dir="ltr"':'')+'>';
      if(f.type==='link'){
        const targets=[...Object.entries(spec.pages).map(([page,p])=>['/?page='+page,p.title]),['#ri-contact','راه‌های تماس عمومی']];
        const internal=targets.some(([target])=>target===value);
        html='<select class="select input" aria-label="نوع مقصد '+esc(f.label)+'" id="'+key+'-target" '+attrs+' data-tfield="'+f.key+'"><option value=""'+(!internal?' selected':'')+'>نوشتن نشانی دلخواه</option>'+targets.map(([target,title])=>'<option value="'+esc(target)+'"'+(target===value?' selected':'')+'>'+esc(title)+'</option>').join('')+'</select><div class="template-link-address"'+(internal?' hidden':'')+'>'+html+'</div>';
      }
      if(f.type==='image')html=(value?'<img class="template-image-preview" src="'+esc(value)+'" alt="پیش‌نمایش '+esc(f.label)+'" width="160" height="100">':'<p class="field__hint">تصویری انتخاب نشده است.</p>')+'<p class="field__hint" id="'+key+'-upload-hint">PNG، JPEG یا WebP تا '+RI.fa(Math.floor(RI.imageLimit()/1024))+' کیلوبایت</p><input class="file-input template-file-input" type="file" id="'+key+'-file" aria-describedby="'+key+'-upload-hint '+key+'-error" accept="image/png,image/jpeg,image/webp" '+attrs+' data-tupload="'+f.key+'"><label class="btn btn--soft btn--sm template-upload" for="'+key+'-file">انتخاب یا جایگزینی تصویر</label><div class="row__actions"><button type="button" class="textlink" data-timage-clear="'+key+'"'+(!value?' disabled':'')+'>حذف تصویر این بخش</button></div><details class="template-image-address"><summary>آدرس تصویر (اختیاری)</summary>'+html+'</details>';
      if(f.type==='image'&&imageCaptions.has(f.key)){const caption=spec.fields.find(x=>x.key===imageCaptions.get(f.key));if(caption)html+='<div class="template-image-caption">'+control({...caption,label:'توضیح این تصویر',caption:true},values,attrs,suffix)+'</div>';}
      return '<div class="field">'+label+html+(['text','textarea'].includes(f.type)&&!f.caption?'<button type="button" class="textlink template-confirm" data-advisor-confirm="'+esc(f.key)+'" '+attrs+'>تأیید متن واقعی من</button>':'')+error+'</div>';
    };
    function rowsFor(def) {
      const values = state(); values.collections ||= {};
      return values.collections[def.key] === undefined ? [{ id: 'original', fields: {} }] : values.collections[def.key];
    }
    const itemLabel=(def,row)=>{const values=Object.assign({},state().fields,row?.fields),keys=fieldsOf(def.node),field=spec.fields.find(f=>keys.has(f.key)&&['text','textarea'].includes(f.type)&&!f.bind&&!/^(alt|title|aria-label|placeholder):/.test(f.label));return String(field?RI.resumeValue(values,field):def.label).replace(/\s+/g,' ').trim().slice(0,65)||'مورد بدون عنوان';};
    const firstCollection=group=>{const defs=spec.collections.filter(d=>d.group===group);return (defs.find(d=>/^(React|وردپرس|WordPress)\s/i.test(d.label))||defs.find(d=>[...fieldsOf(d.node)].some(k=>spec.fields.some(f=>f.key===k&&f.type==='text')))||defs[0])?.key||'';};
    function paint() {
      const activeId=root.contains(document.activeElement)?document.activeElement.id:'';
      const values=state(),query=search.value.trim().toLowerCase(),group=section.value;
      const defs=spec.collections.filter(x=>x.group===group),repeated=new Set(defs.flatMap(x=>[...fieldsOf(x.node)]));
      if(!defs.some(x=>x.key===collectionKey))collectionKey='';
      const def=defs.find(x=>x.key===collectionKey),rows=def?rowsFor(def):[],selectedKeys=def?fieldsOf(def.node):new Set();
      rowIndex=Math.max(0,Math.min(rowIndex,rows.length-1));
      const label=f=>f.label.replace(/^(alt|title|aria-label|placeholder):/,m=>({'alt:':'توضیح تصویر:','title:':'عنوان راهنما:','aria-label:':'نام دسترس‌پذیر:','placeholder:':'راهنمای ورودی:'})[m]);
      const match=(f,data)=>{
        const kind=['image','icon'].includes(f.type)?'media':['url','link','contact'].includes(f.type)?'links':['color','checkbox','select'].includes(f.type)?'settings':'text';
        return (!options.legacy||advanced)&&(!options.group||advanced||(!/^(title|aria-label|placeholder):/.test(f.label)&&f.type!=='color'))&&(!guided||category==='all'||!(/^(alt|title|aria-label|placeholder):/.test(f.label)||f.bind))&&(category==='all'||category===kind)&&(!query||(label(f)+' '+RI.resumeValue(data,f)).toLowerCase().includes(query));
      };
      let entries=[];
      if(!def){
        for(const f of spec.settings.filter(f=>f.type!=='order'&&f.key!=='reviewed'&&(options.group==='general'?(!f.group||f.group===group):(page.value==='appearance'&&!f.group||f.group===group))))if(match(f,values.settings))entries.push([f,values.settings,'data-tgroup="settings"','']);
        for(const f of spec.fields.filter(f=>f.group===group&&!repeated.has(f.key)))if(match(f,values.fields))entries.push([f,values.fields,'data-tgroup="fields"','']);
      }else if(rows.length){
        const data=Object.assign({},values.fields,rows[rowIndex].fields);
        for(const f of spec.fields.filter(f=>selectedKeys.has(f.key)))if(match(f,data))entries.push([f,data,'data-tcollection="'+def.key+'" data-trow="'+rows[rowIndex].id+'"','-'+def.key+'-'+rows[rowIndex].id]);
      }
      const captions=new Set(entries.filter(([field])=>field.type==='image'&&!field.bind).map(([field])=>imageCaptions.get(field.key)));entries=entries.filter(([field])=>!captions.has(field.key));
      const pageSize=guided?4:8,pages=Math.max(1,Math.ceil(entries.length/pageSize));if(focusField){const index=entries.findIndex(([f])=>f.key===focusField);if(index>=0)fieldPage=Math.floor(index/pageSize);}fieldPage=Math.min(fieldPage,pages-1);
      controls.innerHTML=entries.slice(fieldPage*pageSize,fieldPage*pageSize+pageSize).map(([f,v,attrs,suffix])=>control({...f,label:label(f)},v,attrs,suffix)).join('')||'<p class="template-empty">' + (options.legacy?'اطلاعات تماس عمومی از فیلدهای بالای همین تب می‌آید. گزینه‌های قدیمی فقط برای سازگاری نگهداری می‌شوند؛ برای دیدنشان «گزینه‌های بیشتر» را باز کن.':'گزینه‌ای مطابق جست‌وجو پیدا نشد. عبارت جست‌وجو را کوتاه‌تر کن.') + '</p>';
      itemHost.innerHTML=defs.length?'<div class="template-item-tools"><label for="template-collection">کدام قسمت از این بخش را ویرایش می‌کنی؟</label><select class="input select" id="template-collection"><option value="">عنوان‌ها و تنظیمات بخش</option>'+defs.map((d,i)=>'<option value="'+d.key+'"'+(d.key===collectionKey?' selected':'')+'>موردهای '+esc(d.label.replace(/\s+/g,' ').trim().slice(0,60))+'</option>').join('')+'</select>'+ (def?'<label for="template-row">مورد قابل ویرایش</label><select class="input select" id="template-row">'+rows.map((r,i)=>'<option value="'+i+'"'+(i===rowIndex?' selected':'')+'>مورد '+RI.fa(i+1)+'</option>').join('')+'</select><div class="row__actions"><button type="button" class="btn btn--soft btn--sm" data-tadd="'+def.key+'"'+(rows.length>=30?' disabled':'')+'>افزودن مورد</button>'+(rows.length?'<button type="button" class="btn btn--soft btn--sm" data-tmove="-1" data-tlist="'+def.key+'" data-rowid="'+rows[rowIndex].id+'"'+(!rowIndex?' disabled':'')+'>بالا</button><button type="button" class="btn btn--soft btn--sm" data-tmove="1" data-tlist="'+def.key+'" data-rowid="'+rows[rowIndex].id+'"'+(rowIndex===rows.length-1?' disabled':'')+'>پایین</button><button type="button" class="btn btn--ghost btn--sm" data-tremove="'+def.key+'" data-rowid="'+rows[rowIndex].id+'">حذف این مورد</button>':'')+'</div>':'')+'</div>':'';
      pager.innerHTML='<span>'+RI.fa(entries.length)+' فیلد · صفحهٔ '+RI.fa(fieldPage+1)+' از '+RI.fa(pages)+'</span><div><button type="button" class="btn btn--soft btn--sm" id="template-prev" data-tpage="-1"'+(!fieldPage?' disabled':'')+'>قبلی</button><button type="button" class="btn btn--soft btn--sm" id="template-next" data-tpage="1"'+(fieldPage===pages-1?' disabled':'')+'>بعدی</button></div>';
      itemHost.querySelectorAll('#template-collection option[value]').forEach(option=>{const d=defs.find(d=>d.key===option.value);if(d)option.textContent=itemLabel(d,rowsFor(d)[0]);});
      itemHost.querySelectorAll('#template-row option').forEach((option,i)=>option.textContent=itemLabel(def,rows[i]));
      if(guided){const label=itemHost.querySelector('label[for="template-collection"]'),fixed=itemHost.querySelector('#template-collection option[value=""]');if(label)label.textContent='کدام مورد را ویرایش می‌کنی؟';if(fixed)fixed.textContent='عنوان‌ها و متن‌های این بخش';}
      root.querySelector('#template-review').hidden=!!options.group&&options.group!=='general';
      root.querySelector('#template-review').innerHTML=options.group&&options.group!=='general'?'':control(spec.settings.find(f=>f.key==='reviewed'),values.settings,'data-tgroup="settings"');
      root.querySelectorAll('[data-tcategory]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tcategory===category)));
      root.querySelectorAll('[data-tsection]').forEach(b=>b.setAttribute('aria-current',b.dataset.tsection===group?'true':'false'));
      preview?.setTemplateSection?.(options.group==='general'?null:group,groupLabel(spec.groups.find(g=>g.key===group)||{key:group,label:'تنظیمات کلی قالب'}));
      if(activeId&&!focusField)root.querySelector('#'+CSS.escape(activeId))?.focus({preventScroll:true});
      if(focusField){controls.querySelector('[data-tfield="'+focusField+'"]')?.focus();focusField='';}
    }
    function sections() {
      const groups = spec.groups.filter(g => g.page === page.value&&(!options.group||g.key===(options.group==='general'?'home:body':options.group))&&(!guided||options.group||!g.key.endsWith(':body')));
      section.innerHTML = groups.map(g => '<option value="' + esc(g.key) + '">' + esc(groupLabel(g)) + '</option>').join('');
      section.disabled = !groups.length;fieldPage=0;collectionKey='';rowIndex=0;
      if(guided){const preferred=groups.find(g=>g.key==='home:resume'||/تکنولوژی|مهارت/.test(g.label))||groups[0];if(preferred){section.value=preferred.key;collectionKey=firstCollection(preferred.key);}}
      root.querySelector('#template-section-nav').innerHTML=groups.map(g=>'<button type="button" data-tsection="'+esc(g.key)+'">'+esc(groupLabel(g))+'</button>').join('');paint();
      if (preview) preview.setTemplatePage(page.value === 'appearance' ? 'home' : page.value);
    }
    page.innerHTML = Object.entries(spec.pages).map(([key, p]) => '<option value="' + key + '">' + esc(p.title) + '</option>').join('') + '<option value="appearance">رنگ‌های قالب</option>';
    page.addEventListener('change', sections); section.addEventListener('change',()=>{fieldPage=0;collectionKey='';rowIndex=0;paint();});search.addEventListener('input',()=>{fieldPage=0;paint();});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-tcategory],[data-tpage],[data-tsection]');if(!b)return;if(b.dataset.tcategory){category=b.dataset.tcategory;fieldPage=0;}if(b.dataset.tpage)fieldPage+=Number(b.dataset.tpage);if(b.dataset.tsection){section.value=b.dataset.tsection;fieldPage=0;collectionKey=guided?firstCollection(section.value):'';rowIndex=0;}paint();});
    itemHost.addEventListener('change',e=>{if(e.target.id==='template-collection'){collectionKey=e.target.value;rowIndex=0;}if(e.target.id==='template-row')rowIndex=Number(e.target.value);fieldPage=0;paint();});
    root.querySelectorAll('[data-tsection-shift]').forEach(b=>b.addEventListener('click',()=>{
      const keys=spec.groups.filter(g=>g.page===page.value&&!g.key.endsWith(':body')&&g.key!=='home:compose').map(g=>g.key),saved=(state().settings.section_order||'').split(',').filter(Boolean);
      keys.sort((a,b)=>{const ai=saved.indexOf(a),bi=saved.indexOf(b);return (ai<0?99999:ai)-(bi<0?99999:bi);});
      const index=keys.indexOf(section.value),to=index+Number(b.dataset.tsectionShift);if(index<0||to<0||to>=keys.length)return;
      RI.move(keys,index,to);state().settings.section_order=saved.filter(k=>!keys.includes(k)).concat(keys).join(',');changed();paint();
    }));
    function update(el, value) {
      if(!current())return;
      const f = [...spec.fields, ...spec.settings].find(x => x.key === (el.dataset.tfield || el.dataset.tupload));
      if (!f) return;
      if(f.key==='font'&&el.dataset.tgroup==='settings'){const font=RI.FONTS.find(x=>x.id===value);if(font&&!RI.canUse('font:'+font.id,font)){RI.lockedExplain(Object.assign({kind:'font'},font));paint();return;}}
      const error = root.querySelector('#' + el.id.replace(/-(file|target)$/, '') + '-error');
      if(f.type==='image')uploads.set(el.id.replace(/-file$/, ''),Symbol());
      if(f.type==='percent'&&value!=='')value=String(value)+'%';
      if (!RI.templateFieldValid(f, value)) { el.setAttribute('aria-invalid', 'true'); if (error) { error.hidden = false; error.textContent = f.type==='percent'?'درصد باید عدد صحیحی از ۰ تا ۱۰۰ باشد.':f.type==='image'?'آدرس تصویر باید HTTPS یا تصویر بارگذاری‌شده باشد.':'مقدار این گزینه معتبر نیست؛ راهنمای آن را بررسی کن.'; } return; }
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
    root.addEventListener('input', e => { const el = e.target;if(el.id.endsWith('-target')){const input=root.querySelector('#'+el.id.slice(0,-7)),box=input?.closest('.template-link-address');if(box)box.hidden=!!el.value;if(!el.value){input?.focus();return;}}if (el.dataset.tfield) update(el, el.type === 'checkbox' ? el.checked : el.value); });
    const uploadError=(el,message)=>{if(!current())return;const error=root.querySelector('#'+el.id.replace(/-file$/,'')+'-error');el.setAttribute('aria-invalid','true');if(error){error.hidden=false;error.textContent=message;}};
    root.addEventListener('change', e => {
      const el = e.target, file = el.files && el.files[0]; if (!el.dataset.tupload || !file) return;
      const uploadKey=el.id.replace(/-file$/, ''),generation=Symbol();uploads.set(uploadKey,generation);const latest=()=>current()&&uploads.get(uploadKey)===generation;
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > RI.imageLimit()) { uploadError(el,'PNG، JPEG یا WebP تا '+RI.fa(Math.floor(RI.imageLimit()/1024))+' کیلوبایت برای این حساب انتخاب کن.'); el.value = ''; return; }
      const reader = new FileReader(); reader.onload = () => {if(!latest())return; const image=new Image();image.onload=()=>{if(!latest())return;if(image.naturalWidth*image.naturalHeight>16000000){uploadError(el,'ابعاد تصویر بیش از حد بزرگ است.');return;}update(el,String(reader.result));paint();};image.onerror=()=>{if(latest())uploadError(el,'این فایل تصویر معتبر نیست.');};image.src=String(reader.result); }; reader.onerror = () => {if(latest())uploadError(el,'خواندن تصویر انجام نشد.');}; reader.readAsDataURL(file);
    });
    itemHost.addEventListener('click', e => {
      const b = e.target.closest('[data-tadd],[data-tremove],[data-tmove]'); if (!b||!current()) return;
      const key = b.dataset.tadd || b.dataset.tremove || b.dataset.tlist, def = spec.collections.find(x => x.key === key);
      const rows = state().collections[key] ||= rowsFor(def), i = rows.findIndex(x => x.id === b.dataset.rowid);
      if (b.dataset.tadd && rows.length < 30) {const fields=Object.assign({},rows[rows.length-1]?.fields||{});if(guided){const keys=fieldsOf(def.node);for(const f of spec.fields.filter(f=>keys.has(f.key)&&['text','textarea','contact','url','link','image'].includes(f.type)&&!f.bind))fields[f.key]='';}rows.push({ id: RI.uid(), fields });rowIndex=rows.length-1;}
      else if (b.dataset.tremove && i >= 0) rows.splice(i, 1);
      else if (b.dataset.tmove && i >= 0) { const to = i + Number(b.dataset.tmove); if (to >= 0 && to < rows.length) {RI.move(rows, i, to);rowIndex=to;} }
      changed(); paint();
    });
    if(options.group==='general')root.querySelector('.template-workspace .panel__head p').textContent='تنظیمات مشترک منو و ظاهر قالب؛ رنگ‌ها و گزینه‌های فنی در «گزینه‌های بیشتر» قرار دارند.';
    if(options.legacy){root.querySelector('.template-workspace .panel__head h2').textContent='سازگاری با نسخه‌های قبلی';root.querySelector('.template-workspace .panel__head p').textContent='این گزینه‌ها متعلق به بخش تماس قدیمی قالب‌اند و در رزومهٔ فعلی نمایش داده نمی‌شوند. اطلاعات و مقادیر قبلی حفظ شده‌اند.';}
    root.querySelector('[data-template-advanced]').hidden=!options.group;
    root.querySelector('[data-template-advanced]').addEventListener('click',event=>{advanced=!advanced;event.currentTarget.setAttribute('aria-expanded',String(advanced));event.currentTarget.textContent=advanced?'بستن گزینه‌های بیشتر':'گزینه‌های بیشتر این بخش';fieldPage=0;paint();});
    RI.delegate(root,'click','[data-timage-clear]',(event,button)=>{const input=root.querySelector('#'+button.dataset.timageClear);if(input){input.value='';update(input,'');paint();}});
    sections();
  };
})();
