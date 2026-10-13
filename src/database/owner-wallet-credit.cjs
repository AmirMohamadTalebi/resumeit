// One-time owner credit explicitly requested on 2026-10-13; no public credit endpoint.
module.exports=async(database,execute)=>{
 const [claim]=await execute('SELECT reference FROM wallet_credit_claims WHERE reference=?',['owner-credit-20261013']);if(claim)return;
 const [owner]=await execute('SELECT id FROM users WHERE SHA2(phone,256)=?',['2a0b3a10e86a12d43a5ed21dca3db2e6261b63def70307a6b660c2c6463e9644']);
 if(owner)await database.creditWallet(owner.id,1000000,'owner-credit-20261013','شارژ مدیریتی: ۵۰۰ It');
};
