const {randomUUID}=require('node:crypto'),{fail}=require('../dashboard/model.cjs');
// Promotional email: campaigns the owner writes, and one row per person per campaign. Only people with a verified
// address who explicitly said yes (marketing_optin) are ever in the audience; unsubscribing flips that back.
const AUDIENCE='FROM notification_channels c JOIN users u ON u.id=c.user_id WHERE c.email_verified=TRUE AND c.marketing_optin=TRUE AND c.email IS NOT NULL';
module.exports=({execute,transaction})=>({
  async saveMarketingConsent(owner,optin,source='settings'){
    if(typeof optin!=='boolean')fail('انتخاب معتبر نیست');
    await execute('INSERT IGNORE INTO notification_channels(user_id,enabled_at) VALUES(?,?)',[owner,Date.now()]);
    await execute('UPDATE notification_channels SET marketing_optin=?,marketing_at=?,marketing_source=? WHERE user_id=?',[optin,Date.now(),String(source).slice(0,16),owner]);
  },
  async marketingConsent(owner){const [row]=await execute('SELECT marketing_optin FROM notification_channels WHERE user_id=?',[owner]);return !!row?.marketing_optin;},
  async marketingStats(){
    const [audience]=await execute('SELECT COUNT(*) total '+AUDIENCE);
    const [verified]=await execute('SELECT COUNT(*) total FROM notification_channels WHERE email_verified=TRUE');
    const [users]=await execute('SELECT COUNT(*) total FROM users');
    return {audience:Number(audience.total),verifiedEmails:Number(verified.total),users:Number(users.total)};
  },
  async marketingCampaigns(){return execute('SELECT id,title,status,total,sent,failed,created_at,started_at FROM marketing_campaigns ORDER BY created_at DESC LIMIT 30');},
  async createMarketingCampaign(actor,input){
    const clean=(v,max)=>String(v||'').replace(/\r\n/g,'\n').trim().slice(0,max);
    const title=clean(input.title,120),body=clean(input.body,1500),cta=clean(input.cta,40),url=clean(input.url,300);
    if(title.length<3)fail('عنوان ایمیل را بنویس');if(body.length<10)fail('متن ایمیل خیلی کوتاه است');
    if(url&&!/^(\/|https:\/\/)/.test(url))fail('نشانی دکمه باید با / یا https:// شروع شود');
    const id=randomUUID();
    await execute('INSERT INTO marketing_campaigns(id,title,body,cta,url,status,total,sent,failed,created_by,created_at) VALUES(?,?,?,?,?,\'draft\',0,0,0,?,?)',[id,title,body,cta||null,url||null,actor,Date.now()]);
    return id;
  },
  async marketingCampaign(id){const [row]=await execute('SELECT * FROM marketing_campaigns WHERE id=?',[id]);return row||null;},
  // Freezes the audience at the moment of sending: people who opt in later are not added to a running campaign.
  async startMarketingCampaign(id){
    return transaction(async con=>{
      const [[row]]=await con.execute('SELECT status FROM marketing_campaigns WHERE id=? FOR UPDATE',[id]);
      if(!row)fail('کمپین پیدا نشد',404);if(row.status!=='draft')fail('این کمپین قبلاً شروع شده است',409);
      await con.execute('INSERT INTO marketing_sends(campaign_id,user_id,status) SELECT ?,c.user_id,\'pending\' '+AUDIENCE,[id]);
      const [[count]]=await con.execute('SELECT COUNT(*) total FROM marketing_sends WHERE campaign_id=?',[id]);
      await con.execute('UPDATE marketing_campaigns SET status=?,total=?,started_at=? WHERE id=?',[Number(count.total)?'sending':'done',Number(count.total),Date.now(),id]);
      return Number(count.total);
    });
  },
  async cancelMarketingCampaign(id){await execute('UPDATE marketing_sends SET status=\'cancelled\' WHERE campaign_id=? AND status=\'pending\'',[id]);await execute('UPDATE marketing_campaigns SET status=\'cancelled\' WHERE id=? AND status IN (\'draft\',\'sending\')',[id]);},
  // The next few people to mail; the opt-in is checked again here so an unsubscribe stops a running campaign at once.
  async marketingBatch(limit=10){
    return execute('SELECT s.campaign_id,s.user_id,c.email,m.title,m.body,m.cta,m.url FROM marketing_sends s JOIN marketing_campaigns m ON m.id=s.campaign_id AND m.status=\'sending\' JOIN notification_channels c ON c.user_id=s.user_id AND c.email_verified=TRUE AND c.marketing_optin=TRUE AND c.email IS NOT NULL WHERE s.status=\'pending\' ORDER BY m.created_at LIMIT '+Math.min(50,Math.max(1,Number(limit)||10)));
  },
  async finishMarketingSend(campaign,user,ok){
    await execute('UPDATE marketing_sends SET status=? WHERE campaign_id=? AND user_id=? AND status=\'pending\'',[ok?'sent':'failed',campaign,user]);
    await execute('UPDATE marketing_campaigns SET '+(ok?'sent=sent+1':'failed=failed+1')+' WHERE id=?',[campaign]);
    await execute('UPDATE marketing_campaigns SET status=\'done\' WHERE id=? AND status=\'sending\' AND NOT EXISTS(SELECT 1 FROM marketing_sends WHERE campaign_id=? AND status=\'pending\')',[campaign,campaign]);
  },
  // People who opted out after the campaign froze its list never receive it.
  async skipUnsubscribedMarketing(){await execute('UPDATE marketing_sends s JOIN notification_channels c ON c.user_id=s.user_id SET s.status=\'cancelled\' WHERE s.status=\'pending\' AND (c.marketing_optin=FALSE OR c.email_verified=FALSE)');await execute('UPDATE marketing_campaigns SET status=\'done\' WHERE status=\'sending\' AND NOT EXISTS(SELECT 1 FROM marketing_sends WHERE campaign_id=marketing_campaigns.id AND status=\'pending\')');}
});
module.exports.initialize=async execute=>{
  await execute('CREATE TABLE IF NOT EXISTS marketing_campaigns(id CHAR(36) PRIMARY KEY,title VARCHAR(120) NOT NULL,body TEXT NOT NULL,cta VARCHAR(40),url VARCHAR(300),status VARCHAR(12) NOT NULL,total INT NOT NULL DEFAULT 0,sent INT NOT NULL DEFAULT 0,failed INT NOT NULL DEFAULT 0,created_by CHAR(36) NOT NULL,created_at BIGINT NOT NULL,started_at BIGINT NULL,INDEX(created_at)) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS marketing_sends(campaign_id CHAR(36) NOT NULL,user_id CHAR(36) NOT NULL,status VARCHAR(10) NOT NULL,PRIMARY KEY(campaign_id,user_id),INDEX(status),FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
};
