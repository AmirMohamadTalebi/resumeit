(function () {
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let styled=false;
  function style(){
    if(styled)return;styled=true;const css=document.createElement('style');css.dataset.supportFiles='';
    css.textContent='.sf-files{display:flex;flex-wrap:wrap;gap:6px;max-width:100%;min-width:0}'+
      '.sf-file{display:inline-flex;align-items:center;gap:8px;max-width:100%;min-width:0;min-height:40px;padding:5px 8px 5px 10px;border-radius:13px;background-color:#ffffff;color:#1b2a33;font-size:12.5px;font-weight:700;text-decoration:none;box-shadow:inset 0 0 0 1px #e3ecf0,0 6px 14px -12px rgba(28,45,56,.6);animation:sf-in .45s calc(var(--i,0)*.06s) cubic-bezier(.3,1.4,.5,1) backwards;transition:transform .35s cubic-bezier(.3,1.4,.5,1),box-shadow .25s}'+
      '.sf-file:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px #e2a03a,0 12px 22px -14px rgba(28,45,56,.6)}.sf-file:focus-visible{outline:2px solid #e2a03a;outline-offset:2px}'+
      '.sf-file>i{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:9px;font-size:9px;font-style:normal;font-weight:900;letter-spacing:.02em;color:#fff;background-color:#3d8c9c}.sf-file.is-pdf>i{background-color:#c4553d}.sf-file.is-txt>i{background-color:#5a7686}'+
      '.sf-file__name{display:flex;flex:1 1 auto;min-width:0;direction:ltr;unicode-bidi:isolate}.sf-file__stem{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;min-width:0}.sf-file__ext{flex:none;white-space:nowrap}'+
      '.sf-file small{flex:none;font-size:11px;font-weight:600;color:#56707e}.sf-file svg{flex:none;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:#b7772f;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}.sf-file:hover svg{transform:translateY(2px)}'+
      '@keyframes sf-in{from{opacity:0;transform:translateY(6px) scale(.94)}}@media (prefers-reduced-motion:reduce){.sf-file,.sf-file svg{animation:none;transition:none}}';
    document.head.append(css);
  }
  window.ResumeSupportFiles={
    input(paid){return '<div class="field"><label class="field__label" for="ticket-files">پیوست گفت‌وگو</label><input class="file-input input" id="ticket-files" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" '+(paid?'multiple':'')+'><p class="field__hint">PNG، JPEG، WebP، PDF یا TXT · '+(paid?'تا ۵ فایل، هر فایل ۲ مگابایت؛ مجموع ۸ مگابایت':'یک فایل تا ۴۰۰ کیلوبایت؛ ظرفیت بیشتر با اشتراک')+'</p></div>';},
    // A file chip: type badge, the name cut in the middle of its stem (the extension always shows) and the size; it never outgrows its bubble.
    links(files,staff){
      style();
      return (files||[]).length?'<span class="sf-files">'+(files||[]).map((file,i)=>{
        const name=String(file.name||'پیوست'),dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'',type=/\.pdf$/i.test(name)?'pdf':/\.(png|jpe?g|webp)$/i.test(name)?'img':'txt',kb=Math.max(1,Math.ceil(file.size/1024));
        return '<a class="sf-file is-'+type+'" style="--i:'+i+'" href="/api/dashboard/support/attachment?id='+encodeURIComponent(file.id)+(staff?'&staff=1':'')+'" download title="'+esc(name)+'" aria-label="دریافت '+esc(name)+'، '+kb+' KB"><i aria-hidden="true">'+(type==='pdf'?'PDF':type==='img'?'IMG':'TXT')+'</i><span class="sf-file__name"><span class="sf-file__stem">'+esc(stem)+'</span><span class="sf-file__ext">'+esc(ext)+'</span></span><small dir="ltr">'+(kb>=1024?(kb/1024).toFixed(1)+' MB':kb+' KB')+'</small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg></a>';
      }).join('')+'</span>':'';
    },
    async read(input,paid){
      const files=[...(input?.files||[])],limit=paid?2*1024*1024:400*1024;
      if(files.length>(paid?5:1)||files.some(f=>f.size>limit)||files.reduce((n,f)=>n+f.size,0)>8*1024*1024)throw new Error('تعداد یا حجم پیوست‌ها بیشتر از ظرفیت این حساب است.');
      return Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type||(/\.txt$/i.test(file.name)?'text/plain':''),data:String(reader.result).split(',')[1]});reader.onerror=()=>reject(new Error('خواندن پیوست انجام نشد'));reader.readAsDataURL(file);})));
    }
  };
})();
