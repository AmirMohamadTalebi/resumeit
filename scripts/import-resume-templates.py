"""Compile supplied offline templates into trusted markup and an editable data contract.

No WordPress, Elementor scripts, remote requests or user-supplied HTML are executed.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import argparse, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
DROP = set('script iframe object embed noscript meta base title form'.split())
REPEAT = set('pf-card blog-card soc-card tech-card tl-item edu-card testimonial thumb-slide project-item wp-active-we-price-box-1 wp-active-we-icon-box-wrapper elementor-widget-progress'.split())

class Node:
    def __init__(self, tag='', attrs=None, text=None):
        self.tag, self.attrs, self.text, self.children = tag, dict(attrs or []), text, []
    def alltext(self):
        return self.text or ' '.join(c.alltext() for c in self.children)

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root=Node('root'); self.stack=[self.root]
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs); self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i];break
    def handle_data(self,text):self.stack[-1].children.append(Node(text=text))

def walk(n):
    yield n
    for c in n.children:yield from walk(c)

class Compiler:
    def __init__(self,id,source):
        self.id,self.source=id,source.resolve();self.out=ROOT/'dist/templates'/id
        self.out.mkdir(parents=True,exist_ok=True)
        self.files={};self.missing=set();self.fields=[];self.groups=[];self.collections=[];self.colors={};self.backgrounds={};self.pages={};self.count=0
        self.htmlfiles=[p for p in source.rglob('*.html') if not any(x in p.relative_to(source).parts for x in ['wp-content','wp-includes','tag','category','author','page','team','project_category','portfolio-category','blog'])]
        # Archive indexes are retained; pagination/category/author copies are redundant.
        self.htmlfiles.sort(key=lambda p:(p!=source/'index.html',str(p)))
        self.pageids={p.resolve():('home' if p==source/'index.html' else 'p'+str(i)) for i,p in enumerate(self.htmlfiles)}
    def local(self,url,base):
        u=urlparse(url);rel=unquote(u.path)
        if u.scheme:
            marker='/vista/dark/' if self.id=='vista' else '/wp_themes/satiar/'
            if marker not in rel:return None
            rel=rel.split(marker,1)[1];base=self.source
        p=(base/rel).resolve()
        if not p.is_relative_to(self.source):return None
        if p.is_dir():p=p/'index.html'
        return p
    def asset(self,url,base):
        if not url or url.startswith(('data:','#')):return url
        p=self.local(url,base)
        if not p or not p.is_file():
            self.missing.add(url)
            if re.search(r'\.(png|jpe?g|webp|gif)(?:$|\?)',url):
                name='0000000000000000.svg'
                (self.out/name).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#dbe6ef"/><circle cx="50" cy="36" r="18" fill="#6f879b"/><path d="M18 89a32 32 0 0 1 64 0" fill="#6f879b"/></svg>',encoding='utf8')
                return '/templates/'+self.id+'/'+name
            return ''
        if p in self.files:return self.files[p]
        ext=p.suffix.lower()
        if ext not in ['.css','.png','.jpg','.jpeg','.webp','.svg','.gif','.woff','.woff2','.ttf']:return ''
        name=hashlib.sha256(str(p.relative_to(self.source)).encode()).hexdigest()[:16]+ext
        public='/templates/'+self.id+'/'+name;self.files[p]=public
        if ext=='.css':
            css=p.read_text(encoding='utf8',errors='replace')
            css=re.sub(r'@import\s+[^;]+;','',css,flags=re.I)
            css=re.sub(r'url\(\s*([\"\x27]?)(.*?)\1\s*\)',lambda m:self.css_image(m[2],p.parent),css)
            css=re.sub(r'#[0-9a-fA-F]{3,8}\b',self.color,css)
            (self.out/name).write_text(css.rstrip()+'\n',encoding='utf8')
        elif ext=='.svg':
            svg=p.read_text(encoding='utf8',errors='replace')
            if re.search(r'<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*[\"\x27](?:https?:|javascript:)',svg,re.I):return ''
            (self.out/name).write_text(svg,encoding='utf8')
        else:(self.out/name).write_bytes(p.read_bytes())
        return public
    def css_image(self,url,base):
        public=self.asset(url,base)
        if re.search(r'\.(png|jpe?g|webp|svg|gif)$',public):
            if public not in self.backgrounds:self.backgrounds[public]='background'+str(len(self.backgrounds))
            return 'var(--ri-'+self.backgrounds[public]+',url("'+public+'"))'
        return 'url("'+public+'")'
    def color(self,m):
        value=m.group().lower()
        if len(value) not in [4,7]:return value
        if len(value)==4:value='#'+''.join(c*2 for c in value[1:])
        if value not in self.colors:self.colors[value]='color'+str(len(self.colors))
        return 'var(--ri-'+self.colors[value]+','+value+')'
    def field(self,type,value,label,group,bind=None):
        self.count+=1;key='f'+str(self.count)
        f={'key':key,'type':type,'default':value,'label':label[:100],'group':group,'public':True,'max':3*1024*1024 if type=='image' else max(2000,len(value)+200) if type=='textarea' else 2048}
        if bind:f['bind']=bind
        self.fields.append(f);return {'field':key}
    def group(self,key,label,page):
        if not any(g['key']==key for g in self.groups):self.groups.append({'key':key,'label':label[:100] or 'بخش','page':page})
    def compile_node(self,n,page,group,base):
        if n.text is not None:
            if not n.text.strip():return n.text
            text=n.text.strip();bind=None
            if text in ['ماهان رضایی']:bind='name'
            if text=='با ساتیار خاص‌ترین':bind='name'
            if text=='سایت شخصی و رزومه ایران باش':bind='title'
            if text=='ایران ، تهران':bind='location'
            if text.startswith('با بیش از ۵ سال تجربه در توسعه وب'):bind='bio'
            return self.field('textarea' if len(text)>100 else 'text',text,text[:70],group,bind)
        if n.tag in DROP or n.tag=='style':return None
        if n.tag=='link':return None
        if n.tag in ['form','input','textarea','select','button'] and ('elementor-form' in n.attrs.get('class','') or n.tag=='input' and n.attrs.get('type')=='hidden'):return None
        a={};cls=n.attrs.get('class','')
        # Elementor roots and named sections provide natural editor groups.
        if n.tag=='section' or ('e-con' in cls.split() and 'data-id' in n.attrs and group.endswith(':body')):
            group=page+':'+(n.attrs.get('id') or n.attrs.get('data-id') or str(self.count))
            headings=[x.alltext() for x in walk(n) if x.tag in ['h1','h2','h3']]
            self.group(group,(headings[0] if headings else n.alltext()[:60]),page)
        if n.tag=='a':
            href=n.attrs.get('href','#');p=self.local(href,base);fragment=urlparse(href).fragment
            if p in self.pageids:destination='/?page='+self.pageids[p]+('#'+fragment if fragment else '')
            elif href.startswith('#'):destination=href
            elif href.startswith('https://') and not any(x in href for x in ['avadisweb.ir','ghaleblake.ir']):destination=href
            else:destination=''
            a['href']=self.field('link',destination,'مقصد لینک: '+(re.sub(r'\s+',' ',n.alltext())[:40] or 'آیکن'),group)
            a['rel']='noopener noreferrer';a['data-pv-link']='1'
        for k,v in n.attrs.items():
            if k.startswith('on') or k in ['href','srcset','sizes','action','method','srcdoc','data-settings','data-src','data-srcset'] or k.startswith('data-rocket'):continue
            if k=='src':
                url=self.asset(v,base)
                bind='avatar' if 'avatar.jpg' in v or 'men-hero.png' in v else None
                a[k]=self.field('image',url,'تصویر: '+(n.attrs.get('alt') or 'این بخش'),group,bind);continue
            if k=='style':
                v=re.sub(r'url\(\s*([\"\x27]?)(.*?)\1\s*\)',lambda m:self.css_image(m[2],base),v)
                v=re.sub(r'#[0-9a-fA-F]{3,8}\b',self.color,v)
            if k in ['fill','stroke'] and re.fullmatch(r'#[a-fA-F0-9]{3,6}',v):v=self.color(re.match(r'.*',v))
            if k in ['alt','title','aria-label','placeholder'] and v:a[k]=self.field('text',v,k+': '+v[:50],group)
            elif not k.startswith('data-') or k in ['data-id','data-elementor-type','data-elementor-id']:a[k]=v
        if n.tag=='img':a['loading']='lazy'
        children=[]
        for c in n.children:
            if c.tag and REPEAT.intersection(c.attrs.get('class','').split()):
                key='r'+str(len(self.collections)+1)
                self.collections.append(None)
                item=self.compile_node(c,page,group,base)
                self.collections[int(key[1:])-1]={'key':key,'label':c.alltext().strip()[:65] or 'تصویر / نمونه‌کار','group':group,'node':item}
                children.append({'collection':key});continue
            v=self.compile_node(c,page,group,base)
            if v is not None:children.append(v)
        result={'tag':n.tag,'attrs':a,'children':children}
        if 'elementor-progress-percentage' in cls:
            refs=[x for x in children if isinstance(x,dict) and 'field' in x]
            if refs:
                f=next(f for f in self.fields if f['key']==refs[0]['field']);f['type']='percent';f['label']='درصد مهارت (۰ تا ۱۰۰)'
        if 'elementor-progress-bar' in cls.split():
            refs=[x for x in children if isinstance(x,dict) and 'elementor-progress-percentage' in str(x.get('attrs',{}).get('class',''))]
            if refs:
                text=[x for x in refs[0].get('children',[]) if isinstance(x,dict) and 'field' in x]
                if text:result['progress']=text[0]['field']
        if n.tag=='svg' or (n.tag=='i' and re.search(r'(?:^| )(?:fa-|icon)',cls)):
            icon=self.field('icon','original','آیکن این بخش',group)
            result={'icon':icon['field'],'original':result}
        if any(g['key']==group for g in self.groups) and (n.tag in ['section','body'] or group.endswith(':'+n.attrs.get('data-id','!'))):result['group']=group
        return result
    def run(self):
        for p in self.htmlfiles:
            parsed=Parser();parsed.feed(p.read_text(encoding='utf8',errors='replace'))
            body=next((n for n in walk(parsed.root) if n.tag=='body'),None)
            if not body:continue
            page=self.pageids[p.resolve()];group=page+':body'
            title=next((n.alltext() for n in walk(parsed.root) if n.tag=='title'),p.stem)
            self.group(group,title,page)
            css=[]
            for n in walk(parsed.root):
                if n.tag=='link' and n.attrs.get('rel')=='stylesheet':
                    url=self.asset(n.attrs.get('href',''),p.parent)
                    if url and url not in css:css.append(url)
            inline=[]
            for n in walk(parsed.root):
                if n.tag=='style':
                    value=n.alltext();value=re.sub(r'url\(\s*([\"\x27]?)(.*?)\1\s*\)',lambda m:self.css_image(m[2],p.parent),value)
                    inline.append(re.sub(r'#[0-9a-fA-F]{3,8}\b',self.color,value))
            self.pages[page]={'title':title,'css':css,'inline':'\n'.join(inline),'bodyClass':body.attrs.get('class',''),'node':self.compile_node(body,page,group,p.parent)}
        obj={'id':self.id,'pages':self.pages,'fields':self.fields,'groups':self.groups,'collections':self.collections,'colors':self.colors,'backgrounds':self.backgrounds}
        (ROOT/'dist/dashboard/js'/('template-'+self.id+'.js')).write_text('/* Generated by scripts/import-resume-templates.py. Trusted source only. */\nwindow.RI.IMPORTED_TEMPLATES['+json.dumps(self.id)+']='+json.dumps(obj,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
        report={'id':self.id,'pages':len(self.pages),'fields':len(self.fields),'collections':len(self.collections),'assets':len(self.files),'missing':sorted(self.missing)}
        (ROOT/'docs'/('template-'+self.id+'-import.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args()
    Compiler('vista',args.source/'avadisweb.ir/vista/dark').run()
    Compiler('satiar',args.source/'ghaleblake.ir/wp_themes/satiar').run()
