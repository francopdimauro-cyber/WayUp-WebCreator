/* WebCreator Studio: visual editing never invokes model APIs. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const selector='h1,h2,h3,h4,h5,h6,p,span,a,button,li,label,strong,em,small,blockquote,img,div,section,article,header,footer,nav,main,aside,figure,figcaption';
const state={id:'',name:'',version:0,doc:null,saved:'',selected:-1,dirty:false,undo:[],redo:[],objectUrl:'',code:false,mode:'edit',projects:[],saving:false,loadSeq:0};
const FONT_FAMILIES=new Set(['Inter','Space Grotesk','DM Sans','Manrope','Outfit','Sora','Archivo','Oswald','Anton','Bricolage Grotesque','Plus Jakarta Sans','Libre Baskerville','system-ui','Georgia','Arial']);
const SYSTEM_FAMILIES=new Set(['system-ui','Georgia','Arial']);
const fontHref=name=>'https://fonts.googleapis.com/css2?family='+encodeURIComponent(name).replace(/%20/g,'+')+'&display=swap';
let device='desktop';

const shell=`<div id="wcStudio" role="dialog" aria-modal="true" aria-label="WAYUP Studio, editor visual" aria-hidden="true">
 <header class="wc-top">
  <div class="wc-identity">
   <span class="wc-studio-mark" aria-hidden="true"><img id="wcStudioBrandLogo" alt="" width="42" height="42"></span>
   <div class="wc-identity-text"><div class="wc-brand">WAY<b>UP</b><em>STUDIO</em></div><span class="wc-identity-sub">CREATIVE WORKSPACE / V2</span></div>
  </div>
  <div class="wc-top-context"><span class="wc-context-led" aria-hidden="true"></span><div><small>PROYECTO EN EDICIÓN</small><strong id="wcHeaderTitle">Elige una web</strong></div></div>
  <div class="wc-tools wc-top-actions">
   <button type="button" id="wcLibraryMobile" class="wc-toolbar-quiet" title="Abrir biblioteca" aria-label="Abrir biblioteca" aria-expanded="false">▤ <span>Mis webs</span></button>
   <button type="button" id="wcImport" class="wc-toolbar-quiet" title="Importar HTML">↥ <span>Importar</span></button><input type="file" accept=".html,.htm,text/html" id="wcFile" class="wc-hidden">
   <button type="button" id="wcRename" class="wc-toolbar-quiet" title="Cambiar nombre">✎ <span>Nombre</span></button>
   <span class="wc-toolbar-divider" aria-hidden="true"></span>
   <button type="button" id="wcUndo" class="wc-toolbar-icon" aria-label="Deshacer" title="Deshacer (Ctrl+Z)">↶</button>
   <button type="button" id="wcRedo" class="wc-toolbar-icon" aria-label="Rehacer" title="Rehacer (Ctrl+Y)">↷</button>
   <button type="button" id="wcSave" class="wc-primary wc-save-btn" title="Guardar versión (Ctrl+S)">Guardar versión</button>
   <button type="button" id="wcClose" class="wc-toolbar-icon wc-close-studio" aria-label="Cerrar Studio" title="Cerrar Studio">✕</button>
  </div>
 </header>
 <div class="wc-layout">
  <aside class="wc-sidebar wc-library" aria-label="Biblioteca">
   <div class="wc-sidebar-head">
    <div class="wc-sidebar-heading"><div><span class="wc-overline">01 / BIBLIOTECA</span><h3>Mis proyectos</h3></div><button id="wcLibraryCollapse" class="wc-collapse-btn" type="button" aria-expanded="true" title="Contraer biblioteca" aria-label="Contraer biblioteca">⇤</button></div>
    <p class="wc-hint wc-library-description">Todas tus webs, en un mismo espacio.</p>
    <label class="wc-search-wrap"><span aria-hidden="true">⌕</span><input id="wcProjectSearch" type="search" placeholder="Buscar proyectos..." aria-label="Buscar proyectos" autocomplete="off"></label>
    <button id="wcReload" class="wc-library-refresh" type="button">↻ <span>Actualizar biblioteca</span></button>
   </div>
   <div class="wc-projects" id="wcProjects"></div><div class="wc-section-rail"><div class="wc-section-label"><span>ESTRUCTURA</span><span id="wcSectionsCount">0</span></div><div id="wcSections" class="wc-section-items"><p class="wc-hint">Abre una web para ver sus secciones.</p></div></div>
   <div class="wc-library-foot"><span class="wc-live-dot" aria-hidden="true"></span><span>WORKSPACE PRIVADO</span><span id="wcProjectCount">—</span></div>
  </aside>
  <section class="wc-area" aria-label="Lienzo de edición">
   <div class="wc-canvas-head">
    <div class="wc-document-heading"><span class="wc-overline">CANVAS / ESPACIO DE TRABAJO</span><strong id="wcTitle">Selecciona un proyecto</strong></div>
    <div class="wc-canvas-controls">
     <div class="wc-mode-switch" role="group" aria-label="Modo del editor">
      <button type="button" id="wcEditMode" aria-pressed="true" title="Editar elementos">✎ <span>Diseño</span></button>
      <button type="button" id="wcPreviewMode" aria-pressed="false" title="Vista funcional">◉ <span>Vista real</span></button>
      <button type="button" id="wcCodeMode" aria-pressed="false" title="Código HTML">{ } <span>Código</span></button>
     </div>
     <span class="wc-canvas-separator" aria-hidden="true"></span>
     <div class="wc-view-switch" role="group" aria-label="Tamaño de pantalla">
      <button type="button" id="wcDesktop" aria-pressed="true" title="Escritorio">▣ <span>Desktop</span></button>
      <button type="button" id="wcTablet" aria-pressed="false" title="Tablet">▯ <span>Tablet</span></button>
      <button type="button" id="wcMobile" aria-pressed="false" title="Móvil">▯ <span>Móvil</span></button>
     </div>
    </div>
   </div>
   <div class="wc-canvas-shell">
    <div class="wc-blank" id="wcBlank"><span class="wc-empty-symbol" aria-hidden="true">▣</span><strong>Tu lienzo empieza aquí</strong><p>Selecciona una web de la biblioteca para empezar a diseñar.</p></div>
    <iframe id="wcFrame" title="Editor visual aislado" sandbox="allow-scripts" referrerpolicy="no-referrer" class="wc-hidden"></iframe>
    <textarea id="wcSourceCode" spellcheck="false" aria-label="Código HTML editable" class="wc-hidden"></textarea>
   </div>
   <div class="wc-statusbar"><span class="wc-status-led" aria-hidden="true"></span><span id="wcStatus" class="wc-status" role="status" aria-live="polite">Abre una web para editarla sin usar IA.</span><span class="wc-status-meta" id="wcViewportInfo">DESKTOP · 100%</span></div>
  </section>
  <aside class="wc-sidebar right wc-properties" aria-label="Inspector de propiedades">
   <div class="wc-sidebar-head wc-inspector-head">
    <span class="wc-overline">02 / PANEL DE CONTROL</span><h3>Inspector</h3>
    <p class="wc-hint">Cada detalle, bajo tu control.</p>
    <div class="wc-inspector-tabs" role="group" aria-label="Panel del inspector">
     <button type="button" id="wcTabDesign" aria-pressed="true">✦ Diseño</button>
     <button type="button" id="wcTabProject" aria-pressed="false">▤ Proyecto</button>
    </div>
   </div>
   <div class="wc-inspector" id="wcInspectorDesign">
    <div class="wc-selected-info"><span class="wc-overline">ELEMENTO SELECCIONADO</span><span class="wc-tag" id="wcTag">Sin selección</span><span class="wc-hint" id="wcElementName">Selecciona algo en el lienzo.</span></div>
    <details class="wc-property-group" open><summary><span>01</span> Contenido <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
      <label id="wcTextWrap">Texto<textarea id="wcText" maxlength="9000" rows="3"></textarea></label><button type="button" id="wcApplyText" class="wc-property-apply">Aplicar texto <span aria-hidden="true">↗</span></button>
      <p class="wc-hint wc-property-tip">Doble clic sobre un texto sencillo para editarlo directamente.</p>
    </div></details>
    <details class="wc-property-group" open><summary><span>02</span> Tipografía <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
     <label>Fuente
      <select id="wcFontFamily"><option value="">Heredar de la web</option>
       <optgroup label="Google Fonts / Open Fonts">
        <option value="Inter">Inter</option><option value="Space Grotesk">Space Grotesk</option><option value="DM Sans">DM Sans</option><option value="Manrope">Manrope</option>
        <option value="Outfit">Outfit</option><option value="Sora">Sora</option><option value="Archivo">Archivo</option><option value="Oswald">Oswald</option>
        <option value="Anton">Anton</option><option value="Bricolage Grotesque">Bricolage Grotesque</option><option value="Plus Jakarta Sans">Plus Jakarta Sans</option><option value="Libre Baskerville">Libre Baskerville</option>
       </optgroup>
       <optgroup label="Fuentes del sistema"><option value="system-ui">Sistema</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option></optgroup>
      </select></label>
     <div class="wc-field-two"><label>Tamaño <span>px</span><input id="wcFont" type="number" min="8" max="160" placeholder="Auto"></label>
      <label>Peso<select id="wcFontWeight"><option value="">Heredar</option><option value="400">Regular 400</option><option value="500">Medium 500</option><option value="600">Semibold 600</option><option value="700">Bold 700</option><option value="800">ExtraBold 800</option><option value="900">Black 900</option></select></label></div>
     <div class="wc-field-two"><label>Interlineado<input id="wcLineHeight" type="number" min="0.8" max="3" step="0.05" placeholder="Auto"></label><label>Tracking <span>px</span><input id="wcLetterSpacing" type="number" min="-8" max="15" step="0.25" placeholder="Auto"></label></div>
     <label>Alineación<select id="wcAlign"><option value="">Sin cambios</option><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="justify">Justificada</option></select></label>
     <button type="button" id="wcApplyStyle" class="wc-property-apply">Aplicar tipografía y estilos <span aria-hidden="true">↗</span></button>
    </div></details>
    <details class="wc-property-group" open><summary><span>03</span> Apariencia <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
     <div class="wc-color-grid"><label>Color texto<input id="wcColor" type="color" value="#111111"></label><label>Fondo<input id="wcBackground" type="color" value="#ffffff"></label></div>
     <button type="button" id="wcApplyAppearance" class="wc-property-apply">Aplicar apariencia <span aria-hidden="true">↗</span></button><p class="wc-hint wc-property-tip">Los colores solo cambian si los modificas.</p>
    </div></details>
    <details class="wc-property-group" id="wcImageGroup"><summary><span>04</span> Imagen <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
     <label id="wcSrcWrap" class="wc-hidden">URL de imagen<input id="wcSrc" type="text"></label>
     <label id="wcAltWrap" class="wc-hidden">Texto alternativo<input id="wcAlt" type="text"></label>
     <button type="button" id="wcApplyImage" class="wc-hidden wc-property-apply">Cambiar imagen</button>
     <button type="button" id="wcMediaPick" class="wc-hidden wc-primary">▧ Elegir de mi biblioteca</button>
     <label id="wcFitWrap" class="wc-hidden">Ajuste<select id="wcFit"><option value="">Automático</option><option value="cover">Rellenar y recortar</option><option value="contain">Ajustar entera</option><option value="fill">Estirar</option></select></label>
     <label id="wcPositionWrap" class="wc-hidden">Encuadre<select id="wcPosition"><option value="">Sin cambios</option><option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option></select></label>
     <label id="wcWidthWrap" class="wc-hidden">Ancho máximo <span>px</span><input id="wcWidth" type="number" min="40" max="2400" placeholder="Sin límite"></label>
     <button type="button" id="wcImageStyle" class="wc-hidden wc-property-apply">Aplicar encuadre</button>
     <p id="wcImageEmpty" class="wc-hint wc-property-tip">Selecciona una imagen en Canvas para editarla o abre «Imágenes» en la barra superior para añadir una nueva.</p>
    </div></details>
    <details class="wc-property-group" id="wcLinkGroup"><summary><span>05</span> Enlace <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
     <label id="wcHrefWrap" class="wc-hidden">Destino del enlace<input id="wcHref" type="text" placeholder="#seccion"></label>
     <button type="button" id="wcApplyLink" class="wc-hidden wc-property-apply">Cambiar enlace</button>
     <p id="wcLinkEmpty" class="wc-hint wc-property-tip">Selecciona un botón o un enlace del lienzo.</p>
    </div></details>
   </div>
   <div class="wc-inspector wc-hidden" id="wcInspectorProject">
    <section class="wc-project-panel"><span class="wc-overline">ENTREGA & CONTROL</span><h3>Tu web, lista para exportar.</h3><p class="wc-hint">Descarga el código, comprueba su estructura o recupera una versión anterior.</p>
     <button type="button" id="wcDownload" class="wc-property-apply">↓ Descargar HTML</button>
     <button type="button" id="wcZip" class="wc-property-apply">↓ Descargar ZIP</button>
     <button type="button" id="wcAudit">◎ Auditoría HTML · sin IA</button>
     <div id="wcAuditResult" class="wc-history" role="status" aria-live="polite"></div>
     <button type="button" id="wcHistory">↶ Historial de versiones</button>
     <div class="wc-history" id="wcVersions"></div>
     <button type="button" id="wcArchive" class="wc-destructive">Archivar proyecto</button>
    </section>
   </div>
  </aside>
 </div>
</div>`;
document.body.insertAdjacentHTML('beforeend',shell);
const officialLogo=document.querySelector('.wc-official-wayup-logo')?.getAttribute('src');
if(officialLogo)document.getElementById('wcStudioBrandLogo').src=officialLogo;
const header=document.querySelector('.wrap > header');
if(header){const b=document.createElement('button');b.type='button';b.className='wc-open-btn';b.id='wcOpen';b.textContent='▦ Mis webs · Studio';header.append(b)}
const actions=document.querySelector('#resultPanel .footer-actions');
if(actions){const b=document.createElement('button');b.type='button';b.className='btn';b.id='wcOpenResult';b.textContent='✎ Editar en Studio';actions.append(b)}
const status=(message,error=false)=>{el('wcStatus').textContent=message;el('wcStatus').dataset.error=String(Boolean(error));};
const serialize=doc=>'<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
const parse=text=>new DOMParser().parseFromString(text,'text/html');
const currentNode=()=>state.doc&&state.selected>=0?state.doc.querySelectorAll(selector)[state.selected]||null:null;
const filename=name=>String(name||'web').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,70);
async function api(path,options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await response.json().catch(()=>{throw Error('Respuesta no válida de Cloudflare Access')});
  if(!response.ok)throw Error(data.error||('Error HTTP '+response.status));
  return data;
}
const mutate=(path,method,body)=>api(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function download(content,name,mime='text/html;charset=utf-8'){
  const obj=content instanceof Blob?content:new Blob([content],{type:mime});
  const url=URL.createObjectURL(obj),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function hasRawCodeChanges(){
  return Boolean(state.code&&state.doc&&el('wcSourceCode').value!==serialize(state.doc));
}
function sync(){
  state.dirty=!!state.doc&&serialize(state.doc)!==state.saved;
  const pending=state.dirty||hasRawCodeChanges();
  el('wcSave').disabled=!state.doc||!pending||state.saving;
  el('wcSave').textContent=state.saving?'… Guardando':pending?'● Guardar cambios':'✓ Guardado';
  el('wcUndo').disabled=!state.undo.length;
  el('wcRedo').disabled=!state.redo.length;
  el('wcTitle').textContent=(state.name||'Selecciona una web')+(pending?' · Sin guardar':state.id?' · v'+state.version:'');
  el('wcHeaderTitle').textContent=state.name||'Elige una web';
  el('wcStudio').classList.toggle('wc-has-changes',Boolean(pending));
}
function remember(){
  if(!state.doc)return;
  state.undo.push(serialize(state.doc));if(state.undo.length>30)state.undo.shift();state.redo=[];
}
function update(change,message){
  if(!state.doc)return;
  const old=serialize(state.doc);remember();change();
  if(serialize(state.doc)===old)state.undo.pop();
  sync();render();status(message||'Cambio aplicado. Guarda cuando termines.');
}
async function list(){
  try{
    const rows=(await api('/api/projects')).projects||[];
    state.projects=rows;
    const term=el('wcProjectSearch').value.trim().toLocaleLowerCase('es');
    const visible=rows.filter(row=>row.name.toLocaleLowerCase('es').includes(term));
    const root=el('wcProjects');root.replaceChildren();
    el('wcProjectCount').textContent=String(rows.length);
    if(!visible.length&&rows.length){
      const p=document.createElement('p');p.className='wc-empty';p.textContent='No hay proyectos con ese nombre.';root.append(p);
    }
    if(!rows.length){const p=document.createElement('p');p.className='wc-empty';p.textContent='Sin webs todavía. Genera o importa un proyecto.';root.append(p)}
    for(const row of visible){
      const b=document.createElement('button');b.type='button';b.className='wc-project'+(row.id===state.id?' active':'');
      const icon=document.createElement('span');icon.className='wc-thumb';icon.textContent='▤';
      const text=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');
      title.textContent=row.name;meta.textContent='Versión '+row.version+' · '+String(row.updated_at||'').slice(0,16);
      text.append(title,meta);b.append(icon,text);b.addEventListener('click',()=>{el('wcStudio').classList.remove('wc-show-library');load(row.id)});root.append(b);
    }
  }catch(e){status('Error en biblioteca: '+e.message,true)}
}

function drawSections(){
 const list=el('wcSections');list.replaceChildren();
 const nodes=state.doc?[...state.doc.querySelectorAll('header, main > section, section, footer')]:[];
 const unique=[...new Set(nodes)].slice(0,32);
 el('wcSectionsCount').textContent=String(unique.length);
 if(!unique.length){const p=document.createElement('p');p.className='wc-hint';p.textContent='Abre un proyecto para navegar por sus secciones.';list.append(p);return}
 for(const [i,node] of unique.entries()){
   const btn=document.createElement('button');btn.type='button';btn.className='wc-section-link';
   const no=document.createElement('span');no.className='wc-section-ordinal';no.textContent=String(i+1).padStart(2,'0');
   const name=document.createElement('span');const label=node.getAttribute('data-wc-section')||node.getAttribute('aria-label')||node.id||node.querySelector('h1,h2,h3')?.textContent?.trim()||node.tagName.toLowerCase();
   name.textContent=label.slice(0,35);btn.append(no,name);
   btn.addEventListener('click',()=>{
     if(state.code)return status('Sal de Código para navegar por secciones.',true);
     const changed=state.mode!=='edit';state.mode='edit';
     if(changed)render();
     const index=[...state.doc.querySelectorAll(selector)].indexOf(node);
     if(index>=0)selectIndex(index);
     const navigate=()=>{try{el('wcFrame').contentWindow.postMessage({wcNavigateTo:index},'*')}catch{}};
     if(changed)el('wcFrame').addEventListener('load',navigate,{once:true});
     else navigate();
   });
   list.append(btn);
 }
}
function bridge(){
  'use strict';
  let current=null;
  const nodes=()=>document.querySelectorAll('[data-wc-index]');
  const outline=document.createElement('div'),chip=document.createElement('div');
  outline.setAttribute('aria-hidden','true');
  outline.style.cssText='position:fixed;display:none;z-index:2147483646;pointer-events:none;border:3px solid #2664ff;border-radius:6px;box-shadow:0 0 0 3px #2664ff35;box-sizing:border-box';
  chip.style.cssText='position:fixed;display:none;pointer-events:none;z-index:2147483647;background:#244eee;color:white;border-radius:5px;padding:4px 8px;font:700 11px/1.3 system-ui,sans-serif;box-shadow:0 3px 10px #0005';
  document.documentElement.append(outline,chip);
  let label='Elemento';
  const reposition=()=>{
    if(!current||!current.isConnected){outline.style.display='none';chip.style.display='none';return}
    const r=current.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth){outline.style.display='none';chip.style.display='none';return}
    outline.style.display='block';outline.style.left=Math.max(0,r.left)+'px';outline.style.top=Math.max(0,r.top)+'px';
    outline.style.width=Math.max(6,Math.min(innerWidth,r.right)-Math.max(0,r.left))+'px';
    outline.style.height=Math.max(6,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))+'px';
    chip.textContent=label;chip.style.display='block';chip.style.left=Math.max(0,Math.min(innerWidth-170,r.left))+'px';
    chip.style.top=Math.max(0,r.top-24)+'px';
   };
   addEventListener('scroll',reposition,true);
   addEventListener('resize',reposition);

  const emit=(type,node,extra={})=>parent.postMessage({webCreatorCanvas:true,type,index:Number(node.getAttribute('data-wc-index')),...extra},'*');
  document.addEventListener('click',event=>{
    const clickable=event.target.closest('a,button,[role="button"]');
    const target=!event.altKey&&clickable?.hasAttribute('data-wc-index')?clickable:event.target.closest('[data-wc-index]');
    if(!target)return;event.preventDefault();event.stopImmediatePropagation();emit('select',target);
  },true);
  document.addEventListener('submit',event=>event.preventDefault(),true);
  document.addEventListener('dblclick',event=>{
    const target=event.target.closest('[data-wc-index]');
    if(!target||target.children.length||target.tagName==='IMG')return;
    event.preventDefault();event.stopImmediatePropagation();
    const original=target.textContent;
    target.contentEditable='true';target.focus();
    target.addEventListener('blur',()=>{
      target.removeAttribute('contenteditable');
      if(target.textContent!==original)emit('text',target,{value:target.textContent.slice(0,9000)});
    },{once:true});
  },true);
  addEventListener('message',e=>{
    if(Number.isInteger(e.data?.wcNavigateTo)&&e.data.wcNavigateTo>=0)nodes()[e.data.wcNavigateTo]?.scrollIntoView({block:'start',behavior:'smooth'});
    if(e.data?.wcHighlight===true){
      if(current)current.removeAttribute('data-wc-selected');
      current=nodes()[e.data.index]||null;
      if(current)current.setAttribute('data-wc-selected','');
      label=String(e.data.label||'Elemento').slice(0,52);reposition();
    }
  });
}
function canvasHtml(){
  if(!state.doc)return '';
  const clone=state.doc.cloneNode(true);
  clone.querySelectorAll('img[src^="/api/media/file/"]').forEach(img=>{
    const uri=window.WebCreatorMedia?.previewURL(img.getAttribute('src'));
    if(uri)img.setAttribute('src',uri);
  });
  if(state.mode==='preview')return serialize(clone);
  clone.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv="refresh"]').forEach(node=>node.remove());
  for(const node of clone.querySelectorAll('*')){
    for(const a of [...node.attributes])if(/^on/i.test(a.name)||a.name==='srcdoc')node.removeAttribute(a.name);
    node.removeAttribute('contenteditable');
  }

  clone.querySelectorAll(selector).forEach((node,index)=>node.setAttribute('data-wc-index',String(index)));
  const style=clone.createElement('style');
  style.textContent='[data-wc-index]:hover{outline:2px dashed #3061ef!important;outline-offset:2px!important;cursor:crosshair!important}[data-wc-selected]{outline:3px solid #2553ef!important;outline-offset:3px!important}[contenteditable="true"]{outline:2px solid #16a66c!important}';
  clone.head.append(style);
  const script=clone.createElement('script');script.textContent='('+bridge.toString()+')()';clone.body.append(script);
  return '<!DOCTYPE html>\n'+clone.documentElement.outerHTML;
}
function setControls(){
  for(const [id,mode] of [['wcEditMode','edit'],['wcPreviewMode','preview']])el(id).setAttribute('aria-pressed',String(!state.code&&state.mode===mode));
  el('wcCodeMode').setAttribute('aria-pressed',String(state.code));
  for(const [id,value] of [['wcDesktop','desktop'],['wcTablet','tablet'],['wcMobile','mobile']])el(id).setAttribute('aria-pressed',String(device===value));
  el('wcViewportInfo').textContent=({'desktop':'DESKTOP · 100%','tablet':'TABLET · 768 PX','mobile':'MÓVIL · 390 PX'})[device];
}
function render(){
  setControls();drawSections();
  const frame=el('wcFrame'),source=el('wcSourceCode'),blank=el('wcBlank');
  if(!state.doc){frame.classList.add('wc-hidden');source.classList.add('wc-hidden');blank.classList.remove('wc-hidden');return}
  blank.classList.add('wc-hidden');
  if(state.code){frame.classList.add('wc-hidden');source.classList.remove('wc-hidden');return}
  source.classList.add('wc-hidden');frame.classList.remove('wc-hidden');
  const last=state.objectUrl;
  state.objectUrl=URL.createObjectURL(new Blob([canvasHtml()],{type:'text/html;charset=utf-8'}));
  frame.src=state.objectUrl;
  frame.addEventListener('load',()=>{if(last)URL.revokeObjectURL(last);highlight()},{once:true});
  el('wcEditMode').classList.toggle('wc-primary',state.mode==='edit');
  el('wcPreviewMode').classList.toggle('wc-primary',state.mode==='preview');
  status(state.mode==='edit'?'Edición: scripts de la web desactivados dentro del Canvas.':'Vista real aislada: se ejecutan los scripts de la página.');
}
function highlight(){try{el('wcFrame').contentWindow.postMessage({wcHighlight:true,index:state.selected,label:window.WebCreatorStudioTools?.label(currentNode())||currentNode()?.tagName||'Elemento'},'*')}catch{}}
function selectIndex(index){
  const nodes=state.doc?.querySelectorAll(selector);
  if(!nodes||!Number.isInteger(index)||index<0||index>=nodes.length)return;
  state.selected=index;const node=nodes[index];
  setInspector('design');
  el('wcTag').textContent=node.tagName.toLowerCase()+(node.id?' #'+node.id:'');
  el('wcElementName').textContent=(node.textContent||node.getAttribute('alt')||node.getAttribute('aria-label')||'Elemento visual').trim().slice(0,75)||'Elemento sin texto';
  el('wcImageEmpty').classList.toggle('wc-hidden',node.tagName==='IMG');
  el('wcLinkEmpty').classList.toggle('wc-hidden',node.tagName==='A');
  if(node.tagName==='IMG')el('wcImageGroup').open=true;
  if(node.tagName==='A')el('wcLinkGroup').open=true;
  const font=node.style.fontFamily.split(',')[0].replace(/["']/g,'').trim();
  window.WebCreatorFontLibrary?.hydrate(state.doc);
  window.WebCreatorFontLibrary?.ensureOption(font);
  el('wcFontFamily').value=(FONT_FAMILIES.has(font)||window.WebCreatorFontLibrary?.has(font))?font:'';
  window.WebCreatorFontLibrary?.refresh();
  el('wcFontWeight').value=['400','500','600','700','800','900'].includes(node.style.fontWeight)?node.style.fontWeight:'';
  el('wcLineHeight').value=/^(?:\d+(?:\.\d+)?)$/.test(node.style.lineHeight)?node.style.lineHeight:'';
  el('wcLetterSpacing').value=/^-?\d+(?:\.\d+)?px$/.test(node.style.letterSpacing)?parseFloat(node.style.letterSpacing):'';

  const simple=node.children.length===0&&node.tagName!=='IMG';
  el('wcTextWrap').classList.toggle('wc-hidden',!simple);el('wcApplyText').classList.toggle('wc-hidden',!simple);
  el('wcText').value=simple?node.textContent:'';
  el('wcFont').value=parseInt(node.style.fontSize,10)||'';
  el('wcAlign').value=node.style.textAlign||'';
  const color=(v,d)=>/^#[\da-f]{6}$/i.test(v||'')?v:d;
  el('wcColor').value=color(node.style.color,'#111111');el('wcBackground').value=color(node.style.backgroundColor,'#ffffff');
  el('wcColor').dataset.touched='false';el('wcBackground').dataset.touched='false';
  const img=node.tagName==='IMG',link=node.tagName==='A';
  for(const id of ['wcSrcWrap','wcAltWrap','wcApplyImage','wcMediaPick','wcFitWrap','wcPositionWrap','wcWidthWrap','wcImageStyle'])el(id).classList.toggle('wc-hidden',!img);
  el('wcFit').value=img?(node.style.objectFit||''):'';
  el('wcPosition').value=img?(node.style.objectPosition||''):'';
  el('wcWidth').value=img?(parseInt(node.style.maxWidth,10)||''):'';
  for(const id of ['wcHrefWrap','wcApplyLink'])el(id).classList.toggle('wc-hidden',!link);
  el('wcSrc').value=img?node.getAttribute('src')||'':'';el('wcAlt').value=img?node.getAttribute('alt')||'':'';
  el('wcHref').value=link?node.getAttribute('href')||'':'';
  highlight();
  window.WebCreatorStudioTools?.onSelect(node);
}
addEventListener('message',e=>{
  if(e.source!==el('wcFrame').contentWindow||e.data?.webCreatorCanvas!==true||state.mode!=='edit')return;
  const idx=e.data.index;
  if(!Number.isInteger(idx)||idx<0||idx>=(state.doc?.querySelectorAll(selector).length||0))return;
  if(e.data.type==='select')selectIndex(idx);
  if(e.data.type==='text'&&typeof e.data.value==='string'&&e.data.value.length<=9000){
    selectIndex(idx);const node=currentNode();
    if(node&&node.children.length===0)update(()=>{node.textContent=e.data.value},'Texto modificado en Canvas.');
  }
});
function check(){if(state.id&&state.doc)return true;status('Abre un proyecto primero.',true);return false}
async function load(id){
  if(state.saving)return status('Hay un guardado en curso. Abre otra web cuando termine.',true);
  if((state.dirty||hasRawCodeChanges())&&!confirm('Hay cambios sin guardar. ¿Descartarlos y abrir otra web?'))return;
  const ticket=++state.loadSeq;
  try{
    const data=await api('/api/projects/'+id);
    if(ticket!==state.loadSeq||state.saving)return;
    state.id=data.id;state.name=data.name;state.version=data.version;
    state.doc=parse(data.html);window.WebCreatorFontLibrary?.hydrate(state.doc);state.saved=serialize(state.doc);state.selected=-1;state.undo=[];state.redo=[];state.mode='edit';state.code=false;
    sync();render();window.WebCreatorMedia?.warmPreview(serialize(state.doc),()=>{if(state.id===data.id&&!state.code)render()});await list();
    if(ticket!==state.loadSeq)return;
    el('wcVersions').replaceChildren();el('wcTag').textContent='Sin selección';el('wcElementName').textContent='Selecciona algo en el lienzo.';
    window.WebCreatorStudioTools?.onOpen();
    status('Abierto '+state.name+'. Puedes guardar nuevas versiones cuando quieras.');
  }catch(e){if(ticket===state.loadSeq)status('No se pudo abrir: '+e.message,true)}
}
function applyCode(){
  if(!state.code)return true;
  const html=el('wcSourceCode').value;
  if(html.length>300000||!/<html\b/i.test(html)||!/<\/html\s*>\s*$/i.test(html)){
    status('El código debe ser HTML completo (máximo 300.000 caracteres).',true);return false;
  }
  if(html!==serialize(state.doc)){remember();state.doc=parse(html);state.selected=-1;el('wcSourceCode').value=serialize(state.doc);sync()}
  return true;
}
async function save(label='Edición en Studio'){
  if(state.saving)return status('El proyecto ya se está guardando.');
  if(!check()||!applyCode())return;
  if(!state.dirty)return status('No hay cambios pendientes.');
  const projectId=state.id,expectedVersion=state.version,html=serialize(state.doc);
  state.saving=true;state.loadSeq++;sync();
  try{
    const row=await mutate('/api/projects/'+projectId,'PATCH',{html,expectedVersion,label});
    if(state.id!==projectId)return;
    state.version=row.version;state.saved=html;
    if(serialize(state.doc)===html){state.undo=[];state.redo=[]}
    sync();await list();
    status('✓ Guardada versión '+state.version+(!state.dirty&&!hasRawCodeChanges()?'.':' (hay cambios posteriores sin guardar).'));
  }catch(e){status('No se pudo guardar: '+e.message,true)}
  finally{state.saving=false;sync()}
}
async function open(id=''){
  el('wcStudio').classList.add('open');el('wcStudio').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  await list();
  if(id)await load(id);
  else if(!state.doc&&state.projects.length)await load(state.projects[0].id);
  else if(state.doc)render();
}
function close(){
  if(state.saving)return status('Espera a que termine el guardado antes de cerrar.',true);
  if(state.dirty||hasRawCodeChanges()){
    if(!confirm('Cambios sin guardar. ¿Cerrar Studio y descartarlos?'))return;
    state.doc=parse(state.saved);state.undo=[];state.redo=[];state.selected=-1;state.code=false;sync();
  }
  state.loadSeq++;
  el('wcStudio').classList.remove('open');el('wcStudio').setAttribute('aria-hidden','true');document.body.style.overflow='';
  if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=''}
}
el('wcOpen')?.addEventListener('click',()=>open());
el('wcOpenResult')?.addEventListener('click',()=>dispatchEvent(new Event('wc-studio-current-request')));
el('wcClose').addEventListener('click',close);
el('wcReload').addEventListener('click',list);
el('wcProjectSearch').addEventListener('input',list);
el('wcLibraryMobile').addEventListener('click',()=>{
 const shown=el('wcStudio').classList.toggle('wc-show-library');
 el('wcLibraryMobile').setAttribute('aria-expanded',String(shown));
});
el('wcLibraryCollapse').addEventListener('click',()=>{
 const collapsed=el('wcStudio').classList.toggle('wc-library-collapsed');
 el('wcLibraryCollapse').setAttribute('aria-expanded',String(!collapsed));
 el('wcLibraryCollapse').setAttribute('aria-label',collapsed?'Expandir biblioteca':'Contraer biblioteca');
 el('wcLibraryCollapse').textContent=collapsed?'⇥':'⇤';
});
function setInspector(which){
 el('wcInspectorDesign').classList.toggle('wc-hidden',which!=='design');
 el('wcInspectorProject').classList.toggle('wc-hidden',which!=='project');
 el('wcTabDesign').setAttribute('aria-pressed',String(which==='design'));
 el('wcTabProject').setAttribute('aria-pressed',String(which==='project'));
}
el('wcTabDesign').addEventListener('click',()=>setInspector('design'));
el('wcTabProject').addEventListener('click',()=>setInspector('project'));
el('wcStudio').addEventListener('keydown',e=>{
 if(!el('wcStudio').classList.contains('open'))return;
 const ctrl=e.ctrlKey||e.metaKey;
 if(!ctrl||e.altKey)return;
 if(e.key.toLowerCase()==='s'){e.preventDefault();save('Guardado desde el teclado');return}
 if(['input','textarea','select'].includes(e.target.tagName.toLowerCase())||e.target.isContentEditable)return;
 if(e.key.toLowerCase()==='z'){e.preventDefault();el(e.shiftKey?'wcRedo':'wcUndo').click()}
 if(e.key.toLowerCase()==='y'){e.preventDefault();el('wcRedo').click()}
});
el('wcUndo').addEventListener('click',()=>{if(!check()||!state.undo.length||!applyCode())return;state.redo.push(serialize(state.doc));state.doc=parse(state.undo.pop());state.selected=-1;if(state.code)el('wcSourceCode').value=serialize(state.doc);sync();render()});
el('wcRedo').addEventListener('click',()=>{if(!check()||!state.redo.length||!applyCode())return;state.undo.push(serialize(state.doc));state.doc=parse(state.redo.pop());state.selected=-1;if(state.code)el('wcSourceCode').value=serialize(state.doc);sync();render()});
el('wcSave').addEventListener('click',()=>save());
el('wcEditMode').addEventListener('click',()=>{if(!check()||!applyCode())return;state.mode='edit';state.code=false;render()});
el('wcPreviewMode').addEventListener('click',()=>{if(!check()||!applyCode())return;state.mode='preview';state.code=false;render()});
el('wcCodeMode').addEventListener('click',()=>{if(!check())return;if(state.code&&!applyCode())return;state.code=!state.code;if(state.code)el('wcSourceCode').value=serialize(state.doc);sync();render()});
el('wcSourceCode').addEventListener('input',sync);
function setDevice(value){
 device=value;
 el('wcFrame').classList.remove('mobile','tablet');
 if(value!=='desktop')el('wcFrame').classList.add(value);
 setControls();
}
el('wcDesktop').addEventListener('click',()=>setDevice('desktop'));
el('wcTablet').addEventListener('click',()=>setDevice('tablet'));
el('wcMobile').addEventListener('click',()=>setDevice('mobile'));
el('wcApplyText').addEventListener('click',()=>{const node=currentNode();if(node&&!node.children.length)update(()=>{node.textContent=el('wcText').value},'Texto actualizado.')});
for(const id of ['wcColor','wcBackground'])el(id).addEventListener('input',()=>{el(id).dataset.touched='true'});
function applyStyles(){
 const node=currentNode();if(!node)return status('Selecciona un elemento del lienzo primero.',true);
 update(()=>{
  if(el('wcColor').dataset.touched==='true')node.style.color=el('wcColor').value;
  if(el('wcBackground').dataset.touched==='true')node.style.backgroundColor=el('wcBackground').value;
  const px=Number(el('wcFont').value);
  if(px>=8&&px<=160)node.style.fontSize=px+'px';
  if(el('wcAlign').value)node.style.textAlign=el('wcAlign').value;
  const weight=el('wcFontWeight').value;
  const family=el('wcFontFamily').value;
  if(FONT_FAMILIES.has(family)||window.WebCreatorFontLibrary?.has(family)){
   const meta=window.WebCreatorFontLibrary?.get(family);
   const previousFont=node.style.fontFamily;
   node.style.fontFamily=SYSTEM_FAMILIES.has(family)?family:'"'+family+'",sans-serif';
   if(meta?.source==='uploaded'){
    if(!window.WebCreatorFontLibrary.embed(state.doc,family))node.style.fontFamily=previousFont;
   }else if(!SYSTEM_FAMILIES.has(family)&&meta?.source!=='local'&&meta?.source!=='system'){
    let link=[...state.doc.querySelectorAll('link[data-wc-font]')].find(x=>x.getAttribute('data-wc-font')===family&&x.getAttribute('data-wc-font-weight')===(weight||'400'));
    if(!link){
     link=state.doc.createElement('link');link.rel='stylesheet';
     link.setAttribute('data-wc-font',family);
     link.setAttribute('data-wc-font-weight',weight||'400');
     link.href=window.WebCreatorFontLibrary?.href(family,weight)||fontHref(family);state.doc.head.append(link);
    }
   }
  }
  if(['400','500','600','700','800','900'].includes(weight))node.style.fontWeight=weight;
  const line=Number(el('wcLineHeight').value);
  if(el('wcLineHeight').value!==''&&line>=.8&&line<=3)node.style.lineHeight=String(line);
  const tracking=Number(el('wcLetterSpacing').value);
  if(el('wcLetterSpacing').value!==''&&tracking>=-8&&tracking<=15)node.style.letterSpacing=tracking+'px';
 },'Propiedades del elemento actualizadas.');
}
el('wcApplyStyle').addEventListener('click',applyStyles);
el('wcApplyAppearance').addEventListener('click',applyStyles);
el('wcApplyImage').addEventListener('click',()=>{
  const node=currentNode();if(node?.tagName!=='IMG')return;
  const src=el('wcSrc').value.trim();
  if(src.length>500000||!/^(https?:\/\/|\/(?!\/)|\.\/|\.\.\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(src))return status('URL de imagen inválida o demasiado larga.',true);
  update(()=>{node.setAttribute('src',src);node.setAttribute('alt',el('wcAlt').value.slice(0,200))},'Imagen sustituida.');
});
el('wcMediaPick').addEventListener('click',()=>window.WebCreatorMedia?.open());
el('wcImageStyle').addEventListener('click',()=>{
  const node=currentNode();if(node?.tagName!=='IMG')return;
  update(()=>{
    if(el('wcFit').value)node.style.objectFit=el('wcFit').value;
    if(el('wcPosition').value)node.style.objectPosition=el('wcPosition').value;
    const width=Number(el('wcWidth').value);
    if(width>=40&&width<=2400){node.style.maxWidth=width+'px';node.style.width='100%'}
  },'Encuadre de imagen actualizado.');
});
el('wcApplyLink').addEventListener('click',()=>{
  const node=currentNode();if(node?.tagName!=='A')return;
  const href=el('wcHref').value.trim();
  if(!/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:|\.\/|\.\.\/)/i.test(href))return status('Enlace inválido.',true);
  update(()=>node.setAttribute('href',href),'Enlace actualizado.');
});
el('wcRename').addEventListener('click',async()=>{
  if(!check())return;const name=prompt('Nombre del proyecto:',state.name);if(!name?.trim())return;
  try{await mutate('/api/projects/'+state.id+'/name','PATCH',{name});state.name=name.trim();sync();await list();status('Proyecto renombrado.')}catch(e){status(e.message,true)}
});
el('wcAudit').addEventListener('click',async()=>{
  if(!check())return;
  if(state.dirty){status('Guarda primero los cambios para auditar esa versión.',true);return}
  const report=el('wcAuditResult');report.replaceChildren();
  const title=document.createElement('strong');
  title.textContent='Comprobando estructura y accesibilidad básica…';
  report.append(title);
  try{
    const result=await api('/api/projects/'+state.id+'/quality');
    report.replaceChildren();
    const h=document.createElement('strong');
    h.textContent=result.issues.length?'Revisión requerida · '+result.issues.length+' aviso(s)':'Sin incidencias en las comprobaciones estáticas';
    report.append(h);
    if(result.issues.length){
      for(const warning of result.issues){
        const item=document.createElement('p');
        item.className='wc-hint';
        item.textContent='• '+warning;
        report.append(item);
      }
    }
    const note=document.createElement('p');note.className='wc-hint';
    note.textContent='Auditoría estática, no pruebas visuales o de navegador.';
    report.append(note);
    status(result.issues.length?'Informe de calidad generado sin IA. Revisa los avisos.':'Auditoría estática completada sin avisos; aún falta prueba en navegador.');
  }catch(e){report.replaceChildren();status('No se pudo auditar: '+e.message,true)}
});
el('wcHistory').addEventListener('click',async()=>{
  if(!check())return;
  try{
    const root=el('wcVersions');root.replaceChildren();
    const data=await api('/api/projects/'+state.id+'/versions');
    for(const v of data.versions){
      const row=document.createElement('div');row.className='wc-version';
      const label=document.createElement('span');label.textContent='v'+v.version+' · '+v.label;
      const btn=document.createElement('button');btn.textContent='Restaurar';btn.disabled=state.version===v.version;
      btn.addEventListener('click',async()=>{
        if(state.dirty&&!confirm('Descartar los cambios pendientes?'))return;
        if(!confirm('Restaurar versión '+v.version+' como una NUEVA versión?'))return;
        try{
          const old=await api('/api/projects/'+state.id+'/versions/'+v.version);
          const out=await mutate('/api/projects/'+state.id,'PATCH',{html:old.html,expectedVersion:state.version,label:'Restaurada v'+v.version});
          await load(state.id);status('Restaurada v'+v.version+' como versión '+out.version+'.');
        }catch(e){status(e.message,true)}
      });
      row.append(label,btn);root.append(row);
    }
  }catch(e){status('No se pudo leer el historial: '+e.message,true)}
});
el('wcArchive').addEventListener('click',async()=>{
  if(!check()||!confirm('Archivar este proyecto? Sus versiones no se borrarán.'))return;
  try{await api('/api/projects/'+state.id,{method:'DELETE'});state.id='';state.doc=null;state.name='';state.version=0;state.saved='';state.dirty=false;state.undo=[];state.redo=[];sync();render();await list();status('Proyecto archivado.')}
  catch(e){status(e.message,true)}
});
el('wcDownload').addEventListener('click',async()=>{
  if(!check()||!applyCode())return;
  try{const html=await (window.WebCreatorMedia?.portableHTML(serialize(state.doc))||serialize(state.doc));download(html,filename(state.name)+'.html')}
  catch(e){status('No se pudo preparar la exportación con imágenes: '+e.message,true)}
});
el('wcZip').addEventListener('click',async()=>{
  if(!check()||!applyCode())return;
  if(typeof window.webcreatorStudioMakeZip!=='function')return status('Exportador ZIP no disponible. Descarga el HTML.',true);
  try{
    const html=await (window.WebCreatorMedia?.portableHTML(serialize(state.doc))||serialize(state.doc));
    download(window.webcreatorStudioMakeZip(html),filename(state.name)+'.zip','application/zip');
  }catch(e){status('Error ZIP: '+e.message,true)}
});
el('wcImport').addEventListener('click',()=>el('wcFile').click());
el('wcFile').addEventListener('change',async()=>{
  const file=el('wcFile').files?.[0];if(!file)return;
  try{
    if(file.size>390000)throw Error('Archivo demasiado grande.');
    const html=await file.text();
    const res=await mutate('/api/projects','POST',{html,name:file.name.replace(/\.html?$/i,'')});
    await open(res.id);status('Web importada. Puedes editarla y guardar versiones.');
  }catch(e){status('Importación fallida: '+e.message,true)}
  el('wcFile').value='';
});
addEventListener('wc-studio-current-html',async event=>{
  const html=event.detail?.html,id=event.detail?.projectId;
  if(typeof html!=='string')return;
  try{
    if(id){await open(id);return}
    const newEntry=await mutate('/api/projects','POST',{html,name:'Web generada · '+new Date().toLocaleDateString('es-ES')});
    await open(newEntry.id);
  }catch(e){await open();status('No se pudo importar resultado: '+e.message,true)}
});
addEventListener('beforeunload',event=>{if(state.dirty&&el('wcStudio').classList.contains('open')){event.preventDefault();event.returnValue=''}});
window.WebCreatorStudio={
  open,refresh:list,
  getDocument:()=>state.doc,
  getSelection:()=>currentNode(),
  getSelectedIndex:()=>state.selected,
  change:(fn,message)=>{if(!check()||state.code)return false;update(fn,message);return true},
  selectNode:(node)=>{const index=state.doc?[...state.doc.querySelectorAll(selector)].indexOf(node):-1;if(index<0)return false;selectIndex(index);return true},
  hasProject:()=>Boolean(state.doc&&state.id),
  applyAsset:(src,label='Imagen')=>{
    if(!check()||typeof src!=='string'||!/^\/api\/media\/file\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(src))
      return false;
    const node=currentNode();
    if(node?.tagName==='IMG'){
      update(()=>{node.setAttribute('src',src);node.setAttribute('alt',label.slice(0,180))},'Imagen cambiada desde la biblioteca.');
    }else{
      const target=node?.closest('section,article,main,header,footer')||state.doc.querySelector('main')||state.doc.body;
      update(()=>{
        const img=state.doc.createElement('img');
        img.src=src;img.alt=label.slice(0,180);img.loading='lazy';
        img.style.cssText='display:block;width:100%;max-width:100%;height:auto;object-fit:cover';
        target.append(img);
      },'Imagen añadida a la sección del Canvas.');
    }
    return true;
  }
};
sync();
})();
