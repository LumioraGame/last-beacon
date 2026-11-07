import {test,expect} from '@playwright/test';

async function open(page,query='view=2d&debug'){
  await page.goto(`/?${query}`);
  await expect(page.locator('.startup-error')).toHaveCount(0);
  await page.waitForFunction(()=>!!window.lastBeacon);
}
for(const locale of ['zh','en'])for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:1024,height:768}]){
  test(`${locale} touch controls and bounds at ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.addInitScript(locale=>localStorage.setItem('last-beacon-language',locale),locale);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('lang',locale==='zh'?'zh-CN':'en');
    await page.locator('[data-type="gun"].build-card').tap();
    const pad=page.locator('.pad-control[data-pad="1"]');await pad.tap();
    await expect(page.locator('#credits')).toHaveText('115');
    await page.locator('#next-wave').tap();
    await page.evaluate(()=>window.lastBeacon.back());
    expect(await page.evaluate(()=>window.lastBeacon.game.paused)).toBe(true);
    if(await page.locator('#menu-toggle').isVisible())await page.locator('#menu-toggle').tap();
    await page.locator('#help').tap();await expect(page.locator('#help-dialog')).toBeVisible();
    await page.locator('#help-dialog .close-dialog').tap();
    expect(await page.evaluate(()=>window.lastBeacon.game.paused)).toBe(true);
    const bounds=await page.evaluate(()=>{
      const visible=e=>getComputedStyle(e).display!=='none';
      return [...document.querySelectorAll('.build-card,#next-wave,.resources,.wave-card')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};});
    });
    for(const r of bounds){expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(viewport.width+1);expect(r.bottom).toBeLessThanOrEqual(viewport.height+1);}
    expect(errors).toEqual([]);
  });
}
test('reload restores the paid defenses and mid-wave state into a paused watch',async({page})=>{
  await open(page);await page.locator('[data-type="mortar"].build-card').tap();await page.locator('[data-pad="3"]').tap();
  await page.locator('#next-wave').tap();await page.evaluate(async()=>{await window.lastBeacon.back();await window.lastBeacon.checkpoint();});
  const before=await page.evaluate(()=>window.lastBeacon.game.snapshot());
  await page.reload();await expect(page.locator('#continue-dialog')).toBeVisible();await page.locator('#continue-run').tap();
  const after=await page.evaluate(()=>window.lastBeacon.game.snapshot());
  expect(after).toEqual(before);expect(after.state.paused).toBe(true);
  await page.evaluate(()=>window.lastBeacon.back());await expect(page.locator('#exit-dialog')).toBeVisible();
  await page.evaluate(()=>window.lastBeacon.back());await expect(page.locator('#exit-dialog')).not.toBeVisible();
});
test('storage failures stay visible and retry succeeds without discarding the game',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{const b=window.lastBeacon.platform.runs;window.restoreRunWrite=b.write;b.write=async()=>{throw new Error('disk full');};await window.lastBeacon.checkpoint();});
  await expect(page.locator('#save-warning')).toBeVisible();
  await page.evaluate(()=>{window.lastBeacon.platform.runs.write=window.restoreRunWrite;});
  await page.locator('#retry-save').tap();await expect(page.locator('#save-warning')).not.toBeVisible();
});
test('WebGL loss recovers to 2D without losing the watch or pointer controls',async({page})=>{
  await open(page,'debug');
  if(await page.evaluate(()=>window.lastBeacon.renderer.kind!=='3d'))test.skip(true,'WebGL unavailable on this runner');
  const before=await page.evaluate(()=>{
    const g=window.lastBeacon.game;const snapshot=g.snapshot();
    document.querySelector('#battlefield').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();return snapshot;
  });
  await expect.poll(()=>page.evaluate(()=>window.lastBeacon.renderer.kind)).toBe('2d');
  const after=await page.evaluate(()=>window.lastBeacon.game.snapshot());
  expect(after.state.towers).toEqual(before.state.towers);expect(after.state.credits).toBe(before.state.credits);expect(after.state.paused).toBe(true);
  await page.locator('[data-type="gun"].build-card').tap();await page.locator('[data-pad="1"]').tap();await expect(page.locator('#credits')).toHaveText('115');
});
test('WebGL restoration rebuilds the 3D renderer with the watch paused',async({page})=>{
  test.setTimeout(60000);
  await open(page,'debug');
  if(await page.evaluate(()=>window.lastBeacon.renderer.kind!=='3d'))test.skip(true,'WebGL unavailable on this runner');
  const towers=await page.evaluate(()=>{
    const canvas=document.querySelector('#battlefield');window.oldBattlefield=canvas;
    const extension=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');extension.loseContext();
    setTimeout(()=>extension.restoreContext(),200);return window.lastBeacon.game.snapshot().state.towers;
  });
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#battlefield')!==window.oldBattlefield),{timeout:20000}).toBe(true);
  expect(await page.evaluate(()=>window.lastBeacon.renderer.kind)).toBe('3d');
  expect(await page.evaluate(()=>window.lastBeacon.game.snapshot().state.towers)).toEqual(towers);
  expect(await page.evaluate(()=>window.lastBeacon.game.paused)).toBe(true);
  await expect(page.locator('#error-dialog')).not.toBeVisible();
});
test('native release bundle has no debug access and requires no network assets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const external=[];await page.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto('/dist-native/?view=2d&debug');
  await expect(page.locator('#health')).toContainText('100');await expect(page.locator('.startup-error')).toHaveCount(0);
  expect(await page.evaluate(()=>window.lastBeacon)).toBeUndefined();expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('an unreadable storage backend cannot silently replace the previous watch',async({page})=>{
  await open(page);await page.locator('[data-type="gun"].build-card').tap();await page.locator('[data-pad="1"]').tap();await page.evaluate(()=>window.lastBeacon.checkpoint());
  await page.addInitScript(()=>{if(sessionStorage.getItem('fail-save-read')==='once'){sessionStorage.removeItem('fail-save-read');Object.defineProperty(window,'indexedDB',{value:undefined});}});
  await page.evaluate(()=>sessionStorage.setItem('fail-save-read','once'));await page.reload();
  await expect(page.locator('#continue-dialog')).toBeVisible();await expect(page.locator('#continue-run')).toBeHidden();
  await page.locator('#retry-load').tap();await expect(page.locator('#continue-run')).toBeVisible();await page.locator('#continue-run').tap();await expect(page.locator('#credits')).toHaveText('115');
});
test('closing a handbook opened before backgrounding keeps the lifecycle pause',async({page})=>{
  await open(page);await page.locator('#next-wave').tap();await page.locator('#menu-toggle').tap();await page.locator('#help').tap();
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.locator('#help-dialog .close-dialog').tap();expect(await page.evaluate(()=>window.lastBeacon.game.paused)).toBe(true);
});
test('native support diagnostics can be reviewed after a fatal JS error',async({page})=>{
  await page.goto('/dist-native/?view=2d');await expect(page.locator('.game-shell')).toHaveAttribute('aria-busy','false');
  await page.evaluate(()=>setTimeout(()=>{throw new Error('QA failure in /data/user/0/private-file');},0));
  await expect(page.locator('#error-dialog')).toBeVisible();await page.locator('#error-support').tap();
  await expect(page.locator('#diagnostics-dialog')).toBeVisible();
  const text=await page.locator('#diagnostics-text').inputValue();expect(text).toContain('QA failure');expect(text).not.toContain('/data/user/');
});
test('a paused wave does not keep writing periodic checkpoints',async({page})=>{
  await open(page);await page.locator('#next-wave').tap();await page.evaluate(async()=>{await window.lastBeacon.back();await window.lastBeacon.checkpoint();});
  await page.clock.install();
  await page.evaluate(()=>{window.checkpointWrites=0;const backend=window.lastBeacon.platform.runs,write=backend.write;backend.write=async(...args)=>{window.checkpointWrites++;return write(...args);};});
  await page.clock.fastForward(15000);
  expect(await page.evaluate(()=>window.checkpointWrites)).toBe(0);
});
test('browser play still starts when localStorage access is blocked',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  await open(page);await expect(page.locator('.game-shell')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#credits')).toHaveText('180');
});
test('dense landscape pad targets build on the pad that was tapped',async({page})=>{
  test.setTimeout(10000);
  await page.setViewportSize({width:844,height:390});await open(page);
  if(await page.locator('#coach-close').isVisible())await page.locator('#coach-close').tap();
  await page.locator('.build-card[data-type="gun"]').tap();
  const rect=await page.locator('[data-pad="5"]').boundingBox();
  // A real tap may land on a neighboring DOM target; gameplay must still choose the visible pad center.
  await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
  expect(await page.evaluate(()=>window.lastBeacon.game.towers.some(t=>t.pad===5))).toBe(true);
});
test('handbook links the published privacy policy and current support tracker',async({page})=>{
  await open(page);await page.locator('#menu-toggle').tap();await page.locator('#help').tap();
  await page.locator('#open-privacy').tap();await expect(page.locator('#legal-copy a')).toHaveAttribute('href','https://lumioragame.github.io/last-beacon/privacy.html');
  await page.locator('#close-legal').tap();await expect(page.locator('#help-dialog')).toBeVisible();
  await page.locator('#open-support').tap();await expect(page.locator('#legal-copy a')).toHaveAttribute('href','https://github.com/LumioraGame/last-beacon/issues');
});
for(const viewport of [{width:390,height:700},{width:844,height:390}])test(`boss health stays below resources at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await open(page);
  await page.evaluate(()=>{const game=window.lastBeacon.game;game.wave=10;game.phase='wave';game.spawn('boss',3);});
  await expect(page.locator('#boss-bar')).toBeVisible();
  const boss=await page.locator('#boss-bar').boundingBox(),resources=await page.locator('.resources').boundingBox();
  expect(boss.y).toBeGreaterThanOrEqual(resources.y+resources.height+4);
});
