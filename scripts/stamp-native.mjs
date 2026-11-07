import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root = new URL('../',import.meta.url);
const version = JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Mobile marketing version must be numeric x.y.z');
const counter = new URL('artifacts/last-build-number',root);
let previous = 0;
try { previous = Number(await readFile(counter,'utf8')); } catch {}
const number = Number(process.env.MOBILE_BUILD_NUMBER || Math.max(Math.floor(Date.now()/1000),previous+1));
if (!Number.isSafeInteger(number) || number < 1 || number > 2100000000 || number <= previous) throw new Error('MOBILE_BUILD_NUMBER must increase and be between 1 and 2100000000');
await mkdir(new URL('artifacts/',root),{recursive:true});await writeFile(counter,String(number));
await writeFile(new URL('android/mobile-version.properties',root),`versionName=${version}\nversionCode=${number}\n`);
const project = new URL('ios/App/App.xcodeproj/project.pbxproj',root);
let source = await readFile(project,'utf8');
source = source.replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${version};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,`CURRENT_PROJECT_VERSION = ${number};`);
await writeFile(project,source);console.log(`Native version ${version} (${number})`);
