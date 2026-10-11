const assert = require('node:assert/strict');
const { smsirConfig, sendVerificationSms } = require('./smsir.cjs');
(async () => {
  assert.throws(() => smsirConfig({}));
  const savedFetch = globalThis.fetch;
  const names = ['SMSIR_API_KEY', 'SMSIR_LINE_NUMBER'];
  const savedEnv = names.map(name => process.env[name]);
  Object.assign(process.env, { SMSIR_API_KEY: 'test-key', SMSIR_LINE_NUMBER: '3000626252' });
  let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.sms.ir/v1/send/bulk/');
      assert.equal(options.headers['X-API-KEY'], 'test-key');
      assert.deepEqual(JSON.parse(options.body), { lineNumber: 3000626252, MessageText: 'کد تأیید ResumeIt: 234567\nاعتبار: ۲ دقیقه\nاین کد را در اختیار دیگران نگذارید.', Mobiles: ['09120000001'] });
      return { ok: true, json: async () => ({ status: 1, data: { messageIds: [456] } }) };
    };
    await assert.rejects(sendVerificationSms('invalid', '234567'));
    assert.equal(calls, 0);
    assert.deepEqual(await sendVerificationSms('09120000001', '234567'), { messageId: 456 });
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: 2, message: 'Do not expose provider details' }) });
    await assert.rejects(sendVerificationSms('09120000001', '234567'), /rejected/);
    globalThis.fetch = async () => { throw new Error('test-key'); };
    await assert.rejects(sendVerificationSms('09120000001', '234567'), /could not be confirmed/);
  } finally {
    globalThis.fetch = savedFetch;
    names.forEach((name, index) => { if (savedEnv[index] === undefined) delete process.env[name]; else process.env[name] = savedEnv[index]; });
  }
  console.log('PASS: SMS.ir request format, validation and safe failures; no real SMS sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
