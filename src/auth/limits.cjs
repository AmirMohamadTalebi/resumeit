// SMS budgets shared by the OTP store and the admin health page; SMS_DAILY_LIMIT raises the site-wide cap.
function smsLimits(env=process.env){
  const daily=Number(String(env.SMS_DAILY_LIMIT||'').trim()||100);
  return {otpDaily:Number.isSafeInteger(daily)&&daily>=10&&daily<=100000?daily:100,phoneDaily:5,ipQuarterHour:10,resendSeconds:60,otpSeconds:120};
}
module.exports={smsLimits};
