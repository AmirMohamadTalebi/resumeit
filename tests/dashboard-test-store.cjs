const {initial,fail}=require('../src/dashboard/model.cjs');
module.exports=function dashboardStore(byId,remove){const docs=new Map(),metrics=[];return {
  async wallet(){return {balance:0,rate:2000,transactions:[]};},
  async loadDashboard(id){const {published,...doc}=docs.get(id)||initial();return structuredClone(doc);},
  async slugAvailable(slug,id){return ![...docs].some(([owner,d])=>owner!==id&&d.slug===slug);},
  async mutateDashboard(id,revision,action){if(!byId(id))fail('Missing account',401);const doc=structuredClone(docs.get(id)||{...initial(),slug:null,published:{}});if(doc.revision!==revision)fail('نسخهٔ جدیدتری ذخیره شده است',409);action(doc);if(doc.slug&&[...docs].some(([owner,d])=>owner!==id&&d.slug===doc.slug))fail('نام گرفته شده',409);doc.revision++;docs.set(id,doc);const {published,...result}=doc;return structuredClone(result);},
  async publicPage(slug,kind){const entry=[...docs].find(([,d])=>d.slug===slug&&d.pub[kind].status==='published');if(!entry)return null;const [id,d]=entry;return structuredClone({id,content:d.published[kind],preferences:d.preferences});},
  async recordMetric(id,event,link_id='',now=Date.now()){const day=Math.floor((now+12600000)/86400000),r=metrics.find(x=>x.id===id&&x.event===event&&x.link_id===link_id&&x.day===day);if(r)r.total++;else metrics.push({id,event,link_id,day,total:1});},
  async dashboardStats(id){return metrics.filter(r=>r.id===id).map(({id,...r})=>({...r}));},
  async deleteAccount(id){docs.delete(id);for(let i=metrics.length-1;i>=0;i--)if(metrics[i].id===id)metrics.splice(i,1);remove(id);},
};};
