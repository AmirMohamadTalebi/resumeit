// One JSON line per unexpected failure. Only the error's type and codes are logged: driver messages
// can echo phone numbers or other row values, so they never reach the log.
function logFailure(scope,req,error){
  if(process.env.RESUMEIT_QUIET_ERRORS==='1')return;
  const path=String(req?.url||'').split('?')[0].slice(0,200);
  console.error(JSON.stringify({event:'request_failed',scope,method:req?.method,path,name:error?.name||typeof error,code:typeof error?.code==='string'?error.code.slice(0,64):undefined,errno:Number.isSafeInteger(error?.errno)?error.errno:undefined,at:new Date().toISOString()}));
}
module.exports={logFailure};
