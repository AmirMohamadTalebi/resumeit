const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../dist/payments/checkout.js'),'utf8');
(async()=>{
 for(const valid of [false,true]){
  const error={hidden:true,textContent:''},button={disabled:false,textContent:''};let submit,redirect='';
  const form={reportValidity:()=>true,querySelector:()=>({value:'zibal',disabled:false}),addEventListener:(_,fn)=>submit=fn};
  const elements={'#invoice-error':error,'#invoice-pay':form,'#invoice-submit':button,'[data-invoice]':{dataset:{invoice:'sample'}},'[data-order]':null};
  vm.runInNewContext(source,{document:{querySelector:s=>elements[s]||null},window:{},location:{assign:url=>redirect=url},AbortSignal,JSON,Error,fetch:async()=>({ok:valid,headers:new Headers({'Content-Type':valid?'application/json':'text/html'}),json:async()=>({url:'/payments/zibal/redirect?id=sample'})})});
  await submit({preventDefault(){}});
  if(valid)assert.equal(redirect,'/payments/zibal/redirect?id=sample');else{assert.equal(redirect,'');assert.equal(button.disabled,false);assert.equal(error.hidden,false);assert(error.textContent.includes('پاسخ معتبر'));}
 }
 console.log('PASS checkout response handling; mocked browser fetch only, no gateway requests.');
})().catch(e=>{console.error(e);process.exitCode=1;});
