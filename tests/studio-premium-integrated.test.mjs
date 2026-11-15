import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const visual=read('public/studio-premium-integrated.css');
const logic=read('public/studio-unified-appearance.js');
const build=read('scripts/build.mjs');
const fontLibrary=read('public/studio-font-library.js');
const worker=read('dist/worker.js');

test('la interfaz premium está dentro de WebCreator y no crea otro editor',()=>{
 assert.doesNotThrow(()=>new vm.Script(logic,{filename:'studio-unified-appearance.js'}));
 assert.match(visual,/#wcStudio\[data-wc-ui="premium"\]/);
 assert.match(visual,/#wcStudio\[data-wc-ui="premium"\]\[data-wc-mode="light"\]/);
 assert.match(logic,/getElementById\('wcStudio'\)/);
 assert.match(logic,/querySelector\('\.wc-top-actions'\)/);
 assert.match(logic,/getElementById\('wcUndo'\)/);
 assert.doesNotMatch(logic,/fetch\s*\(/);
 assert.doesNotMatch(logic,/https?:\/\//);
});

test('modos claro, oscuro y clásico funcionan sin duplicar el estado de tema',()=>{
 for(const id of ['wcStudioThemeControl','wcStudioLayoutControl'])assert.match(logic,new RegExp(id));
 assert.match(logic,/getElementById\('wcThemeToggle'\)/);
 assert.match(logic,/original\.click\(\)/);
 assert.match(logic,/wc-theme-mode/);
 assert.match(logic,/wc-studio-unified-ui-v1/);
 assert.match(logic,/data\.wcTheme|dataset\.wcTheme/);
 assert.match(logic,/dataset\.wcUi=layout/);
 assert.match(logic,/dataset\.wcMode=theme/);
 assert.match(logic,/wcClose/);
});

test('el catálogo completo y las funciones de importación no se eliminan',()=>{
 assert.ok((fontLibrary.match(/','/g)||[]).length>100,'El catálogo inicial contiene numerosas familias');
 for(const token of ['wcFontSearch','wcFontResults','wcDetectFonts','wcImportFont','wcDownloadWindowsFonts','wcImportFontList','wcFontManual','wcRememberFonts'])assert.match(fontLibrary,new RegExp(token));
 for(const token of ['fontLibraryJs','studioClient','smartToolsJs','buttonLibraryJs','canvasMotionJs','mediaClient','studioServer','mediaServer','themeToggle'])assert.match(build,new RegExp(token));
});

test('la compilación inserta el tema después de las bibliotecas sin tocar la lógica del Worker',()=>{
 assert.match(build,/studio-premium-integrated\.css/);
 assert.match(build,/studio-unified-appearance\.js/);
 assert.match(build,/\+canvasMotionCss\+'\\n'\+integratedPremiumCss/);
 assert.match(build,/\+themeToggle\+'\\n<\/script><script>\\n'\+unifiedAppearanceJs/);
 assert.match(worker,/wcStudioThemeControl/);
 assert.match(worker,/wcStudioLayoutControl/);
 assert.match(worker,/wcFontSearch/);
 assert.match(worker,/wcButtonGallery/);
 assert.match(worker,/wcMotionMode/);
 assert.match(worker,/\/api\/projects/);
 assert.match(worker,/ctx\?\.access/);
 assert.match(worker,/OPENROUTER_API_KEY/);
});

test('la personalización mantiene un mecanismo de vuelta atrás y accesibilidad',()=>{
 assert.match(visual,/data-wc-ui="premium"/);
 assert.match(logic,/legacy/);
 assert.match(logic,/write\(UI_KEY,layout\)/);
 assert.match(visual,/@media\(max-width:760px\)/);
 assert.match(visual,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(visual,/focus-visible/);
 assert.match(logic,/aria-label/);
});
