const {fail}=require('./model.cjs');
function validate(files,paid){
  if(files===undefined)return [];
  const max=paid?2*1024*1024:400*1024,count=paid?5:1;
  if(!Array.isArray(files)||files.length>count)fail('تعداد پیوست‌ها برای این حساب بیش از حد مجاز است');
  let total=0;
  return files.map(file=>{
    if(!file||typeof file.name!=='string'||file.name.length>120||/[\\/\x00-\x1f\x7f]/.test(file.name)||typeof file.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)||file.data.length>Math.ceil(max/3)*4)fail('فایل پیوست معتبر نیست');
    const bytes=Buffer.from(file.data,'base64'),ext=file.name.split('.').at(-1).toLowerCase();
    const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',txt:'text/plain'};
    if(!types[ext]||file.type!==types[ext]||!bytes.length||bytes.length>max)fail('PNG، JPEG، WebP، PDF یا TXT با حجم مجاز انتخاب کن');
    const text=bytes.toString('utf8'),valid=ext==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):ext==='jpg'||ext==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:ext==='webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':ext==='pdf'?bytes.toString('ascii',0,5)==='%PDF-':!text.includes('\uFFFD')&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)&&!/^\s*(?:MZ|#!|<\?php|<script|<!doctype|<html)/i.test(text);
    if(!valid)fail('محتوای فایل با نوع انتخاب‌شده مطابقت ندارد');
    total+=bytes.length;if(total>8*1024*1024)fail('مجموع حجم پیوست‌ها حداکثر ۸ مگابایت است');
    return {name:file.name,type:types[ext],bytes};
  });
}
async function insert(con,message,files){for(const file of files||[])await con.execute('INSERT INTO support_attachments(id,message_id,name,mime,data,size) VALUES(?,?,?,?,?,?)',[require('node:crypto').randomUUID(),message,file.name,file.type,file.bytes,file.bytes.length]);}
module.exports={validate,insert};
