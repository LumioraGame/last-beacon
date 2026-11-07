import {Game,SAVE_SCHEMA_VERSION,GAME_RULES_VERSION,MAX_SAVE_BYTES} from './game.js';

function parseCheckpoint(text) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES) throw new Error('Invalid checkpoint');
  const value = JSON.parse(text);
  if (value.schemaVersion !== SAVE_SCHEMA_VERSION || value.rulesVersion !== GAME_RULES_VERSION) throw new Error('Incompatible checkpoint');
  if (!Number.isSafeInteger(value.generation) || value.generation < 1 || typeof value.runId !== 'string' || value.runId.length > 128 || !Number.isFinite(value.savedAt) || !['active','terminal','discarded'].includes(value.status)) throw new Error('Invalid checkpoint');
  if (value.status !== 'discarded') {
    const game = Game.fromSnapshot(value.game);
    if ((value.status === 'active') !== game.canEdit()) throw new Error('Checkpoint status mismatch');
  }
  return value;
}

export class RunStore {
  constructor(backend,{onError = () => {}} = {}) {
    this.backend = backend; this.onError = onError; this.generation = 0; this.queue = Promise.resolve(); this.error = null; this.blocked = false;
  }
  async load() {
    const slots = await this.backend.read(), valid = [];
    let corrupt = false, incompatible = false;
    for (const text of slots) {
      if (text == null) continue;
      try { valid.push(parseCheckpoint(text)); }
      catch (error) { if (/Incompatible|incompatible/.test(error.message)) incompatible = true; else corrupt = true; }
    }
    valid.sort((a,b) => b.generation-a.generation);
    this.generation = valid[0]?.generation || 0;
    // A newer app's save must not be silently replaced by an older build or a backup.
    this.blocked = incompatible || corrupt && !valid.length;
    return {checkpoint:incompatible ? null : valid[0] || null,recovered:corrupt && valid.length > 0,blocked:this.blocked};
  }
  save(game,runId) {
    return this.enqueue({runId,status:game.canEdit() ? 'active' : 'terminal',game:game.snapshot()});
  }
  discard() {
    // Explicit user discard is the only operation allowed to replace an incompatible save.
    return this.enqueue({runId:'discarded',status:'discarded'},true);
  }
  enqueue(data,allowBlocked = false) {
    const operation = this.queue.catch(() => {}).then(async () => {
      try {
        if (this.blocked && !allowBlocked) throw new Error('Saved run requires an explicit recovery choice');
        const value = {schemaVersion:SAVE_SCHEMA_VERSION,rulesVersion:GAME_RULES_VERSION,...data,generation:this.generation+1,savedAt:Date.now()};
        const text = JSON.stringify(value); parseCheckpoint(text);
        const slot = value.generation % 2;
        await this.backend.write(slot,text);
        this.generation = value.generation;
        // Terminal/discard markers occupy both slots to prevent fallback resurrecting a finished run.
        if (value.status !== 'active') await this.backend.write(1-slot,text);
        this.blocked = false; this.error = null;
        return value;
      } catch (error) { this.error = error; this.onError(error); throw error; }
    });
    this.queue = operation;
    return operation;
  }
  async flush() { await this.queue; }
}
