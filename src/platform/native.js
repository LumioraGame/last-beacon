import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Preferences} from '@capacitor/preferences';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Haptics,ImpactStyle} from '@capacitor/haptics';

const directory = Directory.Data, encoding = Encoding.UTF8;
const pathFor = slot => `last-beacon-run-${slot}.json`;
async function readFile(path) {
  try { return (await Filesystem.readFile({path,directory,encoding})).data; }
  catch (error) { if (['OS-PLUG-FILE-0008','ENOENT'].includes(error.code) || /does not exist|not found|no such file/i.test(error.message || '')) return null; throw error; }
}
export const platform = {
  native: true,
  name: Capacitor.getPlatform(),
  async info() { return App.getInfo(); },
  legacyStorage() { try { return localStorage; } catch { return null; } },
  settings: {
    async get(key) { return (await Preferences.get({key})).value; },
    async set(key,value) { await Preferences.set({key,value}); }
  },
  runs: {
    async read() { return Promise.all([readFile(pathFor(0)),readFile(pathFor(1))]); },
    async write(slot,text) {
      const path = pathFor(slot), temp = `${path}.pending`;
      await Filesystem.writeFile({path:temp,directory,encoding,data:text});
      if (await readFile(temp) !== text) throw new Error('Save write verification failed');
      // The other slot remains committed throughout promotion, even if this platform cannot overwrite on rename.
      if (await readFile(path) !== null) await Filesystem.deleteFile({path,directory});
      await Filesystem.rename({from:temp,to:path,directory,toDirectory:directory});
      if (await readFile(path) !== text) throw new Error('Save promotion verification failed');
    }
  },
  async listen({suspend,resume,back}) {
    const listeners = [];
    listeners.push(await App.addListener('appStateChange',({isActive}) => isActive ? resume() : suspend()));
    listeners.push(await App.addListener('pause',suspend));
    listeners.push(await App.addListener('resume',resume));
    if (Capacitor.getPlatform() === 'android') listeners.push(await App.addListener('backButton',back));
    return () => { for (const listener of listeners) void listener.remove(); };
  },
  async exit() { if (Capacitor.getPlatform() === 'android') await App.exitApp(); },
  async haptic(kind) { try { await Haptics.impact({style:kind === 'boss' ? ImpactStyle.Heavy : ImpactStyle.Light}); } catch {} }
};
