/* Fandogh's shared core for the quick panel (assistant-pet.js), the full studio page (pages/fandogh.js) and the
   settings page (pages/assistant.js): one way to ask (with the chosen model), the resume context that goes with a
   question, the before/after edit card with apply, undo and «show me», and a small, safe text formatter. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const store = (key, value) => { try { if (value === undefined) return localStorage.getItem(key); if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {} return null; };
  const F = RI.Fandogh = RI.Fandogh || {};
  F.store = store;
  F.editMode = () => store('ri-pet-edits-' + RI.ownerId) === 'auto' ? 'auto' : 'ask';
  F.setEditMode = mode => store('ri-pet-edits-' + RI.ownerId, mode === 'auto' ? 'auto' : null);
  F.goal = () => store('ri-pet-goal-' + RI.ownerId) || '';
  F.status = null;
  // Sections a question may carry; the studio can leave some out.
  F.SECTIONS = [['profile', 'معرفی و عنوان'], ['skills', 'مهارت‌ها'], ['experience', 'تجربه‌ها'], ['education', 'تحصیلات'], ['projects', 'پروژه‌ها'], ['certs', 'گواهی‌ها'], ['languages', 'زبان‌ها']];
  F.content = (only) => {
    const c = RI.C(), keep = k => !only || only.has(k), out = { contacts: c.contacts, socials: c.socials, sections: c.sections };
    for (const [k] of F.SECTIONS) out[k] = keep(k) ? c[k] : k === 'profile' ? { name: c.profile.name, title: '', bio: '', avatar: '' } : [];
    return out;
  };
  F.refresh = async () => { F.status = await RI.dashboardRequest('assistant'); document.dispatchEvent(new CustomEvent('ri:fandogh-status', { detail: F.status })); return F.status; };
  F.ask = async (question, o = {}) => {
    const r = await RI.dashboardRequest('assistant/ask', { question, goal: F.goal(), mode: o.mode || F.editMode(), page: document.body.dataset.page || '', model: o.model, history: o.history || [], content: F.content(o.only) }, o.signal ? { signal: o.signal } : undefined);
    F.status = r.usage; document.dispatchEvent(new CustomEvent('ri:fandogh-status', { detail: F.status }));
    return r.reply;
  };
  F.model = id => (F.status?.models || []).find(m => m.id === id);
  F.cost = m => !m ? '' : m.cost ? RI.fa(m.cost) + ' پیام' : 'رایگان';

  // A tiny formatter for answers: paragraphs, «-» and «۱.» lists, **bold** and `code`; everything escaped first.
  F.format = text => {
    const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const out = []; let list = null;
    for (const raw of String(text || '').split('\n')) {
      const line = raw.trim(), item = /^(?:[-•*]|[0-9۰-۹]+[.)])\s+(.*)$/.exec(line);
      if (item) { if (!list) { list = /^[-•*]/.test(line) ? 'ul' : 'ol'; out.push('<' + list + '>'); } out.push('<li>' + inline(item[1]) + '</li>'); continue; }
      if (list) { out.push('</' + list + '>'); list = null; }
      if (line) out.push('<p>' + inline(line) + '</p>');
    }
    if (list) out.push('</' + list + '>');
    return out.join('');
  };

  /* ---------- The edit card: before/after, per-edit ticks, apply or skip; then keep, show me or undo ---------- */
  const undo = new Map();
  const btn = (key, label, icon, primary) => '<button type="button" class="pet__act' + (primary ? ' pet__act--primary' : '') + '" data-edits-act="' + key + '">' + RI.icon(icon) + label + '</button>';
  function paint(card) {
    const s = card.dataset.state, n = card._edits.length;
    card.querySelector('[data-edits-title]').textContent = s === 'pending' ? (n > 1 ? RI.fa(n) + ' تغییر برای رزومه‌ات؛ تیک هر کدام را که نمی‌خواهی بردار' : 'یک تغییر برای رزومه‌ات') : s === 'applied' ? 'این تغییرها را در رزومه‌ات دادم' : s === 'undone' ? 'برگرداندم؛ رزومه مثل قبل شد' : 'باشه، چیزی عوض نشد';
    card.querySelectorAll('[data-edit-pick]').forEach(x => { x.disabled = s !== 'pending'; });
    card.querySelector('.pet-edits__acts').innerHTML = s === 'pending' ? btn('apply', 'اعمال کن', 'check', true) + btn('skip', 'نه، ممنون', 'x') : s === 'applied' ? btn('keep', 'خوبه', 'check', true) + btn('show', 'نشانم بده', 'eye') + btn('undo', 'برگردان', 'undo') : s === 'undone' ? btn('redo', 'دوباره اعمال کن', 'refresh') : '';
  }
  function apply(card) {
    const E = window.FandoghEdits, c = RI.C(); if (!E) return;
    const picked = card._edits.filter((e, i) => card.querySelector('[data-edit-pick="' + i + '"]')?.checked !== false);
    if (!picked.length) { card.dataset.state = 'skipped'; paint(card); return; }
    undo.set(card.dataset.edits, E.snapshot(c));
    const scopes = E.apply(c, picked); card._applied = picked;
    if (scopes.length) { RI.touch(scopes[0]); if (document.body.dataset.page !== 'fandogh') RI.rerender?.(); }
    card.dataset.state = 'applied'; paint(card);
    card._hooks.applied?.(picked);
  }
  function revert(card) {
    const snap = undo.get(card.dataset.edits); if (!snap) return;
    window.FandoghEdits.restore(RI.C(), snap); RI.touch('profile'); if (document.body.dataset.page !== 'fandogh') RI.rerender?.();
    card.dataset.state = 'undone'; paint(card); card._hooks.undone?.();
  }
  function show(card) {
    const e = (card._applied || [])[0]; if (!e) return;
    const target = e.op === 'set' || e.op === 'replace' ? { section: 'profile', field: e.field || 'bio' } : /skill/.test(e.op) ? { section: 'skills' } : { section: e.section, itemId: e.id, field: e.field };
    if (RI.resumeFocus && document.body.dataset.page === 'resume') RI.resumeFocus(target); else RI.go('resume', { step: target.section });
  }
  // hooks: applied(edits), undone(), note(text) — the caller keeps the conversation in step.
  F.editCard = (host, list, mode, hooks = {}) => {
    const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    host.insertAdjacentHTML('beforeend', '<div class="pet-edits" data-edits="' + id + '" data-state="pending"><div class="pet-edits__head"><i>' + RI.icon('edit') + '</i><b data-edits-title></b></div><ul>' + list.map((e, i) => '<li style="--i:' + i + '"><label><input type="checkbox" data-edit-pick="' + i + '" checked><span>' + esc(e.label) + '</span></label>' + (e.before ? '<del>' + esc(e.before.length > 160 ? e.before.slice(0, 158) + '…' : e.before) + '</del>' : '') + '<ins' + (e.after ? '' : ' class="is-gone"') + '>' + esc(e.after || 'حذف می‌شود') + '</ins></li>').join('') + '</ul><div class="pet-edits__acts"></div></div>');
    const card = host.querySelector('[data-edits="' + id + '"]'); card._edits = list; card._hooks = hooks;
    card.addEventListener('click', ev => {
      const t = ev.target.closest('[data-edits-act]'); if (!t) return; const k = t.dataset.editsAct;
      if (k === 'apply' || k === 'redo') apply(card);
      else if (k === 'undo') revert(card);
      else if (k === 'show') show(card);
      else if (k === 'skip') { card.dataset.state = 'skipped'; paint(card); hooks.note?.('(این تغییرها را نخواستم)'); }
      else if (k === 'keep') { card.querySelector('.pet-edits__acts').innerHTML = btn('undo', 'برگردان', 'undo'); hooks.kept?.(); }
    });
    if (mode === 'auto') apply(card); else paint(card);
    return card;
  };
  F.undoCard = card => revert(card);
})();
