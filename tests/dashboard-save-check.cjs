const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const timers=new Map();let id=0;
 const RI={seed:()=>({profile:{title:''},slug:'',theme:{font:'vazir'}}),seedBilling:()=>({}),seedAccount:()=>({indexing:false}),emit:()=>{},toast:()=>{},rerender:()=>{}};
 vm.runInNewContext(fs.readFileSync('dist/dashboard/js/state.js','utf8'),{window:{RI},Date,JSON,setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:n=>timers.delete(n),sessionStorage:{setItem:()=>{}}});
 RI.resetEdits();let pending=[],calls=[];
 RI.dashboardRequest=(_,data)=>new Promise((resolve,reject)=>{calls.push(data);pending.push({resolve,reject,data});});
 const complete=()=>{const p=pending.shift();p.resolve({content:p.data.content,preferences:p.data.preferences,revision:calls.length,slug:''});};
 const mutate=title=>{RI.C().profile.title=title;RI.touch('profile');};
 mutate('first');const object=RI.C().profile,one=RI.save();assert.equal(RI.save(),one);
 mutate('second');complete();await new Promise(r=>setImmediate(r));assert.equal(calls.length,2);complete();assert(await one);assert.equal(JSON.parse(RI.saved).profile.title,'second');assert.equal(RI.C().profile,object,'mounted input references stay valid');
 RI.undo();const undo=RI.save();complete();assert(await undo);assert.equal(RI.C().profile.title,'');
 RI.C().theme.font='sahel';RI.touch('theme');const timer=[...timers.values()].at(-1);timer();const automatic=RI.save();complete();assert(await automatic);assert.equal(JSON.parse(RI.saved).theme.font,'sahel');
 mutate('offline');const fail=RI.save();pending.shift().reject(new Error('offline'));assert.equal(await fail,false);assert(RI.state.ui.dirty);assert(RI.state.ui.saveError);assert.equal(RI.C().profile.title,'offline');const retry=RI.save();complete();assert(await retry);assert(!RI.state.ui.dirty);
 console.log('PASS: autosave, serialized writes, edits during save, input references, undo after save, network retention and retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
