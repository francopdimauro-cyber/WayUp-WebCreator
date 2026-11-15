import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const module=read('public/studio-button-library.js');
const css=read('public/studio-button-library.css');
const build=read('scripts/build.mjs');
const worker=read('dist/worker.js');
const editor=read('public/studio.js');

test('button gallery has 20+ professional presets and category filters',()=>{
 assert.doesNotThrow(()=>new vm.Script(module,{filename:'studio-button-library.js'}));
 const presets=[...module.matchAll(/\{id:'([a-z]+)',name:'([^']+)',group:'([^']+)',bg:/g)];
 assert.ok(presets.length>=20,'at least 20 actual design presets');
 for(const name of ['Modernos','Minimalistas','Elegantes','Llamativos','Social'])assert.ok(module.includes(name));
 for(const id of ['gradient','glass','neon','pill','outline','whatsapp'].filter(x=>x!=='gradient')) assert.ok(presets.some(p=>p[1]===id),id);
 assert.match(module,/wcButtonSearch/);
 assert.match(module,/wcButtonFilters/);
 assert.match(module,/wcButtonGallery/);
 assert.match(module,/data-preset/);
});
test('button preset application preserves existing anchors and behavior',()=>{
 assert.match(module,/const n=current\(\),p=presets\.find/);
 assert.match(module,/studio\.change\(\(\)=>stylePreset\(n,p\)/);
 assert.match(module,/data-wc-btn-original-style/);
 assert.match(module,/data-wc-btn-preset/);
 assert.match(module,/n\.setAttribute\('style',n\.getAttribute\('data-wc-btn-original-style'\)/);
 assert.doesNotMatch(module,/replaceWith\(/);
 assert.doesNotMatch(module,/\.setAttribute\('href'/);
 assert.doesNotMatch(module,/\.removeAttribute\('href'/);
 assert.doesNotMatch(module,/\.outerHTML\s*=/);
 assert.match(module,/ensureEffects\(node\.ownerDocument\)/);
});
test('user can reset original styles, undo, and customize safely',()=>{
 for(const s of ['wcButtonRestore','wcBtnBg','wcBtnFg','wcBtnBorder','wcBtnRadius','wcBtnFont','wcBtnPadY','wcBtnPadX','wcBtnWidth','wcBtnWidthPx','wcBtnShadow','wcBtnIcon','wcBtnText','wcButtonCustomize'])assert.ok(module.includes(s),s);
 assert.match(module,/n\.removeAttribute\('data-wc-btn-original-style'\)/);
 assert.match(module,/if\(values?\.|!Number\.isFinite\(radius\)/);
 assert.match(module,/validColor/);
 assert.match(module,/Math|parseInt/);
 assert.match(module,/studio\.change\(\(\)=>/);
});
test('new icons only replace editor-inserted icons without deleting original SVGs',()=>{
 assert.match(module,/querySelector\('\[data-wc-btn-icon\]'\)/);
 assert.match(module,/badge\.setAttribute\('aria-hidden','true'\)/);
 assert.match(module,/badge\.setAttribute\('data-wc-btn-icon',''\)/);
 assert.match(module,/getTextNodes/);
 assert.match(module,/svg/);
 assert.doesNotMatch(module,/innerHTML\s*=\s*text/);
 assert.doesNotMatch(module,/remove\(\)\s*;\s*.*svg/);
});
test('button designs keep public-site hover and focus styles accessible and reduced-motion safe',()=>{
 assert.match(module,/style\[data-wc-button-effects\]/);
 assert.match(module,/:hover\{filter:brightness/);
 assert.match(module,/:focus-visible/);
 assert.match(module,/prefers-reduced-motion/);
 assert.match(module,/data-wc-btn-preset/);
 assert.match(css,/#wcStudio \.wc-button-gallery/);
 assert.match(css,/#wcStudio \.wc-button-choice\[aria-pressed=true\]/);
});
test('button gallery integrates after smart selection, with no API changes',()=>{
 assert.match(build,/buttonLibraryJs=read\('public\/studio-button-library\.js'\)/);
 assert.match(build,/buttonLibraryCss=read\('public\/studio-button-library\.css'\)/);
 assert.match(build,/\+smartToolsJs\+'\\n<\/script><script>\\n'\+buttonLibraryJs/);
 assert.match(worker,/wcButtonStylesGroup/);
 assert.match(worker,/wcButtonGallery/);
 assert.match(editor,/WebCreatorStudioTools\?\.onSelect/);
 assert.doesNotMatch(module,/fetch\s*\(/);
 assert.doesNotMatch(module,/\/api\//);
});
