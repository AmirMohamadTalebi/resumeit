/* خانهٔ داشبورد: یک نگاه به همه‌چیز — قدم بعدی، وضعیت صفحه‌ها، بازدید هفته، حساب و میانبرها */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const linksOnly = () => RI.workspaceSlot === 3;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'روز بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
  }
  const today = () => { try { return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); } catch { return ''; } };
  const stepLink = (i, cls, inner) => '<a class="' + cls + '" href="' + RI.routeUrl(i.route) + '" data-go="' + i.route + '"' + (i.step ? ' data-step="' + i.step + '"' : '') + (i.tab ? ' data-tab="' + i.tab + '"' : '') + (i.anchor ? ' data-anchor="' + i.anchor + '"' : '') + '>' + inner + '</a>';

  // Progress: the ring, the one next step, and the remaining steps (all of them on demand).
  function progress(comp) {
    const left = comp.items.filter(i => !i.done), done = comp.items.length - left.length;
    const head = comp.pct >= 100 ? 'محتوای صفحه کامل است' : 'پروفایلت ' + RI.fa(comp.pct) + '٪ کامل است';
    const sub = comp.pct >= 100 ? 'قدم‌های تکمیل انجام شده؛ آمادگی انتشار را بررسی کن و صفحه را منتشر کن.' : RI.fa(left.length) + ' قدم مانده تا صفحه‌ای کامل؛ هر قدم را بزنی همان‌جا باز می‌شود.';
    const next = comp.next ? stepLink(comp.next, 'btn btn--primary nv-next__cta', RI.icon('zap') + 'قدم بعدی: ' + esc(comp.next.label)) : '<a class="btn btn--primary nv-next__cta" href="' + RI.routeUrl('studio') + '" data-go="studio">' + RI.icon('check') + 'بررسی آمادگی انتشار</a>';
    const row = i => '<li>' + stepLink(i, 'nv-step' + (i.done ? ' is-done' : ''), '<span class="nv-step__tick">' + (i.done ? RI.icon('check') : '') + '</span><span class="nv-step__label">' + esc(i.label) + '</span><span class="nv-step__w">' + (linksOnly() ? (i.done ? 'انجام شد' : '') : '+' + RI.fa(i.w) + '٪') + '</span>') + '</li>';
    return '<section class="nv-card nv-next" aria-labelledby="home-progress"><div class="nv-next__top">' + RI.ring(comp.pct, 92, 9) + '<div class="nv-next__text"><h2 id="home-progress">' + head + '</h2><p>' + sub + '</p>' + next + '</div></div>' +
      (comp.items.length ? '<div class="nv-steps"><div class="nv-steps__head"><b>قدم‌ها</b><span>' + RI.fa(done) + ' از ' + RI.fa(comp.items.length) + '</span></div><ul class="nv-steps__list" data-steps>' + left.slice(0, 4).map(row).join('') + '</ul>' +
        (comp.items.length > Math.min(4, left.length) ? '<button type="button" class="nv-link" data-all-steps aria-expanded="false">' + RI.icon('chevD') + 'همهٔ قدم‌ها</button><ul class="nv-steps__list" data-steps-all hidden>' + comp.items.map(row).join('') + '</ul>' : '') + '</div>' : '') + '</section>';
  }

  function pageRow(k) {
    const s = RI.state.pub[k], u = RI.urls(), isR = k === 'resume', url = isR ? u.resume : u.links;
    const dirty = RI.pubDirty(k), live = s.status === 'published', slugOk = RI.slugCheck(RI.C().slug).state === 'ok';
    const chip = live ? (dirty ? '<span class="nv-chip nv-chip--warn">' + RI.icon('edit') + 'تغییر منتشرنشده</span>' : '<span class="nv-chip nv-chip--ok">' + RI.icon('check') + 'منتشر شده</span>') : '<span class="nv-chip">پیش‌نویس</span>';
    return '<li class="nv-page"><span class="nv-ico' + (isR ? ' nv-ico--blue' : '') + '">' + RI.icon(isR ? 'resume' : 'link') + '</span><div class="nv-page__main"><div class="nv-page__title"><b>' + (isR ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها') + '</b>' + chip + '</div>' +
      (slugOk ? '<div class="nv-page__url"><bdi dir="ltr">' + esc(url) + '</bdi><button type="button" class="nv-icon-btn" data-copy="' + esc(url) + '" aria-label="کپی آدرس">' + RI.icon('copy') + '</button>' + (live ? '<button type="button" class="nv-icon-btn" data-open-url="' + esc(url) + '" aria-label="باز کردن صفحه">' + RI.icon('external') + '</button>' : '') + '</div>' : '<span class="nv-row__meta">هنوز آدرسی انتخاب نشده</span>') +
      '</div><div class="nv-page__actions"><a class="btn btn--soft btn--sm" href="' + RI.routeUrl(isR ? 'resume' : 'links') + '" data-go="' + (isR ? 'resume' : 'links') + '">' + RI.icon('edit') + 'ویرایش</a><button type="button" class="btn btn--sm ' + (live && !dirty ? 'btn--ghost' : 'btn--primary') + '" data-publish="' + k + '">' + RI.icon('rocket') + (live ? (dirty ? 'به‌روزرسانی' : 'انتشار') : 'انتشار') + '</button></div></li>';
  }

  function stats() {
    if (RI.statsLoading || (!RI.statsError && RI.statsRows === null)) return '<p class="sr-only" role="status">در حال دریافت آمار بازدیدها…</p><div class="nv-kpis" aria-hidden="true">' + '<div class="nv-kpi"><span class="nv-skeleton"></span></div>'.repeat(3) + '</div>';
    if (RI.statsRows === null) return '<div class="nv-note nv-note--warn">' + RI.icon('alert') + '<span>آمار دریافت نشد. <button type="button" class="nv-link" data-retry-stats>تلاش دوباره</button></span></div>';
    const ser = RI.metricSeries(7), sum = a => a.reduce((x, y) => x + y, 0), views = linksOnly() ? ser.linkViews : ser.views;
    const kpi = (label, value) => '<div class="nv-kpi"><small>' + label + '</small><b>' + RI.fa(value) + '</b></div>';
    return '<div class="nv-kpis">' + (linksOnly() ? '' : kpi('بازدید رزومه', sum(ser.views))) + kpi('بازدید لینک‌ها', sum(ser.linkViews)) + kpi('کلیک لینک‌ها', sum(ser.clicks)) + '</div>' +
      '<div class="nv-chart">' + RI.charts.placeholder({ title: 'بازدید هفت روز اخیر', labelTitle: 'روز', height: 170, table: false, labels: views.map((v, i) => i === views.length - 1 ? 'امروز' : RI.fa(views.length - i - 1) + ' روز پیش'), series: [{ name: linksOnly() ? 'بازدید لینک‌ها' : 'بازدید رزومه', values: views, color: '#52788d' }, { name: 'کلیک لینک‌ها', values: ser.clicks, color: '#a47248' }] }) + '</div>';
  }

  function account(wallet) {
    const plan = RI.hasSub() && RI.PLANS[RI.state.billing.plan.id], days = plan ? Math.max(0, Math.ceil((RI.state.billing.plan.end - Date.now()) / 86400000)) : 0;
    return '<ul class="nv-list"><li><a class="nv-row" href="' + RI.routeUrl('billing') + '" data-go="billing"><span class="nv-ico">' + RI.icon('crown') + '</span><span class="nv-row__main"><span class="nv-row__title">' + (plan ? 'اشتراک ' + esc(plan.name) : 'حساب رایگان') + '</span><span class="nv-row__meta">' + (plan ? RI.fa(days) + ' روز باقی مانده' : 'برای قالب‌های ویژه و حذف نشان، اشتراک بگیر') + '</span></span>' + RI.icon('chevL') + '</a></li>' +
      '<li><a class="nv-row" href="' + RI.routeUrl('wallet') + '" data-go="wallet"><span class="nv-ico nv-ico--blue">' + RI.icon('card') + '</span><span class="nv-row__main"><span class="nv-row__title">کیف پول</span><span class="nv-row__meta" data-home-wallet>' + (wallet ? RI.fa(wallet.balance) + ' It موجودی' : 'در حال دریافت موجودی…') + '</span></span>' + RI.icon('chevL') + '</a></li></ul>';
  }

  const SHORTCUTS = [['resume', 'رزومه', 'resume'], ['links', 'لینک‌ها', 'link'], ['themes', 'قالب و رنگ', 'palette'], ['publish', 'آدرس صفحه', 'globe'], ['messages', 'پیام‌ها', 'mail'], ['support', 'پشتیبانی', 'help']];
  const GUIDE = [['خودت را معرفی کن', 'نام، عنوان و یک معرفی کوتاه', 'resume', 'profile', 'user'], ['نمونه‌کار و مهارت اضافه کن', 'هر بخش را خودت روشن یا خاموش می‌کنی', 'resume', 'skills', 'code'], ['لینک‌هایت را بچین', 'گیت‌هاب، کانال، وبلاگ و هرچه می‌خواهی دیده شود', 'links', '', 'link'], ['قالب را انتخاب و منتشر کن', 'قالب، فونت و رنگ؛ بعد آدرس شخصی', 'themes', '', 'palette']];

  RI.registerPage('home', {
    title: 'خانه',
    render() {
      const c = RI.C(), comp = RI.completion(), first = c.profile.name.trim().split(' ')[0];
      const fresh = !c.profile.name.trim() && !c.profile.title.trim() && comp.pct < 25, kind = linksOnly() ? 'links' : 'resume';
      const live = RI.pageKinds().some(k => RI.state.pub[k].status === 'published');
      return '<div class="nv nv-home">' +
        '<header class="nv-head"><div><p class="nv-head__eyebrow">' + RI.icon('calendar') + esc(today()) + ' · ' + (linksOnly() ? 'جایگاه فقط لینک' : 'جایگاه ' + RI.fa(RI.workspaceSlot < 3 ? RI.workspaceSlot : RI.workspaceSlot - 1)) + '</p>' +
        '<h1 id="page-title" tabindex="-1">' + (fresh ? 'به ResumeIt خوش آمدی' : greeting() + (first ? '، ' + esc(first) : '')) + '</h1><p>' + (fresh ? 'با چند قدم کوتاه صفحه‌ای می‌سازی که اولین برداشت دیگران از تو را خودت تعیین می‌کنی.' : 'همه‌چیز این‌جا یک نگاه است؛ از قدم بعدی شروع کن.') + '</p></div>' +
        '<div class="nv-head__actions"><button type="button" class="btn btn--soft" data-preview="' + kind + '">' + RI.icon('eye') + 'پیش‌نمایش</button>' + (live ? '<a class="btn btn--ghost" href="' + RI.routeUrl('stats') + '" data-go="stats">' + RI.icon('chart') + 'آمار کامل</a>' : '') + '</div></header>' +
        '<div class="nv-home__grid" data-home-grid>' + progress(comp).replace('<section class="nv-card nv-next"', '<section data-mtab="today" class="nv-card nv-next"') +
        '<section data-mtab="pages" class="nv-card nv-home__pages" aria-labelledby="home-pages"><div class="nv-card__head"><div><h2 id="home-pages">' + RI.icon('globe') + 'صفحه‌های تو</h2><p>وضعیت انتشار و آدرس هر صفحه</p></div></div><ul class="nv-list nv-pages">' + RI.pageKinds().map(pageRow).join('') + '</ul></section>' +
        '<section data-mtab="stats" class="nv-card nv-home__stats" aria-labelledby="home-stats"><div class="nv-card__head"><div><h2 id="home-stats">' + RI.icon('chart') + 'هفت روز اخیر</h2><p>بازدید و کلیک ثبت‌شده روی صفحه‌هایت</p></div><a class="nv-link" href="' + RI.routeUrl('stats') + '" data-go="stats">همهٔ آمار' + RI.icon('chevL') + '</a></div><div id="homeStats">' + stats() + '</div></section>' +
        '<div data-mtab="pages" class="nv-stack nv-home__side"><section class="nv-card" aria-labelledby="home-account"><div class="nv-card__head"><div><h2 id="home-account">' + RI.icon('user') + 'حساب</h2></div></div><div data-home-account>' + account(null) + '</div></section>' +
        '<section class="nv-card" aria-labelledby="home-short"><div class="nv-card__head"><div><h2 id="home-short">' + RI.icon('zap') + 'میانبرها</h2></div></div><ul class="nv-shortcuts">' + SHORTCUTS.filter(s => !linksOnly() || s[0] !== 'resume').map(([id, label, glyph]) => '<li><a href="' + RI.routeUrl(id) + '" data-go="' + id + '"><span>' + RI.icon(glyph) + '</span>' + label + '</a></li>').join('') + '</ul></section></div>' +
        (comp.pct < 40 ? '<section data-mtab="today" class="nv-card nv-home__guide" aria-labelledby="home-guide"><div class="nv-card__head"><div><h2 id="home-guide">' + RI.icon('flag') + 'شروع در ' + (linksOnly() ? 'دو' : 'چهار') + ' قدم</h2><p>اگر اولین بار است، به همین ترتیب جلو برو.</p></div></div><ol class="nv-guide">' + GUIDE.filter(g => !linksOnly() || g[2] !== 'resume').map((g, i) => '<li><a href="' + RI.routeUrl(g[2]) + '" data-go="' + g[2] + '"' + (g[3] ? ' data-step="' + g[3] + '"' : '') + '><span class="nv-guide__n">' + RI.fa(i + 1) + '</span><span><b>' + g[0] + '</b><small>' + g[1] + '</small></span>' + RI.icon(g[4]) + '</a></li>').join('') + '</ol></section>' : '') +
        '</div></div>';
    },
    mount(root) {
      let alive = true;
      const grid = root.querySelector('[data-home-grid]'); grid.before(RI.mobileTabs(grid, [['today', 'امروز', 'zap'], ['pages', 'صفحه‌ها و حساب', 'globe'], ['stats', 'آمار', 'chart']], 'home'));
      RI.delegate(root, 'click', '[data-preview]', async (e, b) => { try { if (b.dataset.preview === 'resume') await RI.loadTemplates([RI.C().theme.resume]); RI.openPreview(b.dataset.preview); } catch (err) { RI.toast(err.message, { kind: 'error' }); } });
      RI.delegate(root, 'click', '[data-publish]', () => RI.go('publish'));
      RI.delegate(root, 'click', '[data-retry-stats]', () => RI.loadStats());
      RI.delegate(root, 'click', '[data-all-steps]', (e, b) => { const all = root.querySelector('[data-steps-all]'), open = all.hidden; all.hidden = !open; root.querySelector('[data-steps]').hidden = open; b.setAttribute('aria-expanded', String(open)); b.innerHTML = RI.icon(open ? 'up' : 'chevD') + (open ? 'فقط قدم‌های مانده' : 'همهٔ قدم‌ها'); });
      const offStats = RI.on('stats', () => { const host = root.querySelector('#homeStats'); if (host) host.innerHTML = stats(); });
      RI.dashboardRequest('wallet').then(w => { if (alive) root.querySelector('[data-home-account]').innerHTML = account(w); }).catch(() => { if (alive) { const m = root.querySelector('[data-home-wallet]'); if (m) m.textContent = 'موجودی دریافت نشد'; } });
      return () => { alive = false; offStats(); };
    },
  });
})();
