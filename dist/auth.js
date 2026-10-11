const form = document.querySelector('form[data-mode]');
const digits = value => value.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const normalizePhone = value => digits(value.trim()).replace(/[\s()-]/g, '').replace(/^(\+98|0098)/, '0');
if (form) {
  const message = document.querySelector('#form-message'), submit = document.querySelector('#continue');
  const unavailable = () => { message.textContent = 'این روش هنوز فعال نیست؛ فعلاً با شماره و رمز حساب ساخته‌شده وارد شو.'; };
  document.querySelectorAll('[data-provider], [data-method="code"], #resend, #edit-phone').forEach(button => button.addEventListener('click', unavailable));
  if (form.dataset.mode !== 'login') { submit.disabled = true; unavailable(); }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.mode !== 'login' || submit.disabled) return;
    const phone = normalizePhone(form.elements.phone.value);
    if (!/^09\d{9}$/.test(phone)) { message.textContent = 'شمارهٔ موبایل معتبر وارد کن.'; form.elements.phone.focus(); return; }
    submit.disabled = true; form.setAttribute('aria-busy', 'true'); message.textContent = 'در حال ورود…';
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password: form.elements.password.value }) });
      const result = await response.json();
      if (!response.ok) { message.textContent = result.error || 'ورود انجام نشد.'; return; }
      form.elements.password.value = ''; location.assign('/dashboard/');
    } catch { message.textContent = 'ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.'; }
    finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
  });
  document.querySelector('.reveal-password')?.addEventListener('click', event => {
    const password = form.elements.password, visible = password.type === 'password';
    password.type = visible ? 'text' : 'password'; event.currentTarget.textContent = visible ? 'پنهان' : 'نمایش';
    event.currentTarget.setAttribute('aria-pressed', String(visible)); event.currentTarget.setAttribute('aria-label', visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
  });
}
