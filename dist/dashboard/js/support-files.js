(function () {
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.ResumeSupportFiles={
    input(paid){return '<div class="field"><label class="field__label" for="ticket-files">پیوست گفت‌وگو</label><input class="file-input input" id="ticket-files" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" '+(paid?'multiple':'')+'><p class="field__hint">PNG، JPEG، WebP، PDF یا TXT · '+(paid?'تا ۵ فایل، هر فایل ۲ مگابایت؛ مجموع ۸ مگابایت':'یک فایل تا ۴۰۰ کیلوبایت؛ ظرفیت بیشتر با اشتراک')+'</p></div>';},
    links(files,staff){return (files||[]).map(file=>'<a class="btn btn--soft btn--sm" href="/api/dashboard/support/attachment?id='+encodeURIComponent(file.id)+(staff?'&staff=1':'')+'" download>'+esc(file.name)+' · '+Math.ceil(file.size/1024)+' KB</a>').join(' ');},
    async read(input,paid){
      const files=[...(input?.files||[])],limit=paid?2*1024*1024:400*1024;
      if(files.length>(paid?5:1)||files.some(f=>f.size>limit)||files.reduce((n,f)=>n+f.size,0)>8*1024*1024)throw new Error('تعداد یا حجم پیوست‌ها بیشتر از ظرفیت این حساب است.');
      return Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type||(/\.txt$/i.test(file.name)?'text/plain':''),data:String(reader.result).split(',')[1]});reader.onerror=()=>reject(new Error('خواندن پیوست انجام نشد'));reader.readAsDataURL(file);})));
    }
  };
})();
