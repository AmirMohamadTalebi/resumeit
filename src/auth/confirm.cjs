const {verifyPassword}=require('./password.cjs');
// Irreversible actions re-check the account password so a stolen session cookie alone cannot run them.
// Social-only accounts have no password; their typed confirmation in the UI remains the guard.
async function confirmPassword(database,user,password){
  const account=user?.phone&&database.accountByPhone?await database.accountByPhone(user.phone):null;
  if(!account?.password_hash||account.id!==user.id)return;
  if(typeof password!=='string'||!await verifyPassword(password,account.password_hash))throw Object.assign(new Error('برای این کار رمز فعلی حسابت را درست وارد کن'),{status:403,code:'PASSWORD_REQUIRED'});
}
module.exports={confirmPassword};
