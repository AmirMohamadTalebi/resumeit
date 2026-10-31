// Runs check files side by side instead of one after another. Arguments are test names (tests/<name>.cjs) or
// package scripts (npm:check:security), which expand to the node files they chain. Each test owns its port and
// store, so they are independent; the output of a failing test is printed in full once everything has finished.
// RI_JOBS sets how many run at once (default: half the cores, at least 2, at most 6). suite:ui stands for the
// full UI suite. RI_SHARD=i/n keeps only this machine's share, balanced by known durations, so CI can split the
// checks across n parallel jobs.
const {spawn}=require('node:child_process'),os=require('node:os'),path=require('node:path');
const scripts=require('../package.json').scripts;
function expand(arg){
 if(arg==='suite:ui')return require('./full-ui-suite.cjs');
 if(!arg.startsWith('npm:'))return [arg.replace(/^tests\//,'').replace(/\.cjs$/,'')];
 const body=scripts[arg.slice(4)];if(!body)throw new Error('unknown script '+arg);
 return body.split('&&').map(s=>s.trim()).flatMap(step=>{
  let m=step.match(/^node tests\/([\w.-]+?)(?:\.cjs)?$/);if(m)return [m[1]];
  m=step.match(/^npm run ([\w:-]+)$/);if(m)return expand('npm:'+m[1]);
  throw new Error('cannot run in parallel: '+step);
 });
}
function run(name){
 return new Promise(resolve=>{
  const started=Date.now(),child=spawn(process.execPath,[path.join('tests',name+'.cjs')],{cwd:process.cwd(),env:{...process.env,PUBLIC_ORIGIN:''},windowsHide:true});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  // Generous: the heaviest browser checks take about a minute here and two to three on a CI runner.
  const timer=setTimeout(()=>{output+='\n[timed out after 300s]';child.kill();},300000);
  child.once('error',e=>{clearTimeout(timer);resolve({name,code:-1,output:output+e.message,seconds:0});});
  child.once('close',code=>{clearTimeout(timer);resolve({name,code,output,seconds:Math.round((Date.now()-started)/1000)});});
 });
}
const SOLO=new Set(['dashboard-performance-check','dashboard-save-ui-check','editor-polish-ui-check','dashboard-speed-check','template-performance-check']);
async function runAll(names,jobs=Math.min(6,Math.max(2,Math.floor(os.cpus().length/2)))){
 jobs=Number(process.env.RI_JOBS)||jobs;
 // Longest tests start first (times from the previous run), so the slow ones do not trail at the end alone.
 const timesFile=path.resolve('artifacts/test-times.json'),times=durations(timesFile);
 const queue=shard([...new Set(names)],times).sort((x,y)=>(times[y]??60)-(times[x]??60)),results=[];
 // Checks that measure speed or race timings run alone after the batch, where other browsers cannot slow them.
 const solo=queue.filter(n=>SOLO.has(n));for(const n of solo)queue.splice(queue.indexOf(n),1);
 const report=r=>{results.push(r);console.log((r.code===0?'PASS ':'FAIL ')+r.name+' ('+r.seconds+'s)');};
 await Promise.all(Array.from({length:Math.min(jobs,queue.length)},async()=>{while(queue.length)report(await run(queue.shift()));}));
 for(const n of solo)report(await run(n));
 try{for(const r of results)if(r.code===0)times[r.name]=r.seconds;require('node:fs').mkdirSync(path.dirname(timesFile),{recursive:true});require('node:fs').writeFileSync(timesFile,JSON.stringify(times,null,1));}catch{}
 return results;
}
// Durations: this machine's last run when there is one, else the baseline kept with the tests.
function durations(file){const fs=require('node:fs');let base={},own={};try{base=JSON.parse(fs.readFileSync(path.join(__dirname,'test-times.json'),'utf8'));}catch{}try{own=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}return {...base,...own};}
// Longest first, each to the lightest shard, so the n machines finish at about the same time.
function shard(names,times){
 const m=String(process.env.RI_SHARD||'').match(/^(\d+)\/(\d+)$/);if(!m)return names;
 const [i,n]=[Number(m[1]),Number(m[2])],load=Array(n).fill(0),mine=[];
 for(const name of [...names].sort((x,y)=>(times[y]??30)-(times[x]??30)||x.localeCompare(y))){const k=load.indexOf(Math.min(...load));load[k]+=times[name]??30;if(k===i-1)mine.push(name);}
 console.log('shard '+i+'/'+n+': '+mine.length+' of '+names.length+' checks');return mine;
}
module.exports={runAll,expand};
if(require.main===module)(async()=>{
 const started=Date.now(),results=await runAll(process.argv.slice(2).flatMap(expand)),failed=results.filter(r=>r.code!==0);
 for(const r of failed)console.log('\n===== '+r.name+' =====\n'+r.output.trim());
 console.log('\n'+(results.length-failed.length)+'/'+results.length+' passed in '+Math.round((Date.now()-started)/1000)+'s'+(failed.length?'; failed: '+failed.map(r=>r.name).join(', '):''));
 if(failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
