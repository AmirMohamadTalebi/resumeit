const {randomBytes,createHash,timingSafeEqual} = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const providers = {
  google:{authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',user:'https://openidconnect.googleapis.com/v1/userinfo',scope:'openid email profile'},
  github:{authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',user:'https://api.github.com/user',scope:'read:user'}
};
function config(name) {
  const prefix=name.toUpperCase(),clientId=process.env[prefix+'_CLIENT_ID']?.trim(),secret=process.env[prefix+'_CLIENT_SECRET']?.trim();
  let origin;
  try {
    const url=new URL(process.env.PUBLIC_ORIGIN);
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/' || (url.protocol!=='https:' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.origin)))return null;
    origin=url.origin;
  } catch {return null;}
  return clientId&&secret ? {...providers[name],clientId,secret,origin,callback:origin+'/api/auth/'+name+'/callback'} : null;
}
function oauthHandler(database,{oauthFetch=fetch}={}) {
  async function json(url,options={}) {
    const response=await oauthFetch(url,{...options,signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok)throw new Error('Provider request failed');
    return response.json();
  }
  return async (req,res,pathname) => {
    if(pathname==='/api/auth/providers' && req.method==='GET') {
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify(Object.fromEntries(Object.keys(providers).map(name=>[name,!!config(name)]))));return true;
    }
    const match=/^\/api\/auth\/(google|github)\/(start|callback)$/.exec(pathname);
    if(!match)return false;
    res.setHeader('Referrer-Policy','no-referrer');
    const [,name,action]=match,settings=config(name),cookieName='ri_oauth_'+name;
    const redirect=location=>{res.writeHead(303,{Location:location});res.end();};
    const cookie=(value,age)=>`${cookieName}=${value}; Path=/api/auth/${name}/; HttpOnly; SameSite=Lax; Max-Age=${age}${settings?.origin.startsWith('https:')?'; Secure':''}`;
    const fail=code=>redirect('/login/?social_error='+code);
    if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});res.end();return true;}
    if(!settings){fail('unavailable');return true;}
    try {
      if(action==='start') {
        if(req.headers['sec-fetch-site']==='cross-site'){fail('invalid');return true;}
        const ip=hash(req.socket.remoteAddress||'unknown');
        if(!await database.claimLoginAttempts('oauth:'+ip,ip)){fail('limited');return true;}
        const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
        const link=new URL(req.url,settings.origin).searchParams.get('mode')==='link';
        const sessionCookie=/(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
        const owner=link&&sessionCookie?await database.session(hash(sessionCookie)):null;
        if(link&&!owner){fail('expired');return true;}
        await database.createOAuthState(hash(state),name,verifier,Date.now()+600000,owner?.id||null);
        res.setHeader('Set-Cookie',cookie(state,600));
        const url=new URL(settings.authorize);
        url.search=new URLSearchParams({client_id:settings.clientId,redirect_uri:settings.callback,response_type:'code',scope:settings.scope,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',...(name==='google'?{prompt:'select_account'}:{})});
        redirect(url.href);return true;
      }
      const query=new URL(req.url,settings.origin).searchParams,state=query.get('state');
      const browserState=new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9]{64})(?:;|$)').exec(req.headers.cookie||'')?.[1];
      if(query.getAll('state').length!==1 || !/^[a-f0-9]{64}$/.test(state||'') || !browserState || !timingSafeEqual(Buffer.from(state),Buffer.from(browserState))){fail('invalid');return true;}
      const pending=await database.consumeOAuthState(hash(state),name,Date.now());
      res.setHeader('Set-Cookie',cookie('',0));
      if(!pending){fail('expired');return true;}
      if(pending.owner_id){const current=/(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];const owner=current?await database.session(hash(current)):null;if(owner?.id!==pending.owner_id){fail('expired');return true;}}
      if(query.has('error')){fail('cancelled');return true;}
      const code=query.get('code');
      if(query.getAll('code').length!==1 || !code || code.length>2048){fail('invalid');return true;}
      const result=await json(settings.token,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:settings.clientId,client_secret:settings.secret,code,redirect_uri:settings.callback,grant_type:'authorization_code',code_verifier:pending.verifier}).toString()});
      if(result.error || typeof result.access_token!=='string' || !result.access_token || result.access_token.length>8192 || result.token_type?.toLowerCase()!=='bearer')throw new Error('Invalid token');
      const identity=await json(settings.user,{headers:{Accept:'application/json',Authorization:'Bearer '+result.access_token,'User-Agent':'ResumeIt'}});
      const subject=name==='google'?identity.sub:(Number.isSafeInteger(identity.id)&&identity.id>0?String(identity.id):null);
      if(typeof subject!=='string'||!/^\d{1,255}$/.test(subject))throw new Error('Invalid identity');
      const displayName=typeof identity.name==='string'?identity.name.slice(0,80):typeof identity.login==='string'?identity.login.slice(0,80):'';
      const user=await database.socialAccount(name,subject,displayName,pending.owner_id);
      if(pending.owner_id){redirect('/dashboard/settings/');return true;}
      const session=randomBytes(32).toString('hex');
      if(!await database.createSession(hash(session),user.id,Date.now()+7*86400000,user.password_hash,user.phone))throw new Error('Session changed');
      const previous=/(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
      if(previous)await database.deleteSession(hash(previous));
      res.setHeader('Set-Cookie',[cookie('',0),`ri_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${settings.origin.startsWith('https:')?'; Secure':''}`]);
      redirect('/dashboard/');
    } catch {fail('failed');}
    return true;
  };
}
module.exports={oauthHandler};
