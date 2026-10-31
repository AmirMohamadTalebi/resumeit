// The «page not found» answer for every host: the site's own pages, people's subdomains and published addresses.
// It is one self-contained page (inline styles; only the font, logo and favicon load, and every host serves those),
// so it looks the same on a subdomain that serves nothing else. Missing files still get a short plain answer.
const fs=require('node:fs'),path=require('node:path');
const template=fs.readFileSync(path.join(__dirname,'not-found.html'),'utf8');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// home: the main site with a trailing slash; page: this address's own published page, when there is one.
function notFound(req,res,pathname,{home='/',page=null}={}){
  if(res.headersSent)return;
  if(/\.(?!html?$)[a-z0-9]{1,6}$/i.test(pathname)){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?undefined:'Not found');return;}
  const address=((req.headers.host||'').toLowerCase()+pathname).slice(0,90);
  const second=page?'<a class="btn btn--ghost" href="'+esc(page)+'">دیدن صفحهٔ اصلی این آدرس</a>':'<a class="btn btn--ghost" href="'+esc(home)+'contact/">ارتباط با پشتیبانی</a>';
  const body=Buffer.from(template.replaceAll('{{home}}',esc(home)).replace('{{address}}',esc(address)).replace('{{second}}',second));
  res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:body);
}
module.exports={notFound};
