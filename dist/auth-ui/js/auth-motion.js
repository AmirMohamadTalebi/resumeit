/* The same eight-card R as the homepage, completed by form state. */
(() => {
  'use strict';
  const RIA = window.RIA;
  const pieces = [
    ['person', 1, [220,10,-5], [35,20], [145,175], '<span class="mark-avatar">تو</span><b>داستان تو</b><small>یک شروع تازه</small>'],
    ['work', 2, [15,218,-6], [190,20], [255,105], '<small>کار منتخب</small><b>چیزی که می‌سازی</b><span class="mark-lines"></span>'],
    ['project', 2, [435,90,6], [400,135], [140,140], '<small>پروژه‌ها</small><span class="mark-poster">ایده ↗</span>'],
    ['skills', 1, [35,35,-4], [35,205], [145,135], '<small>توانایی‌ها</small><b>از ایده<br>تا تجربه</b>'],
    ['links', 1, [410,365,5], [35,350], [145,210], '<small>لینک‌های تو</small><b>بیشتر از تو</b><span class="mark-link">Portfolio ↗</span><span class="mark-link">Projects ↗</span><span class="mark-link">Contact ↗</span>'],
    ['address', 2, [165,500,-3], [190,285], [205,70], '<small>یک آدرس، به نام تو</small><b dir="ltr">mintra.ir</b>'],
    ['theme', 3, [38,380,-5], [225,375], [145,80], '<small>به رنگ خودت</small><span class="mark-swatches"><i></i><i></i><i></i></span>'],
    ['contact', 3, [215,365,4], [340,475], [190,85], '<small>قدم بعدی</small><b>دیده شدن</b>']
  ];
  RIA.markHtml = () => '<div class="auth-mark-home"><div class="auth-assembly" data-progress="0" aria-hidden="true">' + pieces.map(([id,group,from,to,size,content],i) =>
    '<div class="card auth-piece mark-' + id + '" data-group="' + group + '" style="--fx:' + (from[0]/600*100) + '%;--fy:' + (from[1]/585*100) + '%;--dx:' + ((to[0]-from[0])/size[0]*100) + '%;--dy:' + ((to[1]-from[1])/size[1]*100) + '%;--angle:' + from[2] + 'deg;--w:' + (size[0]/600*100) + '%;--h:' + (size[1]/585*100) + '%;--delay:' + i*28 + 'ms">' + content + '</div>'
  ).join('') + '</div></div>';
  RIA.setMark = progress => {
    const mark = document.querySelector('.auth-assembly');
    if (mark) mark.dataset.progress = String(progress);
  };
  RIA.watchMark = (root, progress) => {
    const update = () => RIA.setMark(progress());
    const form=root.querySelector('form')||root;
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    update();
  };
  function travel(mark, from, to) {
    if (RIA.reduce() || !from.width || !from.height || !to.width || !to.height) return Promise.resolve();
    const animation = mark.animate([
      { transform: 'translate(' + (from.left-to.left) + 'px,' + (from.top-to.top) + 'px) scale(' + from.width/to.width + ')' },
      { transform: 'none' }
    ], { duration:760, easing:'cubic-bezier(.16,1,.3,1)' });
    return animation.finished.catch(() => {});
  }
  RIA.centerMark = message => {
    const mark = document.querySelector('.auth-assembly'), home = mark.parentElement;
    const before = mark.getBoundingClientRect(), focus = document.activeElement;
    const root = document.querySelector('#auth-root'), oldOverflow = document.body.style.overflow;
    root.inert = true; document.body.style.overflow = 'hidden';
    const overlay = document.createElement('div');
    overlay.className = 'auth-transit'; overlay.setAttribute('role','status'); overlay.setAttribute('aria-live','polite');
    overlay.innerHTML = '<div class="auth-loading-content"><div class="auth-loading-slot"></div><strong>لودینگ</strong><span class="auth-loading-line" aria-hidden="true"></span><p>منتظر باشید</p><small>' + RIA.esc(message) + '</small></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.auth-loading-slot').appendChild(mark);
    RIA.setMark(3);
    const arrival = travel(mark,before,mark.getBoundingClientRect());
    return { async done() {
      await arrival;
      const from = mark.getBoundingClientRect();
      home.appendChild(mark);
      overlay.classList.add('is-leaving');
      await travel(mark,from,mark.getBoundingClientRect());
      overlay.remove(); root.inert=false; document.body.style.overflow=oldOverflow;
      if(focus?.isConnected)focus.focus({preventScroll:true});
    } };
  };
})();
