import assert from 'node:assert/strict';
import {Game,PATH_LENGTH,pathPosition} from '../../src/game.js';

// A finite-budget campaign: every action uses the same public methods as the UI.
// This catches accidental unwinnable curves, resource bugs, and stalled waves.
// The keeper lowers the beam just ahead of the leading enemy whenever it has lifted, and at least every eight seconds.
function keeper(){
  let timer=0;
  return g=>{
    timer-=.05;if(!g.enemies.length||(timer>0&&g.beam.spot))return;
    timer=8;const lead=g.enemies.reduce((a,b)=>a.distance>b.distance?a:b),p=pathPosition(Math.min(PATH_LENGTH,lead.distance+.8));
    g.aimBeam(p.x,p.y);
  };
}
export function runCampaign(deploy,{beam=true,...options}={}){
  const game=new Game(options),history=[],light=beam?keeper():()=>{};
  for(let wave=1;wave<=10;wave++){
    deploy(game,wave);
    assert.equal(game.startWave(),true);
    let ticks=0;
    while(game.phase==='wave'&&ticks++<10000){
      if(game.overdriveCooldown<=0&&game.enemies.length>4)game.activateOverdrive();
      light(game);game.tick(.05);game.events.length=0;
    }
    assert.ok(ticks<10000,`Wave ${wave} never completed`);
    assert.ok(game.credits>=0);assert.ok(game.powerUsed<=game.capacity);
    history.push({wave,hp:game.hp,credits:game.credits,seconds:Math.round(game.elapsed)});
    if(game.phase==='lost')break;
  }
  return {game,history};
}
export function mixedDefense(g,w,strict=true){
  const check=(ok,label)=>{if(strict)assert.equal(ok,true,`W${w}: ${label}`);};
  const build=(type,pad)=>check(g.build(type,pad).ok,`build ${type}`);
  const up=pad=>{const tower=g.towers.find(t=>t.pad===pad);check(!!tower&&g.upgrade(tower.id).ok,`upgrade pad ${pad}`);};
  const grid=()=>check(g.upgradeGrid(),'upgrade grid');
  if(w===1){build('gun',1);build('mortar',3);}
  if(w===2)up(3);
  if(w===3){grid();build('frost',4);}
  if(w===4){build('mortar',7);up(1);}
  if(w===5){grid();up(3);}
  if(w===6){build('mortar',8);up(0);}
  if(w===7){grid();up(8);up(4);up(7);}
  if(w===8){up(8);up(1);up(0);}
  if(w===9){grid();build('gun',10);up(10);up(4);}
  if(w===10){up(10);build('gun',2);up(2);up(2);}
}
