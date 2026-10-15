const {createHash,createECDH,ECDH}=require('node:crypto');
const emailPattern=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
function email(value){return typeof value==='string'&&value.length<=254&&emailPattern.test(value)?value.toLowerCase():null;}
function subscription(value){
  if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw Error('INVALID_SUBSCRIPTION');
  const url=new URL(value.endpoint),host=url.hostname;
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!(host==='fcm.googleapis.com'||host==='web.push.apple.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com')))throw Error('INVALID_PUSH_ENDPOINT');
  const keys={};for(const [key,size]of [['p256dh',65],['auth',16]]){const v=value.keys?.[key];if(typeof v!=='string'||!/^[\w-]+={0,2}$/.test(v)||Buffer.from(v,'base64url').length!==size)throw Error('INVALID_PUSH_KEY');keys[key]=v;}if(Buffer.from(keys.p256dh,'base64url')[0]!==4)throw Error('INVALID_PUSH_KEY');
  try{ECDH.convertKey(Buffer.from(keys.p256dh,'base64url'),'prime256v1');}catch{throw Error('INVALID_PUSH_KEY');}return {endpoint:url.href,keys};
}
function providers(env=process.env){
  const port=Number(env.SMTP_PORT||587),template=Number(env.SMSIR_NOTIFICATION_TEMPLATE_ID),smtp=!!(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD&&email(env.SMTP_FROM)&&Number.isSafeInteger(port)&&port>0&&port<=65535),sms=!!(env.SMSIR_API_KEY&&Number.isSafeInteger(template)&&template>0&&template!==Number(env.SMSIR_TEMPLATE_ID||357964));
  let push=false;try{const key=createECDH('prime256v1');key.setPrivateKey(Buffer.from(env.WEB_PUSH_PRIVATE_KEY||'','base64url'));const subject=env.WEB_PUSH_SUBJECT||'';push=key.getPublicKey().equals(Buffer.from(env.WEB_PUSH_PUBLIC_KEY||'','base64url'))&&(subject.startsWith('mailto:')?!!email(subject.slice(7)):new URL(subject).protocol==='https:');}catch{}
  let transport;
  return {
    available:{email:smtp,sms,push},publicKey:push?env.WEB_PUSH_PUBLIC_KEY:null,
    async mail(to,subject,text){if(!smtp||!email(to)||/[\r\n]/.test(subject))throw Error('EMAIL_NOT_CONFIGURED');transport||=require('nodemailer').createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:env.SMTP_SECURE==='true',requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});const result=await transport.sendMail({from:env.SMTP_FROM,to,subject,text,disableFileAccess:true,disableUrlAccess:true});if(!result.accepted?.includes(to))throw Error('EMAIL_NOT_ACCEPTED');return result.messageId;},
    async sms(phone,title){if(!sms||!/^09\d{9}$/.test(phone))throw Error('SMS_NOT_CONFIGURED');const name=env.SMSIR_NOTIFICATION_PARAMETER||'TITLE';if(!/^[A-Za-z0-9_]{1,100}$/.test(name))throw Error('SMS_PARAMETER_INVALID');const response=await fetch('https://api.sms.ir/v1/send/verify/',{method:'POST',headers:{'X-API-KEY':env.SMSIR_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({mobile:phone,templateId:Number(env.SMSIR_NOTIFICATION_TEMPLATE_ID),parameters:[{name,value:title.slice(0,25)}]}),signal:AbortSignal.timeout(10000),redirect:'error'});const result=await response.json();if(!response.ok||result.status!==1||!Number.isSafeInteger(result.data?.messageId))throw Error('SMS_NOT_ACCEPTED');return String(result.data.messageId);},
    async push(value,payload){if(!push)throw Error('PUSH_NOT_CONFIGURED');return require('web-push').sendNotification(subscription(value),JSON.stringify(payload),{vapidDetails:{subject:env.WEB_PUSH_SUBJECT,publicKey:env.WEB_PUSH_PUBLIC_KEY,privateKey:env.WEB_PUSH_PRIVATE_KEY},TTL:3600,timeout:10000,urgency:'normal'});},
    close(){transport?.close();}
  };
}
module.exports={providers,email,subscription,endpointId:value=>createHash('sha256').update(value).digest('hex')};
