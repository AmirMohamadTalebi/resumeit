const routes=/^\/dashboard\/(?:resume\/|links\/|themes\/|publish\/|studio\/|stats\/|billing\/|wallet\/|settings\/|support\/|notifications\/)?$/;
module.exports=value=>{
 if(typeof value!=='string'||value.length>2048||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20\x7f]/.test(value))return '/dashboard/';
 try{const url=new URL(value,'https://resumeit.invalid');return url.origin==='https://resumeit.invalid'&&routes.test(url.pathname)?url.pathname+url.search+url.hash:'/dashboard/';}catch{return '/dashboard/';}
};
