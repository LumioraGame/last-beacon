export function createDiagnostics(platform,{version = '1.0.0'} = {}) {
  const entries = [], context = {version,platform:platform.name};
  let fatalHandler = null, timer;
  const clean = value => String(value || '').replace(/(?:file:\/\/|\/Users\/|\/Volumes\/|\/(?:private|var|data|storage)\/)[^\s)]+/g,'[local file]').replace(/https?:\/\/[^\s)]+/g,'[app resource]').slice(0,1200);
  function record(error,kind = 'error') {
    entries.push({at:new Date().toISOString(),kind,message:clean(error?.message || error),stack:clean(error?.stack)});
    if (entries.length > 30) entries.shift();
    clearTimeout(timer);
    timer = setTimeout(() => { void platform.settings.set('last-beacon-diagnostics',JSON.stringify({context,entries})).catch(() => {}); },300);
  }
  addEventListener('error',event => { record(event.error || event.message); fatalHandler?.(); });
  addEventListener('unhandledrejection',event => { record(event.reason,'promise'); fatalHandler?.(); });
  return {record,context,onFatal(handler) { fatalHandler = handler; },async export() {
    let previous = null;
    try { previous = JSON.parse(await platform.settings.get('last-beacon-diagnostics') || 'null'); } catch {}
    return JSON.stringify({context,entries,previous},null,2);
  }};
}
