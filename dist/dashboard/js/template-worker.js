let engine;
self.onmessage=async({data})=>{
 if(data.type==='game'){
  try{engine||=import('/assets/ttt/GameStep.js');const {default:step}=await engine;self.postMessage({type:'game',...step(data.board,{huPlayer:'X',aiPlayer:'O'},'Hard')});}catch{self.postMessage({type:'game-error'});}return;
 }
 if(data.type!=='load'||!['vista','satiar'].includes(data.id))return;
 try{
  const response=await fetch('/dashboard/template-data/'+data.id+'.json'+data.version,{credentials:'same-origin',signal:AbortSignal.timeout(45000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error();
  const total=Number(response.headers.get('X-Uncompressed-Length')),reader=response.body.getReader(),chunks=[];let received=0,last=-1;
  for(;;){const {value,done}=await reader.read();if(done)break;received+=value.length;if(received>8*1024*1024)throw Error();chunks.push(value);const percent=total>0?Math.min(95,Math.floor(received/total*95)):null;if(percent!==last){self.postMessage({type:'progress',percent});last=percent;}}
  self.postMessage({type:'progress',percent:98});
  const bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const template=JSON.parse(new TextDecoder().decode(bytes));if(template.id!==data.id||!template.pages?.home)throw Error();
  self.postMessage({type:'loaded',template});
 }catch{self.postMessage({type:'error'});}
};
