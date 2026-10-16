window.resumeitSession = fetch('/api/auth/session', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Session unavailable');
  const { user } = await response.json();
  if (!user) { location.replace('/login/'); return null; }
  if(window.BroadcastChannel){const channel=new BroadcastChannel('resumeit-session');channel.postMessage({owner:user.id});channel.close();}
  return user;
}).catch(() => { location.replace('/login/'); return null; });
// Fetch the document alongside the session rather than adding a second network round trip.
let workspace=1;try{const value=Number(new URLSearchParams(location.search).get('workspace')||sessionStorage.getItem('ri-workspace')||1);if(Number.isSafeInteger(value)&&value>=1&&value<=2147483647)workspace=value;sessionStorage.setItem('ri-workspace',String(workspace));}catch{}
window.resumeitDocument = fetch('/api/dashboard/document?workspace='+workspace,{cache:'no-store',signal:AbortSignal.timeout(20000)}).then(async response=>{
  const doc=await response.json();return response.ok?doc:{error:doc.error||'اطلاعات صفحه دریافت نشد؛ دوباره تلاش کن'};
}).catch(()=>({error:'ارتباط با سرور برقرار نشد؛ دوباره تلاش کن'}));
