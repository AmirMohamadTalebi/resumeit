const { randomUUID } = require('node:crypto');
const { fail } = require('../dashboard/model.cjs');
const { RI } = require('../dashboard/render.cjs');

module.exports = ({ execute, transaction }) => ({
  async invoice(id){return (await execute('SELECT * FROM payment_invoices WHERE id=?',[id]))[0]||null;},
  async createInvoice(invoice){
    if(!Number.isSafeInteger(invoice.amount_toman)||invoice.amount_toman<2000||invoice.amount_toman>100000000||invoice.amount_toman%RI.IT_RATE||!/^[a-z0-9_-]{16,64}$/i.test(invoice.request_id||''))fail('پیش‌فاکتور معتبر نیست');
    return transaction(async con=>{
      const [[user]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[invoice.user_id]);if(!user)fail('حساب پیدا نشد',401);
      const [[prior]]=await con.execute('SELECT * FROM payment_invoices WHERE user_id=? AND request_id=?',[invoice.user_id,invoice.request_id]);if(prior){if(Number(prior.amount_toman)!==invoice.amount_toman)fail('مبلغ پیش‌فاکتور مطابقت ندارد',409);return prior;}
      const [[count]]=await con.execute('SELECT COUNT(*) total FROM payment_invoices WHERE user_id=? AND created_at>?',[invoice.user_id,invoice.created_at-15*60000]);if(Number(count.total)>=10)fail('چند دقیقه بعد پیش‌فاکتور تازه بساز',429);
      await con.execute('INSERT INTO payment_invoices(id,user_id,amount_toman,request_id,created_at,expires_at,it_rate,credit_units) VALUES(?,?,?,?,?,?,?,?)',[invoice.id,invoice.user_id,invoice.amount_toman,invoice.request_id,invoice.created_at,invoice.expires_at,invoice.it_rate||2000,invoice.credit_units??invoice.amount_toman]);return invoice;
    });
  },
  async payment(id) { return (await execute('SELECT * FROM payment_orders WHERE id=?', [id]))[0] || null; },
  async paymentsForUser(id) { return execute('SELECT id,provider,amount_toman,credit_units,it_rate,status,rrn,trace,created_at,updated_at FROM payment_orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50', [id]); },
  async createPayment(order) {
    if(!Number.isSafeInteger(order.amount_toman)||order.amount_toman<2000||order.amount_toman>100000000||order.amount_toman%RI.IT_RATE!==0||!['sep','zibal'].includes(order.provider)||!/^[a-f0-9]{64}$/.test(order.secret_hash))fail('درخواست پرداخت معتبر نیست');
    return transaction(async con => {
      const [[user]] = await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [order.user_id]);
      if (!user) fail('حساب پیدا نشد',401);
      const [[sameId]]=await con.execute('SELECT * FROM payment_orders WHERE id=?',[order.id]);
      if(sameId){if(sameId.user_id!==order.user_id||sameId.provider!==order.provider||Number(sameId.amount_toman)!==order.amount_toman)fail('برای این پیش‌فاکتور درگاه دیگری انتخاب شده است؛ نتیجهٔ پرداخت را بررسی کن',409);return {order:sameId,created:false};}
      const [[prior]] = await con.execute('SELECT * FROM payment_orders WHERE user_id=? AND provider=? AND request_id=?', [order.user_id,order.provider,order.request_id]);
      if (prior) { if (Number(prior.amount_toman)!==order.amount_toman) fail('شناسهٔ درخواست برای مبلغ دیگری استفاده شده است',409); return { order: prior, created: false }; }
      const [[count]] = await con.execute('SELECT COUNT(*) total FROM payment_orders WHERE user_id=? AND created_at>?', [order.user_id,order.created_at-15*60000]);
      if (Number(count.total)>=10) fail('درخواست‌های زیادی ثبت شده؛ چند دقیقه بعد تلاش کن',429);
      await con.execute('INSERT INTO payment_orders(id,user_id,provider,terminal_id,amount_toman,request_id,secret_hash,status,created_at,updated_at,expires_at,it_rate,credit_units) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', [order.id,order.user_id,order.provider,order.terminal_id,order.amount_toman,order.request_id,order.secret_hash,'creating',order.created_at,order.created_at,order.expires_at,order.it_rate||2000,order.credit_units??order.amount_toman]);
      return { order: {...order,status:'creating'}, created:true };
    });
  },
  async paymentToken(id, token, now) { await execute("UPDATE payment_orders SET token=?,status='pending',updated_at=? WHERE id=? AND status='creating'",[token,now,id]); },
  async paymentStartFailed(id, now, code='TOKEN_FAILED') { await execute("UPDATE payment_orders SET status='failed',last_error=?,updated_at=? WHERE id=? AND status='creating'",[code,now,id]); },
  async cancelPayment(id,now) {await execute("UPDATE payment_orders SET status='cancelled',updated_at=? WHERE id=? AND status='pending' AND ref_num IS NULL",[now,id]);},
  async receivePayment(id, ref, now) {
    try { return await transaction(async con => {
      const [[order]] = await con.execute('SELECT * FROM payment_orders WHERE id=? FOR UPDATE',[id]);
      if (!order) return null;
      if (order.ref_num && order.ref_num!==ref) fail('رسید پرداخت با درخواست قبلی مطابقت ندارد',409);
      if (['paid','reversed','review','failed'].includes(order.status)) return order;
      if (!order.token) fail('درخواست پرداخت آماده نیست',409);
      if (!order.ref_num) {
        await con.execute("UPDATE payment_orders SET ref_num=?,status='pending',verify_until=?,next_attempt_at=?,updated_at=? WHERE id=?",[ref,now+25*60000,now,now,id]);
        Object.assign(order,{ref_num:ref,status:'pending',verify_until:now+25*60000,next_attempt_at:now});
      }
      else if(order.provider==='zibal'&&['pending','cancelled','expired'].includes(order.status))await con.execute("UPDATE payment_orders SET status='pending',next_attempt_at=?,verify_until=? WHERE id=?",[now,Math.max(Number(order.verify_until),now+25*60000),id]);
      return order;
    }); } catch(e) { if(e.code==='ER_DUP_ENTRY')fail('این رسید قبلاً برای پرداخت دیگری ثبت شده است',409);throw e; }
  },
  async claimPayment(id, now) {
    return transaction(async con => {
      const [[order]] = await con.execute('SELECT * FROM payment_orders WHERE id=? FOR UPDATE',[id]);
      if (!order || !order.ref_num || !['pending','verifying'].includes(order.status) || Number(order.lease_until)>now || Number(order.next_attempt_at)>now) return null;
      if (Number(order.verify_until)<now || Number(order.attempts)>=12) { await con.execute("UPDATE payment_orders SET status='review',last_error='VERIFY_EXPIRED',updated_at=? WHERE id=?",[now,id]);return null; }
      const lease=randomUUID();
      await con.execute("UPDATE payment_orders SET status='verifying',lease_key=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=?",[lease,now+30000,now,id]);
      return {...order,status:'verifying',lease_key:lease,attempts:Number(order.attempts)+1};
    });
  },
  async releasePayment(id, lease, status, code, now, delay=30000) {
    await execute('UPDATE payment_orders SET status=?,last_error=?,next_attempt_at=?,lease_until=0,lease_key=NULL,updated_at=? WHERE id=? AND status=\'verifying\' AND lease_key=?',[status,code,now+delay,now,id,lease]);
  },
  async paymentUnpaid(id,lease,now){await execute("UPDATE payment_orders SET status='pending',attempts=GREATEST(attempts-1,0),last_error=NULL,next_attempt_at=?,lease_until=0,lease_key=NULL,updated_at=? WHERE id=? AND status='verifying' AND lease_key=?",[now+60000,now,id,lease]);},
  async completePayment(order, proof, now) {
    return transaction(async con => {
      const [[user]] = order.user_id ? await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[order.user_id]) : [[]];
      const [[current]] = await con.execute('SELECT * FROM payment_orders WHERE id=? FOR UPDATE',[order.id]);
      if (current.status==='paid') return current;
      if (current.status!=='verifying' || current.lease_key!==order.lease_key) return null;
      if (!user || !current.user_id) return {accountDeleted:true};
      const paid=Number(current.amount_toman),amount=Number(current.credit_units??current.amount_toman),reference='payment:'+current.provider+':'+current.id;
      if (proof.amountRial!==paid*10 || !Number.isSafeInteger(amount)||amount<=0) fail('مبلغ پرداخت مطابقت ندارد',409);
      await con.execute('INSERT IGNORE INTO wallets(user_id,balance_units) VALUES(?,0)',[current.user_id]);
      const [[wallet]]=await con.execute('SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE',[current.user_id]);
      const balance=Number(wallet.balance_units)+amount;
      if(!Number.isSafeInteger(balance))fail('موجودی بیش از حد مجاز است');
      await con.execute('INSERT INTO wallet_credit_claims(reference,user_id,delta_units) VALUES(?,?,?)',[reference,current.user_id,amount]);
      await con.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[balance,current.user_id]);
      await con.execute('INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),current.user_id,amount,balance,'شارژ کیف پول با '+(current.provider==='sep'?'سپ':'زیبال'),reference,now]);
      await con.execute("UPDATE payment_orders SET status='paid',rrn=?,trace=?,last_error=NULL,lease_key=NULL,lease_until=0,updated_at=? WHERE id=?",[proof.rrn,proof.trace,now,current.id]);
      return {...current,status:'paid',rrn:proof.rrn,trace:proof.trace,updated_at:now};
    });
  },
  async duePayments(now) {
    await execute("UPDATE payment_orders SET status='failed',last_error='TOKEN_INTERRUPTED',updated_at=? WHERE status='creating' AND created_at<?",[now,now-60000]);
    await execute("UPDATE payment_orders SET status='expired',last_error='PAYMENT_EXPIRED',updated_at=? WHERE status='pending' AND ref_num IS NULL AND expires_at<=?",[now,now]);
    return execute("SELECT id FROM payment_orders WHERE provider IN ('sep','zibal') AND ref_num IS NOT NULL AND status IN ('pending','verifying') AND next_attempt_at<=? AND lease_until<=? ORDER BY next_attempt_at LIMIT 10",[now,now]);
  },
});
