import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const serial=process.env.ANDROID_SERIAL;if(!serial)throw new Error('Select a dedicated QA device using ANDROID_SERIAL; capture replaces its Last Beacon watch');
const app='ai.lumiora.lastbeacon',port=9236;
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8'}).trim();
const originalSize=adb('shell','wm','size'),originalDensity=adb('shell','wm','density'),originalRotation=adb('shell','cmd','window','user-rotation');
const scenes=JSON.parse(await readFile('artifacts/store-scenes/manifest.json','utf8')).scenes;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){const start=Date.now();while(Date.now()-start<45000){try{if(await check())return;}catch{}await wait(150);}throw new Error(`Timed out: ${label}`);}
let socket,sequence=0;const pending=new Map(),captures=[];
async function connect(){
  await until(()=>{const pid=adb('shell','pidof',app).split(' ')[0];return adb('shell','cat','/proc/net/unix').includes(`@webview_devtools_remote_${pid}`);},'WebView');
  const pid=adb('shell','pidof',app).split(' ')[0];adb('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),target=targets.find(t=>t.url==='https://localhost/');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const value=JSON.parse(event.data),job=pending.get(value.id);if(job){pending.delete(value.id);value.error?job.reject(new Error(value.error.message)):job.resolve(value.result);}};
}
function evaluate(expression){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve:result=>result.exceptionDetails?reject(new Error(result.exceptionDetails.text)):resolve(result.result.value),reject});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('WebView evaluation timed out'));}},45000).unref();});}
try{
  adb('shell','cmd','window','user-rotation','lock','0');
  for(const [format,size,density] of [['phone','1080x1920','420'],['tablet','1600x2560','320']]){
    adb('shell','wm','size',size);adb('shell','wm','density',density);
    for(const locale of ['en','zh-Hans'])for(const scene of scenes){
      socket?.close();adb('shell','am','force-stop',app);
      adb('push',`artifacts/store-scenes/${scene.name}.json`,'/data/local/tmp/last-beacon-store.json');adb('shell','run-as',app,'mkdir','-p','files');
      for(const slot of [0,1])adb('shell','run-as',app,'cp','/data/local/tmp/last-beacon-store.json',`files/last-beacon-run-${slot}.json`);
      adb('shell','am','start','-n',`${app}/.MainActivity`);await connect();
      await until(()=>evaluate('document.querySelector(".game-shell").getAttribute("aria-busy")==="false"'),'game ready');
      await evaluate('document.querySelector("#continue-run").click()');
      for(let i=0;i<4;i++){
        if(await evaluate('["Med","中"].includes(document.querySelector("#quality-value").textContent)'))break;
        await evaluate('document.querySelector("#quality").click()');
      }
      const language=locale==='en'?'en':'zh-CN';
      if(await evaluate('document.documentElement.lang')!==language)await evaluate('document.querySelector("#language-toggle").click()');
      await evaluate('if(!document.querySelector("#coach").hidden)document.querySelector("#coach-close").click();document.querySelector("#resume").click()');
      await evaluate('new Promise(resolve=>{const end=performance.now()+3000;function frame(now){if(now>=end)resolve(true);else requestAnimationFrame(frame);}requestAnimationFrame(frame);})');
      if(await evaluate('document.querySelector("#error-dialog").open || !document.querySelector("#paused-label").hidden || !document.querySelector(".game-shell").classList.contains("three-d")'))throw new Error('Capture requires live 3D gameplay');
      const dir=`artifacts/store-screenshots/android/${format}/${locale}`;await mkdir(dir,{recursive:true});
      const raw=execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16*1024*1024}),file=`${dir}/${scene.name}.png`;
      await sharp(raw).removeAlpha().png().toFile(file);const meta=await sharp(file).metadata();
      if(Math.max(meta.width,meta.height)>2*Math.min(meta.width,meta.height))throw new Error('Screenshot aspect ratio exceeds Play limits');
      captures.push({file,locale,format,scene:scene.name,width:meta.width,height:meta.height});console.log(file);
    }
  }
  const build=adb('shell','dumpsys','package',app).match(/versionCode=(\d+)/)?.[1];
  const nativeWebSHA256=createHash('sha256').update(await readFile('android/app/src/main/assets/public/app.js')).digest('hex');
  await writeFile('artifacts/store-screenshots/android/manifest.json',JSON.stringify({serial,appId:app,build,nativeWebSHA256,captures},null,2));
}finally{
  socket?.close();adb('shell','am','force-stop',app);adb('forward','--remove',`tcp:${port}`);
  const size=originalSize.match(/Override size: (\d+x\d+)/)?.[1],density=originalDensity.match(/Override density: (\d+)/)?.[1];
  adb('shell','wm','size',size||'reset');adb('shell','wm','density',density||'reset');
  if(originalRotation.includes('lock'))adb('shell','cmd','window','user-rotation','lock',originalRotation.match(/\d/)?.[0]||'0');else adb('shell','cmd','window','user-rotation','free');
}
