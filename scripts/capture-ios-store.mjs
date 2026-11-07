import {execFileSync} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {readFile,mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';

const device=process.env.IOS_SIMULATOR_UDID;
if(!device)throw new Error('Select a dedicated booted QA simulator using IOS_SIMULATOR_UDID; capture replaces its Last Beacon watch');
const group=process.env.IOS_SCREENSHOT_CLASS||'iphone',app='ai.lumiora.lastbeacon';
const output=`artifacts/store-screenshots/ios/${group}`;await mkdir(output,{recursive:true});
const run=(command,args)=>execFileSync(command,args,{encoding:'utf8'}).trim();
const buildArgs=['-project','tests/ios/LastBeaconSmoke.xcodeproj','-scheme','StoreCapture','-destination',`id=${device}`,'-derivedDataPath','artifacts/ios-store','CODE_SIGNING_ALLOWED=NO'];
function xcode(args,log){const fd=openSync(log,'w');try{execFileSync('xcodebuild',args,{stdio:['ignore',fd,fd]});}finally{closeSync(fd);}}
console.log(`Building native store capture runner for ${device}`);
xcode([...buildArgs,'build-for-testing'],`${output}/build.log`);
run('xcrun',['simctl','install',device,'artifacts/ios-store/Build/Products/Debug-iphonesimulator/App.app']);
const scenes=JSON.parse(await readFile('artifacts/store-scenes/manifest.json','utf8')).scenes,captures=[];
for(const locale of ['en','zh-Hans'])for(const scene of scenes){
  try{run('xcrun',['simctl','terminate',device,app]);}catch{}
  const data=run('xcrun',['simctl','get_app_container',device,app,'data']);await mkdir(join(data,'Documents'),{recursive:true});
  for(const slot of [0,1])await copyFile(`artifacts/store-scenes/${scene.name}.json`,join(data,`Documents/last-beacon-run-${slot}.json`));
  const dir=`${output}/${locale}`;await mkdir(dir,{recursive:true});
  const result=`${dir}/${scene.name}.xcresult`,attachments=`${dir}/${scene.name}-attachments`;
  const test=locale==='en'?'testCaptureEnglish':'testCaptureChinese';
  console.log(`Capturing ${group}/${locale}/${scene.name}`);
  xcode([...buildArgs,'test-without-building',`-only-testing:StoreCapture/StoreCaptureUITests/${test}`,'-resultBundlePath',result],`${dir}/${scene.name}.log`);
  run('xcrun',['xcresulttool','export','attachments','--path',result,'--output-path',attachments]);
  const images=(await readdir(attachments)).filter(file=>file.endsWith('.png'));
  if(images.length!==1)throw new Error(`Expected one explicit capture in ${attachments}; found ${images.length}`);
  const file=`${dir}/${scene.name}.png`;await sharp(join(attachments,images[0])).removeAlpha().png().toFile(file);
  const meta=await sharp(file).metadata();
  if(![[1206,2622],[1320,2868]].some(([w,h])=>meta.width===w&&meta.height===h))throw new Error(`Unexpected native screenshot size: ${meta.width}×${meta.height}`);
  captures.push({file,locale,scene:scene.name,width:meta.width,height:meta.height});
}
await writeFile(`${output}/manifest.json`,JSON.stringify({device,captures},null,2));
