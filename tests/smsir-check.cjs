const assert = require('node:assert/strict');
const { smsirConfig, sendVerificationSms } = require('../src/services/smsir.cjs');
(async () => {
  assert.throws(() => smsirConfig({}));
  const savedFetch = globalThis.fetch;
  const names = ['SMSIR_API_KEY', 'SMSIR_TEMPLATE_ID', 'SMSIR_CODE_PARAMETER'];
  const savedEnv = names.map(name => process.env[name]);
  Object.assign(process.env, { SMSIR_API_KEY: 'test-key', SMSIR_TEMPLATE_ID: '357964', SMSIR_CODE_PARAMETER: 'CODE' });
  let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.sms.ir/v1/send/verify/');
      assert.equal(options.headers['X-API-KEY'], 'test-key');
      assert.deepEqual(JSON.parse(options.body), { mobile: '09120000001', templateId: 357964, parameters: [{name:'CODE',value:'234567'}] });
      return { ok: true, json: async () => ({ status: 1, data: { messageId: 456 } }) };
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
