import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,PADS,PATH_LENGTH,pathPosition,upgradeCost,MAX_SAVE_BYTES} from '../src/game.js';
import {RunStore} from '../src/run-store.js';
import {runCampaign,mixedDefense} from './fixtures/campaign.mjs';

function extendDefense(game){
  // Spend only earned parts through the same public actions as the player.
  for(let actions=0;actions<50;actions++){
    if(game.upgradeGrid())continue;
    const tower=game.towers.find(t=>t.powered&&t.type!=='relay'&&t.level<3&&upgradeCost(t)<=game.credits);
    if(tower&&game.upgrade(tower.id).ok)continue;
    let built=false;
    for(const pad of PADS){
      if(game.towers.some(t=>t.pad===pad.id))continue;
      for(const type of ['mortar','arc','frost','relay'])if(game.build(type,pad.id).ok){built=true;break;}
      if(built)break;
    }
    if(!built)break;
  }
}

test('extended real-budget endless checkpoints fit the limit and continue identically',async t=>{
  const {game}=runCampaign(mixedDefense,{difficulty:'easy'});
  assert.equal(game.phase,'won');assert.equal(game.continueEndless(),true);
  let restored=Game.fromSnapshot(game.snapshot()),peakBytes=0,checkpoints=0;
  const slots=new Map(),store=new RunStore({async read(){return [...slots.values()];},async write(slot,text){slots.set(slot,text);}});
  await store.load();
  for(let round=0;round<30&&game.canEdit();round++){
    extendDefense(game);extendDefense(restored);
    assert.deepEqual(restored.snapshot(),game.snapshot());
    assert.equal(game.startWave(),true);assert.equal(restored.startWave(),true);
    let ticks=0;
    while(game.phase==='wave'&&ticks++<15000){
      if(game.enemies.length){
        const lead=game.enemies.reduce((a,b)=>a.distance>b.distance?a:b);
        if(ticks%120===1||!game.beam.spot){const p=pathPosition(Math.min(PATH_LENGTH,lead.distance+.8));game.aimBeam(p.x,p.y);restored.aimBeam(p.x,p.y);}
        if(game.overdriveCooldown<=0&&game.enemies.length>4){game.activateOverdrive();restored.activateOverdrive();}
        if(game.strikeCooldown<=0&&game.enemies.length>3){game.activateStrike(lead.x,lead.y);restored.activateStrike(lead.x,lead.y);}
      }
      game.tick(.05);restored.tick(.05);game.events.length=0;restored.events.length=0;
      if(ticks%100===0){
        assert.deepEqual(restored.snapshot(),game.snapshot(),`Endless wave ${game.wave}, tick ${ticks}`);
        const checkpoint=await store.save(game,'extended-endless');
        peakBytes=Math.max(peakBytes,Buffer.byteLength(JSON.stringify(checkpoint),'utf8'));
        assert.ok(peakBytes<MAX_SAVE_BYTES);
        const loaded=await new RunStore(store.backend).load();
        restored=Game.fromSnapshot(loaded.checkpoint.game);checkpoints++;
      }
    }
    assert.ok(ticks<15000,'an endless wave must finish');
    assert.deepEqual(restored.snapshot(),game.snapshot());
  }
  assert.ok(game.wave>=20,'exercise at least ten endless waves');
  assert.ok(game.time>=1200,'exercise at least twenty minutes of simulation');
  assert.ok(checkpoints>=100);
  t.diagnostic(`Reached wave ${game.wave}; ${checkpoints} checkpoints; peak ${peakBytes} bytes of ${MAX_SAVE_BYTES}; ${Math.round(game.time)} simulated seconds`);
});

test('oversized checkpoints are rejected without replacing a committed watch',async()=>{
  const game=new Game(),snapshot=game.snapshot();snapshot.extra='x'.repeat(MAX_SAVE_BYTES);
  assert.throws(()=>Game.fromSnapshot(snapshot),/too large/);
  const slots=new Map(),store=new RunStore({async read(){return [...slots.values()];},async write(slot,text){slots.set(slot,text);}});
  await store.load();await store.save(game,'valid-watch');
  const previous=[...slots.values()];
  game.snapshot=()=>snapshot;
  await assert.rejects(store.save(game,'too-large'),/Invalid checkpoint/);
  assert.deepEqual([...slots.values()],previous);
  assert.equal((await new RunStore(store.backend).load()).checkpoint.runId,'valid-watch');
});
