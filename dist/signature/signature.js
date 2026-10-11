(() => {
  'use strict';
  // Geometry is in CSS pixels; mobile has its own readable card sizes and choreography.
  const desktop = [
    ['person', [220,10,-3], [35,20,0], [145,175]],
    ['work', [15,218,-3], [190,20,0], [255,105]],
    ['project', [435,90,3], [400,135,0], [140,140]],
    ['skills', [35,35,-3], [35,205,0], [145,135]],
    ['links', [410,365,3], [35,350,0], [145,210]],
    ['address', [165,500,-2], [190,285,0], [205,70]],
    ['theme', [38,380,-3], [225,375,0], [145,80]],
    ['contact', [215,365,2], [340,475,0], [190,85]]
  ];
  const mobile = [
    ['person', [119,82,-2], [0,0,0], [100,120]],
    ['work', [8,0,-2], [110,0,0], [180,70]],
    ['project', [233,82,2], [230,80,0], [100,110]],
    ['skills', [0,112,-2], [0,130,0], [100,95]],
    ['links', [8,235,1], [0,235,0], [100,155]],
    ['address', [126,217,-2], [110,200,0], [180,50]],
    ['theme', [129,284,-2], [125,265,0], [95,54]],
    ['contact', [205,349,2], [210,332,0], [120,58]]
  ];
  document.querySelectorAll('.sig-hero').forEach(hero => {
    const pin = hero.querySelector('.sig-pin'), visual = hero.querySelector('.sig-visual');
    const canvas = hero.querySelector('.sig-canvas'), copy = hero.querySelector('.sig-copy');
    const caption = hero.querySelector('[data-caption]'), track = hero.querySelector('.sig-track i');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const elements = new Map([...hero.querySelectorAll('[data-piece]')].map(el => [el.dataset.piece, el]));
    let geometry = [], scale = 1, distance = 800, start = 0, raf = 0, phase = -1;
    const clamp = v => Math.max(0, Math.min(1, v));
    function paint() {
      raf = 0;
      const p = reduced.matches ? 1 : clamp((scrollY - start) / distance);
      geometry.forEach(([id, from, to], i) => {
        const delay = [0,.04,.1,0,.04,.12,.19,.24][i];
        const t = reduced.matches ? 1 : clamp((p - delay) / (.78 - delay));
        const ease = t*t*(3-2*t);
        const x = from[0] + (to[0]-from[0])*ease;
        const y = from[1] + (to[1]-from[1])*ease - Math.sin(Math.PI*ease)*12;
        const angle = from[2]*(1-ease);
        elements.get(id).style.transform = `translate(${x*scale}px,${y*scale}px) rotate(${angle}deg) scale(${innerWidth<=760?1:scale})`;
      });
      track.style.transform = `scaleX(${Math.max(.1,p)})`;
      const next = p >= .78 ? 2 : p > .06 ? 1 : 0;
      if(next !== phase) {
        caption.textContent = ['هر تکه، بخشی از توست. اسکرول کن.','کارها، مهارت‌ها، داستانت؛ کنار هم.','تمامِ تو، در یک امضا.'][next];
        hero.querySelectorAll('[data-stage]').forEach(el=>el.classList.toggle('is-current',+el.dataset.stage===next));
        phase = next;
      }
    }
    function schedule(){if(!raf) raf=requestAnimationFrame(paint);}
    function resize(){
      const small = innerWidth <= 760;
      hero.classList.remove('is-animated','is-static-r');
      hero.classList.toggle('sig-mobile',small);
      pin.style.height = '';
      geometry = small ? mobile : desktop;
      scale = small ? Math.min(1.1,visual.clientWidth/340) : Math.min(1,visual.clientWidth/600);
      const sceneHeight = (small?410:585)*scale;
      canvas.style.setProperty('--sig-canvas-height',`${sceneHeight}px`);
      geometry.forEach(([id,,,size])=>{
        const el=elements.get(id);
        el.style.setProperty('--w',`${size[0]*(small?scale:1)}px`);
        el.style.setProperty('--h',`${size[1]*(small?scale:1)}px`);
        el.style.setProperty('--pad',`${small?7*scale:12}px`);
      });
      hero.classList.add(reduced.matches?'is-static-r':'is-animated');
      const viewport = document.documentElement.clientHeight;
      const stickyOffset = parseFloat(getComputedStyle(hero).getPropertyValue('--sig-top')) || 0;
      distance = Math.max(500,Math.min(900,viewport*.95));
      const top = hero.getBoundingClientRect().top + scrollY;
      if(small){
        const copyHeight = copy.offsetHeight + 22 + 12;
        start = top + copyHeight - 12 - stickyOffset;
        const height = copyHeight + sceneHeight + 75;
        hero.style.setProperty('--sig-pin-height',`${height}px`);
        if(!reduced.matches)pin.style.height=`${height+distance}px`;
      }else{
        start=top-stickyOffset;
        hero.style.setProperty('--sig-pin-height',`${pin.offsetHeight}px`);
        // Short landscape screens pin only when the scene fits, keeping every card reachable.
        if(pin.offsetHeight+stickyOffset>viewport){hero.classList.remove('is-animated');hero.classList.add('is-static-r');}
      }
      hero.style.setProperty('--sig-distance',`${distance}px`);
      if(!hero.classList.contains('is-animated')){
        geometry.forEach(([id,,to])=>elements.get(id).style.transform=`translate(${to[0]*scale}px,${to[1]*scale}px) scale(${small?1:scale})`);
      }else paint();
    }
    addEventListener('scroll',()=>{if(hero.classList.contains('is-animated'))schedule();},{passive:true});
    addEventListener('resize',resize,{passive:true});
    reduced.addEventListener('change',resize);
    document.fonts?.ready.then(resize);
    resize();
  });
})();
