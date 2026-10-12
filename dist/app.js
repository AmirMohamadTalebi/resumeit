const menu=document.querySelector('.mobile-menu');menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.querySelector('.header nav').classList.toggle('open',open)});
document.querySelectorAll('.header nav a').forEach(a=>a.addEventListener('click',()=>{menu?.setAttribute('aria-expanded','false');document.querySelector('.header nav').classList.remove('open')}));
const galleryThemes={studio:['استودیو','برای ذهن‌هایی که خلق می‌کنند','sara'],terminal:['ترمینال','برای آدم‌هایی که با کد می‌سازند','amir'],journal:['ژورنال','برای اولین قدم‌های بزرگ','nika']};
function selectGallery(theme){
  const selected=galleryThemes[theme];if(!selected)return;
  const frame=document.querySelector('#gallery-preview');const url='/demo/?theme='+theme;
  document.querySelectorAll('[data-gallery]').forEach(button=>{const active=button.dataset.gallery===theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  document.querySelector('.template-live').dataset.theme=theme;
  document.querySelector('#gallery-title').textContent=selected[0];document.querySelector('#gallery-description').textContent=selected[1];document.querySelector('#gallery-address').textContent=selected[2]+'.ResumeIt.ir';
  document.querySelector('#gallery-open').href=url;frame.title='نمونهٔ زندهٔ قالب '+selected[0];
  if(frame.getAttribute('src')!==url){frame.src=url;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector('.gallery-frame').animate([{opacity:.45,transform:'translateY(12px) rotateX(-3deg)'},{opacity:1,transform:'none'}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'})}
}
document.querySelectorAll('[data-gallery]').forEach(button=>button.addEventListener('click',()=>selectGallery(button.dataset.gallery)));
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});document.querySelectorAll('[data-category]').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter});const selected=document.querySelector('.template-card:not([hidden])');if(selected)selectGallery(selected.dataset.themeName)}));
const plans={3:['۲۴۹٬۰۰۰','۳ ماه'],6:['۴۴۹٬۰۰۰','۶ ماه'],12:['۷۹۹٬۰۰۰','۱۲ ماه']};
document.querySelectorAll('[data-months]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-months]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});const plan=plans[button.dataset.months];document.querySelector('#plan-price').textContent=plan[0];document.querySelector('#plan-period').textContent=plan[1];document.querySelector('#domain-benefit').textContent=button.dataset.months==='12'?'دامنهٔ ir برای سال اول، با شرایط ثبت':'دامنهٔ ir در اشتراک سالانه'}));
const steps=[['سلام، قهرمانِ قصه!','هر مسیر بزرگ، از معرفی خودت شروع می‌شود','من نیکام؛ دانشجو و عاشق ساختن چیزهای تازه','✦ شروع یک فصل تازه'],['چیزهایی که می‌توانی بسازی','تجربه فقط شغل نیست؛ پروژه‌های تو هم حرف دارند','مهارت‌ها: طراحی، برنامه‌نویسی، عکاسی','✦ توانایی‌هایت را پیدا کردی'],['این رنگ، شبیه توست','ظاهر صفحه‌ات را با حال و هوای خودت هماهنگ کن','قالب استودیو · فونت وزیرمتن · آبی یخی','✦ سبک خودت را ساختی'],['یک آدرس به نام تو','قصه‌ات آماده است تا جای خودش را در وب پیدا کند','nika.ResumeIt.ir + /links','✦ آمادهٔ دیده شدن']];let currentStep=0;
function showStep(index){currentStep=index;document.querySelector('.game-preview').dataset.step=String(index);document.querySelectorAll('[data-step]').forEach(b=>{const active=Number(b.dataset.step)===index;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});document.querySelector('#level').textContent=`مرحلهٔ ${['۱','۲','۳','۴'][index]} از ۴`;document.querySelector('.game-progress i').style.width=`${(index+1)*25}%`;['step-title','step-copy','step-example','step-reward'].forEach((id,i)=>document.getElementById(id).textContent=steps[index][i]);document.querySelector('#next-step').textContent=index===3?'از اول ↻':'مرحلهٔ بعد ←'}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.step))));document.querySelector('#next-step')?.addEventListener('click',()=>showStep((currentStep+1)%4));

const faqItems=[...document.querySelectorAll('.faq-list details')];
const faqAnimations=new Map(),faqTargets=new Map();
function setFaq(detail,opening){
 const answer=detail.querySelector('.faq-answer'),from=detail.open?answer.getBoundingClientRect().height:0;
 faqAnimations.get(detail)?.cancel();faqTargets.set(detail,opening);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){detail.open=opening;return;}
 detail.open=true;
 const animation=answer.animate([{height:from+'px',opacity:from?1:0},{height:(opening?answer.scrollHeight:0)+'px',opacity:opening?1:0}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});faqAnimations.set(detail,animation);
 animation.onfinish=()=>{detail.open=opening;animation.cancel();faqAnimations.delete(detail);};
}
faqItems.forEach(detail=>detail.querySelector('summary').addEventListener('click',event=>{event.preventDefault();const opening=!(faqTargets.get(detail)??detail.open);if(opening)faqItems.forEach(other=>{if(other!==detail&&(faqTargets.get(other)??other.open))setFaq(other,false);});setFaq(detail,opening);}));

if(window.gsap&&window.ScrollTrigger){
  gsap.registerPlugin(ScrollTrigger);
  const motion=gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)',()=>{
    gsap.to('.orb-a',{x:90,y:50,duration:12,repeat:-1,yoyo:true,ease:'sine.inOut'});
    gsap.to('.orb-b',{x:-70,y:-90,duration:16,repeat:-1,yoyo:true,ease:'sine.inOut'});

    gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:55,opacity:0,rotationX:4,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}}));
    gsap.to('.scroll-progress',{scaleX:1,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:true}});
    gsap.from('.intro h2',{y:50,opacity:.2,scrollTrigger:{trigger:'.intro',start:'top 85%',end:'center 60%',scrub:1}});
    gsap.to('.phone',{rotation:8,rotationY:15,y:-45,scrollTrigger:{trigger:'.dual-section',start:'top 85%',end:'bottom 15%',scrub:1}});
    gsap.to('.link-orbit',{rotation:100,scale:1.2,scrollTrigger:{trigger:'.dual-section',start:'top bottom',end:'bottom top',scrub:1}});
    gsap.to('.closing-star',{rotation:180,scale:1.4,scrollTrigger:{trigger:'.closing',start:'top bottom',end:'bottom top',scrub:1}});
    gsap.from('.closing h2',{y:70,rotationX:18,opacity:.2,scrollTrigger:{trigger:'.closing',start:'top 90%',end:'center 65%',scrub:1}});
    const cleanups=[];
    gsap.from('.question-orbit',{rotation:-25,scale:.8,opacity:0,duration:1.2,ease:'back.out(1.4)',scrollTrigger:{trigger:'.faq',start:'top 85%',once:true}});
    gsap.to('.question-orbit>span',{y:-12,rotation:8,duration:3.5,repeat:-1,yoyo:true,ease:'sine.inOut'});
    gsap.to('.question-orbit i',{rotation:35,duration:8,repeat:-1,yoyo:true,ease:'sine.inOut'});
    gsap.from('.faq-list details',{y:25,opacity:0,stagger:.1,duration:.7,scrollTrigger:{trigger:'.faq-list',start:'top 85%',once:true}});
    const indicator=document.querySelector('.faq-follow');
    document.querySelectorAll('.faq-list summary').forEach(summary=>{const follow=()=>{const row=summary.parentElement;gsap.to(indicator,{y:row.offsetTop,height:summary.offsetHeight,opacity:1,duration:.4,ease:'power3.out',overwrite:true})};summary.addEventListener('pointerenter',follow);summary.addEventListener('focus',follow);cleanups.push(()=>{summary.removeEventListener('pointerenter',follow);summary.removeEventListener('focus',follow)})});
    const hideFollow=()=>gsap.to(indicator,{opacity:0,duration:.3});document.querySelector('.faq-list').addEventListener('pointerleave',hideFollow);cleanups.push(()=>document.querySelector('.faq-list').removeEventListener('pointerleave',hideFollow));
    gsap.from('.address-ticket',{rotationY:-35,rotation:-20,y:50,opacity:0,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:'.closing',start:'top 85%',once:true}});
    gsap.to('.address-ticket',{y:-20,rotation:-3,duration:4,repeat:-1,yoyo:true,ease:'sine.inOut',delay:1.2});
    gsap.to('.ticket-orbit',{rotation:90,scrollTrigger:{trigger:'.closing',start:'top bottom',end:'bottom top',scrub:1}});
    gsap.from('.footer-identity,.footer-note,.footer-top',{y:25,opacity:0,duration:.7,stagger:.15,scrollTrigger:{trigger:'.footer-section',start:'top 95%',once:true}});
    function animatePanel(){gsap.fromTo('.game-preview',{rotationY:-8,scale:.97,opacity:.4},{rotationY:0,scale:1,opacity:1,duration:.45,ease:'power3.out',overwrite:true})}
    document.querySelectorAll('[data-step],#next-step').forEach(b=>{b.addEventListener('click',animatePanel);cleanups.push(()=>b.removeEventListener('click',animatePanel))});
    document.querySelectorAll('[data-filter]').forEach(b=>{const enter=()=>gsap.fromTo('.template-card:not([hidden])',{y:30,scale:.96,opacity:0},{y:0,scale:1,opacity:1,duration:.5,stagger:.08,ease:'power3.out',overwrite:true});b.addEventListener('click',enter);cleanups.push(()=>b.removeEventListener('click',enter))});
    const pricing=()=>gsap.fromTo('#plan-price',{y:8,opacity:.3},{y:0,opacity:1,duration:.3,overwrite:true});document.querySelectorAll('[data-months]').forEach(b=>{b.addEventListener('click',pricing);cleanups.push(()=>b.removeEventListener('click',pricing))});
    return()=>cleanups.forEach(fn=>fn());
  });
  motion.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',()=>{
    const remove=[];document.querySelectorAll('.template-card').forEach(card=>{
      const x=gsap.quickTo(card,'rotationY',{duration:.4}),y=gsap.quickTo(card,'rotationX',{duration:.4});
      const move=e=>{const r=card.getBoundingClientRect();x((e.clientX-r.left-r.width/2)/r.width*12);y(-(e.clientY-r.top-r.height/2)/r.height*12)};
      const leave=()=>{x(0);y(0)};card.addEventListener('pointermove',move);card.addEventListener('pointerleave',leave);remove.push(()=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',leave)});
    });return()=>remove.forEach(fn=>fn());
  });
}

const pricingMotion=document.querySelector('.pricing-motion');if(pricingMotion){if('IntersectionObserver' in window)new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting)),{rootMargin:'100px'}).observe(pricingMotion);else pricingMotion.classList.add('in-view');}
