window.resumeitSession = fetch('/api/auth/session', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Session unavailable');
  const { user } = await response.json();
  if (!user) { location.replace('/login/'); return null; }
  return user;
}).catch(() => { location.replace('/login/'); return null; });
// Fetch the document alongside the session rather than adding a second network round trip.
window.resumeitDocument = fetch('/api/dashboard/document',{cache:'no-store',signal:AbortSignal.timeout(20000)}).then(async response=>{
  const doc=await response.json();return response.ok?doc:{error:doc.error||'اطلاعات صفحه دریافت نشد؛ دوباره تلاش کن'};
}).catch(()=>({error:'ارتباط با سرور برقرار نشد؛ دوباره تلاش کن'}));
