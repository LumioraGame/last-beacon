export const SETTINGS_KEYS = ['last-beacon-best','last-beacon-difficulty','last-beacon-quality','last-beacon-language','last-beacon-coach','last-beacon-camera-hint'];
export const SETTINGS_MIGRATION_KEY = 'last-beacon-settings-migrated-v1';

export function validSetting(key, value) {
  if (typeof value !== 'string' || value.length > 16384) return false;
  if (key === 'last-beacon-language') return ['zh','en'].includes(value);
  if (key === 'last-beacon-difficulty') return ['easy','normal','hard'].includes(value);
  if (key === 'last-beacon-quality') return ['high','medium','low','classic'].includes(value);
  if (key === 'last-beacon-camera-hint') return value === '1';
  try {
    const data = JSON.parse(value);
    if (key === 'last-beacon-coach') return Array.isArray(data) && data.every(s => ['build','start','beam','night'].includes(s));
    if (key === 'last-beacon-best') {
      const record = r => r && Number.isInteger(r.wave) && r.wave >= 0 && r.wave <= 10 && typeof r.won === 'boolean' && (r.endless === undefined || Number.isSafeInteger(r.endless) && r.endless >= 0);
      return record(data) || data && typeof data === 'object' && Object.entries(data).every(([k,r]) => ['easy','normal','hard'].includes(k) && record(r));
    }
  } catch {}
  return false;
}

// Consumers stay synchronous after hydration. Failed writes remain dirty until a successful flush.
export async function createSettings(backend, {legacy, migrate = false, onError = () => {}} = {}) {
  const values = new Map(), dirty = new Map();
  let queue = Promise.resolve(), lastError = null, readFailed = false;
  let needsMigration = false;
  if (migrate) {
    try { needsMigration = await backend.get(SETTINGS_MIGRATION_KEY) !== '1'; }
    catch (error) { onError(error); throw error; }
  }
  for (const key of SETTINGS_KEYS) {
    let value = null;
    let loaded = false;
    try { value = await backend.get(key); loaded = true; } catch (error) { readFailed = true; lastError = error; onError(error); }
    if (loaded && value === null && needsMigration) {
      try { const old = legacy?.getItem(key); if (validSetting(key,old)) { value = old; dirty.set(key,old); } } catch {}
    }
    if (validSetting(key,value)) values.set(key,value);
  }
  // An unread native setting is different from an absent one. Do not replace it with a default/migration.
  if (readFailed) throw lastError;
  const settings = {
    onError: null,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key,value) {
      value = String(value);
      if (!validSetting(key,value)) throw new Error(`Invalid setting: ${key}`);
      values.set(key,value); dirty.set(key,value);
      void settings.flush().catch(() => {});
    },
    get error() { return lastError; },
    flush() {
      const operation = queue.catch(() => {}).then(async () => {
        try {
          for (const [key,value] of dirty) {
            await backend.set(key,value);
            if (await backend.get(key) !== value) throw new Error('Settings write verification failed');
            if (dirty.get(key) === value) dirty.delete(key);
          }
          lastError = null;
        } catch (error) { lastError = error; onError(error); settings.onError?.(error); throw error; }
      });
      queue = operation;
      return operation;
    }
  };
  if (dirty.size) await settings.flush().catch(() => {});
  if (needsMigration && !lastError) {
    try {
      await backend.set(SETTINGS_MIGRATION_KEY,'1');
      if (await backend.get(SETTINGS_MIGRATION_KEY) !== '1') throw new Error('Settings migration verification failed');
    } catch (error) { lastError = error; onError(error); }
  }
  return settings;
}
