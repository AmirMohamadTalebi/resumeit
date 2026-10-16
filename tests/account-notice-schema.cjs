module.exports=sql=>{
 sql.exec('CREATE TABLE IF NOT EXISTS admin_codes(id INTEGER PRIMARY KEY AUTOINCREMENT,entity_kind TEXT,entity_key TEXT,UNIQUE(entity_kind,entity_key));CREATE TABLE account_notice_key(id INTEGER PRIMARY KEY,secret TEXT);CREATE TABLE account_notices(id TEXT PRIMARY KEY,user_id TEXT,kind TEXT,reason TEXT,actor_code TEXT,user_code TEXT,until_at INTEGER,created_at INTEGER,active INTEGER,review_ticket TEXT);CREATE TABLE account_notice_identities(identity_hash TEXT PRIMARY KEY,notice_id TEXT,allow_new INTEGER);CREATE TABLE account_notice_proofs(token_hash TEXT PRIMARY KEY,notice_id TEXT,context TEXT,expires_at INTEGER);');
 sql.prepare('INSERT INTO account_notice_key VALUES(1,?)').run(require('node:crypto').randomBytes(32).toString('hex'));
};
