const TOKEN_URL = 'https://sep.shaparak.ir/onlinepg/onlinepg';
const PAY_URL = 'https://sep.shaparak.ir/OnlinePG/OnlinePG';
const VERIFY_URL = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction';
const REVERSE_URL = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction';

function configuration(env = process.env) {
  const terminal = String(env.SEP_TERMINAL_ID || '').trim();
  return { enabled: ['true', '1'].includes(String(env.SEP_ENABLED||'').trim().toLowerCase()) && /^[1-9]\d{0,14}$/.test(terminal) && Number.isSafeInteger(Number(terminal)), terminal: Number(terminal) };
}

function createSep({ fetch: request = global.fetch } = {}) {
  const post=require('./transport.cjs')(request);
  return {
    payUrl: PAY_URL,
    async token(order, redirectUrl, phone) {
      const result = await post(TOKEN_URL, { Action: 'Token', TerminalId: order.terminal_id, Amount: Number(order.amount_toman) * 10, ResNum: order.id, RedirectUrl: redirectUrl, CellNumber: phone, TokenExpiryInMin: 20 });
      if (result.status !== 1 || typeof result.token !== 'string' || !/^[A-Za-z0-9+/=_-]{16,512}$/.test(result.token)) {const error=new Error('SEP_TOKEN_REJECTED');if(/^-?\d{1,6}$/.test(String(result.errorCode)))error.code='SEP_TOKEN_'+result.errorCode;throw error;}
      return result.token;
    },
    async verify(order) { return post(VERIFY_URL, { RefNum: order.ref_num, TerminalNumber: Number(order.terminal_id) }); },
    async reverse(order) { return post(REVERSE_URL, { RefNum: order.ref_num, TerminalNumber: Number(order.terminal_id) }); },
  };
}

function verifiedProof(result, order) {
  const detail = result?.TransactionDetail;
  if (![0, 2].includes(result?.ResultCode) || (result.ResultCode === 0 && result.Success !== true) || !detail || detail.RefNum !== order.ref_num || Number(detail.TerminalNumber) !== Number(order.terminal_id)) throw new Error('SEP_UNCONFIRMED');
  const amount = Number(detail.OrginalAmount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('SEP_INVALID_AMOUNT');
  return { amountRial: amount, rrn: String(detail.RRN || '').slice(0,50), trace: String(detail.StraceNo || '').slice(0,50) };
}
module.exports = { createSep, configuration, verifiedProof, TOKEN_URL, PAY_URL, VERIFY_URL, REVERSE_URL };
