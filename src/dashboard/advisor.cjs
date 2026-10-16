const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs');
const empty=()=>({context:{goal:''},feedback:{},confirmations:{}});
function operation(state,op){
  if(!op||typeof op!=='object')fail('تنظیم مشاور معتبر نیست');
  if(op.kind==='context'){
    if(typeof op.goal!=='string'||op.goal.length>160||/[\x00-\x1f]/.test(op.goal))fail('هدف را تا ۱۶۰ نویسه بنویس');
    state.context={goal:op.goal};
  }else if(op.kind==='feedback'){
    if(typeof op.id!=='string'||!/^[A-Z-]+:[a-z0-9]+$/.test(op.id)||typeof op.digest!=='string'||op.digest.length>100||!['dismiss','later','restore'].includes(op.value))fail('بازخورد معتبر نیست');
    if(op.value==='restore')delete state.feedback[op.id];
    else state.feedback[op.id]={digest:op.digest,value:op.value,until:op.value==='later'?Date.now()+86400000:null};
  }else if(op.kind==='confirm'){
    if(typeof op.target!=='string'||op.target.length>200||!/^template:(?:vista|satiar)(?::[a-z0-9_-]{1,64}){1,3}$/i.test(op.target)||!/^sha256:[a-f0-9]{64}$/.test(op.digest||''))fail('تأیید متن معتبر نیست');
    state.confirmations[op.target]=op.digest;
  }else fail('عملیات مشاور معتبر نیست');
  if(Object.keys(state.feedback).length>500||Object.keys(state.confirmations).length>500||Buffer.byteLength(JSON.stringify(state))>32768)fail('حافظهٔ بازخورد پر شده؛ ابتدا موارد انتخابی را بازگردان');
  return state;
}
async function handle(database,req,path,origin,user,slot,reply){
  if(path!=='/api/dashboard/advisor')return false;
  if(slot===3)fail('این جایگاه فقط صفحهٔ لینک دارد');
  if(req.method==='GET'){reply(200,await database.advisorState(user.id,slot));return true;}
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const input=await readJson(req,32768);
  if(!Number.isSafeInteger(input.version)||input.version<0||!Array.isArray(input.operations)||input.operations.length>50)fail('نسخه یا عملیات معتبر نیست');
  reply(200,await database.updateAdvisor(user.id,slot,input.version,input.operations));return true;
}
module.exports={empty,operation,handle};
