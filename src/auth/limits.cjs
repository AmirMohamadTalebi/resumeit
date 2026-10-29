// SMS budgets shared by the OTP store and the admin health page; SMS_DAILY_LIMIT raises the site-wide cap.
function smsLimits(env=process.env){
  const daily=Number(String(env.SMS_DAILY_LIMIT||'').trim()||100);
  const phone=Number(String(env.SMS_PHONE_DAILY_LIMIT||'').trim()||8);
  return {otpDaily:Number.isSafeInteger(daily)&&daily>=10&&daily<=100000?daily:100,phoneDaily:Number.isSafeInteger(phone)&&phone>=3&&phone<=50?phone:8,ipQuarterHour:10,resendSeconds:60,otpSeconds:120};
}
module.exports={smsLimits};
