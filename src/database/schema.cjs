async function initializeSchema(execute,pool) {
  try {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS users (id CHAR(36) PRIMARY KEY, phone CHAR(11) NOT NULL UNIQUE, password_hash VARCHAR(168), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS profiles (user_id CHAR(36) PRIMARY KEY, name VARCHAR(80) NOT NULL DEFAULT '', role VARCHAR(100) NOT NULL DEFAULT '', bio VARCHAR(500) NOT NULL DEFAULT '', updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS links (user_id CHAR(36) NOT NULL, position INT NOT NULL, name VARCHAR(80) NOT NULL, url VARCHAR(2048) NOT NULL, PRIMARY KEY(user_id,position), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at BIGINT NOT NULL, INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS login_attempts (attempt_key VARCHAR(96) PRIMARY KEY, count INT NOT NULL, expires_at BIGINT NOT NULL, INDEX(expires_at)) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS otp_challenges (phone CHAR(11) PRIMARY KEY, challenge_id CHAR(36) NOT NULL UNIQUE, purpose VARCHAR(8) NOT NULL, code_hash CHAR(64) NOT NULL, status VARCHAR(10) NOT NULL, attempts INT NOT NULL DEFAULT 0, sent_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, registration_token CHAR(64), INDEX(expires_at)) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS social_identities (provider VARCHAR(8) NOT NULL, subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, user_id CHAR(36) NOT NULL, PRIMARY KEY(provider,subject), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS oauth_states (state_hash CHAR(64) PRIMARY KEY, provider VARCHAR(8) NOT NULL, verifier VARCHAR(43) NOT NULL, owner_id CHAR(36), expires_at BIGINT NOT NULL, INDEX(expires_at)) ENGINE=InnoDB`,
    ]) await execute(sql);
    await execute(`CREATE TABLE IF NOT EXISTS dashboard_documents(user_id CHAR(36) PRIMARY KEY,slug VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin UNIQUE,draft JSON NOT NULL,preferences JSON NOT NULL,pub JSON NOT NULL,published JSON NOT NULL,revision INT UNSIGNED NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS dashboard_metrics(user_id CHAR(36) NOT NULL,day INT NOT NULL,event VARCHAR(8) NOT NULL,link_id VARCHAR(64) NOT NULL DEFAULT '',total BIGINT UNSIGNED NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day,event,link_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS wallets(user_id CHAR(36) PRIMARY KEY,balance_units BIGINT UNSIGNED NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS wallet_credit_claims(reference VARCHAR(110) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,user_id CHAR(36) NOT NULL,delta_units BIGINT UNSIGNED NOT NULL) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS wallet_transactions(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,delta_units BIGINT NOT NULL,balance_units BIGINT UNSIGNED NOT NULL,label VARCHAR(120) NOT NULL,reference VARCHAR(110) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,created_at BIGINT NOT NULL,INDEX(user_id,created_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS account_access(user_id CHAR(36) NOT NULL,ref VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,price_units BIGINT UNSIGNED NOT NULL,expires_at BIGINT NULL,created_at BIGINT NOT NULL,PRIMARY KEY(user_id,ref),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS admin_accounts(user_id CHAR(36) PRIMARY KEY,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS admin_controls(user_id CHAR(36) PRIMARY KEY,suspended BOOLEAN NOT NULL DEFAULT FALSE,publication_blocked BOOLEAN NOT NULL DEFAULT FALSE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS admin_audit(id CHAR(36) PRIMARY KEY,actor_id CHAR(36) NOT NULL,target_id CHAR(36),action VARCHAR(32) NOT NULL,reason VARCHAR(500) NOT NULL,details JSON NOT NULL,request_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,created_at BIGINT NOT NULL,INDEX(created_at),INDEX(target_id,created_at)) ENGINE=InnoDB`);
    await execute(`CREATE TABLE IF NOT EXISTS otp_events(id CHAR(36) PRIMARY KEY,phone CHAR(11) NOT NULL,purpose VARCHAR(8) NOT NULL,status VARCHAR(12) NOT NULL,created_at BIGINT NOT NULL,verified_at BIGINT NULL,INDEX(created_at),INDEX(phone,created_at)) ENGINE=InnoDB`);
    const [phoneColumn]=await execute("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='phone'");
    if(phoneColumn.IS_NULLABLE==='NO')await execute('ALTER TABLE users MODIFY phone CHAR(11) NULL');
    for(const [table,column,type] of [['users','phone_verified','BOOLEAN NOT NULL DEFAULT FALSE'],['profiles','first_name',"VARCHAR(39) NOT NULL DEFAULT ''"],['profiles','last_name',"VARCHAR(39) NOT NULL DEFAULT ''"],['otp_challenges','owner_id','CHAR(36)']]) {
      const rows=await execute('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
      if(!rows.length)await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch (error) { await pool.end(); throw error; }
}
module.exports={initializeSchema};
