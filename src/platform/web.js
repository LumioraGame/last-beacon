function localStorageOrNull() { try { return globalThis.localStorage; } catch { return null; } }

function database() {
  return new Promise((resolve,reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Save storage unavailable')); return; }
    const request = indexedDB.open('last-beacon',1);
    request.onupgradeneeded = () => request.result.createObjectStore('checkpoints');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Last Beacon tabs to open save storage'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function checkpointTransaction(mode, action) {
  const db = await database();
  try {
    return await new Promise((resolve,reject) => {
      const transaction = db.transaction('checkpoints',mode);
      let result;
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Save interrupted'));
      action(transaction.objectStore('checkpoints'),value => { result = value; });
    });
  } finally { db.close(); }
}

export const platform = {
  native: false,
  name: 'web',
  async info() { return {build:'web'}; },
  legacyStorage: localStorageOrNull,
  settings: {
    async get(key) { try { return localStorageOrNull()?.getItem(key) ?? null; } catch { return null; } },
    async set(key,value) { const storage = localStorageOrNull(); if (!storage) throw new Error('Settings storage unavailable'); storage.setItem(key,value); }
  },
  runs: {
    async read() {
      return checkpointTransaction('readonly',(store,done) => {
        const request = store.getAll();
        request.onsuccess = () => done(request.result);
      });
    },
    async write(slot,text) { await checkpointTransaction('readwrite',store => store.put(text,slot)); }
  },
  async listen() { return () => {}; },
  async exit() {},
  async haptic() {}
};
