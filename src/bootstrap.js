import {platform} from './platform/web.js';
import {createSettings} from './storage.js';
import {RunStore} from './run-store.js';
import {createDiagnostics} from './diagnostics.js';
import {startApp} from './app.js';

async function bootstrap() {
  const version = typeof __LAST_BEACON_VERSION__ === 'undefined' ? '1.0.0' : __LAST_BEACON_VERSION__;
  const diagnostics = createDiagnostics(platform,{version});
  try { const info = await platform.info(); Object.assign(diagnostics.context,{build:info.build,...(info.version ? {version:info.version} : {})}); }
  catch (error) { diagnostics.record(error,'app-info'); }
  const report = error => diagnostics.record(error,'storage');
  const storage = await createSettings(platform.settings,{legacy:platform.legacyStorage(),migrate:platform.native,onError:report});
  const runs = new RunStore(platform.runs,{onError:report});
  let saved;
  try { saved = await runs.load(); }
  catch (error) { report(error); runs.blocked = true; saved = {checkpoint:null,blocked:true,error}; }
  document.documentElement.classList.toggle('native-app',platform.native);
  startApp({platform,storage,runs,saved,diagnostics});
}
bootstrap().catch(error => {
  document.getElementById('startup-loading').hidden = true;
  console.error('Last Beacon could not start',error);
  const panel = document.createElement('div'); panel.className = 'startup-error'; panel.setAttribute('role','alert');
  const text = document.createElement('p'); text.textContent = '灯塔暂时无法启动。存档未被清除。 / Unable to start. Your saved run has been kept.';
  const retry = document.createElement('button'); retry.className = 'primary-button'; retry.textContent = '重试 / Retry'; retry.onclick = () => location.reload();
  panel.append(text,retry); document.body.append(panel);
});
