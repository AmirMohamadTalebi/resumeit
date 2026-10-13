const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(page='themes'){
 let now=10000,id=0;const timers=new Map(),pending=[],calls=[];
 class Clock extends Date{static now(){return now;}}
 const document={body:{dataset:{page}}},RI={seed:()=>({profile:{title:'',name:''},slug:'',theme:{font:'vazir'}}),seedBilling:()=>({}),seedAccount:()=>({indexing:false}),emit:()=>{},toast:()=>{},rerender:()=>{},choice:async()=> 'local'};
 vm.runInNewContext(fs.readFileSync('dist/dashboard/js/state.js','utf8'),{window:{RI},document,Date:Clock,JSON,setTimeout:(f,ms)=>{timers.set(++id,{f,at:now+ms});return id;},clearTimeout:n=>timers.delete(n),sessionStorage:{setItem:()=>{}}});
 RI.revision=0;RI.savedIndexing=false;RI.resetEdits();
 RI.dashboardRequest=(route,data)=>{if(route==='document')return Promise.resolve(fixture.remote);calls.push(data);return new Promise((resolve,reject)=>pending.push({resolve,reject,data}));};
 const complete=()=>{const p=pending.shift();p.resolve({preferences:p.data.preferences,revision:p.data.revision+1,slug:''});};
 const mutate=title=>{RI.C().profile.title=title;RI.touch('profile');};
 const advance=ms=>{const end=now+ms;while(true){const first=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;now=first[1].at;timers.delete(first[0]);first[1].f();}now=end;};
 return {RI,document,complete,mutate,advance,pending,calls};
}
(async()=>{
 const f=fixture();f.mutate('first');f.advance(1000);assert.equal(f.calls.length,0);f.mutate('second');f.advance(1999);assert.equal(f.calls.length,0);f.advance(1);assert.equal(f.calls.length,1);const auto=f.RI.save();f.complete();assert(await auto);assert.equal(JSON.parse(f.RI.saved).profile.title,'second');
 f.document.body.dataset.page='resume';f.mutate('manual');f.advance(60000);assert.equal(f.calls.length,1);const ref=f.RI.C().profile,manual=f.RI.save();f.mutate('edited during manual save');f.complete();assert.equal(await manual,false);assert(f.RI.state.ui.dirty);assert.equal(f.RI.C().profile,ref);f.advance(60000);assert.equal(f.calls.length,2);const next=f.RI.save();f.complete();assert(await next);
 f.RI.undo();f.advance(60000);assert(f.RI.state.ui.dirty);assert.equal(f.calls.length,3);
 const g=fixture();g.mutate('my title');fixture.remote={content:{profile:{title:'',name:'other tab'},slug:'',theme:{font:'vazir'}},revision:7,preferences:{indexing:false},pub:{}};const recovery=g.RI.save();g.pending.shift().reject(Object.assign(new Error('stale'),{code:'REVISION_CONFLICT'}));await new Promise(r=>setImmediate(r));assert.equal(g.calls[1].revision,7);assert.equal(g.calls[1].patch.profile.name,'other tab');assert.equal(g.calls[1].patch.profile.title,'my title');g.complete();assert(await recovery);
 g.mutate('overlap');fixture.remote={...fixture.remote,revision:9,content:{...fixture.remote.content,profile:{title:'another title',name:'other tab'}}};const conflict=g.RI.save();g.pending.shift().reject(Object.assign(new Error('stale'),{code:'REVISION_CONFLICT'}));assert.equal(await conflict,false);assert(g.RI.conflict);assert.equal(g.RI.C().profile.title,'overlap');const resolve=g.RI.resolveConflict();await new Promise(r=>setImmediate(r));g.complete();assert(await resolve);assert.equal(JSON.parse(g.RI.saved).profile.title,'overlap');
 g.mutate('offline');const fail=g.RI.save();g.pending.shift().reject(new Error('offline'));assert.equal(await fail,false);assert(g.RI.state.ui.dirty);assert(g.RI.state.ui.saveError);const retry=g.RI.save();g.complete();assert(await retry);
 console.log('PASS: two-second debounce/reset, compact ack, manual-only resume, edit during slow manual save, input references, undo, safe stale-revision merge, explicit overlap resolution and network retention/retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
