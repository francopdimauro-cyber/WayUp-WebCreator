import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const smart=read('public/studio-smart-tools.js');
const editor=read('public/studio.js');
const css=read('public/studio-smart-tools.css');
const build=read('scripts/build.mjs');
const bundled=read('dist/worker.js');

test('smart selection parses, integrates and marks the correct clickable parent',()=>{
 assert.doesNotThrow(()=>new vm.Script(smart,{filename:'studio-smart-tools.js'}));
 assert.doesNotThrow(()=>new vm.Script(editor,{filename:'studio.js'}));
 assert.match(editor,/event\.target\.closest\('a,button,\[role="button"\]'\)/);
 assert.match(editor,/event\.altKey/);
 assert.match(editor,/wcHighlight:true,index:state\.selected,label:/);
 assert.match(editor,/reposition\(\)/);
 assert.match(editor,/WebCreatorStudioTools\?\.onSelect\(node\)/);
 assert.match(editor,/getSelection:\(\)=>currentNode\(\)/);
 assert.match(editor,/selectNode:\(node\)=>/);
});
test('inspector reports human names and breadcrumbs for selected buttons',()=>{
 for(const label of ['Botón de WhatsApp','Botón de correo','Botón de llamada','Imagen','Título principal','Página › '])
  assert.ok(smart.includes(label),label);
 assert.match(smart,/wcElementName.*textContent/);
 assert.match(smart,/wcElementPath.*textContent/);
 assert.match(smart,/wcEditDestination/);
 assert.match(smart,/Alt \+ clic/);
});
test('insertion palette adds editable shapes, images and links through the editor',()=>{
 for(const kind of ['button','rectangle','circle','line','card','badge','image'])
  assert.match(smart,new RegExp('data-wc-insert="'+kind+'"'));
 assert.match(smart,/canInsertAfter/);
 assert.match(smart,/parent\.append\(n\)/);
 assert.match(smart,/studio\.selectNode\(n\)/);
 assert.match(smart,/data-wc-kind/);
 assert.match(smart,/wcApplyShape/);
 assert.match(smart,/wcShapeWidth/);
 assert.match(smart,/wcShapeHeight/);
});
test('external URLs validate protocols, disallow unsafe values, and isolate new tabs',()=>{
 assert.match(smart,/function validHref\(raw\)/);
 assert.match(smart,/new URL\(v\)\.protocol/);
 assert.match(smart,/https:/);
 assert.match(smart,/mailto:/);
 assert.match(smart,/tel:/);
 assert.match(smart,/wa\.me/);
 assert.match(smart,/noopener noreferrer/);
 assert.match(smart,/aria-disabled/);
 assert.match(smart,/wcSmartLinkKind/);
 assert.match(smart,/wcSmartLinkValue/);
});
test('smart panel loads after studio; styling is isolated to editor',()=>{
 assert.match(build,/smartToolsJs=read\('public\/studio-smart-tools\.js'\)/);
 assert.match(build,/smartToolsCss=read\('public\/studio-smart-tools\.css'\)/);
 assert.match(bundled,/wcSmartLinkPanel/);
 assert.match(bundled,/wcInsertText/);
 assert.match(css,/#wcStudio \.wc-selected-info/);
 assert.match(css,/#wcStudio \.wc-insert-grid/);
});
