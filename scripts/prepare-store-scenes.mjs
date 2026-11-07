import {mkdir,writeFile} from 'node:fs/promises';
import {Game,PATH_LENGTH,pathPosition} from '../src/game.js';
import {mixedDefense} from '../tests/fixtures/campaign.mjs';

// Capture preparation uses the same finite-budget defense as the campaign regression, without resource edits.
const game=new Game(),scenes=new Map();let beamTimer=0;
for(let wave=1;wave<=10;wave++){
  mixedDefense(game,wave);
  if(wave===1)scenes.set('connected-defense',game.snapshot());
  game.startWave();let ticks=0;
  while(game.phase==='wave'&&ticks++<15000){
    beamTimer-=.05;
    if(game.enemies.length&&(beamTimer<=0||!game.beam.spot)){
      beamTimer=8;const lead=game.enemies.reduce((a,b)=>a.distance>b.distance?a:b),point=pathPosition(Math.min(PATH_LENGTH,lead.distance+.8));game.aimBeam(point.x,point.y);
    }
    if(game.overdriveCooldown<=0&&game.enemies.length>4)game.activateOverdrive();
    game.tick(.05);game.events.length=0;
    if(wave===5&&ticks===200)scenes.set('night-watch',game.snapshot());
    if(wave===10&&!scenes.has('abyssal-colossus')&&game.enemies.some(e=>e.type==='boss'&&e.distance>=2))scenes.set('abyssal-colossus',game.snapshot());
  }
  if(game.phase==='lost')throw new Error(`Campaign fixture lost at wave ${wave}`);
}
if(game.phase!=='won'||scenes.size!==3)throw new Error('Store scenes require a complete real-budget campaign');
await mkdir('artifacts/store-scenes',{recursive:true});
const manifest=[];
for(const [name,snapshot] of scenes){
  const restored=Game.fromSnapshot(snapshot);if(!restored.canEdit())throw new Error('Scene must be a playable checkpoint');
  const checkpoint={schemaVersion:snapshot.schemaVersion,rulesVersion:snapshot.rulesVersion,status:'active',runId:`store-${name}`,generation:500000+manifest.length*1000,savedAt:Date.now(),game:snapshot};
  await writeFile(`artifacts/store-scenes/${name}.json`,JSON.stringify(checkpoint));
  manifest.push({name,wave:snapshot.state.wave,phase:snapshot.state.phase,credits:snapshot.state.credits,towers:snapshot.state.towers.length});
}
await writeFile('artifacts/store-scenes/manifest.json',JSON.stringify({preparation:'Public Game actions; finite-budget full campaign regression',result:game.phase,scenes:manifest},null,2));
console.log(JSON.stringify(manifest,null,2));
