/* خانهٔ داشبورد: میز کار، مسیر پیشرفت، وضعیت صفحه‌ها، راهنمای شروع، خلاصهٔ بازدیدها */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'روز بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
  }

  function heroText(comp, empty) {
    const c = RI.C(), first = c.profile.name.trim().split(' ')[0] || 'دوست من';
    if(empty&&RI.workspaceSlot===3)return {h:'صفحهٔ لینک‌هایت را بساز',p:'لینک‌ها و نام نمایشی‌ات را اضافه کن؛ سپس آمادگی انتشار را بررسی کن.'};
    if (empty) return { h: 'خوش آمدی به ResumeIt', p: 'این‌جا استودیوی ساخت هویت توست؛ از یک رزومه و یک صفحهٔ لینک شروع می‌کنیم ' + 'با چند قدم کوتاه، صفحه‌ای می‌سازی که اولین برداشت درباره‌ات را خودت تعیین می‌کنی' };
    const left = comp.items.filter((i) => !i.done).length;
    if (comp.pct >= 100) return { h: greeting() + '، ' + esc(first), p: 'قدم‌های تکمیل محتوا انجام شده‌اند؛ آمادگی انتشار را جدا بررسی کن' };
    return { h: greeting() + '، ' + esc(first), p: 'پروفایلت ' + RI.fa(comp.pct) + '٪ کامل است و ' + RI.fa(left) + ' قدم تا صفحهٔ کامل مانده ' + (comp.next ? 'پیشنهاد بعدی: «' + comp.next.label + '».' : '') };
  }

  function journey(comp) {
    const bs = RI.badgeState();
    const firstLocked = bs.findIndex((b) => !b.got);
    return '<ol class="journey" aria-label="مسیر ساخت هویت">' + bs.map((b, i) => {
      const cur = i === firstLocked;
      const need = b.id === 'live' ? 'انتشار صفحه' : RI.fa(b.at) + '٪ تکمیل';
      return '<li class="journey__step' + (b.got ? ' is-got' : '') + (cur ? ' is-current' : '') + '"><span class="journey__dot">' + RI.icon(b.got ? 'check' : b.icon) + '</span><b>' + esc(b.label) + '</b><small>' + need + '</small></li>';
    }).join('') + '</ol>';
  }

  function checklist(comp) {
    return '<ul class="steps">' + comp.items.map((i) =>
      '<li><a class="steps__row' + (i.done ? ' is-done' : '') + '" href="' + RI.routeUrl(i.route) + '" data-go="' + i.route + '"' + (i.step ? ' data-step="' + i.step + '"' : '') + (i.tab ? ' data-tab="' + i.tab + '"' : '') + (i.anchor ? ' data-anchor="' + i.anchor + '"' : '') + '>' +
      '<span class="steps__tick">' + (i.done ? RI.icon('check') : '') + '</span><span class="steps__label">' + esc(i.label) + '</span><span class="steps__w">' + (RI.workspaceSlot===3?(i.done?'انجام شد':'باقی مانده'):'+'+RI.fa(i.w)+'٪') + '</span></a></li>').join('') + '</ul>';
  }

  function pageStatus(k) {
    const s = RI.state.pub[k], u = RI.urls(), isR = k === 'resume';
    const url = isR ? u.resume : u.links;
    const dirty = RI.pubDirty(k), live = s.status === 'published';
    const chip = live ? (dirty ? '<span class="chip chip--warn">' + RI.icon('edit') + 'تغییرات منتشرنشده</span>' : '<span class="chip chip--ok">' + RI.icon('check') + 'منتشر شده · نسخهٔ ' + RI.fa(s.version) + '</span>') : '<span class="chip">پیش‌نویس</span>';
    const slugOk = RI.slugCheck(RI.C().slug).state === 'ok';
    return '<section class="pstat pstat--' + (isR ? 'ice' : 'bro') + '"><div class="pstat__head"><span class="pstat__ico">' + RI.icon(isR ? 'resume' : 'link') + '</span><div><h3>' + (isR ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها') + '</h3>' + chip + '</div></div>' +
      (slugOk ? RI.urlChip(url, { open: url }) : '<p class="field__hint">برای دیدن آدرس، یک نام صفحه انتخاب کنید</p>') +
      '<div class="pstat__actions"><a class="btn btn--soft btn--sm" href="' + RI.routeUrl(isR ? 'resume' : 'links') + '" data-go="' + (isR ? 'resume' : 'links') + '">' + RI.icon('edit') + 'ویرایش</a>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-preview="' + k + '">' + RI.icon('eye') + 'پیش‌نمایش</button>' +
      '<button type="button" class="btn btn--primary btn--sm" data-publish="' + k + '">' + RI.icon('rocket') + (live ? (dirty ? 'به‌روزرسانی' : 'مدیریت انتشار') : 'انتشار') + '</button></div></section>';
  }

  function sampleStrip() {
    if(RI.statsLoading||(!RI.statsError&&RI.statsRows===null))return RI.sectionLoading('در حال دریافت آمار بازدیدها…');
    if(RI.statsRows===null)return '<div class="section-loading"><p role="alert">آمار دریافت نشد؛ بقیهٔ صفحه آماده است.</p><button type="button" class="btn btn--soft btn--sm" data-retry-stats>تلاش دوباره</button></div>';
    const ser = RI.metricSeries(7);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const views=RI.workspaceSlot===3?ser.linkViews:ser.views;
    return '<section class="strip" aria-label="خلاصهٔ آمار صفحه‌ها"><div class="strip__label"><span class="chip chip--sample">آمار صفحه‌های شما</span><p>بازدیدها و کلیک‌های ثبت‌شده در هفت روز اخیر</p></div>' +
      '<dl class="strip__nums">' + (RI.workspaceSlot===3?'':'<div><dt>بازدید رزومه</dt><dd class="num">' + RI.fa(sum(ser.views)) + '</dd></div>') + '<div><dt>بازدید لینک‌ها</dt><dd class="num">' + RI.fa(sum(ser.linkViews)) + '</dd></div><div><dt>کلیک روی لینک‌ها</dt><dd class="num">' + RI.fa(sum(ser.clicks)) + '</dd></div></dl>' +
      '<div class="strip__chart">' + RI.charts.placeholder({ title: 'روند بازدید ۷ روز', labelTitle: 'روز', height: 150, table: false, labels: views.map((v, i) => i === views.length - 1 ? 'امروز' : RI.fa(views.length - i - 1) + ' روز پیش'), series: [{ name: RI.workspaceSlot === 3 ? 'بازدید لینک‌ها' : 'بازدید رزومه', values: views, color: '#52788d' }, { name: 'کلیک لینک‌ها', values: ser.clicks, color: '#a47248' }] }) + '</div>' +
      '<a class="btn btn--ghost btn--sm" href="/dashboard/stats/" data-go="stats">' + RI.icon('chart') + 'همهٔ آمار</a></section>';
  }

  function guide(open) {
    const steps = [
      ['۱', 'خودت را معرفی کن', 'نام، عنوان و یک معرفی کوتاه حدود دو دقیقه', 'resume', 'profile', 'user'],
      ['۲', 'نمونه‌کارها و مهارت‌ها را اضافه کن', 'هر بخش را خودت روشن یا خاموش می‌کنی', 'resume', 'skills', 'code'],
      ['۳', 'لینک‌هایت را کنار هم بچین', 'گیت‌هاب، کانال، وبلاگ؛ هر چه می‌خواهی دیده شود', 'links', '', 'link'],
      ['۴', 'ظاهر را انتخاب کن و منتشر کن', 'قالب، فونت و رنگ؛ بعد یک آدرس شخصی بگیر', 'themes', '', 'palette'],
    ];
    return '<details class="guide"' + (open ? ' open' : '') + '><summary><span>' + RI.icon('flag') + 'راهنمای شروع در ' + (RI.workspaceSlot===3?'دو':'چهار') + ' قدم</span>' + RI.icon('chevD', 'guide__chev') + '</summary><ol class="guide__list">' +
      steps.filter(s=>RI.workspaceSlot!==3||s[3]!=='resume').map((s,i) => '<li><a href="' + RI.routeUrl(s[3]) + '" data-go="' + s[3] + '"' + (s[4] ? ' data-step="' + s[4] + '"' : '') + '><span class="guide__n">' + RI.fa(i+1) + '</span><span class="guide__t"><b>' + s[1] + '</b><small>' + s[2] + '</small></span>' + RI.icon(s[5]) + '</a></li>').join('') + '</ol></details>';
  }

  /* صحنهٔ استودیو؛ قالب‌های واردشده با تصویر سبک نمایش داده می‌شوند. */
  function stage() {
    const c = RI.C();
    if(RI.workspaceSlot===3)return '';
    const resume = ['vista','satiar'].includes(c.theme.resume) ? '<img src="/brand/template-thumbs/resume-'+c.theme.resume+'.jpg" alt="نمونهٔ قالب فعال رزومه" width="1120" height="800" style="width:1120px;height:800px;object-fit:cover">' : RI.resumeHtml(c);
    return '<div class="stage" aria-hidden="true" inert><div class="stage__desk"><div class="stage__chrome"><i></i><i></i><i></i></div><div class="mini" data-nat="1120" data-h="640"><div class="mini__in">' + resume + '</div></div></div>' +
      '<div class="stage__phone"><div class="mini" data-nat="390" data-h="700"><div class="mini__in">' + RI.linksHtml(c) + '</div></div></div></div>';
  }
  function fitMini(root) {
    RI.$$('.mini', root).forEach((m) => {
      const nat = +m.dataset.nat, nh = +m.dataset.h, inn = RI.$('.mini__in', m);
      const k = m.clientWidth / nat;
      inn.style.width = nat + 'px'; inn.style.height = nh + 'px'; inn.style.transform = 'scale(' + k + ')';
      m.style.height = nh * k + 'px';
    });
  }

  RI.registerPage('home', {
    title: 'خانهٔ داشبورد',
    render() {
      const c = RI.C(), comp = RI.completion();
      const empty = !c.profile.name.trim() && !c.profile.title.trim() && comp.pct < 25;
      const t = heroText(comp, empty);
      const next = comp.next,kind=RI.workspaceSlot===3?'links':'resume';
      return '<p class="field__hint">' + (RI.workspaceSlot===3?'جایگاه فعال: آدرس مسیری · فقط لینک':'جایگاه فعال: زیردامنهٔ '+RI.fa(RI.workspaceSlot<3?RI.workspaceSlot:RI.workspaceSlot-1)) + '</p><section class="hero' + (RI.workspaceSlot===3?' hero--links':'') + '"><div class="hero__text"><div class="eyebrow">' + RI.icon('sparkle') + 'میز کار شما</div><h1 id="page-title" tabindex="-1">' + t.h + '</h1><p>' + t.p + '</p>' +
        '<div class="hero__cta">' + (next ? '<a class="btn btn--primary btn--lg" href="' + RI.routeUrl(next.route) + '" data-go="' + next.route + '"' + (next.step ? ' data-step="' + next.step + '"' : '') + (next.tab ? ' data-tab="' + next.tab + '"' : '') + (next.anchor ? ' data-anchor="' + next.anchor + '"' : '') + '>' + RI.icon('zap') + (empty ? (RI.workspaceSlot===3?'تکمیل: '+esc(next.label):'شروع ساخت پروفایل') : 'ادامه: ' + esc(next.label)) + '</a>' : '<button type="button" class="btn btn--primary btn--lg" data-publish="' + kind + '">' + RI.icon('rocket') + 'انتشار صفحه</button>') +
        '<button type="button" class="btn btn--soft btn--lg" data-preview="' + kind + '">' + RI.icon('eye') + 'پیش‌نمایش</button></div>' +
        '<div class="hero__progress">' + RI.ring(comp.pct, 96, 9) + '<div><b>مسیر ساخت هویت</b><small>درصد تکمیل محتوا؛ شرایط انتشار در بخش آمادگی بررسی می‌شود</small></div></div></div>' + (RI.workspaceSlot===3?'':'<div data-home-stage>'+RI.sectionLoading('در حال آماده‌سازی نمای صفحه‌ها…')+'</div>') + '</section>' +
        // Sections as tabs keep the home page near one screen; stats stay on the first tab.
        RI.sectionTabs('home', [['overview', 'مسیر و آمار', 'flag', '<section class="block"><div class="block__head"><h2>مسیر تو</h2><p>قدم‌های تکمیل صفحه و بررسی آمادگی انتشار</p></div>' + (RI.workspaceSlot===3?'':journey(comp)) +
        '<details class="allsteps"><summary>' + RI.icon('check') + 'فهرست قدم‌ها (' + RI.fa(comp.items.filter((i) => i.done).length) + ' از ' + RI.fa(comp.items.length) + ')' + RI.icon('chevD') + '</summary>' + checklist(comp) + '</details></section>' + '<section class="block" id="homeStats">' + sampleStrip() + '</section>'], ['pages', 'صفحه‌ها', 'resume', '<section class="block"><div class="block__head"><h2>وضعیت صفحه‌ها</h2><p>' + (RI.workspaceSlot===3?'صفحهٔ لینک‌های جایگاه فعال':'دو صفحهٔ مستقل در جایگاه فعال') + '</p></div><div class="pstat-grid">' + RI.pageKinds().map(pageStatus).join('') + '</div></section>' + '<section class="block"><div class="block__head"><h2>دسترسی سریع</h2></div><ul class="quick">' +
        [['resume', 'ویرایش رزومه', 'resume'], ['links', 'مدیریت لینک‌ها', 'link'], ['themes', 'ظاهر و قالب', 'palette'], ['publish', 'آدرس و انتشار', 'globe']].filter(q=>RI.workspaceSlot!==3||q[0]!=='resume').map((q) => '<li><a href="' + RI.routeUrl(q[0]) + '" data-go="' + q[0] + '"><span>' + RI.icon(q[2]) + '</span><b>' + q[1] + '</b>' + RI.icon('chevL', 'quick__arrow') + '</a></li>').join('') + '</ul></section>'], ['guide', 'راهنمای شروع', 'book', '<section class="block">' + guide(empty || comp.pct < 40) + '</section>']]);
    },
    mount(root) {
      let stageFrame=requestAnimationFrame(()=>{stageFrame=requestAnimationFrame(()=>{const host=root.querySelector('[data-home-stage]');if(!root.isConnected||!host)return;host.innerHTML=stage();fitMini(root);});});
      fitMini(root);
      const ro = new ResizeObserver(() => fitMini(root));
      ro.observe(root);
      RI.delegate(root, 'click', '[data-preview]', async (e, b) => {try{if(b.dataset.preview==='resume')await RI.loadTemplates([RI.C().theme.resume]);RI.openPreview(b.dataset.preview);}catch(e){RI.toast(e.message,{kind:'error'});}});
      RI.delegate(root, 'click', '[data-publish]', () => RI.go('publish'));
      RI.delegate(root,'click','[data-retry-stats]',()=>RI.loadStats());
      const offStats=RI.on('stats',()=>{ RI.$('#homeStats',root).innerHTML=sampleStrip(); });
      return () => {cancelAnimationFrame(stageFrame);offStats(); ro.disconnect();};
    },
  });
})();
