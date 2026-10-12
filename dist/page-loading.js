(() => {
  const loader=document.createElement('div');
  loader.className='ri-page-loading';loader.hidden=true;
  loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');
  loader.innerHTML='<div class="ri-loading-content"><svg class="ri-loading-mark" viewBox="0 0 100 100" aria-hidden="true"><path class="ri-mark-body" d="M12 90V29Q12 25 16 22L39 6H75L39 39Q35 43 35 50V90Z M41 64V51Q41 39 53 35H96Z"/><path class="ri-mark-fold" d="M75 6V35H96Q99 35 97 32Z"/></svg><strong dir="ltr">resumeit</strong><span class="ri-loading-track" aria-hidden="true"></span><span>در حال آماده‌سازی صفحه</span></div>';
  document.body.append(loader);
  // Fast loads skip the overlay; a slow resource must never leave the page blocked.
  const reveal=setTimeout(()=>{loader.hidden=false;},180);
  const fallback=setTimeout(dismiss,8000);
  function dismiss(){clearTimeout(reveal);clearTimeout(fallback);loader.remove();}
  if(document.readyState==='complete')dismiss();
  else window.addEventListener('load',dismiss,{once:true});
  window.addEventListener('pageshow',dismiss,{once:true});
})();
