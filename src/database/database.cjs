const mysql = require('mysql2/promise');

async function openDatabase(options) {
  if (!options && (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD)) throw new Error('MySQL settings are required');
  const pool = mysql.createPool(options || {
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    // Opening the dashboard fires several requests at once; 4 connections queued them. Hosts with a low
    // max_user_connections can lower it again with MYSQL_CONNECTION_LIMIT.
    connectionLimit: Math.min(32, Math.max(2, Number(process.env.MYSQL_CONNECTION_LIMIT) || 8)), queueLimit: 64, connectTimeout: 10000, charset: 'utf8mb4',
  });
  const execute = async (sql, params = []) => (await pool.execute(sql, params))[0];
  async function transaction(action) {
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const result = await action(connection); await connection.commit(); return result; }
    catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
  await require('./schema.cjs').initializeSchema(execute,pool);
  await require('./workspaces.cjs').initialize(execute);
  await require('./notification-delivery.cjs').initialize(execute);
  await require('./advisor.cjs').initialize(execute);
  await require('./reset.cjs').initialize(execute);
  await require('./media.cjs').initialize(execute);
  await require('./messages.cjs').initialize(execute);
  await require('./support-desk.cjs').initialize(execute);
  await execute('CREATE TABLE IF NOT EXISTS support_attachments(id CHAR(36) PRIMARY KEY,message_id CHAR(36) NOT NULL,name VARCHAR(120) NOT NULL,mime VARCHAR(64) NOT NULL,data MEDIUMBLOB NOT NULL,size INT NOT NULL,INDEX(message_id),FOREIGN KEY(message_id) REFERENCES support_messages(id) ON DELETE CASCADE) ENGINE=InnoDB');
  const context={execute,transaction};
  const database = {
    ...require('./admin-codes.cjs')(context),
    ...require('./account-notices.cjs')(context),
    ...require('./accounts.cjs')(context),
    ...require('./otp.cjs')(context),
    ...require('./sessions.cjs')(context),
    ...require('./profiles.cjs')(context),
    ...require('./dashboard.cjs')(context),
    ...require('./support.cjs')(context),
    ...require('./advisor.cjs')(context),
    ...require('./reset.cjs')(context),
    ...require('./support-roles.cjs')(context),
    ...require('./ownership.cjs')(context),
    ...require('./owner-controls.cjs')(context),
    ...require('./retention.cjs')(context),
    ...require('./notification-delivery.cjs')(context),
    ...require('./history.cjs')(context),
    ...require('./wallet.cjs')(context),
    ...require('./payments.cjs')(context),
    ...require('./admin.cjs')(context),
    ...require('./migration.cjs')(context),
    ...require('./external-images.cjs')(context),
    ...require('./media.cjs')(context),
    ...require('./messages.cjs')(context),
    ...require('./support-desk.cjs')(context),
    close: () => pool.end(),
  };
  try{
    await require('./owner-wallet-credit.cjs')(database,execute);
    await require('./ownership.cjs').bootstrapOwner(execute);
  }catch(error){await pool.end();throw error;}
  return database;
}
module.exports={openDatabase};
