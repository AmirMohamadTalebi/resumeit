// SMS budgets shared by the OTP store and the admin health page; SMS_DAILY_LIMIT raises the site-wide cap.
function smsLimits(env=process.env){
  const daily=Number(String(env.SMS_DAILY_LIMIT||'').trim()||100);
  const phone=Number(String(env.SMS_PHONE_DAILY_LIMIT||'').trim()||8);
  return {otpDaily:Number.isSafeInteger(daily)&&daily>=10&&daily<=100000?daily:100,phoneDaily:Number.isSafeInteger(phone)&&phone>=3&&phone<=50?phone:8,ipQuarterHour:10,resendSeconds:60,otpSeconds:120,switchSeconds:30,burst:6};
}
// Login and recovery codes sent by email: cheaper than SMS, so the budgets are wider, but still bounded per site, per
// internet address and per phone so the mailbox provider's own limits are never reached by one visitor.
function mailLimits(env=process.env){
  const daily=Number(String(env.OTP_EMAIL_DAILY_LIMIT||'').trim()||1000);
  return {daily:Number.isSafeInteger(daily)&&daily>=50&&daily<=200000?daily:1000,phoneDaily:12,ipQuarterHour:20,otpSeconds:300};
}
module.exports={smsLimits,mailLimits};
