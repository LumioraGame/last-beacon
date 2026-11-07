// Uses a selected, booted QA simulator. Starts a paid-defense watch, then installs a higher-build app in place.
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdir,readFile,readdir,access,writeFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const udid=process.env.IOS_SIMULATOR_UDID;
if(!udid)throw new Error('Select a booted QA simulator using IOS_SIMULATOR_UDID');
const app='ai.lumiora.lastbeacon';
const output=resolve(process.env.LAST_BEACON_IOS_UPGRADE_REPORT_DIR||'artifacts/ios-upgrade');
const derived=resolve(process.env.LAST_BEACON_IOS_UPGRADE_DERIVED_DATA||join(output,'build'));
const run=(command,args)=>execFileSync(command,args,{encoding:'utf8'}).trim();
const sim=(...args)=>run('xcrun',['simctl',...args]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const plist=path=>JSON.parse(run('plutil',['-convert','json','-o','-',path]));
const devices=JSON.parse(sim('list','devices','available','--json')).devices;
const entry=Object.entries(devices).flatMap(([runtime,list])=>list.map(device=>({runtime,...device}))).find(d=>d.udid===udid);
assert.ok(entry?.state==='Booted','Select an available, already booted QA simulator');
for(const name of ['baseline.xcresult','updated.xcresult']){
  try{await access(join(output,name));throw new Error(`Existing evidence at ${output}; choose a new LAST_BEACON_IOS_UPGRADE_REPORT_DIR`);}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
await mkdir(output,{recursive:true});
run('xcodegen',['generate','--spec','tests/ios/project.yml']);
const common=['-project','tests/ios/LastBeaconSmoke.xcodeproj','-configuration','Debug','-destination',`id=${udid}`,'-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO'];
function xcode(name,args){
  console.log(`iOS upgrade: ${name}`);
  const log=join(output,`${name}.log`),fd=openSync(log,'w');
  let result;try{result=spawnSync('xcodebuild',[...common,...args],{stdio:['ignore',fd,fd]});}finally{closeSync(fd);}
  if(result.error)throw result.error;
  assert.equal(result.status,0,`${name} failed; inspect ${log}`);
}
const builtApp=join(derived,'Build/Products/Debug-iphonesimulator/App.app');
async function assetPaths(directory,prefix=''){
  const paths=[];
  for(const item of await readdir(join(directory,prefix),{withFileTypes:true})){
    const path=prefix+item.name;
    if(item.isDirectory())paths.push(...await assetPaths(directory,path+'/'));else if(item.isFile())paths.push(path);
  }
  return paths.sort();
}
const assets=await Promise.all((await assetPaths('dist-native')).map(async path=>[path,sha(await readFile(join('dist-native',path)))]));
async function verifyAssets(){
  for(const [path,hash] of assets)assert.equal(sha(await readFile(join(builtApp,'public',path))),hash,`Stale native web asset: ${path}`);
}
async function nativeData(){
  const data=sim('get_app_container',udid,app,'data');
  const paths=(await readdir(join(data,'Documents'))).filter(p=>/^last-beacon-run-[01]\.json$/.test(p)).sort();
  assert.equal(paths.length,2,'Both committed checkpoint slots must exist');
  return {preferences:await readFile(join(data,'Library/Preferences',`${app}.plist`)),checkpoints:Object.fromEntries(await Promise.all(paths.map(async path=>[path,await readFile(join(data,'Documents',path))])))};
}
function stopApp(){
  try{sim('terminate',udid,app);}catch(error){if(!/not running|No such process|nothing to terminate/i.test(String(error.stderr)))throw error;}
}

xcode('baseline',['-scheme','MobileSmoke','-resultBundlePath',join(output,'baseline.xcresult'),'test']);
await verifyAssets();
const original=plist(join(builtApp,'Info.plist'));
assert.equal(original.CFBundleIdentifier,app);
const fromBuild=original.CFBundleVersion,toBuild=process.env.LAST_BEACON_IOS_UPGRADE_BUILD||String(Number(fromBuild)+1);
assert.ok(Number.isSafeInteger(Number(toBuild))&&Number(toBuild)>Number(fromBuild),'QA update build must increase');
stopApp();
xcode('build-updated',['-scheme','UpgradeCheck',`CURRENT_PROJECT_VERSION=${toBuild}`,'build-for-testing']);
await verifyAssets();
const updated=plist(join(builtApp,'Info.plist'));
assert.equal(updated.CFBundleIdentifier,app);assert.equal(updated.CFBundleVersion,toBuild);
const before=await nativeData();
const checkpoint=Object.values(before.checkpoints).map(bytes=>JSON.parse(bytes)).sort((a,b)=>b.generation-a.generation)[0];
assert.equal(checkpoint.game.state.phase,'wave');assert.equal(checkpoint.game.state.credits,115);
assert.ok(checkpoint.game.state.towers.some(t=>t.pad===1&&t.type==='gun'),'Saved wave contains the paid defense');
console.log(`iOS upgrade: installing ${fromBuild} → ${toBuild} without removing app data`);
sim('install',udid,builtApp);
assert.deepEqual(await nativeData(),before,'Preferences and both checkpoint files survive installation unchanged');
xcode('updated',['-scheme','UpgradeCheck',`CURRENT_PROJECT_VERSION=${toBuild}`,'-resultBundlePath',join(output,'updated.xcresult'),'test-without-building']);
const installed=plist(join(sim('get_app_container',udid,app,'app'),'Info.plist'));
assert.equal(installed.CFBundleVersion,toBuild,'XCTest must keep the updated app installed');
run('xcrun',['xcresulttool','export','attachments','--path',join(output,'updated.xcresult'),'--output-path',join(output,'attachments')]);
const report={at:new Date().toISOString(),app,simulator:entry.name,runtime:entry.runtime,physicalDevice:false,version:updated.CFBundleShortVersionString,fromBuild,toBuild,assetCount:assets.length,nativeAssetsSHA256:sha(Buffer.from(assets.map(([path,hash])=>`${path}\t${hash}`).join('\n'))),nativeWebSHA256:assets.find(([path])=>path==='app.js')?.[1],preferencesPreserved:true,checkpointSHA256:Object.fromEntries(Object.entries(before.checkpoints).map(([path,data])=>[path,sha(data)])),restoredCredits:115,restoredPhase:'wave',restoredPaused:true,restoredPaidDefense:true,baselineResult:'baseline.xcresult',updatedResult:'updated.xcresult'};
await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
