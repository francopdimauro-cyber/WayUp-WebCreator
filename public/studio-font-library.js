/* WAYUP Studio font library: public catalog + opt-in local fonts + small embedded uploads. */
(()=>{'use strict';
const select=document.getElementById('wcFontFamily');
if(!select)return;
const el=id=>document.getElementById(id);
const fonts=new Map();
const types={google:'Google Fonts',open:'Open Fonts',local:'Mi sistema',uploaded:'Importadas',system:'Sistema'};
const fallback=['Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Nunito Sans','Raleway','Ubuntu','Work Sans','DM Sans','Manrope','Space Grotesk','Outfit','Sora','Archivo','Oswald','Anton','Bricolage Grotesque','Plus Jakarta Sans','Libre Baskerville','Merriweather','Playfair Display','Cormorant Garamond','Lora','EB Garamond','Source Serif 4','Roboto Slab','Bitter','Bodoni Moda','DM Serif Display','Fraunces','Prata','Cinzel','Abril Fatface','Cormorant','Noto Serif','Noto Sans','Noto Sans Display','Noto Sans Mono','Roboto Mono','Fira Code','JetBrains Mono','IBM Plex Mono','Space Mono','Inconsolata','Ubuntu Mono','PT Mono','Source Code Pro','Syne','Urbanist','Barlow','Barlow Condensed','Barlow Semi Condensed','Rubik','Karla','Mulish','Josefin Sans','Exo 2','Kanit','Cabin','Quicksand','Public Sans','Lexend','Figtree','Red Hat Display','Red Hat Text','Arimo','Heebo','Hind','Asap','Signika','Assistant','Titillium Web','Alegreya Sans','Alegreya','PT Sans','PT Serif','Vollkorn','Spectral','Crimson Pro','Arvo','Rokkitt','Tinos','Teko','Bebas Neue','Rajdhani','Archivo Black','Archivo Narrow','Chivo','Chivo Mono','Fjalla One','Alfa Slab One','Righteous','Permanent Marker','Pacifico','Caveat','Dancing Script','Great Vibes','Sacramento','Parisienne','Lobster','Satisfy','Indie Flower','Shadows Into Light','Amatic SC','Kalam','Comfortaa','Poiret One','Italiana','Tenor Sans','Jost','Questrial','Varela Round','Yanone Kaffeesatz','Noto Sans Arabic','Noto Sans JP','Noto Sans KR','Noto Sans SC','Montserrat Alternates'];
const idOf=name=>name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const safeName=name=>typeof name==='string'&&name.length<=95&&!/["'<>\\\r\n]/.test(name)&&name.trim().length>0;
const system=['system-ui','Georgia','Arial','Verdana','Tahoma','Trebuchet MS','Times New Roman','Courier New','Segoe UI','Helvetica','Consolas','Impact','Comic Sans MS','Palatino Linotype','Garamond','Cambria','Calibri','Candara','Century Gothic','Franklin Gothic Medium'];
for(const name of fallback)fonts.set(name,{name,id:idOf(name),source:'google',category:'sans-serif'});
for(const name of system)fonts.set(name,{name,source:'system',category:'system'});
const picker=document.createElement('div');picker.className='wc-font-picker';picker.innerHTML=
'<div class="wc-font-head"><input type="search" id="wcFontSearch" placeholder="Buscar entre todas las fuentes…" autocomplete="off" aria-label="Buscar fuentes"><span id="wcFontCount">Cargando catálogo…</span></div>'+
'<div class="wc-font-filters" role="group" aria-label="Tipo de fuentes"><button type="button" data-font-filter="all" aria-pressed="true">Todas</button><button type="button" data-font-filter="google">Google</button><button type="button" data-font-filter="open">Open</button><button type="button" data-font-filter="local">Mi PC</button><button type="button" data-font-filter="uploaded">Importadas</button><button type="button" data-font-filter="system">Sistema</button></div>'+
'<div id="wcFontResults" class="wc-font-results" role="listbox" aria-label="Familias tipográficas"></div><button type="button" id="wcFontMore" hidden>Ver más fuentes</button>'+
'<div class="wc-font-actions"><button type="button" id="wcDetectFonts">Detectar fuentes de mi equipo</button><button type="button" id="wcImportFont">+ Importar fuente</button><input type="file" id="wcFontFile" accept=".woff2,.woff,.ttf,.otf" hidden></div>'+
'<div class="wc-font-actions"><button type="button" id="wcDownloadWindowsFonts">Windows: exportar listado (.ps1)</button><button type="button" id="wcImportFontList">Importar lista (.json)</button><input type="file" id="wcFontList" accept=".json,application/json" hidden></div>'+
'<label class="wc-font-remember"><input type="checkbox" id="wcRememberFonts"> Recordar nombres de mis fuentes en este navegador</label>'+
'<div class="wc-font-manual"><input id="wcFontManual" type="text" placeholder="Nombre de fuente instalada…" maxlength="90" aria-label="Nombre de fuente local"><button type="button" id="wcAddFont">Añadir</button></div>'+
'<p id="wcFontHelp" class="wc-font-help" role="status">Las fuentes de Google y Open se cargarán desde Internet. Las del ordenador solo se verán en equipos donde estén instaladas.</p>';
select.parentElement.insertAdjacentElement('afterend',picker);
select.classList.add('wc-font-native');
let activeFilter='all',loaded=false,loading=false,loadedRemote=false,visibleLimit=22;
const windowsExporter='__WAYUP_WINDOWS_FONT_EXPORTER__';
const rememberKey='wayup-studio-font-names-v1',rememberPref='wayup-studio-font-remember-v1';
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
function source(name){return fonts.get(name)?.source||null}
function note(message){el('wcFontHelp').textContent=message}
function register(data){
 if(!safeName(data?.name))return;
 const prior=fonts.get(data.name);
 if(prior?.source==='uploaded'&&data.source!=='uploaded')return;
 if(prior?.source==='local'&&data.source==='google')return;
 fonts.set(data.name,data);
 if(data.source==='uploaded'||data.source==='local')ensureOption(data.name);
}
function ensureOption(name){
 if(!safeName(name)||[...select.options].some(o=>o.value===name))return;
 const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);
}
function urlFor(item,weight='400'){
 if(item.source==='google'||item.source==='open'){
  const validWeight=/^[1-9]00$/.test(String(weight))&&item.weights?.includes(Number(weight));
  const cssFile=validWeight?'/' + weight + '.css':'/index.css';
  if(/^[a-z0-9-]+$/.test(item.id||''))return 'https://cdn.jsdelivr.net/fontsource/css/'+item.id+'@latest'+cssFile;
  if(item.source==='google')return 'https://fonts.googleapis.com/css2?family='+encodeURIComponent(item.name).replace(/%20/g,'+')+'&display=swap';
 }
 return '';
}
function installUploadedPreview(name,data){
 if(!safeName(name)||!/^data:font\/(?:woff2?|ttf|otf);base64,[A-Za-z0-9+/=]+$/.test(data))return;
 const id='wc-font-upload-'+idOf(name);
 let style=document.getElementById(id);
 if(!style){style=document.createElement('style');style.id=id;document.head.append(style)}
 const format=data.startsWith('data:font/woff2;')?'woff2':data.startsWith('data:font/woff;')?'woff':data.startsWith('data:font/ttf;')?'truetype':'opentype';
 style.textContent='@font-face{font-family:"'+name+'";src:url("'+data+'") format("'+format+'");font-weight:400;font-style:normal;font-display:swap}';
}
function preview(item){
 if(item.source!=='google'&&item.source!=='open')return;
 const id='wc-font-prev-'+idOf(item.name);
 if(document.getElementById(id))return;
 const url=urlFor(item);if(!url)return;
 const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=url;document.head.append(link);
}
function render(){
 const q=normalize(el('wcFontSearch').value.trim());
 const values=[...fonts.values()].filter(f=>(activeFilter==='all'||f.source===activeFilter)&&(!q||normalize(f.name).includes(q)));
 values.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
 const chosen=select.value;
 const root=el('wcFontResults');root.replaceChildren();
 for(const f of values.slice(0,visibleLimit)){
  const button=document.createElement('button');button.type='button';button.className='wc-font-item';button.setAttribute('role','option');
  button.setAttribute('aria-selected',String(chosen===f.name));button.dataset.font=f.name;
  const name=document.createElement('strong');name.textContent=f.name;
  const label=document.createElement('small');label.textContent=types[f.source]||'Fuente';
  const sample=document.createElement('span');sample.textContent='Diseña algo extraordinario 123 Áñ';
  sample.style.fontFamily='"'+f.name+'",sans-serif';
  button.append(name,label,sample);root.append(button);
 }
 if(!values.length){const p=document.createElement('p');p.className='wc-font-noresults';p.textContent='No hay fuentes que coincidan. Prueba otra búsqueda.';root.append(p)}
 el('wcFontCount').textContent=values.length+' fuentes'+(values.length>visibleLimit?' · mostrando '+Math.min(visibleLimit,values.length):'')+(loadedRemote?' · catálogo en línea':' · selección básica');
 el('wcFontMore').hidden=values.length<=visibleLimit;
 for(const f of values.slice(Math.max(0,visibleLimit-22),Math.min(visibleLimit,values.length,Math.max(0,visibleLimit-22)+8)))preview(f);
}
async function loadRemote(){
 if(loaded||loading)return;loading=true;
 try{
  const r=await fetch('https://api.fontsource.org/v1/fonts',{mode:'cors',cache:'force-cache'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!Array.isArray(data))throw Error('Catálogo inválido');
  for(const f of data){
   if((f.type!=='google'&&f.type!=='other')||!/^[a-z0-9-]+$/.test(f.id||'')||!safeName(f.family))continue;
   register({name:f.family,id:f.id,source:f.type==='google'?'google':'open',category:String(f.category||'sans-serif'),weights:Array.isArray(f.weights)?f.weights.filter(x=>Number.isInteger(x)&&x>=100&&x<=900):[400]});
  }
  loadedRemote=true;note('Catálogo Fontsource activo. Fuentes de Google y otras bibliotecas abiertas. Las locales requieren permiso o importación.');
 }catch{
  note('Catálogo en línea no disponible: puedes seguir usando la selección incorporada e importar fuentes de tu equipo.');
 }finally{loaded=true;loading=false;render()}
}
picker.addEventListener('click',event=>{
 const filter=event.target.closest('[data-font-filter]');
 if(filter){activeFilter=filter.dataset.fontFilter;visibleLimit=22;picker.querySelectorAll('[data-font-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));render();return}
 const choice=event.target.closest('[data-font]');
 if(choice&&fonts.has(choice.dataset.font)){
  ensureOption(choice.dataset.font);select.value=choice.dataset.font;render();
  note('Fuente '+select.value+' seleccionada. Pulsa «Aplicar tipografía y estilos» para actualizar el elemento del Canvas.');
 }
});
el('wcFontSearch').addEventListener('input',()=>{visibleLimit=22;render()});
el('wcFontMore').addEventListener('click',()=>{visibleLimit+=22;render();el('wcFontMore').focus()});
el('wcFontSearch').addEventListener('focus',loadRemote,{once:true});
picker.addEventListener('pointerdown',loadRemote,{once:true});
el('wcDetectFonts').addEventListener('click',async()=>{
 if(typeof window.queryLocalFonts!=='function'){
  note('Este navegador no permite enumerar fuentes del equipo. En Chrome/Edge puedes autorizarlo; aquí introduce el nombre exacto o importa un archivo .woff2/.woff/.ttf/.otf.');
  return;
 }
 const button=el('wcDetectFonts');button.disabled=true;
 try{
  const found=await window.queryLocalFonts();
  const families=[...new Set(found.map(f=>f.family).filter(safeName))];
  for(const name of families)register({name,source:'local',category:'system'});
  activeFilter='local';picker.querySelectorAll('[data-font-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fontFilter==='local')));
  persistLocal();note('Detectadas '+families.length+' familias de este dispositivo. El navegador pedirá permiso. No se envían a nuestros servidores.');
  render();
 }catch(e){note('No se accedió a las fuentes: '+(e?.name==='NotAllowedError'?'permiso denegado.':String(e?.message||'error del navegador')))}
 finally{button.disabled=false}
});
el('wcAddFont').addEventListener('click',()=>{
 const name=el('wcFontManual').value.trim();
 if(!safeName(name)){note('Introduce un nombre de fuente válido (máximo 90 caracteres).');return}
 register({name,source:'local',category:'system'});
 select.value=name;activeFilter='local';persistLocal();render();note('Fuente local añadida. Solo aparecerá en dispositivos donde esté instalada.');
});
el('wcImportFont').addEventListener('click',()=>el('wcFontFile').click());
el('wcFontFile').addEventListener('change',async()=>{
 const file=el('wcFontFile').files?.[0];if(!file)return;
 if(!/\.(woff2?|ttf|otf)$/i.test(file.name)){note('Formato no válido. Usa WOFF2, WOFF, TTF u OTF.');return}
 if(file.size>115000){note('Fuente demasiado grande para incrustarla en un proyecto Studio (máximo 115 KB). Convierte a WOFF2 o selecciona una variante ligera.');return}
 const name='WC '+file.name.replace(/\.(woff2?|ttf|otf)$/i,'').replace(/[_-]+/g,' ').replace(/[^a-zA-Z0-9À-ÿ ]/g,'').trim().slice(0,68);
 if(name==='WC '){note('Nombre de archivo inválido.');return}
 const mime=/\.woff2$/i.test(file.name)?'font/woff2':/\.woff$/i.test(file.name)?'font/woff':/\.ttf$/i.test(file.name)?'font/ttf':'font/otf';
 const reader=new FileReader();
 reader.onload=()=>{
  const raw=String(reader.result||'');
  const base64=raw.split(',')[1]||'';
  if(!/^[A-Za-z0-9+/=]+$/.test(base64)){note('No se pudo leer la fuente.');return}
  const data='data:'+mime+';base64,'+base64;
  register({name,source:'uploaded',category:'uploaded',mime,embedded:data});
  select.value=name;activeFilter='uploaded';
  picker.querySelectorAll('[data-font-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fontFilter==='uploaded')));
  installUploadedPreview(name,data);
  render();note('Fuente importada. Se incrustará en el HTML al aplicarla si el proyecto cabe en el límite de almacenamiento. Comprueba su licencia de redistribución.');
 };
 reader.onerror=()=>note('No se pudo leer el archivo.');
 reader.readAsDataURL(file);
 el('wcFontFile').value='';
});
function hydrate(doc){
 if(!doc)return;
 for(const style of doc.querySelectorAll('style[data-wc-font-upload]')){
  const name=style.getAttribute('data-wc-font-upload');
  if(!safeName(name))continue;
  const match=style.textContent.match(/url\("(data:font\/(?:woff2?|ttf|otf);base64,[A-Za-z0-9+/=]+)"\)/);
  if(!match)continue;
  register({name,source:'uploaded',embedded:match[1],category:'uploaded'});
  installUploadedPreview(name,match[1]);
 }
}
function embed(doc,name){
 const item=fonts.get(name);
 if(!doc||item?.source!=='uploaded'||!item.embedded)return true;
 if([...doc.querySelectorAll('style[data-wc-font-upload]')].some(s=>s.getAttribute('data-wc-font-upload')===name))return true;
 const data=item.embedded;
 const css='@font-face{font-family:"'+name+'";src:url("'+data+'");font-weight:400;font-style:normal;font-display:swap}';
 if(doc.documentElement.outerHTML.length+css.length+150>290000){
  note('Esta fuente haría que el HTML superase el límite de 300.000 caracteres. Usa WOFF2 más ligero.');
  return false;
 }
 const style=doc.createElement('style');style.setAttribute('data-wc-font-upload',name);style.textContent=css;doc.head.append(style);return true;
}
function persistLocal(){
 try{
  if(!el('wcRememberFonts').checked)return;
  const names=[...fonts.values()].filter(f=>f.source==='local').map(f=>f.name).slice(0,7000);
  localStorage.setItem(rememberKey,JSON.stringify(names));
  localStorage.setItem(rememberPref,'1');
 }catch{note('No se pudo guardar el listado local en este navegador.')}
}
function loadRemembered(){
 try{
  const remember=localStorage.getItem(rememberPref)==='1';
  el('wcRememberFonts').checked=remember;
  if(!remember)return;
  const names=JSON.parse(localStorage.getItem(rememberKey)||'[]');
  if(!Array.isArray(names)||names.length>7000)return;
  for(const name of names)if(safeName(name))register({name,source:'local',category:'system'});
 }catch{ /* Optional local storage is not available. */ }
}
el('wcRememberFonts').addEventListener('change',()=>{
 try{
  if(el('wcRememberFonts').checked){persistLocal();note('El catálogo de nombres se guardará solo en este navegador.')}
  else{localStorage.removeItem(rememberKey);localStorage.removeItem(rememberPref);note('Se dejó de recordar el listado local. No se eliminaron fuentes del equipo.')}
 }catch{note('El navegador no permite guardar preferencias locales.')}
});
el('wcDownloadWindowsFonts').addEventListener('click',()=>{
 const blob=new Blob([windowsExporter],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='wayup-exportar-fuentes.ps1';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
 note('Ejecuta el script .ps1 en Windows PowerShell. Creará wayup-fuentes-windows.json en el Escritorio; después pulsa «Importar lista (.json)».');
});
el('wcImportFontList').addEventListener('click',()=>el('wcFontList').click());
el('wcFontList').addEventListener('change',async()=>{
 const file=el('wcFontList').files?.[0];el('wcFontList').value='';
 if(!file)return;
 if(!/\.json$/i.test(file.name)||file.size>512000){note('Selecciona el JSON exportado por WAYUP (máximo 500 KB).');return}
 try{
  const raw=await file.text(),payload=JSON.parse(raw.replace(/^\uFEFF/,''));
  if(payload?.format!=='wayup-local-fonts-v1'||!Array.isArray(payload.families)||payload.families.length>7000)
   throw Error('Formato de listado incompatible.');
  let count=0;
  for(const family of payload.families){
   if(!safeName(family))continue;
   register({name:family,source:'local',category:'system'});count++;
  }
  activeFilter='local';visibleLimit=22;
  picker.querySelectorAll('[data-font-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fontFilter==='local')));
  persistLocal();render();
  note('Importadas '+count+' familias instaladas en Windows. Son solo nombres; la web exportada necesitará esas fuentes en el equipo donde se abra, o fuentes incrustadas con licencia.');
 }catch(e){note('No se pudo importar el catálogo: '+String(e.message||'archivo inválido'))}
});
loadRemembered();
window.WebCreatorFontLibrary={
 has:name=>fonts.has(name),get:name=>fonts.get(name)||null,href:(name,weight)=>urlFor(fonts.get(name)||{},weight),ensureOption,
 hydrate,embed,refresh:render
};
render();
})();