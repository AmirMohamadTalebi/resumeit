const OWNER_PHONE_HASH =
  "2a0b3a10e86a12d43a5ed21dca3db2e6261b63def70307a6b660c2c6463e9644";
module.exports = {
  OWNER_PHONE_HASH,
  isOwner: (user) => !!user?.is_owner && !user?.suspended,
  isAdmin: (user) => !!(user?.is_owner || user?.is_admin) && !user?.suspended,
  isSupport: (user) => !!(user?.is_owner || user?.is_admin || user?.is_support) && !user?.suspended,
  async requireOwner(connection,id){
    const [[owner]]=await connection.execute('SELECT u.id FROM users u JOIN owner_accounts o ON o.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE FOR UPDATE',[id]);
    if(!owner)throw Object.assign(new Error('این عملیات فقط برای مالک سایت مجاز است'),{status:403});
  },
};
