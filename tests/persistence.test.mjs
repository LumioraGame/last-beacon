import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,MAX_SAVE_BYTES} from '../src/game.js';
import {RunStore} from '../src/run-store.js';
import {createSettings} from '../src/storage.js';
import {createPauseState} from '../src/lifecycle.js';
import {mixedDefense} from './fixtures/campaign.mjs';

function memoryBackend(){
  const slots = new Map();
  return {slots,async read(){return [...slots.values()];},async write(slot,text){slots.set(slot,text);}};
}
function compareContinuation(game,ticks=250){
  const snapshot=JSON.parse(JSON.stringify(game.snapshot())), restored=Game.fromSnapshot(snapshot);
  assert.deepEqual(restored.snapshot(),snapshot);
  assert.equal(restored.events.length,0);
  for(let i=0;i<ticks;i++){
    game.tick(.025);restored.tick(.025);
    assert.deepEqual(restored.snapshot(),game.snapshot(),`Diverged at tick ${i}`);
    game.events.length=0;restored.events.length=0;
  }
}
test('build and mid-wave saves continue deterministically with projectiles and beam state',()=>{
  const game=new Game();
  game.build('mortar',3);game.build('gun',1);
  compareContinuation(game,5);game.startWave();game.aimBeam(7,4);
  for(let i=0;i<220;i++)game.tick(.05);
  game.activateOverdrive();game.activateStrike(3,4);
  assert.ok(game.enemies.length);assert.ok(game.strikes.length);
  compareContinuation(game);
});
test('all weapon projectile types, sold tower IDs, and statuses survive a checkpoint',()=>{
  for(const kind of ['gun','mortar','frost','arc']){
    const game=new Game({starter:false});game.credits=1000;game.build(kind,0);game.startWave();
    const enemy=game.spawn('tank',20);Object.assign(enemy,{slow:1,stun:.2,hit:.1});
    const tower=game.towers[0],p={x:tower.x,y:tower.y,fromX:tower.x,fromY:tower.y,toX:enemy.x,toY:enemy.y,target:enemy.id,tower:tower.id,kind,damage:12,age:0,duration:.12};
    if(kind==='mortar')p.splash=1.15;if(kind==='frost')p.slow=.48;
    if(kind==='arc')Object.assign(p,{chain:[enemy.id],points:[{x:enemy.x,y:enemy.y}],falloff:.65});
    game.projectiles.push(p);game.sell(tower.id);compareContinuation(game,40);
  }
});
test('night, boss and endless checkpoints preserve rules and never replay rewards',()=>{
  const game=new Game();game.wave=9;game.startWave();game.spawn('boss',3);game.aimBeam(3,4);
  compareContinuation(game,30);
  game.phase='won';game.enemies=[];game.queue=[];game.projectiles=[];game.strikes=[];
  compareContinuation(game,2);assert.equal(game.continueEndless(),true);game.startWave();
  compareContinuation(game,30);
  assert.ok(JSON.stringify(game.snapshot()).length<MAX_SAVE_BYTES);
});
test('snapshots own their nested arrays and reject malformed, duplicate and future data',()=>{
  const game=new Game();const s=game.snapshot();s.state.towers[0].level=2;assert.equal(game.towers[0].level,1);
  for(const mutate of [s=>s.schemaVersion++,s=>s.state.hp=NaN,s=>s.state.towers.push({...s.state.towers[0]}),s=>s.state.nextId=1,s=>s.state.beam.aim={x:3,y:4},s=>s.state.towers[0].type='__proto__']){
    const s=game.snapshot();mutate(s);assert.throws(()=>Game.fromSnapshot(s));
  }
  const untrusted=game.snapshot();untrusted.state.constructor='ignored';untrusted.state.towers[0].powered=false;
  const restored=Game.fromSnapshot(untrusted);assert.ok(restored instanceof Game);assert.equal(restored.towers[0].powered,true);
});
test('checkpoints recover the previous valid generation and protect incompatible saves',async()=>{
  const backend=memoryBackend(),store=new RunStore(backend),game=new Game();await store.load();
  await store.save(game,'watch');game.startWave();await store.save(game,'watch');
  backend.slots.set(0,'{broken');
  const recovered=await new RunStore(backend).load();assert.equal(recovered.recovered,true);assert.equal(recovered.checkpoint.game.state.phase,'build');
  backend.slots.set(0,JSON.stringify({schemaVersion:999}));
  const older=new RunStore(backend);assert.equal((await older.load()).blocked,true);await assert.rejects(older.save(game,'watch'));
  await older.discard();assert.equal((await new RunStore(backend).load()).checkpoint.status,'discarded');
});
test('terminal markers do not resurrect live runs when either slot is corrupt',async()=>{
  const backend=memoryBackend(),store=new RunStore(backend),game=new Game();await store.load();
  await store.save(game,'watch');game.hp=0;game.phase='lost';await store.save(game,'watch');
  for(const slot of [0,1]){
    const text=backend.slots.get(slot);backend.slots.set(slot,'broken');
    assert.equal((await new RunStore(backend).load()).checkpoint.status,'terminal');backend.slots.set(slot,text);
  }
});
test('interrupted writes preserve the last committed checkpoint and can retry',async()=>{
  const backend=memoryBackend(),store=new RunStore(backend),game=new Game();await store.load();await store.save(game,'watch');
  const write=backend.write;backend.write=async()=>{throw new Error('Full storage');};
  game.startWave();await assert.rejects(store.save(game,'watch'));assert.ok(store.error);
  assert.equal((await new RunStore(backend).load()).checkpoint.game.state.phase,'build');
  backend.write=write;await store.save(game,'watch');assert.equal(store.error,null);
  assert.equal((await new RunStore(backend).load()).checkpoint.game.state.phase,'wave');
});
test('native settings hydrate before use and migrate only missing validated values',async()=>{
  const values=new Map([['last-beacon-language','zh']]),backend={async get(k){return values.get(k)??null;},async set(k,v){values.set(k,v);}};
  const legacy={getItem:k=>({'last-beacon-language':'en','last-beacon-difficulty':'hard','last-beacon-coach':'["invalid"]'})[k]};
  const settings=await createSettings(backend,{legacy,migrate:true});
  assert.equal(settings.getItem('last-beacon-language'),'zh');assert.equal(settings.getItem('last-beacon-difficulty'),'hard');assert.equal(settings.getItem('last-beacon-coach'),null);
  values.delete('last-beacon-difficulty');
  const nextLaunch=await createSettings(backend,{legacy,migrate:true});assert.equal(nextLaunch.getItem('last-beacon-difficulty'),null,'completed migration does not resurrect a stale legacy key');
  settings.setItem('last-beacon-language','en');await settings.flush();assert.equal(values.get('last-beacon-language'),'en');
  const set=backend.set;backend.set=async()=>{throw new Error('Full');};settings.setItem('last-beacon-quality','low');await assert.rejects(settings.flush());
  backend.set=set;await settings.flush();assert.equal(values.get('last-beacon-quality'),'low');
});
test('a failed native settings read cannot migrate over an unread existing value',async()=>{
  let writes=0;
  const backend={async get(){throw new Error('Temporarily unavailable');},async set(){writes++;}};
  await assert.rejects(createSettings(backend,{migrate:true,legacy:{getItem:()=> 'en'}}));
  assert.equal(writes,0);
});
test('dialog closure cannot clear a background or user pause',()=>{
  let paused=false;const state=createPauseState(value=>{paused=value;});
  state.set('dialog:help',true);state.set('lifecycle',true);state.set('dialog:help',false);assert.equal(paused,true);
  state.resume();assert.equal(paused,false);state.set('user',true);state.set('dialog:help',true);state.set('dialog:help',false);assert.equal(paused,true);
});
test('a complete real-budget campaign survives repeated checkpoint restoration',()=>{
  let game=new Game(),restores=0;
  for(let wave=1;wave<=10;wave++){
    mixedDefense(game,wave);assert.equal(game.startWave(),true);
    let ticks=0,beamTimer=0;
    while(game.phase==='wave'&&ticks++<15000){
      beamTimer-=.05;
      if(game.enemies.length&&beamTimer<=0){const e=game.enemies.reduce((a,b)=>a.distance>b.distance?a:b);game.aimBeam(e.x,e.y);beamTimer=8;}
      if(game.overdriveCooldown<=0&&game.enemies.length>4)game.activateOverdrive();
      game.tick(.05);game.events.length=0;
      if(ticks%73===0){game=Game.fromSnapshot(JSON.parse(JSON.stringify(game.snapshot())));restores++;}
    }
    assert.notEqual(game.phase,'lost',`Lost at wave ${wave}`);
  }
  assert.equal(game.phase,'won');assert.ok(restores>50);
});
