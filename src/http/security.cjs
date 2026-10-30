const { ANALYTICS_ORIGIN } = require('./analytics.cjs');
const { createHash } = require('node:crypto');

function publicOrigin(req) {
  const configured = process.env.PUBLIC_ORIGIN;
  if (configured) {
    const url = new URL(configured);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        (url.protocol !== 'https:' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.origin))) throw new Error('Invalid PUBLIC_ORIGIN');
    return url.origin;
  }
  if (process.env.NODE_ENV === 'production' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) throw new Error('PUBLIC_ORIGIN is required');
  return 'http://' + req.headers.host;
}

function securityHeaders(res, origin, html = '', allowSameOriginFrame = false) {
  const analytics = html.includes(ANALYTICS_ORIGIN + '/analytics/tracker.js');
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes, body]) => !/\bsrc\s*=/i.test(attributes) && body.trim())
    .map(([, , body]) => "'sha256-" + createHash('sha256').update(body).digest('base64') + "'");
  res.setHeader('Content-Security-Policy', ["default-src 'self'", "script-src 'self' " + (analytics ? ANALYTICS_ORIGIN + ' ' : '') + hashes.join(' '), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:", "font-src 'self'", "connect-src 'self'" + (analytics ? ' ' + ANALYTICS_ORIGIN : ''), "object-src 'none'", "base-uri 'none'", allowSameOriginFrame ? "frame-ancestors 'self'" : "frame-ancestors 'none'", "form-action 'self'"].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', allowSameOriginFrame ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // Published pages live on subdomains; enable HSTS_INCLUDE_SUBDOMAINS once every subdomain is served over HTTPS.
  if (origin.startsWith('https:')) res.setHeader('Strict-Transport-Security', 'max-age=31536000' + (process.env.HSTS_INCLUDE_SUBDOMAINS === 'true' ? '; includeSubDomains' : ''));
}

async function readJson(req, limit = 2048) {
  const chunks = []; let size = 0;
  const oversized=()=>{req.resume();throw Object.assign(new Error('حجم درخواست بیش از حد مجاز است'),{status:413});};
  if(Number(req.headers['content-length'])>limit)oversized();
  // Preserve the socket so an oversized upload receives 413 instead of a connection reset.
  for await (const chunk of req.iterator({destroyOnReturn:false})) {
    size += chunk.length;
    if (size > limit) oversized();
    chunks.push(chunk);
  }
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new SyntaxError('ساختار درخواست معتبر نیست'), {status:400}); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new SyntaxError('درخواست باید یک شیء JSON باشد'), {status:400});
  return input;
}

module.exports = { publicOrigin, securityHeaders, readJson };
