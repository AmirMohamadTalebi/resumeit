/* Public template interactions. No downloaded WordPress scripts or remote APIs. */
(function () {
  'use strict';
  const root = document.querySelector('.ri-imported'); if (!root) return;
  document.documentElement.setAttribute('data-theme',root.dataset.templateMode||'dark');
  document.body.classList.toggle('satiar-theme-light',root.dataset.template==='satiar'&&root.dataset.templateMode==='light');
  const mode = document.getElementById('themeToggleBtn');
  if(mode)mode.addEventListener('click',()=>{const dark=document.documentElement.getAttribute('data-theme')!=='dark';document.documentElement.setAttribute('data-theme',dark?'dark':'light');mode.setAttribute('aria-label',dark?'تغییر به حالت روشن':'تغییر به حالت تیره');});
  const top=document.getElementById('vistaBackToTop');if(top)top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'auto'}));
  const toggle = document.querySelector('.mobile-menu-toggle,.mobile-nav-toggle,.menu-button,.menu-toggle');
  const panel = document.querySelector('.mobile-nav-panel,.nav-menu');
  if (toggle && panel) {
    toggle.setAttribute('aria-label', 'باز و بسته کردن منو'); toggle.setAttribute('aria-expanded', 'false');
    if(toggle.tagName!=='BUTTON'){toggle.setAttribute('role','button');toggle.setAttribute('tabindex','0');toggle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.click();}});}
    const close = () => { panel.classList.remove('ri-menu-open'); toggle.setAttribute('aria-expanded','false'); };
    toggle.addEventListener('click', () => { const on = panel.classList.toggle('ri-menu-open'); toggle.setAttribute('aria-expanded',String(on)); });
    panel.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    const closer=document.getElementById('mobileNavClose'),overlay=document.getElementById('mobileNavOverlay');if(closer)closer.addEventListener('click',close);if(overlay)overlay.addEventListener('click',close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); toggle.focus(); } });
  }
  root.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) { const target = document.getElementById(decodeURIComponent(href.slice(1))); if (target) { e.preventDefault(); target.scrollIntoView({behavior:'auto'}); } }
  });
  root.querySelectorAll('.mobile-sub-toggle').forEach(button=>button.addEventListener('click',()=>{const list=button.parentElement.querySelector('ul');if(list){const on=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(on));list.style.display=on?'block':'none';}}));
  const compose=root.querySelector('.ri-compose');if(compose)compose.addEventListener('submit',e=>{e.preventDefault();if(!compose.reportValidity())return;const data=new FormData(compose),subject='پیام از '+data.get('name'),body=data.get('message')+'\n\n'+data.get('name')+'\n'+data.get('email');window.location.href='mailto:'+encodeURIComponent(compose.dataset.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});
})();
