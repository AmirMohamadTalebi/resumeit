// Resume assistant usage: who may ask how many questions a day. Any active subscription includes the assistant;
// it can also be bought alone by the month (account_access ref "assistant:m1|m3|m6"). Counting is per Tehran day.

async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS assistant_usage(user_id CHAR(36) NOT NULL,day INT NOT NULL,used INT NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
}
// 20261030 for the calendar day in Tehran, so the allowance renews at local midnight.
const tehranDay=(now=Date.now())=>Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replace(/-/g,''));

module.exports=({execute,transaction})=>({
  async assistantAccess(userId,now=Date.now()){
    const rows=await execute("SELECT ref,expires_at FROM account_access WHERE user_id=? AND (ref LIKE 'subscription:%' OR ref LIKE 'assistant:%') AND expires_at>?",[userId,now]);
    const until=kind=>Math.max(0,...rows.filter(r=>r.ref.startsWith(kind+':')).map(r=>Number(r.expires_at)));
    const sub=until('subscription'),own=until('assistant');
    return sub?{plan:'subscription',until:sub}:own?{plan:'assistant',until:own}:{plan:'free',until:null};
  },
  async assistantUsed(userId,now=Date.now()){
    const [row]=await execute('SELECT used FROM assistant_usage WHERE user_id=? AND day=?',[userId,tehranDay(now)]);
    return Number(row?.used||0);
  },
  // Takes one question from today's allowance, or refuses with ASSISTANT_LIMIT when it is used up.
  async useAssistant(userId,limit,now=Date.now()){
    const day=tehranDay(now);
    return transaction(async con=>{
      await con.execute('INSERT IGNORE INTO assistant_usage(user_id,day,used) VALUES(?,?,0)',[userId,day]);
      const [[row]]=await con.execute('SELECT used FROM assistant_usage WHERE user_id=? AND day=? FOR UPDATE',[userId,day]);
      const used=Number(row?.used||0);
      if(used>=limit)throw Object.assign(new Error('سهمیهٔ امروز دستیار تمام شد'),{status:429,code:'ASSISTANT_LIMIT'});
      await con.execute('UPDATE assistant_usage SET used=? WHERE user_id=? AND day=?',[used+1,userId,day]);
      return used+1;
    });
  },
  // Gives a question back when no answer could be produced at all.
  async refundAssistant(userId,now=Date.now()){
    await execute('UPDATE assistant_usage SET used=CASE WHEN used>0 THEN used-1 ELSE 0 END WHERE user_id=? AND day=?',[userId,tehranDay(now)]);
  },
});
module.exports.initialize=initialize;
module.exports.tehranDay=tehranDay;
