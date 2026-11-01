const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const articles = fs.readdirSync(path.join(root, 'blog')).filter(s => fs.statSync(path.join(root, 'blog', s)).isDirectory());
const subjects = [...articles, 'resume-builder', 'resume-website', 'about'];
for (const subject of subjects) {
  for (const width of [640, 1200]) {
    const file = path.join(root, 'brand/editorial', `${subject}-${width}.webp`);
    const data = fs.readFileSync(file);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', file);
    assert(data.length < 180 * 1024, `image budget exceeded: ${file}`);
  }
  const route = articles.includes(subject) ? `blog/${subject}` : subject;
  const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
  assert(html.includes(`og:image\" content=\"https://resumeit.ir/brand/editorial/${subject}-1200.webp`), route);
  assert(html.includes('class="ri-editorial-figure lg-rise"'), route);
}
for (const route of ['blog', ...articles.map(s => `blog/${s}`), 'resume-builder', 'resume-website', 'about']) {
  const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
  for (const [tag] of html.matchAll(/<img[^>]*class="ri-editorial-image"[^>]*>/g)) {
    assert(/alt="[^"]+"/.test(tag), route);
    assert(tag.includes('loading="lazy"') && tag.includes('decoding="async"'), route);
    assert(tag.includes('width="1200" height="800"') && tag.includes('640w') && tag.includes('1200w'), route);
    for (const [, url] of tag.matchAll(/(?:src=")?(\/brand\/editorial\/[^"\s,]+)/g)) assert(fs.existsSync(path.join(root, url)), url);
  }
  assert(!html.includes('class="lg-post__cover"'), `placeholder cover in ${route}`);
}
console.log(`PASS editorial images: ${subjects.length} topics, responsive WebP, size budget, alt text, social covers and related cards.`);
