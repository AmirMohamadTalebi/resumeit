const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Render the same trusted templates as the editor; user content is data, never executable code.
const context=vm.createContext({window:{},location:{origin:'https://resumeit.ir'},URL,Intl,Date,encodeURIComponent});
for(const file of ['icons','core','ui','data','imported-templates','template-vista','template-satiar','resume-templates','preview'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../dist/dashboard/js',file+'.js'),'utf8'),context,{timeout:3000});
const RI=context.window.RI;
RI.findTemplate=(kind,id)=>(kind==='links'?RI.LINK_TEMPLATES:RI.RESUME_TEMPLATES).find(t=>t.id===id);
function blank(){return JSON.parse(JSON.stringify(RI.seed('empty')));}
function render(content,kind,preferences,base,page){
  RI.state={account:preferences};
  return (kind==='resume'?RI.resumeHtml(content,{publicBase:base,page}):RI.linksHtml(content,{publicBase:base}));
}
module.exports={RI,blank,render};
