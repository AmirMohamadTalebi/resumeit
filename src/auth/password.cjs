const {scrypt,randomBytes,timingSafeEqual}=require('node:crypto');
const derive=require('node:util').promisify(scrypt);
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Password must contain 8–128 characters');
  const salt = randomBytes(16).toString('hex');
  return 'scrypt$' + salt + '$' + (await derive(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })).toString('hex');
}
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return false;
  const validHash = typeof stored === 'string' && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored);
  const [, salt, hash] = (validHash ? stored : 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128)).split('$');
  const actual = await derive(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, Buffer.from(hash, 'hex')) && validHash;
}
module.exports={hashPassword,verifyPassword};
