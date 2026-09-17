// Run with NODE_PATH pointing to a Node installation containing playwright.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),file=process.argv[2]||(fs.existsSync(path.join(root,'板材設計_V4.07.html'))?'板材設計_V4.07.html':'index.html');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(root,file)).href);
 const result=await page.evaluate(async()=>{
  const check=(ok,label)=>{if(!ok)throw Error(label);};let checks=0;
  const load=(raw)=>{const value=designForRuntime(structuredClone(raw));check(valid(value),'invalid core');return value;};
  const base=designForSave();
  // The untagged legacy format uses the original internal assembly coordinates.
  const legacy=fresh();delete legacy.machiningOperations;check(load(legacy).parts.length===3,'legacy');checks++;
  const round=load(base);state=round;const twice=load(designForSave());for(let i=0;i<round.parts.length;i++){check(JSON.stringify(round.parts[i].pos)===JSON.stringify(twice.parts[i].pos),'position roundtrip');for(const v of [[1,0,0],[0,1,0],[0,0,1]]){const a=rotate(v,round.parts[i].rot),b=rotate(v,twice.parts[i].rot);check(a.every((n,j)=>Math.abs(n-b[j])<1e-7),'rotation roundtrip');}}checks++;
  for(const [key,value]of Object.entries({machiningOperations:[{tool:'future-cutter'}],references:[{isReference:true,kind:'future-object'}],reportViewAngles:'unknown',reportViewZoom:8,reportReferences:{future:true}})){
   const raw={...structuredClone(base),[key]:value},loaded=load(raw);check(loaded.compatibilityWarnings.includes(key),'missing recovery notice '+key);check(JSON.stringify(loaded.parts)===JSON.stringify(round.parts),'core altered '+key);state=loaded;const saved=designForSave();check(saved.extensions.itazaiRecovery.some(r=>r.key===key&&JSON.stringify(r.value)===JSON.stringify(value)),'lost archive '+key);check(valid(load(saved)),'resave '+key);checks++;
  }
  const future=structuredClone(base);future.machiningOperations=[];future.compatibility.featureVersions.machiningOperations=9;check(load(future).compatibilityWarnings.includes('machiningOperations'),'unknown feature version');checks++;
  const unknown={...structuredClone(base),extensions:{'org.example.future':{version:9,data:[1,2,3]}},futureFeature:{raw:'preserve'}};state=load(unknown);const saved=designForSave();check(saved.extensions['org.example.future'].version===9,'unknown extension lost');check(saved.extensions.itazaiRecovery.some(r=>r.key==='unknownTopLevel'),'unknown root lost');checks++;
  const selection={...structuredClone(base),selected:'missing'};check(load(selection).selected===base.parts[0].id,'selection repair');checks++;
  const malformed=structuredClone(base);malformed.parts[0].w=-10;const previous=JSON.stringify(state);await readDesignFile(new File([JSON.stringify(malformed)],'invalid.json',{type:'application/json'}));check(JSON.stringify(state)===previous,'invalid load modified state');checks++;
  for(const raw of [{...base,schemaVersion:99},{...base,coordinateSystem:'future-axis'}]){let rejected=false;try{load(raw);}catch{rejected=true;}check(rejected,'unsupported core accepted');checks++;}
  return {checks};
 });
 let historical=0;
 for(const dir of ['作成レポート例','設計例']){const folder=path.join(root,dir);if(!fs.existsSync(folder))continue;for(const name of fs.readdirSync(folder).filter(n=>n.endsWith('.json'))){const raw=JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));const r=await page.evaluate(raw=>{const value=designForRuntime(raw);if(!valid(value))throw Error('historical core invalid');state=value;const next=designForRuntime(designForSave());if(!valid(next))throw Error('historical roundtrip invalid');for(let i=0;i<value.parts.length;i++){const a=value.parts[i],b=next.parts[i];for(const k of ['id','name','stock','x','y','w','h','outline','holes','used','cancelled'])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))throw Error('historical field changed '+k);if(a.pos.some((n,j)=>Math.abs(n-b.pos[j])>1e-7))throw Error('historical position changed');for(const v of [[1,0,0],[0,1,0],[0,0,1]]){const x=rotate(v,a.rot),y=rotate(v,b.rot);if(x.some((n,j)=>Math.abs(n-y[j])>1e-7))throw Error('historical rotation changed');}}return {count:value.parts.length,next:next.parts.length};},raw);assert.equal(r.count,r.next);historical++;}}
 console.log(JSON.stringify({passed:result.checks,historicalFiles:historical,file}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
