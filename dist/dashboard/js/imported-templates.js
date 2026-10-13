/* Trusted offline designs; editable content is always escaped and validated. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  RI.IMPORTED_TEMPLATES = Object.create(null);
  const types = ['text', 'textarea', 'image', 'url', 'link', 'icon', 'percent', 'contact', 'color', 'checkbox', 'select', 'order'];
  RI.importedSpec = function (id) {
    const t = RI.IMPORTED_TEMPLATES[id];
    if (!t) return null;
    const compose = [['compose_title','عنوان فرم تماس','نوشتن پیام'],['compose_name','برچسب نام فرستنده','نام شما'],['compose_email','برچسب ایمیل فرستنده','ایمیل شما'],['compose_message','برچسب پیام','پیام شما'],['compose_submit','متن دکمهٔ تماس','باز کردن برنامهٔ ایمیل']].map(([key,label,defaultValue])=>({key,label,default:defaultValue,type:'text',max:120,public:true,group:'home:compose'}));
    return { sections: ['contacts', 'socials'], bodySections: [], requiredSections: [], fields: t.fields.concat(compose),
      settings: [{ key: 'reviewed', label: 'متن‌ها، تصاویر، آمار و لینک‌های نمونه را بررسی و برای انتشار تأیید کرده‌ام', type: 'checkbox', required: true, default: false },
        { key: 'mode', label: 'حالت پیش‌فرض قالب', type: 'select', options: [['dark','تیره'],['light','روشن']], default: 'dark' },
        { key: 'font', label: 'فونت نوشته‌ها', type: 'select', options: [['original','فونت اصلی قالب'],['vazir','وزیرمتن'],['system','سیستمی']], default: 'original' },
        { key: 'compose', label: 'نمایش فرم تماس با برنامهٔ ایمیل', type: 'checkbox', default: true, group: 'home:compose' },
        { key: 'section_order', label: 'ترتیب بخش‌ها', type: 'order', keys: t.groups.map(g=>g.key), default: '', max: 50000 },
        ...Object.entries(t.colors).map(([color, key]) => ({ key, label: 'رنگ ' + color, type: 'color', default: color })),
        ...Object.entries(t.backgrounds || {}).map(([url, key]) => ({ key, label: 'تصویر زمینه ' + key.replace('background', ''), type: 'image', default: url, max: 3 * 1024 * 1024 })),
        ...t.groups.map(g => ({ key: 'show_' + g.key.replace(/:/g, '_'), label: 'نمایش ' + g.label, type: 'checkbox', default: true, group: g.key }))], collections: t.collections, groups: t.groups.concat({key:'home:compose',label:'فرم تماس از طریق ایمیل',page:'home'}), pages: t.pages };
  };
  RI.bindImportedPage = function (doc, openPage) {
    const root = doc.querySelector('.ri-imported');
    if (!root) return;
    const body = root.querySelector('.ri-imported-body');
    if (body) doc.body.className = body.className;
    doc.documentElement.setAttribute('data-theme', root.dataset.templateMode || 'dark');
    doc.body.classList.toggle('satiar-theme-light', root.dataset.template === 'satiar' && root.dataset.templateMode === 'light');
    const mode = doc.getElementById('themeToggleBtn');
    if (mode) mode.addEventListener('click', () => { const dark = doc.documentElement.getAttribute('data-theme') !== 'dark'; doc.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); mode.setAttribute('aria-label', dark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'); });
    doc.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        const target = doc.getElementById(decodeURIComponent(href.slice(1)));
        e.preventDefault(); if (target) target.scrollIntoView({ behavior: 'auto' });
      } else if (openPage) {
        e.preventDefault(); const page = /[?&]page=([^&#]+)/.exec(href);
        if (page) openPage(decodeURIComponent(page[1]));
        else if (href === '/') openPage('home');
        else RI.toast('این لینک در نسخهٔ منتشرشده باز می‌شود.', { kind: 'info' });
      }
    });
    const top = doc.getElementById('vistaBackToTop'); if (top) top.addEventListener('click', () => doc.defaultView.scrollTo({top:0,behavior:'auto'}));
    const compose = root.querySelector('.ri-compose'); if (compose) compose.addEventListener('submit', e => {e.preventDefault();RI.toast('ارسال پیام در نسخهٔ منتشرشده از طریق برنامهٔ ایمیل انجام می‌شود.',{kind:'info'});});
    const toggle = doc.querySelector('.mobile-menu-toggle,.mobile-nav-toggle,.menu-button,.menu-toggle');
    if (toggle) {
      const panel=doc.querySelector('.mobile-nav-panel,.nav-menu'),close=()=>{if(panel)panel.classList.remove('ri-menu-open');toggle.setAttribute('aria-expanded','false');};
      toggle.setAttribute('aria-label', 'باز و بسته کردن منو');
      if(toggle.tagName!=='BUTTON'){toggle.setAttribute('role','button');toggle.setAttribute('tabindex','0');toggle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.click();}});}
      toggle.addEventListener('click', () => { if(panel){const on=panel.classList.toggle('ri-menu-open');toggle.setAttribute('aria-expanded',String(on));} });
      const closer=doc.getElementById('mobileNavClose');if(closer)closer.addEventListener('click',close);
      if(panel)panel.addEventListener('click',e=>{if(e.target.closest('a'))close();});doc.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    }
  };
  RI.templateFieldValid = function (f, value) {
    if (!types.includes(f.type)) return false;
    if (f.type === 'checkbox') return typeof value === 'boolean';
    if (typeof value !== 'string' || value.length > (f.max || 1000) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return false;
    if (f.type === 'color') return /^#[a-f0-9]{6}$/i.test(value);
    if (!value) return true;
    if (f.type === 'percent') return /^(?:100|[0-9]{1,2})%?$/.test(value);
    if (f.type === 'order') { const keys=value.split(',');return new Set(keys).size===keys.length&&keys.every(k=>f.keys.includes(k)); }
    if (f.type === 'icon') return value === 'original' || RI.LINK_ICONS.includes(value);
    if (f.type === 'link') return /^\/?\?page=[a-z0-9]+(?:#[a-zA-Z0-9_-]*)?$/.test(value) || /^#[a-zA-Z0-9_-]*$/.test(value) || /^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|tel:\+?[0-9 ()-]{6,24})$/i.test(value) || (RI.isUrl(value) && !/[\s'"()\\]/.test(value));
    if (f.type === 'url') return RI.isUrl(value) && !/[\s'"()\\]/.test(value);
    if (f.type === 'contact') return /^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|tel:\+?[0-9 ()-]{6,24}|https:\/\/[^\s'"()\\]+)$/i.test(value);
    if (f.type === 'image') return /^\/templates\/(vista|satiar)\/[a-f0-9]{16}\.(png|jpg|jpeg|webp|svg|gif)$/.test(value) ||
      (/^https:\/\//i.test(value) && RI.isUrl(value) && !/[\s<>\x27"()\\]/.test(value)) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    return f.type !== 'select' || !value || f.options.some(o => o[0] === value);
  };
  const voids = new Set('area br col hr img input link source track wbr'.split(' '));
  RI.importedHtml = function (c, options) {
    const id = options.theme.resume, t = RI.IMPORTED_TEMPLATES[id], values = options.values;
    const pageId = Object.hasOwn(t.pages, options.page || '') ? options.page : 'home', page = t.pages[pageId];
    const spec = RI.importedSpec(id), fields = new Map(spec.fields.map(f => [f.key, f]));
    const settings = values.settings || {}, base = options.publicBase || '';
    const value = (ref, overrides) => {
      const f = fields.get(ref.field); if (!f) return '';
      if (f.bind) return c.profile[f.bind] || (f.bind === 'avatar' ? f.default : '');
      const source = overrides && Object.hasOwn(overrides, f.key) ? overrides : values.fields || {};
      const v = RI.resumeValue(source, f);
      return RI.templateFieldValid(f, v) ? v : '';
    };
    const renderNode = (n, overrides, suffix) => {
      if (typeof n === 'string') return esc(n);
      if (n.field) return esc(value(n, overrides));
      if (n.icon) { const choice = value({field:n.icon},overrides); return choice && choice !== 'original' ? RI.icon(choice) : renderNode(n.original,overrides,suffix); }
      if (n.collection) {
        const collection = t.collections.find(x => x.key === n.collection);
        const rows = (values.collections || {})[n.collection];
        return (rows === undefined ? [{ id: 'original', fields: {} }] : rows).map(row => renderNode(collection.node, row.fields, '-' + row.id)).join('');
      }
      if (n.group && settings['show_' + n.group.replace(/:/g, '_')] === false) return '';
      const nodeAttrs=Object.assign({},n.attrs);if(n.progress)nodeAttrs.style=(nodeAttrs.style||'')+';width:'+(parseInt(value({field:n.progress},overrides),10)||0)+'%';
      const attrs = Object.entries(nodeAttrs).map(([key, raw]) => {
        let v = raw;
        if (raw && typeof raw === 'object') {
          v = raw.field ? value(raw, overrides) : base + '/?page=' + encodeURIComponent(raw.page) + (raw.hash ? '#' + encodeURIComponent(raw.hash) : '');
          if (key === 'href' && raw.field && v) {
            if (v.startsWith('/?page=')) v = base + v;
            else if (!v.startsWith('#') && !/^(mailto:|tel:)/.test(v)) v = RI.normUrl(v);
          }
        }
        if (key === 'href' && !v) v = '#ri-contact';
        if (key === 'id' && suffix) v += suffix;
        return ' ' + key + '="' + esc(v) + '"';
      }).join('');
      const children=n.children.slice(),slots=children.map((child,index)=>({child,index})).filter(x=>x.child&&x.child.group),order=(settings.section_order||'').split(',');
      const sorted=slots.map(x=>x.child).sort((a,b)=>{const ai=order.indexOf(a.group),bi=order.indexOf(b.group);return (ai<0?99999:ai)-(bi<0?99999:bi);});slots.forEach((slot,i)=>children[slot.index]=sorted[i]);
      if (n.tag === 'body') return '<div class="' + esc(page.bodyClass) + ' ri-imported-body">' + children.map(child => renderNode(child, overrides, suffix)).join('') + '</div>';
      return '<' + n.tag + attrs + (n.group?' data-ri-section="'+esc(n.group)+'"':'') + '>' + (voids.has(n.tag) ? '' : children.map(child => renderNode(child, overrides, suffix)).join('') + '</' + n.tag + '>');
    };
    const palette = RI.PALETTES.find(p => p.id === options.theme.palette);
    const accents = id === 'vista' ? ['#00b894','#f59e0b'] : ['#a04dff','#0a4b78'];
    const vars = spec.settings.filter(f => ['color','image'].includes(f.type)).map(f => {
      let v=RI.templateFieldValid(f, RI.resumeValue(settings, f)) ? RI.resumeValue(settings, f) : f.default;
      const accent=accents.indexOf(f.default);
      if(f.type==='color' && !Object.hasOwn(settings,f.key) && accent>=0 && palette && palette.colors) v=palette.colors[accent];
      return '--ri-' + f.key + ':' + (f.type==='image'?'url("'+v+'")':v);
    }).join(';');
    const font = settings.font || (options.theme.font === 'system' ? 'system' : 'original');
    const radius = { sharp: '6px', soft: '16px', round: '28px' }[options.theme.radius] || '16px';
    const fontCss = font === 'original' ? '' : (font === 'vazir' ? '@font-face{font-family:RITemplateVazir;src:url(/assets/fonts/Vazirmatn.woff2) format("woff2");font-display:swap}' : '') + '.ri-imported h1,.ri-imported h2,.ri-imported h3,.ri-imported h4,.ri-imported p,.ri-imported a,.ri-imported button,.ri-imported span,.ri-imported label{font-family:' + (font === 'vazir' ? 'RITemplateVazir,Tahoma,sans-serif' : 'Tahoma,system-ui,sans-serif') + '!important}';
    const contactsVisible = c.sections.some(s => s.key === 'contacts' && s.visible);
    const contacts = contactsVisible ? c.contacts.filter(x => x.public && x.value.trim()) : [];
    const socialUrls = { github: 'https://github.com/', linkedin: 'https://linkedin.com/in/', telegram: 'https://t.me/', instagram: 'https://instagram.com/', twitter: 'https://x.com/', youtube: 'https://youtube.com/@' };
    const socials = c.sections.some(s => s.key === 'socials' && s.visible) ? c.socials : [];
    const mail=contacts.find(x=>x.type==='email'),label=key=>value({field:'compose_'+key});
    const compose=mail&&settings.compose!==false?'<form class="ri-compose" data-email="'+esc(mail.value)+'"><h3>'+esc(label('title'))+'</h3><p>پیام با برنامهٔ ایمیل دستگاه شما ارسال می‌شود.</p>'+[['name','text'],['email','email']].map(([key,type])=>'<label for="ri-compose-'+key+'">'+esc(label(key))+'</label><input class="input" id="ri-compose-'+key+'" name="'+key+'" type="'+type+'" required maxlength="120">').join('')+'<label for="ri-compose-message">'+esc(label('message'))+'</label><textarea class="textarea" id="ri-compose-message" name="message" required maxlength="3000"></textarea><button class="btn" type="submit">'+esc(label('submit'))+'</button></form>':'';
    const contact = '<section id="ri-contact" class="ri-template-contact"><h2>' + esc(c.profile.name) + '</h2><p>' + esc(c.profile.title) + '</p>' + contacts.map(x => '<a data-pv-link="1" href="' + esc(x.type === 'email' ? 'mailto:' + x.value : x.type === 'phone' ? 'tel:' + x.value.replace(/[^+0-9]/g, '') : RI.normUrl(x.value)) + '">' + esc(x.label) + ': ' + esc(x.value) + '</a>').join('') + socials.map(s => '<a data-pv-link="1" href="' + esc(RI.isUrl(s.handle) ? RI.normUrl(s.handle) : (socialUrls[s.platform] || 'https://resumeit.ir/') + encodeURIComponent(s.handle.replace(/^@/, ''))) + '">' + esc(s.platform) + '</a>').join('') + compose + '</section>';
    const nav = '<nav class="ri-template-nav" aria-label="صفحه‌های رزومه"><a href="' + esc(base + '/') + '">رزومه</a><a href="' + esc(base + '/links') + '" data-pv-go="links">لینک‌ها</a>' +
      (pageId !== 'home' ? '<a href="' + esc(base + '/') + '">صفحه اصلی</a>' : '') + '</nav>';
    const brand = '<footer class="ri-template-brand">ساخته‌شده با <a href="https://resumeit.ir" data-pv-link="1">ResumeIt</a></footer>';
    return '<div class="ri-imported" data-template="' + id + '" data-template-mode="' + (settings.mode==='light'?'light':'dark') + '" data-template-page="' + pageId + '" style="' + esc(vars) + '">' +
      page.css.map(url => '<link rel="stylesheet" href="' + url + '">').join('') + '<link rel="stylesheet" href="/templates/template-support.css">' +
      '<style>:root{' + vars + '}' + page.inline.replace(/<\/style/gi, '') + fontCss + '.ri-imported .pf-card,.ri-imported .blog-card,.ri-imported .tech-card,.ri-imported .soc-card{border-radius:' + radius + '}</style>' + nav + renderNode(page.node) + contact + brand + '</div>';
  };
})();
