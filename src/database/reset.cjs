const {timingSafeEqual}=require('node:crypto');
module.exports=({execute,transaction})=>({
  async bindReset(owner,slot,kind,id){await execute('DELETE FROM dashboard_reset_requests WHERE user_id=?',[owner]);await execute('INSERT INTO dashboard_reset_requests(challenge_id,user_id,slot,kind) VALUES(?,?,?,?)',[id,owner,slot,kind]);},
  async consumeReset(owner,slot,kind,id,hash,phone){return transaction(async con=>{
    const [[scope]]=await con.execute('SELECT * FROM dashboard_reset_requests WHERE challenge_id=? AND user_id=? FOR UPDATE',[id,owner]);
    if(!scope||Number(scope.slot)!==slot||scope.kind!==kind)return false;
    const [[row]]=await con.execute('SELECT * FROM otp_challenges WHERE challenge_id=? FOR UPDATE',[id]);
    if(!row||row.owner_id!==owner||row.phone!==phone||row.purpose!=='wipe'||row.status!=='ready'||row.expires_at<=Date.now()||row.attempts>=5)return false;
    await con.execute('UPDATE otp_challenges SET attempts=attempts+1 WHERE challenge_id=?',[id]);
    if(!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(hash,'hex')))return false;
    await con.execute("UPDATE otp_challenges SET status='consumed',registration_token=NULL WHERE challenge_id=?",[id]);
    await con.execute('DELETE FROM dashboard_reset_requests WHERE challenge_id=?',[id]);return true;
  });}
});
module.exports.initialize=execute=>execute('CREATE TABLE IF NOT EXISTS dashboard_reset_requests(challenge_id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,slot INT NOT NULL,kind VARCHAR(8) NOT NULL,INDEX(user_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
