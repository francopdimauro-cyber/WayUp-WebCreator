import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const studio=read('public/studio.js');
const nav=read('public/studio-next-navigation.js');
const visual=read('public/studio-unified-appearance.js');
const worker=read('src/worker.js');
const bundled=read('dist/worker.js');

test('El enlace Volver a WebCreator no reabre el editor antiguo',()=>{
 assert.match(nav,/home\.href='\/';/);
 assert.doesNotMatch(nav,/home\.href='\/\?studio=1'/);
 assert.match(nav,/Volver al generador WebCreator sin abrir otro editor/);
 assert.doesNotThrow(()=>new vm.Script(nav));
});
test('Abrir Studio en el generador entra directamente a Studio Next',()=>{
 assert.match(studio,/el\('wcOpen'\)\?\.addEventListener\('click',\(\)=>\{location\.assign\('\/studio-next\/'\);\}\)/);
 assert.doesNotMatch(studio,/el\('wcOpen'\)\?\.addEventListener\('click',\(\)=>open\(\)\)/);
 assert.match(visual,/homeLink\.href='\/studio-next\/'/);
 assert.match(visual,/nextLink\.href='\/studio-next\/'/);
});
test('Los enlaces antiguos se redirigen desde servidor después de Cloudflare Access',()=>{
 const gate=worker.indexOf("if(!ctx?.access)");
 const identity=worker.indexOf("identity?.email?.toLowerCase()");
 const redirect=worker.indexOf("url.searchParams.get('studio')==='1'");
 assert.ok(gate>=0&&identity>gate&&redirect>identity);
 assert.match(worker,/Response\.redirect\(new URL\('\/studio-next\/',url\),302\)/);
 assert.match(bundled,/url\.searchParams\.get\('studio'\)==='1'/);
 assert.match(worker,/url\.pathname==='\/'/);
});
test('Los proyectos reales conservan acceso al editor D1/R2 y no se pierden las herramientas',()=>{
 assert.match(nav,/\/\?studioProject=/);
 assert.match(visual,/WebCreatorStudio\?\.open\(projectId\)/);
 assert.match(studio,/\/api\/projects/);
 assert.match(bundled,/wcFontSearch/);
 assert.match(bundled,/wcButtonGallery/);
 assert.match(bundled,/wcMotionMode/);
 assert.match(bundled,/OPENROUTER_API_KEY/);
});
test('El editor completo utiliza aspecto premium oscuro sin afectar al tema del generador',()=>{
 assert.doesNotThrow(()=>new vm.Script(visual));
 assert.match(visual,/read\(THEME_KEY,'dark'\)/);
 assert.match(visual,/write\(THEME_KEY,theme\)/);
 assert.match(visual,/wc-studio-unified-ui-v1/);
 assert.match(visual,/layout==='premium'/);
 assert.doesNotMatch(visual,/original\.click\(\)/);
 assert.doesNotMatch(visual,/document\.documentElement\.dataset\.wcTheme=/);
});
