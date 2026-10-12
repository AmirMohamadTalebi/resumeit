/* پوستهٔ برنامه: ناوبری، مسیریاب هش، نوار بالا، وضعیت ذخیره، اتصال به ورود و خروج */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  const NAV = [
    { group: 'ساخت', items: [['home', 'خانهٔ داشبورد', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'صفحهٔ لینک‌ها', 'link'], ['themes', 'ظاهر و قالب', 'palette']] },
    { group: 'انتشار', items: [['publish', 'آدرس و انتشار', 'globe'], ['stats', 'آمار', 'chart']] },
    { group: 'حساب', items: [['billing', 'اشتراک و خریدها', 'card'], ['settings', 'تنظیمات حساب', 'settings']] },
  ];
  const BOTTOM = [['home', 'خانه', 'home'], ['resume', 'رزومه', 'resume'], ['links', 'لینک‌ها', 'link'], ['themes', 'ظاهر', 'palette'], ['publish', 'انتشار', 'globe']];
  const LOGO = '<svg class="brand__mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfd3dd"/><stop offset="1" stop-color="#52788d"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d2ae89"/><stop offset="1" stop-color="#875a36"/></linearGradient></defs><rect x="5" y="4" width="26" height="34" rx="9" fill="url(#lg1)"/><rect x="5.5" y="4.5" width="25" height="33" rx="8.5" fill="none" stroke="#fff" stroke-opacity=".7"/><path d="M12 14h12M12 20h12M12 26h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><rect x="22" y="18" width="21" height="26" rx="8" fill="url(#lg2)" opacity=".95"/><path d="M29 31a4 4 0 0 0 5.600 0l2-2a4 4 0 0 0-5.600-5.600M34 30a4 4 0 0 0-5.600 0" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" transform="translate(-.5 1)"/></svg>';

  let current = null, cleanup = null, navToken = 0;

  /* ---------- ساخت پوسته ---------- */
  function buildShell() {
    const acc = RI.state.account;
    RI.$('#sidebar').innerHTML =
      '<div class="sidebar__glass"><div class="brand">' + LOGO + '<div><div class="brand__name">Resume<b>It</b></div><div class="brand__sub">استودیوی هویت شخصی</div></div></div>' +
      '<nav class="nav" aria-label="بخش‌های داشبورد">' + NAV.map((g) => '<div class="nav__group"><div class="nav__label">' + g.group + '</div>' + g.items.map((i) => '<a class="nav__item" href="#/' + i[0] + '" data-route="' + i[0] + '">' + RI.icon(i[2]) + '<span>' + i[1] + '</span></a>').join('') + '</div>').join('') + '</nav>' +
      '<div class="sidebar__foot">' +
      '<button type="button" class="account-btn" id="accountBtn" aria-haspopup="menu"><img class="avatar" id="accAvatar" alt="" src=""><span><span class="account-btn__name" id="accName"></span><br><span class="account-btn__sub">حساب نمونه</span></span></button></div></div>';
    RI.$('#bottomNav').innerHTML = BOTTOM.map((i) => '<a href="#/' + i[0] + '" data-route="' + i[0] + '">' + RI.icon(i[2]) + '<span>' + i[1] + '</span></a>').join('');
    paintAccount();
  }
  function paintAccount() {
    RI.$('#accName').textContent = RI.state.account.name;
    RI.$('#accAvatar').src = RI.avatarOf(RI.C().profile);
  }

  /* ---------- نوار بالا و وضعیت ذخیره ---------- */
  function paintSave() {
    const ui = RI.state.ui, el = RI.$('#saveState'), btn = RI.$('#saveBtn');
    let st = 'saved', txt = 'در حافظهٔ این صفحه؛ با رفرش پاک می‌شود', ic = 'check';
    if (ui.saving) { st = 'saving'; txt = 'در حال ذخیره…'; ic = 'refresh'; }
    else if (ui.saveError) { st = 'error'; txt = 'ذخیره نشد'; ic = 'alert'; }
    else if (ui.dirty) { st = 'dirty'; txt = 'تغییرات ذخیره‌نشده'; ic = 'edit'; }
    el.dataset.state = st;
    el.innerHTML = RI.icon(ic, st === 'saving' ? 'spin' : '') + '<span class="save-state__txt">' + txt + '</span>';
    btn.disabled = ui.saving || (!ui.dirty && !ui.saveError);
    btn.innerHTML = ui.saveError ? RI.icon('refresh') + '<span class="hide-sm">تلاش دوباره</span>' : RI.icon('save') + '<span class="hide-sm">ذخیره</span>';
    el.setAttribute('role', 'status');
  }
  RI.doSave = async function () {
    const ok = await RI.save();
    if (ok) RI.toast('تغییرات در حافظهٔ این صفحه نگه داشته شد؛ با رفرش پاک می‌شود');
    return ok;
  };

  /* ---------- مسیریاب ---------- */
  RI.go = function (id, opts) {
    if (opts) RI.routeOpts = opts;
    const h = '#/' + id;
    if (location.hash === h) { render(id, true); } else location.hash = h;
  };
  RI.routeOpts = null;
  const routeFromHash = () => { const m = /^#\/([a-z]+)/.exec(location.hash); return m && RI.pages[m[1]] ? m[1] : 'home'; };

  async function onHash() {
    const id = routeFromHash();
    if (current && id !== current && RI.state.ui.dirty) {
      /* بازگرداندن آدرس تا کاربر تصمیم بگیرد */
      history.replaceState(null, '', '#/' + current);
      const okLeave = await RI.leaveGuard();
      if (!okLeave) return;
      history.replaceState(null, '', '#/' + id);
    }
    render(id);
  }

  async function render(id, force) {
    const page = RI.pages[id];
    const token = ++navToken;
    const previousView = RI.$('#view');
    if (cleanup) { try { cleanup(); } catch (e) { /* ok */ } cleanup = null; }
    // Each mount owns its listeners; replacing the root discards the previous mount's handlers.
    const view=previousView.cloneNode(false);previousView.replaceWith(view);
    current = id;
    RI.$$('[data-route]').forEach((a) => { if (a.dataset.route === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    RI.$('#topTitle').textContent = page.title;
    document.title = page.title + ' | ResumeIt';
    closeDrawer();
    const opts = RI.routeOpts; RI.routeOpts = null;
    const ctx = { opts: opts || {} };

    view.classList.remove('view');
    void view.offsetWidth;
    view.classList.add('view');

    if (page.loadMs) {
      const ms = RI.state.ui.sim.slow ? page.loadMs * 4 : page.loadMs;
      view.innerHTML = page.skeleton ? page.skeleton() : '<div class="skeleton" style="height:320px"></div>';
      await RI.sleep(ms);
      if (token !== navToken) return;
    }
    view.innerHTML = page.render(ctx);
    cleanup = page.mount ? page.mount(view, ctx) : null;
    RI.animateRings(view); RI.animateBars(view);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (!force) { const h = RI.$('#page-title', view); if (h) h.focus({ preventScroll: true }); }
  }
  RI.rerender = () => { if (current) render(current, true); };

  /* ---------- کشو (موبایل) ---------- */
  function openDrawer() { RI.$('#sidebar').dataset.open = 'true'; RI.$('#scrim').dataset.open = 'true'; RI.$('#menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeDrawer() { RI.$('#sidebar').dataset.open = 'false'; RI.$('#scrim').dataset.open = 'false'; const b = RI.$('#menuBtn'); if (b) b.setAttribute('aria-expanded', 'false'); }

  /* ---------- راه‌اندازی ---------- */
  async function boot() {
    const user = await window.resumeitSession;
    if (!user) return;
    RI.state.account.mobile = user.phone;
    RI.state.account.mobileVerified = false;
    RI.state.account.google = false;
    RI.state.account.github = false;
    RI.state.account.name = 'حساب شما';
    buildShell();
    paintSave();
    RI.on('save', paintSave);
    RI.on('change', paintAccount);
    RI.on('demo', paintAccount);

    RI.$('#menuBtn').addEventListener('click', openDrawer);
    RI.$('#scrim').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (RI.state.ui.dirty) RI.doSave(); }
    });
    RI.$('#saveBtn').addEventListener('click', RI.doSave);
    RI.$('#topPreview').addEventListener('click', () => RI.openPreview(current === 'links' ? 'links' : 'resume'));
    RI.$('#topPublish').addEventListener('click', () => RI.go('publish'));
    RI.$('#accountBtn').addEventListener('click', (e) => {
      RI.menu(e.currentTarget, [
        { label: 'تنظیمات حساب', icon: 'settings', onClick: () => RI.go('settings') },
        { label: 'اشتراک و خریدها', icon: 'card', onClick: () => RI.go('billing') },
        'hr',
        { label: 'خروج از حساب', icon: 'logout', danger: true, onClick: () => RI.logout() },
      ], { up: true });
    });
    RI.delegate(document, 'click', '[data-copy]', (e, b) => RI.copy(b.dataset.copy));
    RI.delegate(document, 'click', '[data-open-url]', (e, b) => RI.openPreview(/\/links$/.test(b.dataset.openUrl) ? 'links' : 'resume', { title: 'پیش‌نمایش ' + b.dataset.openUrl }));
    RI.delegate(document, 'click', '[data-go]', (e, b) => { e.preventDefault(); RI.go(b.dataset.go, b.dataset.step ? { step: b.dataset.step, tab: b.dataset.tab, anchor: b.dataset.anchor } : null); });
    window.addEventListener('beforeunload', (e) => { if (RI.state.ui.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('hashchange', onHash);
    onHash();
  }

  RI.logout = async function () {
    const ok = await RI.confirm({ title: 'خروج از حساب', text: 'از پنل نمایشی خارج می‌شوید و اطلاعات این صفحه پاک می‌شود. ادامه می‌دهید؟', confirmLabel: 'خروج', icon: 'logout' });
    if (!ok) return;
    if (RI.state.ui.dirty && !(await RI.leaveGuard())) return;
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Logout failed');
    } catch { RI.toast('خروج انجام نشد؛ دوباره امتحان کنید.'); return; }
    RI.state.ui.dirty = false;
    location.replace('/login/');
  };

  document.addEventListener('DOMContentLoaded', boot);
  RI.NAV = NAV;
})();
