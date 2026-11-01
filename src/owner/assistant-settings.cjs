// Fandogh's owner settings: whether it answers at all, how answers are billed (dollar rate, margin, welcome and
// starter credit), and the language model it may speak
// through. Provider keys are kept apart from the settings, sealed with AES-256-GCM under a server secret
// (ASSISTANT_SECRET, else the database password), so a database dump alone does not reveal them.
const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('node:crypto');
const { fail } = require('../dashboard/model.cjs'), { RI } = require('../dashboard/render.cjs'), { PROVIDERS } = require('../ai/providers.cjs');

// Billing: the dollar rate (toman), the margin on the API price (%), credit for a new account and the starter credit
// each plan adds to the Fandogh wallet (toman).
const STARTER_KEYS = ['subscription', ...Object.keys(RI.ASSISTANT_PLANS)];
const billing = () => ({ dollar: 300000, markup: 50, welcome: RI.ASSISTANT_WELCOME, starter: { subscription: RI.ASSISTANT_SITE.credit, ...Object.fromEntries(Object.values(RI.ASSISTANT_PLANS).map(p => [p.id, p.credit])) } });
function defaults() {
  return {
    enabled: true,
    billing: billing(),
    ai: { enabled: false, provider: 'openai', temperature: 0.4, maxTokens: 1200, dailyCalls: 2000, smalltalk: false },
    providers: {},
    models: {},
  };
}
const int = (v, min, max, message) => { if (!Number.isSafeInteger(v) || v < min || v > max) fail(message); return v; };
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('تنظیمات دستیار معتبر نیست');
  const out = defaults(), ai = input.ai || {};
  if (typeof input.enabled !== 'boolean') fail('روشن یا خاموش بودن دستیار را مشخص کن');
  out.enabled = input.enabled;
  const bill = input.billing;
  if (!bill || typeof bill !== 'object' || Array.isArray(bill) || !bill.starter || typeof bill.starter !== 'object') fail('تنظیمات هزینه معتبر نیست');
  out.billing = { dollar: int(bill.dollar, 1000, 100000000, 'نرخ دلار باید عددی مثبت (تومان) باشد'), markup: int(bill.markup, 0, 1000, 'سود روی قیمت باید بین ۰ تا ۱۰۰۰ درصد باشد'), welcome: int(bill.welcome, 0, 10000000, 'اعتبار هدیهٔ حساب تازه باید عددی بین ۰ تا ۱۰ میلیون تومان باشد'), starter: {} };
  for (const key of STARTER_KEYS) out.billing.starter[key] = int(bill.starter[key], 0, 100000000, 'اعتبار اولیهٔ هر اشتراک باید عددی نامنفی (تومان) باشد');
  if (typeof ai !== 'object' || Array.isArray(ai) || typeof ai.enabled !== 'boolean' || typeof ai.smalltalk !== 'boolean' || !Object.hasOwn(PROVIDERS, ai.provider)) fail('تنظیمات اتصال هوش مصنوعی معتبر نیست');
  if (typeof ai.temperature !== 'number' || !(ai.temperature >= 0 && ai.temperature <= 1)) fail('خلاقیت پاسخ باید بین ۰ تا ۱ باشد');
  out.ai = { enabled: ai.enabled, provider: ai.provider, smalltalk: ai.smalltalk, temperature: Math.round(ai.temperature * 100) / 100,
    maxTokens: int(ai.maxTokens, 100, 2000, 'طول پاسخ باید بین ۱۰۰ تا ۲۰۰۰ توکن باشد'), dailyCalls: int(ai.dailyCalls, 1, 1000000, 'سقف روزانهٔ فراخوانی باید عدد مثبت باشد') };
  const providers = input.providers || {};
  if (typeof providers !== 'object' || Array.isArray(providers)) fail('فهرست سرویس‌ها معتبر نیست');
  for (const [id, value] of Object.entries(providers)) {
    if (!Object.hasOwn(PROVIDERS, id) || !value || typeof value !== 'object' || Object.keys(value).some(k => !['model', 'url'].includes(k))) fail('سرویس ' + id + ' معتبر نیست');
    const model = String(value.model || '').trim(), url = String(value.url || '').trim().replace(/\/+$/, '');
    if (model && (model.length > 80 || !/^[\w.:/@-]+$/.test(model))) fail('نام مدل ' + PROVIDERS[id].label + ' معتبر نیست');
    if (url && (url.length > 200 || !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[\w.~%/-]*)?$/i.test(url))) fail('نشانی ' + PROVIDERS[id].label + ' باید با https شروع شود');
    if (id === 'custom' && !url && (model || ai.provider === 'custom')) fail('برای سرویس سازگار با OpenAI نشانی لازم است');
    out.providers[id] = { model, url: id === 'custom' ? url : '' };
  }
  out.models = require('../ai/catalog.cjs').validate(input.models, fail);
  return out;
}
// A new key per provider: a string to set, null to remove; anything else is refused.
function validateKeys(keys) {
  if (keys === undefined) return {};
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) fail('کلیدهای سرویس معتبر نیست');
  for (const [id, key] of Object.entries(keys)) {
    if (!Object.hasOwn(PROVIDERS, id)) fail('سرویس ' + id + ' معتبر نیست');
    if (key !== null && (typeof key !== 'string' || key.trim().length < 8 || key.length > 400 || /\s/.test(key.trim()))) fail('کلید ' + PROVIDERS[id].label + ' معتبر نیست');
  }
  return Object.fromEntries(Object.entries(keys).map(([id, key]) => [id, key === null ? null : key.trim()]));
}

const secret = (env = process.env) => createHash('sha256').update('resumeit-assistant:' + (env.ASSISTANT_SECRET || env.MYSQL_PASSWORD || 'local-development')).digest();
function seal(map, env) {
  if (!Object.keys(map).length) return null;
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret(env), iv), body = Buffer.concat([cipher.update(JSON.stringify(map), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}
// Keys that no longer open (the secret changed) read as missing, so the panel asks for them again.
function open(sealed, env) {
  if (!sealed) return {};
  try {
    const [v, iv, tag, body] = String(sealed).split('.'); if (v !== 'v1') return {};
    const decipher = createDecipheriv('aes-256-gcm', secret(env), Buffer.from(iv, 'base64')); decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'));
  } catch { return {}; }
}
const hint = key => key ? '…' + String(key).slice(-4) : '';
// The language model Fandogh speaks through right now, or null when it should use its own brain.
function runtime(settings, keys) {
  const ai = settings.ai, p = PROVIDERS[ai.provider], own = settings.providers[ai.provider] || {}, key = keys[ai.provider];
  if (!settings.enabled || !ai.enabled || !p || !key) return null;
  return { provider: ai.provider, key, model: own.model || p.model, url: own.url || p.url, temperature: ai.temperature, maxTokens: ai.maxTokens, timeout: 25000 };
}
module.exports = { defaults, validate, validateKeys, seal, open, hint, runtime };
