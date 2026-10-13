const OWNER_PHONE_HASH='2a0b3a10e86a12d43a5ed21dca3db2e6261b63def70307a6b660c2c6463e9644';
module.exports={OWNER_PHONE_HASH,isAdmin:user=>!!user?.is_admin&&!user?.suspended};
