function smsirConfig(env = process.env) {
  const apiKey = env.SMSIR_API_KEY?.trim();
  const templateId = Number(env.SMSIR_TEMPLATE_ID || 357964);
  const parameter = env.SMSIR_CODE_PARAMETER?.trim() || 'CODE';
  if (!apiKey || !Number.isSafeInteger(templateId) || templateId <= 0 || !/^[A-Za-z0-9_]{1,100}$/.test(parameter)) {
    throw Object.assign(new Error('SMS.ir API key and approved template are required'),{code:'SMSIR_CONFIG'});
  }
  return { apiKey, templateId, parameter };
}

async function sendVerificationSms(phone, code) {
  if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new Error('Invalid verification SMS input');
  }
  const { apiKey, templateId, parameter } = smsirConfig();
  let response, result;
  try {
    response = await fetch('https://api.sms.ir/v1/send/verify/', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: phone, templateId, parameters: [{ name: parameter, value: code }] }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    });
    result = await response.json();
  } catch (error) {
    // A timeout may happen after submission; do not retry automatically and bill twice.
    throw Object.assign(new Error('SMS.ir submission could not be confirmed'),{code:error?.name==='TimeoutError'?'SMSIR_TIMEOUT':response?'SMSIR_BAD_JSON_'+response.status:'SMSIR_NETWORK'});
  }
  const messageId = result?.data?.messageId;
  if (!response.ok || result?.status !== 1 || !Number.isSafeInteger(messageId) || messageId <= 0) {
    throw Object.assign(new Error('SMS.ir rejected the verification SMS'),{code:'SMSIR_HTTP_'+response.status+'_STATUS_'+String(result?.status??'none').replace(/[^0-9a-z-]/gi,'').slice(0,8)});
  }
  // Submission success is not a handset delivery receipt.
  return { messageId };
}
module.exports = { sendVerificationSms, smsirConfig };
