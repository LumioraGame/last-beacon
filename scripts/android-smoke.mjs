// Runs against an explicitly selected QA device with the debug APK installed. Starts a new watch; keeps preferences/records.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const serial=process.env.ANDROID_SERIAL;
if(!serial)throw new Error('Select a QA device using ANDROID_SERIAL');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8'}).trim();
const app='ai.lumiora.lastbeacon',port=Number(process.env.LAST_BEACON_CDP_PORT||9235);
const originalRotation=adb('shell','cmd','window','user-rotation');
await mkdir('artifacts/android-smoke',{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){try{if(await check())return;}catch{}await delay(150);}throw new Error(`Timed out: ${label}`);}
let socket,sequence=0,pending=new Map(),viewport;
async function connect(){
  await until(()=>adb('shell','cat','/proc/net/unix').includes('webview_devtools_remote_'),'WebView debugger');
  const socketName=adb('shell','cat','/proc/net/unix').match(/@(webview_devtools_remote_\d+)/)?.[1];
  adb('forward',`tcp:${port}`,`localabstract:${socketName}`);
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.url==='https://localhost/');if(!target)throw new Error('Last Beacon page unavailable');
  viewport=JSON.parse(target.description);
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const value=JSON.parse(event.data),job=pending.get(value.id);if(job){pending.delete(value.id);value.error?job.reject(new Error(value.error.message)):job.resolve(value.result);}};
}
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error(`CDP timeout: ${method}`));}},15000).unref();});}
async function evaluate(expression){const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.text);return response.result.value;}
async function tap(selector){
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  viewport=JSON.parse(targets.find(t=>t.url==='https://localhost/').description);
  const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.hidden)throw new Error('Missing control');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const width=await evaluate('innerWidth'),scale=viewport.width/width;
  adb('shell','input','tap',String(Math.round(viewport.screenX+point.x*scale)),String(Math.round(viewport.screenY+point.y*scale)));
  await delay(100);
}
async function screenshot(name){const result=await call('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/android-smoke/${name}.png`,Buffer.from(result.data,'base64'));}
try{
  adb('shell','am','start','-n',`${app}/.MainActivity`);
  console.log('Android smoke: connecting to the installed QA app');
  await connect();await until(()=>evaluate('document.querySelector(".game-shell").getAttribute("aria-busy")==="false"'),'game startup');
  assert.equal(await evaluate('window.lastBeacon===undefined'),true,'release JS exposes no debug game access');
  if(await evaluate('document.querySelector("#continue-dialog").open')){
    await tap('#new-run');await until(()=>evaluate('!document.querySelector("#continue-dialog").open'),'new watch choice');
  }else{
    await tap('#menu-toggle');await tap('#restart');await tap('#confirm-restart');await until(()=>evaluate('!document.querySelector("#restart-dialog").open'),'new watch');
  }
  await tap('#menu-toggle');
  for(let i=0;i<4;i++){
    const value=await evaluate('document.querySelector("#quality-value").textContent');if(value.includes('2D'))break;
    await tap('#quality');await delay(300);
  }
  adb('shell','input','keyevent','4');await until(()=>evaluate('!document.querySelector("#system-menu").classList.contains("open")'),'Back closes menu');
  if(await evaluate('!document.querySelector("#coach").hidden'))await tap('#coach-close');
  await screenshot('portrait');
  console.log('Android smoke: checking touch building and native Back');
  const credits=Number(await evaluate('document.querySelector("#credits").textContent'));
  assert.ok(credits>=65,'QA watch has enough parts to build');
  await tap('.build-card[data-type="gun"]');
  const pad=await evaluate('[...document.querySelectorAll(".pad-control")].find(e=>/Empty pad|空基座/.test(e.getAttribute("aria-label"))).dataset.pad');
  await tap(`.pad-control[data-pad="${pad}"]`);
  await until(()=>evaluate(`Number(document.querySelector('#credits').textContent)===${credits-65}`),'paid defense');
  await tap('#next-wave');adb('shell','input','keyevent','4');
  await until(()=>evaluate('!document.querySelector("#paused-label").hidden'),'Back pauses wave');
  await delay(1200);await screenshot('paused-wave');
  const files=adb('shell','run-as',app,'ls','files').split(/\s+/).filter(s=>/^last-beacon-run-[01]\.json$/.test(s));
  const checkpoints=files.map(path=>JSON.parse(adb('shell','run-as',app,'cat',`files/${path}`))).sort((a,b)=>b.generation-a.generation);
  assert.ok(checkpoints[0].game.state.towers.length>=2);assert.equal(checkpoints[0].game.state.phase,'wave');
  console.log('Android smoke: checkpoint verified; terminating and relaunching the app');
  adb('shell','am','force-stop',app);socket.close();
  adb('shell','am','start','-n',`${app}/.MainActivity`);await delay(1000);await connect();
  await until(()=>evaluate('document.querySelector(".game-shell").getAttribute("aria-busy")==="false" && document.querySelector("#continue-dialog").open'),'Continue after OS process kill');
  await screenshot('continue-after-kill');await tap('#continue-run');
  assert.ok((await evaluate('document.querySelector("#quality-value").textContent')).includes('2D'),'Preferences quality survives process kill');
  await until(()=>evaluate('!document.querySelector("#paused-label").hidden'),'restored watch paused');
  assert.equal(Number(await evaluate('document.querySelector("#credits").textContent')),checkpoints[0].game.state.credits);
  await tap('#menu-toggle');await tap('#help');
  adb('shell','input','keyevent','4');await until(()=>evaluate('!document.querySelector("#help-dialog").open'),'Back closes help');
  assert.equal(await evaluate('!document.querySelector("#paused-label").hidden'),true);
  adb('shell','cmd','window','user-rotation','lock','1');
  await until(()=>evaluate('innerWidth>innerHeight'),'landscape rotation');
  await screenshot('landscape');
  const boundsOK=await evaluate('[...document.querySelectorAll(".build-bar,.actions,.wave-card,.resources")].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})');
  assert.equal(boundsOK,true,'native landscape controls remain inside viewport');
  await tap('#menu-toggle');await tap('#help');await until(()=>evaluate('document.querySelector("#help-dialog").open'),'landscape handbook');
  adb('shell','input','keyevent','4');await until(()=>evaluate('!document.querySelector("#help-dialog").open'),'landscape Back closes help');
  const packageInfo=adb('shell','dumpsys','package',app);
  const report={serial,app,at:new Date().toISOString(),buildNumber:packageInfo.match(/versionCode=(\d+)/)?.[1],androidAPI:adb('shell','getprop','ro.build.version.sdk'),releaseDebugAbsent:true,tapBuild:true,backMenu:true,backPause:true,processKillContinue:true,preferencesPersist:true,landscapeBounds:true,landscapeHelpAndBack:true,restoredCredits:checkpoints[0].game.state.credits,restoredGeneration:checkpoints[0].generation};
  await writeFile('artifacts/android-smoke/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  socket?.close();adb('forward','--remove',`tcp:${port}`);
  if(originalRotation.includes('lock'))adb('shell','cmd','window','user-rotation','lock',originalRotation.match(/\d/)?.[0]||'0');
  else adb('shell','cmd','window','user-rotation','free');
}
