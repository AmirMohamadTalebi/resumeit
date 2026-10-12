const mysql = require('mysql2/promise');

async function openDatabase(options) {
  if (!options && (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD)) throw new Error('MySQL settings are required');
  const pool = mysql.createPool(options || {
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    connectionLimit: 4, queueLimit: 32, connectTimeout: 10000, charset: 'utf8mb4',
  });
  const execute = async (sql, params = []) => (await pool.execute(sql, params))[0];
  async function transaction(action) {
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const result = await action(connection); await connection.commit(); return result; }
    catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
  await require('./schema.cjs').initializeSchema(execute,pool);
  const context={execute,transaction};
  return {
    ...require('./accounts.cjs')(context),
    ...require('./otp.cjs')(context),
    ...require('./sessions.cjs')(context),
    ...require('./profiles.cjs')(context),
    ...require('./dashboard.cjs')(context),
    ...require('./migration.cjs')(context),
    close: () => pool.end(),
  };
}
module.exports={openDatabase};
