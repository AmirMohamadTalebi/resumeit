// Shared charts: column, line, area and pie drawn as SVG from the same data. The chosen kind is one setting
// for the whole site; changing it on any chart redraws every chart on the page. Each chart keeps a data table
// for screen readers. Works in the dashboard and the admin panel (it needs no other module).
(() => {
  'use strict';
  const KEY = 'ri-chart-kind';
  const KINDS = [['bar', 'ستونی'], ['line', 'خطی'], ['area', 'ناحیه‌ای'], ['pie', 'دایره‌ای']];
  const ICON = {
    bar: '<path d="M5 20V10m5 10V4m5 16v-7m5 7V8"/>', line: '<path d="m3 17 6-6 4 4 8-8"/><path d="M3 21h18"/>',
    area: '<path d="M3 20V14l5-5 4 4 9-8v15z"/>', pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  };
  const PALETTE = ['#52788d', '#a47248', '#5e8b7e', '#c9a27c', '#7a6e9c', '#b05470', '#3d5c6f'];
  const fa = n => Number(n || 0).toLocaleString('fa-IR');
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hosts = new Set();
  let seq = 0;
  const kind = () => { try { const k = localStorage.getItem(KEY); return KINDS.some(([id]) => id === k) ? k : 'area'; } catch { return 'area'; } };
  const svgIcon = k => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';

  function switcher() {
    const current = kind();
    return '<div class="chart-kinds" role="group" aria-label="نوع نمودار">' + KINDS.map(([id, label]) => '<button type="button" data-chart-kind="' + id + '" aria-pressed="' + (id === current) + '" title="نمودار ' + label + '">' + svgIcon(id) + '<span>' + label + '</span></button>').join('') + '</div>';
  }
  function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function axisLabels(labels, x, H) {
    const n = labels.length, step = Math.max(1, Math.ceil(n / 6));
    return labels.map((l, i) => (i % step === 0 || i === n - 1) ? '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="ch-t">' + esc(l) + '</text>' : '').join('');
  }
  function cartesian(spec, k, id) {
    const W = 640, H = spec.height || 220, pad = { l: 40, r: 12, t: 12, b: 26 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = spec.labels.length, max = niceMax(Math.max(1, ...spec.series.flatMap(s => s.values)));
    const y = v => pad.t + ih - (v / max) * ih;
    const grid = [0, .2, .4, .6, .8, 1].map(f => { const v = max * f, yy = y(v); return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" class="ch-grid"/><text x="' + (pad.l - 6) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end" class="ch-t">' + fa(Math.round(v)) + '</text>'; }).join('');
    let body = '', x;
    if (k === 'bar') {
      const band = iw / Math.max(1, n), groups = spec.series.length, bw = Math.max(2, Math.min(26, band * .7 / groups));
      x = i => pad.l + band * i + band / 2;
      body = spec.series.map((s, si) => s.values.map((v, i) => { const bx = x(i) - (groups * bw) / 2 + si * bw, by = y(v); return '<rect class="ch-bar" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (bw - 1).toFixed(1) + '" height="' + Math.max(0, pad.t + ih - by).toFixed(1) + '" rx="' + Math.min(4, bw / 3).toFixed(1) + '" fill="' + s.color + '"><title>' + esc(s.name + ' · ' + spec.labels[i] + ': ' + fa(v)) + '</title></rect>'; }).join('')).join('');
    } else {
      x = i => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
      const path = vals => vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
      body = spec.series.map((s, si) => {
        const line = path(s.values), gid = id + '-g' + si;
        const fill = k === 'area' ? '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".32"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient></defs><path d="' + line + ' L' + x(n - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0).toFixed(1) + ' ' + y(0) + 'Z" fill="url(#' + gid + ')"/>' : '';
        const dots = n <= 31 ? s.values.map((v, i) => '<circle class="ch-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (k === 'line' ? 3.2 : 2.4) + '" fill="#fff" stroke="' + s.color + '"><title>' + esc(s.name + ' · ' + spec.labels[i] + ': ' + fa(v)) + '</title></circle>').join('') : '';
        return fill + '<path d="' + line + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' + dots;
      }).join('');
    }
    return '<svg class="ch-svg" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(spec.title || 'نمودار') + '">' + grid + axisLabels(spec.labels, x, H) + body + '</svg>';
  }
  // Pie: several series → their totals; one series → its items (largest six, the rest grouped).
  function pie(spec) {
    let slices = spec.series.length > 1 ? spec.series.map((s, i) => ({ name: s.name, value: s.values.reduce((a, b) => a + b, 0), color: s.color || PALETTE[i] }))
      : spec.labels.map((l, i) => ({ name: l, value: spec.series[0].values[i] })).sort((a, b) => b.value - a.value);
    if (slices.length > 7) { const rest = slices.slice(6).reduce((a, s) => a + s.value, 0); slices = slices.slice(0, 6).concat(rest ? [{ name: 'سایر', value: rest }] : []); }
    slices.forEach((s, i) => { s.color ||= PALETTE[i % PALETTE.length]; });
    const total = slices.reduce((a, s) => a + s.value, 0), R = 80, r = 50, cx = 100, cy = 100;
    let arcs = '';
    if (!total) arcs = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + r) / 2 + '" fill="none" stroke="#dbe7ed" stroke-width="' + (R - r) + '"/>';
    else { let a0 = -Math.PI / 2; for (const s of slices) { if (!s.value) continue; const frac = s.value / total; if (frac >= .9999) { arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + r) / 2 + '" fill="none" stroke="' + s.color + '" stroke-width="' + (R - r) + '"><title>' + esc(s.name + ': ' + fa(s.value)) + '</title></circle>'; break; } const a1 = a0 + frac * Math.PI * 2, large = frac > .5 ? 1 : 0, p = (rad, a) => (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
      arcs += '<path class="ch-slice" d="M' + p(R, a0) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(R, a1) + ' L' + p(r, a1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p(r, a0) + 'Z" fill="' + s.color + '"><title>' + esc(s.name + ': ' + fa(s.value)) + '</title></path>'; a0 = a1; } }
    return '<div class="ch-pie"><svg class="ch-svg ch-svg--pie" viewBox="0 0 200 200" role="img" aria-label="' + esc(spec.title || 'نمودار دایره‌ای') + '">' + arcs + '<text x="100" y="96" text-anchor="middle" class="ch-total">' + fa(total) + '</text><text x="100" y="118" text-anchor="middle" class="ch-t">' + esc(spec.totalLabel || 'مجموع') + '</text></svg><ul class="ch-legend">' + slices.map(s => '<li><i style="background:' + s.color + '"></i><span>' + esc(s.name) + '</span><b>' + fa(s.value) + (total ? ' <small>(' + fa(Math.round(s.value / total * 100)) + '٪)</small>' : '') + '</b></li>').join('') + '</ul></div>';
  }
  function table(spec) {
    return '<details class="ch-table"><summary>جدول داده‌ها</summary><div class="ch-table__wrap"><table><thead><tr><th>' + esc(spec.labelTitle || 'بازه') + '</th>' + spec.series.map(s => '<th>' + esc(s.name) + '</th>').join('') + '</tr></thead><tbody>' + spec.labels.map((l, i) => '<tr><td>' + esc(l) + '</td>' + spec.series.map(s => '<td>' + fa(s.values[i]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></details>';
  }
  function render(host) {
    const spec = host.__chart; if (!spec) return;
    spec.series.forEach((s, i) => { s.color ||= PALETTE[i % PALETTE.length]; });
    const k = spec.kinds?.includes(kind()) ? kind() : (spec.kinds?.[0] || kind());
    const legend = spec.series.length > 1 && k !== 'pie' ? '<ul class="ch-legend ch-legend--row">' + spec.series.map(s => '<li><i style="background:' + s.color + '"></i>' + esc(s.name) + '</li>').join('') + '</ul>' : '';
    host.innerHTML = (spec.switcher === false ? '' : '<div class="ch-head">' + (spec.heading ? '<h3>' + esc(spec.heading) + '</h3>' : '') + switcher() + '</div>') + legend + '<div class="ch-body ch-body--' + k + '">' + (k === 'pie' ? pie(spec) : cartesian(spec, k, 'ch' + host.__chartId)) + '</div>' + (spec.table === false ? '' : table(spec));
  }
  // spec: { labels:[], series:[{name, values:[], color?}], title, heading?, height?, totalLabel?, labelTitle?, switcher?, table? }
  function mount(host, spec) {
    if (!host) return;
    host.__chart = spec; host.__chartId ||= ++seq; host.classList.add('ch'); hosts.add(host); render(host);
  }
  function setKind(k) {
    try { localStorage.setItem(KEY, k); } catch {}
    for (const host of [...hosts]) { if (!host.isConnected) { hosts.delete(host); continue; } render(host); }
    document.dispatchEvent(new CustomEvent('ri:chart-kind', { detail: k }));
  }
  document.addEventListener('click', e => { const b = e.target.closest?.('[data-chart-kind]'); if (b) setKind(b.dataset.chartKind); });
  // Declarative use for pages that build HTML as strings: <div data-chart-spec="{json}"> becomes a chart when it
  // enters the document.
  const placeholder = spec => '<div class="ch" data-chart-spec="' + esc(JSON.stringify(spec)) + '"></div>';
  function scan(root) {
    (root.matches?.('[data-chart-spec]') ? [root] : []).concat([...(root.querySelectorAll?.('[data-chart-spec]') || [])]).forEach(el => {
      if (el.__chart) return; try { mount(el, JSON.parse(el.dataset.chartSpec)); } catch { el.textContent = 'نمودار نمایش داده نشد.'; }
    });
  }
  const start = () => { scan(document); new MutationObserver(list => { for (const m of list) for (const node of m.addedNodes) if (node.nodeType === 1) scan(node); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  const api = { mount, kind, setKind, switcher, placeholder, KINDS, PALETTE };
  window.RICharts = api;
  if (window.RI) window.RI.charts = api;
})();
