/* Trusted offline designs; editable content is always escaped and validated. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  RI.IMPORTED_TEMPLATES = Object.create(null);
  const nodeReplacement=(id,template,node)=>{
    const cls=node.attrs?.class||'';
    if(node.tag==='header')return 'header';
    if(id==='vista'&&(node.tag==='footer'||['mobileNavOverlay','mobile-nav-panel'].includes(node.attrs?.id)))return 'empty';
    if(id==='satiar'&&cls.includes('elementor-element-8b3a5bb'))return 'empty';
    if(id==='vista'&&cls.includes('vista-typed-wrapper'))return 'title';
    if(/(?:^|\s)(?:testimonial|wp-active-we-testimonials|stat-card)(?:\s|$)/.test(cls)||node.group==='home:contact')return 'empty';
    if(node.group&&template.groups.some(group=>group.key===node.group&&/(?:portfolio|نمونه کار|نمونه‌کار)/i.test(group.key+' '+group.label)))return 'projects';
    return '';
  };
  const overriddenAttribute=(id,node,key)=>key==='href'&&id==='vista'&&['f76','f79'].includes(node.attrs?.href?.field)||key==='alt'&&node.tag==='img'&&((id==='vista'&&node.attrs?.src?.field==='f65')||(id==='satiar'&&node.attrs?.src?.field==='f68'));
  RI.orderTemplateChildren = (children, saved) => {
    const result=children.slice(),slots=result.map((node,index)=>({node,index})).filter(x=>x.node?.group),order=(saved||'').split(',');
    const sorted=slots.map(x=>x.node).sort((a,b)=>{const ai=order.indexOf(a.group),bi=order.indexOf(b.group);return (ai<0?99999:ai)-(bi<0?99999:bi);});
    slots.forEach((slot,index)=>{result[slot.index]=sorted[index];});return result;
  };
  RI.templateGroupLabel = group => ({'home:body':'منو و تنظیمات کلی','home:f015240':'معرفی و تصویر','home:f35bcdf':'مهارت‌ها و ابزارها','home:2b3e890':'سوابق کاری','home:07793c2':'پروژه‌ها و نمونه‌کارها','home:64f750e':'تحصیلات و دوره‌ها','home:67d220d':'شبکه‌های اجتماعی','home:intro':'معرفی و تصویر','home:about':'دربارهٔ من','home:resume':'سوابق و مهارت‌ها','home:portfolio':'پروژه‌ها و نمونه‌کارها','home:contact':'اطلاعات تماس','home:compose':'فرم پیام از طریق ایمیل'}[group.key]||group.label.replace(/\s+/g,' ').trim().split('·')[0].trim());
  RI.templateEditorGroups = content => {
    const template=RI.IMPORTED_TEMPLATES[content.theme.resume];if(!template)return [];
    const order=RI.resumeValues(content).settings?.section_order,groups=[],seen=new Set();
    const visit=node=>{if(!node||typeof node!=='object')return;if(node.group&&node.group!=='home:contact'&&!node.group.endsWith(':body')&&!seen.has(node.group)){const group=template.groups.find(g=>g.key===node.group);if(group){groups.push({...group,label:RI.templateGroupLabel(group)});seen.add(node.group);}}
      if(node.collection)return;RI.orderTemplateChildren(node.children||[],order).forEach(visit);};
    visit(template.pages.home.node);return groups;
  };
  const templateLoads = new Map();
  RI.releaseInactiveTemplates=id=>{for(const key of Object.keys(RI.IMPORTED_TEMPLATES))if(key!==id)delete RI.IMPORTED_TEMPLATES[key];for(const key of templateLoads.keys())if(key!==id)templateLoads.delete(key);};
  RI.loadTemplates = (ids,options={}) => Promise.all([...new Set(ids)].filter(id=>['vista','satiar'].includes(id)).map(id=>{
    if(RI.IMPORTED_TEMPLATES[id]) return Promise.resolve();
    if(!templateLoads.has(id)) templateLoads.set(id,new Promise((resolve,reject)=>{
      const version=document.documentElement.dataset.assetVersion?'?v='+document.documentElement.dataset.assetVersion:'',worker=new Worker('/dashboard/js/template-worker.js'+version);
      const timer=setTimeout(()=>failed(),50000),finish=()=>{clearTimeout(timer);worker.terminate();options.signal?.removeEventListener('abort',cancelled);},failed=()=>{finish();templateLoads.delete(id);reject(new Error('قالب بارگذاری نشد؛ اتصال اینترنت را بررسی کن و دوباره بزن'));},cancelled=()=>{finish();templateLoads.delete(id);reject(Object.assign(new Error('تغییر قالب لغو شد'),{name:'AbortError'}));};
      worker.onmessage=({data})=>{if(data.type==='progress')options.progress?.(data.percent);else if(data.type==='loaded'){RI.IMPORTED_TEMPLATES[id]=data.template;RI.releaseInactiveTemplates(id);options.progress?.(100);finish();resolve();}else if(data.type==='error')failed();};
      worker.onerror=failed;options.signal?.addEventListener('abort',cancelled,{once:true});if(options.signal?.aborted){cancelled();return;}options.worker?.(worker);options.progress?.(0);worker.postMessage({type:'load',id,version});
    }));
    return templateLoads.get(id);
  }));
  const types = ['text', 'textarea', 'image', 'url', 'link', 'icon', 'percent', 'contact', 'color', 'checkbox', 'select', 'order'];
  RI.importedSpec = function (id) {
    const t = RI.IMPORTED_TEMPLATES[id];
    if (!t) return ['vista','satiar'].includes(id) ? {sections:['contacts','socials','projects'],bodySections:[],requiredSections:[],fields:[],settings:[{key:'reviewed',label:'متن‌ها، تصاویر، آمار و لینک‌های نمونه را بررسی و برای انتشار تأیید کرده‌ام',type:'checkbox',required:true,default:false}]} : null;
    const groupName=RI.templateGroupLabel;
    const groups=t.groups.filter(g=>!/(?:portfolio|نمونه کار|نمونه‌کار)/i.test(g.key+' '+g.label)).map(g=>({...g,label:groupName(g)}));
    const compose = [['compose_title','عنوان فرم تماس','نوشتن پیام'],['compose_name','برچسب نام فرستنده','نام شما'],['compose_email','برچسب ایمیل فرستنده','ایمیل شما'],['compose_message','برچسب پیام','پیام شما'],['compose_submit','متن دکمهٔ تماس','باز کردن برنامهٔ ایمیل']].map(([key,label,defaultValue])=>({key,label,default:defaultValue,type:'text',max:120,public:true,group:'home:compose'}));
    return { sections: ['contacts', 'socials','projects'], bodySections: [], requiredSections: [], fields: t.fields.concat(compose),
      settings: [{ key: 'reviewed', label: 'متن‌ها، تصاویر، آمار و لینک‌های نمونه را بررسی و برای انتشار تأیید کرده‌ام', type: 'checkbox', required: true, default: false },
        { key: 'mode', label: 'حالت پیش‌فرض قالب', type: 'select', options: [...(id==='vista'?[['system','طبق دستگاه بازدیدکننده']]:[]),['dark','تیره'],['light','روشن']], default: id==='vista'?'system':'dark' },
        { key: 'font', label: 'فونت نوشته‌ها', type: 'select', options: [['theme','طبق انتخاب ظاهر و قالب'],['original','فونت اصلی قالب'],...RI.FONTS.map(f=>[f.id,f.name+(f.access==='buy'?' · '+RI.it(f.price):' · رایگان')])], default: 'theme' },
        { key: 'compose', label: 'نمایش فرم تماس با برنامهٔ ایمیل', type: 'checkbox', default: true, group: 'home:compose' },
        ...(id==='vista'?[{ key: 'show_vista_stats', label: 'نمایش «اعداد و ارقام» (از روی پروژه‌ها، سابقه و مهارت‌های رزومه)', type: 'checkbox', default: true },{ key: 'show_vista_cta', label: 'نمایش کارت دعوت به همکاری', type: 'checkbox', default: true }]:[]),
        { key: 'section_order', label: 'ترتیب بخش‌ها', type: 'order', keys: t.groups.map(g=>g.key).concat(t.legacyGroups||[]), default: '', max: 50000 },
        ...Object.entries(t.colors).map(([color, key]) => ({ key, label: 'رنگ ' + color, type: 'color', default: color })),
        ...Object.entries(t.backgrounds || {}).map(([url, key]) => ({ key, label: 'تصویر زمینه ' + key.replace('background', ''), type: 'image', default: url, max: 3 * 1024 * 1024 })),
        ...[...t.groups,...(t.legacyGroups||[]).map(key=>({key,label:'',legacy:true}))].map(g => ({ key: 'show_' + g.key.replace(/:/g, '_'), label: 'نمایش ' + g.label, type: 'checkbox', default: true, group: g.key }))], collections: t.collections, groups: groups.concat({key:'home:compose',label:'فرم تماس از طریق ایمیل',page:'home'}), pages: t.pages,legacyPages:t.legacyPages||[] };
  };
  RI.effectiveTemplateSpec=id=>{
    const spec=RI.importedSpec(id),template=RI.IMPORTED_TEMPLATES[id];if(!template)return spec;
    const fields=new Set(),collections=new Set(),groups=new Set(['home:compose']);
    const visit=node=>{
      if(!node||typeof node!=='object')return;
      if(nodeReplacement(id,template,node))return;
      if(node.group)groups.add(node.group);
      if(node.field)fields.add(node.field);
      if(node.icon){fields.add(node.icon);visit(node.original);}
      if(node.progress)fields.add(node.progress);
      if(node.collection){collections.add(node.collection);visit(template.collections.find(collection=>collection.key===node.collection)?.node);return;}
      for(const [key,ref]of Object.entries(node.attrs||{}))if(ref?.field&&!overriddenAttribute(id,node,key))fields.add(ref.field);
      node.children?.forEach(visit);
    };
    visit(template.pages.home.node);
    const effectiveGroups=spec.groups.filter(group=>groups.has(group.key));
    return {...spec,fields:spec.fields.filter(field=>fields.has(field.key)||field.key.startsWith('compose_')),collections:spec.collections.filter(collection=>collections.has(collection.key)),groups:effectiveGroups,settings:spec.settings.filter(setting=>!setting.group||groups.has(setting.group)||(id==='vista'&&setting.key==='show_home_07793c2')).map(setting=>setting.group&&!effectiveGroups.some(group=>group.key===setting.group)?{...setting,group:undefined}:setting)};
  };
  RI.bindImportedPage = function (doc, openPage, signal) {
    const root = doc.querySelector('.ri-imported');
    if (!root) return;
    if(['vista','satiar'].includes(root.dataset.template)&&window.bindVistaPage){window.bindVistaPage(doc,{preview:true,signal,onExternal:()=>RI.toast('این لینک در نسخهٔ منتشرشده باز می‌شود.',{kind:'info'})});return;}
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
    }, { signal });
    const top = doc.getElementById('vistaBackToTop'); if (top) top.addEventListener('click', () => doc.defaultView.scrollTo({top:0,behavior:'auto'}));
    const compose = root.querySelector('[data-inbox-form]'); if (compose) compose.addEventListener('submit', e => {e.preventDefault();RI.toast('در نسخهٔ منتشرشده، پیام مستقیم به بخش «پیام‌های رزومه» داشبورد می‌رسد.',{kind:'info'});});
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
    if (f.type === 'image') return /^\/api\/dashboard\/media\/[a-f0-9]{32}$/.test(value) || /^\/templates\/(vista|satiar)\/[a-f0-9]{16}\.(png|jpg|jpeg|webp|svg|gif)$/.test(value) ||
      (/^https:\/\//i.test(value) && RI.isUrl(value) && !/[\s<>\x27"()\\]/.test(value)) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    return f.type !== 'select' || !value || f.options.some(o => o[0] === value);
  };
  const voids = new Set('area br col hr img input link source track wbr'.split(' '));
  RI.importedHtml = function (c, options) {
    const id = options.theme.resume, t = RI.IMPORTED_TEMPLATES[id], values = options.values;
    const pageId = Object.hasOwn(t.pages, options.page || '') ? options.page : 'home', page = t.pages[pageId];
    const spec = RI.importedSpec(id), fields = new Map(spec.fields.map(f => [f.key, f]));
    const settings = values.settings || {}, base = options.publicBase || '';
    const vista=id==='vista',satiar=id==='satiar',vistaSections={'home:f35bcdf':['skills','مهارت‌ها'],'home:2b3e890':['experience','سوابق کاری'],'home:64f750e':['education','تحصیلات و دوره‌ها'],'home:67d220d':['social','شبکه‌های اجتماعی']};
    const hasProjects=c.projects.length>0&&c.sections.some(s=>s.key==='projects'&&s.visible)&&(!vista||settings.show_home_07793c2!==false);
    const satiarStats=Array.from({length:6},(_,i)=>'f'+(268+i*3)).some(key=>(values.fields?.[key]||'').trim())||Array.from({length:6},(_,i)=>'r'+(27+i)).some(key=>values.collections?.[key]?.length);
    const vistaGroupVisible=key=>settings['show_'+key.replace(/:/g,'_')]!==false&&t.collections.filter(collection=>collection.group===key).some(collection=>values.collections?.[collection.key]?.length!==0);
    const vistaLinks=[['ri-resume-top','معرفی'],...(vista?Object.entries(vistaSections).filter(([key])=>vistaGroupVisible(key)).map(([,v])=>['ri-vista-'+v[0],v[1]]):[['home:about','دربارهٔ من'],['home:resume','سوابق و مهارت‌ها']].filter(([key])=>settings['show_'+key.replace(':','_')]!==false).map(([key,label])=>['ri-satiar-'+key.split(':')[1],label])),...(hasProjects?[['ri-projects','پروژه‌ها']]:[]),['ri-contact','تماس']];
    const vistaNav=()=>vistaLinks.map(([href,label])=>'<a href="#'+href+'">'+esc(label)+'</a>').join('');
    // The original page's stats and «work together» blocks, in its own markup so its styles apply. The numbers come
    // from the resume itself (projects, years since the first job, skills, degrees and courses), never sample claims.
    const vistaTitle=(el,text,tag,align,line)=>'<div class="elementor-element elementor-element-'+el+' elementor-widget elementor-widget-vista-section-title"><div class="elementor-widget-container"><div class="vista-section-title-wrap vista-align-'+align+'" data-align="'+align+'"><div class="vista-section-title-inner">'+(line?'<span class="vista-title-line"></span>':'')+'<div class="vista-section-title-text"><'+tag+' class="vista-section-title">'+text+'</'+tag+'></div></div></div></div></div>';
    const shown=key=>!c.sections.some(s=>s.key===key&&!s.visible);
    const yearOf=v=>{const m=/(\d{4})/.exec(String(v||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));return m?+m[1]:0;},gregorian=y=>y&&y<1700?y+621:y;
    function vistaYears(){
      const now=new Date().getFullYear();let first=0,last=0;
      for(const x of shown('experience')?c.experience:[]){const from=gregorian(yearOf(x.from));if(!from)continue;const to=x.current?now:gregorian(yearOf(x.to))||from;first=first?Math.min(first,from):from;last=Math.max(last,to);}
      return first&&last>first?Math.min(60,last-first):0;
    }
    function vistaStats(){
      if(settings.show_vista_stats===false)return '';
      const cells=[[shown('projects')?c.projects.length:0,'','پروژه و نمونه‌کار','کارهایی که در همین رزومه آمده','layers'],[vistaYears(),'+','سال تجربهٔ کاری','از اولین سابقهٔ کاری تا امروز','briefcase'],[shown('skills')?c.skills.length:0,'','مهارت و ابزار','توانایی‌هایی که با آن‌ها کار می‌کنم','sparkle'],[(shown('education')?c.education.length:0)+(shown('certs')?(c.certs||[]).length:0),'','مدرک و دوره','تحصیلات و گواهی‌های گذرانده','award'],[shown('languages')?(c.languages||[]).length:0,'','زبان','زبان‌هایی که با آن‌ها کار می‌کنم','language']].filter(x=>x[0]>0).slice(0,3);
      if(cells.length<2)return '';
      const bars=[40,70,50,90,60].map(h=>'<div class="mini-bar" style="height:'+h+'%"></div>').join('');
      return '<section class="ri-resume-section ri-vista-stats" id="ri-vista-stats" aria-labelledby="ri-h-vista-stats"><header class="ri-section-head"><h2 id="ri-h-vista-stats">اعداد و ارقام</h2></header><div class="elementor-element elementor-element-01b0d6e e-flex e-con-boxed e-con e-parent"><div class="e-con-inner">'+vistaTitle('a94a213','آمار · Stats','h2','right',true)+vistaTitle('6b59389','اعداد و ارقام','h2','right')+
        '<div class="elementor-element elementor-element-e5a1de9 elementor-widget elementor-widget-vista-stats"><div class="elementor-widget-container"><div class="vista-stats-wrap"><div class="bento">'+cells.map(([n,suf,label,sub,icon],i)=>'<div class="bento-cell on'+(i===0?' feature span2':'')+'"><div class="bento-ico">'+RI.icon(icon)+'</div><div class="bento-n"><span class="bento-count" data-count="'+n+'">'+RI.fa(n)+'</span>'+(suf?'<span class="bento-suf">'+suf+'</span>':'')+'</div><div class="bento-label">'+label+'</div><div class="bento-sub">'+sub+'</div>'+(i===0?'<div class="mini-bar-chart" aria-hidden="true">'+bars+'</div>':'')+'</div>').join('')+'</div></div></div></div></div></div></section>';
    }
    function vistaCta(){
      if(settings.show_vista_cta===false||!contactsVisible&&!compose)return '';
      const button=(el,href,icon,text,page)=>'<div class="elementor-element elementor-element-'+el+' elementor-widget elementor-widget-vista-button"><div class="elementor-widget-container"><div class="vista-btn-wrapper"><a class="vista-btn vista-btn-size-sm vista-btn-icon-before" href="'+esc(href)+'"'+(page?' data-pv-page="'+page+'"':'')+'><span class="vista-icon-wrap" aria-hidden="true">'+RI.icon(icon)+'</span><span class="vista-btn-text">'+text+'</span></a></div></div></div>';
      const role=c.profile.title.trim();
      return '<section class="ri-resume-section ri-vista-cta" aria-labelledby="ri-h-vista-cta"><header class="ri-section-head"><h2 id="ri-h-vista-cta">همکاری</h2></header><div class="elementor-element elementor-element-50cef7d e-flex e-con-boxed e-con e-parent"><div class="e-con-inner"><div class="elementor-element elementor-element-fc32812 e-con-full dark-bg e-flex e-con e-child">'+
        vistaTitle('13604cb','آماده‌ام با هم کار کنیم','h5','center')+vistaTitle('9f886ca','پروژهٔ بعدی‌ات می‌تواند استثنایی باشد','h2','center')+vistaTitle('5600bb6',esc(role?'اگر دنبال '+role+' هستی، خوشحال می‌شوم بشنوم چه در ذهن داری؛ از ایده تا نتیجه کنارت هستم.':'خوشحال می‌شوم بشنوم چه در ذهن داری؛ از ایده تا نتیجه کنارت هستم.'),'p','center')+
        '<div class="elementor-element elementor-element-ec78f95 e-con-full e-flex e-con e-child">'+(compose?button('4dead33',base+'/?page=contact','mail','شروع همکاری','contact'):button('4dead33','#ri-contact','mail','شروع همکاری'))+(hasProjects?button('1e91f28','#ri-projects','layers','نمونه‌کارها'):'')+'</div></div></div></div></section>';
    }
    const vistaHeader=()=>'<header class="site-header vista-header"><div class="header-inner"><a class="vista-wordmark" href="#ri-resume-top">'+esc(c.profile.name||'رزومه')+'</a><nav class="vista-desktop-nav" aria-label="بخش‌های رزومه">'+vistaNav()+'</nav><div class="vista-header-actions"><button type="button" class="btn theme-toggle-btn" id="themeToggleBtn" aria-label="تغییر حالت روشن و تیره" title="تغییر حالت روشن و تیره">'+RI.icon('sun')+'</button><a class="btn vista-contact-button" href="#ri-contact">'+RI.icon('mail')+'<span>تماس</span></a><button type="button" class="btn vista-menu-toggle" id="menuToggle" aria-label="باز کردن منو" aria-controls="mobile-nav-panel" aria-expanded="false">'+RI.icon('menu')+'</button></div></div></header><div class="vista-menu-overlay" id="mobileNavOverlay" hidden></div><nav class="vista-mobile-nav" id="mobile-nav-panel" aria-label="بخش‌های رزومه" inert hidden><div class="vista-mobile-head"><b>'+esc(c.profile.name||'رزومه')+'</b><button type="button" class="btn" id="mobileNavClose" aria-label="بستن منو">'+RI.icon('x')+'</button></div>'+vistaNav()+'</nav>';
    const value = (ref, overrides) => {
      const f = fields.get(ref.field); if (!f) return '';
      if (f.bind) return c.profile[f.bind] || (f.bind === 'avatar' ? f.default : '');
      const source = overrides && Object.hasOwn(overrides, f.key) ? overrides : values.fields || {};
      const v = RI.resumeValue(source, f);
      return RI.templateFieldValid(f, v) ? v : '';
    };
    const renderNode = (n, overrides, suffix) => {
      if (typeof n === 'string') return esc(n);
      const cls=n.attrs?.class||'';
      const replacement=nodeReplacement(id,t,n);
      if(replacement==='header')return vistaHeader();
      if(replacement==='empty')return '';
      if(replacement==='title')return c.profile.title?'<p class="vista-profession">'+esc(c.profile.title)+'</p>':'';
      if(replacement==='projects')return projects;
      if(satiar){
        if(cls.includes('elementor-element-063df28')&&!Array.from({length:10},(_,i)=>'r'+(i+4)).some(key=>values.collections?.[key]?.length))return '';
        if(cls.includes('elementor-element-ff29c48')&&!['f70','f73'].some(key=>Object.hasOwn(values.fields||{},key)))return '';
        if(cls.includes('elementor-element-6662a80')&&!['f256','f259'].some(key=>Object.hasOwn(values.fields||{},key)))return '';
        if(cls.includes('elementor-element-4da8416')&&!satiarStats)return '';
        if(cls.includes('elementor-element-fa4a638')&&!satiarStats&&!['f256','f259'].some(key=>Object.hasOwn(values.fields||{},key)))return '';
        if(cls.includes('elementor-element-57273bd')&&!Object.hasOwn(values.fields||{},'f51'))return '';
        if(n.field==='f50'&&!Object.hasOwn(values.fields||{},'f50'))return esc(c.profile.bio||'');
      }
      if(vista){
        if(vistaSections[n.group]&&!vistaGroupVisible(n.group))return '';
        if(n.attrs?.href?.field==='f76'&&!hasProjects)return '';
        if(cls.includes('vista-hi-badge')){const key=cls.includes('badge-tl')?'f57':cls.includes('badge-tr')?'f60':'f63';if(!Object.hasOwn(values.fields||{},key)||!(values.fields[key]||'').trim())return '';}
        if(cls.includes('elementor-element-46a5646')&&!Object.hasOwn(values.fields||{},'f73'))return '';
      }
      if (n.field) return esc(value(n, overrides));
      if (n.icon) { const choice = value({field:n.icon},overrides); return choice && choice !== 'original' ? RI.icon(choice) : renderNode(n.original,overrides,suffix); }
      if (n.collection) {
        const collection = t.collections.find(x => x.key === n.collection);
        const rows = (values.collections || {})[n.collection];
        if(satiar&&/^r(27|28|29|30|31|32)$/.test(n.collection)&&rows===undefined&&!(values.fields?.['f'+(268+(Number(n.collection.slice(1))-27)*3)]||'').trim())return '';
        return (rows === undefined ? [{ id: 'original', fields: {} }] : rows).map(row => renderNode(collection.node, row.fields, '-' + row.id)).join('');
      }
      if (n.group && settings['show_' + n.group.replace(/:/g, '_')] === false) return '';
      const nodeAttrs=Object.assign({},n.attrs);if(n.progress)nodeAttrs.style=(nodeAttrs.style||'')+';width:'+(parseInt(value({field:n.progress},overrides),10)||0)+'%';
      if(n.tag==='img'){nodeAttrs.loading='lazy';nodeAttrs.decoding='async';if(overriddenAttribute(id,n,'alt')){nodeAttrs.loading='eager';nodeAttrs.fetchpriority='high';nodeAttrs.alt=c.profile.avatar&&c.profile.name?'تصویر '+c.profile.name:'تصویر نمونهٔ قالب';}else if(satiar&&(!nodeAttrs.alt||/^(asset|resume-)/i.test(typeof nodeAttrs.alt==='string'?nodeAttrs.alt:value(nodeAttrs.alt))))nodeAttrs.alt='';}
      if(satiar&&n.group&&['home:about','home:resume'].includes(n.group))nodeAttrs.id='ri-satiar-'+n.group.split(':')[1];
      if(satiar&&n.tag==='a'&&nodeAttrs.href?.field){const key=nodeAttrs.href.field;if(['f52','f85'].includes(key)&&!Object.hasOwn(values.fields||{},key))nodeAttrs.href='#ri-contact';if(['f56','f89'].includes(key)&&!Object.hasOwn(values.fields||{},key)){if(!hasProjects)return '';nodeAttrs.href='#ri-projects';}}
      if(overriddenAttribute(id,n,'href'))nodeAttrs.href=nodeAttrs.href.field==='f76'?'#ri-projects':'#ri-contact';
      if(vista&&vistaSections[n.group])nodeAttrs.id='ri-vista-'+vistaSections[n.group][0];
      const attrs = Object.entries(nodeAttrs).map(([key, raw]) => {
        let v = raw;
        if (raw && typeof raw === 'object') {
          v = raw.field ? value(raw, overrides) : base + '/?page=' + encodeURIComponent(raw.page) + (raw.hash ? '#' + encodeURIComponent(raw.hash) : '');
          if (key === 'href' && raw.field && v) {
            if (/^\/?\?page=/.test(v)) v = '#ri-contact';
            else if (!v.startsWith('#') && !/^(mailto:|tel:)/.test(v)) v = RI.normUrl(v);
          }
        }
        if (key === 'href' && !v) v = '#ri-contact';
        if (key === 'id' && suffix) v += suffix;
        return ' ' + key + '="' + esc(v) + '"';
      }).join('');
      const children=RI.orderTemplateChildren(n.children,settings.section_order);
      if (n.tag === 'body') return '<div class="' + esc(page.bodyClass) + ' ri-imported-body">' + children.map(child => renderNode(child, overrides, suffix)).join('') + '</div>';
      const tag=(vista&&n.tag==='h2'&&n.children.some(child=>child?.field==='f68'))||(satiar&&n.children.some(child=>child?.field==='f48'))?'h1':(vista&&n.tag==='h5'&&n.children.some(child=>child?.field==='f67'))||(satiar&&n.children.some(child=>child?.field==='f49'))?'p':n.tag;
      // Vista's «اعداد و ارقام» and «پروژهٔ بعدی» blocks sit around the social section, as in the original page.
      const inner=voids.has(tag)?'':children.map(child=>{const out=renderNode(child,overrides,suffix);return vista&&child?.group==='home:67d220d'&&/\be-parent\b/.test(child.attrs?.class||'')?vistaStats()+out+vistaCta():out;}).join('');
      if(/^h[1-6]$/.test(tag)&&!inner.trim())return '';
      const html='<' + tag + attrs + (n.group?' data-ri-section="'+esc(n.group)+'"':'') + '>' + (voids.has(tag) ? '' : inner + '</' + tag + '>');
      const group=n.group&&spec.groups.find(g=>g.key===n.group);
      const headingId='ri-h-'+String(n.group||'').replace(/[^a-z0-9]+/gi,'-');
      return group&&!n.group.endsWith(':body')&&n.group!==t.groups[1]?.key?'<section class="ri-resume-section" aria-labelledby="'+headingId+'"><header class="ri-section-head"><h2 id="'+headingId+'">'+(vista&&vistaSections[n.group]?vistaSections[n.group][1]:esc(group.label))+'</h2></header>'+html+'</section>':html;
    };
    // The palette recolours every shade near the template's own two accents, not just the exact pair, so hovers,
    // gradients and badges change together and stay readable on the template's background.
    const paletteColors = RI.paletteColors(options.theme, 'palette');
    const accents = id === 'vista' ? ['#00b894','#f59e0b'] : ['#a04dff','#0a4b78'], templateBg = RI.RESUME_TEMPLATES.find(t => t.id === id)?.v.bg;
    const vars = spec.settings.filter(f => ['color','image'].includes(f.type)).map(f => {
      let v=RI.templateFieldValid(f, RI.resumeValue(settings, f)) ? RI.resumeValue(settings, f) : f.default;
      // Satiar's second accent is a blue shared with many social brand colours, so only its exact value follows.
      if(f.type==='color' && !Object.hasOwn(settings,f.key) && paletteColors) v=f.default.toLowerCase()===accents[1]?RI.color.readable(paletteColors[1],[templateBg],3):RI.remapAccent(f.default, id==='vista'?accents:[accents[0]], paletteColors, templateBg);
      return '--ri-' + f.key + ':' + (f.type==='image'?'url("'+v+'")':v);
    }).join(';');
    const font = settings.font && settings.font !== 'theme' ? settings.font : options.theme.font;
    const selectedFont = RI.FONTS.find(f=>f.id===font) || RI.FONTS[0];
    const radius = { sharp: '6px', soft: '16px', round: '28px' }[options.theme.radius] || '16px';
    const fontCss = font === 'original' ? '' : '.ri-imported{font-family:'+selectedFont.stack+'!important}.ri-imported p,.ri-imported a,.ri-imported button,.ri-imported span,.ri-imported label,.ri-imported input,.ri-imported textarea{font-family:'+selectedFont.stack+'!important}.ri-imported h1,.ri-imported h2,.ri-imported h3,.ri-imported h4,.ri-imported h5,.ri-imported h6{font-family:'+(vista&&selectedFont.id==='vazir'?"'VistaHeading',Vazirmatn":selectedFont.heading||selectedFont.stack)+'!important}';
    const contactsVisible = c.sections.some(s => s.key === 'contacts' && s.visible);
    const contacts = contactsVisible ? c.contacts.filter(x => x.public && x.value.trim()) : [];
    const socials = c.sections.some(s => s.key === 'socials' && s.visible) ? c.socials : [];
    
    const name=c.profile.name.trim(),home=base+'/';
    const contactPage=options.page==='contact'&&(vista||satiar);
    const compose=settings.compose!==false?RI.inboxForm(c,{publicBase:options.publicBase,idSuffix:'tpl',title:contactPage?'یک پیام بفرست':undefined}):'';
    // «راه‌های ارتباط»: one card per contact (icon tile, label, address) and the social accounts as chips.
    const contactIcon = { email: 'mail', phone: 'phone', website: 'globe' };
    const ways=(contacts.length ? '<div class="ri-cc__list">' + contacts.map(x => '<a class="ri-cc__item" data-pv-link="1" href="' + esc(x.type === 'email' ? 'mailto:' + x.value : x.type === 'phone' ? 'tel:' + x.value.replace(/[^+0-9]/g, '') : RI.normUrl(x.value)) + '" rel="noopener noreferrer"><i class="ri-cc__ico" aria-hidden="true">' + RI.icon(contactIcon[x.type] || 'link') + '</i><span class="ri-cc__text"><small>' + esc(x.label) + '</small><b dir="ltr">' + esc(x.value) + '</b></span><i class="ri-cc__go" aria-hidden="true">' + RI.icon('chevL') + '</i></a>').join('') + '</div>' : '') +
      (socials.length ? '<div class="ri-cc__social">' + socials.map(s => '<a class="ri-cc__soc" data-platform="' + esc(s.platform) + '" data-pv-link="1" href="' + esc(RI.socialUrl(s)) + '" rel="noopener noreferrer">' + RI.icon(s.platform) + '<span>' + esc(RI.SOCIALS.find(x=>x[0]===s.platform)?.[1]||s.platform) + '</span></a>').join('') + '</div>' : '');
    // Vista and Satiar keep the message form on its own page; on the resume a lit card leads there.
    const invite=(vista||satiar)&&compose?'<a class="ri-cc__invite" href="'+esc(base+'/?page=contact')+'" data-pv-page="contact"><span class="ri-cc__invite-orb" aria-hidden="true">'+RI.icon('mail')+'</span><span class="ri-cc__invite-text"><small>پیام مستقیم</small><b>حرفی داری؟ برایم بنویس</b><span>پیامت مستقیم به '+esc(name||'صاحب این رزومه')+' می‌رسد؛ جواب را با شماره یا ایمیلی که می‌نویسی می‌گیری.</span></span><span class="ri-cc__invite-go">صفحهٔ ارتباط با من'+RI.icon('chevL')+'</span></a>':compose;
    const contact = '<section id="ri-contact" class="ri-template-contact ri-cc"><div class="ri-cc__intro"><span class="ri-cc__kicker">راه‌های ارتباط</span><h2>' + esc(c.profile.name) + '</h2><p>' + esc(c.profile.title) + '</p>' + ways + '</div>' + invite + '</section>';
    // The contact page: the template's own header pointing back at the resume, a hero with the photo in orbit, the
    // ways to reach the person and the message form.
    const contactMain=contactPage?'<main class="ri-cp" id="ri-contact"><section class="ri-cp__hero"><a class="ri-cp__back" href="'+esc(home)+'" data-pv-page="home">'+RI.icon('chevR')+'بازگشت به رزومه</a><div class="ri-cp__orb" aria-hidden="true"><i class="ri-cp__ring"></i><i class="ri-cp__dash"></i><i class="ri-cp__moon"></i><img src="'+esc(RI.avatarOf(c.profile))+'" alt="" width="168" height="168"></div><span class="ri-cc__kicker">ارتباط با من</span><h1>بیا با هم حرف بزنیم</h1><p>'+(name?'پیامت مستقیم به '+esc(name)+' می‌رسد':'پیامت مستقیم به صاحب این رزومه می‌رسد')+'؛ یا از یکی از راه‌های زیر تماس بگیر.</p></section><div class="ri-cp__grid'+(compose?'':' ri-cp__grid--solo')+'"><div class="ri-cp__ways ri-cc__intro">'+(ways||'<p class="ri-cp__empty">راه تماس عمومی‌ای ثبت نشده؛ از فرم پیام استفاده کن.</p>')+'</div>'+compose+'</div></main>':'';
    const projects=hasProjects?'<section class="ri-user-projects" id="ri-projects"><h2>پروژه‌ها و نمونه‌کارها</h2>'+RI.projectCards(c,{compact:true})+'</section>':'';
    const vistaFooter='<footer class="vista-footer"><a href="#ri-resume-top">'+esc(c.profile.name||'رزومه')+'</a>'+RI.brandFoot(c,'resume')+'</footer>';
    const css=satiar&&font!=='original'?['/templates/satiar/core.css']:page.css.map(url=>vista&&font!=='original'&&url.endsWith('/bf851831979d2f46.css')?'/templates/vista/core.css':url).filter(url=>!vista||!url.endsWith('/f719a64cb90df301.css'));
    return '<div class="ri-imported" data-template="' + id + '" data-template-mode="' + (vista&&(!Object.hasOwn(settings,'mode')||settings.mode==='system')?'system':settings.mode==='light'?'light':'dark') + '" data-template-page="' + (contactPage?'contact':pageId) + '" style="' + esc(vars) + '">' +
      '<link rel="stylesheet" href="/fonts/fonts.css">' + css.map(url => '<link rel="stylesheet" href="' + url + '">').join('') + '<link rel="stylesheet" href="/templates/template-support.css"><link rel="stylesheet" href="/templates/'+id+'-support.css">' +
      '<style>:root{' + vars + '}' + page.inline.replace(/<\/style/gi, '') + fontCss +(font!=='original'?'html:has(.ri-imported[data-template='+id+']),body:has(.ri-imported[data-template='+id+']),.ri-imported[data-template='+id+'] :is(div,b,strong,small,summary){font-family:'+selectedFont.stack+'!important}':'')+ '.ri-imported .pf-card,.ri-imported .blog-card,.ri-imported .tech-card,.ri-imported .soc-card{border-radius:' + radius + '}</style><span id="ri-resume-top"></span>'+(contactPage?vistaHeader().replace(/href="#/g,'href="'+esc(home)+'#')+contactMain+vistaFooter.replace('href="#ri-resume-top"','href="'+esc(home)+'"'):renderNode(page.node) + contact + vistaFooter) + '</div>';
  };
})();
