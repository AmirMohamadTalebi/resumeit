// Message form on published resumes: sends to <page>/message on the page's own host, and can borrow the
// visitor's own resume address from ResumeIt through a small window on the main site.
(() => {
  'use strict';
  const forms = document.querySelectorAll('[data-inbox-form]');
  if (!forms.length) return;
  const started = Date.now();
  for (const form of forms) {
    const status = form.querySelector('[data-inbox-status]'), button = form.querySelector('[type=submit]'), main = form.dataset.main, url = form.querySelector('[name=resumeUrl]');
    const say = (text, kind) => { status.textContent = text; status.dataset.kind = kind || ''; };
    form.querySelector('[data-inbox-attach]')?.addEventListener('click', () => {
      if (!main) return;
      const opened = window.open(main + '/attach-resume/?to=' + encodeURIComponent(location.origin), 'resumeit-attach', 'popup,width=460,height=620');
      if (!opened) say('مرورگر پنجره را مسدود کرد؛ آدرس رزومه‌ات را دستی بنویس.', 'error');
    });
    window.addEventListener('message', event => {
      if (!main || event.origin !== new URL(main).origin || event.data?.type !== 'resumeit:attach-resume' || typeof event.data.url !== 'string') return;
      url.value = event.data.url; say('آدرس رزومه‌ات الصاق شد.', 'ok'); url.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.preview) { say('در نسخهٔ منتشرشده، پیام مستقیم به صندوق پیام‌های داشبورد می‌رسد.', 'ok'); return; }
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      button.disabled = true; say('در حال ارسال…');
      try {
        const response = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, elapsed: Date.now() - started }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw Error(result.error || 'پیام ارسال نشد؛ کمی بعد دوباره امتحان کن');
        form.reset(); say('پیامت رسید. صاحب رزومه با راه تماسی که نوشتی جوابت را می‌دهد.', 'ok');
      } catch (e) { say(e.message === 'Failed to fetch' ? 'اتصال برقرار نشد؛ دوباره امتحان کن' : e.message, 'error'); }
      finally { button.disabled = false; }
    });
  }
})();
