function smsirConfig(env = process.env) {
  const apiKey = env.SMSIR_API_KEY?.trim();
  const lineNumber = Number(env.SMSIR_LINE_NUMBER);
  if (!apiKey || lineNumber !== 3000626252) {
    throw new Error('SMS.ir API key and the selected sender 3000626252 are required');
  }
  return { apiKey, lineNumber };
}

async function sendVerificationSms(phone, code) {
  if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new Error('Invalid verification SMS input');
  }
  const { apiKey, lineNumber } = smsirConfig();
  let response, result;
  try {
    response = await fetch('https://api.sms.ir/v1/send/bulk/', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineNumber, MessageText: `کد تأیید ResumeIt: ${code}\nاعتبار: ۲ دقیقه\nاین کد را در اختیار دیگران نگذارید.`, Mobiles: [phone] }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    });
    result = await response.json();
  } catch {
    // A timeout may happen after submission; do not retry automatically and bill twice.
    throw new Error('SMS.ir submission could not be confirmed');
  }
  const messageId = result?.data?.messageIds?.[0];
  if (!response.ok || result?.status !== 1 || !Number.isSafeInteger(messageId) || messageId <= 0) {
    throw new Error('SMS.ir rejected the verification SMS');
  }
  // Submission success is not a handset delivery receipt.
  return { messageId };
}
module.exports = { sendVerificationSms, smsirConfig };
