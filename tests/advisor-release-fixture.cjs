const {createHash}=require('node:crypto');
module.exports=async()=>{
 const f=await require('./payments-fixture.cjs')(),{db,owner,target}=f,store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true}),codes=new Map();
 store.sql.exec('CREATE TABLE social_identities(provider TEXT,subject TEXT,user_id TEXT,PRIMARY KEY(provider,subject));');
 store.sql.exec('CREATE TABLE wallets(user_id TEXT PRIMARY KEY,balance_units INTEGER);CREATE TABLE wallet_credit_claims(reference TEXT PRIMARY KEY,user_id TEXT,delta_units INTEGER);CREATE TABLE account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref));CREATE TABLE dashboard_reset_requests(challenge_id TEXT PRIMARY KEY,user_id TEXT,slot INTEGER,kind TEXT);CREATE TABLE otp_challenges(challenge_id TEXT PRIMARY KEY,phone TEXT,purpose TEXT,owner_id TEXT,code_hash TEXT,status TEXT,attempts INTEGER DEFAULT 0,expires_at INTEGER,registration_token TEXT);ALTER TABLE profiles ADD COLUMN first_name TEXT;ALTER TABLE profiles ADD COLUMN last_name TEXT;');
 for(const key of ['provisionAccount','registerVerified','socialAccount']){
  const original=db[key];db[key]=async(...args)=>{const result=await original(...args),id=typeof result==='string'?result:result?.id;if(id){await store.execute('INSERT OR IGNORE INTO users(id) VALUES(?)',[id]);await store.execute("INSERT INTO profiles(user_id,name,role,bio) SELECT ?,'','','' WHERE NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=?)",[id,id]);}return result;};
 }
 const names=db.setAccountNames;db.setAccountNames=async(id,first,last)=>{await names(id,first,last);await store.execute('UPDATE profiles SET first_name=?,last_name=?,name=? WHERE user_id=?',[first,last,first+' '+last,id]);};
 const phone=db.verifyPhoneOtp;db.verifyPhoneOtp=async(...args)=>{const result=await phone(...args);if(result?.phone)await store.execute('UPDATE users SET phone=?,phone_verified=1 WHERE id=?',[result.phone,args[2]]);return result;};
 const reserve=db.reserveOtp;db.reserveOtp=async(record,ip,now)=>{const ok=await reserve(record,ip,now);if(ok)await store.execute("INSERT INTO otp_challenges(challenge_id,phone,purpose,owner_id,code_hash,status,expires_at) VALUES(?,?,?,?,?,'pending',?)",[record.id,record.phone,record.purpose,record.ownerId,record.hash,now+120000]);return ok;};
 const sent=db.finishOtpSend;db.finishOtpSend=async(id,success)=>{await sent(id,success);await store.execute('UPDATE otp_challenges SET status=? WHERE challenge_id=?',[success?'ready':'consumed',id]);};
 Object.assign(db,require('../src/database/reset.cjs')(store));
 const complete=db.completePayment;db.completePayment=async(order,proof,time)=>{const result=await complete(order,proof,time);if(result?.status==='paid')await db.creditWallet(order.user_id,order.amount_toman,'bank:'+order.id,'شارژ آزمایشی تأییدشده');return result;};
 const wallet=require('../src/database/wallet.cjs')(store);for(const key of ['wallet','billing','creditWallet','purchaseWithWallet'])db[key]=wallet[key];
 Object.assign(f.options.payments.env,{ZIBAL_ENABLED:'true',ZIBAL_MERCHANT_ID:'synthetic-test-merchant'});
 let otpNow=Date.now();f.options.now=()=>otpNow;f.options.send=async(phone,code)=>codes.set(phone,code);
 f.options.oauthFetch=async url=>Response.json(url.includes('/token')||url.includes('/access_token')?{access_token:'synthetic-provider-token',token_type:'bearer'}:url.includes('github')?{id:987654321,login:'synthetic-github'}:{sub:'12345678901234567890',name:'کاربر آزمایشی'});
 return {...f,store,codes,nextSms:()=>otpNow+=61000,hash:value=>createHash('sha256').update(value).digest('hex')};
};
