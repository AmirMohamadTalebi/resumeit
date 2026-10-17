(function () {
  'use strict';
  const RI = window.RI, core = window.ResumeAdvisor, esc = RI.esc;
  const sha = async text => 'sha256:' + [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, '0')).join('');
  let memory;
  RI.advisorClear = () => { memory = null; RI.emit('advisor-clear'); };
  RI.mountAdvisor = function (host, focusTarget) {
    const owner = RI.ownerId, slot = RI.workspaceSlot, epoch = crypto.randomUUID();
    if (!memory || memory.owner !== owner || memory.slot !== slot) memory = { owner, slot, state: { context: { goal: '' }, feedback: {}, confirmations: {} }, version: 0, job: '', paused: false };
    const session = memory;
    let alive = true, generation = 0, timer, watchdog, worker, running = false, pending = false, result = null, token = '', sources = [], stale = true, error = '', saving = false, remoteReady = false,sectionFilter='',findingPage=0,batchStart=0,nextBatch=null;
    const active = () => alive && RI.ownerId === owner && RI.workspaceSlot === slot && session === memory;
    const stopWorker = () => { clearTimeout(watchdog); worker?.terminate(); worker = null; running = false; };
    const feedbackHidden = f => { const value = session.state.feedback[f.id]; return value && (value.value === 'dismiss' || value.digest === f.dependencyDigest && value.until > Date.now()); };
    host.innerHTML = '<details class="advisor"><summary><span>' + RI.icon('sparkle') + 'راهنمای کیفیت رزومه</span><small data-advisor-summary>در حال آماده‌سازی…</small>' + RI.icon('chevD') + '</summary><div class="advisor__body"><div class="advisor__context"><div class="field"><label class="field__label" for="advisor-goal">برای چه کاری رزومه می‌سازی؟ <span class="field__opt">به انتخاب تو</span></label><input class="input" id="advisor-goal" maxlength="160" placeholder="مثلاً تحلیل داده یا تدریس"></div><details class="advisor__job"><summary>مقایسه با آگهی شغلی</summary><label class="field__label" for="advisor-job">متن آگهی؛ فقط در حافظهٔ همین صفحه</label><textarea class="textarea" id="advisor-job" rows="3" maxlength="12000"></textarea></details></div><div class="btnrow"><button type="button" class="btn btn--soft btn--sm" data-advisor-run>' + RI.icon('refresh') + 'بررسی الآن</button><button type="button" class="btn btn--ghost btn--sm" data-advisor-pause></button><button type="button" class="btn btn--ghost btn--sm" data-advisor-restore>بازگرداندن پیشنهادهای کنارگذاشته</button></div><p class="field__hint" data-advisor-coverage></p><p role="status" data-advisor-status></p><div data-advisor-findings></div><div data-advisor-matches></div></div></details>';
    const goal = host.querySelector('#advisor-goal'), job = host.querySelector('#advisor-job');
    const summary=host.querySelector('.advisor>summary'),helpId='advisor-help-'+epoch;
    summary.querySelector('span').insertAdjacentHTML('beforeend','<button type="button" class="btn btn--icon btn--ghost btn--sm advisor-help" data-advisor-help aria-label="راهنمای بررسی کیفیت رزومه" aria-describedby="'+helpId+'" aria-expanded="false">'+RI.icon('help')+'</button><span class="advisor__helptext" id="'+helpId+'" role="tooltip" hidden>این ابزار متن رزومه را از نظر وضوح، تکرار، تاریخ و مهارت‌های شناخته‌شده بررسی می‌کند؛ چت یا مشاور مهاجرت نیست. هدف شغلی اختیاری است. متن نمونهٔ قالب فقط پس از تأیید واقعی‌بودن بررسی می‌شود؛ نبود پیشنهاد به معنی کامل‌بودن رزومه نیست.</span>');
    const help=host.querySelector('[data-advisor-help]'),helpText=host.querySelector('[role=tooltip]');let helpPinned=false,helpTimer;
    const showHelp=open=>{clearTimeout(helpTimer);helpText.hidden=!open;help.setAttribute('aria-expanded',String(open));};
    const leaveHelp=()=>{helpTimer=setTimeout(()=>{if(!helpPinned&&document.activeElement!==help&&!helpText.matches(':hover'))showHelp(false);},120);};
    help.addEventListener('pointerenter',()=>showHelp(true));help.addEventListener('focus',()=>showHelp(true));help.addEventListener('pointerleave',leaveHelp);help.addEventListener('blur',leaveHelp);helpText.addEventListener('pointerenter',()=>clearTimeout(helpTimer));helpText.addEventListener('pointerleave',leaveHelp);
    help.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();helpPinned=!helpPinned;showHelp(helpPinned);});
    const closeHelp=event=>{if(event.key==='Escape'||event.type==='pointerdown'&&!help.contains(event.target)&&!helpText.contains(event.target)){helpPinned=false;showHelp(false);if(event.key==='Escape'&&document.activeElement===help){event.preventDefault();event.stopPropagation();}}};
    document.addEventListener('pointerdown',closeHelp);document.addEventListener('keydown',closeHelp);
    goal.labels[0].firstChild.textContent='هدف حرفه‌ای رزومه ';
    goal.placeholder='مثلاً توسعه‌دهندهٔ وب با React یا تحلیل‌گر داده';goal.setAttribute('aria-describedby','advisor-goal-hint');
    goal.insertAdjacentHTML('afterend','<p class="field__hint" id="advisor-goal-hint" data-advisor-goalhint></p>');
    host.querySelector('[data-advisor-findings]').insertAdjacentHTML('beforebegin','<aside class="advisor-source-note" data-advisor-source-note hidden><p>متن‌های قالب هنوز به‌عنوان اطلاعات واقعی تو تأیید نشده‌اند؛ برای جلوگیری از پیشنهاد بر اساس نمونه‌های آماده، فعلاً کنار گذاشته شده‌اند. فقط متن‌هایی را تأیید کن که واقعاً دربارهٔ خودت هستند.</p><button type="button" class="btn btn--soft btn--sm" data-advisor-review-source>'+RI.icon('resume')+'بررسی و تأیید متن‌های قالب</button></aside>');
    goal.disabled=true;
    const channel=window.BroadcastChannel?new BroadcastChannel('resumeit-session'):null;
    if(channel)channel.onmessage=({data})=>{if(data?.owner!==owner)RI.advisorClear();};
    host.querySelector('[data-advisor-run]').insertAdjacentHTML('afterend','<button type="button" class="btn btn--soft btn--sm" data-advisor-next-batch hidden>بررسی بخش بعدی</button>');
    host.querySelector('[data-advisor-findings]').insertAdjacentHTML('beforebegin','<div class="advisor-filter"><div class="field"><label class="field__label" for="advisor-section">پیشنهادهای کدام بخش؟</label><select class="select input" id="advisor-section"><option value="">همهٔ بخش‌ها</option>'+Object.entries({profile:'معرفی',skills:'مهارت‌ها',experience:'تجربه',education:'تحصیلات',projects:'پروژه‌ها',template:'جزئیات قالب'}).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></div><button type="button" class="btn btn--soft btn--sm" data-advisor-export>'+RI.icon('download')+'دریافت گزارش</button></div>');
    host.querySelector('[data-advisor-findings]').insertAdjacentHTML('afterend','<nav class="btnrow" data-advisor-pager aria-label="پیشنهادهای بیشتر"></nav>');
    goal.value = session.state.context.goal; job.value = session.job;
    function paint() {
      if (!active()) return;
      const findings = result?.findings.filter(f => !feedbackHidden(f)&&(!sectionFilter||f.target.section===sectionFilter)) || [], c = result?.coverage;
      host.querySelector('[data-advisor-summary]').textContent = error ? 'بررسی موقتاً در دسترس نیست' : running ? 'در حال بررسی متن' : stale ? 'منتظر بررسی تازه' : findings.length ? RI.fa(findings.length) + ' پیشنهاد قابل بررسی' : c?.unsupported ? 'بررسی محدود؛ متن‌های قالب نیازمند تأییدند' : 'پیشنهاد مهمی پیدا نشد';
      host.querySelector('[data-advisor-goalhint]').textContent=goal.value.trim()&&!core.goalRole(goal.value)&&!core.lexicon.some(skill=>core.mentions(core.normalize(goal.value),skill))?'برای این عبارت، تطبیق مهارت تخصصی در دسترس نیست؛ بررسی عمومی متن همچنان انجام می‌شود. این کادر برای سؤال‌وجواب نیست.':'عنوان یا تخصص هدفت را بنویس؛ پیشنهادها از متن رزومه می‌آیند، نه فقط از این کادر. می‌توانی آن را خالی بگذاری.';
      host.querySelector('[data-advisor-source-note]').hidden=!c?.unsupported||stale;
      host.querySelector('[data-advisor-coverage]').textContent = c ? RI.fa(c.assessed) + ' فیلد بررسی شد' + (c.unsupported ? ' · ' + RI.fa(c.unsupported) + ' فیلد نمونه یا با منشأ نامعلوم، شاهد شخصی محسوب نشد' : '') + (c.deferred ? ' · بخشی از متن برای بررسی بعدی باقی مانده است' : '') : 'پیشنهادها دربارهٔ متن نوشته‌شده‌اند؛ مانع انتشار نمی‌شوند.';
      host.querySelector('[data-advisor-status]').textContent = error || (stale && result ? 'متن تغییر کرده؛ پیشنهاد قبلی تا بررسی تازه قابل اعمال نیست.' : session.paused ? 'بررسی خودکار متوقف است؛ هدف و آگهی این صفحه حفظ شده‌اند.' : '');
      host.querySelector('[data-advisor-pause]').textContent = session.paused ? 'ادامهٔ بررسی خودکار' : 'توقف بررسی خودکار';
      findingPage=Math.min(findingPage,Math.max(0,Math.ceil(findings.length/3)-1));
      const shown = findings.slice(findingPage*3, findingPage*3+3);
      host.querySelector('[data-advisor-pager]').innerHTML=findings.length>3?'<button type="button" class="btn btn--soft btn--sm" data-advisor-page="-1" '+(!findingPage?'disabled':'')+'>قبلی</button><span>'+RI.fa(findingPage+1)+' از '+RI.fa(Math.ceil(findings.length/3))+'</span><button type="button" class="btn btn--soft btn--sm" data-advisor-page="1" '+((findingPage+1)*3>=findings.length?'disabled':'')+'>بعدی</button>':'';
      host.querySelector('[data-advisor-export]').disabled=!result||stale;
      host.querySelector('[data-advisor-next-batch]').hidden=!result||nextBatch===null;
      host.querySelector('[data-advisor-findings]').innerHTML = shown.map(f => '<article class="advisor-finding"><div><span class="chip">' + (f.basis==='goal'?'راهنمای متناسب با هدف':f.type === 'issue' ? 'نیازمند بررسی' : f.type === 'rewrite' ? 'ویرایش پیشنهادی' : 'یک سؤال برای روشن‌ترشدن') + '</span><p>' + esc(f.message) + '</p></div><details><summary>شاهد و اقدام</summary>' + (f.private ? '<p>اطلاعات تماس برای حفظ حریم خصوصی نمایش داده نمی‌شود.</p>' : f.evidence.map(e => '<blockquote>' + esc(e.raw) + '</blockquote>').join('')) + (f.type === 'rewrite' ? '<div class="advisor-diff"><span>پیشنهاد</span><p>' + esc(f.after) + '</p></div>' : '') + '<div class="btnrow"><button type="button" class="btn btn--soft btn--sm" data-advisor-focus="' + esc(f.id) + '">رفتن به متن</button>' + (f.type === 'rewrite' ? '<button type="button" class="btn btn--primary btn--sm" data-advisor-apply="' + esc(f.id) + '" ' + (stale ? 'disabled' : '') + '>اعمال ویرایش</button>' : '') + '<button type="button" class="btn btn--ghost btn--sm" data-advisor-dismiss="' + esc(f.id) + '">برای من مرتبط نیست</button><button type="button" class="btn btn--ghost btn--sm" data-advisor-later="' + esc(f.id) + '">فردا یادآوری کن</button></div></details></article>').join('') + (!findings.length && result && !stale ? '<p>در بخش‌های بررسی‌شده، پیشنهاد مهم دیگری ندارم. این نتیجه تأیید کامل رزومه یا توانایی حرفه‌ای نیست.</p>' : '');
      if(!findings.length&&result&&!stale)host.querySelector('[data-advisor-findings]').textContent=sectionFilter?'در این بخش پیشنهادی نمایش داده نمی‌شود؛ برای دیدن بقیه، «همهٔ بخش‌ها» را انتخاب کن.':c.unsupported?'نبود پیشنهاد در این بررسی محدود، ارزیابی متن‌های تأییدنشده نیست. ابتدا متن‌های واقعی خودت را مشخص کن.':result.findings.length?'پیشنهادهای این بررسی کنار گذاشته شده‌اند؛ با «بازگرداندن پیشنهادهای کنارگذاشته» دوباره آن‌ها را ببین.':'در متن‌های بررسی‌شده، الگوی قابل‌اصلاحی پیدا نشد. این بررسی محدود است و تأیید کامل رزومه نیست.';
      const labels = { supported: 'کاربرد در متن دیده شد', partial: 'نام برده شده؛ نمونهٔ کاربرد روشن نیست', contradicted: 'در متن نفی شده است', unknown: 'شاهد کافی برای مقایسه ندارم' };
      host.querySelector('[data-advisor-matches]').innerHTML = result?.jobMatches.length ? '<details><summary>نیازهای شناخته‌شدهٔ آگهی</summary><ul>' + result.jobMatches.map(x => '<li><b>' + esc(x.id) + '</b> — ' + labels[x.status] + '</li>').join('') + '</ul></details>' : '';
    }
    async function persist(operations) {
      if (!active() || !remoteReady || saving) { RI.toast('تنظیم مشاور هنوز آماده نیست؛ کمی بعد دوباره بزن', { kind: 'info' }); return false; }
      saving = true;
      try {
        const next = await RI.dashboardRequest('advisor', { version: session.version, operations });
        if (!active()) return false;
        session.state = next.state; session.version = next.version; return true;
      } catch (e) {
        if (active()) {
          if (e.code === 'ADVISOR_CONFLICT') { const next = await RI.dashboardRequest('advisor').catch(() => null); if (next && active()) { session.state = next.state; session.version = next.version; goal.value = next.state.context.goal; } }
          RI.toast(e.message, { kind: 'error' });
        }
        return false;
      } finally { saving = false; paint(); }
    }
    async function capture(expected) {
      if (!active() || expected !== generation) return null;
      const template = RI.C().theme.resume, imported = RI.IMPORTED_TEMPLATES?.[template] ? RI.importedSpec(template) : null;
      const captured = core.project(RI.C(), imported), output = [];let characters=0;nextBatch=null;
      for (let i = 0; i < captured.length; i += 16) {
        if (!active() || expected !== generation || RI.C().theme.resume !== template) return null;
        for (const [offset,s] of captured.slice(i, i + 16).entries()) {
          if (s.provenance === 'template-example') {
            const target = s.section + ':' + s.itemId + ':' + s.field, digest = await sha(s.raw);
            if (session.state.confirmations[target] === digest) s.provenance = 'user-confirmed';
          }
          if(!['user-authored','user-confirmed'].includes(s.provenance)){output.push({...s,raw:''});continue;}
          if(i+offset<batchStart){output.push({...s,raw:'',deferred:true});continue;}
          if(characters+s.raw.length>100000){if(nextBatch===null)nextBatch=i+offset;output.push({...s,raw:'',deferred:true});}else{characters+=s.raw.length;output.push(s);}
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const input = { sources: output, context: { goal: goal.value, job: session.job }, privateContacts: RI.C().contacts.filter(c => !c.public && c.value).map(c => c.value), analysisDate: new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) };
      const digest = await sha(JSON.stringify([core.VERSION, epoch, slot, template, expected, input]));
      return active() && expected === generation ? { input, digest } : null;
    }
    function ensureWorker() {
      if (worker) return;
      worker = new Worker('/dashboard/js/advisor-worker.js?v=' + encodeURIComponent(document.documentElement.dataset.assetVersion || ''));
      worker.onmessage = ({ data }) => {
        if (!active() || data.token !== token) return;
        clearTimeout(watchdog); running = false;
        if (data.type === 'result') { result = data.result; stale = false; error = ''; }
        else error = 'بررسی انجام نشد. با «بررسی الآن» دوباره تلاش کن.';
        paint(); if (pending) { pending = false; schedule(); }
      };
      worker.onerror = () => { stopWorker(); if (active()) { error = 'ابزار بررسی بارگذاری نشد؛ بررسی الآن را دوباره بزن.'; paint(); } };
    }
    async function run() {
      if (!active() || document.hidden) return;
      if (running) { pending = true; return; }
      running = true; error = ''; paint(); const expected = generation;
      try {
        const snapshot = await capture(expected);
        if (!snapshot) { running = false; if (active()) schedule(); return; }
        sources = snapshot.input.sources; token = snapshot.digest;
        ensureWorker(); worker.postMessage({ type: 'analyze', token, input: snapshot.input });
        watchdog = setTimeout(() => { stopWorker(); if (active()) { error = 'این بررسی طولانی شد؛ متن حفظ شده است. دوباره بررسی کن.'; paint(); } }, 1500);
      } catch { stopWorker(); if (active()) { error = 'بررسی در این مرورگر آماده نشد؛ تغییرات رزومه حفظ شده‌اند.'; paint(); } }
    }
    function schedule() { clearTimeout(timer); if (!session.paused && active() && !document.hidden) timer = setTimeout(run, 700); }
    function invalidate(reset) { if(reset!==false)batchStart=0;generation++; stale = true; token = '';clearTimeout(watchdog);worker?.postMessage({type:'cancel'});running=false;paint();schedule(); }
    const off = RI.on('change', invalidate), offClear = RI.on('advisor-clear', () => { result = null;sources=[];alive=false;clearTimeout(timer);stopWorker();channel?.close();session.job='';session.state={context:{goal:''},feedback:{},confirmations:{}};goal.value='';job.value='';host.replaceChildren(); });
    RI.confirmAdvisorSource=async(target,raw)=>{
      if(!active())return;
      const digest=await sha(raw);
      if(await persist([{kind:'confirm',target,digest}])){invalidate();RI.toast('واقعی‌بودن همین نسخهٔ متن برای مشاور تأیید شد');}
    };
    const visible = () => { if (document.hidden) { clearTimeout(timer); stopWorker(); } else schedule(); };
    document.addEventListener('visibilitychange', visible);
    goal.addEventListener('input',invalidate);
    goal.addEventListener('change', async () => { const submitted=goal.value;await persist([{kind:'context',goal:submitted}]);if(goal.value!==submitted)invalidate(); });
    host.querySelector('#advisor-section').addEventListener('change',event=>{sectionFilter=event.target.value;findingPage=0;paint();});
    RI.delegate(host,'click','[data-advisor-page]',(event,button)=>{findingPage+=Number(button.dataset.advisorPage);paint();});
    RI.delegate(host,'click','[data-advisor-review-source]',()=>{const source=sources.find(s=>s.visibility==='public'&&s.provenance==='template-example'&&s.textRole==='description')||sources.find(s=>s.visibility==='public'&&s.provenance==='template-example');if(source)focusTarget({section:source.section,itemId:source.itemId,field:source.field});});
    RI.delegate(host,'click','[data-advisor-export]',()=>{
      if(!result||stale)return;
      const lines=['گزارش راهنمای کیفیت رزومیت',result.analysisDate,'پوشش: '+result.coverage.assessed+' از '+result.coverage.eligible+' فیلد',...result.findings.filter(f=>!feedbackHidden(f)).map(f=>f.message)];
      const url=URL.createObjectURL(new Blob([lines.join('\n\n')],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='resumeit-quality-'+result.analysisDate+'.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    job.addEventListener('input', () => { session.job = job.value; invalidate(); });
    RI.delegate(host, 'click', '[data-advisor-run]', async () => { if(!remoteReady)await loadState();clearTimeout(timer);if(running)stopWorker();run(); });
    RI.delegate(host,'click','[data-advisor-next-batch]',()=>{if(nextBatch===null)return;batchStart=nextBatch;invalidate(false);clearTimeout(timer);run();});
    RI.delegate(host, 'click', '[data-advisor-pause]', () => { session.paused = !session.paused; clearTimeout(timer); stopWorker(); paint(); if (!session.paused) schedule(); });
    RI.delegate(host, 'click', '[data-advisor-restore]', async () => { const ops = Object.keys(session.state.feedback).slice(0, 50).map(id => ({ kind: 'feedback', id, digest: '', value: 'restore' })); if (ops.length) await persist(ops); });
    RI.delegate(host, 'click', '[data-advisor-dismiss],[data-advisor-later]', async (e, b) => { const id = b.dataset.advisorDismiss || b.dataset.advisorLater, f = result?.findings.find(x => x.id === id); if (f) await persist([{ kind: 'feedback', id, digest: f.dependencyDigest, value: b.hasAttribute('data-advisor-dismiss') ? 'dismiss' : 'later' }]); });
    RI.delegate(host, 'click', '[data-advisor-focus],[data-advisor-apply]', async (e, b) => {
      const f = result?.findings.find(x => x.id === (b.dataset.advisorFocus || b.dataset.advisorApply)); if (!f) return;
      if (b.hasAttribute('data-advisor-focus')) { focusTarget(f.target); return; }
      const expected = generation, snapshot = await capture(expected);
      if (!snapshot || snapshot.digest !== token || stale || !core.safeRewrite(f.before, f.after, sources.find(s => s.section === f.target.section && s.itemId === f.target.itemId && s.field === f.target.field)?.maxLength || 0)) { RI.toast('متن تغییر کرده؛ دوباره بررسی کن', { kind: 'info' }); invalidate(); return; }
      const target = f.target.section === 'profile' ? RI.C().profile : RI.C()[f.target.section]?.find(x => x.id === f.target.itemId);
      if (!target || target[f.target.field] !== f.before) return;
      // Two history boundaries keep undo confined to this suggestion.
      RI.touch('advisor-before'); target[f.target.field] = f.after; RI.touch('advisor-apply'); RI.rerender(); RI.toast('ویرایش اعمال شد؛ با واگرد قابل بازگشت است');
    });
    async function loadState(){try{const next=await RI.dashboardRequest('advisor');if(active()){session.state=next.state;session.version=next.version;goal.value=next.state.context.goal;goal.disabled=false;remoteReady=true;invalidate();}}catch{if(active()){error='بازخوردهای ذخیره‌شده دریافت نشدند؛ برای تلاش دوباره «بررسی الآن» را بزن.';paint();}}}
    loadState();
    paint(); schedule();
    return () => { alive = false; clearTimeout(timer);clearTimeout(helpTimer); stopWorker(); off(); offClear();channel?.close(); document.removeEventListener('visibilitychange', visible);document.removeEventListener('pointerdown',closeHelp);document.removeEventListener('keydown',closeHelp); result = null; sources = [];RI.confirmAdvisorSource=null; };
  };
})();
