// This flag only gates the demo UI; real authorization must use a server session.
(() => {
  let active = false;
  try { active = sessionStorage.getItem('resumeit-demo-session') === '1'; } catch {}
  if (!active) location.replace('/login/');
})();
