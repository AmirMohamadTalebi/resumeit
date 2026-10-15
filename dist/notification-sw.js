'use strict';
function dashboardUrl(value){try{const url=new URL(value||'/dashboard/notifications/',self.location.origin);if(url.origin===self.location.origin&&url.pathname.startsWith('/dashboard/'))return url;}catch{}return null;}
self.addEventListener('push',event=>{
  let payload;try{payload=event.data?.json()||{};}catch{return;}
  const url=dashboardUrl(payload.url);if(!url)return;
  event.waitUntil(self.registration.showNotification('رزومیت',{body:'اعلان تازه‌ای در صندوق تو ثبت شده است.',icon:'/brand/resumeit-mark-v1.png',badge:'/brand/resumeit-mark-v1.png',tag:String(payload.tag||'resumeit').slice(0,100),data:{url:url.href}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=dashboardUrl(event.notification.data?.url);if(!url)return;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const active=windows.find(client=>new URL(client.url).origin===self.location.origin);if(active){await active.navigate(url.href);return active.focus();}return clients.openWindow(url.href);}));
});
