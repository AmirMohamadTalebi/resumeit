/* آمار بازدید و کلیک ثبت‌شده روی سرور */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('stats',{
    title:'آمار',
    render(){return RI.pageHead({title:'آمار بازدید و کلیک',desc:'هر مرورگر از هر صفحه در ۲۴ ساعت یک بازدید محسوب می‌شود؛ کلیک‌ها جدا شمرده می‌شوند. با پاک‌کردن کوکی یا مرورگر دیگر، بازدید تازه ثبت می‌شود.'})+'<div class="statbar"><div class="segmented" id="range" role="group" aria-label="بازهٔ زمانی">'+[[7,'۷ روز'],[30,'۳۰ روز'],[90,'۹۰ روز']].map(([n,label])=>'<button type="button" data-r="'+n+'" aria-pressed="'+(n===7)+'">'+label+'</button>').join('')+'</div><button class="btn btn--soft" data-refresh>به‌روزرسانی</button></div><div id="sbody" aria-live="polite"></div>';},
    mount(root){let n=7,active=true;const body=RI.$('#sbody',root);
      function paint(){if(!active)return;
        if(RI.statsLoading||(!RI.statsError&&RI.statsRows===null)){body.innerHTML=RI.sectionLoading('در حال دریافت آمار…');return;}
        if(RI.statsRows===null){body.innerHTML=RI.empty({icon:'wifi',title:'آمار بارگذاری نشد',text:'اتصال را بررسی کن و به‌روزرسانی را بزن.'});return;}
        const resume=RI.pageKinds().includes('resume'),ser=RI.metricSeries(n),sum=a=>a.reduce((s,v)=>s+v,0);
        const top=RI.C().links.items.filter(x=>x.type==='link').map(x=>({...x,clicks:RI.linkClicks(x.id,n)})).sort((a,b)=>b.clicks-a.clicks);
        body.innerHTML='<div class="statgrid">'+[['بازدید رزومه',sum(ser.views)],['بازدید لینک‌ها',sum(ser.linkViews)],['کلیک لینک‌ها',sum(ser.clicks)]].filter((x,i)=>resume||i!==0).map(([label,total])=>'<div class="stat"><small>'+label+'</small><b class="num">'+RI.fa(total)+'</b></div>').join('')+'</div><section class="panel"><h2>روند بازدید</h2>'+RI.charts.placeholder({title:'روند بازدید و کلیک',labelTitle:'روز',labels:ser.views.map((v,i)=>i===n-1?'امروز':RI.fa(n-i-1)+' روز پیش'),series:[...(resume?[{name:'بازدید رزومه',values:ser.views,color:'#52788d'}]:[]),{name:'بازدید لینک‌ها',values:ser.linkViews,color:'#a47248'},{name:'کلیک لینک‌ها',values:ser.clicks,color:'#5e8b7e'}]})+'</section><section class="panel"><h2>کلیک روی لینک‌ها</h2>'+(top.length&&top.some(x=>x.clicks)?RI.charts.placeholder({title:'کلیک هر لینک',labelTitle:'لینک',totalLabel:'کلیک',labels:top.map(x=>x.title),series:[{name:'کلیک',values:top.map(x=>x.clicks),color:'#a47248'}]}):'')+(top.length?'<ol class="toplinks">'+top.map((x,i)=>'<li><span>'+RI.fa(i+1)+'</span><b>'+esc(x.title)+'</b><span class="num">'+RI.fa(x.clicks)+' کلیک</span></li>').join('')+'</ol>':RI.empty({icon:'link',title:'هنوز لینکی نیست',text:'در بخش لینک‌ها یک لینک اضافه کن.'}))+'</section>';
        body.insertAdjacentHTML('beforeend',sourcesCard());
      }
      // Where visits came from (council C3-a): nine fixed groups; an origin we do not know counts as "other".
      let sources=null;const NAMES={telegram:'تلگرام',instagram:'اینستاگرام',linkedin:'لینکدین',whatsapp:'واتساپ',jobsite:'سایت‌های کاریابی',irmsg:'پیام‌رسان داخلی (بله، ایتا، روبیکا)',google:'گوگل',other:'سایر',direct:'مستقیم یا نامشخص'};
      async function loadSources(){try{sources=(await RI.dashboardRequest('sources')).rows;}catch{sources=null;}paint();}
      function sourcesCard(){
        const head='<section class="panel srcpanel"><h2>بازدید از کجا آمد</h2>';
        if(sources===null)return head+'<p class="srcpanel__note">دریافت نشد؛ «به‌روزرسانی» را بزن.</p></section>';
        const today=Math.floor((Date.now()+12600000)/86400000),sum={};let total=0;
        for(const r of sources)if(r.day>=today-n+1){sum[r.src]=(sum[r.src]||0)+Number(r.total);total+=Number(r.total);}
        if(!total)return head+RI.empty({icon:'link',title:'هنوز منبعی ثبت نشده',text:'برای هر جا که لینکت را می‌گذاری، از «آدرس و انتشار» لینک مخصوص همان‌جا را بساز.'})+'</section>';
        return head+'<ol class="srclist">'+Object.entries(sum).sort((x,y)=>y[1]-x[1]).map(([k,v],i)=>'<li style="--i:'+i+';--w:'+Math.max(4,Math.round(v*100/total))+'%"><span>'+esc(NAMES[k]||k)+'</span><i aria-hidden="true"></i><b class="num">'+RI.fa(v)+'</b></li>').join('')+'</ol><p class="srcpanel__note">فقط بازدیدهای ثبت‌شده از بعد از امروز در این فهرست‌اند. مبدأ ناشناخته در «سایر» می‌رود.</p></section>';
      }
      async function refresh(){const button=RI.$('[data-refresh]',root);button.disabled=true;try{await Promise.all([RI.loadStats(),loadSources()]);}finally{if(active){button.disabled=false;paint();}}}
      RI.delegate(root,'click','[data-r]',(e,b)=>{n=Number(b.dataset.r);RI.$$('[data-r]',root).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
      const download=document.createElement('a');download.className='btn btn--soft';download.href='/api/dashboard/stats/export?workspace='+RI.workspaceSlot;download.textContent='خروجی CSV · ۹۰ روز'+(!RI.hasSub()?' · اشتراک':'');download.addEventListener('click',e=>{if(!RI.hasSub()){e.preventDefault();RI.go('billing');}});root.querySelector('.statbar').append(download);
      RI.delegate(root,'click','[data-refresh]',refresh);const offStats=RI.on('stats',paint);paint();loadSources();return()=>{offStats();active=false;};
    }
  });
})();
