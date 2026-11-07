import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Game} from '../../src/game.js';
import {RunStore} from '../../src/run-store.js';

// Bundle the actual native adapter, replacing only the Capacitor bridge. Keep this
// separate from zero-install rule tests: it needs the pinned native build tooling.
const files=new Map();
let operation=0,interruptAfter=Infinity,writeDamage=false,promotionDamage=false,readError=null;
const missing=()=>Object.assign(new Error('File does not exist'),{code:'OS-PLUG-FILE-0008'});
async function step(action){const result=action();if(++operation===interruptAfter)throw new Error('Injected process interruption');return result;}
const filesystem={
  async writeFile({path,directory,encoding,data}){
    assert.equal(directory,'DATA');assert.equal(encoding,'utf8');
    return step(()=>{files.set(path,writeDamage?'partial checkpoint':data);});
  },
  async readFile({path,directory,encoding}){
    assert.equal(directory,'DATA');assert.equal(encoding,'utf8');
    if(readError)throw readError;
    return step(()=>{if(!files.has(path))throw missing();return {data:files.get(path)};});
  },
  async deleteFile({path,directory}){
    assert.equal(directory,'DATA');return step(()=>{if(!files.delete(path))throw missing();});
  },
  async rename({from,to,directory,toDirectory}){
    assert.equal(directory,'DATA');assert.equal(toDirectory,'DATA');
    return step(()=>{if(!files.has(from))throw missing();assert.equal(files.has(to),false,'native rename requires an absent destination');files.set(to,promotionDamage?'damaged promotion':files.get(from));files.delete(from);});
  }
};
const bridgeKey=Symbol.for('last-beacon-storage-test-bridge');
globalThis[bridgeKey]=filesystem;
const shims={
  '@capacitor/core':'export const Capacitor={getPlatform:()=>"ios"};',
  '@capacitor/app':'export const App={};',
  '@capacitor/preferences':'export const Preferences={};',
  '@capacitor/haptics':'export const Haptics={};export const ImpactStyle={};',
  '@capacitor/filesystem':'export const Filesystem=globalThis[Symbol.for("last-beacon-storage-test-bridge")];export const Directory={Data:"DATA"};export const Encoding={UTF8:"utf8"};'
};
const result=await build({
  entryPoints:['src/platform/native.js'],bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'test-native-bridge',setup(builder){
    builder.onResolve({filter:/^@capacitor\//},args=>({path:args.path,namespace:'test-bridge'}));
    builder.onLoad({filter:/.*/,namespace:'test-bridge'},args=>({contents:shims[args.path],loader:'js'}));
  }}]
});
const {platform}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
delete globalThis[bridgeKey];

async function seeded(){
  files.clear();operation=0;interruptAfter=Infinity;writeDamage=false;promotionDamage=false;readError=null;
  const game=new Game(),store=new RunStore(platform.runs);await store.load();
  await store.save(game,'watch');await store.save(game,'watch');
  assert.equal(store.generation,2);
  operation=0;
  return {game,store,previous:files.get('last-beacon-run-0.json')};
}

for(let cut=1;cut<=6;cut++)test(`native checkpoint survives interruption after file operation ${cut}`,async()=>{
  const {game,store,previous}=await seeded();game.startWave();interruptAfter=cut;
  await assert.rejects(store.save(game,'watch'),/Injected process interruption/);
  interruptAfter=Infinity;
  assert.equal(files.get('last-beacon-run-0.json'),previous,'the last committed backup must survive every promotion step');
  const reloaded=new RunStore(platform.runs),saved=await reloaded.load();
  assert.equal(saved.blocked,false);assert.equal(saved.checkpoint.generation,cut>=5?3:2);
  assert.equal(saved.checkpoint.game.state.phase,cut>=5?'wave':'build');
  await reloaded.save(game,'watch');
  assert.equal((await new RunStore(platform.runs).load()).checkpoint.game.state.phase,'wave','a fresh process can retry after any interruption');
});

test('partial native writes fail verification and preserve both committed checkpoints',async()=>{
  const {game,store,previous}=await seeded();const older=files.get('last-beacon-run-1.json');
  game.startWave();writeDamage=true;
  await assert.rejects(store.save(game,'watch'),/write verification failed/);
  assert.equal(files.get('last-beacon-run-0.json'),previous);assert.equal(files.get('last-beacon-run-1.json'),older);
  assert.equal((await new RunStore(platform.runs).load()).checkpoint.generation,2);
  writeDamage=false;await store.save(game,'watch');
  assert.equal((await new RunStore(platform.runs).load()).checkpoint.game.state.phase,'wave');
});

test('damaged native promotion falls back to the verified previous checkpoint',async()=>{
  const {game,store,previous}=await seeded();game.startWave();promotionDamage=true;
  await assert.rejects(store.save(game,'watch'),/promotion verification failed/);
  assert.equal(files.get('last-beacon-run-0.json'),previous);
  const saved=await new RunStore(platform.runs).load();
  assert.equal(saved.recovered,true);assert.equal(saved.checkpoint.generation,2);
});

for(const status of ['terminal','discarded'])test(`committed native ${status} marker survives interruption while duplicating slots`,async()=>{
  // Six bridge operations promote the first marker, then six promote its backup.
  for(let cut=5;cut<=12;cut++){
    const {game,store}=await seeded();game.hp=0;game.phase='lost';interruptAfter=cut;
    await assert.rejects(status==='discarded'?store.discard():store.save(game,'watch'),/Injected process interruption/);
    interruptAfter=Infinity;
    const saved=await new RunStore(platform.runs).load();
    assert.equal(saved.checkpoint.status,status,`operation ${cut} must not resurrect the older live watch`);
    assert.equal(saved.checkpoint.generation,3);
  }
});

test('native read treats only absent files as empty, preserving permission and storage errors',async()=>{
  await seeded();
  for(const code of ['OS-PLUG-FILE-0012','EACCES','ENOSPC']){
    readError=Object.assign(new Error('Storage operation failed'),{code});
    await assert.rejects(platform.runs.read(),error=>error.code===code);
  }
  readError=null;files.clear();assert.deepEqual(await platform.runs.read(),[null,null]);
});
