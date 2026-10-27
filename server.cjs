const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const { openDatabase } = require('./src/database/database.cjs');
const { createServer } = require('./src/http/server.cjs');
const port = Number(process.env.PORT || 5077), host = process.env.HOST || '127.0.0.1';

if (require.main === module) (async () => {
  if ((process.env.NODE_ENV === 'production' || !['127.0.0.1', 'localhost'].includes(host)) && !process.env.PUBLIC_ORIGIN) throw new Error('PUBLIC_ORIGIN is required');
  if (process.env.PUBLIC_ORIGIN) require('./src/http/security.cjs').publicOrigin({headers:{}});
  const database = await openDatabase();
  try {
    if (process.env.SQLITE_MIGRATION_PATH) {
      const migrated = await database.importSqlite(process.env.SQLITE_MIGRATION_PATH);
      console.log('MySQL migration verified: ' + migrated.users + ' account(s).');
    }
    if (process.env.BOOTSTRAP_PHONE && process.env.BOOTSTRAP_PASSWORD_HASH) await database.provisionAccount(process.env.BOOTSTRAP_PHONE, process.env.BOOTSTRAP_PASSWORD_HASH);
    const server = createServer(database);
    server.listen(port, host, () => console.log(`ResumeIt: http://localhost:${port} (listening on ${host})`)).on('error', err => { database.close(); console.error(err.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await database.close(); process.exit(0); }));
  } catch(error) { await database.close(); throw error; }
})().catch(error => { console.error('Startup failed; check origin, database and migration settings. ' + JSON.stringify({ name: error?.name, code: error?.code, message: String(error?.message || '').slice(0, 300) })); process.exitCode = 1; });
module.exports = { createServer };
