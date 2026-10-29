const assert=require('node:assert/strict');
const {RI}=require('../src/dashboard/render.cjs'),model=require('../src/dashboard/model.cjs');
const {contrast,onColor}=RI.color;
// Every palette, plus custom colours chosen to be awkward, on every resume and link template.
const seeds=[...RI.PALETTES.filter(p=>p.colors).map(p=>[p.id,p.colors]),...['#ffff00','#000080','#ffffff','#000000','#ff00ff','#7fffd4','#3d6b8a'].map(c=>['custom '+c,[c,RI.secondColor(c)]])];
let checked=0;
for(const t of RI.RESUME_TEMPLATES)for(const [name,colors] of seeds){
  const v=RI.harmonize(Object.assign({},t.v),colors),where=t.id+' / '+name;
  assert(contrast(v.accent,v.bg)>=4.5,'accent on background: '+where);
  assert(contrast(v.accent,v.surface)>=4.5,'accent on cards: '+where);
  assert(contrast(onColor(v.accent),v.accent)>=4.5,'text on accent fill: '+where);
  assert(contrast(v.muted,v.bg)>=4.5&&contrast(v.muted,v.surface)>=4.5,'secondary text: '+where);
  assert(contrast(v.accent2,v.bg)>=3,'second accent: '+where);
  assert(/^linear-gradient\(135deg,#[0-9a-f]{6},#[0-9a-f]{6}\)$/.test(v.hero)&&/^#[0-9a-f]{6}$/.test(v.line),'derived hero and line: '+where);
  checked++;
}
for(const t of [...RI.LINK_TEMPLATES,...RI.LINK_BGS.filter(b=>b.bg).map(b=>({id:'bg:'+b.id,v:{...RI.LINK_TEMPLATES[0].v,bg:b.bg,ink:b.ink,muted:b.muted}}))])for(const [name,colors] of seeds){
  const v=RI.harmonizeLinks(Object.assign({},t.v),colors),where=t.id+' / '+name;
  assert(contrast(v.btnInk,v.btnBg)>=4.5,'button text: '+where);
  assert(contrast(v.accent,RI.color.solid(v.bg))>=3,'highlight on page: '+where);assert(/^#[0-9a-f]{6}$/.test(v.btnBd),'button border: '+where);checked++;
}
// The default palette leaves the designer's colours untouched.
for(const t of RI.RESUME_TEMPLATES)assert.deepEqual(RI.harmonize(t.v,null),t.v);
// Imported templates: the accent family follows, greys, backgrounds and other brand colours stay.
const vista=['#00b894','#f59e0b'],navy=['#34508a','#c79a6b'];
assert.notEqual(RI.remapAccent('#009e7a',vista,navy,'#0c1117'),'#009e7a','accent hover shade follows the palette');
for(const keep of ['#0077b5','#ffffff','#111114','#666666','#25d366'])assert.equal(RI.remapAccent(keep,vista,navy,'#0c1117'),keep,keep+' keeps its value');
assert(contrast(RI.remapAccent('#00b894',vista,navy,'#0c1117'),'#0c1117')>=3,'recoloured accent readable on Vista');
// Custom colour: stored only as a six-digit code, and only with an active subscription.
const c=structuredClone(RI.seed('full'));c.theme.palette=c.theme.linksPalette='custom';c.theme.custom='#3D6B8A';
const sub={plan:{id:'y',end:Date.now()+86400000}};
assert.equal(model.content(c,sub,c).theme.custom,'#3D6B8A');
assert.equal(JSON.stringify(RI.paletteColors(c.theme)),JSON.stringify(['#3d6b8a',RI.secondColor('#3d6b8a')]));
for(const bad of ['red','#12345','#1234567','javascript:x'])assert.throws(()=>model.content({...c,theme:{...c.theme,custom:bad}},sub,c),/رنگ دلخواه/,bad);
const before=structuredClone(c);before.theme.palette=before.theme.linksPalette='default';
assert.throws(()=>model.content(c,{},before),/اشتراک/,'custom colour needs a subscription');
assert.equal(model.publicContent(c,{}).theme.palette,'default','an expired subscription falls back to the template colours');
console.log('PASS: '+checked+' template × palette pairs keep readable accent, card, fill, secondary text and link buttons; imported accents follow while brand colours stay; custom colour validated and gated.');
