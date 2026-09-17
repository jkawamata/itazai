const {chromium}=require('playwright');const path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(process.argv[2]||'板材設計_V4.08.html')).href);
console.log(await page.evaluate(()=>{
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 function append(parent,pieces,tool,params){const before=machiningClone(parent);originalRecordMachining(parent,pieces,tool,params.draft?.radius||0);const prior=new Set(guideSegments(parent).map(e=>e.op)),op=pieces.flatMap(p=>p.machining).find(e=>!prior.has(e.op))?.op||crypto.randomUUID();pieces.forEach((p,i)=>{p.id=i?'p'+state.next++:parent.id;p.name=i?'test-'+p.id:parent.name;p.operationNode=op+':'+i;});state.parts=state.parts.filter(p=>p.id!==parent.id).concat(pieces);state.machiningOperations.push({id:op,stock:parent.stock,tool,input:before.operationNode,before,params,after:machiningClone(pieces)});return op;}
 function setup(){state=fresh();state.machiningOperations=[];const p=state.parts[0];p.operationNode='root';const plan=shapedSawPlan(p,'w',300,10);const op=append(p,plan.pieces,'saw',{axis:'w',at:300,kerf:10,diagonal:false});return op;}
 function process(part,tool){state.selected=part.id;shapeDrafts.clear();methodConfirmed=true;awaitingPartSelection=false;$('cutMode').value=tool;$('keepShape').value='outside';const d=draft();Object.assign(d,{points:[[50,20],[100,20],[100,60],[50,60]],x:150,y:85,diameter:40,corners:[part.x===0?0:1],radius:tool==='sander'?20:0,circleActive:true});const params={draft:machiningClone(d),keep:'outside'},plan=processPlan();check(!plan.error,plan.error);return append(part,plan.pieces,tool,params);}
 let count=0;
 for(const tool of ['circle','scroll','sander'])for(const side of [0,1]){
  const op=setup(),part=state.parts.filter(p=>p.stock==='A').sort((a,b)=>a.x-b.x)[side],processId=process(part,tool),source=JSON.stringify(state),old=machiningClone(state.parts.filter(p=>p.stock==='A'));
  const candidate=planMachiningDeletion(op);check(JSON.stringify(state)===source,'planning mutated state');check(valid(candidate),'invalid deletion');state=candidate;
  const r=state.machiningOperations.find(r=>r.id===processId);check(r.before.w===610&&r.before.x===0,'not reunited');
  if(tool!=='sander'){const absoluteHoles=ps=>ps.flatMap(p=>(p.holes||[]).map(h=>h.map(v=>[n(v[0]+p.x),n(v[1]+p.y)])));check(JSON.stringify(absoluteHoles(old))===JSON.stringify(absoluteHoles(state.parts.filter(p=>p.stock==='A'))),'hole moved');}
  const replay=replayMachining(r,r.before);check(replay.every((p,i)=>machiningGeometry(p)===machiningGeometry(r.after[i])),'replay drift');
  const loaded=designForRuntime(designForSave());check(valid(loaded)&&!loaded.compatibilityWarnings.length,'save roundtrip');state=loaded;const again=planMachiningDeletion(processId);check(valid(again),'second deletion failed');count++;
 }
 const op=setup(),parts=state.parts.filter(p=>p.stock==='A');parts.forEach(p=>process(p,'circle'));let blocked=false;try{planMachiningDeletion(op);}catch{blocked=true;}check(blocked,'both branches must be guarded');
 const usedOp=setup(),p=state.parts.find(p=>p.stock==='A');process(p,'circle');state.parts.find(p=>p.stock==='A').used=true;blocked=false;try{planMachiningDeletion(usedOp);}catch{blocked=true;}check(blocked,'placed parts guard');
 return {singleBranchCases:count,bothBranchesGuard:true,placedGuard:true,replayAndResave:true};
}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
