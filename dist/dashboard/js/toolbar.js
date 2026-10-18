(function(){
 'use strict';
 document.getElementById('menuBtn').innerHTML=RI.icon('menu');
 document.getElementById('topPreview').innerHTML=RI.icon('external')+'<span class="hide-sm">مشاهدهٔ صفحه</span>';
 document.getElementById('undoBtn').innerHTML=RI.icon('undo')+'<span class="hide-sm">واگرد</span>';
 let publish=document.getElementById('topPublish');
 if(!publish){publish=document.createElement('button');publish.id='topPublish';publish.type='button';publish.className='btn btn-primary btn--primary btn--sm';publish.title='انتشار یا به‌روزرسانی صفحه‌ها';publish.setAttribute('aria-label','انتشار صفحه‌ها');document.querySelector('.topbar__actions').prepend(publish);}
 publish.innerHTML=RI.icon('rocket')+'<span>انتشار</span>';publish.addEventListener('click',()=>{if(!RI.resumePublicationReview?.())RI.openPublication();});
})();
