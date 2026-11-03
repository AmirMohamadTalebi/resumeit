// Every email ResumeIt sends is built here, in one layout that follows the site: night sky header, gold accent,
// warm paper card. Inline styles and tables only, since mail apps ignore stylesheets. Each template returns
// { subject, text, html }; `templates` is also what the admin panel previews.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const origin = () => (process.env.PUBLIC_ORIGIN || 'https://resumeit.ir').replace(/\/$/, '');
const font = "Tahoma,'Segoe UI',Vazirmatn,Arial,sans-serif";

function button(label, url) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 4px"><tr><td style="border-radius:999px;background:#f0bd52"><a href="' + esc(url) + '" style="display:inline-block;padding:13px 30px;font:700 15px ' + font + ';color:#2b1a05;text-decoration:none;border-radius:999px">' + esc(label) + '</a></td></tr></table>';
}
function codeBox(code) {
  return '<div dir="ltr" style="margin:22px auto;max-width:300px;padding:16px 10px;border-radius:16px;background:#f4ece2;border:1px dashed #e2a03a;text-align:center;font:800 34px/1 \'Courier New\',monospace;letter-spacing:10px;color:#1d2c36">' + esc(code) + '</div>';
}
function note(text) {
  return '<p style="margin:18px 0 0;padding:12px 14px;border-radius:12px;background:#fbf6ee;border-right:3px solid #3d8c9c;font:13px/1.9 ' + font + ';color:#435867">' + esc(text) + '</p>';
}

// layout(): header + title + body + footer. `body` is trusted HTML built from escaped parts; `unsubscribe` is for promotions only.
function layout({ title, preheader, body, unsubscribe }) {
  const site = origin();
  return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + esc(title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#efe6da;direction:rtl">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc(preheader || title) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe6da"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:22px;overflow:hidden;background:#fffdf9;border:1px solid #e6dccf">' +
    '<tr><td align="center" style="padding:30px 24px 26px;background:#0b141b;background-image:linear-gradient(160deg,#1b3242 0%,#122230 55%,#0b141b 100%)">' +
    '<a href="' + esc(site) + '" style="text-decoration:none;font:800 26px ' + font + ';letter-spacing:.5px;color:#f0bd52">Resume<span style="color:#ffffff">It</span></a>' +
    '<div style="margin:12px auto 0;width:44px;height:3px;border-radius:3px;background:#e2a03a"></div></td></tr>' +
    '<tr><td style="padding:30px 30px 8px;font:15px/2 ' + font + ';color:#1d2c36"><h1 style="margin:0 0 12px;font:800 21px/1.6 ' + font + ';color:#1d2c36">' + esc(title) + '</h1>' + body + '</td></tr>' +
    '<tr><td style="padding:18px 30px 26px"><div style="border-top:1px solid #e6dccf;padding-top:16px;font:12px/2 ' + font + ';color:#5a7080;text-align:center">' +
    'این پیام را رزومیت برایت فرستاده است · <a href="' + esc(site) + '" style="color:#875a36">resumeit.ir</a><br>' +
    '<a href="' + esc(site) + '/contact/" style="color:#875a36">ارتباط با ما</a> · <a href="' + esc(site) + '/privacy/" style="color:#875a36">حریم خصوصی</a>' +
    (unsubscribe ? '<br>این ایمیل تبلیغاتی را چون پذیرفته بودی دریافت می‌کنی؛ <a href="' + esc(unsubscribe) + '" style="color:#875a36">لغو دریافت</a>' : '') +
    '</div></td></tr></table></td></tr></table></body></html>';
}

const p = text => '<p style="margin:0 0 10px">' + esc(text) + '</p>';
const done = (subject, lines, html) => ({ subject, text: lines.join('\n\n') + '\n\nرزومیت · resumeit.ir', html });

const templates = {
  'login-code': {
    label: 'کد ورود',
    sample: { code: '482915' },
    render: ({ code }) => done('کد ورود به رزومیت', ['کد ورود به حساب در رزومیت:\n\n' + code, 'این کد پنج دقیقه اعتبار دارد و فقط یک‌بار کار می‌کند. اگر خودت درخواستش نداده‌ای، این پیام را نادیده بگیر؛ بدون این کد کسی به حسابت وارد نمی‌شود.'],
      layout({ title: 'کد ورود تو', preheader: 'کد ورود به رزومیت', body: p('این کد را در صفحهٔ ورود وارد کن:') + codeBox(code) + p('کد پنج دقیقه اعتبار دارد و فقط یک‌بار کار می‌کند.') + note('اگر خودت درخواستش نداده‌ای، این پیام را نادیده بگیر؛ بدون این کد کسی به حسابت وارد نمی‌شود.') }))
  },
  'reset-code': {
    label: 'کد بازیابی رمز',
    sample: { code: '730256' },
    render: ({ code }) => done('کد بازیابی رمز رزومیت', ['کد بازیابی رمز عبور در رزومیت:\n\n' + code, 'این کد پنج دقیقه اعتبار دارد. اگر خودت درخواستش نداده‌ای، نیازی به کار دیگری نیست و رمزت همان می‌ماند.'],
      layout({ title: 'بازیابی رمز عبور', preheader: 'کد بازیابی رمز', body: p('برای انتخاب رمز تازه، این کد را در صفحهٔ بازیابی وارد کن:') + codeBox(code) + p('کد پنج دقیقه اعتبار دارد و فقط یک‌بار کار می‌کند.') + note('اگر خودت درخواستش نداده‌ای، نیازی به کار دیگری نیست و رمزت همان می‌ماند.') }))
  },
  'verify-email': {
    label: 'تأیید ایمیل حساب',
    sample: { code: '115904' },
    render: ({ code }) => done('تأیید ایمیل رزومیت', ['کد تأیید ایمیل: ' + code, 'اعتبار: ده دقیقه. این کد را در اختیار دیگران نگذار.'],
      layout({ title: 'ایمیلت را تأیید کن', preheader: 'کد تأیید ایمیل', body: p('کد زیر را در بخش اعلان‌ها یا تنظیمات حساب وارد کن. بعد از تأیید، می‌توانی با کد ایمیل وارد شوی و خبرهای مهم حسابت را همین‌جا بگیری.') + codeBox(code) + p('کد ده دقیقه اعتبار دارد.') + note('این کد را در اختیار دیگران نگذار. اگر خودت درخواستش نداده‌ای، نادیده‌اش بگیر.') }))
  },
  notification: {
    label: 'خبر مهم حساب',
    sample: { title: 'کیف پولت شارژ شد', body: 'مبلغ ۵۰۰٬۰۰۰ تومان به کیف پولت اضافه شد.', url: '/dashboard/wallet/' },
    render: ({ title, body, url }) => {
      const link = origin() + (String(url || '').startsWith('/') && !String(url).startsWith('//') ? url : '/dashboard/notifications/');
      // Message details stay in the account: mail travels unencrypted, so the body is only used when a caller passes one on purpose.
      const text = String(body || 'برای دیدن جزئیات وارد حسابت شو.').slice(0, 300);
      return done('رزومیت · ' + title, [title, text, 'برای دیدن جزئیات وارد حسابت شو: ' + link],
        layout({ title, preheader: text || title, body: (text ? p(text) : '') + button('دیدن جزئیات', link) + note('فقط برای خبرهای مهم ایمیل می‌فرستیم. از تنظیمات اعلان‌ها هر وقت خواستی می‌توانی آن را خاموش کنی.') }));
    }
  },
  'support-reply': {
    label: 'پاسخ پشتیبانی',
    sample: { title: 'پاسخ تازه برای درخواستت', body: 'تیم پشتیبانی به درخواست «مشکل در انتشار» پاسخ داد.', url: '/dashboard/support/' },
    render: data => templates.notification.render(data)
  },
  welcome: {
    label: 'خوش‌آمدگویی',
    sample: { name: 'رضا' },
    render: ({ name }) => done('به رزومیت خوش آمدی', ['سلام ' + (name || '') + '، حسابت ساخته شد.', 'رزومه و صفحهٔ لینکت را بساز و با یک آدرس منتشرشان کن: ' + origin() + '/dashboard/'],
      layout({ title: 'به رزومیت خوش آمدی' + (name ? '، ' + name : ''), preheader: 'حسابت آماده است', body: p('حسابت ساخته شد. رزومه و صفحهٔ لینکت را بساز و با یک آدرس همه‌جا بفرست.') + button('رفتن به داشبورد', origin() + '/dashboard/') }))
  },
  promo: {
    label: 'تبلیغاتی (نمونه)',
    sample: { title: 'قالب‌های تازه رسیدند', body: 'چند قالب رزومهٔ جدید به رزومیت اضافه شد؛ همین حالا ببین.', cta: 'دیدن قالب‌ها', url: '/dashboard/', unsubscribe: '/unsubscribe/sample' },
    render: ({ title, body, cta, url, unsubscribe }) => {
      const link = String(url || '').startsWith('http') ? url : origin() + (url || '/');
      const stop = String(unsubscribe || '').startsWith('http') ? unsubscribe : origin() + (unsubscribe || '/');
      return done(title, [title, body, (cta || 'ادامه') + ': ' + link, 'لغو دریافت ایمیل‌های تبلیغاتی: ' + stop],
        layout({ title, preheader: body, body: String(body || '').split(/\n+/).map(p).join('') + button(cta || 'ادامه', link), unsubscribe: stop }));
    }
  }
};

function render(kind, data = {}) {
  const template = templates[kind];
  if (!template) throw new Error('UNKNOWN_EMAIL_TEMPLATE');
  return template.render(data);
}
module.exports = { render, templates, layout, esc };
