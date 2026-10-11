window.resumeitSession = fetch('/api/auth/session', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Session unavailable');
  const { user } = await response.json();
  if (!user) { location.replace('/login/'); return null; }
  return user;
}).catch(() => { location.replace('/login/'); return null; });
