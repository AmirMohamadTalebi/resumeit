const {fail}=require('../dashboard/model.cjs'),{publicOrder}=require('../payments/service.cjs');
const normalize=value=>String(value).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/ي/g,'ی').replace(/ك/g,'ک');
function filters(params){
 const type=params.get('type')||'ledger',page=Number(params.get('page')||1),q=normalize(params.get('q')||'').trim(),status=params.get('status')||'',from=params.get('from')||'',to=params.get('to')||'';
 if(!['ledger','bank','purchases'].includes(type)||!Number.isSafeInteger(page)||page<1||page>100000||q.length>100||!['','in','out','creating','pending','verifying','paid','failed','review','reversed','cancelled','expired'].includes(status)||[from,to].some(x=>x&&!/^\d{4}-\d{2}-\d{2}$/.test(x)))fail('فیلتر تاریخچه معتبر نیست');
 const start=from?Date.parse(from):0,end=to?Date.parse(to)+86400000:Number.MAX_SAFE_INTEGER;if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)fail('بازهٔ تاریخ معتبر نیست');return {type,page,q,status,start,end};
}
module.exports=({execute})=>({async financialHistory(owner,params){
 const f=filters(params),bank=f.type==='bank',table=bank?'payment_orders':'wallet_transactions',columns=bank?'id,provider,amount_toman,credit_units,it_rate,status,rrn,trace,created_at,updated_at':'id,delta_units,balance_units,label,created_at';
 let where='user_id=? AND created_at>=? AND created_at<?',args=[owner,f.start,f.end];
 if(f.type==='purchases')where+=' AND delta_units<0';
 if(f.status){if(bank){where+=' AND status=?';args.push(f.status);}else if(['in','out'].includes(f.status))where+=' AND delta_units'+(f.status==='in'?'>':'<')+'0';else fail('وضعیت این تاریخچه معتبر نیست');}
 for(const term of f.q.split(/\s+/).filter(Boolean)){where+=bank?' AND (id LIKE ? OR rrn LIKE ? OR trace LIKE ? OR CAST(amount_toman AS CHAR) LIKE ? OR provider LIKE ?)':' AND (id LIKE ? OR REPLACE(REPLACE(label,\'ي\',\'ی\'),\'ك\',\'ک\') LIKE ? OR CAST(delta_units AS CHAR) LIKE ?)';for(let i=0;i<(bank?5:3);i++)args.push('%'+term+'%');}
 const [total]=await execute('SELECT COUNT(*) total FROM '+table+' WHERE '+where,args),rows=await execute('SELECT '+columns+' FROM '+table+' WHERE '+where+' ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET '+((f.page-1)*20),args);
 return {page:f.page,total:Number(total.total),rows:bank?rows.map(publicOrder):rows.map(r=>({id:r.id,label:r.label,at:Number(r.created_at),amount:Number(r.delta_units)/2000,balance:Number(r.balance_units)/2000,price:Math.abs(Number(r.delta_units))}))};
}});
module.exports.filters=filters;
