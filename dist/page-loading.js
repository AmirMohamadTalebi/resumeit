(() => {
  const loader=document.createElement('div');
  loader.className='ri-page-loading';loader.hidden=true;
  loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');
  loader.innerHTML='<div class="ri-loading-content"><img class="ri-loading-mark" src="/brand/resumeit-mark-v1.png" alt="ResumeIt" width="66" height="66"><span class="ri-loading-track" aria-hidden="true"></span><span>در حال آماده‌سازی صفحه</span></div>';
  document.body.append(loader);
  // Fast loads skip the overlay; a slow resource must never leave the page blocked.
  const reveal=setTimeout(()=>{loader.hidden=false;},180);
  const fallback=setTimeout(dismiss,8000);
  function dismiss(){clearTimeout(reveal);clearTimeout(fallback);loader.remove();}
  if(document.readyState==='complete')dismiss();
  else window.addEventListener('load',dismiss,{once:true});
  window.addEventListener('pageshow',dismiss,{once:true});
})();
