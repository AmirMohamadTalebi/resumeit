/* آمار: همیشه با داده‌های نمونهٔ ثابت و برچسب روشن */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  /* تولید ثابت و تکرارپذیر (بدون Math.random) */
  function rng(seed) { let s = seed >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  RI.sampleSeries = function (n, seed) {
    const r = rng(typeof seed === 'string' ? seed.length * 97 + n : seed), views = [], linkViews = [], clicks = [];
    for (let i = 0; i < n; i++) {
      const wave = 1 + 0.35 * Math.sin(i / 2.4) + i / (n * 2.5);
      const v = Math.round((14 + r() * 16) * wave), lv = Math.round((9 + r() * 12) * wave);
      views.push(v); linkViews.push(lv); clicks.push(Math.round(lv * (0.38 + r() * 0.25)));
    }
    return { views: views, linkViews: linkViews, clicks: clicks };
  };

  function chart(ser, n) {
    const W = 640, H = 220, pad = { l: 36, r: 10, t: 12, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const max = Math.ceil(Math.max.apply(null, ser.views.concat(ser.linkViews)) / 10) * 10;
    const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * iw), y = (v) => pad.t + ih - (v / max) * ih;
    const path = (a) => a.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const v = Math.round(max * f), yy = y(v); return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--ice-200)"/><text x="' + (pad.l - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="ct">' + RI.fa(v) + '</text>'; }).join('');
    const step = Math.max(1, Math.round(n / 6));
    const xl = ser.views.map((_, i) => (i % step === 0 || i === n - 1) ? '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" class="ct">' + RI.fa(n - i === 1 ? 'امروز' : (n - i - 1)) + (n - i === 1 ? '' : ' روز پیش') + '</text>' : '').join('').replace(/۰ روز پیش/g, 'امروز');
    const area = path(ser.views) + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + 'Z';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="نمودار نمونهٔ بازدید رزومه و صفحهٔ لینک"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52788d" stop-opacity=".28"/><stop offset="1" stop-color="#52788d" stop-opacity="0"/></linearGradient></defs>' + grid + xl +
      '<path d="' + area + '" fill="url(#ga)"/><path class="draw" d="' + path(ser.views) + '" fill="none" stroke="#52788d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="draw" d="' + path(ser.linkViews) + '" fill="none" stroke="#a47248" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 0"/>' +
      '<g class="hover" aria-hidden="true">' + ser.views.map((v, i) => '<rect x="' + (x(i) - iw / n / 2) + '" y="' + pad.t + '" width="' + iw / n + '" height="' + ih + '" fill="transparent" data-i="' + i + '"/>').join('') + '</g><line class="cursor" y1="' + pad.t + '" y2="' + (pad.t + ih) + '" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/></svg>';
  }

  RI.registerPage('stats', {
    title: 'آمار',
    loadMs: 420,
    skeleton: () => '<div class="skeleton" style="height:56px;width:40%;margin-bottom:24px"></div><div class="statgrid"><div class="skeleton" style="height:110px"></div><div class="skeleton" style="height:110px"></div><div class="skeleton" style="height:110px"></div></div><div class="skeleton" style="height:300px;margin-top:20px"></div>',
    render() {
      const ui = RI.state.ui;
      const head = RI.pageHead({ eyebrow: 'انتشار', eyebrowIcon: 'chart', title: 'آمار بازدید و کلیک', desc: 'همهٔ اعداد این صفحه <b>داده‌های نمونه</b> هستند تا شکل نهایی را ببینی؛ آمار واقعی پس از انتشار و اتصال به سرور می‌آید' });
      if (ui.sim.netError) return head + '<div class="panel">' + RI.empty({ icon: 'wifi', title: 'آمار بارگذاری نشد', text: 'اتصال برقرار نشد', action: '<button type="button" class="btn btn--primary" data-retry>' + RI.icon('refresh') + 'تلاش دوباره</button>' }) + '</div>';
      if (ui.sim.nodata || (RI.state.pub.resume.status !== 'published' && RI.state.pub.links.status !== 'published' && ui.sim.nodata)) return head + '<div class="panel">' + RI.empty({ icon: 'chart', title: 'هنوز داده‌ای نیست', text: 'وقتی صفحه‌ات منتشر شود و اولین بازدیدکننده بیاید، نمودارها این‌جا جان می‌گیرند', action: '<a class="btn btn--primary" href="#/publish" data-go="publish">' + RI.icon('rocket') + 'رفتن به انتشار</a>' }) + '</div>';
      return head + '<div class="banner banner--brown" style="margin-bottom:20px">' + RI.icon('flask') + '<div class="banner__body"><b>نمایش نمونه</b>این آمار ساختگی است و به صفحهٔ شما ربطی ندارد</div></div>' +
        '<div class="statbar"><div class="segmented" role="group" aria-label="بازهٔ زمانی" id="range">' + [[7, '۷ روز'], [30, '۳۰ روز'], [90, '۹۰ روز']].map((r, i) => '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (i === 0) + '">' + r[1] + '</button>').join('') + '</div></div><div id="sbody"></div>';
    },
    mount(root) {
      RI.delegate(root, 'click', '[data-retry]', () => { RI.state.ui.sim.netError = false; RI.rerender(); });
      const sb = RI.$('#sbody', root); if (!sb) return;
      let n = 7;
      function paint() {
        const ser = RI.sampleSeries(n, n), sum = (a) => a.reduce((x, y) => x + y, 0);
        const half = Math.floor(n / 2), prev = RI.sampleSeries(n, n + 1000);
        const delta = (a, b) => { const d = Math.round((sum(a) / Math.max(1, sum(b)) - 1) * 100); return '<span class="delta ' + (d >= 0 ? 'up' : 'down') + '">' + RI.icon(d >= 0 ? 'trend' : 'down') + RI.fa(Math.abs(d)) + '٪ ' + (d >= 0 ? 'بیشتر' : 'کمتر') + ' از بازهٔ قبل</span>'; };
        const links = RI.C().links.items.filter((i) => i.type === 'link'); const tot = Math.max(1, links.reduce((a, l) => a + (l.clicks || 0), 0));
        const top = links.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        const scale = n === 7 ? 0.2 : n === 30 ? 0.6 : 1;
        sb.innerHTML = '<div class="statgrid">' + [['بازدید رزومه', sum(ser.views), ser.views, prev.views, 'resume'], ['بازدید صفحهٔ لینک', sum(ser.linkViews), ser.linkViews, prev.linkViews, 'link'], ['کلیک روی لینک‌ها', sum(ser.clicks), ser.clicks, prev.clicks, 'cursor']].map((s) => '<div class="stat"><span class="stat__ico">' + RI.icon(s[4]) + '</span><small>' + s[0] + '</small><b class="num">' + RI.fa(s[1]) + '</b>' + delta(s[2], s[3]) + '</div>').join('') + '</div>' +
          '<section class="panel"><div class="panel__head panel__head--row"><div><h2>روند بازدید</h2><p>' + RI.fa(n) + ' روز اخیر (نمونه)</p></div><ul class="legend"><li><i style="background:#52788d"></i>رزومه</li><li><i style="background:#a47248"></i>صفحهٔ لینک</li></ul></div><div class="chartwrap">' + chart(ser, n) + '<div class="tip" hidden></div></div>' +
          '<details class="allsteps"><summary>' + RI.icon('file') + 'نمایش جدول داده‌ها' + RI.icon('chevD') + '</summary><div class="table-wrap"><table class="table"><thead><tr><th>روز</th><th>رزومه</th><th>لینک‌ها</th><th>کلیک</th></tr></thead><tbody>' + ser.views.map((v, i) => '<tr><td>' + RI.fa(n - i - 1) + ' روز پیش</td><td>' + RI.fa(v) + '</td><td>' + RI.fa(ser.linkViews[i]) + '</td><td>' + RI.fa(ser.clicks[i]) + '</td></tr>').join('') + '</tbody></table></div></details></section>' +
          '<section class="panel"><div class="panel__head"><h2>لینک‌های پربازدید</h2><p>تعداد کلیک نمونه، متناسب با بازه</p></div>' + (top.length ? '<ol class="toplinks">' + top.map((l, i) => { const c = Math.round((l.clicks || 0) * scale); return '<li><span class="toplinks__n">' + RI.fa(i + 1) + '</span><div class="toplinks__main"><div class="toplinks__t"><b>' + esc(l.title) + '</b><span class="num">' + RI.fa(c) + ' کلیک</span></div><div class="bar bar--ice"><i data-w="' + Math.round((l.clicks || 0) / tot * 100 / (top[0].clicks / tot || 1)) + '" style="width:0"></i></div>' + (l.active ? '' : '<small>غیرفعال</small>') + '</div></li>'; }).join('') + '</ol>' : RI.empty({ icon: 'link', title: 'لینکی برای نمایش نیست', text: 'اول در بخش لینک‌ها چند لینک اضافه کن' })) + '</section>';
        RI.animateBars(sb);
        const svg = RI.$('.chart', sb), tip = RI.$('.tip', sb), cur = RI.$('.cursor', sb);
        if (svg) svg.addEventListener('pointermove', (e) => {
          const r = e.target.closest('[data-i]'); if (!r) return; const i = +r.dataset.i, bb = svg.getBoundingClientRect();
          const xx = +r.getAttribute('x') + +r.getAttribute('width') / 2; cur.setAttribute('x1', xx); cur.setAttribute('x2', xx); cur.setAttribute('opacity', 1);
          tip.hidden = false; tip.innerHTML = '<b>' + RI.fa(n - i - 1) + ' روز پیش</b>رزومه: ' + RI.fa(ser.views[i]) + '<br>لینک‌ها: ' + RI.fa(ser.linkViews[i]) + ' · کلیک: ' + RI.fa(ser.clicks[i]);
          tip.style.insetInlineStart = Math.min(bb.width - 150, Math.max(0, (xx / 640) * bb.width - 60)) + 'px';
        });
        if (svg) svg.addEventListener('pointerleave', () => { tip.hidden = true; cur.setAttribute('opacity', 0); });
      }
      RI.delegate(root, 'click', '[data-r]', (e, b) => { n = +b.dataset.r; RI.$$('[data-r]', root).forEach((x) => x.setAttribute('aria-pressed', x === b)); paint(); });
      paint();
    },
  });
})();
