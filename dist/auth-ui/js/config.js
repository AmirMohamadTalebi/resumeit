window.RIA=window.RIA||{};RIA.cfg={dashboardUrl:'/dashboard/',loginUrl:'/login/',signupUrl:'/register/',forgotUrl:'/forgot-password/',otpLength:6,otpResendSeconds:60,slowNoticeMs:4000};
RIA.destination = () => {
  const value=new URLSearchParams(location.search).get('next')||'/dashboard/';
  if(value.length>2048||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20\x7f]/.test(value))return '/dashboard/';
  try{const url=new URL(value,location.origin);return url.origin===location.origin&&/^\/dashboard\/(?:resume\/|links\/|themes\/|publish\/|studio\/|stats\/|billing\/|wallet\/|settings\/|support\/|notifications\/)?$/.test(url.pathname)?url.pathname+url.search+url.hash:'/dashboard/';}catch{return '/dashboard/';}
};
