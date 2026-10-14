(() => {
  fetch('/api/version',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(info=>{
    if(!info)return;document.querySelectorAll('[data-site-version]').forEach(el=>{el.textContent='نسخهٔ '+(info.displayVersion||info.version);el.dir='auto';});
  }).catch(()=>{});
})();
