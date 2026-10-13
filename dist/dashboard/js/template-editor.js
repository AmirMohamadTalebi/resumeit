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
    return '<div class="panel"><div class="panel__head"><h2>شخصی‌سازی کامل قالب</h2><p>هر صفحه و بخش را جدا ویرایش کن. متن‌ها، تصاویر، لینک‌ها و اعداد اولیه نمونه‌اند. تغییر قالب اطلاعات آن را حذف نمی‌کند.</p></div>' +
      '<div class="form-grid"><div class="field"><label for="template-page" class="field__label">صفحهٔ قالب</label><select id="template-page" class="select input"></select></div>' +
      '<div class="field"><label for="template-section" class="field__label">بخش</label><select id="template-section" class="select input"></select><div class="row__actions"><button type="button" class="btn" data-tsection-shift="-1">بخش به بالا</button><button type="button" class="btn" data-tsection-shift="1">بخش به پایین</button></div></div>' +
      '<div class="field span-2"><label class="field__label" for="template-search">جست‌وجو در محتوای بخش</label><input class="input" id="template-search" type="search" placeholder="متن، تصویر، دکمه یا لینک"></div></div><div id="template-controls"></div></div>';
  };
  RI.mountImportedEditor = function (root, preview) {
    const c = RI.C(), id = c.theme.resume, spec = RI.importedSpec(id);
    const page = root.querySelector('#template-page'), section = root.querySelector('#template-section'), search = root.querySelector('#template-search'), controls = root.querySelector('#template-controls');
    const state = () => { c.resumeTemplates ||= {}; return c.resumeTemplates[id] ||= { fields: {}, settings: {}, collections: {} }; };
    const changed = (review) => { if (!review) state().settings.reviewed = false; RI.touch('resumeTemplates'); };
    const control = (f, values, attrs, suffix) => {
      const value = RI.resumeValue(values || {}, f), key = 'tf-' + f.key + (suffix || '');
      let html;
      if (f.bind) return '<p class="field__hint">' + esc(f.label) + ' — از بخش «معرفی» تنظیم می‌شود: ' + esc(c.profile[f.bind] || 'هنوز وارد نشده') + '</p>';
      const extra = ' id="' + key + '" ' + attrs + ' data-tfield="' + f.key + '" data-ttype="' + f.type + '" aria-describedby="' + key + '-error"';
      if (f.type === 'checkbox') html = '<input type="checkbox" class="checkbox"' + extra + (value ? ' checked' : '') + '>';
      else if (f.type === 'icon') html = '<select class="select input"' + extra + '>' + [['original','آیکن اصلی قالب'],...RI.LINK_ICONS.map(key=>[key,RI.LINK_ICON_NAMES[key]])].map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===value?' selected':'')+'>'+esc(o[1])+'</option>').join('') + '</select>';
      else if (f.type === 'select') html = '<select class="select input"' + extra + '>' + f.options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0]===value?' selected':'') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      else if (f.type === 'textarea') html = '<textarea class="textarea" rows="3" maxlength="' + (f.max || 1000) + '"' + extra + '>' + esc(value) + '</textarea>';
      else html = '<input class="input" type="' + (f.type === 'color' ? 'color' : 'text') + '"' + extra + ' value="' + esc(value) + '" maxlength="' + (f.max || 1000) + '"' + (['url','link','image','contact'].includes(f.type) ? ' dir="ltr"' : '') + '>';
      if (f.type === 'link') html += '<label class="field__label" for="' + key + '-target">یا یک صفحهٔ داخلی انتخاب کن</label><select class="select input" id="' + key + '-target" ' + attrs + ' data-tfield="' + f.key + '"><option value="">انتخاب صفحه</option>' + Object.entries(spec.pages).map(([page, p]) => '<option value="/?page=' + page + '">' + esc(p.title) + '</option>').join('') + '<option value="#ri-contact">راه‌های تماس عمومی</option></select>';
      if (f.type === 'image') html += (value ? '<img src="' + esc(value) + '" alt="پیش‌نمایش" style="max-width:100%;height:100px;object-fit:contain">' : '') + '<label class="field__label" for="' + key + '-file">بارگذاری PNG، JPEG یا WebP (حداکثر ۲ مگابایت)</label><input class="file-input" type="file" id="' + key + '-file" accept="image/png,image/jpeg,image/webp" ' + attrs + ' data-tupload="' + f.key + '">';
      return '<div class="field"><label class="field__label" for="' + key + '">' + esc(f.label) + '</label>' + html + '<div class="field__error" id="' + key + '-error" role="alert" hidden></div></div>';
    };
    function rowsFor(def) {
      const values = state(); values.collections ||= {};
      return values.collections[def.key] === undefined ? [{ id: 'original', fields: {} }] : values.collections[def.key];
    }
    function paint() {
      const values = state(), query = search.value.trim().toLowerCase(), group = section.value;
      const match = f => !query || (f.label + ' ' + RI.resumeValue(values.fields, f)).toLowerCase().includes(query);
      const defs = spec.collections.filter(x => x.group === group), repeated = new Set(defs.flatMap(x => [...fieldsOf(x.node)]));
      let html = spec.settings.filter(f => f.type!=='order'&&(f.key === 'reviewed' || page.value === 'appearance' && !f.group || f.group === group)).filter(f=>!query||f.key==='reviewed'||f.label.toLowerCase().includes(query)).map(f => control(f, values.settings, 'data-tgroup="settings"')).join('');
      html += spec.fields.filter(f => f.group === group && !repeated.has(f.key) && match(f)).map(f => control(f, values.fields, 'data-tgroup="fields"')).join('');
      for (const def of defs) {
        const fields = spec.fields.filter(f => fieldsOf(def.node).has(f.key));
        if (query && !fields.some(match)) continue;
        const rows = rowsFor(def);
        html += '<details class="template-item" open><summary>' + esc(def.label) + ' (' + RI.fa(rows.length) + ' مورد)</summary>' + rows.map((row, i) => '<fieldset class="template-item__row"><legend>مورد ' + RI.fa(i + 1) + '</legend>' +
          fields.filter(match).map(f => control(f, Object.assign({}, values.fields, row.fields), 'data-tcollection="' + def.key + '" data-trow="' + row.id + '"', '-' + def.key + '-' + row.id)).join('') +
          '<div class="row__actions"><button type="button" class="btn" data-tmove="-1" data-tlist="' + def.key + '" data-rowid="' + row.id + '"' + (i === 0 ? ' disabled' : '') + '>بالا</button><button type="button" class="btn" data-tmove="1" data-tlist="' + def.key + '" data-rowid="' + row.id + '"' + (i === rows.length - 1 ? ' disabled' : '') + '>پایین</button><button type="button" class="btn" data-tremove="' + def.key + '" data-rowid="' + row.id + '">حذف مورد</button></div></fieldset>').join('') +
          '<button type="button" class="btn" data-tadd="' + def.key + '"' + (rows.length >= 30 ? ' disabled' : '') + '>افزودن مورد مشابه</button></details>';
      }
      controls.innerHTML = html || '<p>موردی پیدا نشد.</p>';
    }
    function sections() {
      const groups = spec.groups.filter(g => g.page === page.value);
      section.innerHTML = groups.map(g => '<option value="' + esc(g.key) + '">' + esc(g.label) + '</option>').join('');
      section.disabled = !groups.length; paint();
      if (preview) preview.setTemplatePage(page.value === 'appearance' ? 'home' : page.value);
    }
    page.innerHTML = Object.entries(spec.pages).map(([key, p]) => '<option value="' + key + '">' + esc(p.title) + '</option>').join('') + '<option value="appearance">رنگ‌های قالب</option>';
    page.addEventListener('change', sections); section.addEventListener('change', paint); search.addEventListener('input', paint);
    root.querySelectorAll('[data-tsection-shift]').forEach(b=>b.addEventListener('click',()=>{
      const keys=spec.groups.filter(g=>g.page===page.value&&!g.key.endsWith(':body')&&g.key!=='home:compose').map(g=>g.key),saved=(state().settings.section_order||'').split(',').filter(Boolean);
      keys.sort((a,b)=>{const ai=saved.indexOf(a),bi=saved.indexOf(b);return (ai<0?99999:ai)-(bi<0?99999:bi);});
      const index=keys.indexOf(section.value),to=index+Number(b.dataset.tsectionShift);if(index<0||to<0||to>=keys.length)return;
      RI.move(keys,index,to);state().settings.section_order=saved.filter(k=>!keys.includes(k)).concat(keys).join(',');changed();paint();
    }));
    function update(el, value) {
      const f = [...spec.fields, ...spec.settings].find(x => x.key === (el.dataset.tfield || el.dataset.tupload));
      if (!f) return;
      const error = root.querySelector('#' + el.id.replace(/-file$/, '') + '-error');
      if (!RI.templateFieldValid(f, value)) { el.setAttribute('aria-invalid', 'true'); if (error) { error.hidden = false; error.textContent = 'مقدار معتبر نیست؛ آدرس تصویر باید HTTPS یا تصویر بارگذاری‌شده باشد.'; } return; }
      el.removeAttribute('aria-invalid'); if (error) error.hidden = true;
      let target = state()[el.dataset.tgroup || 'fields'];
      if (el.dataset.tcollection) { const def = spec.collections.find(x => x.key === el.dataset.tcollection); state().collections[def.key] ||= rowsFor(def); target = state().collections[def.key].find(x => x.id === el.dataset.trow).fields; }
      target[f.key] = value; changed(f.key === 'reviewed');
      if (el.id.endsWith('-target')) { const input = root.querySelector('#' + el.id.slice(0,-7)); if (input) input.value = value; }
      const review = controls.querySelector('[data-tfield="reviewed"]'); if (review) review.checked = state().settings.reviewed === true;
    }
    controls.addEventListener('input', e => { const el = e.target; if (el.dataset.tfield) update(el, el.type === 'checkbox' ? el.checked : el.value); });
    controls.addEventListener('change', e => {
      const el = e.target, file = el.files && el.files[0]; if (!el.dataset.tupload || !file) return;
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { RI.toast('PNG، JPEG یا WebP تا ۲ مگابایت انتخاب کن.', { kind: 'error' }); el.value = ''; return; }
      const reader = new FileReader(); reader.onload = () => { update(el, String(reader.result)); paint(); }; reader.onerror = () => RI.toast('خواندن تصویر انجام نشد.', { kind: 'error' }); reader.readAsDataURL(file);
    });
    controls.addEventListener('click', e => {
      const b = e.target.closest('[data-tadd],[data-tremove],[data-tmove]'); if (!b) return;
      const key = b.dataset.tadd || b.dataset.tremove || b.dataset.tlist, def = spec.collections.find(x => x.key === key);
      const rows = state().collections[key] ||= rowsFor(def), i = rows.findIndex(x => x.id === b.dataset.rowid);
      if (b.dataset.tadd && rows.length < 30) rows.push({ id: RI.uid(), fields: Object.assign({}, rows[rows.length - 1]?.fields || {}) });
      else if (b.dataset.tremove && i >= 0) rows.splice(i, 1);
      else if (b.dataset.tmove && i >= 0) { const to = i + Number(b.dataset.tmove); if (to >= 0 && to < rows.length) RI.move(rows, i, to); }
      changed(); paint();
    });
    sections();
  };
})();
