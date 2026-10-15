const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 let workers=[],mode='pending';
 class Worker{constructor(){workers.push(this);}terminate(){this.terminated=true;}postMessage(data){if(mode==='success')queueMicrotask(()=>this.onmessage({data:{type:'loaded',template:{id:data.id,pages:{home:{}}}}}));}}
 const context={window:{RI:{esc:v=>v}},document:{documentElement:{dataset:{assetVersion:'test'}}},Worker,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync('dist/dashboard/js/imported-templates.js','utf8'),context);const RI=context.window.RI;
 const controller=new AbortController(),cancelled=RI.loadTemplates(['vista'],{signal:controller.signal});controller.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');assert(workers[0].terminated);assert(!RI.IMPORTED_TEMPLATES.vista);
 mode='success';const before=workers.length;await Promise.all([RI.loadTemplates(['vista']),RI.loadTemplates(['vista'])]);assert.equal(workers.length-before,1);assert(RI.IMPORTED_TEMPLATES.vista);
 await RI.loadTemplates(['satiar']);assert(!RI.IMPORTED_TEMPLATES.vista);assert(RI.IMPORTED_TEMPLATES.satiar);RI.releaseInactiveTemplates('glacier');assert.equal(Object.keys(RI.IMPORTED_TEMPLATES).length,0);
 const {default:step}=await import('../dist/assets/ttt/GameStep.js'),symbols={huPlayer:'X',aiPlayer:'O'};
 assert.equal(step(['X','X','X',3,'O',5,6,7,'O'],symbols,'Hard').winner,'huPlayer');
 assert.equal(step(['X','O','X','X','O','O','O','X','X'],symbols,'Hard').winner,'draw');
 assert.equal(step(['X','X',2,3,'O',5,6,7,8],symbols,'Hard').board[2],'O');
 const source=require('../src/dashboard/render.cjs').RI;for(const id of ['vista','satiar'])assert.deepEqual(JSON.parse(fs.readFileSync('dist/dashboard/template-data/'+id+'.json','utf8')),JSON.parse(JSON.stringify(source.IMPORTED_TEMPLATES[id])),'generated worker data stays aligned with server contract');
 console.log('PASS: worker abort/retry, deduplicated requests, release of inactive templates and vendored game win/draw/block rules.');
})().catch(e=>{console.error(e);process.exitCode=1;});
