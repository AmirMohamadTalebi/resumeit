/* خانهٔ داشبورد، در زبان صفحهٔ اصلی: یک آسمان شب بالای صفحه با سلام، حلقهٔ طلایی پیشرفت، قدم بعدی و وضعیت هر صفحه
   (و فندق تمام‌قد که از گوشه سرک می‌کشد)؛ زیرش مسیر تکمیل مثل خط جوهری، کارت صفحه‌ها با پیش‌نمایش کوچک، آمار هفت
   روز، «از فندق بپرس»، حساب و میانبرها. روی گوشی کارت‌ها در سه زبانه می‌آیند و آسمان بالا همیشه دیده می‌شود. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const linksOnly = () => RI.workspaceSlot === 3;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'روز بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
  }
  const today = () => { try { return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); } catch { return ''; } };
  const stepLink = (i, cls, inner) => '<a class="' + cls + '" href="' + RI.routeUrl(i.route) + '" data-go="' + i.route + '"' + (i.step ? ' data-step="' + i.step + '"' : '') + (i.tab ? ' data-tab="' + i.tab + '"' : '') + (i.anchor ? ' data-anchor="' + i.anchor + '"' : '') + '>' + inner + '</a>';
  const pageName = k => k === 'resume' ? 'صفحهٔ رزومه' : 'صفحهٔ لینک‌ها';
  function pageState(k) {
    const s = RI.state.pub[k], dirty = RI.pubDirty(k), live = s.status === 'published';
    return live ? (dirty ? ['warn', 'تغییر منتشرنشده', 'edit'] : ['ok', 'منتشر شده', 'check']) : ['draft', 'پیش‌نویس', 'edit'];
  }

  /* ---------- The night sky at the top: greeting, ring, next step and the pages' status ---------- */
  function hero(comp) {
    const c = RI.C(), first = c.profile.name.trim().split(' ')[0], fresh = !c.profile.name.trim() && !c.profile.title.trim() && comp.pct < 25;
    const left = comp.items.filter(i => !i.done).length, kind = linksOnly() ? 'links' : 'resume';
    const title = fresh ? 'به ResumeIt <em>خوش آمدی</em>' : greeting() + (first ? '، <em>' + esc(first) + '</em>' : '');
    const sub = comp.pct >= 100 ? 'همهٔ قدم‌ها انجام شده؛ آمادگی انتشار را ببین و صفحه را به همه نشان بده.' : fresh ? 'با چند قدم کوتاه صفحه‌ای می‌سازی که اولین برداشت دیگران از تو را خودت تعیین می‌کنی.' : RI.fa(left) + ' قدم تا صفحه‌ای کامل مانده؛ از قدم بعدی شروع کن.';
    const next = comp.next ? stepLink(comp.next, 'btn btn--primary nv-next__cta hb-cta', RI.icon('zap') + '<span>قدم بعدی: ' + esc(comp.next.label) + '</span>' + RI.icon('chevL')) : '<a class="btn btn--primary nv-next__cta hb-cta" href="' + RI.routeUrl('studio') + '" data-go="studio">' + RI.icon('check') + '<span>بررسی آمادگی انتشار</span>' + RI.icon('chevL') + '</a>';
    const pills = RI.pageKinds().map(k => { const [tone, label] = pageState(k); return '<li class="hb-pill is-' + tone + '"><i aria-hidden="true"></i><b>' + pageName(k) + '</b><span>' + label + '</span></li>'; }).join('');
    const r = 52, len = 2 * Math.PI * r;
    return '<section class="hb-hero nv-next" aria-labelledby="page-title"><div class="hb-hero__sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="hb-hero__copy"><p class="hb-eyebrow">' + RI.icon('calendar') + esc(today()) + '<span>·</span>' + (linksOnly() ? 'جایگاه فقط لینک' : 'جایگاه ' + RI.fa(RI.workspaceSlot < 3 ? RI.workspaceSlot : RI.workspaceSlot - 1)) + '</p>' +
      '<h1 id="page-title" tabindex="-1">' + title + '</h1><p class="hb-sub">' + sub + '</p>' +
      '<div class="hb-hero__actions">' + next + '<button type="button" class="btn hb-ghost" data-preview="' + kind + '">' + RI.icon('eye') + 'پیش‌نمایش</button></div><ul class="hb-pills">' + pills + '</ul></div>' +
      '<div class="hb-orbit" role="img" aria-label="' + RI.fa(comp.pct) + ' درصد تکمیل"><svg viewBox="0 0 128 128" aria-hidden="true"><defs><linearGradient id="hbGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d27a"/><stop offset=".55" stop-color="#e2a03a"/><stop offset="1" stop-color="#c7883a"/></linearGradient></defs><circle class="hb-orbit__track" cx="64" cy="64" r="' + r + '"/><circle class="hb-orbit__val" cx="64" cy="64" r="' + r + '" style="--len:' + len.toFixed(1) + ';--off:' + (len * (1 - comp.pct / 100)).toFixed(1) + '"/></svg>' +
      '<span class="hb-orbit__moon" style="--a:' + (comp.pct * 3.6) + 'deg" aria-hidden="true"></span><div class="hb-orbit__label"><b data-hb-count="' + comp.pct + '">' + RI.fa(comp.pct) + '٪</b><small>تکمیل</small></div></div>' +
      '<a class="hb-cat" href="' + RI.routeUrl('fandogh') + '" data-go="fandogh" aria-label="گفت‌وگو با فندق"><span class="hb-cat__bubble">' + (comp.next ? 'کمک می‌خواهی؟' : 'آفرین! بپرس') + '</span><img src="/brand/fandogh/full.webp" alt="" width="518" height="900" decoding="async"></a></section>';
  }

  /* ---------- The path to a complete page, drawn like the landing's inked journey ---------- */
  function journey(comp) {
    const done = comp.items.filter(i => i.done).length;
    const row = (i, n) => '<li style="--i:' + n + '">' + stepLink(i, 'nv-step hb-step' + (i.done ? ' is-done' : '') + (comp.next && comp.next.id === i.id ? ' is-next' : ''), '<span class="hb-step__dot">' + (i.done ? RI.icon('check') : RI.fa(n + 1)) + '</span><span class="nv-step__label">' + esc(i.label) + '</span><span class="nv-step__w">' + (linksOnly() ? (i.done ? 'انجام شد' : '') : (i.done ? '' : '+' + RI.fa(i.w) + '٪')) + '</span>') + '</li>';
    return '<section class="hb-card hb-journey" data-mtab="today" aria-labelledby="home-path" style="--n:0"><header class="hb-card__head"><div><h2 id="home-path">' + RI.icon('flag') + 'مسیر تا صفحهٔ کامل</h2><p>' + RI.fa(done) + ' از ' + RI.fa(comp.items.length) + ' قدم انجام شده</p></div><span class="hb-meter" style="--p:' + (comp.items.length ? done / comp.items.length * 100 : 0) + '%"><i></i></span></header>' +
      '<ol class="hb-path" data-steps>' + comp.items.map(row).join('') + '</ol></section>';
  }

  /* ---------- Your pages: a tiny preview, the address and what to do next ---------- */
  function pageTile(k, n) {
    const c = RI.C(), u = RI.urls(), isR = k === 'resume', url = isR ? u.resume : u.links, [tone, label, icon] = pageState(k);
    const s = RI.state.pub[k], live = s.status === 'published', dirty = RI.pubDirty(k), slugOk = RI.slugCheck(c.slug).state === 'ok';
    const name = (isR ? c.profile.name : (c.links.header.sync ? c.profile.name : c.links.header.name)) || 'نام تو';
    const avatar = RI.avatarOf ? RI.avatarOf(c.profile) : '';
    return '<article class="hb-page is-' + tone + '" style="--i:' + n + '"><div class="hb-page__frame" aria-hidden="true"><span class="hb-page__bar"><i></i><i></i><i></i><em>' + esc(slugOk ? url.replace(/^https:\/\//, '') : 'آدرس هنوز انتخاب نشده') + '</em></span><span class="hb-page__mock is-' + k + '">' + (avatar ? '<img src="' + esc(avatar) + '" alt="" width="44" height="44" loading="lazy">' : '<b></b>') + '<strong>' + esc(name) + '</strong>' + (isR ? '<span></span><span></span><span class="short"></span>' : '<span class="btnish"></span><span class="btnish"></span><span class="btnish"></span>') + '</span></div>' +
      '<div class="hb-page__body"><div class="hb-page__title"><span class="hb-page__ico">' + RI.icon(isR ? 'resume' : 'link') + '</span><b>' + pageName(k) + '</b><span class="hb-chip is-' + tone + '">' + RI.icon(icon) + label + '</span></div>' +
      (slugOk ? '<div class="hb-url"><bdi dir="ltr">' + esc(url) + '</bdi><button type="button" class="hb-icon" data-copy="' + esc(url) + '" aria-label="کپی آدرس">' + RI.icon('copy') + '</button>' + (live ? '<button type="button" class="hb-icon" data-open-url="' + esc(url) + '" aria-label="باز کردن صفحه">' + RI.icon('external') + '</button>' : '') + '</div>' : '<a class="hb-url is-empty" href="' + RI.routeUrl('publish', { anchor: 'slug' }) + '" data-go="publish" data-anchor="slug">' + RI.icon('globe') + 'یک آدرس برای صفحه‌ات انتخاب کن</a>') +
      '<div class="hb-page__actions"><a class="btn btn--soft btn--sm" href="' + RI.routeUrl(isR ? 'resume' : 'links') + '" data-go="' + (isR ? 'resume' : 'links') + '">' + RI.icon('edit') + 'ویرایش</a><button type="button" class="btn btn--sm ' + (live && !dirty ? 'btn--ghost' : 'btn--primary') + '" data-publish="' + k + '">' + RI.icon('rocket') + (live ? (dirty ? 'به‌روزرسانی' : 'مدیریت انتشار') : 'انتشار') + '</button></div></div></article>';
  }

  /* ---------- Seven days of views and clicks ---------- */
  function stats() {
    if (RI.statsLoading || (!RI.statsError && RI.statsRows === null)) return '<p class="sr-only" role="status">در حال دریافت آمار بازدیدها…</p><div class="hb-kpis" aria-hidden="true">' + '<div class="hb-kpi"><span class="nv-skeleton"></span></div>'.repeat(3) + '</div>';
    if (RI.statsRows === null) return '<div class="hb-note">' + RI.icon('alert') + '<span>آمار دریافت نشد. <button type="button" class="nv-link" data-retry-stats>تلاش دوباره</button></span></div>';
    const ser = RI.metricSeries(7), sum = a => a.reduce((x, y) => x + y, 0), views = linksOnly() ? ser.linkViews : ser.views;
    const kpi = (label, value, icon, i) => '<div class="hb-kpi" style="--i:' + i + '"><span class="hb-kpi__ico">' + RI.icon(icon) + '</span><small>' + label + '</small><b data-hb-count="' + value + '">' + RI.fa(value) + '</b></div>';
    return '<div class="hb-kpis">' + (linksOnly() ? '' : kpi('بازدید رزومه', sum(ser.views), 'eye', 0)) + kpi('بازدید لینک‌ها', sum(ser.linkViews), 'link', 1) + kpi('کلیک لینک‌ها', sum(ser.clicks), 'zap', 2) + '</div>' +
      '<div class="hb-chart">' + RI.charts.placeholder({ title: 'بازدید هفت روز اخیر', labelTitle: 'روز', height: 160, table: false, labels: views.map((v, i) => i === views.length - 1 ? 'امروز' : RI.fa(views.length - i - 1) + ' روز پیش'), series: [{ name: linksOnly() ? 'بازدید لینک‌ها' : 'بازدید رزومه', values: views, color: '#3d8c9c' }, { name: 'کلیک لینک‌ها', values: ser.clicks, color: '#e2a03a' }] }) + '</div>';
  }

  /* ---------- Ask Fandogh, right from home ---------- */
  function fandogh() {
    const F = RI.Fandogh, w = F && F.status && F.status.wallet;
    const tips = ['معرفی‌ام را حرفه‌ای‌تر کن', 'غلط‌های رزومه‌ام را بگیر', 'چه مهارت‌هایی کم دارم؟'];
    return '<section class="hb-card hb-fandogh" data-mtab="today" aria-labelledby="home-fandogh" style="--n:2"><span class="hb-fandogh__glow" aria-hidden="true"></span><header class="hb-card__head"><div><h2 id="home-fandogh"><img src="/brand/fandogh/avatar.webp" alt="" width="28" height="28">از فندق بپرس</h2><p>دستیار رزومه‌ات؛ می‌تواند خودش هم رزومه را ویرایش کند.</p></div><a class="hb-wallet" href="' + RI.routeUrl('assistant', { tab: 'wallet' }) + '" data-go="assistant" data-home-fandogh-wallet>' + RI.icon('card') + (w ? (F.money ? F.money(w.toman) : RI.fa(w.toman) + ' تومان') : 'کیف پول فندق') + '</a></header>' +
      '<form class="hb-ask" data-home-ask><label class="sr-only" for="hb-ask">سؤالت از فندق</label><input id="hb-ask" maxlength="400" autocomplete="off" placeholder="مثلاً: معرفی‌ام را کوتاه‌تر کن"><button type="submit" class="hb-ask__go" aria-label="پرسیدن از فندق">' + RI.icon('chevL') + '</button></form>' +
      '<div class="hb-tips">' + tips.map((t, i) => '<button type="button" data-home-tip="' + esc(t) + '" style="--i:' + i + '">' + esc(t) + '</button>').join('') + '</div></section>';
  }

  /* ---------- Account, wallet and shortcuts ---------- */
  function account(wallet) {
    const plan = RI.hasSub() && RI.PLANS[RI.state.billing.plan.id], days = plan ? Math.max(0, Math.ceil((RI.state.billing.plan.end - Date.now()) / 86400000)) : 0;
    return '<a class="hb-acc" href="' + RI.routeUrl('billing') + '" data-go="billing"><span class="hb-acc__ico is-gold">' + RI.icon('crown') + '</span><span><b>' + (plan ? 'اشتراک ' + esc(plan.name) : 'حساب رایگان') + '</b><small>' + (plan ? RI.fa(days) + ' روز باقی مانده' : 'برای قالب‌های ویژه و حذف نشان، اشتراک بگیر') + '</small></span>' + RI.icon('chevL') + '</a>' +
      '<a class="hb-acc" href="' + RI.routeUrl('wallet') + '" data-go="wallet"><span class="hb-acc__ico">' + RI.icon('card') + '</span><span><b>کیف پول</b><small data-home-wallet>' + (wallet ? RI.fa(wallet.balance) + ' It موجودی' : 'در حال دریافت موجودی…') + '</small></span>' + RI.icon('chevL') + '</a>';
  }
  const SHORTCUTS = [['resume', 'رزومه', 'resume'], ['links', 'لینک‌ها', 'link'], ['themes', 'قالب و رنگ', 'palette'], ['publish', 'آدرس و انتشار', 'globe'], ['messages', 'پیام‌ها', 'mail'], ['stats', 'آمار', 'chart'], ['support', 'پشتیبانی', 'help'], ['fandogh', 'فندق', 'sparkle']];

  RI.registerPage('home', {
    title: 'خانه',
    render() {
      const comp = RI.completion();
      return '<div class="hb nv-home">' + hero(comp) +
        '<div class="hb-grid" data-home-grid>' + journey(comp) +
        '<section class="hb-card hb-pages" data-mtab="pages" aria-labelledby="home-pages" style="--n:1"><header class="hb-card__head"><div><h2 id="home-pages">' + RI.icon('globe') + 'صفحه‌های تو</h2><p>وضعیت انتشار و آدرس هر صفحه</p></div></header><div class="hb-pages__list">' + RI.pageKinds().map(pageTile).join('') + '</div></section>' +
        fandogh() +
        '<section class="hb-card hb-stats" data-mtab="stats" aria-labelledby="home-stats" style="--n:3"><header class="hb-card__head"><div><h2 id="home-stats">' + RI.icon('chart') + 'هفت روز اخیر</h2><p>بازدید و کلیک ثبت‌شده روی صفحه‌هایت</p></div><a class="nv-link hb-more" href="' + RI.routeUrl('stats') + '" data-go="stats">همهٔ آمار' + RI.icon('chevL') + '</a></header><div id="homeStats">' + stats() + '</div></section>' +
        '<section class="hb-card hb-account" data-mtab="pages" aria-labelledby="home-account" style="--n:4"><header class="hb-card__head"><div><h2 id="home-account">' + RI.icon('user') + 'حساب</h2></div></header><div data-home-account>' + account(null) + '</div></section>' +
        '<nav class="hb-card hb-shortcuts" data-mtab="pages" aria-label="میانبرها" style="--n:5">' + SHORTCUTS.filter(s => !linksOnly() || s[0] !== 'resume').map(([id, label, glyph], i) => '<a href="' + RI.routeUrl(id) + '" data-go="' + id + '" style="--i:' + i + '"><span>' + RI.icon(glyph) + '</span>' + label + '</a>').join('') + '</nav>' +
        '</div></div>';
    },
    mount(root) {
      let alive = true;
      const grid = root.querySelector('[data-home-grid]'); grid.before(RI.mobileTabs(grid, [['today', 'امروز', 'zap'], ['pages', 'صفحه‌ها و حساب', 'globe'], ['stats', 'آمار', 'chart']], 'home'));
      // Numbers count up once they are on screen; reduced motion shows them as they are.
      const count = scope => { if (calm()) return; scope.querySelectorAll('[data-hb-count]').forEach((el, i) => { const end = Number(el.dataset.hbCount), pct = el.textContent.includes('٪'); if (!end) return; const start = performance.now() + i * 80; const step = now => { if (!el.isConnected) return; const k = Math.min(1, Math.max(0, (now - start) / 1000)), e = 1 - Math.pow(1 - k, 3); el.textContent = RI.fa(Math.round(end * e)) + (pct ? '٪' : ''); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); };
      count(root);
      // The hero follows the pointer a little on desktops.
      const hero = root.querySelector('.hb-hero');
      if (!calm() && matchMedia('(hover: hover) and (pointer: fine)').matches) { let raf = 0; hero.addEventListener('pointermove', e => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = hero.getBoundingClientRect(); hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); }); }); }
      RI.delegate(root, 'click', '[data-preview]', async (e, b) => { try { if (b.dataset.preview === 'resume') await RI.loadTemplates([RI.C().theme.resume]); RI.openPreview(b.dataset.preview); } catch (err) { RI.toast(err.message, { kind: 'error' }); } });
      RI.delegate(root, 'click', '[data-publish]', () => RI.go('publish'));
      RI.delegate(root, 'click', '[data-retry-stats]', () => RI.loadStats());
      // Asking Fandogh from home opens the full page with the question on its way.
      const ask = text => { text = String(text || '').trim(); if (!text) return; try { sessionStorage.setItem('ri-fandogh-pending', text); } catch {} RI.go('fandogh'); };
      root.querySelector('[data-home-ask]').addEventListener('submit', e => { e.preventDefault(); ask(root.querySelector('#hb-ask').value); });
      RI.delegate(root, 'click', '[data-home-tip]', (e, b) => ask(b.dataset.homeTip));
      const offStats = RI.on('stats', () => { const host = root.querySelector('#homeStats'); if (host) { host.innerHTML = stats(); count(host); } });
      const paintFandogh = () => { const w = RI.Fandogh && RI.Fandogh.status && RI.Fandogh.status.wallet, el = root.querySelector('[data-home-fandogh-wallet]'); if (w && el) el.innerHTML = RI.icon('card') + RI.Fandogh.money(w.toman); };
      document.addEventListener('ri:fandogh-status', paintFandogh);
      RI.dashboardRequest('wallet').then(w => { if (alive) root.querySelector('[data-home-account]').innerHTML = account(w); }).catch(() => { if (alive) { const m = root.querySelector('[data-home-wallet]'); if (m) m.textContent = 'موجودی دریافت نشد'; } });
      return () => { alive = false; offStats(); document.removeEventListener('ri:fandogh-status', paintFandogh); };
    },
  });
})();
