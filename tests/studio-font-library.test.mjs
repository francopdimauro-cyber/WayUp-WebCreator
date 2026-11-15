import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const module=read('public/studio-font-library.js');
const studio=read('public/studio.js');
const styles=read('public/studio-font-library.css');
const build=read('scripts/build.mjs');
const bundled=read('dist/worker.js');
const windows=read('scripts/export-windows-fonts.ps1');

test('fonts library parses and is bundled into WebCreator Studio',()=>{
 assert.doesNotThrow(()=>new vm.Script(module,{filename:'studio-font-library.js'}));
 assert.match(build,/fontLibraryJs=read\('public\/studio-font-library\.js'\)/);
 assert.match(build,/fontLibraryCss=read\('public\/studio-font-library\.css'\)/);
 assert.match(bundled,/WebCreatorFontLibrary/);
 assert.match(bundled,/wcFontResults/);
 assert.match(styles,/#wcStudio \.wc-font-results/);
});
test('font catalog supports public sources without an API key',()=>{
 assert.match(module,/https:\/\/api\.fontsource\.org\/v1\/fonts/);
 assert.match(module,/fontsource\/css\//);
 assert.match(module,/loadedRemote=true/);
 assert.match(module,/Array\.isArray\(data\)/);
 assert.match(module,/fonts\.googleapis\.com\/css2/);
 assert.match(module,/slice\(0,visibleLimit\)/);
});
test('local enumeration requires a direct user gesture and supports Firefox fallback',()=>{
 assert.match(module,/wcDetectFonts.*addEventListener\('click'/);
 assert.match(module,/window\.queryLocalFonts\(\)/);
 assert.match(module,/typeof window\.queryLocalFonts!=='function'/);
 assert.match(module,/wcAddFont.*addEventListener\('click'/);
 assert.match(module,/wcImportFont.*addEventListener\('click'/);
});
test('font uploads are size-limited and included in saved HTML',()=>{
 assert.match(module,/file\.size>115000/);
 assert.match(module,/data:font/);
 assert.match(module,/documentElement\.outerHTML\.length\+css\.length\+150>290000/);
 assert.match(module,/data-wc-font-upload/);
 assert.match(studio,/WebCreatorFontLibrary\.embed\(state\.doc,family\)/);
 assert.match(studio,/WebCreatorFontLibrary\?\.hydrate\(state\.doc\)/);
});

test('all Windows font families can be imported through a user supplied manifest',()=>{
 assert.match(module,/wcDownloadWindowsFonts/);
 assert.match(module,/wcImportFontList/);
 assert.match(module,/wayup-local-fonts-v1/);
 assert.match(module,/payload\.families\.length>7000/);
 assert.match(module,/file\.size>512000/);
 assert.match(module,/rememberKey/);
 assert.match(module,/wcRememberFonts/);
 assert.match(windows,/InstalledFontCollection/);
 assert.match(windows,/ConvertTo-Json/);
 assert.match(windows,/Set-Content/);
 assert.match(build,/windowsFontExporter=read\('scripts\/export-windows-fonts\.ps1'\)/);
 assert.doesNotMatch(bundled,/__WAYUP_WINDOWS_FONT_EXPORTER__/);
});
test('open font library supports pagination and explicit font weights',()=>{
 assert.match(module,/visibleLimit\+=22/);
 assert.match(module,/wcFontMore/);
 assert.match(module,/weights:Array\.isArray\(f\.weights\)/);
 assert.match(module,/validWeight/);
 assert.match(studio,/data-wc-font-weight/);
 assert.match(bundled,/fontsource\/css/);
});
