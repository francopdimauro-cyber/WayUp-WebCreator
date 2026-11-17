// Pruebas de edición de elementos sobre HTML real (datos ficticios).
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {DOMParser} from 'linkedom';

globalThis.DOMParser=DOMParser;
const root=resolve(import.meta.dirname,'..');
const tmp=join(root,'.wayup-element-test-'+process.pid);
mkdirSync(tmp,{recursive:true});
const emit=name=>writeFileSync(join(tmp,name+'.mjs'),ts.transpileModule(readFileSync(join(root,'lib',name+'.ts'),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '\.\/([\w-]+)'/g,"from './$1.mjs'"));
let E,F,V;
try{
  emit('web-project-files');emit('element-editing');emit('css-validation');
  F=await import(pathToFileURL(join(tmp,'web-project-files.mjs')).href);
  E=await import(pathToFileURL(join(tmp,'element-editing.mjs')).href);
  V=await import(pathToFileURL(join(tmp,'css-validation.mjs')).href);
}finally{rmSync(tmp,{recursive:true,force:true})}

const HTML=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Web ficticia</title></head><body>
<header><a id="logo" href="#inicio">Marca Ficticia</a></header>
<main><section id="inicio"><h1>Hola <em>mundo</em></h1><p id="p1">Texto de prueba.</p><a href="#inicio">Ir</a><img src="foto.png" alt="Foto"></section></main>
</body></html>`;
const doc=html=>new DOMParser().parseFromString(html,'text/html');
const idx=(html,sel)=>{const d=doc(html);return F.editableHtmlNodes(d).indexOf(d.querySelector(sel));};
const REFUGIO_HTML=readFileSync(join(root,'test-fixtures','el-refugio','index.html'),'utf8');
assert.match(REFUGIO_HTML,/<title>El Refugio de Chilla/,'Se utiliza el HTML real del restaurante como fixture de regresión');

// Estilos válidos e inválidos
const p=idx(HTML,'#p1');
let r=E.setStyles(HTML,p,{'font-size':'22px','color':'rgba(10, 20, 30, 0.5)','letter-spacing':'0.04em','margin-top':'12px'});
let el=doc(r.html).querySelector('#p1');
assert.match(el.getAttribute('style'),/font-size: 22px/);
assert.match(el.getAttribute('style'),/letter-spacing/);
r=E.setStyles(r.html,p,{'font-size':''});
assert.doesNotMatch(doc(r.html).querySelector('#p1').getAttribute('style')||'',/font-size/,'Vacío elimina la propiedad');
for(const [prop,val] of [['color','red;background:url(x)'],['background-image','url(https://externo.test/a.png)'],['position','fixed'],['behavior','x'],['width','expression(alert(1))'],['opacity','3']])
  assert.throws(()=>E.setStyles(HTML,p,{[prop]:val}),undefined,prop+'='+val+' debe rechazarse');
assert.doesNotThrow(()=>E.setStyles(HTML,p,{'background-image':'url(wayup-media/abc-123.png)'}));
assert.doesNotThrow(()=>E.setStyles(HTML,p,{'background-image':'linear-gradient(90deg, #000, #fff)','box-shadow':'0 4px 12px rgba(0,0,0,.2)','display':'flex','gap':'16px'}));

// Texto en línea: conserva formato permitido y elimina lo peligroso
const h1=idx(HTML,'h1');
assert.equal(E.isTextEditable(doc(HTML).querySelector('h1')),true);
assert.equal(E.isTextEditable(doc(HTML).querySelector('section')),false);
r=E.setInlineContent(HTML,h1,'Nuevo <strong>título</strong><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)" onclick="x()">mal</a>');
el=doc(r.html).querySelector('h1');
assert.match(el.innerHTML,/<strong>título<\/strong>/);
assert.ok(!/script|onerror|onclick|javascript:|<img/i.test(el.innerHTML),'Sin código activo: '+el.innerHTML);
assert.throws(()=>E.setInlineContent(HTML,h1,'   '),/vacío/);
assert.throws(()=>E.setInlineContent(HTML,idx(HTML,'section'),'x'),/otros elementos/);

// Atributos
const link=idx(HTML,'section a');
r=E.setAttributes(HTML,link,{href:'https://ejemplo.test/contacto',target:'_blank'});
el=doc(r.html).querySelector('section a');
assert.equal(el.getAttribute('rel'),'noopener noreferrer');
assert.throws(()=>E.setAttributes(HTML,link,{href:'javascript:alert(1)'}));
assert.throws(()=>E.setAttributes(HTML,p,{id:'logo'}),/Ya existe/);
assert.throws(()=>E.setAttributes(HTML,idx(HTML,'img'),{alt:undefined,href:'#x'}),/no es un enlace/);

// Duplicar / copiar / pegar con IDs únicos y sin código activo
r=E.duplicateElement(HTML,p);
let ids=[...doc(r.html).querySelectorAll('[id]')].map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,'IDs únicos tras duplicar');
assert.equal(doc(r.html).querySelectorAll('section p').length,2);
assert.ok(r.index>p,'Selecciona la copia');
const clip=E.copyElement(HTML.replace('<p id="p1">','<p id="p1" onclick="alert(1)">'),p);
assert.doesNotMatch(clip,/onclick/);
r=E.pasteElement(HTML,idx(HTML,'header'),clip,'inside');
ids=[...doc(r.html).querySelectorAll('[id]')].map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,'IDs únicos tras pegar');
assert.ok(doc(r.html).querySelector('header p'),'Pegado dentro de la cabecera');
assert.throws(()=>E.pasteElement(HTML,idx(HTML,'img'),clip,'inside'));

// Mover, eliminar, ocultar, contenedor padre
r=E.moveElement(HTML,p,'up');
assert.equal(doc(r.html).querySelector('section').firstElementChild.id,'p1');
assert.throws(()=>E.moveElement(r.html,r.index,'up'),/primero/);
r=E.removeElement(HTML,p);
assert.equal(doc(r.html).querySelector('#p1'),null);
assert.equal(r.index,idx(r.html,'section'),'Selecciona el contenedor tras eliminar');
r=E.toggleHidden(HTML,p);
assert.ok(r.hidden&&doc(r.html).querySelector('#p1').hasAttribute('hidden'));
r=E.toggleHidden(r.html,p);
assert.ok(!r.hidden&&!doc(r.html).querySelector('#p1').hasAttribute('hidden'));
assert.equal(E.parentIndex(HTML,p),idx(HTML,'section'));

// SEO
let html=E.writeSeo(HTML,{title:'Web ficticia de pruebas para Studio',description:'Descripción ficticia suficientemente larga para pasar la comprobación de longitud recomendada.',lang:'es-ES',ogTitle:'OG',ogDescription:'',canonical:'https://ejemplo.test/',robots:'index, follow'});
const seo=E.readSeo(html);
assert.equal(seo.title,'Web ficticia de pruebas para Studio');
assert.equal(seo.lang,'es-ES');
assert.equal(seo.canonical,'https://ejemplo.test/');
assert.equal(doc(html).querySelectorAll('meta[name="description"]').length,1);
assert.throws(()=>E.writeSeo(HTML,{...seo,canonical:'javascript:alert(1)'}));
assert.ok(E.seoChecks(html).some(x=>/imagen|H1|título/.test(x))||E.seoChecks(html).length===0);
assert.ok(E.seoChecks('<!DOCTYPE html><html><head></head><body><h1>a</h1><h1>b</h1><img src=a></body></html>').length>=4);

// Vista previa: oculto atenuado en el editor y oculto en la exportación
const hiddenSite=F.siteFromHtml(E.toggleHidden(HTML,p).html,'Prueba');
assert.match(F.safePreview(hiddenSite).html,/data-wayup-hidden/);
assert.ok(doc(F.htmlForExport(hiddenSite)).querySelector('#p1').hasAttribute('hidden'),'Sigue oculto al exportar');

// Prioridad sobre !important del CSS original y texto con relleno degradado
r=E.setStyles(HTML,p,{color:'#123456'});
el=doc(r.html).querySelector('#p1');
assert.match(el.getAttribute('style'),/color:\s*#123456\s*!important/i,'El color del usuario gana a !important');
assert.match(el.getAttribute('style'),/-webkit-text-fill-color:\s*#123456/i,'Cubre textos con relleno degradado');
// Tipografía: Google Fonts enlazada una sola vez; las del sistema no se enlazan
r=E.setFont(HTML,p,'Playfair Display');
assert.match(doc(r.html).querySelector('#p1').getAttribute('style'),/font-family:\s*'Playfair Display', sans-serif/);
assert.equal(doc(r.html).querySelectorAll('link[data-wc-font]').length,1);
r=E.setFont(r.html,h1,'Playfair Display, serif');
assert.equal(doc(r.html).querySelectorAll('link[href*="Playfair+Display"]').length,1,'No duplica la hoja');
r=E.setFont(HTML,p,'Georgia, serif');
assert.equal(doc(r.html).querySelectorAll('link[data-wc-font]').length,0);
assert.throws(()=>E.setFont(HTML,p,'x"><script>'),/no válido/);
assert.match(F.safePreview(F.siteFromHtml(E.setFont(HTML,p,'Lora').html,'P')).html,/fonts\.googleapis\.com/,'La vista previa conserva Google Fonts');


// Fotos asociadas a platos y secciones: contenedor correcto, sustitución, borrado y ZIP.
const MENU_HTML=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Carta de prueba</title></head><body>
<nav><ul><li><a href="#carta">Carta</a></li></ul></nav>
<main><section id="carta" data-wc-section="carta"><h2 id="carta-title">Para empezar</h2>
<ul><li class="dish-row"><span class="dish-name">Croquetas de carrilleras</span><span class="price">8 €</span></li>
<li class="dish-row"><span class="dish-name">Carpaccio de ternera</span><span class="price">12 €</span></li></ul>
</section></main></body></html>`;
const menuSite=F.siteFromHtml(MENU_HTML,'Carta de prueba');
const dishIndex=idx(MENU_HTML,'.dish-name');
const dishTarget=F.resolveImageTarget(menuSite,dishIndex);
assert.equal(dishTarget?.kind,'item','Un texto de plato se resuelve a su fila');
assert.equal(dishTarget?.tag,'LI','La foto se asocia al li del plato');
assert.match(dishTarget?.label||'',/Croquetas de carrilleras/);
const testPng=new Uint8Array([137,80,78,71,13,10,26,10,10,20,30,40]);
let menuWithPhoto=F.attachLocalImage(menuSite,dishIndex,testPng);
let menuDoc=doc(menuWithPhoto.html);
assert.equal(menuDoc.querySelectorAll('li.dish-row > img[data-wayup-photo]').length,1,'La foto queda dentro de la fila del plato');
assert.equal(menuDoc.querySelectorAll('section#carta > img[data-wayup-photo]').length,0,'No se adjunta al bloque de toda la carta');
assert.equal(Object.keys(menuWithPhoto.assets).filter(x=>x.startsWith('wayup-media/')).length,1,'El recurso se guarda en el proyecto');
let afterDishIndex=idx(menuWithPhoto.html,'.dish-name');
let afterDishTarget=F.resolveImageTarget(menuWithPhoto,afterDishIndex);
assert.equal(afterDishTarget?.kind,'item');
assert.equal(afterDishTarget?.managedImage,true,'El editor reconoce la foto asociada');
const sectionWhileDishHasPhoto=F.resolveImageTarget(menuWithPhoto,idx(menuWithPhoto.html,'#carta-title'));
assert.equal(sectionWhileDishHasPhoto?.kind,'section');
assert.equal(sectionWhileDishHasPhoto?.hasImage,false,'La foto de un plato no se confunde con la foto de toda la sección');
const testJpeg=new Uint8Array([255,216,255,0,0,0,0,0,0,0,0,0]);
menuWithPhoto=F.attachLocalImage(menuWithPhoto,afterDishIndex,testJpeg);
menuDoc=doc(menuWithPhoto.html);
assert.equal(menuDoc.querySelectorAll('li.dish-row > img[data-wayup-photo]').length,1,'Sustituir no duplica fotografías');
assert.equal(Object.keys(menuWithPhoto.assets).filter(x=>x.startsWith('wayup-media/')).length,1,'La foto anterior sin referencias se limpia del ZIP');
afterDishIndex=idx(menuWithPhoto.html,'.dish-name');
const removedPhoto=F.removeLocalImage(menuWithPhoto,afterDishIndex);
assert.equal(doc(removedPhoto.html).querySelectorAll('li.dish-row > img[data-wayup-photo]').length,0,'La foto se puede eliminar');
assert.equal(Object.keys(removedPhoto.assets).filter(x=>x.startsWith('wayup-media/')).length,0,'La foto eliminada se retira de los recursos');
const sectionTitleIndex=idx(MENU_HTML,'#carta-title');
const sectionTarget=F.resolveImageTarget(menuSite,sectionTitleIndex);
assert.equal(sectionTarget?.kind,'section','Un título de sección se resuelve a su sección');
assert.equal(sectionTarget?.tag,'SECTION');
const sectionWithPhoto=F.attachLocalImage(menuSite,sectionTitleIndex,testPng);
const sectionDoc=doc(sectionWithPhoto.html);
assert.equal(sectionDoc.querySelectorAll('section#carta > img[data-wayup-photo]').length,1,'La foto de sección se inserta después de su título');
assert.equal(sectionDoc.querySelectorAll('li.dish-row > img[data-wayup-photo]').length,0);
const zippedMenu=F.siteFromZip(F.siteZip(menuWithPhoto));
assert.equal(Object.keys(zippedMenu.assets).filter(x=>x.startsWith('wayup-media/')).length,1,'La fotografía del plato sobrevive a exportar y reabrir el ZIP');
assert.match(zippedMenu.html,/data-wayup-photo-kind="item"/);

// Sustitución de iconos: conserva la caja CSS, dimensiones SVG, color y grosor del destino.
const ICON_HTML=`<!DOCTYPE html><html lang="es"><head></head><body><section>
<span class="feature-icon" data-wc-symbol="house" data-wc-name="Símbolo · house" style="display:inline-flex;width:32px;height:32px;color:#b4233d">
<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/></svg>
</span></section></body></html>`;
const iconIndex=idx(ICON_HTML,'.feature-icon');
const iconTarget=E.resolveSymbolTarget(ICON_HTML,iconIndex);
assert.equal(iconTarget?.name,'house','Reconoce el símbolo existente');
assert.equal(iconTarget?.width,'32px','Lee la anchura real del contenedor');
assert.equal(iconTarget?.height,'32px','Lee la altura real del contenedor');
const iconEntry={name:'house-plus',node:[['path',{d:'M3 10.5 12 3l9 7.5'}],['path',{d:'M5 9v12h14V9'}],['path',{d:'M19 16v6'}],['path',{d:'M16 19h6'}]]};
const replacedIcon=E.replaceInlineSymbol(ICON_HTML,iconIndex,iconEntry);
const iconDoc=doc(replacedIcon.html);
const iconWrapper=iconDoc.querySelector('.feature-icon');
const iconSvg=iconWrapper.querySelector('svg');
assert.equal(iconWrapper.getAttribute('style'),'display:inline-flex;width:32px;height:32px;color:#b4233d','Conserva el estilo del contenedor');
assert.equal(iconWrapper.getAttribute('data-wc-symbol'),'house-plus');
assert.equal(iconSvg.getAttribute('width'),'100%','Conserva el ancho SVG original');
assert.equal(iconSvg.getAttribute('height'),'100%','Conserva el alto SVG original');
assert.equal(iconSvg.getAttribute('viewBox'),'0 0 24 24','Normaliza la cuadrícula Lucide');
assert.equal(iconSvg.getAttribute('stroke-width'),'1.5','Conserva el grosor de trazo original');
assert.equal(iconSvg.getAttribute('stroke'),'currentColor','Conserva el color heredado');
assert.equal(iconSvg.querySelectorAll('path').length,4,'Sustituye la geometría completa');
assert.equal(E.resolveSymbolTarget(replacedIcon.html,iconIndex)?.name,'house-plus');
const fittedIcon=E.replaceInlineSymbol(ICON_HTML,iconIndex,iconEntry,'translate(1.2500 2.5000) scale(0.7500)');
assert.equal(doc(fittedIcon.html).querySelector('.feature-icon > svg > g').getAttribute('transform'),'translate(1.2500 2.5000) scale(0.7500)',
  'La geometría nueva se escala y centra en el tamaño visual del símbolo de destino');
const multiIconHtml=`<!DOCTYPE html><html><head></head><body><button><svg width="20" height="20" viewBox="0 0 24 24"><path d="M1 1"/></svg><svg width="20" height="20" viewBox="0 0 24 24"><path d="M2 2"/></svg></button></body></html>`;
assert.equal(E.resolveSymbolTarget(multiIconHtml,idx(multiIconHtml,'button')),null,'No ofrece sustitución si el contenedor tiene varios SVG');

// CSS: acepta reglas y media queries; rechaza estructura rota, imports y cargas externas.
assert.equal(V.validateCssSource(':root { --brand: #123456; } @media (max-width: 700px) { .hero { padding: 1rem; } }'),null);
assert.equal(V.validateCssStructure('@import url("https://example.com/theme.css"); .hero { color: red; }'),null,
  'Las hojas CSS originales pueden conservar imports y URLs; se valida su estructura sin aplicar las restricciones del CSS personalizado');
assert.match(V.validateCssStructure('.hero { color: red;')||'',/Falta cerrar/);
assert.equal(V.validateCssSource('/* comentario con } */ .hero { color: red; }'),null);
assert.match(V.validateCssSource('.hero { color: red;')||'',/Falta cerrar/);
assert.match(V.validateCssSource('.hero { content: "sin cerrar; }')||'',/cadena CSS sin cerrar/);
assert.match(V.validateCssSource('@import url("https://example.com/a.css");')||'',/@import/);
assert.match(V.validateCssSource('.hero { background: url(https://example.com/a.png); }')||'',/recursos externos/);
assert.match(V.validateCssSource('<style>.hero{color:red}</style>')||'',/etiquetas <style>/);

// Regresión con el HTML real de El Refugio de Chilla (snapshot de su repo, solo lectura).
// Al hacer clic en el texto interior del botón de reserva, el editor debe resolver el botón padre.
const refugioSubmitText=idx(REFUGIO_HTML,'.btn__label');
const refugioSubmit=E.resolveButtonTarget(REFUGIO_HTML,refugioSubmitText);
assert.ok(refugioSubmit,'Detecta el botón real de envío de reservas');
assert.equal(refugioSubmit.tag,'BUTTON');
assert.match(refugioSubmit.label,/Solicitar reserva/i);
const refugioCtaIndex=idx(REFUGIO_HTML,'a.btn--primary[href="#reservas"]');
const refugioCta=E.resolveButtonTarget(REFUGIO_HTML,refugioCtaIndex);
assert.ok(refugioCta,'Detecta los enlaces CTA estilizados como botones');
assert.equal(refugioCta.tag,'A');
assert.match(refugioCta.label,/Reservar/i);
assert.equal(E.resolveButtonTarget(REFUGIO_HTML,idx(REFUGIO_HTML,'.nav__links a')),null,
  'No confunde los enlaces de navegación normales con botones');
const styledRefugio=E.setStyles(REFUGIO_HTML,refugioCta.index,{'background-color':'#c8324b','border-radius':'999px'});
const styledRefugioDoc=doc(styledRefugio.html);
const styledRefugioCta=styledRefugioDoc.querySelector('a.btn--primary[href="#reservas"]');
assert.equal(styledRefugioCta.getAttribute('href'),'#reservas','Cambiar el estilo no altera el destino del botón');
assert.match(styledRefugioCta.getAttribute('style')||'',/background-color:\s*#c8324b/i);

// Al seleccionar una imagen real del restaurante, el inspector debe resolverla como imagen sustituible.
const refugioSite=F.siteFromHtml(REFUGIO_HTML,'El Refugio de Chilla');
const refugioPhotoIndex=idx(REFUGIO_HTML,'img[src="img/plato-1.jpg"]');
const refugioPhoto=F.resolveImageTarget(refugioSite,refugioPhotoIndex);
assert.equal(refugioPhoto?.tag,'IMG');
assert.equal(refugioPhoto?.kind,'element');
assert.equal(refugioPhoto?.hasImage,true);
const originalPhoto=doc(REFUGIO_HTML).querySelector('img[src="img/plato-1.jpg"]');
const originalPhotoAlt=originalPhoto.getAttribute('alt');
const replacedRefugioPhoto=F.attachLocalImage(refugioSite,refugioPhotoIndex,testPng);
const replacedRefugioDoc=doc(replacedRefugioPhoto.html);
const actualPhoto=replacedRefugioDoc.querySelector('img[data-wayup-photo]');
assert.ok(actualPhoto,'La imagen original se sustituye, no se duplica');
assert.match(actualPhoto.getAttribute('src')||'',/^wayup-media\//);
assert.equal(actualPhoto.getAttribute('alt'),originalPhotoAlt,'Conserva el texto alternativo original');
assert.equal(actualPhoto.getAttribute('width'),'1440','Conserva dimensiones originales');
assert.equal(actualPhoto.getAttribute('height'),'960','Conserva dimensiones originales');
assert.equal(replacedRefugioDoc.querySelectorAll('img[data-wayup-photo]').length,1);

console.log('Correcto: edición HTML/CSS, iconos, estilos, imágenes, atributos, estructura y exportación.');
