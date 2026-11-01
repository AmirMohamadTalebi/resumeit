const {randomUUID}=require('node:crypto');
const {RI}=require('../dashboard/render.cjs');
const {fail}=require('../dashboard/model.cjs');
// One unit is 1/2000 It. All balances and prices stay integers.
const catalog=ref=>{const [kind,id]=String(ref).split(':');return ({rt:RI.RESUME_TEMPLATES,lt:RI.LINK_TEMPLATES,font:RI.FONTS,pal:RI.PALETTES}[kind]||[]).find(x=>x.id===id);};
module.exports=({execute,transaction})=>({
  async wallet(id){const [row]=await execute('SELECT balance_units FROM wallets WHERE user_id=?',[id]);const transactions=await execute('SELECT id,delta_units,balance_units,label,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50',[id]);return {balance:Number(row?.balance_units||0)/RI.IT_RATE,rate:this.commerceSettings?(await this.commerceSettings()).rate:RI.IT_RATE,transactions:transactions.map(t=>({id:t.id,amount:Number(t.delta_units)/RI.IT_RATE,balance:Number(t.balance_units)/RI.IT_RATE,label:t.label,at:Number(t.created_at)}))};},
  async billing(id,summary=false){const [rows,payments]=await Promise.all([execute('SELECT ref,price_units,expires_at,created_at FROM account_access WHERE user_id=?',[id]),summary?[]:execute("SELECT id,provider,amount_toman,status,rrn,trace,created_at,updated_at FROM payment_orders WHERE user_id=? AND status='paid' ORDER BY created_at DESC LIMIT 50",[id])]);const sub=rows.filter(r=>r.ref.startsWith('subscription:')&&Number(r.expires_at)>Date.now()).sort((a,b)=>Number(b.expires_at)-Number(a.expires_at))[0];return {plan:sub?{id:sub.ref.split(':')[1],end:Number(sub.expires_at),autoRenew:false}:null,purchases:rows.filter(r=>!r.expires_at).map(r=>({ref:r.ref,kind:r.ref.split(':')[0],name:catalog(r.ref)?.name||r.ref,price:Number(r.price_units),at:Number(r.created_at)})),payments:payments.map(p=>({id:p.id,title:'شارژ کیف پول با '+(p.provider==='sep'?'سپ':'زیبال'),provider:p.provider,status:p.status,amount:Number(p.amount_toman),rrn:p.rrn,trace:p.trace,at:Number(p.created_at),updatedAt:Number(p.updated_at)}))};},
  async creditWallet(id,amount,reference,label='شارژ مدیریتی'){
    if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000||amount%RI.IT_RATE!==0||!/^[a-z0-9:_-]{1,100}$/i.test(reference))fail('شارژ معتبر نیست');
    return transaction(async con=>{const [[user]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[id]);if(!user)fail('حساب پیدا نشد',404);
      const [[prior]]=await con.execute('SELECT user_id,delta_units FROM wallet_credit_claims WHERE reference=?',[reference]);if(prior){if(prior.user_id!==id||Number(prior.delta_units)!==amount)fail('شناسهٔ شارژ تکراری است',409);return false;}
      await con.execute('INSERT INTO wallet_credit_claims(reference,user_id,delta_units) VALUES(?,?,?)',[reference,id,amount]);
      await con.execute('INSERT IGNORE INTO wallets(user_id,balance_units) VALUES(?,0)',[id]);const [[row]]=await con.execute('SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE',[id]);const balance=Number(row.balance_units)+amount;if(!Number.isSafeInteger(balance))fail('موجودی بیش از حد مجاز است');
      await con.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[balance,id]);await con.execute('INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),id,amount,balance,label,reference,Date.now()]);return true;
    });
  },
  async purchaseWithWallet(id,ref,requestId,expectedPrice){
    if(typeof ref!=='string'||!/^(rt|lt|font|pal|subscription|assistant):[a-z0-9-]+$/.test(ref))fail('خرید معتبر نیست');
    const item=catalog(ref),[kind,pid]=String(ref).split(':'),plan=kind==='subscription'?RI.PLANS[pid]:kind==='assistant'?RI.ASSISTANT_PLANS[pid]:null;
    const planLabel=plan&&(kind==='assistant'?'اشتراک فندق «'+plan.name+'» '+plan.period:'اشتراک '+plan.name);
    if((!plan&&(!item||item.access!=='buy'))||!/^[a-z0-9_-]{16,64}$/i.test(requestId||''))fail('خرید معتبر نیست');
    const policy=this.commerceSettings?await this.commerceSettings():require('../owner/settings.cjs').defaults();if(policy.paused.includes(ref))fail('فروش این محصول فعلاً متوقف است',409);
    const price=policy.prices[ref]??(plan?plan.price:item.price);if(!Number.isSafeInteger(price)||price<=0||price%RI.IT_RATE!==0)fail('قیمت معتبر نیست');if(expectedPrice!==undefined&&expectedPrice!==price||expectedPrice===undefined&&Object.hasOwn(policy.prices,ref))fail('قیمت تغییر کرده؛ صفحهٔ خرید را تازه کن',409);
    const done=await transaction(async con=>{const [[user]]=await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[id]);if(!user)fail('حساب پیدا نشد',404);
      const [[prior]]=await con.execute('SELECT user_id,delta_units,label FROM wallet_transactions WHERE reference=?',['purchase:'+requestId]);if(prior){if(prior.user_id!==id||Number(prior.delta_units)!==-price||prior.label!==(plan?planLabel:'خرید '+item.name))fail('شناسهٔ درخواست تکراری است',409);return false;}
      const [[owned]]=await con.execute('SELECT expires_at FROM account_access WHERE user_id=? AND ref=?',[id,ref]);if(owned&&!plan)return false;
      const [[row]]=await con.execute('SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE',[id]);const balance=Number(row?.balance_units||0)-price;if(balance<0)fail('موجودی It کافی نیست؛ کیف پول را شارژ کن',409);
      const now=Date.now(),end=plan?Math.max(now,Number(owned?.expires_at||0))+plan.months*30*86400000:null;
      await con.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[balance,id]);
      await con.execute('INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE price_units=VALUES(price_units),expires_at=VALUES(expires_at),created_at=VALUES(created_at)',[id,ref,price,end,now]);
      await con.execute('INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at,product_ref) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),id,-price,balance,plan?planLabel:'خرید '+item.name,'purchase:'+requestId,now,ref]);return true;
    });
    // Fandogh plans and ResumeIt subscriptions add starter credit to the Fandogh wallet, once per purchase.
    if(done&&plan&&this.creditFandogh){
      const key=kind==='assistant'?pid:'subscription',starter=this.assistantSettings?(await this.assistantSettings()).settings.billing?.starter?.[key]:(kind==='assistant'?plan.credit:RI.ASSISTANT_SITE.credit);
      if(starter>0)await this.creditFandogh(id,starter*10,'starter','starter:'+requestId,'اعتبار اولیهٔ '+planLabel);
    }
    return done;
  },
});
