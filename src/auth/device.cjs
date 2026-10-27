// A short, human label for a session's User-Agent; the raw string is never sent back to the browser.
function deviceLabel(agent){
  const ua=String(agent||'');
  if(!ua)return {browser:'مرورگر نامشخص',os:'',mobile:false};
  const browser=/Edg(e|A|iOS)?\//.test(ua)?'Edge':/OPR\/|Opera/.test(ua)?'Opera':/SamsungBrowser\//.test(ua)?'Samsung Internet':/Firefox\/|FxiOS\//.test(ua)?'Firefox':/Chrome\/|CriOS\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'مرورگر دیگر';
  const os=/Windows NT/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS X|Macintosh/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'';
  return {browser,os,mobile:/Mobile|Android|iPhone|iPad/.test(ua)};
}
module.exports={deviceLabel};
