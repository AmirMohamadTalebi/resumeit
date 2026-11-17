// Where a visit came from (council C3-a): the page's own ?src= tag first, then the Referer's host, else "direct".
// Nine fixed buckets, so no address is ever stored; any other origin counts as "other". Host maps are anchored.
const TAGS = ['telegram', 'instagram', 'linkedin', 'whatsapp', 'jobsite', 'irmsg', 'google', 'other'];
const SOURCES = [...TAGS, 'direct'];
const HOSTS = [
  ['telegram', /^(?:[a-z0-9-]+\.)*(?:t\.me|telegram\.(?:org|me))$/],
  ['instagram', /^(?:[a-z0-9-]+\.)*instagram\.com$/],
  ['linkedin', /^(?:[a-z0-9-]+\.)*(?:linkedin\.com|lnkd\.in)$/],
  ['whatsapp', /^(?:[a-z0-9-]+\.)*(?:whatsapp\.com|wa\.me)$/],
  ['jobsite', /^(?:[a-z0-9-]+\.)*(?:jobinja\.ir|jobvision\.ir|irantalent\.com|e-estekhdam\.com)$/],
  ['irmsg', /^(?:[a-z0-9-]+\.)*(?:bale\.ai|eitaa\.com|rubika\.ir)$/],
  ['google', /^(?:www\.)?google\.(?:com|ir|co\.[a-z]{2}|[a-z]{2})$/],
];
function bucket(req, host) {
  let url; try { url = new URL(req.url, 'http://x'); } catch { return 'direct'; }
  const tag = url.searchParams.get('src'); if (TAGS.includes(tag)) return tag;
  let from; try { from = new URL(req.headers.referer).hostname.toLowerCase(); } catch { return 'direct'; }
  if (from === String(host || '').split(':')[0].toLowerCase()) return 'direct'; // a click inside the person's own pages
  return HOSTS.find(([, re]) => re.test(from))?.[0] || 'other';
}
module.exports = { bucket, SOURCES, TAGS };
