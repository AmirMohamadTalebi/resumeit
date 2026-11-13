// Invite a friend (council N1-a, docs/council/ACTIVATION.md). A published page's footer link carries the owner's code;
// the code is kept in a 30-day cookie and attached when the friend signs up. Rewards are It only and go through the
// locked wallet credit with unique references, so a repeated or parallel pass never pays twice.
const {randomBytes}=require('node:crypto');
const ALPHABET='abcdefghjkmnpqrstuvwxyz23456789';
const CODE=/^[a-z0-9]{8}$/;
const IT=2000;
const INVITEE_UNITS=1*IT,INVITER_UNITS=25*IT,PER_TIER=3,MONTHLY_CAP=2,BRAKE_COUNT=10,SETTLE_DAYS=7;
const newCode=()=>Array.from(randomBytes(8),b=>ALPHABET[b%ALPHABET.length]).join('');
const monthStart=now=>{const d=new Date(now);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);};
const parse=v=>typeof v==='string'?JSON.parse(v):v;

async function initialize(execute){
  const col=await execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='referral_code'");
  if(!col.length)await execute('ALTER TABLE users ADD COLUMN referral_code VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NULL, ADD UNIQUE KEY users_referral_code(referral_code)');
  await execute(`CREATE TABLE IF NOT EXISTS referrals(invitee_id CHAR(36) PRIMARY KEY,inviter_id CHAR(36) NOT NULL,code VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,created_at BIGINT NOT NULL,published_at BIGINT NULL,invitee_rewarded_at BIGINT NULL,counted_at BIGINT NULL,INDEX(inviter_id,counted_at),FOREIGN KEY(invitee_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
}

// Called inside the sign-up transaction of a brand-new account. A bad, unknown or self code is ignored silently.
async function attach(con,inviteeId,code,now=Date.now()){
  if(typeof code!=='string'||!CODE.test(code))return false;
  const [[inviter]]=await con.execute('SELECT id FROM users WHERE referral_code=?',[code]);
  if(!inviter||inviter.id===inviteeId)return false;
  await con.execute('INSERT IGNORE INTO referrals(invitee_id,inviter_id,code,created_at) VALUES(?,?,?,?)',[inviteeId,inviter.id,code,now]);
  return true;
}

module.exports=({execute,transaction})=>({
  async referralCode(userId){
    const read=async()=>(await execute('SELECT referral_code FROM users WHERE id=?',[userId]))[0]?.referral_code||null;
    let code=await read();if(code)return code;
    for(let i=0;i<6&&!code;i++){
      try{await execute('UPDATE users SET referral_code=? WHERE id=? AND referral_code IS NULL',[newCode(),userId]);}catch(error){if(error.code!=='ER_DUP_ENTRY')throw error;}
      code=await read();
    }
    return code;
  },
  async referralStats(userId,now=Date.now()){
    const [row]=await execute('SELECT COUNT(*) invited,COALESCE(SUM(counted_at IS NOT NULL),0) counted,COALESCE(SUM(published_at IS NOT NULL),0) published FROM referrals WHERE inviter_id=?',[userId]);
    const [paid]=await execute("SELECT COALESCE(SUM(delta_units),0) units,COALESCE(SUM(created_at>=?),0) month FROM wallet_transactions WHERE user_id=? AND reference LIKE 'referral-tier:%'",[monthStart(now),userId]);
    const counted=Number(row.counted);
    return {invited:Number(row.invited),published:Number(row.published),counted,untilNext:PER_TIER-counted%PER_TIER,earned:Number(paid.units)/IT,rewardsThisMonth:Number(paid.month),monthlyCap:MONTHLY_CAP};
  },
  async referredSignups(since=0){const [row]=await execute('SELECT COUNT(*) total FROM referrals WHERE created_at>=?',[since]);return Number(row.total);},
  // One pass (hourly from the notification tick): mark friends who published, pay them, count successes after 7 days, pay
  // inviters per 3 successes within the monthly cap and budget, and stop everything if too many rewards go out in a day.
  async processReferrals(now=Date.now()){
    const policy=this.commerceSettings?await this.commerceSettings():{};
    const cfg={on:true,monthlyBudget:500,...(policy.referral||{})};
    if(!cfg.on)return {skipped:'off'};
    const out={invitee:0,inviter:0,counted:0,braked:false};
    return transaction(async con=>{
      const [[lock]]=await con.execute("SELECT GET_LOCK('resumeit-referrals',0) got");
      if(!Number(lock.got))return {skipped:'busy'};
      try{
        const since=monthStart(now);
        const spent=async()=>Number((await execute("SELECT COALESCE(SUM(delta_units),0) units FROM wallet_transactions WHERE reference LIKE 'referral%' AND created_at>=?",[since]))[0].units);
        const room=async units=>(await spent())+units<=cfg.monthlyBudget*IT;
        const live=`(EXISTS(SELECT 1 FROM dashboard_documents d WHERE d.user_id=r.invitee_id AND (JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.resume.status'))='published' OR JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.links.status'))='published')) OR EXISTS(SELECT 1 FROM dashboard_workspaces w WHERE w.user_id=r.invitee_id AND (JSON_UNQUOTE(JSON_EXTRACT(w.pub,'$.resume.status'))='published' OR JSON_UNQUOTE(JSON_EXTRACT(w.pub,'$.links.status'))='published')))`;
        const rows=await execute(`SELECT r.invitee_id,r.inviter_id,r.published_at,r.invitee_rewarded_at,c.email invitee_email,ic.email inviter_email,(u.phone_verified=TRUE OR COALESCE(c.email_verified,FALSE)=TRUE) verified FROM referrals r JOIN users u ON u.id=r.invitee_id LEFT JOIN notification_channels c ON c.user_id=r.invitee_id AND c.email_verified=TRUE LEFT JOIN notification_channels ic ON ic.user_id=r.inviter_id AND ic.email_verified=TRUE WHERE r.counted_at IS NULL AND ${live}`);
        for(const r of rows){
          if(!Number(r.verified))continue;
          if(r.invitee_email&&r.invitee_email===r.inviter_email)continue; // the same mailbox on both accounts is not a friend
          if(!r.published_at)await execute('UPDATE referrals SET published_at=? WHERE invitee_id=? AND published_at IS NULL',[now,r.invitee_id]);
          if(!r.invitee_rewarded_at){
            const taken=r.invitee_email?(await execute('SELECT 1 FROM referrals x JOIN notification_channels n ON n.user_id=x.invitee_id AND n.email=? AND n.email_verified=TRUE WHERE x.invitee_rewarded_at IS NOT NULL AND x.invitee_id<>? LIMIT 1',[r.invitee_email,r.invitee_id])).length:0;
            if(!taken&&await room(INVITEE_UNITS)){
              await this.creditWallet(r.invitee_id,INVITEE_UNITS,'referral:'+r.invitee_id,'هدیهٔ دعوت دوست',now);
              await execute('UPDATE referrals SET invitee_rewarded_at=? WHERE invitee_id=? AND invitee_rewarded_at IS NULL',[now,r.invitee_id]);
              if(this.notify)await this.notify(r.invitee_id,'payments','هدیهٔ دعوت به کیف پولت رسید','۱ It به کیف پولت اضافه شد؛ چون دوستت تو را به رزومیت دعوت کرده بود و صفحه‌ات را منتشر کردی.','/dashboard/wallet/','referral-note:'+r.invitee_id);
              out.invitee++;
            }
          }
          const published=Number(r.published_at||now);
          if(now-published>=SETTLE_DAYS*864e5){await execute('UPDATE referrals SET counted_at=? WHERE invitee_id=? AND counted_at IS NULL',[now,r.invitee_id]);out.counted++;}
        }
        const inviters=await execute('SELECT inviter_id,COUNT(*) n FROM referrals WHERE counted_at IS NOT NULL GROUP BY inviter_id HAVING n>=?',[PER_TIER]);
        for(const {inviter_id:inviter,n} of inviters){
          for(let tier=1;tier<=Math.floor(Number(n)/PER_TIER);tier++){
            const ref='referral-tier:'+inviter+':'+tier;
            if((await execute('SELECT 1 FROM wallet_credit_claims WHERE reference=?',[ref])).length)continue;
            const month=Number((await execute("SELECT COUNT(*) n FROM wallet_transactions WHERE user_id=? AND reference LIKE 'referral-tier:%' AND created_at>=?",[inviter,since]))[0].n);
            if(month>=MONTHLY_CAP)break;
            const day=Number((await execute("SELECT COUNT(*) n FROM wallet_transactions WHERE reference LIKE 'referral-tier:%' AND created_at>?",[now-864e5]))[0].n);
            if(day>=BRAKE_COUNT){await this.brakeReferrals(now);out.braked=true;return out;}
            if(!await room(INVITER_UNITS))return out;
            await this.creditWallet(inviter,INVITER_UNITS,ref,'پاداش دعوت سه دوست',now);
            if(this.notify)await this.notify(inviter,'payments','پاداش دعوت دوستانت رسید','۲۵ It به کیف پولت اضافه شد؛ سه دوست که دعوتشان کردی صفحه‌شان را منتشر کرده‌اند.','/dashboard/wallet/','referral-tier-note:'+inviter+':'+tier);
            out.inviter++;
          }
        }
        return out;
      }finally{await con.execute("SELECT RELEASE_LOCK('resumeit-referrals')");}
    });
  },
  // Too many inviter rewards in 24 hours: switch the programme off and tell the admins; the owner switch turns it back on.
  async brakeReferrals(now=Date.now()){
    const [row]=await execute('SELECT settings FROM commerce_settings WHERE id=1');
    const settings={...require('../owner/settings.cjs').defaults(),...(row?parse(row.settings):{})};
    settings.referral={...settings.referral,on:false};
    await execute('INSERT INTO commerce_settings(id,settings) VALUES(1,?) ON DUPLICATE KEY UPDATE settings=VALUES(settings)',[JSON.stringify(settings)]);
    if(this.notify){const admins=await execute('SELECT user_id FROM admin_accounts');const day=new Date(now).toISOString().slice(0,10);for(const a of admins)await this.notify(a.user_id,'product','پاداش دعوت خودکار خاموش شد','در ۲۴ ساعت گذشته بیش از ۱۰ پاداش دعوت‌کننده داده شد. موضوع را بررسی کن و در تنظیمات فروش دوباره روشنش کن.','/admin/catalog/','referral-brake:'+a.user_id+':'+day);}
  },
});
module.exports.initialize=initialize;
module.exports.attach=attach;
module.exports.CODE=CODE;
