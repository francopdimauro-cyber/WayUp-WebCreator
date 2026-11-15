import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const catalog=read('studio-next/lib/font-library.ts');
const picker=read('studio-next/components/studio/font-picker.tsx');
const inspector=read('studio-next/components/studio/inspector.tsx');
const old=read('public/studio-font-library.js');
const win=read('scripts/export-windows-fonts.ps1');
const worker=read('dist/worker.js');

test('Studio Next usa la biblioteca del WebCreator, no un desplegable fijo de seis fuentes',()=>{
 assert.match(inspector,/import \{ FontPicker \} from '\.\/font-picker'/);
 assert.match(inspector,/<FontPicker value=\{style\.fontFamily\}/);
 assert.doesNotMatch(inspector,/FONT_OPTIONS/);
 assert.match(picker,/Buscar fuentes/);
 assert.match(picker,/Ver más fuentes/);
 assert.match(picker,/Catálogo completo/);
});
test('Las fuentes Google/Open son del catálogo Fontsource oficial y se cargan realmente',()=>{
 assert.match(catalog,/https:\/\/api\.fontsource\.org\/v1\/fonts/);
 assert.match(catalog,/https:\/\/cdn\.jsdelivr\.net\/fontsource\/css\//);
 assert.match(catalog,/font\.type!=='google'&&font\.type!=='other'/);
 assert.match(catalog,/parseFontsourceCatalog/);
 assert.match(catalog,/fontStylesheetUrl/);
 assert.match(catalog,/ensureFontStylesheet/);
 assert.match(picker,/fetch\(FONT_SOURCE_API/);
 assert.match(picker,/ensureFontStylesheet\(font\)/);
 assert.match(picker,/remoteCache/);
 assert.match(old,/api\.fontsource\.org\/v1\/fonts/);
 assert.match(worker,/wayupIntegratedNextNavigation/);
});
test('Conserva el catálogo incorporado completo de Google Fonts y fuentes del sistema',()=>{
 const originalFonts=(old.match(/const fallback=\[([\s\S]+?)\];/)||[])[1];
 const originalSystem=(old.match(/const system=\[([\s\S]+?)\];/)||[])[1];
 assert.ok(originalFonts&&originalSystem);
 for(const name of ['Montserrat','Playfair Display','Bebas Neue','Caveat','Noto Sans Arabic','Roboto Mono','Fraunces','Montserrat Alternates']){
  assert.ok(catalog.includes(JSON.stringify(name)),name);
 }
 for(const name of ['Arial','Georgia','Segoe UI','Consolas','Comic Sans MS']){
  assert.ok(catalog.includes(JSON.stringify(name)),name);
 }
 assert.match(catalog,/INITIAL_OPEN_FAMILIES/);
 assert.match(catalog,/BUILTIN_SYSTEM_FAMILIES/);
});
test('Local Font Access solo requiere permiso al pulsar, permite Firefox con importación de Windows',()=>{
 assert.match(picker,/queryLocalFonts/);
 assert.match(picker,/Firefox no permite enumerar/);
 assert.match(picker,/type="file"/);
 assert.match(picker,/\.json/);
 assert.match(picker,/parseWindowsFontList/);
 assert.match(catalog,/wayup-local-fonts-v1/);
 assert.match(catalog,/families\.length>7000/);
 assert.match(catalog,/isSafeFontName/);
 assert.match(picker,/Detectar fuentes/);
 assert.match(picker,/Importar lista de Windows/);
 assert.match(win,/InstalledFontCollection/);
 assert.match(picker,/WINDOWS_FONT_EXPORT_SCRIPT/);
});
test('Los nombres del ordenador se almacenan solo con el consentimiento del usuario',()=>{
 assert.match(picker,/localStorage\.setItem\(REMEMBER_KEY,'1'\)/);
 assert.match(picker,/localStorage\.removeItem\(REMEMBER_KEY\)/);
 assert.match(picker,/Recordar nombres de mis fuentes/);
 assert.doesNotMatch(picker,/sendBeacon|POST|PUT/);
 assert.doesNotMatch(picker,/innerHTML/);
 assert.match(picker,/file\.size>512000/);
});
test('No se modifican los proyectos D1/R2 ni el origen de WebCreator',()=>{
 for(const v of ['USAGE_DB','STUDIO_ASSETS','OPENROUTER_API_KEY'])assert.ok(worker.includes(v),v);
 assert.match(worker,/url\.searchParams\.get\('studio'\)==='1'/);
 assert.match(worker,/studio-next/);
});
