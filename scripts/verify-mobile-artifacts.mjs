import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const mode=process.argv[2]||'all';
if(!['all','android','ios'].includes(mode))throw new Error('Use all, android or ios');
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const plist=path=>JSON.parse(execFileSync('plutil',['-convert','json','-o','-',path],{encoding:'utf8'}));
const bundle=await readFile('dist-native/app.js'),config=JSON.parse(await readFile('capacitor.config.json','utf8'));
assert.equal(config.appId,'ai.lumiora.lastbeacon');assert.equal(config.webDir,'dist-native');assert.equal(config.server?.url,undefined);
assert.equal(config.zoomEnabled,false);assert.equal(config.android.webContentsDebuggingEnabled,false);
const report={at:new Date().toISOString(),appId:config.appId,nativeWebSHA256:sha(bundle),artifacts:{}};
for(const [path,width,height] of [['assets/mobile/icon-1024.png',1024,1024],['assets/mobile/play-icon-512.png',512,512],['assets/mobile/feature-graphic-1024x500.png',1024,500]]){
  const meta=await sharp(path).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);assert.equal(meta.hasAlpha,false);
}
if(mode==='all'||mode==='android'){
  const path='android/app/build/outputs/bundle/release/app-release.aab';
  const files=execFileSync('unzip',['-Z1',path],{encoding:'utf8'}).split('\n');
  const packaged=execFileSync('unzip',['-p',path,'base/assets/public/app.js'],{maxBuffer:8*1024*1024});
  assert.equal(sha(packaged),sha(bundle),'Android contains stale web assets');
  const nativeLibraries=files.filter(file=>file.endsWith('.so'));
  assert.equal(nativeLibraries.length,0,'Native libraries were added: verify their 16 KB alignment before release');
  report.artifacts.android={path,sha256:sha(await readFile(path)),webAssetsMatch:true,nativeLibraries:nativeLibraries.length,signed:files.some(file=>/^META-INF\/.*\.(RSA|DSA|EC)$/.test(file))};
}
if(mode==='all'||mode==='ios'){
  const path=process.env.LAST_BEACON_IOS_APP||'artifacts/LastBeacon-unsigned.xcarchive/Products/Applications/App.app';
  const info=plist(`${path}/Info.plist`),privacy=plist(`${path}/PrivacyInfo.xcprivacy`);
  assert.equal(info.CFBundleIdentifier,config.appId);assert.equal(info.CFBundleShortVersionString,JSON.parse(await readFile('package.json','utf8')).version);
  assert.equal(info.MinimumOSVersion,'15.5');assert.deepEqual(info.UIDeviceFamily,[1]);
  assert.equal(sha(await readFile(`${path}/public/app.js`)),sha(bundle),'iOS contains stale web assets');
  const reasons=privacy.NSPrivacyAccessedAPITypes;
  assert.ok(reasons.some(r=>r.NSPrivacyAccessedAPIType==='NSPrivacyAccessedAPICategoryUserDefaults'&&r.NSPrivacyAccessedAPITypeReasons.includes('CA92.1')));
  assert.ok(reasons.some(r=>r.NSPrivacyAccessedAPIType==='NSPrivacyAccessedAPICategoryFileTimestamp'&&r.NSPrivacyAccessedAPITypeReasons.includes('C617.1')));
  let signed=false;try{execFileSync('codesign',['--verify',path],{stdio:'pipe'});signed=true;}catch{}
  report.artifacts.ios={path,version:info.CFBundleShortVersionString,build:info.CFBundleVersion,sdk:info.DTSDKName,minimumOS:info.MinimumOSVersion,deviceFamily:info.UIDeviceFamily,privacyManifest:true,webAssetsMatch:true,signed};
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/mobile-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
