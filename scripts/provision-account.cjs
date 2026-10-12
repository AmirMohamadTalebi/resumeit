const { openDatabase } = require('../src/database/database.cjs');
const { hashPassword } = require('../src/auth/auth.cjs');
try { require('node:process').loadEnvFile(require('node:path').join(__dirname, '../.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
(async () => {
  let body = '';
  const lines = require('node:readline').createInterface({ input: process.stdin });
  for await (const line of lines) { body = line; break; }
  lines.close(); process.stdin.destroy();
  if (body.length > 2048) throw new Error('Input too large');
  const { phone, password } = JSON.parse(body);
  const hash = await hashPassword(password);
  const database = await openDatabase();
  try { await database.provisionAccount(phone, hash); console.log('Account ready. Existing passwords are never overwritten.'); }
  finally { await database.close(); }
})().catch(() => { console.error('Account provisioning failed; check input and database access.'); process.exitCode = 1; });
