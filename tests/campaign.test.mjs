import test from 'node:test';
import assert from 'node:assert/strict';
import {runCampaign,mixedDefense} from './fixtures/campaign.mjs';

test('a mixed defense can complete all ten waves within its actual budget',()=>{
  const {game,history}=runCampaign(mixedDefense);
  // 227 original enemies, with splitters replacing 13 of them and each splitter breaking into two spawnlings.
  assert.equal(game.phase,'won');assert.equal(history.length,10);assert.equal(game.kills,247);assert.equal(game.powerUsed,45);
  assert.ok(game.elapsed>300&&game.elapsed<600);
});
test('the same defense falls in the final night when the keeper never lowers the beam',()=>{
  const {game,history}=runCampaign(mixedDefense,{beam:false});
  assert.equal(game.phase,'lost');assert.equal(game.wave,10);assert.equal(history[8].hp,100,'daylight and dusk waves are unaffected');
});
test('the starter turret alone cannot complete the campaign',()=>{
  const {game}=runCampaign(()=>{});assert.equal(game.phase,'lost');assert.ok(game.wave<7);
});
test('hard difficulty defeats the same defense that wins on normal',()=>{
  const {game}=runCampaign((g,w)=>mixedDefense(g,w,false),{difficulty:'hard'});
  assert.equal(game.phase,'lost');assert.ok(game.wave<10);
});
