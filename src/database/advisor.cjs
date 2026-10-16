const {empty,operation}=require('../dashboard/advisor.cjs'),{fail}=require('../dashboard/model.cjs');
const parse=value=>typeof value==='string'?JSON.parse(value):value;
module.exports=({execute,transaction})=>({
  async advisorState(owner,slot){const [row]=await execute('SELECT state,state_version FROM advisor_state WHERE user_id=? AND slot=?',[owner,slot]);return row?{state:parse(row.state),version:Number(row.state_version)}:{state:empty(),version:0};},
  async updateAdvisor(owner,slot,version,operations){return transaction(async con=>{
    // Lock the owning account, including the first-insert case.
    await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[owner]);
    const [[row]]=await con.execute('SELECT state,state_version FROM advisor_state WHERE user_id=? AND slot=? FOR UPDATE',[owner,slot]);
    if(Number(row?.state_version||0)!==version)fail('بازخورد در تب دیگری تغییر کرده؛ دوباره دریافتش کن',409,'ADVISOR_CONFLICT');
    const state=row?parse(row.state):empty();for(const op of operations)operation(state,op);
    if(row)await con.execute('UPDATE advisor_state SET state=?,state_version=?,updated_at=? WHERE user_id=? AND slot=?',[JSON.stringify(state),version+1,Date.now(),owner,slot]);
    else await con.execute('INSERT INTO advisor_state(user_id,slot,state,state_version,updated_at) VALUES(?,?,?,?,?)',[owner,slot,JSON.stringify(state),1,Date.now()]);
    return {state,version:version+1};
  });}
});
module.exports.initialize=execute=>execute('CREATE TABLE IF NOT EXISTS advisor_state(user_id CHAR(36) NOT NULL,slot INT NOT NULL,state JSON NOT NULL,state_version BIGINT NOT NULL,updated_at BIGINT NOT NULL,PRIMARY KEY(user_id,slot),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
