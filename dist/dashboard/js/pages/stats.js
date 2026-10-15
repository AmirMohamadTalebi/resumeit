/* آمار بازدید و کلیک ثبت‌شده روی سرور */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  function chart(ser, n) {
    const W = 640, H = 220, pad = { l: 36, r: 10, t: 12, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const max = Math.max(10, Math.ceil(Math.max.apply(null, ser.views.concat(ser.linkViews)) / 10) * 10);
    const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * iw), y = (v) => pad.t + ih - (v / max) * ih;
    const path = (a) => a.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const v = Math.round(max * f), yy = y(v); return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--ice-200)"/><text x="' + (pad.l - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="ct">' + RI.fa(v) + '</text>'; }).join('');
    const step = Math.max(1, Math.ceil((n - 1) / 3));
    const xl = ser.views.map((_, i) => (i % step === 0 || i === n - 1) ? '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" class="ct">' + RI.fa(n - i === 1 ? 'امروز' : (n - i - 1)) + (n - i === 1 ? '' : ' روز پیش') + '</text>' : '').join('').replace(/۰ روز پیش/g, 'امروز');
    const area = path(ser.views) + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + 'Z';
    return '<svg class="chart" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="نمودار بازدید رزومه و صفحهٔ لینک"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52788d" stop-opacity=".28"/><stop offset="1" stop-color="#52788d" stop-opacity="0"/></linearGradient></defs>' + grid + xl +
      '<path d="' + area + '" fill="url(#ga)"/><path class="draw" d="' + path(ser.views) + '" fill="none" stroke="#52788d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="draw" d="' + path(ser.linkViews) + '" fill="none" stroke="#a47248" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 0"/>' +
      '<g class="hover" aria-hidden="true">' + ser.views.map((v, i) => '<rect x="' + (x(i) - iw / n / 2) + '" y="' + pad.t + '" width="' + iw / n + '" height="' + ih + '" fill="transparent" data-i="' + i + '"/>').join('') + '</g><line class="cursor" y1="' + pad.t + '" y2="' + (pad.t + ih) + '" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/></svg>';
  }


  RI.registerPage('stats',{
    title:'آمار',
    render(){return RI.pageHead({title:'آمار بازدید و کلیک',desc:'هر مرورگر از هر صفحه در ۲۴ ساعت یک بازدید محسوب می‌شود؛ کلیک‌ها جدا شمرده می‌شوند. با پاک‌کردن کوکی یا مرورگر دیگر، بازدید تازه ثبت می‌شود.'})+'<div class="statbar"><div class="segmented" id="range" role="group" aria-label="بازهٔ زمانی">'+[[7,'۷ روز'],[30,'۳۰ روز'],[90,'۹۰ روز']].map(([n,label])=>'<button type="button" data-r="'+n+'" aria-pressed="'+(n===7)+'">'+label+'</button>').join('')+'</div><button class="btn btn--soft" data-refresh>به‌روزرسانی</button></div><div id="sbody" aria-live="polite"></div>';},
    mount(root){let n=7,active=true;const body=RI.$('#sbody',root);
      function paint(){if(!active)return;
        if(RI.statsLoading){body.innerHTML='<p role="status">در حال دریافت آمار…</p>';return;}
        if(RI.statsRows===null){body.innerHTML=RI.empty({icon:'wifi',title:'آمار بارگذاری نشد',text:'اتصال را بررسی کن و به‌روزرسانی را بزن.'});return;}
        const ser=RI.metricSeries(n),sum=a=>a.reduce((s,v)=>s+v,0);
        const top=RI.C().links.items.filter(x=>x.type==='link').map(x=>({...x,clicks:RI.linkClicks(x.id,n)})).sort((a,b)=>b.clicks-a.clicks);
        body.innerHTML='<div class="statgrid">'+[['بازدید رزومه',sum(ser.views)],['بازدید لینک‌ها',sum(ser.linkViews)],['کلیک لینک‌ها',sum(ser.clicks)]].map(([label,total])=>'<div class="stat"><small>'+label+'</small><b class="num">'+RI.fa(total)+'</b></div>').join('')+'</div><section class="panel"><h2>روند بازدید</h2><ul class="legend" aria-label="راهنمای نمودار"><li><i class="legend__resume" aria-hidden="true"></i>بازدید رزومه</li><li><i class="legend__links" aria-hidden="true"></i>بازدید لینک‌ها</li></ul>'+chart(ser,n)+'<details class="allsteps"><summary>جدول داده‌ها</summary><div class="table-wrap"><table class="table"><thead><tr><th>روز</th><th>رزومه</th><th>لینک‌ها</th><th>کلیک</th></tr></thead><tbody>'+ser.views.map((v,i)=>'<tr><td>'+(i===n-1?'امروز':RI.fa(n-i-1)+' روز پیش')+'</td><td>'+RI.fa(v)+'</td><td>'+RI.fa(ser.linkViews[i])+'</td><td>'+RI.fa(ser.clicks[i])+'</td></tr>').join('')+'</tbody></table></div></details></section><section class="panel"><h2>کلیک روی لینک‌ها</h2>'+(top.length?'<ol class="toplinks">'+top.map((x,i)=>'<li><span>'+RI.fa(i+1)+'</span><b>'+esc(x.title)+'</b><span class="num">'+RI.fa(x.clicks)+' کلیک</span></li>').join('')+'</ol>':RI.empty({icon:'link',title:'هنوز لینکی نیست',text:'در بخش لینک‌ها یک لینک اضافه کن.'}))+'</section>';
      }
      async function refresh(){const button=RI.$('[data-refresh]',root);button.disabled=true;try{RI.statsRows=(await RI.dashboardRequest('stats')).rows;}catch(e){RI.statsRows=null;RI.toast(e.message,{kind:'error'});}finally{if(active){button.disabled=false;paint();}}}
      RI.delegate(root,'click','[data-r]',(e,b)=>{n=Number(b.dataset.r);RI.$$('[data-r]',root).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
      const download=document.createElement('a');download.className='btn btn--soft';download.href='/api/dashboard/stats/export';download.textContent='خروجی CSV'+(!RI.hasSub()?' · اشتراک':'');download.addEventListener('click',e=>{if(!RI.hasSub()){e.preventDefault();RI.go('billing');}});root.querySelector('.statbar').append(download);
      RI.delegate(root,'click','[data-refresh]',refresh);const offStats=RI.on('stats',paint);paint();return()=>{offStats();active=false;};
    }
  });
})();
