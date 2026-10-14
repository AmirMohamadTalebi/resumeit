module.exports=async()=>{
  const f=await require('./admin-fixture.cjs')();
  Object.assign(f.db,require('./payments-test-store.cjs')(f.db));
  let time=Date.now();
  const bank={payUrl:'https://sep.shaparak.ir/OnlinePG/OnlinePG',tokens:new Map(),tokenCalls:0,verifyCalls:0,reverseCalls:0,mode:'ok',
    async token(order,url,phone){this.tokenCalls++;this.tokens.set(order.id,{url,phone,order});if(this.mode==='token-error')throw Error('bank failed');return 'a'.repeat(32);},
    async verify(order){this.verifyCalls++;if(this.mode==='network')throw Error('network failed');if(this.mode==='rejected')return {ResultCode:-106,Success:false};return this.proof(order);},
    proof(order){return {ResultCode:this.mode==='duplicate'?2:0,Success:this.mode!=='duplicate',TransactionDetail:{RefNum:order.ref_num,TerminalNumber:order.terminal_id,OrginalAmount:order.amount_toman*10+(this.mode==='wrong-amount'?20000:0),RRN:'1200012345',StraceNo:'100123'}};},
    async reverse(order){this.reverseCalls++;if(this.mode==='reverse-error')throw Error('reverse failed');return this.proof(order);},
  };
  const previousList=f.db.adminList;
  f.db.adminList=async(kind,opts)=>{if(kind!=='payments')return previousList(kind,opts);const all=[...f.db.paymentOrders.values()].filter(o=>!opts.status||o.status===opts.status).filter(o=>!opts.q||o.id.includes(opts.q));return {rows:all.slice((opts.page-1)*25,opts.page*25).map(({secret_hash,token,lease_key,...o})=>o),total:all.length,page:opts.page,pageSize:25};};
  const options={payments:{env:{SEP_ENABLED:'true',SEP_TERMINAL_ID:'2015'},provider:bank,now:()=>time}};
  return {...f,bank,options,advance:ms=>time+=ms};
};
