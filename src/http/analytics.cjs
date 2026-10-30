// Site analytics from dashboardcloud.ir. On in production by default; ANALYTICS_TRACKING_ID sets another id
// (or turns it on locally) and ANALYTICS_TRACKING_ID=off turns it off. Admin pages and template files are never tracked.
const ANALYTICS_ORIGIN = 'https://dashboardcloud.ir';
const DEFAULT_ID = 'analytics_pc8np3incmlgf919bsnkesl0k8uhuger';

function trackingId() {
  const value = (process.env.ANALYTICS_TRACKING_ID || '').trim();
  if (value === 'off') return '';
  if (value) return /^[A-Za-z0-9_-]+$/.test(value) ? value : '';
  return process.env.NODE_ENV === 'production' ? DEFAULT_ID : '';
}

function analyticsTag(pathname) {
  const id = trackingId();
  if (!id || /^\/(admin|templates)\//i.test(pathname)) return '';
  return '<script defer src="' + ANALYTICS_ORIGIN + '/analytics/tracker.js" data-tracking-id="' + id + '"></script>';
}

module.exports = { ANALYTICS_ORIGIN, trackingId, analyticsTag };
