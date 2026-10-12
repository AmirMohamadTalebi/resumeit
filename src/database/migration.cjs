module.exports = ({execute,transaction}) => {
  return {
    async importSqlite(filename) {
      const { DatabaseSync } = require('node:sqlite');
      if (!require('node:fs').existsSync(filename)) throw new Error('Migration source is missing');
      const source = new DatabaseSync(filename, { readOnly: true });
      try {
        source.exec('BEGIN');
        await transaction(async connection => {
          // One transaction preserves the old account IDs, hashes, profiles and active sessions.
          for (const [table,columns] of [['users',['id','phone','password_hash','created_at']],['profiles',['user_id','name','role','bio','updated_at']],['links',['user_id','position','name','url']],['sessions',['token_hash','user_id','expires_at']]]) {
            const rows = source.prepare('SELECT ' + columns.join(',') + ' FROM ' + table).all();
            for (const row of rows) {
              if (table === 'sessions' && row.expires_at <= Date.now()) continue;
              await connection.execute(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${columns[0]}=${columns[0]}`, columns.map(column => row[column]));
            }
          }
          for (const user of source.prepare('SELECT id,phone,password_hash FROM users').all()) {
            const [[saved]] = await connection.execute('SELECT id,password_hash FROM users WHERE phone=?', [user.phone]);
            if (saved.id !== user.id || saved.password_hash !== user.password_hash) throw new Error('Migration account conflict');
          }
        });
        return { users: source.prepare('SELECT count(*) AS count FROM users').get().count };
      } finally { source.close(); }
    },
  };
};
