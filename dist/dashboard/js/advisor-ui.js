/* دستیار رزومه: قدم‌های بعدی، مهارت‌های پیشنهادی و پیشنهادهای قابل‌اعمال روی متن خود کاربر.
   تحلیل در Worker انجام می‌شود؛ هیچ پیشنهادی متن ساختگی نمی‌سازد و اعمال فقط با کلیک کاربر است. */
(function () {
  'use strict';
  const RI = window.RI, core = window.ResumeAdvisor, esc = RI.esc;
  const sha = async text => 'sha256:' + [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const ROLE_LABELS = { development: 'برنامه‌نویسی', design: 'طراحی', data: 'تحلیل داده', marketing: 'بازاریابی', sales: 'فروش', support: 'پشتیبانی', accounting: 'حسابداری', teaching: 'تدریس', content: 'تولید محتوا', management: 'مدیریت پروژه' };
  const ROLE_GOALS = { development: 'توسعه‌دهندهٔ وب', design: 'طراح رابط کاربری', data: 'تحلیل‌گر داده', marketing: 'کارشناس بازاریابی دیجیتال', sales: 'کارشناس فروش', support: 'کارشناس پشتیبانی مشتری', accounting: 'حسابدار', teaching: 'مدرس', content: 'تولیدکنندهٔ محتوا', management: 'مدیر پروژه' };
  const KIND = { issue: ['نیاز به بررسی', 'alert'], rewrite: ['اصلاح یک‌کلیکی', 'zap'], 'add-skill': ['مهارت جاافتاده', 'plus'], question: ['برای قوی‌ترشدن', 'sparkle'] };
  const SECTION = { profile: 'معرفی', skills: 'مهارت‌ها', experience: 'تجربه', education: 'تحصیلات', projects: 'پروژه‌ها', certs: 'دوره‌ها', languages: 'زبان‌ها', contacts: 'تماس', socials: 'شبکه‌ها', template: 'قالب' };
  let memory;
  RI.advisorClear = () => { memory = null; RI.emit('advisor-clear'); };
  RI.mountAdvisor = function (host, opts = {}) {
    const owner = RI.ownerId, slot = RI.workspaceSlot, epoch = crypto.randomUUID();
    if (!memory || memory.owner !== owner || memory.slot !== slot) memory = { owner, slot, state: { context: { goal: '' }, feedback: {}, confirmations: {} }, version: 0, job: '', paused: false };
    const session = memory;
    let alive = true, generation = 0, timer, watchdog, worker, running = false, pending = false, result = null, token = '', sources = [], stale = true, error = '', saving = false, remoteReady = false, filter = '', showAll = false, batchStart = 0, nextBatch = null;
    const active = () => alive && RI.ownerId === owner && RI.workspaceSlot === slot && session === memory;
    const stopWorker = () => { clearTimeout(watchdog); worker?.terminate(); worker = null; running = false; };
    const hidden = f => { const v = session.state.feedback[f.id]; return v && (v.value === 'dismiss' || v.digest === f.dependencyDigest && v.until > Date.now()); };

    host.innerHTML = '<section class="ra" aria-labelledby="ra-title"><header class="ra__head"><span class="ra__spark">' + RI.icon('sparkle') + '</span><div><h2 id="ra-title">دستیار رزومه</h2><p data-advisor-summary role="status">در حال آماده‌سازی…</p></div><div class="ra__tools"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-advisor-help aria-label="این دستیار چه می‌کند؟" aria-expanded="false" aria-describedby="ra-help-' + epoch + '">' + RI.icon('info') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-advisor-run aria-label="بررسی دوباره">' + RI.icon('refresh') + '</button></div><span class="ra__tip" id="ra-help-' + epoch + '" role="tooltip" hidden>این دستیار متن رزومه‌ات را از نظر وضوح، نگارش، تاریخ‌ها و مهارت‌ها بررسی می‌کند و قدم بعدی را پیشنهاد می‌دهد. هیچ متنی از خودش نمی‌سازد و هر تغییر فقط با کلیک تو اعمال می‌شود. هدف شغلی اختیاری است و نبود پیشنهاد به معنی کامل‌بودن رزومه نیست.</span></header>' +
      '<div class="ra__goal"><label class="rs-field__label" for="advisor-goal">برای چه کاری رزومه می‌سازی؟</label><input class="input" id="advisor-goal" maxlength="160" placeholder="مثلاً توسعه‌دهندهٔ وب با React" disabled aria-describedby="advisor-goal-hint"><div class="ra__roles" data-advisor-roles></div><p class="field__hint" id="advisor-goal-hint" data-advisor-goalhint></p></div>' +
      '<div class="ra__block" data-advisor-next></div>' +
      '<div class="ra__block" data-advisor-skills></div>' +
      '<div class="ra__block"><div class="ra__bar"><h3>پیشنهادها روی متن تو</h3><label class="sr-only" for="advisor-section">بخش</label><select class="select input" id="advisor-section"><option value="">همهٔ بخش‌ها</option>' + Object.entries(SECTION).map(([k, l]) => '<option value="' + k + '">' + l + '</option>').join('') + '</select></div>' +
      '<aside class="ra__note" data-advisor-source-note hidden><p>متن‌های نمونهٔ قالب تا تأیید تو بررسی نمی‌شوند تا پیشنهادها بر اساس متن آماده نباشند.</p><button type="button" class="btn btn--soft btn--sm" data-advisor-review-source>' + RI.icon('resume') + 'بررسی متن‌های قالب</button></aside>' +
      '<div class="ra__list" data-advisor-findings></div><button type="button" class="btn btn--ghost btn--sm" data-advisor-more hidden></button><button type="button" class="btn btn--soft btn--sm" data-advisor-next-batch hidden>' + RI.icon('chevL') + 'بررسی بخش بعدی متن</button><p class="ra__status" data-advisor-status role="status"></p></div>' +
      '<details class="ra__job"><summary>' + RI.icon('briefcase') + 'مقایسه با یک آگهی شغلی</summary><label class="rs-field__label" for="advisor-job">متن آگهی را بچسبان؛ فقط در همین صفحه می‌ماند و ذخیره نمی‌شود.</label><textarea class="textarea" id="advisor-job" rows="4" maxlength="12000"></textarea><div data-advisor-matches></div></details>' +
      '<footer class="ra__foot"><small data-advisor-coverage></small><div class="btnrow"><button type="button" class="btn btn--ghost btn--sm" data-advisor-pause></button><button type="button" class="btn btn--ghost btn--sm" data-advisor-restore>بازگرداندن کنارگذاشته‌ها</button><button type="button" class="btn btn--ghost btn--sm" data-advisor-export>' + RI.icon('download') + 'گزارش</button></div></footer></section>';
    const $ = s => host.querySelector(s), goal = $('#advisor-goal'), job = $('#advisor-job');
    goal.value = session.state.context.goal; job.value = session.job;
    const helpButton = $('[data-advisor-help]'), tip = $('[role=tooltip]'); let pinned = false, tipTimer;
    const showTip = on => { clearTimeout(tipTimer); tip.hidden = !on; helpButton.setAttribute('aria-expanded', String(on)); };
    const leaveTip = () => { tipTimer = setTimeout(() => { if (!pinned && document.activeElement !== helpButton && !tip.matches(':hover')) showTip(false); }, 120); };
    helpButton.addEventListener('pointerenter', () => showTip(true)); helpButton.addEventListener('focus', () => showTip(true)); helpButton.addEventListener('pointerleave', leaveTip); helpButton.addEventListener('blur', leaveTip); tip.addEventListener('pointerleave', leaveTip);
    helpButton.addEventListener('click', e => { e.preventDefault(); pinned = !pinned; showTip(pinned); });
    const closeTip = e => { if (e.key === 'Escape' || e.type === 'pointerdown' && !helpButton.contains(e.target) && !tip.contains(e.target)) { if (e.key === 'Escape' && !tip.hidden) e.preventDefault(); pinned = false; showTip(false); } };
    document.addEventListener('pointerdown', closeTip); document.addEventListener('keydown', closeTip);
    RI.advisorGoal = () => goal.value;
    const channel = window.BroadcastChannel ? new BroadcastChannel('resumeit-session') : null;
    if (channel) channel.onmessage = ({ data }) => { if (data?.owner !== owner) RI.advisorClear(); };

    /* Completeness steps come from the content itself; they never block publishing. */
    function nextSteps() {
      const c = RI.C(), p = c.profile, spec = RI.resumeSpec(c.theme.resume), has = k => spec.sections.includes(k), steps = [];
      const push = (id, text, target, weight) => steps.push({ id, text, target, weight });
      if (!p.name.trim() || !p.title.trim()) push('basics', 'نام و عنوانت را بنویس؛ پایهٔ رزومه همین است.', { section: 'profile', field: p.name.trim() ? 'title' : 'name' }, 10);
      if (has('contacts') && !c.contacts.some(x => x.public && x.value.trim())) push('contact', 'یک راه تماس را عمومی کن تا کارفرما بتواند با تو حرف بزند.', { section: 'contacts' }, 9);
      if (!p.bio.trim()) push('bio', 'یک معرفی کوتاه دو سه جمله‌ای بنویس.', { section: 'profile', field: 'bio' }, 8);
      if (has('experience') && has('education') && !c.experience.length && !c.education.length) push('story', 'یک تجربهٔ کاری یا مقطع تحصیلی اضافه کن.', { section: has('experience') ? 'experience' : 'education' }, 8);
      if (has('skills') && c.skills.length < 3) push('skills', c.skills.length ? 'دست‌کم سه مهارت واقعی؛ الان ' + RI.fa(c.skills.length) + ' تا داری.' : 'مهارت‌هایت را اضافه کن؛ کارفرما اول این‌جا را نگاه می‌کند.', { section: 'skills' }, 7);
      if (has('projects') && !c.projects.length) push('projects', 'یک پروژه یا نمونه‌کار، حتی تمرینی، رزومه را باورپذیر می‌کند.', { section: 'projects' }, 6);
      if (!p.avatar) push('avatar', 'عکس پروفایل اعتماد بیشتری می‌سازد (اختیاری).', { section: 'profile', field: 'avatar' }, 3);
      if (has('languages') && !c.languages.length) push('languages', 'زبان‌هایی که بلدی را اضافه کن (اختیاری).', { section: 'languages' }, 2);
      for (const x of c.contacts.filter(x => x.public && x.value.trim())) {
        if (x.type === 'email' && !RI.isEmail(x.value)) push('email-' + x.id, 'ایمیل عمومی‌ات قابل کلیک نیست؛ یک بار بررسی‌اش کن.', { section: 'contacts' }, 5);
        if (x.type === 'website' && !RI.isUrl(x.value)) push('site-' + x.id, 'آدرس وب‌سایتت قابل کلیک نیست؛ مثل example.com بنویسش.', { section: 'contacts' }, 4);
      }
      const names = new Map(); for (const s of c.skills) { const k = s.name.trim().toLowerCase(); if (k) names.set(k, (names.get(k) || 0) + 1); }
      if ([...names.values()].some(n => n > 1)) steps.push({ id: 'dup-skills', text: 'چند مهارت تکراری داری؛ یکی‌شان کن.', action: 'merge-skills', weight: 5 });
      return steps.sort((a, b) => b.weight - a.weight);
    }
    function suggestedSkills() {
      const c = RI.C(), have = new Set(c.skills.map(x => x.name.trim().toLowerCase())), role = core.goalRole(goal.value);
      const fromText = (result && !stale ? result.findings.filter(f => f.ruleId === 'SKILL-FROM-TEXT' && !hidden(f)).map(f => ({ name: f.skill, why: 'در متن خودت آمده', id: f.id })) : []);
      const fromRole = core.roleSkills(role).filter(s => !fromText.some(x => x.name === s)).map(s => ({ name: s, why: 'معمول برای ' + (ROLE_LABELS[role] || 'هدفت') }));
      return [...fromText, ...fromRole].filter(x => !have.has(x.name.toLowerCase())).slice(0, 8);
    }
    const counts = () => { const map = {}; if (result && !stale) for (const f of result.findings) if (!hidden(f)) map[f.target.section] = (map[f.target.section] || 0) + 1; for (const s of nextSteps()) { const k = s.target?.section || 'skills'; map[k] = (map[k] || 0) + 1; } return map; };

    function paint() {
      if (!active()) return;
      const all = result && !stale ? result.findings.filter(f => !hidden(f) && f.ruleId !== 'SKILL-FROM-TEXT') : [], list = all.filter(f => !filter || f.target.section === filter), steps = nextSteps(), skills = suggestedSkills();
      const total = all.length + steps.length, limited = result && !stale && result.coverage?.unsupported;
      $('[data-advisor-summary]').textContent = error ? 'بررسی موقتاً در دسترس نیست' : running ? 'در حال خواندن متن…' : stale && result ? 'متن تغییر کرد؛ بررسی تازه در راه است' : limited ? 'بررسی محدود؛ متن‌های نمونهٔ قالب هنوز تأیید نشده‌اند' + (total ? ' · ' + RI.fa(total) + ' پیشنهاد' : '') : (all.length ? RI.fa(all.length) + ' پیشنهاد روی متن' : 'روی متن، پیشنهاد مهمی پیدا نشد') + (steps.length ? ' · ' + RI.fa(steps.length) + ' قدم بعدی' : '');
      const role = core.goalRole(goal.value);
      $('[data-advisor-roles]').innerHTML = Object.entries(ROLE_LABELS).map(([id, label]) => '<button type="button" class="rs-chipbtn" data-advisor-role="' + id + '" aria-pressed="' + (role === id) + '">' + esc(label) + '</button>').join('');
      $('[data-advisor-goalhint]').textContent = !goal.value.trim() ? 'اختیاری است؛ با هدف، پیشنهاد عنوان و مهارت دقیق‌تر می‌شود.' : role ? 'هدف شناخته شد: ' + ROLE_LABELS[role] + '. پیشنهادها بر همین اساس‌اند.' : 'برای این هدف فهرست تخصصی ندارم؛ بررسی متن همچنان انجام می‌شود.';
      $('[data-advisor-next]').innerHTML = steps.length ? '<h3>قدم‌های بعدی</h3><ol class="ra__steps">' + steps.slice(0, 5).map(s => '<li><span>' + esc(s.text) + '</span>' + (s.action ? '<button type="button" class="btn btn--soft btn--sm" data-advisor-merge>یکی کن</button>' : '<button type="button" class="btn btn--soft btn--sm" data-advisor-go="' + esc(JSON.stringify(s.target)) + '">برو</button>') + '</li>').join('') + '</ol>' : '<p class="ra__done">' + RI.icon('check') + 'پایه‌های رزومه کامل‌اند.</p>';
      $('[data-advisor-skills]').innerHTML = skills.length && RI.resumeSpec(RI.C().theme.resume).sections.includes('skills') ? '<h3>مهارت‌های پیشنهادی</h3><div class="ra__chips">' + skills.map(s => '<button type="button" class="rs-chipbtn" data-advisor-add-skill="' + esc(s.name) + '"' + (s.id ? ' data-finding="' + esc(s.id) + '"' : '') + ' title="' + esc(s.why) + '">' + RI.icon('plus') + esc(s.name) + '<small>' + esc(s.why) + '</small></button>').join('') + '</div>' : '';
      const shown = showAll ? list : list.slice(0, 4);
      $('[data-advisor-findings]').innerHTML = shown.map(f => { const [label, icon] = f.basis === 'goal' ? ['راهنمای متناسب با هدف', 'flag'] : KIND[f.type] || KIND.question;
        return '<article class="ra-card is-' + esc(f.type) + '"><div class="ra-card__head"><span class="ra-card__kind">' + RI.icon(icon) + label + '</span><span class="ra-card__where">' + esc(SECTION[f.target.section] || '') + '</span></div><p>' + esc(f.message) + '</p>' +
          (f.type === 'rewrite' ? '<div class="ra-diff"><del>' + esc(f.before.slice(0, 160)) + '</del><ins>' + esc(f.after.slice(0, 160)) + '</ins></div>' : f.private || !f.evidence?.length ? '' : '<blockquote>' + esc(f.evidence[0].raw.slice(0, 140)) + '</blockquote>') +
          '<div class="ra-card__actions">' + (f.type === 'rewrite' ? '<button type="button" class="btn btn--primary btn--sm" data-advisor-apply="' + esc(f.id) + '"' + (stale ? ' disabled' : '') + '>' + RI.icon('check') + 'اعمال</button>' : '') + '<button type="button" class="btn btn--soft btn--sm" data-advisor-focus="' + esc(f.id) + '">رفتن به متن</button><button type="button" class="btn btn--ghost btn--sm" data-advisor-later="' + esc(f.id) + '">فردا</button><button type="button" class="btn btn--ghost btn--sm" data-advisor-dismiss="' + esc(f.id) + '">مرتبط نیست</button></div></article>'; }).join('') ||
        (result && !stale ? '<p class="ra__done">' + RI.icon('check') + (filter ? 'در این بخش پیشنهادی نیست.' : 'روی متن‌هایت پیشنهاد مهمی ندارم. این ارزیابی کامل توانایی‌ات نیست.') + '</p>' : '<p class="ra__wait">' + RI.sectionLoading('در حال خواندن متن رزومه…') + '</p>');
      $('[data-advisor-next-batch]').hidden = !result || stale || nextBatch === null;
      const more = $('[data-advisor-more]'); more.hidden = list.length <= 4; more.textContent = showAll ? 'نمایش کمتر' : 'نمایش همه (' + RI.fa(list.length) + ')';
      $('[data-advisor-source-note]').hidden = !result?.coverage?.unsupported || stale;
      $('[data-advisor-status]').textContent = error || (session.paused ? 'بررسی خودکار متوقف است.' : '');
      $('[data-advisor-coverage]').textContent = result?.coverage ? RI.fa(result.coverage.assessed) + ' متن بررسی شد' + (result.coverage.deferred ? ' · بقیه در بررسی بعدی' : '') : 'پیشنهادها فقط راهنما هستند و مانع انتشار نمی‌شوند.';
      $('[data-advisor-pause]').textContent = session.paused ? 'ادامهٔ بررسی خودکار' : 'توقف بررسی خودکار';
      $('[data-advisor-export]').disabled = !result || stale;
      const labels = { supported: 'کاربردش در متن دیده شد', partial: 'فقط نامش آمده', contradicted: 'در متن نفی شده', unknown: 'شاهد کافی نیست' };
      $('[data-advisor-matches]').innerHTML = result?.jobMatches?.length ? '<ul class="ra__matches">' + result.jobMatches.map(x => '<li class="is-' + x.status + '"><b>' + esc(core.lexicon.find(s => s.id === x.id)?.label || x.id) + '</b>' + labels[x.status] + '</li>').join('') + '</ul>' : job.value.trim() ? '<p class="field__hint">مهارت شناخته‌شده‌ای در آگهی پیدا نشد.</p>' : '';
      opts.counts?.(counts());
    }
    async function persist(operations) {
      if (!active() || !remoteReady || saving) { RI.toast('دستیار هنوز آماده نیست؛ کمی بعد دوباره امتحان کن', { kind: 'info' }); return false; }
      saving = true;
      try { const next = await RI.dashboardRequest('advisor', { version: session.version, operations }); if (!active()) return false; session.state = next.state; session.version = next.version; return true; }
      catch (e) { if (active()) { if (e.code === 'ADVISOR_CONFLICT') { const next = await RI.dashboardRequest('advisor').catch(() => null); if (next && active()) { session.state = next.state; session.version = next.version; goal.value = next.state.context.goal; } } RI.toast(e.message, { kind: 'error' }); } return false; }
      finally { saving = false; paint(); }
    }
    async function capture(expected) {
      if (!active() || expected !== generation) return null;
      const template = RI.C().theme.resume, imported = RI.IMPORTED_TEMPLATES?.[template] ? RI.effectiveTemplateSpec(template) : null;
      const captured = core.project(RI.C(), imported), output = []; let characters = 0; nextBatch = null;
      for (let i = 0; i < captured.length; i += 16) {
        if (!active() || expected !== generation || RI.C().theme.resume !== template) return null;
        for (const [offset, s] of captured.slice(i, i + 16).entries()) {
          if (s.provenance === 'template-example') { const target = s.section + ':' + s.itemId + ':' + s.field; if (session.state.confirmations[target] === await sha(s.raw)) s.provenance = 'user-confirmed'; }
          if (!['user-authored', 'user-confirmed'].includes(s.provenance)) { output.push({ ...s, raw: '' }); continue; }
          // Very long resumes are read in batches of 100k characters; the rest waits for «next batch».
          if (i + offset < batchStart) { output.push({ ...s, raw: '', deferred: true }); continue; }
          if (characters + s.raw.length > 100000) { if (nextBatch === null) nextBatch = i + offset; output.push({ ...s, raw: '', deferred: true }); } else { characters += s.raw.length; output.push(s); }
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const input = { sources: output, context: { goal: goal.value, job: session.job }, privateContacts: RI.C().contacts.filter(c => !c.public && c.value).map(c => c.value), analysisDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) };
      const digest = await sha(JSON.stringify([core.VERSION, epoch, slot, template, expected, input]));
      return active() && expected === generation ? { input, digest } : null;
    }
    function ensureWorker() {
      if (worker) return;
      worker = new Worker('/dashboard/js/advisor-worker.js?v=' + encodeURIComponent(document.documentElement.dataset.assetVersion || ''));
      worker.onmessage = ({ data }) => { if (!active() || data.token !== token) return; clearTimeout(watchdog); running = false; if (data.type === 'result') { result = data.result; stale = false; error = ''; } else error = 'بررسی انجام نشد؛ دکمهٔ بررسی دوباره را بزن.'; paint(); if (pending) { pending = false; schedule(); } };
      worker.onerror = () => { stopWorker(); if (active()) { error = 'ابزار بررسی بارگذاری نشد؛ دوباره امتحان کن.'; paint(); } };
    }
    async function run() {
      if (!active() || document.hidden) return;
      if (running) { pending = true; return; }
      running = true; error = ''; paint(); const expected = generation;
      try {
        const snapshot = await capture(expected);
        if (!snapshot) { running = false; if (active()) schedule(); return; }
        sources = snapshot.input.sources; token = snapshot.digest; ensureWorker(); worker.postMessage({ type: 'analyze', token, input: snapshot.input });
        watchdog = setTimeout(() => { stopWorker(); if (active()) { error = 'بررسی طولانی شد؛ متن حفظ شده است. دوباره بررسی کن.'; paint(); } }, 1500);
      } catch { stopWorker(); if (active()) { error = 'بررسی در این مرورگر آماده نشد؛ تغییرات رزومه حفظ شده‌اند.'; paint(); } }
    }
    function schedule() { clearTimeout(timer); if (!session.paused && active() && !document.hidden) timer = setTimeout(run, 700); }
    function invalidate(reset) { if (reset !== false) batchStart = 0; generation++; stale = true; token = ''; clearTimeout(watchdog); worker?.postMessage({ type: 'cancel' }); running = false; paint(); schedule(); }
    const findTarget = f => f.target.section === 'profile' ? RI.C().profile : RI.C()[f.target.section]?.find(x => x.id === f.target.itemId);
    const off = RI.on('change', invalidate), offClear = RI.on('advisor-clear', () => { result = null; sources = []; alive = false; clearTimeout(timer); stopWorker(); channel?.close(); session.job = ''; session.state = { context: { goal: '' }, feedback: {}, confirmations: {} }; host.replaceChildren(); });
    RI.confirmAdvisorSource = async (target, raw) => { if (!active()) return; const digest = await sha(raw); if (await persist([{ kind: 'confirm', target, digest }])) { invalidate(); RI.toast('واقعی‌بودن همین متن برای دستیار تأیید شد'); } };
    const visible = () => { if (document.hidden) { clearTimeout(timer); stopWorker(); } else schedule(); };
    document.addEventListener('visibilitychange', visible);
    const setGoal = async value => { goal.value = value; invalidate(); opts.goal?.(); const ok = await persist([{ kind: 'context', goal: value }]); if (ok && goal.value !== value) invalidate(); };
    goal.addEventListener('input', () => { invalidate(); opts.goal?.(); });
    goal.addEventListener('change', () => setGoal(goal.value));
    job.addEventListener('input', () => { session.job = job.value; invalidate(); });
    $('#advisor-section').addEventListener('change', e => { filter = e.target.value; showAll = false; paint(); });
    RI.delegate(host, 'click', '[data-advisor-role]', (e, b) => setGoal(core.goalRole(goal.value) === b.dataset.advisorRole ? '' : ROLE_GOALS[b.dataset.advisorRole]));
    RI.delegate(host, 'click', '[data-advisor-go]', (e, b) => { try { opts.focus?.(JSON.parse(b.dataset.advisorGo)); } catch {} });
    RI.delegate(host, 'click', '[data-advisor-next-batch]', () => { if (nextBatch === null) return; batchStart = nextBatch; invalidate(false); clearTimeout(timer); run(); });
    RI.delegate(host, 'click', '[data-advisor-more]', () => { showAll = !showAll; paint(); });
    RI.delegate(host, 'click', '[data-advisor-add-skill]', (e, b) => { if (RI.resumeStudioAddSkill?.(b.dataset.advisorAddSkill)) RI.toast('«' + b.dataset.advisorAddSkill + '» به مهارت‌ها اضافه شد'); });
    RI.delegate(host, 'click', '[data-advisor-merge]', () => { const c = RI.C(), seen = new Map(); c.skills = c.skills.filter(s => { const k = s.name.trim().toLowerCase(); if (!seen.has(k)) { seen.set(k, s); return true; } seen.get(k).level = Math.max(seen.get(k).level, s.level); return false; }); RI.touch('skills'); RI.rerender(); RI.toast('مهارت‌های تکراری یکی شدند؛ با واگرد برمی‌گردد'); });
    RI.delegate(host, 'click', '[data-advisor-review-source]', () => { const sample = x => x.visibility === 'public' && x.provenance === 'template-example', s = sources.find(x => sample(x) && x.textRole === 'description') || sources.find(sample); if (s) opts.focus?.({ section: s.section, itemId: s.itemId, field: s.field }); });
    RI.delegate(host, 'click', '[data-advisor-export]', () => {
      if (!result || stale) return;
      const lines = ['گزارش دستیار رزومهٔ رزومیت', result.analysisDate, ...nextSteps().map(s => '• ' + s.text), ...result.findings.filter(f => !hidden(f)).map(f => '• ' + f.message)];
      const url = URL.createObjectURL(new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' })), link = document.createElement('a'); link.href = url; link.download = 'resumeit-assistant-' + result.analysisDate + '.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    RI.delegate(host, 'click', '[data-advisor-run]', async () => { if (!remoteReady) await loadState(); clearTimeout(timer); if (running) stopWorker(); run(); });
    RI.delegate(host, 'click', '[data-advisor-pause]', () => { session.paused = !session.paused; clearTimeout(timer); stopWorker(); paint(); if (!session.paused) schedule(); });
    RI.delegate(host, 'click', '[data-advisor-restore]', async () => { const ops = Object.keys(session.state.feedback).slice(0, 50).map(id => ({ kind: 'feedback', id, digest: '', value: 'restore' })); if (ops.length) await persist(ops); });
    RI.delegate(host, 'click', '[data-advisor-dismiss],[data-advisor-later]', async (e, b) => { const id = b.dataset.advisorDismiss || b.dataset.advisorLater, f = result?.findings.find(x => x.id === id); if (f) await persist([{ kind: 'feedback', id, digest: f.dependencyDigest, value: b.hasAttribute('data-advisor-dismiss') ? 'dismiss' : 'later' }]); });
    RI.delegate(host, 'click', '[data-advisor-focus],[data-advisor-apply]', async (e, b) => {
      const f = result?.findings.find(x => x.id === (b.dataset.advisorFocus || b.dataset.advisorApply)); if (!f) return;
      if (b.hasAttribute('data-advisor-focus')) { opts.focus?.(f.target); return; }
      const expected = generation, snapshot = await capture(expected), max = sources.find(s => s.section === f.target.section && s.itemId === f.target.itemId && s.field === f.target.field)?.maxLength || 0;
      if (!snapshot || snapshot.digest !== token || stale || !core.safeApply(f, max)) { RI.toast('متن تغییر کرده؛ دوباره بررسی کن', { kind: 'info' }); invalidate(); return; }
      const target = findTarget(f); if (!target || target[f.target.field] !== f.before) return;
      // Two history boundaries keep undo confined to this suggestion.
      RI.touch('advisor-before'); target[f.target.field] = f.after; RI.touch('advisor-apply'); RI.rerender(); RI.toast('اعمال شد؛ با واگرد برمی‌گردد');
    });
    async function loadState() { try { const next = await RI.dashboardRequest('advisor'); if (active()) { session.state = next.state; session.version = next.version; goal.value = next.state.context.goal; goal.disabled = false; remoteReady = true; opts.goal?.(); invalidate(); } } catch { if (active()) { goal.disabled = false; error = 'تنظیمات ذخیره‌شدهٔ دستیار دریافت نشد؛ با دکمهٔ بررسی دوباره امتحان کن.'; paint(); } } }
    loadState(); paint(); schedule();
    return () => { alive = false; clearTimeout(timer); stopWorker(); off(); offClear(); channel?.close(); document.removeEventListener('visibilitychange', visible); document.removeEventListener('pointerdown', closeTip); document.removeEventListener('keydown', closeTip); clearTimeout(tipTimer); result = null; sources = []; RI.confirmAdvisorSource = null; delete RI.advisorGoal; };
  };
})();
