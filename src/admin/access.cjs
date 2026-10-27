// The first owner comes from host secrets (OWNER_PHONE), never from source: an unsalted phone hash is trivially reversible.
const ownerPhone = (env = process.env) => {
  const phone = String(env.OWNER_PHONE || "").trim();
  return /^09\d{9}$/.test(phone) ? phone : null;
};
module.exports = {
  ownerPhone,
  isOwner: (user) => !!user?.is_owner && !user?.suspended,
  isAdmin: (user) => !!(user?.is_owner || user?.is_admin) && !user?.suspended,
  isSupport: (user) => !!(user?.is_owner || user?.is_admin || user?.is_support) && !user?.suspended,
  async requireOwner(connection,id){
    const [[owner]]=await connection.execute('SELECT u.id FROM users u JOIN owner_accounts o ON o.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? AND COALESCE(c.suspended,FALSE)=FALSE FOR UPDATE',[id]);
    if(!owner)throw Object.assign(new Error('این عملیات فقط برای مالک سایت مجاز است'),{status:403});
  },
};
