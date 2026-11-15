import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const paths = [];
function walk(dir) {
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.next') walk(join(dir,item.name));
    else if(item.isFile() && /\.(?:ts|tsx)$/.test(item.name) && !item.name.endsWith('.d.ts')) paths.push(join(dir,item.name));
  }
}
walk(root);
for(const file of paths){
  const result = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, strict: true },
  });
  const errors = (result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${relative(root,file)}: ${errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`);
}

async function loadTS(relativePath){
  const file = join(root,relativePath);
  const result = ts.transpileModule(readFileSync(file,'utf8'), {
    fileName: file, compilerOptions: {module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
  });
  return await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(result.outputText));
}
const { DEMO_PROJECT, BUTTON_PRESETS } = await loadTS('lib/demo-project.ts');
const { historyReducer } = await loadTS('lib/studio-store.ts');
assert.equal(BUTTON_PRESETS.length,21,'La biblioteca conserva los 21 diseños');
assert.equal(DEMO_PROJECT.name,'Entrena-T Parquesol');
const initial = {past:[],present:DEMO_PROJECT,future:[]};
const moved = historyReducer(initial,{type:'estilo',elementId:'subtitulo',patch:{x:32,y:-8}});
assert.equal(moved.present.elements.subtitulo.style.x,32);
assert.equal(moved.past.length,1);
const undone = historyReducer(moved,{type:'deshacer'});
assert.equal(undone.present.elements.subtitulo.style.x,0);
const redone = historyReducer(undone,{type:'rehacer'});
assert.equal(redone.present.elements.subtitulo.style.y,-8);
const text = historyReducer(redone,{type:'modificar',elementId:'cta',patch:{text:'Reserva ahora'}});
assert.equal(text.present.elements.cta.href,'#contacto','El contenido no altera el destino del botón');
const unknown = historyReducer(text,{type:'modificar',elementId:'nodo-desconocido',patch:{text:'N/A'}});
assert.equal(unknown,text,'Un nodo desconocido no modifica el estado');

const catalog = await loadTS('lib/font-catalog.ts');
assert.ok(catalog.initialFonts.length>=135,'Se han recuperado las familias tipográficas del Studio anterior');
assert.ok(catalog.initialFonts.some(f=>f.family==='Playfair Display'),'Las fuentes editoriales están incluidas');
const remote = catalog.parseFontsource([
 {id:'inter',family:'Inter',type:'google',category:'sans-serif',weights:[400,700]},
 {id:'open-family',family:'Open Family',type:'other',category:'display',weights:[400]},
 {id:'../unsafe',family:'Malicious',type:'other'},
 {id:'bad',family:'Bad;',type:'google'}
]);
assert.equal(remote.length,2,'Fontsource incluye Google/Open y filtra entradas maliciosas');
assert.equal(remote[1].source,'open');
assert.equal(catalog.mergeFonts(remote,[{family:'Inter',source:'local'}]).find(f=>f.family==='Inter').source,'local');
assert.match(catalog.fontStylesheet(remote[0]),/cdn\.jsdelivr\.net\/fontsource\/css\/inter@latest/);
assert.equal(catalog.cssFamily('Playfair Display'),'"Playfair Display", sans-serif');
assert.equal(catalog.familyFromCSS('"Playfair Display", sans-serif'),'Playfair Display');
assert.equal(catalog.validFamily('A";color:red'),false);
assert.match(catalog.WAYUP_WINDOWS_FONT_EXPORT,/wayup-local-fonts-v1/);
assert.match(catalog.WAYUP_WINDOWS_FONT_EXPORT,/InstalledFontCollection/);
const inspectorSource=readFileSync(join(root,'components/studio/inspector.tsx'),'utf8');
const fontPickerSource=readFileSync(join(root,'components/studio/font-picker.tsx'),'utf8');
assert.match(inspectorSource,/<FontPicker /);
assert.doesNotMatch(inspectorSource,/const FONT_OPTIONS =/);
for(const feature of ['queryLocalFonts','api.fontsource.org','FontFace','indexedDB','Exportar listado Windows','Importar lista','\.woff2','role="listbox"']){
 const combined=fontPickerSource+'\\n'+readFileSync(join(root,'lib/font-catalog.ts'),'utf8');
 assert.ok(combined.includes(feature.replace('\\\\','\\')),'La biblioteca contiene '+feature);
}
console.log(`Correcto: ${paths.length} archivos TypeScript/TSX, catálogo completo Google/Open/local/importadas, 21 botones e historial.`);
