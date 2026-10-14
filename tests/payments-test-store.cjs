const {fail}=require('../src/dashboard/model.cjs');
module.exports=db=>{
  const orders=new Map(),invoices=new Map(),balances=new Map(),credits=[];
  const previousDelete=db.deleteAccount;
  return {
    paymentOrders:orders,paymentCredits:credits,
    async invoice(id){return invoices.has(id)?structuredClone(invoices.get(id)):null;},
    async createInvoice(row){
      if(!Number.isSafeInteger(row.amount_toman)||row.amount_toman<2000||row.amount_toman>100000000||row.amount_toman%2000||!/^[a-z0-9_-]{16,64}$/i.test(row.request_id||''))fail('Invalid invoice');
      const old=[...invoices.values()].find(i=>i.user_id===row.user_id&&i.request_id===row.request_id);if(old){if(old.amount_toman!==row.amount_toman)fail('Amount differs',409);return structuredClone(old);}
      if([...invoices.values()].filter(i=>i.user_id===row.user_id&&i.created_at>row.created_at-15*60000).length>=10)fail('Too many invoices',429);
      invoices.set(row.id,structuredClone(row));return structuredClone(row);
    },
    async payment(id){return orders.has(id)?structuredClone(orders.get(id)):null;},
    async paymentsForUser(id){return [...orders.values()].filter(o=>o.user_id===id).sort((a,b)=>b.created_at-a.created_at).map(o=>structuredClone(o));},
    async createPayment(order){
      const sameId=orders.get(order.id);if(sameId){if(sameId.user_id!==order.user_id||sameId.provider!==order.provider||sameId.amount_toman!==order.amount_toman)fail('Different gateway selected',409);return {order:structuredClone(sameId),created:false};}
      const prior=[...orders.values()].find(o=>o.user_id===order.user_id&&o.provider===order.provider&&o.request_id===order.request_id);
      if(prior){if(prior.amount_toman!==order.amount_toman)fail('Amount differs',409);return {order:structuredClone(prior),created:false};}
      if([...orders.values()].filter(o=>o.user_id===order.user_id&&o.created_at>order.created_at-15*60000).length>=10)fail('Too many payments',429);
      const o={...order,status:'creating',token:null,ref_num:null,attempts:0,lease_until:0,next_attempt_at:0,verify_until:0};orders.set(o.id,o);return {order:structuredClone(o),created:true};
    },
    async paymentToken(id,token,time){Object.assign(orders.get(id),{token,status:'pending',updated_at:time});},
    async paymentStartFailed(id,time,code='TOKEN_FAILED'){Object.assign(orders.get(id),{status:'failed',last_error:code,updated_at:time});},
    async cancelPayment(id,time){const o=orders.get(id);if(o.status==='pending'&&!o.ref_num)Object.assign(o,{status:'cancelled',updated_at:time});},
    async receivePayment(id,ref,time){
      const o=orders.get(id);if(!o)return null;
      if(o.ref_num&&o.ref_num!==ref)fail('Receipt changed',409);
      if([...orders.values()].some(p=>p.id!==id&&p.provider===o.provider&&p.ref_num===ref))fail('Duplicate receipt',409);
      if(['paid','review','reversed','failed'].includes(o.status))return structuredClone(o);
      if(!o.ref_num)Object.assign(o,{ref_num:ref,status:'pending',verify_until:time+25*60000,next_attempt_at:time,updated_at:time});else if(o.provider==='zibal'&&['pending','cancelled','expired'].includes(o.status))Object.assign(o,{status:'pending',next_attempt_at:time,verify_until:Math.max(o.verify_until,time+25*60000)});return structuredClone(o);
    },
    async claimPayment(id,time){const o=orders.get(id);if(!o||!o.ref_num||!['pending','verifying'].includes(o.status)||o.lease_until>time||o.next_attempt_at>time)return null;if(o.verify_until<time||o.attempts>=12){o.status='review';o.last_error='VERIFY_EXPIRED';return null;}Object.assign(o,{status:'verifying',lease_key:require('node:crypto').randomUUID(),lease_until:time+30000,attempts:o.attempts+1});return structuredClone(o);},
    async releasePayment(id,lease,status,code,time,delay=30000){const o=orders.get(id);if(o.status==='verifying'&&o.lease_key===lease)Object.assign(o,{status,last_error:code,next_attempt_at:time+delay,updated_at:time,lease_until:0,lease_key:null});},
    async paymentUnpaid(id,lease,time){const o=orders.get(id);if(o.status==='verifying'&&o.lease_key===lease)Object.assign(o,{status:'pending',attempts:Math.max(0,o.attempts-1),last_error:null,next_attempt_at:time+60000,updated_at:time,lease_until:0,lease_key:null});},
    async completePayment(order,proof,time){const o=orders.get(order.id);if(o.status==='paid')return structuredClone(o);if(o.status!=='verifying'||o.lease_key!==order.lease_key)return null;if(!o.user_id)return {accountDeleted:true};if(proof.amountRial!==o.amount_toman*10)fail('Wrong amount',409);const balance=(balances.get(o.user_id)||0)+o.amount_toman;balances.set(o.user_id,balance);credits.push({id:o.id,user_id:o.user_id,amount:o.amount_toman,balance,at:time});Object.assign(o,{status:'paid',rrn:proof.rrn,trace:proof.trace,updated_at:time,lease_key:null,lease_until:0});return structuredClone(o);},
    async duePayments(time){for(const o of orders.values()){if(o.status==='creating'&&o.created_at<time-60000)Object.assign(o,{status:'failed',last_error:'TOKEN_INTERRUPTED',updated_at:time});if(o.status==='pending'&&!o.ref_num&&o.expires_at<=time)Object.assign(o,{status:'expired',last_error:'PAYMENT_EXPIRED',updated_at:time});}return [...orders.values()].filter(o=>o.ref_num&&['pending','verifying'].includes(o.status)&&o.next_attempt_at<=time&&o.lease_until<=time).slice(0,10).map(o=>({id:o.id}));},
    async wallet(id){return {balance:(balances.get(id)||0)/2000,rate:2000,transactions:credits.filter(c=>c.user_id===id).map(c=>({id:c.id,amount:c.amount/2000,balance:c.balance/2000,label:'شارژ کیف پول با سپ',at:c.at}))};},
    async deleteAccount(id){await previousDelete(id);for(const o of orders.values())if(o.user_id===id)o.user_id=null;for(const i of invoices.values())if(i.user_id===id)i.user_id=null;balances.delete(id);},
  };
};
