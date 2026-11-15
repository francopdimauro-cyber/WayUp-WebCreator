(function initWayupButtonStudio(){
'use strict';
const studio=window.WebCreatorStudio,oldTools=window.WebCreatorStudioTools,el=id=>document.getElementById(id);
if(!studio?.change||!studio.getSelection||!oldTools?.onSelect||!el('wcElementsGroup'))return;
const presets=[
{id:'cobalt',name:'Cobalto',group:'Modernos',bg:'#2459f5',fg:'#ffffff',border:'#2459f5',radius:12,shadow:'soft',weight:750},
{id:'midnight',name:'Medianoche',group:'Modernos',bg:'#101b35',fg:'#ffffff',border:'#101b35',radius:10,shadow:'medium',weight:750},
{id:'ocean',name:'Degradado Ocean',group:'Modernos',bg:'linear-gradient(125deg,#1b53f6 0%,#1ba6da 100%)',fg:'#ffffff',border:'transparent',radius:13,shadow:'medium',weight:750},
{id:'aurora',name:'Aurora',group:'Modernos',bg:'linear-gradient(120deg,#15d1ae 0%,#2376dc 95%)',fg:'#081e39',border:'transparent',radius:14,shadow:'soft',weight:800},
{id:'softblue',name:'Azul suave',group:'Modernos',bg:'#eaf1ff',fg:'#2343a4',border:'#c6d5ff',radius:12,shadow:'none',weight:700},
{id:'outline',name:'Contorno oscuro',group:'Minimalistas',bg:'transparent',fg:'#182336',border:'#182336',radius:10,shadow:'none',weight:750},
{id:'outlineblue',name:'Contorno azul',group:'Minimalistas',bg:'transparent',fg:'#2459f5',border:'#2459f5',radius:12,shadow:'none',weight:750},
{id:'ghost',name:'Invisible / Ghost',group:'Minimalistas',bg:'transparent',fg:'#182336',border:'transparent',radius:8,shadow:'none',weight:750},
{id:'underline',name:'Texto subrayado',group:'Minimalistas',bg:'transparent',fg:'#2459f5',border:'transparent',radius:0,shadow:'none',weight:750,underline:true},
{id:'pill',name:'Píldora',group:'Minimalistas',bg:'#2459f5',fg:'#ffffff',border:'#2459f5',radius:999,shadow:'soft',weight:750},
{id:'luxury',name:'Lujo dorado',group:'Elegantes',bg:'#171a23',fg:'#efce87',border:'#b08a43',radius:3,shadow:'medium',weight:700,tracking:1.1},
{id:'ivory',name:'Marfil',group:'Elegantes',bg:'#fff7e8',fg:'#3e3025',border:'#dbcab1',radius:5,shadow:'soft',weight:700},
{id:'editorial',name:'Editorial',group:'Elegantes',bg:'#1d1c21',fg:'#ffffff',border:'#1d1c21',radius:0,shadow:'none',weight:700,tracking:1.4},
{id:'glass',name:'Cristal',group:'Elegantes',bg:'rgba(255,255,255,.85)',fg:'#17223c',border:'#b9c6db',radius:16,shadow:'medium',weight:700,backdrop:true},
{id:'coral',name:'Coral',group:'Llamativos',bg:'#ff506c',fg:'#ffffff',border:'#ff506c',radius:14,shadow:'medium',weight:800},
{id:'sunflower',name:'Solar',group:'Llamativos',bg:'#ffda45',fg:'#162035',border:'#ffda45',radius:16,shadow:'soft',weight:850},
{id:'neon',name:'Neón',group:'Llamativos',bg:'#0b1230',fg:'#5df4dc',border:'#24ccb6',radius:12,shadow:'glow',weight:800},
{id:'brutalist',name:'Brutalista',group:'Llamativos',bg:'#fdd84a',fg:'#0e1424',border:'#0e1424',radius:0,shadow:'hard',weight:850,tracking:.6},
{id:'whatsapp',name:'WhatsApp',group:'Social',bg:'#25d366',fg:'#073d20',border:'#25d366',radius:999,shadow:'soft',weight:800},
{id:'call',name:'Contacto directo',group:'Social',bg:'#134e6f',fg:'#ffffff',border:'#134e6f',radius:999,shadow:'medium',weight:800},
{id:'white',name:'Blanco limpio',group:'Social',bg:'#ffffff',fg:'#182336',border:'#dce1ea',radius:12,shadow:'medium',weight:750}
];
const shadows={none:'none',soft:'0 5px 14px rgba(12,34,76,.14)',medium:'0 10px 24px rgba(12,34,76,.24)',glow:'0 0 20px rgba(37,205,195,.5)',hard:'5px 5px 0 #111827'};
const categories=['Todos','Modernos','Minimalistas','Elegantes','Llamativos','Social'];
const iconOptions=[['','Sin icono adicional'],['→','Flecha →'],['↗','Flecha externa ↗'],['✓','Check ✓'],['✦','Destacado ✦'],['☎','Teléfono ☎'],['✉','Correo ✉'],['★','Estrella ★'],['▶','Play ▶']];
let category='Todos',query='',lastSelected=null;
const group=document.createElement('details');group.id='wcButtonStylesGroup';group.className='wc-property-group wc-button-studio-group wc-hidden';
group.innerHTML=`<summary><span>✦</span> Biblioteca de botones <b aria-hidden="true">⌄</b></summary>
<div class="wc-property-body wc-button-studio-body">
 <p class="wc-button-studio-desc">Elige un diseño y aplícalo al botón seleccionado. Su enlace, posición e iconos originales se conservarán.</p>
 <div class="wc-button-gallery-tools"><input type="search" id="wcButtonSearch" placeholder="Buscar estilos…" aria-label="Buscar diseños de botones" autocomplete="off">
 <span id="wcButtonCount"></span></div>
 <div id="wcButtonFilters" class="wc-button-gallery-filters" role="group" aria-label="Tipos de botones"></div>
 <div id="wcButtonGallery" class="wc-button-gallery" role="group" aria-label="Diseños disponibles"></div>
 <div class="wc-button-current"><span id="wcButtonCurrent">Estilo original</span><button id="wcButtonRestore" type="button">↶ Restaurar original</button></div>
 <details class="wc-button-customize" open><summary>Ajustes personalizados</summary><div class="wc-button-custom-inner">
  <label>Texto del botón<input id="wcBtnText" maxlength="170" placeholder="Texto visible"></label>
  <p class="wc-button-help" id="wcButtonTextHint">No se eliminan los iconos originales al editar el texto.</p>
  <div class="wc-button-swatch-row">
   <label>Fondo<input id="wcBtnBg" type="color" value="#2459f5"></label>
   <label>Texto<input id="wcBtnFg" type="color" value="#ffffff"></label>
   <label>Borde<input id="wcBtnBorder" type="color" value="#2459f5"></label>
  </div>
  <div class="wc-field-two">
   <label>Radio <span>px</span><input id="wcBtnRadius" type="number" min="0" max="999" value="12"></label>
   <label>Tamaño <span>px</span><input id="wcBtnFont" type="number" min="10" max="40" value="15"></label>
  </div>
  <div class="wc-field-two">
   <label>Alto: relleno <span>px</span><input id="wcBtnPadY" type="number" min="0" max="60" value="12"></label>
   <label>Laterales <span>px</span><input id="wcBtnPadX" type="number" min="0" max="90" value="22"></label>
  </div>
  <div class="wc-field-two">
   <label>Ancho<select id="wcBtnWidth"><option value="auto">Automático</option><option value="full">100 % ancho</option><option value="fixed">Ancho personalizado</option></select></label>
   <label>Ancho px<input id="wcBtnWidthPx" type="number" min="40" max="1200" value="240" disabled></label>
  </div>
  <div class="wc-field-two">
   <label>Sombra<select id="wcBtnShadow"><option value="none">Sin sombra</option><option value="soft">Suave</option><option value="medium">Profunda</option><option value="glow">Resplandor</option><option value="hard">Brutalista</option></select></label>
   <label>Icono añadido<select id="wcBtnIcon"></select></label>
  </div>
  <button id="wcButtonCustomize" type="button" class="wc-property-apply">Aplicar personalización ↗</button>
 </div></details>
 <p class="wc-button-help">Se guarda en tu web y se exporta con ella. Usa «Deshacer» si quieres volver atrás. Las funciones del botón se conservan.</p>
</div>`;
el('wcElementsGroup').insertAdjacentElement('afterend',group);
const filters=el('wcButtonFilters'),gallery=el('wcButtonGallery');
for(const cat of categories){const b=document.createElement('button');b.type='button';b.textContent=cat;b.dataset.category=cat;b.setAttribute('aria-pressed',String(cat===category));filters.append(b)}
for(const [value,name] of iconOptions){const o=document.createElement('option');o.value=value;o.textContent=name;el('wcBtnIcon').append(o)}
const quick=document.createElement('button');quick.id='wcButtonShortcut';quick.type='button';quick.textContent='✦ Diseños de botón';
el('wcSelectedInfo')?.querySelector('.wc-selected-actions')?.append(quick);
function current(){const n=studio.getSelection();return n&&['A','BUTTON'].includes(n.tagName)?n:null}
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||''));
const hexColor=(value,fallback)=>{
 const v=String(value||'').trim();
 if(validColor(v))return v;
 if(/^#[0-9a-f]{3}$/i.test(v))return '#'+[...v.slice(1)].map(c=>c+c).join('');
 const rgb=v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
 if(rgb&&rgb.slice(1).every(x=>Number(x)<=255))return '#'+rgb.slice(1).map(x=>Number(x).toString(16).padStart(2,'0')).join('');
 return fallback;
};
function shadowOf(p){return shadows[p.shadow]||shadows.none}
function setPreview(s,p){
 s.style.cssText='display:inline-flex;align-items:center;justify-content:center;gap:6px;text-align:center;max-width:100%;box-sizing:border-box;min-height:34px;padding:7px 11px;line-height:1.25;font-size:11px;font-weight:'+p.weight+';letter-spacing:'+(p.tracking||0)+'px;border-radius:'+p.radius+'px;border:1.5px solid '+p.border+';color:'+p.fg+';background:'+p.bg+';box-shadow:'+shadowOf(p)+';text-decoration:'+(p.underline?'underline':'none')+';cursor:pointer;white-space:nowrap';
 if(p.backdrop)s.style.backdropFilter='blur(9px)';
}
function renderGallery(){
 const chosen=current()?.getAttribute('data-wc-btn-preset')||'';
 const filtered=presets.filter(p=>(category==='Todos'||p.group===category)&&(!query||(p.name+' '+p.group).toLocaleLowerCase('es').includes(query)));
 gallery.replaceChildren();
 for(const p of filtered){
  const card=document.createElement('button');card.type='button';card.className='wc-button-choice';card.dataset.preset=p.id;
  card.setAttribute('aria-pressed',String(chosen===p.id));card.setAttribute('aria-label','Aplicar botón '+p.name);
  const demo=document.createElement('span');demo.className='wc-button-demo';demo.textContent=p.id==='whatsapp'?'✆ Contactar':p.id==='underline'?'Explorar →':p.id==='neon'?'Activar ✦':'Elegir diseño';setPreview(demo,p);
  const name=document.createElement('span');name.className='wc-button-choice-name';name.textContent=p.name;
  const tag=document.createElement('small');tag.textContent=p.group;
  card.append(demo,name,tag);gallery.append(card);
 }
 el('wcButtonCount').textContent=filtered.length+' diseños';
 if(!filtered.length){const p=document.createElement('p');p.textContent='No hay diseños que coincidan con la búsqueda.';p.className='wc-button-help';gallery.append(p)}
}
function labelFor(n){
 if(!n)return '';
 const parts=[];
 for(const textNode of getTextNodes(n))if(textNode.nodeValue.trim())parts.push(textNode.nodeValue.trim());
 return parts.join(' ').replace(/\s+/g,' ').slice(0,170);
}
function getTextNodes(node){
 const out=[];
 function walk(n){
  for(const child of n.childNodes){
   if(child.nodeType===3&&child.nodeValue?.trim())out.push(child);
   else if(child.nodeType===1){
    const tag=child.tagName.toLowerCase(),cl=typeof child.className==='string'?child.className:'';
    if(child.hasAttribute('data-wc-btn-icon')||['svg','i','script','style'].includes(tag)||/(?:^|[\s-])(?:icon|fa-|lucide|material-icons)/i.test(cl))continue;
    walk(child);
   }
  }
 }
 walk(node);return out;
}
function ensureEffects(doc){
 if(doc.querySelector('style[data-wc-button-effects]'))return;
 const style=doc.createElement('style');style.setAttribute('data-wc-button-effects','');
 style.textContent='[data-wc-btn-preset]:hover{filter:brightness(1.07)}[data-wc-btn-preset]:focus-visible{outline:3px solid currentColor;outline-offset:3px}@media(prefers-reduced-motion:reduce){[data-wc-btn-preset]{transition:none!important}}';
 (doc.head||doc.documentElement).append(style);
}
const prop=(node,key,value)=>{if(value==null||value==='')node.style.removeProperty(key);else node.style.setProperty(key,String(value),'important')};
function stylePreset(node,p){
 if(!node.hasAttribute('data-wc-btn-original-style'))node.setAttribute('data-wc-btn-original-style',node.getAttribute('style')||'');
 node.setAttribute('style',node.getAttribute('data-wc-btn-original-style')||'');
 node.setAttribute('data-wc-btn-preset',p.id);
 prop(node,'display','inline-flex');prop(node,'align-items','center');prop(node,'justify-content','center');prop(node,'gap','8px');
 prop(node,'box-sizing','border-box');prop(node,'min-height','42px');
 prop(node,'background',p.bg);prop(node,'color',p.fg);
 prop(node,'border','1.5px solid '+p.border);prop(node,'border-radius',p.radius+'px');
 prop(node,'padding','12px 22px');prop(node,'text-decoration',p.underline?'underline':'none');
 prop(node,'font-weight',String(p.weight));prop(node,'font-size','15px');prop(node,'line-height','1.3');
 prop(node,'letter-spacing',(p.tracking||0)+'px');prop(node,'box-shadow',shadowOf(p));
 prop(node,'cursor','pointer');prop(node,'transition','filter .18s ease');
 if(p.backdrop)prop(node,'backdrop-filter','blur(9px)');
 ensureEffects(node.ownerDocument);
}
function readSettings(n){
 const p=presets.find(x=>x.id===n.getAttribute('data-wc-btn-preset'));
 const bg=n.style.getPropertyValue('background')||n.style.backgroundColor;
 const border=n.style.borderColor||p?.border;
 el('wcBtnBg').value=hexColor(bg,p&&validColor(p.bg)?p.bg:'#2459f5');
 el('wcBtnFg').value=hexColor(n.style.color,p?.fg||'#ffffff');
 el('wcBtnBorder').value=hexColor(border,p?.border&&validColor(p.border)?p.border:'#2459f5');
 el('wcBtnRadius').value=parseInt(n.style.borderRadius,10)||p?.radius||12;
 el('wcBtnFont').value=parseInt(n.style.fontSize,10)||15;
 const padding=n.style.padding.split(/\s+/);el('wcBtnPadY').value=parseInt(padding[0],10)||12;
 el('wcBtnPadX').value=parseInt(padding[1],10)||22;
 el('wcBtnShadow').value=Object.entries(shadows).find(([,css])=>css===n.style.getPropertyValue('box-shadow'))?.[0]||p?.shadow||'none';
 el('wcBtnWidth').value=n.style.width==='100%'?'full':/^\d+px$/.test(n.style.width)?'fixed':'auto';
 el('wcBtnWidthPx').disabled=el('wcBtnWidth').value!=='fixed';
 el('wcBtnWidthPx').value=parseInt(n.style.width,10)||240;
 el('wcBtnIcon').value=n.querySelector('[data-wc-btn-icon]')?.textContent||'';
 el('wcBtnText').value=labelFor(n);
 for(const id of ['wcBtnBg','wcBtnFg','wcBtnBorder','wcBtnText','wcBtnIcon'])el(id).dataset.touched='false';
 el('wcButtonTextHint').textContent=n.querySelector('svg,i,[class*="icon"]')?'Se conservarán los iconos originales; este control modifica el texto principal.':'El texto se modifica sin cambiar el destino del botón.';
}
function showSelection(node){
 const n=node&&['A','BUTTON'].includes(node.tagName)?node:null;
 quick.hidden=!n;
 group.classList.toggle('wc-hidden',!n);
 if(n&&!group.dataset.seen){group.open=true;group.dataset.seen='1';}
 if(n){
  const p=presets.find(x=>x.id===n.getAttribute('data-wc-btn-preset'));
  el('wcButtonCurrent').textContent=p?'Estilo actual: '+p.name:n.hasAttribute('data-wc-btn-original-style')?'Estilo personalizado':'Estilo original de la web';
  el('wcButtonRestore').disabled=!n.hasAttribute('data-wc-btn-original-style');
  if(lastSelected!==n){readSettings(n);lastSelected=n;}
 }else lastSelected=null;
 renderGallery();
}
function toSelection(node){oldTools.onSelect(node);showSelection(node)}
function onOpen(){oldTools.onOpen();showSelection(null)}
window.WebCreatorStudioTools={...oldTools,onSelect:toSelection,onOpen};
const reveal=()=>{group.open=true;group.scrollIntoView({block:'nearest',behavior:'smooth'})};
quick.addEventListener('click',reveal);
filters.addEventListener('click',e=>{
 const b=e.target.closest('[data-category]');if(!b)return;
 category=b.dataset.category;
 for(const choice of filters.querySelectorAll('[data-category]'))choice.setAttribute('aria-pressed',String(choice===b));
 renderGallery();
});
el('wcButtonSearch').addEventListener('input',v=>{query=el('wcButtonSearch').value.trim().toLocaleLowerCase('es');renderGallery()});
gallery.addEventListener('click',e=>{
 const choice=e.target.closest('[data-preset]');if(!choice)return;
 const n=current(),p=presets.find(x=>x.id===choice.dataset.preset);
 if(!n||!p)return;
 const changed=studio.change(()=>stylePreset(n,p),'Diseño «'+p.name+'» aplicado. Guarda el proyecto.');
 if(changed){studio.selectNode(n);readSettings(n);renderGallery();}
});
el('wcButtonRestore').addEventListener('click',()=>{
 const n=current();if(!n?.hasAttribute('data-wc-btn-original-style'))return;
 const changed=studio.change(()=>{
  n.setAttribute('style',n.getAttribute('data-wc-btn-original-style')||'');
  if(!n.getAttribute('style'))n.removeAttribute('style');
  n.removeAttribute('data-wc-btn-original-style');n.removeAttribute('data-wc-btn-preset');
  n.querySelector('[data-wc-btn-icon]')?.remove();
 },'Estilo original restaurado.');
 if(changed){studio.selectNode(n);readSettings(n);renderGallery();}
});
for(const id of ['wcBtnBg','wcBtnFg','wcBtnBorder','wcBtnText','wcBtnIcon'])el(id).addEventListener('input',()=>{el(id).dataset.touched='true'});
el('wcBtnWidth').addEventListener('change',()=>{el('wcBtnWidthPx').disabled=el('wcBtnWidth').value!=='fixed'});
el('wcButtonCustomize').addEventListener('click',()=>{
 const n=current();if(!n)return;
 const val=id=>Number(el(id).value);
 const radius=val('wcBtnRadius'),font=val('wcBtnFont'),y=val('wcBtnPadY'),x=val('wcBtnPadX'),fixed=val('wcBtnWidthPx');
 if(!Number.isFinite(radius)||radius<0||radius>999||!Number.isFinite(font)||font<10||font>40||
 !Number.isFinite(y)||y<0||y>60||!Number.isFinite(x)||x<0||x>90||
 (el('wcBtnWidth').value==='fixed'&&(!Number.isFinite(fixed)||fixed<40||fixed>1200))){
  el('wcStatus').textContent='Revisa las medidas del botón antes de aplicar.';return;
 }
 const bg=el('wcBtnBg').value,fg=el('wcBtnFg').value,border=el('wcBtnBorder').value,shadow=el('wcBtnShadow').value;
 if(![bg,fg,border].every(validColor)||!Object.hasOwn(shadows,shadow))return;
 const text=el('wcBtnText').value.trim(),icon=el('wcBtnIcon').value;
 if(text.length>170||!iconOptions.some(x=>x[0]===icon))return;
 const changed=studio.change(()=>{
  if(!n.hasAttribute('data-wc-btn-original-style'))n.setAttribute('data-wc-btn-original-style',n.getAttribute('style')||'');
  n.setAttribute('data-wc-btn-preset','custom');
  if(text&&el('wcBtnText').dataset.touched==='true'){
   const nodes=getTextNodes(n);
   if(nodes.length){nodes[0].nodeValue=text;for(let i=1;i<nodes.length;i++)nodes[i].nodeValue='';}
   else{const caption=n.ownerDocument.createElement('span');caption.textContent=text;n.append(caption)}
  }
  if(el('wcBtnIcon').dataset.touched==='true'){
   const previous=n.querySelector('[data-wc-btn-icon]');if(previous)previous.remove();
   if(icon){const badge=n.ownerDocument.createElement('span');badge.setAttribute('data-wc-btn-icon','');badge.setAttribute('aria-hidden','true');badge.textContent=icon;badge.style.cssText='font-size:1em;line-height:1';n.insertBefore(badge,n.firstChild);}
  }
  prop(n,'display','inline-flex');prop(n,'align-items','center');prop(n,'justify-content','center');prop(n,'gap','8px');
  if(el('wcBtnBg').dataset.touched==='true')prop(n,'background',bg);
  if(el('wcBtnFg').dataset.touched==='true')prop(n,'color',fg);
  if(el('wcBtnBorder').dataset.touched==='true')prop(n,'border','1.5px solid '+border);
  prop(n,'border-radius',radius+'px');
  prop(n,'font-size',font+'px');prop(n,'padding',y+'px '+x+'px');prop(n,'box-shadow',shadows[shadow]);
  if(el('wcBtnWidth').value==='full')prop(n,'width','100%');
  else if(el('wcBtnWidth').value==='fixed')prop(n,'width',fixed+'px');
  else n.style.removeProperty('width');
  ensureEffects(n.ownerDocument);
 },'Propiedades del botón guardadas.');
 if(changed){studio.selectNode(n);readSettings(n);el('wcButtonCurrent').textContent='Estilo personalizado';renderGallery();}
});
showSelection(studio.getSelection());
})();
