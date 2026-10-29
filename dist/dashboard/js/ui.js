/* اجزای رابط: HTML کمکی، فرم‌ساز اعتبارسنجی‌دار، فیلد تصویر، حلقهٔ پیشرفت */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;
  RI.sectionLoading=label=>'<div class="section-loading" role="status"><span class="section-loading__spinner" aria-hidden="true"></span><span>'+esc(label)+'</span></div>';
  RI.fieldHelpHtml = ({label,what,where,defaultValue}) => {
    const initial=defaultValue===undefined||defaultValue===null||defaultValue===''?'خالی':typeof defaultValue==='boolean'?(defaultValue?'بله / فعال':'خیر / غیرفعال'):String(defaultValue);
    const help={label:String(label).slice(0,100),what,where,initial};
    return '<button type="button" class="btn btn--icon btn--ghost btn--sm field-help" data-field-help="'+esc(JSON.stringify(help))+'" aria-label="راهنمای '+esc(help.label)+'" data-help-summary="'+esc(what+' محل نمایش: '+where)+'">'+RI.icon('help')+'</button>';
  };
  RI.templateFieldHelp = (field,spec) => RI.fieldHelpHtml({label:field.label,what:field.key==='show_home_body'?'بخش اصلی محتوای قالب را نمایش می‌دهد یا پنهان می‌کند؛ اطلاعات ذخیره‌شده پاک نمی‌شود.':field.bind?'این مقدار از بخش معرفی می‌آید؛ برای تغییرش همان بخش را ویرایش کن.':field.key==='reviewed'?'تأیید می‌کنی که متن‌ها و تصاویر نمونه را برای انتشار بررسی کرده‌ای.':({text:'متن همین قسمت از قالب؛ می‌توانی تغییرش بدهی یا پاکش کنی.',textarea:'توضیح بلندتر همین قسمت از قالب؛ فقط اطلاعات واقعی خودت را بنویس.',image:'تصویر این قسمت از قالب؛ عکس معتبر انتخاب کن یا مقدار را پاک کن.',checkbox:'فعال یا غیرفعال‌بودن این گزینه را تعیین می‌کند.',select:'یکی از حالت‌های تعریف‌شدهٔ این گزینه را انتخاب می‌کند.',color:'رنگ اجزایی را که از این رنگ قالب استفاده می‌کنند عوض می‌کند.',link:'مقصد این دکمه یا لینک در صفحهٔ عمومی است.',url:'نشانی مقصد در صفحهٔ عمومی است.',percent:'عدد نمایشی این بخش؛ ادعا یا مقدار ساختگی وارد نکن.'})[field.type]||'تنظیم همین قسمت از قالب جاری است.',where:(spec.groups||[]).find(group=>group.key===field.group)?.label||'بخش ویژهٔ قالب و پیش‌نمایش رزومه',defaultValue:field.bind?'خالی؛ از بخش معرفی پر می‌شود':field.type==='select'?(field.options||[]).find(option=>option[0]===field.default)?.[1]??field.default:field.default});
  let helpTip,helpTrigger;
  const hideHelp=()=>{helpTrigger?.removeAttribute('aria-describedby');helpTrigger=null;if(helpTip)helpTip.hidden=true;};
  if(typeof document!=='undefined'){
    const placeHelp=()=>{if(!helpTip||!helpTrigger)return;const r=helpTrigger.getBoundingClientRect(),w=helpTip.offsetWidth,h=helpTip.offsetHeight;helpTip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';helpTip.style.top=(r.bottom+h+16<innerHeight?r.bottom+8:Math.max(8,r.top-h-8))+'px';};
    const showHelp=button=>{if(!button)return;hideHelp();helpTip ||= Object.assign(document.createElement('div'),{id:'field-help-tooltip',className:'field-help-tooltip',role:'tooltip'});if(!helpTip.isConnected)document.body.append(helpTip);helpTip.textContent=button.dataset.helpSummary;helpTip.hidden=false;helpTrigger=button;button.setAttribute('aria-describedby',helpTip.id);placeHelp();};
    // Scrolling keeps the tip attached to its button; it closes only once the button leaves the view.
    const followHelp=()=>{if(!helpTrigger)return;const r=helpTrigger.getBoundingClientRect();if(!helpTrigger.isConnected||r.bottom<0||r.top>innerHeight)hideHelp();else placeHelp();};
    document.addEventListener('pointerover',e=>{const button=e.target.closest('[data-field-help]');if(button&&button!==helpTrigger)showHelp(button);});
    document.addEventListener('pointerout',e=>{if(e.target.closest('[data-field-help],.field-help-tooltip')&&!e.relatedTarget?.closest?.('[data-field-help],.field-help-tooltip'))hideHelp();});
    document.addEventListener('focusin',e=>{const button=e.target.closest('[data-field-help]');if(button)showHelp(button);else hideHelp();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hideHelp();});
    document.addEventListener('scroll',followHelp,true);
  }
  if(typeof document!=='undefined')RI.delegate(document,'click','[data-field-help]',(event,button)=>{event.preventDefault();event.stopPropagation();hideHelp();const help=JSON.parse(button.dataset.fieldHelp);RI.modal({title:'راهنمای '+help.label,body:'<dl class="field-help-details"><dt>این چیست؟</dt><dd>'+esc(help.what)+'</dd><dt>کجا دیده می‌شود؟</dt><dd>'+esc(help.where)+'</dd><dt>مقدار پیش‌فرض</dt><dd>'+esc(help.initial)+'</dd></dl>',actions:[{label:'بستن',kind:'ghost'}]});});

  /* ---------- تصویر و پس‌زمینه ---------- */
  RI.presets = ['grad:#cfe0e8,#97b5c5', 'grad:#e4cdb6,#bd8e64', 'grad:#97b5c5,#52788d', 'grad:#f2e6da,#97b5c5', 'grad:#3d5c6f,#875a36'];
  RI.safeImage = function (src) {
    if (typeof src !== 'string' || !src || src.length > 3 * 1024 * 1024) return '';
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) return src;
    try { const url = new URL(src, location.origin); if (url.protocol !== 'https:' && url.origin !== location.origin) return ''; if (url.username || url.password || /[\s'"()\\\x00-\x1f\x7f]/.test(src)) return ''; return url.href; } catch { return ''; }
  };
  RI.bg = function (src) {
    if (typeof src !== 'string') return '';
    if (/^grad:#[0-9a-f]{6},#[0-9a-f]{6}$/i.test(src)) return 'background-image:linear-gradient(135deg,' + src.slice(5) + ')';
    const safe = RI.safeImage(src);
    return safe ? "background-image:url('" + safe + "')" : '';
  };
  RI.avatarSvg = function (name, hue) {
    const ch = esc((name || 'ر').trim().charAt(0) || 'ر');
    const a = hue === 'warm' ? '#d2ae89' : '#97b5c5', b = hue === 'warm' ? '#875a36' : '#3d5c6f';
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='" + a + "'/><stop offset='1' stop-color='" + b + "'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><text x='48' y='60' font-family='Tahoma,sans-serif' font-size='42' font-weight='700' text-anchor='middle' fill='white'>" + ch + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };
  RI.avatarOf = (p) => RI.safeImage(p.avatar) || RI.avatarSvg(p.name);

  /* ---------- قطعات HTML ---------- */
  RI.pageHead = (o) =>
    '<header class="page-head"><div class="page-head__text">' +
    '<h1 tabindex="-1" id="page-title">' + esc(o.title) + '</h1>' + (o.desc ? '<p>' + o.desc + '</p>' : '') +
    '</div>' + (o.actions ? '<div class="page-head__actions">' + o.actions + '</div>' : '') + '</header>';

  RI.empty = (o) =>
    '<div class="empty"><div class="empty__art">' + RI.icon(o.icon || 'sparkle') + '</div><h3>' + esc(o.title) + '</h3>' +
    (o.text ? '<p>' + o.text + '</p>' : '') + (o.action || '') + '</div>';

  RI.switchHtml = (o) =>
    '<label class="switch"><input type="checkbox" role="switch"' + (o.id ? ' id="' + o.id + '"' : '') + (o.name ? ' data-k="' + o.name + '"' : '') +
    (o.checked ? ' checked' : '') + (o.disabled ? ' disabled' : '') + ' aria-label="' + esc(o.label || '') + '"><span class="switch__track"></span><span class="switch__thumb"></span></label>';

  RI.ring = function (pct, size, stroke) {
    size = size || 120; stroke = stroke || 10;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px" role="img" aria-label="' + RI.fa(pct) + ' درصد تکمیل">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><circle class="ring__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="ring__val" data-pct="' + pct + '" data-c="' + c + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/></svg>' +
      '<div class="ring__label"><div><span style="font-size:' + size * 0.24 + 'px">' + RI.fa(pct) + '٪</span><small>تکمیل</small></div></div></div>';
  };
  /* بعد از درج در DOM صدا زده می‌شود تا حلقه‌ها با انیمیشن پر شوند */
  RI.animateRings = function (root) {
    RI.$$('.ring__val', root).forEach((c) => {
      const pct = +c.dataset.pct, len = +c.dataset.c;
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = len * (1 - pct / 100); }));
    });
  };
  RI.animateBars = function (root) {
    RI.$$('.bar > i[data-w]', root).forEach((i) => requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = i.dataset.w + '%'; })));
  };

  RI.urlChip = (url, opts) =>
    '<div class="url-chip"><span>' + esc(url) + '</span>' +
    '<button type="button" class="btn btn--icon btn--sm btn--ghost" data-copy="' + esc(url) + '" aria-label="کپی آدرس">' + RI.icon('copy') + '</button>' +
    ((opts && opts.open) ? '<button type="button" class="btn btn--icon btn--sm btn--ghost" data-open-url="' + esc(opts.open) + '" aria-label="باز کردن">' + RI.icon('external') + '</button>' : '') + '</div>';

  /* ---------- فیلد تصویر ---------- */
  RI.imageFieldHtml = function (name, o) {
    o = o || {};
    return '<div class="imgfield ' + (o.wide ? 'imgfield--wide ' : '') + (o.round ? 'imgfield--round' : '') + '" data-img="' + name + '">' +
      '<div class="imgfield__preview" style="' + esc(RI.bg(o.value)) + '" role="img" aria-label="پیش‌نمایش ' + esc(o.label || 'تصویر') + '"></div>' +
      '<div class="imgfield__side"><div class="imgfield__btns">' +
      '<label class="btn btn--soft btn--sm">' + RI.icon('upload') + 'انتخاب تصویر<input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" data-file></label>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-img-clear>' + RI.icon('trash') + 'حذف</button></div>' +
      '<div class="imgfield__presets" role="group" aria-label="تصویر آماده">' +
      RI.presets.map((p, i) => '<button type="button" data-preset="' + p + '" style="' + esc(RI.bg(p)) + '" aria-label="تصویر آمادهٔ ' + RI.fa(i + 1) + '"></button>').join('') +
      '</div><div class="field__error" role="alert" hidden></div>' +
      '<div class="field__hint">PNG، JPEG یا WebP تا '+RI.fa(Math.floor(RI.imageLimit()/1024))+' کیلوبایت برای هر تصویر؛ عکس‌های بزرگ پیش از ذخیره خودکار کوچک می‌شوند.</div></div></div>';
  };
  // Phone photos arrive as multi-megabyte files although pages show them at a few hundred pixels; every byte is
  // stored inside the document and re-read on each load and autosave, so images are scaled and re-encoded first.
  const imageEdges = { avatar: 640, shimg: 1200 };
  RI.prepareImage = function (file, name) {
    return new Promise((resolve, reject) => {
      const fail = m => reject(new Error(m));
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return fail('فقط تصویر PNG، JPG یا WebP مجاز است');
      if (file.size > 20 * 1024 * 1024) return fail('این فایل خیلی بزرگ است؛ تصویری زیر ۲۰ مگابایت انتخاب کن');
      const rd = new FileReader();
      rd.onerror = () => fail('خواندن تصویر ممکن نشد دوباره تلاش کنید');
      rd.onload = () => {
        const original = String(rd.result), image = new Image();
        image.onerror = () => fail('فایل انتخاب‌شده تصویر معتبر نیست');
        image.onload = () => {
          const w = image.naturalWidth, h = image.naturalHeight;
          if (w * h > 16000000) return fail('ابعاد تصویر بیش از حد بزرگ است');
          const edge = imageEdges[name] || 1600, scale = Math.min(1, edge / Math.max(w, h));
          let best = original;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
            const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const webp = canvas.toDataURL('image/webp', .82), jpeg = file.type === 'image/jpeg' && canvas.toDataURL('image/jpeg', .85);
            // Browsers without WebP encoding return PNG; keep PNG only for sources that may carry transparency.
            const candidates = [webp.startsWith('data:image/webp') || file.type !== 'image/jpeg' ? webp : null, jpeg].filter(Boolean);
            const encoded = candidates.sort((a, b) => a.length - b.length)[0];
            if (encoded && (scale < 1 || encoded.length < original.length)) best = encoded;
          } catch {}
          if (Math.floor((best.length - best.indexOf(',') - 1) * 3 / 4) > RI.imageLimit()) return fail('حتی پس از فشرده‌سازی، تصویر از سقف ' + RI.fa(Math.floor(RI.imageLimit() / 1024)) + ' کیلوبایت حساب تو بزرگ‌تر است؛ تصویر دیگری انتخاب کن');
          resolve(best);
        };
        image.src = original;
      };
      rd.readAsDataURL(file);
    });
  };

  RI.bindImageField = function (root, name, io) {
    const el = RI.$('[data-img="' + name + '"]', root);
    if (!el) return;
    const prev = RI.$('.imgfield__preview', el), err = RI.$('.field__error', el);
    const show = (v) => { prev.setAttribute('style', RI.bg(v)); };
    const fail = (m) => { err.innerHTML = RI.icon('alert') + esc(m); err.hidden = false; };
    RI.$('[data-file]', el).addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      err.hidden = true;
      e.target.value = '';
      RI.prepareImage(f, name).then(v => { io.set(v); show(v); }, error => fail(error.message));
    });
    RI.$$('[data-preset]', el).forEach((b) => b.addEventListener('click', () => { err.hidden = true; io.set(b.dataset.preset); show(b.dataset.preset); }));
    RI.$('[data-img-clear]', el).addEventListener('click', () => { err.hidden = true; io.set(null); show(null); });
  };

  /* ---------- فرم‌ساز ---------- */
  function fieldHtml(f, v) {
    const id = 'f_' + f.key;
    const label = '<label class="field__label" for="' + id + '">' + esc(f.label) +(f.help?RI.fieldHelpHtml({label:f.label,...f.help}):'')+
      (f.required ? '<span class="field__req">پایهٔ انتشار</span>' : '<span class="field__opt">به انتخاب تو</span>') +
      (f.max && (f.type === 'textarea' || f.type === 'text') ? '<span class="field__count" data-count-for="' + f.key + '"></span>' : '') + '</label>';
    let ctl = '';
    const dirAttr = f.ltr ? ' dir="ltr" class="input ltr"' : ' class="input"';
    const common = ' id="' + id + '" name="' + f.key + '" aria-describedby="' + id + '_e ' + id + '_h"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '');
    if (f.type === 'textarea') ctl = '<textarea class="textarea"' + common + ' rows="' + (f.rows || 4) + '">' + esc(v || '') + '</textarea>';
    else if (f.type === 'select') ctl = '<select class="select"' + common + '>' + f.options.map((o) => '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    else if(f.type==='icon')ctl='<input type="hidden"'+common+' value="'+esc(v||'link')+'"><div class="icon-picker" role="group" aria-label="'+esc(f.label)+'">'+RI.LINK_ICONS.map(key=>'<button type="button" data-icon-value="'+key+'" data-icon-field="'+f.key+'" aria-pressed="'+((v||'link')===key)+'">'+RI.icon(key)+'<span>'+esc(RI.LINK_ICON_NAMES[key])+'</span></button>').join('')+'</div>';
    else if (f.type === 'checkbox') return '<div class="field" data-field="' + f.key + '"><label class="check"><input type="checkbox"' + common + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>' + (f.help ? RI.fieldHelpHtml({label:f.label,...f.help}) : '') + '</div>';
    else if (f.type === 'level') ctl = '<input type="range" class="range" min="1" max="5" step="1"' + common + ' value="' + (v || 3) + '"><div class="field__hint" data-level-text>' + esc((f.levels || [])[(v || 3) - 1] || '') + '</div>';
    else if (f.type === 'image') return '<div class="field" data-field="' + f.key + '"><div class="field__label">' + esc(f.label) + (f.required ? '<span class="field__req">پایهٔ انتشار</span>' : '<span class="field__opt">به انتخاب تو</span>') + (f.help ? RI.fieldHelpHtml({label:f.label,...f.help}) : '') + '</div>' + RI.imageFieldHtml(f.key, { value: v, wide: f.wide, label: f.label }) + '</div>';
    else ctl = '<input type="' + (f.type === 'url' ? 'text' : f.type || 'text') + '"' + (f.type === 'url' ? ' inputmode="url"' : '') + dirAttr + common + ' value="' + esc(v || '') + '">';
    return '<div class="field' + (f.span ? ' span-2' : '') + '" data-field="' + f.key + '">' + label + ctl +
      (f.hint ? '<div class="field__hint" id="' + id + '_h">' + f.hint + '</div>' : '') + '<div class="field__error" id="' + id + '_e" role="alert" hidden></div></div>';
  }

  function validate(f, v, all) {
    if (f.showIf && !f.showIf(all)) return '';
    const s = typeof v === 'string' ? v.trim() : v;
    if (f.required && (s === '' || s == null)) return 'این فیلد الزامی است';
    if (s && f.type === 'url' && !RI.isUrl(s)) return 'آدرس معتبر نیست؛ مثلاً example.com یا https://example.com';
    if (s && f.type === 'email' && !RI.isEmail(s)) return 'نشانی ایمیل معتبر نیست';
    if (s && f.min && String(s).length < f.min) return 'حداقل ' + RI.fa(f.min) + ' نویسه لازم است';
    if (f.validate) return f.validate(s, all) || '';
    return '';
  }
  RI.validateField = validate;

  RI.showFieldError = function (root, key, msg) {
    const g = RI.$('[data-field="' + key + '"]', root);
    if (!g) return;
    const e = RI.$('.field__error', g), c = RI.$('input:not([type=file]),textarea,select', g);
    if (msg) { e.innerHTML = RI.icon('alert') + esc(msg); e.hidden = false; if (c) c.setAttribute('aria-invalid', 'true'); }
    else { e.hidden = true; if (c) c.removeAttribute('aria-invalid'); }
  };

  /* فرم داخل مودال؛ values شیء ویرایش‌شده است */
  RI.formModal = function (o) {
    const values = Object.assign({}, o.values || {});
    let tried = false;
    const html = '<form novalidate class="form-grid" id="fm_' + RI.uid() + '">' + o.fields.map((f) => fieldHtml(f, values[f.key])).join('') + '</form>' + (o.extra || '');
    const m = RI.modal({
      title: o.title, size: o.size || 'md', body: html,
      actions: [
        { label: 'انصراف', kind: 'ghost' },
        { label: o.submitLabel || 'ذخیره', kind: 'primary', icon: 'check', keepOpen: true, onClick: () => submit() },
      ],
      onMount: (api) => {
        const form = RI.$('form', api.body);
        RI.delegate(form,'click','[data-icon-value]',(e,b)=>{const input=form.elements[b.dataset.iconField];input.value=b.dataset.iconValue;input.dispatchEvent(new Event('input',{bubbles:true}));b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
        const refresh = () => o.fields.forEach((f) => {
          const g = RI.$('[data-field="' + f.key + '"]', form);
          if (g && f.showIf) g.hidden = !f.showIf(values);
        });
        form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
        form.addEventListener('input', (e) => {
          const t = e.target; if (!t.name) return;
          const f = o.fields.find((x) => x.key === t.name); if (!f) return;
          values[t.name] = t.type === 'checkbox' ? t.checked : t.value;
          if (f.type === 'level') { const lt = RI.$('[data-level-text]', t.closest('.field')); if (lt) lt.textContent = (f.levels || [])[t.value - 1] || ''; }
          const cnt = RI.$('[data-count-for="' + f.key + '"]', form); if (cnt) cnt.textContent = RI.fa(t.value.length) + '/' + RI.fa(f.max);
          refresh();
          if (tried) RI.showFieldError(form, f.key, validate(f, values[f.key], values));
        });
        o.fields.forEach((f) => {
          if (f.type === 'image') RI.bindImageField(form, f.key, { get: () => values[f.key], set: (v) => { values[f.key] = v; } });
          const cnt = RI.$('[data-count-for="' + f.key + '"]', form); if (cnt) cnt.textContent = RI.fa((values[f.key] || '').length) + '/' + RI.fa(f.max);
        });
        refresh();
        api._form = form;
      },
    });
    function submit() {
      tried = true;
      const form = m._form;
      let firstBad = null;
      o.fields.forEach((f) => {
        const msg = validate(f, values[f.key], values);
        RI.showFieldError(form, f.key, msg);
        if (msg && !firstBad) firstBad = f.key;
      });
      if (firstBad) {
        const c = RI.$('[data-field="' + firstBad + '"] input:not([type=file]),[data-field="' + firstBad + '"] textarea,[data-field="' + firstBad + '"] select', form);
        if (c) c.focus();
        return false;
      }
      const out = Object.assign({}, values);
      o.fields.forEach((f) => { if (typeof out[f.key] === 'string') out[f.key] = out[f.key].trim(); });
      m.close();
      o.onSubmit(out);
      return false;
    }
    return m;
  };

  /* قدرت رمز عبور (فقط نمایشی، چیزی ذخیره نمی‌شود) */
  RI.passStrength = function (p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
    return p ? Math.max(1, s) : 0;
  };
})();
