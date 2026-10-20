/* ساخت و ویرایش رزومه: مراحل بازی‌وار + چیدمان بخش‌ها + پیش‌نمایش زنده */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const SECTION_META = { contacts: ['اطلاعات تماس', 'phone', true], socials: ['شبکه‌های اجتماعی', 'globe'], skills: ['مهارت‌ها', 'sparkle'], experience: ['تجربه‌های کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'], certs: ['دوره‌ها، گواهی‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'] };

  const yearField = { type: 'text', max: 20 };
  const LISTS = {
    skills: { title: 'مهارت‌ها', add: 'افزودن مهارت', icon: 'sparkle', hint: 'سه مهارت کافی است تا بخش جان بگیرد؛ بعداً هر چقدر خواستی اضافه کن', empty: ['هنوز مهارتی ننوشته‌ای', 'مهارت‌هایی را که واقعاً به آن‌ها مسلطی بنویس؛ کارفرما اول از همین‌جا نگاه می‌کند'],
      fields: [{ key: 'name', label: 'نام مهارت', required: true, max: 40, placeholder: 'مثلاً JavaScript یا طراحی لوگو' }, { key: 'level', label: 'سطح مهارت', type: 'level', levels: RI.SKILL_LEVELS }],
      title_: (x) => x.name, sub: (x) => RI.SKILL_LEVELS[(x.level || 3) - 1], right: (x) => '<span class="dots" aria-hidden="true">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= x.level ? 'on' : '') + '"></i>').join('') + '</span>', defaults: { level: 3 } },
    experience: { title: 'تجربه‌های کاری', add: 'افزودن تجربه', icon: 'briefcase', hint: 'کارآموزی، فریلنس و پروژهٔ داوطلبانه هم تجربه حساب می‌شود', empty: ['تجربهٔ کاری اضافه نشده', 'اگر هنوز سابقهٔ رسمی نداری، کارآموزی، همکاری با انجمن یا پروژهٔ مستقل را بنویس'],
      fields: [{ key: 'role', label: 'عنوان شغلی', required: true, max: 60 }, { key: 'org', label: 'محل کار یا مجموعه', required: true, max: 60 }, { key: 'from', label: 'شروع', placeholder: '۱۴۰۲/۰۶', max: 12, optional: true }, { key: 'to', label: 'پایان', placeholder: '۱۴۰۳/۰۱', max: 12, optional: true, showIf: (v) => !v.current }, { key: 'current', label: 'هنوز ادامه دارد', type: 'checkbox', span: true }, { key: 'desc', label: 'توضیح کوتاه', type: 'textarea', max: 300, optional: true, span: true, rows: 3 }],
      title_: (x) => x.role, sub: (x) => x.org + ' · ' + ((x.from || '') + (x.current ? ' تا اکنون' : x.to ? ' تا ' + x.to : '')) },
    education: { title: 'تحصیلات', add: 'افزودن مقطع', icon: 'book', hint: 'برای دانش‌آموز و دانشجو، همین بخش ستارهٔ رزومه است', empty: ['سابقهٔ تحصیلی اضافه نشده', 'مقطع، رشته و محل تحصیلت را بنویس'],
      fields: [{ key: 'degree', label: 'مقطع و رشته', required: true, max: 80 }, { key: 'school', label: 'دانشگاه یا مدرسه', required: true, max: 80 }, { key: 'from', label: 'شروع', max: 12, optional: true }, { key: 'to', label: 'پایان', max: 12, optional: true, showIf: (v) => !v.current }, { key: 'current', label: 'در حال تحصیل', type: 'checkbox', span: true }, { key: 'desc', label: 'توضیح (معدل، افتخار…)', type: 'textarea', max: 240, optional: true, span: true, rows: 2 }],
      title_: (x) => x.degree, sub: (x) => x.school + ' · ' + ((x.from || '') + (x.current ? ' تا اکنون' : x.to ? ' تا ' + x.to : '')) },
    projects: { title: 'پروژه‌ها و نمونه‌کارها', add: 'افزودن پروژه', icon: 'code', hint: 'یک پروژهٔ خوب با تصویر و لینک، از ده خط توضیح مؤثرتر است', empty: ['نمونه‌کاری اضافه نشده', 'پروژه، مقاله، طراحی یا محتوایی که دوست داری دیده شود را اضافه کن'],
      fields: [{ key: 'title', label: 'عنوان پروژه', required: true, max: 60, span: true }, { key: 'desc', label: 'توضیح', type: 'textarea', max: 280, required: true, span: true, rows: 3 }, { key: 'url', label: 'لینک پروژه', type: 'url', ltr: true, optional: true, placeholder: 'github.com/you/project', span: true }, { key: 'image', label: 'تصویر پروژه', type: 'image', wide: true, optional: true }],
      title_: (x) => x.title, sub: (x) => x.url || x.desc, thumb: (x) => x.image },
    certs: { title: 'دوره‌ها، گواهی‌ها و افتخارات', add: 'افزودن مورد', icon: 'award', hint: 'رتبه‌های مسابقه و دوره‌های معتبر را بنویس', empty: ['موردی اضافه نشده', 'دوره‌ها، گواهینامه‌ها و رتبه‌ها این‌جا می‌نشینند'],
      fields: [{ key: 'title', label: 'عنوان', required: true, max: 80, span: true }, { key: 'issuer', label: 'برگزارکننده', max: 60, optional: true }, { key: 'year', label: 'سال', max: 8, optional: true }],
      title_: (x) => x.title, sub: (x) => (x.issuer || '') + (x.year ? ' · ' + x.year : '') },
    languages: { title: 'زبان‌ها', add: 'افزودن زبان', icon: 'language', hint: 'زبان‌هایی که می‌توانی با آن‌ها کار کنی', empty: ['زبانی اضافه نشده', 'فارسی و انگلیسی؟ زبان‌های دیگر؟ همین‌جا بنویس'],
      fields: [{ key: 'name', label: 'زبان', required: true, max: 30 }, { key: 'level', label: 'سطح', type: 'level', levels: RI.LANG_LEVELS }],
      title_: (x) => x.name, sub: (x) => RI.LANG_LEVELS[(x.level || 3) - 1], defaults: { level: 3 } },
    socials: { title: 'شبکه‌های اجتماعی', add: 'افزودن شبکه', icon: 'globe', hint: 'فقط نام کاربری لازم است، نه کل آدرس', empty: ['شبکه‌ای اضافه نشده', 'گیت‌هاب، لینکدین، اینستاگرام و… را اضافه کن'],
      fields: [{ key: 'platform', label: 'شبکه', type: 'select', options: RI.SOCIALS.map((s) => [s[0], s[1]]), required: true }, { key: 'handle', label: 'نام کاربری', required: true, ltr: true, max: 40, placeholder: 'username' }],
      title_: (x) => (RI.SOCIALS.find((s) => s[0] === x.platform) || [0, x.platform])[1], sub: (x) => '@' + x.handle, iconOf: (x) => x.platform, defaults: { platform: 'github' } },
  };

  function stepDone(id) {
    const c = RI.C(), p = c.profile;
    if (id === 'profile') return !!(p.name.trim() && p.title.trim());
    if (id === 'contacts') return c.contacts.some((x) => x.public && x.value.trim());
    return c[id] && c[id].length > 0;
  }

  RI.registerPage('resume', {
    title: 'ساخت و ویرایش رزومه',
    render(ctx) {
      return RI.pageHead({ title: 'ساخت رزومه', desc:esc(RI.findTemplate('resume',RI.C().theme.resume).name),
        actions: '<button type="button" class="btn btn--soft btn--sm show-sm" data-live>' + RI.icon('eye') + 'پیش‌نمایش زنده</button><a class="btn btn--ghost btn--sm" href="/dashboard/themes/" data-go="themes">' + RI.icon('palette') + 'ظاهر و قالب</a><button type="button" class="btn btn--ghost btn--sm" data-reset-page="resume">'+RI.icon('trash')+'پاک‌کردن رزومه</button>' }) +
        '<div id="resume-journey"></div><div class="resume-tabs-host"></div><div class="editor"><div class="editor__main"><div class="segmented" role="tablist" aria-label="حالت ویرایش" id="rtabs"><button type="button" role="tab" data-tab="content" aria-selected="true">' + RI.icon('edit') + 'محتوا</button><button type="button" role="tab" data-tab="layout" aria-selected="false">' + RI.icon('section') + 'چیدمان بخش‌ها</button></div><div id="rbody"></div></div>' +
        '<aside class="editor__side" aria-label="پیش‌نمایش زندهٔ رزومه"><div class="sticky"><div id="rpv"></div></div></aside></div><section class="journey-quality" id="resume-advisor-shell" aria-label="راهنمای کیفیت رزومه"><div id="resume-advisor"></div></section>';
    },
    mount(root, ctx) {
      const mountOwner=RI.ownerId,mountSlot=RI.workspaceSlot,sameContext=()=>root.isConnected&&RI.ownerId===mountOwner&&RI.workspaceSlot===mountSlot;
      let spec,STEPS;
      const syncSpec=()=>{
        const c=RI.C();spec=RI.resumeSpec(c.theme.resume);
        if(RI.IMPORTED_TEMPLATES?.[c.theme.resume]){
          const source=RI.IMPORTED_TEMPLATES[c.theme.resume],hero=source.groups[1]?.key;
          STEPS=RI.templateEditorGroups(c).map(group=>{
            if(group.key===hero)return {id:'profile',label:'معرفی و تصویر',icon:'user',req:true,group:group.key};
            if(/portfolio|نمونه کار|نمونه‌کار/i.test(group.key+' '+group.label))return {id:'projects',label:'پروژه‌ها و نمونه‌کارها',icon:'code'};
            if(group.key==='home:contact')return {id:'contacts',label:'اطلاعات تماس',icon:'phone',req:true,group:group.key};
            if(group.key==='home:67d220d')return {id:'socials',label:'شبکه‌های اجتماعی',icon:'globe',group:group.key};
            return {id:'template-'+group.key.replace(/:/g,'-'),label:group.label,icon:'section',group:group.key};
          });
          for(const id of ['contacts','socials'])if(!STEPS.some(step=>step.id===id))STEPS.push({id,label:SECTION_META[id][0],icon:SECTION_META[id][1],req:id==='contacts',group:id==='contacts'&&spec.groups.some(g=>g.key==='home:contact')?'home:contact':undefined});
          STEPS.push({id:'template-home-compose',label:'فرم پیام',icon:'mail',group:'home:compose'},{id:'template',label:'منو، رنگ و تنظیمات کلی',icon:'settings',group:'general'});
        }else STEPS=[{id:'profile',label:'معرفی',icon:'user',req:true},...['contacts','socials',...c.sections.map(section=>section.key).filter(key=>!['contacts','socials'].includes(key))].filter(k=>spec.sections.includes(k)).map(k=>({id:k,label:SECTION_META[k][0],icon:SECTION_META[k][1],req:spec.requiredSections.includes(k)||k==='contacts'})),...(spec.fields.length||spec.settings.length?[{id:'template',label:'تنظیمات قالب',icon:'palette',req:true}]:[])];
      };syncSpec();
      const journey=RI.ResumeJourney.initial(ctx.opts),journeyHost=root.querySelector('#resume-journey');let storyStep='',lookCleanup,renderSerial=0,publishing=false;
      let tab = 'content', step = (ctx.opts && ctx.opts.step) || 'profile';
      if (!STEPS.some((s) => s.id === step)) step = 'profile';
      const body = RI.$('#rbody', root);
      const tabsHost = RI.$('.resume-tabs-host', root), desktop = matchMedia('(min-width:1101px)');
      function placeOutline() {
        const outline = RI.$('.resume-outline', root); if (!outline) return;
        if (desktop.matches) { tabsHost.append(outline); outline.open = true; }
        else if (outline.parentElement !== body) { body.prepend(outline); outline.open = false; }
      }
      desktop.addEventListener('change', placeOutline);
      RI.bindBranding(root);
      const pv = new RI.Preview(RI.$('#rpv', root), { kind: 'resume', device: 'mobile', fitHeight: 200 });
      let raf = 0;
      const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {syncSpec();pv.refresh(false);updateJourneyStatus();if(journey.guided&&journey.phase==='review'&&!publishing)paint(true);}); };
      const off = RI.on('change', refresh);
      const offSave=RI.on('save',()=>updateJourneyStatus());

      function stepper() {
        const current=STEPS.find(s=>s.id===step)||STEPS[0];
        return '<details class="resume-outline" '+(innerWidth>1100?'open':'')+'><summary><span>'+RI.icon('section')+'بخش‌های رزومه</span><small>'+esc(current.label)+'</small>'+RI.icon('chevD')+'</summary><nav role="tablist" id="resume-section-tabs" aria-label="بخش‌های رزومه">'+STEPS.map(s=>'<button type="button" role="tab" id="resume-step-'+s.id+'" class="outline-item" data-step="'+s.id+'"'+(s.group?' data-template-group="'+s.group+'"':'')+' aria-selected="'+(s.id===step)+'" tabindex="'+(s.id===step?'0':'-1')+'" aria-controls="panel"><span class="outline-item__label">'+esc(s.label)+'</span></button>').join('')+'</nav></details>';
      }
      const isTemplateStep=()=>step==='template'||step.startsWith('template-');
      function contentPanel(){
        const section=STEPS.find(s=>s.id===step);
        const base=step==='profile'?profilePanel():step==='contacts'?contactsPanel():isTemplateStep()?templatePanel():listPanel(step);
        return base+(!isTemplateStep()&&section?.group?RI.importedEditorHtml({section:true,title:'جزئیات '+section.label}):'');
      }
      function fullProfilePanel() {
        const p = RI.C().profile;
        return '<div class="panel"><div class="panel__head"><h2>خودت را معرفی کن</h2><p>اولین چیزی که بازدیدکننده می‌بیند <span class="field__req">پایهٔ انتشار</span> برای انتشار: نام و عنوان</p></div>' +
          '<div class="profile-media"><div class="field"><div class="field__label">تصویر کاور<span class="field__opt">به انتخاب تو</span></div>' + RI.imageFieldHtml('cover', { value: p.cover, wide: true, label: 'کاور' }) + '</div>' +
          '<div class="field"><div class="field__label">عکس پروفایل<span class="field__opt">به انتخاب تو</span></div>' + RI.imageFieldHtml('avatar', { value: p.avatar, round: true, label: 'عکس پروفایل' }) + '</div></div><hr class="divider">' +
          '<div class="syncrow"><div><b>مشخصات حساب برای انتشار</b><div class="field__hint">نام، نام خانوادگی و شماره تأییدشده رو در حساب کامل کن</div></div><a class="btn btn--soft btn--sm" href="/dashboard/settings/" data-go="settings">تکمیل مشخصات</a></div><div class="syncrow"><div><b>شماره حساب</b><div class="field__hint"><span class="ltr-inline">'+esc(RI.state.account.mobile||'اضافه نشده')+'</span> — '+(RI.state.account.mobileVerified?'تأیید شده':'نیاز به تأیید')+'</div><div class="field__hint">این شماره خودکار در صفحه عمومی نمایش داده نمی‌شه</div></div><button type="button" class="btn btn--soft btn--sm" data-account-phone>تأیید شماره</button></div><hr class="divider">' +
          '<div class="form-grid" id="pform"><div class="field" data-field="name"><label class="field__label" for="p_name">نام و نام خانوادگی<span class="field__req">پایهٔ انتشار</span></label><input class="input" id="p_name" data-p="name" value="' + esc(p.name) + '" maxlength="50" autocomplete="off"><div class="field__error" role="alert" hidden></div></div>' +
          '<div class="field" data-field="location"><label class="field__label" for="p_loc">شهر<span class="field__opt">به انتخاب تو</span></label><input class="input" id="p_loc" data-p="location" value="' + esc(p.location) + '" maxlength="30"></div>' +
          '<div class="field span-2" data-field="title"><label class="field__label" for="p_title">عنوان حرفه‌ای یا تحصیلی<span class="field__req">پایهٔ انتشار</span></label><input class="input" id="p_title" data-p="title" value="' + esc(p.title) + '" maxlength="90" placeholder="مثلاً دانشجوی کامپیوتر | طراح رابط کاربری"><div class="field__hint">یک خط که بگوید کی هستی و چه می‌کنی</div><div class="field__error" role="alert" hidden></div></div>' +
          '<div class="field span-2" data-field="bio"><label class="field__label" for="p_bio">معرفی کوتاه<span class="field__opt">به انتخاب تو</span><span class="field__count" id="bioCount"></span></label><textarea class="textarea" id="p_bio" data-p="bio" maxlength="300" rows="4" placeholder="دو سه جمله دربارهٔ آنچه دوست داری و می‌سازی">' + esc(p.bio) + '</textarea></div></div>'+RI.brandingHtml('resume')+'</div>';
      }
      function profilePanel(){
        const holder=document.createElement('div');holder.innerHTML=fullProfilePanel();const panel=holder.firstElementChild,head=panel.querySelector('.panel__head'),grid=panel.querySelector('#pform'),media=panel.querySelector('.profile-media'),account=[...panel.querySelectorAll('.syncrow')],brand=panel.querySelector('.branding-controls');
        head.querySelector('p').textContent='نام و عنوانت را بنویس؛ همین حالا شکل می‌گیرد.';
        const optional=document.createElement('details');optional.className='journey-details';optional.open=!journey.guided;optional.innerHTML='<summary>معرفی کوتاه و شهر · به انتخاب تو</summary><div class="form-grid"></div>';
        for(const key of ['location','bio'])optional.lastElementChild.append(grid.querySelector('[data-field="'+key+'"]'));
        panel.replaceChildren(head,grid,optional);
        if(!journey.guided){const extra=document.createElement('details');extra.className='journey-details';extra.innerHTML='<summary>عکس، امضا و مشخصات حساب</summary>';extra.append(media,...account,brand);panel.append(extra);}
        return panel.outerHTML;
      }
      function mediaPanel(){const holder=document.createElement('div');holder.innerHTML=fullProfilePanel();return '<details class="journey-details"><summary>عکس و کاور · به انتخاب تو</summary>'+holder.querySelector('.profile-media').outerHTML+'</details><details class="journey-details"><summary>امضای پایین صفحه</summary>'+RI.brandingHtml('resume')+'</details>';}

      function contactsPanel() {
        const ic = { email: 'mail', phone: 'phone', website: 'globe' };
        const rows = RI.C().contacts.map((x) => '<div class="crow" data-id="' + x.id + '"><span class="row__ico">' + RI.icon(ic[x.type]) + '</span><div class="field" data-field="' + x.id + '"><label class="field__label" for="c_' + x.id + '">' + esc(x.label) + '</label><input class="input" id="c_' + x.id + '" data-c="' + x.id + '" dir="ltr" value="' + esc(x.value) + '" inputmode="' + (x.type === 'email' ? 'email' : x.type === 'phone' ? 'tel' : 'url') + '" placeholder="' + (x.type === 'email' ? 'you@example.com' : x.type === 'phone' ? '09123456789' : 'example.com') + '"><div class="field__error" role="alert" hidden></div></div>' +
          '<label class="crow__pub"><span>' + (x.public ? RI.icon('eye') + 'عمومی' : RI.icon('eyeOff') + 'پنهان') + '</span>' + RI.switchHtml({ checked: x.public, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '</label></div>').join('');
        return '<div class="panel"><div class="panel__head"><h2>اطلاعات تماس</h2><p>هر مورد را جدا برای نمایش عمومی انتخاب کن <span class="field__req">پایهٔ انتشار</span> برای انتشار: دست‌کم یک راه تماس عمومی</p></div>' + rows + '<div class="banner banner--brown">' + RI.icon('shield') + '<div class="banner__body">مورد پنهان هرگز روی صفحهٔ عمومی دیده نمی‌شود، حتی اگر پر باشد</div></div></div>';
      }

      function listPanel(id) {
        const L = LISTS[id], items = RI.C()[id];
        const rows = items.map((x, i) => '<li class="row" data-id="' + x.id + '"><span class="row__grip" title="کشیدن برای جابه‌جایی" aria-hidden="true">' + RI.icon('grip') + '</span>' +
          (L.thumb && L.thumb(x) ? '<span class="row__thumb" style="' + esc(RI.bg(L.thumb(x))) + '"></span>' : '<span class="row__ico">' + RI.icon(L.iconOf ? L.iconOf(x) : L.icon) + '</span>') +
          '<div class="row__main"><div class="row__title">' + esc(L.title_(x)) + '</div><div class="row__sub">' + esc(L.sub(x) || '') + '</div></div>' + (L.right ? L.right(x) : '') +
          '<div class="row__actions"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-up="' + x.id + '" aria-label="بالا" ' + (i === 0 ? 'disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-down="' + x.id + '" aria-label="پایین" ' + (i === items.length - 1 ? 'disabled' : '') + '>' + RI.icon('down') + '</button>' +
          '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-edit="' + x.id + '" aria-label="ویرایش">' + RI.icon('edit') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-del="' + x.id + '" aria-label="حذف">' + RI.icon('trash') + '</button></div></li>').join('');
        return '<div class="panel"><div class="panel__head panel__head--row"><div><h2>' + L.title + '</h2><p>' + L.hint + ' <span class="field__opt">به انتخاب تو</span></p></div><button type="button" class="btn btn--primary btn--sm" data-add>' + RI.icon('plus') + L.add + '</button></div>' +
          (items.length ? '<ul class="rows" id="rlist">' + rows + '</ul>' : RI.empty({ icon: L.icon, title: L.empty[0], text: L.empty[1], action: '<button type="button" class="btn btn--primary" data-add>' + RI.icon('plus') + L.add + '</button>' })) + '</div>';
      }

      function templatePanel() {
        if (RI.IMPORTED_TEMPLATES && RI.IMPORTED_TEMPLATES[RI.C().theme.resume]) return RI.importedEditorHtml({section:!journey.guided,title:STEPS.find(s=>s.id===step)?.label||'تنظیمات قالب'});
        const t = RI.findTemplate('resume', RI.C().theme.resume), values = RI.resumeValues(RI.C());
        return '<div class="panel"><div class="panel__head"><h2>اطلاعات و تنظیمات «' + esc(t.name) + '»</h2><p>اطلاعات هر قالب جدا ذخیره می‌شود؛ با تغییر قالب از بین نمی‌رود. فقط فیلدهایی که «عمومی» هستند نمایش داده می‌شوند.</p></div>' + ['fields', 'settings'].map(group => spec[group].map(f => {
          const value = RI.resumeValue(values[group] || {}, f), id = 'template-' + group + '-' + f.key;
          const attrs = ' id="' + esc(id) + '" data-template-group="' + group + '" data-template-key="' + esc(f.key) + '"';
          const control = f.type === 'checkbox' ? '<input class="checkbox" type="checkbox"' + attrs + (value ? ' checked' : '') + '>' : f.type === 'select' ? '<select class="select input"' + attrs + '><option value="">انتخاب کن</option>' + f.options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' : f.type === 'textarea' ? '<textarea class="textarea input"' + attrs + ' maxlength="' + (f.max || 1000) + '">' + esc(value) + '</textarea>' : '<input class="input" type="text"' + attrs + ' maxlength="' + (f.max || 1000) + '" value="' + esc(value) + '">';
          return '<div class="field"><label class="field__label" for="' + esc(id) + '">' + esc(f.label) + (f.required ? ' — پایهٔ انتشار' : ' — به انتخاب تو') + (group === 'fields' && f.public === true ? ' — عمومی' : '') + RI.templateFieldHelp(f,spec) + '</label>' + control + '</div>';
        }).join('')).join('') + '</div>';
      }
      function layoutPanel() {
        if(RI.IMPORTED_TEMPLATES?.[RI.C().theme.resume]){
          const c=RI.C(),values=RI.resumeValues(c),groups=RI.templateEditorGroups(c);
          return '<section class="panel"><div class="panel__head"><h2>ترتیب بخش‌های قالب</h2><p>این ترتیب با پیش‌نمایش و تب‌های ویرایش یکی است. تغییر ترتیب، محتوای بخش‌ها را پاک نمی‌کند.</p></div><ul class="rows">'+groups.map((group,index)=>'<li class="row"><span class="row__main">'+esc(group.label)+'</span><div class="row__actions"><button type="button" class="btn btn--ghost btn--sm" data-template-shift="'+esc(group.key)+'" data-direction="-1" aria-label="'+esc('انتقال '+group.label+' به بالا')+'"'+(!index?' disabled':'')+'>بالا</button><button type="button" class="btn btn--ghost btn--sm" data-template-shift="'+esc(group.key)+'" data-direction="1" aria-label="'+esc('انتقال '+group.label+' به پایین')+'"'+(index===groups.length-1?' disabled':'')+'>پایین</button></div></li>').join('')+'</ul></section>';
        }
        const c = RI.C();
        const rows = c.sections.filter(s => spec.sections.includes(s.key)).map((s, i) => { const m = SECTION_META[s.key];
          return '<li class="row' + (s.visible ? '' : ' is-off') + '" data-id="' + s.key + '"><span class="row__grip" aria-hidden="true">' + RI.icon('grip') + '</span><span class="row__ico">' + RI.icon(m[1]) + '</span><div class="row__main"><div class="row__title">' + m[0] + '</div><div class="row__sub">' + (s.key === 'contacts' ? 'ضروری برای انتشار' : (c[s.key] && c[s.key].length ? RI.fa(c[s.key].length) + ' مورد' : 'خالی؛ تا پر نشود نمایش داده نمی‌شود')) + '</div></div>' +
            '<div class="row__actions"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-sup="' + s.key + '" aria-label="بالا" ' + (i === 0 ? 'disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-sdown="' + s.key + '" aria-label="پایین" ' + (i === c.sections.length - 1 ? 'disabled' : '') + '>' + RI.icon('down') + '</button></div>' +
            RI.switchHtml({ checked: s.visible, label: 'نمایش ' + m[0] }).replace('<input', '<input data-svis="' + s.key + '"') + '</li>'; }).join('');
        return '<div class="panel"><div class="panel__head"><h2>چیدمان بخش‌ها</h2><p>ترتیب را بکش یا با فلش‌ها عوض کن؛ با کلید هر بخش را از رزومه پنهان کن</p></div><ul class="rows" id="slist">' + rows + '</ul></div>';
      }

      function paint(keepScroll) {
        syncSpec();lookCleanup?.();lookCleanup=null;const serial=++renderSerial;
        pv.setTemplateSection(null);
        root.classList.add('resume-build');root.dataset.journeyPhase=journey.guided?journey.phase:'direct';
        journeyHost.innerHTML=journey.guided?RI.ResumeJourney.nav(journey):'<div class="resume-editor-intro"><p>بخش‌ها به ترتیب نمایش در رزومه‌اند؛ تنظیمات کلی در آخر قرار دارند.</p><button type="button" class="btn btn--ghost btn--sm" data-journey-mode>راهنمای مرحله‌به‌مرحله</button></div>';RI.$('#rtabs',root).hidden=journey.guided;const quality=root.querySelector('#resume-advisor-shell');quality.hidden=journey.guided&&journey.phase!=='review'&&!quality.querySelector('details[open]');
        tabsHost.replaceChildren();
        if(journey.guided){
          if(journey.phase==='start')step='profile';else if(journey.phase==='contact'&&!['contacts','socials'].includes(step))step='contacts';
          const story=journey.phase==='story';if(story)step=storyStep||'story';
          const content=journey.phase==='start'?profilePanel():story&&!storyStep?RI.ResumeJourney.story(STEPS):story?'<button type="button" class="btn btn--ghost btn--sm" data-journey-choices>'+RI.icon('chevR')+'بخش‌های رزومه</button>'+(isTemplateStep()?templatePanel():listPanel(step)):journey.phase==='contact'?(step==='socials'?listPanel('socials'):contactsPanel())+(STEPS.some(s=>s.id==='socials')?'<button type="button" class="btn btn--ghost" data-step="'+(step==='socials'?'contacts':'socials')+'">'+RI.icon(step==='socials'?'mail':'globe')+(step==='socials'?'بازگشت به راه تماس':'شبکه‌های اجتماعی · به انتخاب تو')+'</button>':''):journey.phase==='look'?mediaPanel()+'<div class="journey-appearance" aria-busy="true">در حال آماده‌سازی ظاهر…</div><div class="btnrow"><button type="button" class="btn btn--ghost" data-journey-layout>'+RI.icon('section')+'چیدمان بخش‌ها</button>'+(STEPS.some(s=>s.id==='template')?'<button type="button" class="btn btn--ghost" data-journey-advanced>تنظیمات کامل قالب</button>':'')+'</div>':RI.ResumeJourney.review();
          body.innerHTML='<div id="panel">'+content+'</div>'+RI.ResumeJourney.footer(journey);
          if(['start','story','contact'].includes(journey.phase)&&step!=='story')bindPanel();
          if(journey.phase==='look'){bindMedia();const host=body.querySelector('.journey-appearance');RI.loadPage('themes').then(page=>{if(serial!==renderSerial||!root.isConnected)return;host.innerHTML=page.render();host.querySelector('.page-head')?.remove();host.querySelector('[data-tab="lt"]')?.remove();host.removeAttribute('aria-busy');lookCleanup=page.mount(host,{journey:true});}).catch(error=>{if(serial===renderSerial&&host.isConnected){host.removeAttribute('aria-busy');host.innerHTML='<p role="alert">'+esc(error.message)+'</p><button type="button" class="btn btn--soft" data-journey-retry>تلاش دوباره</button>';}});}
        }
        else if (tab === 'layout') body.innerHTML = layoutPanel();
        else {
          body.innerHTML = stepper() + '<div id="panel" role="tabpanel" aria-labelledby="resume-step-' + step + '">' + contentPanel() + '</div>' + navButtons();
          bindPanel();
          const ul = RI.$('#rlist', body);
          if (ul) { const L = RI.C()[step]; RI.sortable(ul, { onReorder: (f, t) => RI.flip(ul, () => { RI.move(L, f, t); RI.touch(step); paint(); }) }); }
        }
        RI.$$('#rtabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        placeOutline();
        RI.animateBars(body);
        if (!journey.guided&&tab === 'layout') bindLayout();
        addFieldHelp();
        updateJourneyStatus();RI.ResumeJourney.remember(journey);
      }
      function updateJourneyStatus(){
        if(!root.isConnected)return;const save=root.querySelector('[data-journey-save]'),ui=RI.state.ui;if(save){save.textContent=ui.saveError?'ذخیره انجام نشد؛ تغییراتت حفظ است':ui.saving?'در حال ذخیره…':ui.dirty?'تغییرات هنوز ذخیره نشده':'ذخیره شده';if(ui.saveError||ui.dirty&&!ui.saving)save.innerHTML+='<button class="textlink" type="button" data-journey-save-retry>'+(ui.saveError?'تلاش دوباره':'ذخیرهٔ پیش‌نویس')+'</button>';}
        const feedback=root.querySelector('[data-journey-feedback]');if(feedback){const p=RI.C().profile;feedback.textContent=!journey.guided?'همهٔ بخش‌ها در دسترس‌اند؛ فقط قسمت موردنظرت را ویرایش کن.':journey.phase==='start'?(p.name.trim()&&p.title.trim()?'معرفی اصلی آماده است؛ می‌توانی ادامه بدهی.':'با نام و عنوانت شروع کن؛ جزئیات بیشتر به انتخاب توست.'):journey.phase==='story'?'یک تجربه، پروژه یا مهارت واقعی کافی است تا شروع کنی.':journey.phase==='contact'?'فقط راه‌های تماسی که عمومی می‌کنی به بازدیدکننده نمایش داده می‌شوند.':journey.phase==='look'?'انتخاب ظاهر، اطلاعاتت را حذف نمی‌کند و چیزی را خودکار منتشر نمی‌کند.':'پیش‌نویس محفوظ است؛ انتشار فقط با تأیید تو انجام می‌شود.';}
      }
      function addFieldHelp() {
        const add=(selector,label,what,where,defaultValue)=>{const target=RI.$(selector,body);if(!target)return;let host=target;if(target.tagName==='LABEL'){host=document.createElement('div');host.className='template-field-label';target.replaceWith(host);host.append(target);}host.insertAdjacentHTML('beforeend',RI.fieldHelpHtml({label,what,where,defaultValue}));};
        if(tab==='layout') {
          add('.panel__head h2','چیدمان بخش‌ها','ترتیب و نمایش بخش‌های عمومی را تنظیم می‌کند؛ پنهان‌کردن بخش، اطلاعاتش را حذف نمی‌کند.','رزومهٔ عمومی، در قالب‌هایی که این بخش‌ها را پشتیبانی می‌کنند','ترتیب اولیهٔ بخش‌ها؛ بخش خالی نمایش داده نمی‌شود');
          return;
        }
        if(step==='profile') {
          const hints={name:['نام و نام خانوادگی','نامی که می‌خواهی روی رزومه دیده شود.'],location:['شهر','شهر محل سکونت یا فعالیت؛ نشانی دقیق لازم نیست.'],title:['عنوان حرفه‌ای یا تحصیلی','حوزهٔ کاری یا رشتهٔ اصلی خودت را در یک خط بنویس.'],bio:['معرفی کوتاه','دو یا سه جمله دربارهٔ تخصص، تجربه و هدف واقعی خودت.']};
          for(const [key,[label,what]]of Object.entries(hints))add('[data-field="'+key+'"] .field__label',label,what,'بخش معرفی در بالای رزومه','');
          ['cover','avatar'].forEach((key,i)=>add('.profile-media>.field:nth-child('+(i+1)+')>.field__label',key==='cover'?'تصویر کاور':'عکس پروفایل',key==='cover'?'تصویر بالای رزومه؛ جای آن به قالب انتخابی بستگی دارد.':'چهره یا تصویر معرفی خودت؛ بارگذاری عکس اختیاری است.','سربرگ رزومه','بدون تصویر بارگذاری‌شده؛ ظاهر جایگزین را قالب تعیین می‌کند'));
        }
        if(step==='contacts')for(const contact of RI.C().contacts)add('[data-field="'+contact.id+'"] .field__label',contact.label,'راه ارتباط با تو؛ فقط اگر کلید عمومی آن روشن باشد به بازدیدکننده نشان داده می‌شود.','بخش اطلاعات تماس رزومه','');
        if(LISTS[step])add('.panel__head h2',LISTS[step].title,LISTS[step].hint,'بخش '+LISTS[step].title+' در رزومه','بدون مورد؛ می‌توانی موارد جدید اضافه کنی');
      }
      function navButtons() {
        const i = STEPS.findIndex((s) => s.id === step), prev = STEPS[i - 1], next = STEPS[i + 1];
        return '<div class="stepnav">' + (prev ? '<button type="button" class="btn btn--ghost" data-step="' + prev.id + '">' + RI.icon('chevR') + prev.label + '</button>' : '<span></span>') + (next ? '<button type="button" class="btn btn--ice" data-step="' + next.id + '">' + next.label + RI.icon('chevL') + '</button>' : '<button type="button" class="btn btn--primary" data-go="publish">' + RI.icon('rocket') + 'به مرحلهٔ انتشار' + '</button>') + '</div>';
      }
      function setStep(s) {syncSpec();if(!STEPS.some(x=>x.id===s))return;step=s;tab='content';if(journey.guided){journey.phase=s==='profile'?'start':['contacts','socials'].includes(s)?'contact':'story';if(journey.phase==='story')storyStep=s;}RI.setRouteStep(journey.guided?journey.phase:s);paint();focusPanel();}
      function focusPanel(){const heading=body.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}if(innerWidth<1101)body.scrollIntoView({block:'start',behavior:'instant'});if(!RI.reduceMotion())body.animate([{opacity:.65,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});}
      function phase(id){if(!RI.ResumeJourney.stages.some(([key])=>key===id))return;journey.phase=id;storyStep='';tab='content';step=id==='contact'?'contacts':'profile';RI.setRouteStep(id);paint();focusPanel();}
      const publicationReview=()=>{if(!journey.guided||!sameContext())return false;phase('review');return true;};RI.resumePublicationReview=publicationReview;
      function bindMedia(){const panel=RI.$('#panel',root),p=RI.C().profile;for(const key of ['cover','avatar'])if(panel.querySelector('[data-img="'+key+'"]'))RI.bindImageField(panel,key,{set:v=>{if(!sameContext())return;p[key]=v;RI.touch(key);}});}

      function bindPanel() {
        const c = RI.C(), p = c.profile;
        if (RI.IMPORTED_TEMPLATES?.[c.theme.resume]&&RI.$('.template-workspace',root)) RI.mountImportedEditor(RI.$('#panel',root),pv,{guided:journey.guided,group:journey.guided?undefined:STEPS.find(s=>s.id===step)?.group||'general',legacy:STEPS.find(s=>s.id===step)?.group==='home:contact'});
        if (step === 'profile') {
          const panel = RI.$('#panel', root);
          RI.delegate(panel,'click','[data-account-phone]',()=>RI.phoneDialog());
          RI.bindImageField(panel, 'cover', { set: (v) => {if(!sameContext())return; p.cover = v; RI.touch('cover'); } });
          RI.bindImageField(panel, 'avatar', { set: (v) => {if(!sameContext())return; p.avatar = v; RI.touch('avatar'); } });
          const cnt = () => { const e = RI.$('#bioCount', panel); if (e) e.textContent = RI.fa(p.bio.length) + '/۳۰۰'; }; cnt();
          RI.$$('[data-p]', panel).forEach((el) => {
            el.addEventListener('input', () => { p[el.dataset.p] = el.value; RI.touch('profile'); if (el.dataset.p === 'bio') cnt(); if (el.value.trim()) RI.showFieldError(panel, el.dataset.p, ''); });
            el.addEventListener('blur', () => { if ((el.dataset.p === 'name' || el.dataset.p === 'title') && !el.value.trim()) RI.showFieldError(panel, el.dataset.p, 'این فیلد برای انتشار لازم است'); });
          });
        }
      }

      /* رویدادهای کلی بدنه */
      RI.delegate(root,'click','[data-template-shift]',(event,button)=>{const c=RI.C(),groups=RI.templateEditorGroups(c).map(g=>g.key),from=groups.indexOf(button.dataset.templateShift),to=from+Number(button.dataset.direction);if(from<0||to<0||to>=groups.length)return;RI.move(groups,from,to);c.resumeTemplates ||= {};const values=c.resumeTemplates[c.theme.resume] ||= {fields:{},settings:{},collections:{}};values.settings.section_order=groups.join(',');values.settings.reviewed=false;RI.touch('resumeTemplates');paint();});
      RI.delegate(root,'click','[data-template-source]',(event,button)=>{const key=button.dataset.templateSource;setStep('profile');requestAnimationFrame(()=>{const target=root.querySelector('[data-p="'+key+'"]')||root.querySelector('[data-img="'+key+'"] input');if(!target)return;for(let d=target.closest('details');d;d=d.parentElement?.closest('details'))d.open=true;target.focus();target.scrollIntoView({block:'center',behavior:'instant'});});});
      RI.delegate(root, 'click', '[data-step]', (e, b) => setStep(b.dataset.step));
      RI.delegate(body, 'click', '[data-add]', () => openForm(null));
      RI.delegate(body, 'click', '[data-edit]', (e, b) => openForm(b.dataset.edit));
      RI.delegate(body, 'click', '[data-del]', (e, b) => remove(b.dataset.del));
      RI.delegate(body, 'click', '[data-up],[data-down]', (e, b) => shift(b.dataset.up || b.dataset.down, b.dataset.up ? -1 : 1));
      body.addEventListener('input', (e) => {
        const el = e.target;
        if (el.dataset.templateKey) {
          const c = RI.C(); c.resumeTemplates = c.resumeTemplates || {};
          const values = c.resumeTemplates[c.theme.resume] || (c.resumeTemplates[c.theme.resume] = { fields: {}, settings: {} });
          values[el.dataset.templateGroup][el.dataset.templateKey] = el.type === 'checkbox' ? el.checked : el.value;
          RI.touch('resumeTemplates'); return;
        }
        const id = e.target.dataset.c; if (!id) return;
        const x = RI.C().contacts.find((k) => k.id === id); x.value = e.target.value; RI.touch('contacts');
        let m = '';
        if (e.target.value.trim()) { if (x.type === 'email' && !RI.isEmail(e.target.value)) m = 'ایمیل معتبر نیست'; if (x.type === 'phone' && !RI.isMobile(e.target.value)) m = 'شمارهٔ موبایل را به شکل ۰۹۱۲۳۴۵۶۷۸۹ بنویس'; if (x.type === 'website' && !RI.isUrl(e.target.value)) m = 'آدرس وب‌سایت معتبر نیست'; }
        RI.showFieldError(body, id, m);
      });
      body.addEventListener('change', (e) => {
        if (e.target.dataset.cpub) { const x = RI.C().contacts.find((k) => k.id === e.target.dataset.cpub); if (e.target.checked && !x.value.trim()) { e.target.checked = false; RI.toast('اول مقدار را وارد کن، بعد می‌توانی عمومی‌اش کنی', { kind: 'info' }); return; } x.public = e.target.checked; RI.touch('contacts'); paint(); }
        if (e.target.dataset.svis) { const s = RI.C().sections.find((k) => k.key === e.target.dataset.svis); s.visible = e.target.checked; RI.touch('sections'); const li = e.target.closest('.row'); li.classList.toggle('is-off', !s.visible); }
      });

      function openForm(id) {
        const section=step,owner=RI.ownerId,slot=RI.workspaceSlot,L = LISTS[section], list = RI.C()[section], cur = id ? list.find((x) => x.id === id) : null;
        const hints={desc:'شرح کوتاه و واقعی از کار، نتیجه یا سابقهٔ خودت؛ از ادعاهای ساختگی پرهیز کن.',from:'زمان شروع؛ می‌توانی سال یا سال و ماه بنویسی.',to:'زمان پایان؛ اگر هنوز ادامه دارد این مقدار نمایش داده نمی‌شود.',current:'اگر روشن باشد به‌جای تاریخ پایان، ادامه‌داشتن این سابقه نشان داده می‌شود.',url:'نشانی مقصد پروژه؛ بازدیدکننده از این لینک به پروژه می‌رود.',image:'تصویر معرفی پروژه، در بخش نمونه‌کارها و پنجرهٔ توضیح پروژه.',level:'ارزیابی خودت از سطح تسلط؛ این مقدار آزمون یا تأیید مهارت نیست.',handle:'فقط نام کاربری شبکه را بنویس، نه نشانی کامل آن.',platform:'شبکه‌ای که این نام کاربری به آن تعلق دارد.'};
        const fields=L.fields.map(f=>({...f,help:{what:hints[f.key]||'مقدار «'+f.label+'» برای همین مورد از بخش '+L.title+'.',where:'بخش '+L.title+' در رزومه',defaultValue:f.type==='level'?f.levels[(L.defaults?.[f.key]||3)-1]:f.type==='select'?f.options.find(o=>o[0]===L.defaults?.[f.key])?.[1]:L.defaults?.[f.key]??(f.type==='checkbox'?false:'')}}));
        RI.formModal({ title: (cur ? 'ویرایش ' : '') + L.add.replace('افزودن ', cur ? '' : 'افزودن '), size: step === 'projects' ? 'lg' : 'md', fields, values: cur ? RI.clone(cur) : Object.assign({}, L.defaults || {}), submitLabel: cur ? 'ذخیرهٔ تغییر' : 'افزودن',
          onSubmit: (v) => {if(!root.isConnected||owner!==RI.ownerId||slot!==RI.workspaceSlot){RI.toast('صفحه تغییر کرده؛ دوباره مورد را باز کن',{kind:'info'});return;} if (cur) Object.assign(cur, v); else list.push(Object.assign({ id: RI.uid() }, v)); RI.touch(section); paint(); RI.toast(cur ? 'تغییر اعمال شد' : 'اضافه شد' + (list.length === 1 ? ' — بخش جان گرفت!' : '')); } });
      }
      async function remove(id) {
        const section=step,L = LISTS[section], list = RI.C()[section], x = list.find((k) => k.id === id);
        const ok = await RI.confirm({ title: 'حذف «' + esc(L.title_(x)) + '»', text: 'این مورد از رزومه حذف می‌شود تا زمانی که ذخیره نکنی می‌توانی با «دور انداختن تغییرات» برش گردانی', danger: true, icon: 'trash', confirmLabel: 'حذف' });
        if (!ok||!sameContext()) return;
        const el = RI.$('[data-id="' + id + '"]', body);
        if (el && !RI.reduceMotion()) await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 220, easing: 'ease-in' }).finished.catch(() => {});
        if(!sameContext())return;const index=list.findIndex(k=>k.id===id);if(index<0)return;list.splice(index, 1); RI.touch(section); paint(); RI.toast('حذف شد', { kind: 'info' });
      }
      function shift(id, d) {
        const list = RI.C()[step], i = list.findIndex((k) => k.id === id), j = i + d; if (j < 0 || j >= list.length) return;
        RI.flip(RI.$('#rlist', body), () => { RI.move(list, i, j); RI.touch(step); paint(); });
      }
      function bindLayout() {
        const ul = RI.$('#slist', body);if(!ul)return; const secs = RI.C().sections;
        RI.delegate(ul, 'click', '[data-sup],[data-sdown]', (e, b) => { const k = b.dataset.sup || b.dataset.sdown, i = secs.findIndex((s) => s.key === k), j = i + (b.dataset.sup ? -1 : 1); if (j < 0 || j >= secs.length) return; RI.flip(ul, () => { RI.move(secs, i, j); RI.touch('sections'); paint(); }); });
        RI.sortable(ul, { onReorder: (f, t) => RI.flip(ul, () => { const shown=secs.filter(x=>spec.sections.includes(x.key)); RI.move(secs, secs.indexOf(shown[f]), secs.indexOf(shown[t])); RI.touch('sections'); paint(); }) });
      }
      RI.delegate(root, 'click', '#rtabs [data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(root,'click','button[data-journey-phase]',(e,b)=>{if(journey.guided)phase(b.dataset.journeyPhase);else{journey.guided=true;phase(b.dataset.journeyPhase);}});
      RI.delegate(root,'click','[data-journey-mode]',()=>{journey.guided=!journey.guided;step='profile';tab='content';RI.setRouteStep(journey.guided?journey.phase:step);paint();});
      RI.delegate(root,'click','[data-journey-choices]',()=>{storyStep='';paint();focusPanel();});
      RI.delegate(root,'click','[data-journey-next]',()=>{if(journey.phase==='start'){const p=RI.C().profile,key=!p.name.trim()?'name':!p.title.trim()?'title':null;if(key){RI.showFieldError(body,key,'برای نمایش روی رزومه، این قسمت را بنویس');body.querySelector('[data-p="'+key+'"]')?.focus();return;}}const index=RI.ResumeJourney.stages.findIndex(([id])=>id===journey.phase);phase(RI.ResumeJourney.stages[index+1]?.[0]);});
      RI.delegate(root,'click','[data-journey-layout],[data-journey-advanced]',(e,b)=>{journey.guided=false;tab=b.hasAttribute('data-journey-layout')?'layout':'content';step='template';RI.setRouteStep('template');paint();focusPanel();});
      RI.delegate(root,'click','[data-journey-retry]',()=>paint());
      RI.delegate(root,'click','[data-journey-save-retry]',()=>RI.doSave());
      RI.delegate(root,'click','[data-journey-names]',()=>RI.ResumeJourney.names());
      RI.delegate(root,'click','[data-account-phone]',()=>{if(journey.guided&&journey.phase==='review')RI.phoneDialog();});
      root.addEventListener('change',e=>{if(!e.target.hasAttribute('data-journey-reviewed'))return;const c=RI.C(),values=c.resumeTemplates[c.theme.resume]||(c.resumeTemplates[c.theme.resume]={fields:{},settings:{},collections:{}});values.settings.reviewed=e.target.checked;RI.touch('resumeTemplates');});
      RI.delegate(root,'click','[data-journey-publish]',async(e,button)=>{if(publishing)return;publishing=true;button.disabled=true;button.setAttribute('aria-busy','true');const owner=RI.ownerId,slot=RI.workspaceSlot;try{const ok=await RI.publish('resume');if(root.isConnected&&owner===RI.ownerId&&slot===RI.workspaceSlot&&ok!==false){RI.toast('رزومه منتشر شد');paint();const status=body.querySelector('.journey-publish-state');if(status)status.textContent='نسخهٔ عمومی رزومه به‌روز است.';}}catch(error){if(root.isConnected&&owner===RI.ownerId&&slot===RI.workspaceSlot){const message=error.message==='account-incomplete'?'نام حساب و شمارهٔ تأییدشده را کامل کن.':error.message,status=body.querySelector('.journey-publish-state');if(status){status.setAttribute('role','alert');status.textContent=message;}RI.toast(message,{kind:'error'});}}finally{publishing=false;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}});
      RI.delegate(root, 'click', '[data-live]', () => RI.openPreview('resume'));
      paint();
      let advisorCleanup, mounted=true;
      if(!RI.advisorScripts)RI.advisorScripts=(async()=>{for(const name of ['advisor-core','advisor-ui'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/dashboard/js/'+name+'.js?v='+encodeURIComponent(document.documentElement.dataset.assetVersion||'');script.onload=resolve;script.onerror=reject;document.head.append(script);});})().catch(error=>{RI.advisorScripts=null;throw error;});
      RI.advisorScripts.then(()=>{if(mounted)advisorCleanup=RI.mountAdvisor(RI.$('#resume-advisor',root),target=>{tab='content';setStep(target.section==='template'?'template':target.section);if(target.section==='template'){const field=spec.fields.find(f=>f.key===target.field),destination=STEPS.find(s=>s.group===field?.group);if(destination)setStep(destination.id);body.querySelector('#panel').dispatchEvent(new CustomEvent('ri:template-focus',{detail:target}));}else if(target.section!=='profile')openForm(target.itemId);else requestAnimationFrame(()=>{const input=RI.$('[data-p="'+target.field+'"]',root),details=input?.closest('details');if(details)details.open=true;input?.focus();});});}).catch(()=>{if(mounted)RI.$('#resume-advisor',root).textContent='راهنمای کیفیت دریافت نشد؛ ویرایش و انتشار همچنان در دسترس‌اند.';});
      if (ctx.opts && ctx.opts.step) { /* رفتن مستقیم به مرحلهٔ پیشنهادی */ }
      return () => {if(RI.resumePublicationReview===publicationReview)delete RI.resumePublicationReview;mounted=false;renderSerial++;lookCleanup?.();advisorCleanup?.();cancelAnimationFrame(raf);off();offSave(); pv.destroy(); desktop.removeEventListener('change', placeOutline); };
    },
  });
})();
