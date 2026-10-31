const fs=require('node:fs/promises'),path=require('node:path');
const tests=['action-alignment-check','dashboard-check','auth-ui-check','auth-mobile-check','auth-motion-check','site-content-check','dashboard-public-ui-check','imported-templates-ui-check','wallet-ui-check','dashboard-loading-check','dashboard-performance-check','dashboard-responsive-check','browser-audit-check','dashboard-save-ui-check','admin-ui-check','dashboard-warm-cache-check','workspace-navigation-check','ui-polish-check','payments-ui-check','editor-polish-ui-check','workspace-revision-ui-check','communication-ui-check','multipage-ui-check','admin-completion-ui-check','owner-role-ui-check','support-role-ui-check','support-desk-ui-check','template-performance-check','landing-sections-check','ui-interactions-check','owner-controls-ui-check','admin-workflow-ui-check','account-status-ui-check','fandogh-owner-check','shabtab-template-check','template-contact-page-check'];
module.exports=tests;
if(require.main===module){
 const {runAll}=require('./run-parallel.cjs');
 (async()=>{const out=path.resolve('artifacts/full-ui-suite');await fs.mkdir(out,{recursive:true});
  const results=await runAll(tests);
  for(const r of results){
   await fs.writeFile(path.join(out,r.name+'.log'),r.output);
   // Failing output is printed too, so a CI log shows why without the artifact files.
   if(r.code!==0)console.log('\n===== '+r.name+' =====\n'+r.output.trim().split('\n').slice(-40).join('\n'));
   delete r.output;
  }
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:results.filter(r=>r.code===0).length,failed:results.filter(r=>r.code!==0).map(r=>r.name),report:path.join(out,'report.json')}));if(results.some(r=>r.code!==0))process.exitCode=1;
 })().catch(e=>{console.error(e);process.exitCode=1;});
}
