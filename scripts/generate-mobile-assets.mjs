import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const root = new URL('../',import.meta.url), assets = new URL('assets/mobile/',root);
await mkdir(assets,{recursive:true});
const beacon = '<path d="m24 53 4-30h8l4 30M22 23h20M24 17l8-8 8 8ZM24 19h16M26 36h12M27 42h12M18 53h28" stroke="#dfca92" stroke-width="2.5" fill="none"/><circle cx="32" cy="20" r="2" fill="#ffe4a8"/>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64"><rect width="64" height="64" fill="#102a29"/><path d="M32 20 0 5v30Zm0 0 32-15v30Z" fill="#e9ce8f" opacity=".12"/>${beacon}</svg>`;
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="-22 -22 108 108">${beacon}</svg>`;
await writeFile(new URL('icon.svg',assets),icon);await writeFile(new URL('adaptive-foreground.svg',assets),foreground);
await sharp(Buffer.from(icon)).removeAlpha().png().toFile(new URL('icon-1024.png',assets).pathname);
await sharp(Buffer.from(icon)).resize(512).removeAlpha().png().toFile(new URL('play-icon-512.png',assets).pathname);
await sharp(Buffer.from(icon)).removeAlpha().png().toFile(new URL('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',root).pathname);
const splash = '<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#10201f"/><g transform="translate(1174 1174) scale(6)">'+beacon+'</g></svg>';
for(const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png'])await sharp(Buffer.from(splash)).png().toFile(new URL(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`,root).pathname);
for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
  const dir=new URL(`android/app/src/main/res/mipmap-${density}/`,root);await mkdir(dir,{recursive:true});
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(Buffer.from(icon)).resize(size).png().toFile(new URL(name,dir).pathname);
  await sharp(Buffer.from(foreground)).resize(size/48*108).png().toFile(new URL('ic_launcher_foreground.png',dir).pathname);
}
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><rect width="1024" height="500" fill="#102a29"/><path d="M0 395Q260 270 530 380T1024 345V500H0Z" fill="#344e40"/><g transform="translate(100 72) scale(5)">${beacon}</g><text x="470" y="228" fill="#ece9d6" font-size="62" font-family="Georgia,serif">LAST BEACON</text><text x="474" y="282" fill="#dfca92" font-size="23" font-family="sans-serif">CONNECT. BUILD. KEEP THE LIGHT.</text></svg>`;
await writeFile(new URL('feature-graphic.svg',assets),feature);await sharp(Buffer.from(feature)).removeAlpha().png().toFile(new URL('feature-graphic-1024x500.png',assets).pathname);
console.log('Generated mobile icons, adaptive foreground, splash and Play feature graphic from the existing beacon mark.');
