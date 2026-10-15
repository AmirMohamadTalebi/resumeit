(() => {
  const dashboard=location.pathname.startsWith('/dashboard'),auth=/^\/(login|register|forgot-password)\/?$/.test(location.pathname);
  const loader=document.createElement('div');
  loader.className='ri-page-loading';loader.hidden=true;
  loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');
  loader.setAttribute('aria-label','در حال دریافت صفحه');
  loader.innerHTML='<div class="ri-loading-content"><span class="ri-loading-track" aria-hidden="true"></span></div>';
  let reveal,fallback;
  function finish(){clearTimeout(reveal);clearTimeout(fallback);loader.hidden=true;loader.remove();document.body.removeAttribute('aria-busy');}
  function start(immediate=false){
    clearTimeout(reveal);clearTimeout(fallback);document.body.append(loader);
    loader.hidden=!immediate;
    reveal=setTimeout(()=>{loader.hidden=false;},180);
    // Dashboard readiness includes session and API data, rather than only the window load event.
    fallback=setTimeout(finish,dashboard?25000:8000);
  }
  window.resumeitPageLoading={start,finish};
  if(dashboard||auth)start();
  document.addEventListener('ri:dashboard-ready',finish);
  if(!dashboard){if(document.readyState!=='loading')finish();else document.addEventListener('DOMContentLoaded',finish,{once:true});}
  window.addEventListener('pageshow',e=>{if(e.persisted||!dashboard)finish();});
})();
