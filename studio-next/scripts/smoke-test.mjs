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
console.log(`Correcto: ${paths.length} archivos TypeScript/TSX, 21 estilos, historial, acciones y enlaces.`);