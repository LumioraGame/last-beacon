import {build} from 'esbuild';
import {mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = new URL('../',import.meta.url), out = new URL('dist-native/',root);
const debug = process.argv.includes('--debug');
const version = JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
await rm(out,{recursive:true,force:true}); await mkdir(out,{recursive:true});
await build({
  entryPoints:[new URL('src/bootstrap.js',root).pathname], bundle:true, format:'iife', target:['ios15.5','chrome102'], minify:!debug,
  outfile:new URL('app.js',out).pathname, sourcemap:debug ? 'inline' : false,
  define:{__LAST_BEACON_DEBUG__:String(debug),__LAST_BEACON_VERSION__:JSON.stringify(version)},
  plugins:[{name:'native-platform',setup(builder) {
    builder.onResolve({filter:/platform\/web\.js$/},() => ({path:resolve(new URL('src/platform/native.js',root).pathname)}));
  }}]
});
let html = await readFile(new URL('index.html',root),'utf8');
html = html.replace('./src/bootstrap.js','./app.js').replace('type="module" src="./app.js"','defer src="./app.js"').replace('./src/style.css','./style.css');
await writeFile(new URL('index.html',out),html);
await cp(new URL('src/style.css',root),new URL('style.css',out));
await cp(new URL('favicon.svg',root),new URL('favicon.svg',out));
await cp(new URL('legal/',root),new URL('legal/',out),{recursive:true});
console.log(`Built native ${debug ? 'debug' : 'release'} assets (${version}) in dist-native/`);
