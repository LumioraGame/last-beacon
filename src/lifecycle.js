// Separate pause ownership prevents closing a dialog from undoing an OS/user pause.
export function createPauseState(apply) {
  const reasons = new Set();
  return {
    get paused() { return reasons.size > 0; },
    has(reason) { return reasons.has(reason); },
    set(reason,on) { if (on) reasons.add(reason); else reasons.delete(reason); apply(reasons.size > 0); },
    reset() { reasons.clear(); apply(false); },
    resume() { reasons.delete('user'); reasons.delete('lifecycle'); apply(reasons.size > 0); }
  };
}

export async function bindLifecycle(platform,{suspend,resume,back}) {
  let hidden = false;
  const pause = () => { if (hidden) return; hidden = true; suspend(); };
  const wake = () => { if (document.hidden || !hidden) return; hidden = false; resume(); };
  const visibility = () => document.hidden ? pause() : wake();
  document.addEventListener('visibilitychange',visibility);
  addEventListener('pagehide',pause); addEventListener('pageshow',wake);
  const removeNative = await platform.listen({suspend:pause,resume:wake,back});
  if (document.hidden) pause();
  return () => { document.removeEventListener('visibilitychange',visibility); removeEventListener('pagehide',pause); removeEventListener('pageshow',wake); removeNative(); };
}
