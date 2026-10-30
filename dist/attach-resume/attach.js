// Opened from a resume's message form: hands the signed-in person's published resume address back to that
// form. Only the address and the name shown on the resume leave this window, and only to a ResumeIt page.
(() => {
  'use strict';
  const host = document.getElementById('attach-body'), esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const to = new URLSearchParams(location.search).get('to') || '';
  let target = null;
  try { const u = new URL(to), base = location.hostname.replace(/^www\./, ''); if ((u.protocol === location.protocol) && (u.hostname === location.hostname || u.hostname.endsWith('.' + base))) target = u.origin; } catch {}
  const show = html => { host.innerHTML = html; };
  if (!target || !window.opener) { show('<p class="attach__state">این صفحه از فرم پیام یک رزومه باز می‌شود. پنجره را ببند و دوباره از همان فرم امتحان کن.</p>'); return; }
  fetch('/api/dashboard/my-resume', { credentials: 'same-origin', cache: 'no-store' }).then(async r => {
    if (r.status === 401) { show('<h1>اول وارد حسابت شو</h1><p>برای الصاق رزومه، وارد حساب ResumeIt خودت شو؛ بعد از ورود به همین صفحه برمی‌گردی.</p><a class="attach__btn" href="/login/?next=' + encodeURIComponent(location.pathname + location.search) + '">ورود به ResumeIt</a>'); return; }
    const data = await r.json(); if (!r.ok) throw Error(data.error || 'اطلاعات دریافت نشد');
    if (!data.url) { show('<h1>هنوز رزومهٔ منتشرشده‌ای نداری</h1><p>اول رزومه‌ات را از داشبورد منتشر کن؛ بعد می‌توانی آدرسش را به پیام‌ها الصاق کنی.</p><a class="attach__btn attach__btn--soft" href="/dashboard/resume/" target="_blank" rel="noopener">رفتن به داشبورد</a>'); return; }
    show('<h1>الصاق رزومهٔ تو به پیام</h1><p>این آدرس در فرم پیام قرار می‌گیرد؛ چیز دیگری از حسابت فرستاده نمی‌شود.</p><div class="attach__card"><b>' + esc(data.name || 'رزومهٔ من') + '</b><bdi dir="ltr">' + esc(data.url.replace(/^https?:\/\//, '')) + '</bdi></div><button type="button" class="attach__btn" id="attach-send">الصاق به پیام</button>');
    document.getElementById('attach-send').addEventListener('click', () => { window.opener.postMessage({ type: 'resumeit:attach-resume', url: data.url, name: data.name || '' }, target); window.close(); });
  }).catch(e => show('<p class="attach__state" role="alert">' + esc(e.message) + '</p>'));
})();
