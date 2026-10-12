(() => {
  const dashboard=location.pathname.startsWith('/dashboard');
  const loader=document.createElement('div');
  loader.className='ri-page-loading';loader.hidden=true;
  loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');
  loader.innerHTML='<div class="ri-loading-content"><img class="ri-loading-mark" src="/brand/resumeit-mark-v1.png" alt="ResumeIt" width="66" height="66"><span class="ri-loading-track" aria-hidden="true"></span><span>در حال آماده‌سازی صفحه</span></div>';
  let reveal,fallback;
  function finish(){clearTimeout(reveal);clearTimeout(fallback);loader.hidden=true;loader.remove();document.body.removeAttribute('aria-busy');}
  function start(immediate=false){
    clearTimeout(reveal);clearTimeout(fallback);document.body.append(loader);document.body.setAttribute('aria-busy','true');
    loader.hidden=!immediate;
    reveal=setTimeout(()=>{loader.hidden=false;},180);
    // Dashboard readiness includes session and API data, rather than only the window load event.
    fallback=setTimeout(finish,dashboard?25000:8000);
  }
  window.resumeitPageLoading={start,finish};
  start();
  document.addEventListener('ri:dashboard-ready',finish);
  if(!dashboard){if(document.readyState==='complete')finish();else window.addEventListener('load',finish,{once:true});}
  window.addEventListener('pageshow',e=>{if(e.persisted||!dashboard)finish();});
})();
