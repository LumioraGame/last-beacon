import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
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
async function assetPaths(prefix=''){
  const paths=[];
  for(const entry of await readdir(`dist-native/${prefix}`,{withFileTypes:true})){
    const path=prefix+entry.name;
    if(entry.isDirectory())paths.push(...await assetPaths(path+'/'));else if(entry.isFile())paths.push(path);
  }
  return paths.sort();
}
const assets=await Promise.all((await assetPaths()).map(async path=>[path,sha(await readFile(`dist-native/${path}`))]));
for(const required of ['licenses/last-beacon.txt','licenses/three.txt','licenses/Apache-2.0.txt','licenses/capacitor-core.txt','licenses/ion-ios-filesystem.txt','licenses/ion-android-filesystem.txt'])assert.ok(assets.some(([path])=>path===required),`Missing bundled notice: ${required}`);
const report={at:new Date().toISOString(),appId:config.appId,nativeWebSHA256:sha(bundle),nativeAssetsSHA256:sha(Buffer.from(assets.map(([path,hash])=>`${path}\t${hash}`).join('\n'))),assetCount:assets.length,artifacts:{}};
for(const [path,width,height] of [['assets/mobile/icon-1024.png',1024,1024],['assets/mobile/play-icon-512.png',512,512],['assets/mobile/feature-graphic-1024x500.png',1024,500]]){
  const meta=await sharp(path).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);assert.equal(meta.hasAlpha,false);
}
if(mode==='all'||mode==='android'){
  const path='android/app/build/outputs/bundle/release/app-release.aab';
  const files=execFileSync('unzip',['-Z1',path],{encoding:'utf8'}).split('\n');
  for(const [asset,hash] of assets){
    const packaged=execFileSync('unzip',['-p',path,`base/assets/public/${asset}`],{maxBuffer:8*1024*1024});
    assert.equal(sha(packaged),hash,`Android contains a stale or missing asset: ${asset}`);
  }
  const nativeLibraries=files.filter(file=>file.endsWith('.so'));
  assert.equal(nativeLibraries.length,0,'Native libraries were added: verify their 16 KB alignment before release');
  report.artifacts.android={path,sha256:sha(await readFile(path)),webAssetsMatch:true,nativeLibraries:nativeLibraries.length,signed:files.some(file=>/^META-INF\/.*\.(RSA|DSA|EC)$/.test(file))};
}
if(mode==='all'||mode==='ios'){
  const path=process.env.LAST_BEACON_IOS_APP||'artifacts/LastBeacon-unsigned.xcarchive/Products/Applications/App.app';
  const info=plist(`${path}/Info.plist`),privacy=plist(`${path}/PrivacyInfo.xcprivacy`);
  assert.equal(info.CFBundleIdentifier,config.appId);assert.equal(info.CFBundleShortVersionString,JSON.parse(await readFile('package.json','utf8')).version);
  assert.equal(info.MinimumOSVersion,'15.5');assert.deepEqual(info.UIDeviceFamily,[1]);
  for(const [asset,hash] of assets)assert.equal(sha(await readFile(`${path}/public/${asset}`)),hash,`iOS contains a stale or missing asset: ${asset}`);
  const reasons=privacy.NSPrivacyAccessedAPITypes;
  assert.ok(reasons.some(r=>r.NSPrivacyAccessedAPIType==='NSPrivacyAccessedAPICategoryUserDefaults'&&r.NSPrivacyAccessedAPITypeReasons.includes('CA92.1')));
  assert.ok(reasons.some(r=>r.NSPrivacyAccessedAPIType==='NSPrivacyAccessedAPICategoryFileTimestamp'&&r.NSPrivacyAccessedAPITypeReasons.includes('C617.1')));
  let signed=false;try{execFileSync('codesign',['--verify',path],{stdio:'pipe'});signed=true;}catch{}
  report.artifacts.ios={path,version:info.CFBundleShortVersionString,build:info.CFBundleVersion,sdk:info.DTSDKName,minimumOS:info.MinimumOSVersion,deviceFamily:info.UIDeviceFamily,privacyManifest:true,webAssetsMatch:true,signed};
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/mobile-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
