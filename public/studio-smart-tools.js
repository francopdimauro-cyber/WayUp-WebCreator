(function studioSmartTools(){
'use strict';
const studio=window.WebCreatorStudio,el=id=>document.getElementById(id);
if(!studio?.getSelection||!el('wcInspectorDesign'))return;
const selected=el('wcElementName').closest('.wc-selected-info');selected.id='wcSelectedInfo';
selected.innerHTML=`<span class="wc-overline">ELEMENTO SELECCIONADO</span>
<div class="wc-selected-heading"><span class="wc-selected-icon" id="wcSelectedIcon" aria-hidden="true">◇</span><div><strong id="wcElementName">Selecciona algo en el Canvas</strong><span class="wc-tag" id="wcTag">Ninguno</span></div></div>
<p id="wcElementDetail" class="wc-hint">Clic para editar. Alt + clic selecciona el contenido interno de un botón.</p>
<p id="wcElementPath">Página › Sin selección</p>
<div class="wc-selected-actions"><button type="button" id="wcEditDestination" hidden>↗ Editar conexión</button><button type="button" id="wcOpenElements">＋ Añadir elementos</button></div>`;
const insert=document.createElement('details');insert.id='wcElementsGroup';insert.className='wc-property-group';
insert.innerHTML=`<summary><span>＋</span> Insertar elementos <b aria-hidden="true">⌄</b></summary><div class="wc-property-body">
<p class="wc-insert-intro">Añade elementos a la sección seleccionada. Los cambios forman parte del HTML exportado.</p>
<label>Texto para el botón o tarjeta<input id="wcInsertText" type="text" maxlength="150" placeholder="Reserva tu plaza"></label>
<label>URL del botón o imagen externa<input id="wcInsertUrl" type="text" maxlength="1400" placeholder="https://... / #seccion"></label>
<label>Posición<select id="wcInsertPosition"><option value="after">Después del elemento seleccionado</option><option value="section">Al final de la sección</option></select></label>
<div class="wc-insert-grid" role="group" aria-label="Insertar formas y recursos">
<button type="button" data-wc-insert="button">↗ Botón<small>Conexión externa</small></button>
<button type="button" data-wc-insert="rectangle">▭ Rectángulo<small>Forma editable</small></button>
<button type="button" data-wc-insert="circle">◯ Círculo<small>Forma redonda</small></button>
<button type="button" data-wc-insert="line">— Separador<small>Línea horizontal</small></button>
<button type="button" data-wc-insert="card">▤ Tarjeta<small>Bloque con texto</small></button>
<button type="button" data-wc-insert="badge">◉ Etiqueta<small>Chip / distintivo</small></button>
<button type="button" data-wc-insert="image">▧ Imagen URL<small>Recurso externo</small></button>
</div></div>`;
selected.insertAdjacentElement('afterend',insert);
const links=el('wcLinkGroup'),body=links.querySelector('.wc-property-body');
const panel=document.createElement('div');panel.id='wcSmartLinkPanel';panel.className='wc-resource-grid wc-hidden';
panel.innerHTML=`<label>Tipo de conexión<select id="wcSmartLinkKind">
<option value="web">Web / recurso externo</option><option value="section">Sección interna</option>
<option value="whatsapp">WhatsApp</option><option value="email">Correo electrónico</option><option value="phone">Teléfono</option></select></label>
<label>Destino<input id="wcSmartLinkValue" type="text" maxlength="1400" placeholder="https://ejemplo.com"></label>
<label class="wc-inline-check"><input id="wcSmartLinkTab" type="checkbox"> Abrir enlaces web en otra pestaña</label>
<p id="wcSmartLinkTip" class="wc-resource-tip">Los enlaces funcionan en Vista real y en el HTML exportado.</p>
<button type="button" id="wcSmartLinkApply" class="wc-property-apply">Guardar conexión <span aria-hidden="true">↗</span></button>`;
body.insertBefore(panel,el('wcLinkEmpty'));
const shape=document.createElement('details');shape.id='wcShapeGroup';shape.className='wc-property-group wc-hidden';
shape.innerHTML=`<summary><span>06</span> Dimensiones de la forma <b aria-hidden="true">⌄</b></summary>
<div class="wc-property-body"><p class="wc-resource-tip">Puedes cambiar el color desde Apariencia.</p>
<div class="wc-field-three"><label>Ancho px<input id="wcShapeWidth" type="number" min="2" max="1800"></label>
<label>Alto px<input id="wcShapeHeight" type="number" min="1" max="1800"></label>
<label>Radio px<input id="wcShapeRadius" type="number" min="0" max="900"></label></div>
<button id="wcApplyShape" type="button" class="wc-property-apply">Aplicar dimensiones <span aria-hidden="true">↗</span></button></div>`;
links.insertAdjacentElement('afterend',shape);
const labels={rectangle:'Rectángulo',circle:'Círculo',line:'Separador',card:'Tarjeta',badge:'Etiqueta',button:'Botón',image:'Imagen'};
const caption=n=>String(n?.getAttribute('aria-label')||n?.getAttribute('title')||n?.textContent||n?.getAttribute('alt')||'').replace(/\s+/g,' ').trim().slice(0,90);
const message=(v,err=false)=>{el('wcStatus').textContent=v;el('wcStatus').dataset.error=String(err)};
function type(n){
 if(!n)return 'Sin selección';
 const href=n.getAttribute('href')||'';
 if(n.tagName==='A'&&/(?:^|\/\/)(?:wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i.test(href))return 'Botón de WhatsApp';
 if(n.tagName==='A'&&/^mailto:/i.test(href))return 'Botón de correo';
 if(n.tagName==='A'&&/^tel:/i.test(href))return 'Botón de llamada';
 const shape=n.getAttribute('data-wc-kind');if(shape&&labels[shape])return labels[shape];
 if(n.tagName==='A'){
  if(/(?:^|\/\/)(?:wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i.test(href))return 'Botón de WhatsApp';
  if(/^mailto:/i.test(href))return 'Botón de correo';
  if(/^tel:/i.test(href))return 'Botón de llamada';
  return /\b(?:btn|button|cta)\b/i.test(n.className||'')?'Botón con enlace':'Enlace';
 }
 return ({BUTTON:'Botón',IMG:'Imagen',H1:'Título principal',H2:'Título',H3:'Subtítulo',H4:'Encabezado',SPAN:'Texto o icono',P:'Párrafo',DIV:'Contenedor',SECTION:'Sección',HEADER:'Cabecera',FOOTER:'Pie de página',NAV:'Navegación',MAIN:'Contenido principal',LI:'Lista',SMALL:'Texto pequeño'})[n.tagName]||n.tagName.toLowerCase();
}
function path(n){
 if(!n)return 'Página › Sin selección';
 const p=[];let x=n.parentElement;
 while(x&&p.length<3){if(['SECTION','HEADER','FOOTER','ARTICLE','NAV','MAIN'].includes(x.tagName))p.unshift(String(x.getAttribute('data-wc-section')||x.getAttribute('aria-label')||x.id||type(x)).slice(0,35));x=x.parentElement}
 return 'Página › '+p.join(' › ')+(p.length?' › ':'')+type(n);
}
function label(n){if(!n)return 'Elemento';const t=type(n),v=caption(n);return /^(?:Botón|Enlace)/.test(t)||!v?t:t+': '+v.slice(0,32)}
function validHref(raw){
 const v=String(raw||'').trim();
 if(!v||v.length>1400||/[\u0000-\u001f<>"']/.test(v))return '';
 if(/^https?:\/\//i.test(v)){try{return ['http:','https:'].includes(new URL(v).protocol)?v:''}catch{return ''}}
 if(/^\/(?!\/)[^\s]*$/.test(v)||/^#[a-z\d][a-z\d_-]*$/i.test(v)||/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(v)||/^tel:\+?[0-9(). -]{6,22}$/i.test(v))return v;
 return '';
}
function kindOf(href){return /^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i.test(href)?'whatsapp':href.startsWith('#')?'section':href.startsWith('mailto:')?'email':href.startsWith('tel:')?'phone':'web'}
function transform(kind,value){
 let v=String(value||'').trim();
 if(kind==='section')v='#'+v.replace(/^#/,'');
 if(kind==='email'&&!/^mailto:/i.test(v))v='mailto:'+v;
 if(kind==='phone'&&!/^tel:/i.test(v))v='tel:'+v;
 if(kind==='whatsapp'){
  if(/^https:\/\/(?:wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i.test(v))return validHref(v);
  const number=v.replace(/[\s()+.-]/g,'');if(!/^\d{8,15}$/.test(number))return '';v='https://wa.me/'+number;
 }
 return validHref(v);
}
function setKind(){
 const kind=el('wcSmartLinkKind').value;
 el('wcSmartLinkValue').placeholder={web:'https://ejemplo.com',section:'#contacto',whatsapp:'+34 600 000 000',email:'hola@empresa.com',phone:'+34 600 000 000'}[kind];
 el('wcSmartLinkTab').disabled=!['web','whatsapp'].includes(kind);
}
el('wcSmartLinkKind').addEventListener('change',setKind);
function onSelect(n){
 const t=type(n),href=n?.getAttribute('href')||'',v=caption(n);
 el('wcElementName').textContent=t;
 el('wcSelectedIcon').textContent=n?.tagName==='IMG'?'▧':n?.tagName==='A'?'↗':n?.getAttribute('data-wc-kind')?'◇':'▣';
 el('wcTag').textContent=n?n.tagName.toLowerCase()+(n.id?' #'+n.id:''):'Sin selección';
 el('wcElementDetail').textContent=href?'Destino: '+href:n?.tagName==='IMG'?'Imagen: '+(n.getAttribute('alt')||n.getAttribute('src')||'sin descripción'):v?'Contenido: '+v:'Sin texto visible; prueba a seleccionar el botón o contenedor exterior.';
 el('wcElementPath').textContent=path(n);
 const clickable=n&&['A','BUTTON'].includes(n.tagName);
 el('wcEditDestination').hidden=!clickable;panel.classList.toggle('wc-hidden',!clickable);
 el('wcHrefWrap').classList.add('wc-hidden');el('wcApplyLink').classList.add('wc-hidden');
 el('wcLinkEmpty').classList.toggle('wc-hidden',Boolean(clickable));
 if(clickable){
  el('wcSmartLinkKind').value=kindOf(href);el('wcSmartLinkValue').value=href;el('wcSmartLinkTab').checked=n.getAttribute('target')==='_blank';setKind();
  el('wcSmartLinkTip').textContent=n.tagName==='BUTTON'?'Se convertirá en enlace. Si tenía scripts propios, comprueba el resultado en Vista real.':'Puedes conectar este elemento con URLs, WhatsApp, teléfono, correo o secciones.';
 }
 const form=n?.hasAttribute('data-wc-kind')&& !['button','image'].includes(n.getAttribute('data-wc-kind'));
 shape.classList.toggle('wc-hidden',!form);
 if(form){el('wcShapeWidth').value=parseFloat(n.style.width)||'';el('wcShapeHeight').value=parseFloat(n.style.height)||'';el('wcShapeRadius').value=/px$/.test(n.style.borderRadius)?parseFloat(n.style.borderRadius):''}
}
function onOpen(){onSelect(null)}
el('wcOpenElements').addEventListener('click',()=>{insert.open=true;insert.scrollIntoView({block:'nearest',behavior:'smooth'})});
el('wcEditDestination').addEventListener('click',()=>{links.open=true;links.scrollIntoView({block:'start',behavior:'smooth'});el('wcSmartLinkValue').focus()});
const top=document.createElement('button');top.type='button';top.id='wcAddElementTop';top.className='wc-toolbar-quiet';top.textContent='＋ Elementos';
el('wcCodeMode').parentElement.insertAdjacentElement('afterend',top);
top.addEventListener('click',()=>{el('wcTabDesign').click();insert.open=true;insert.scrollIntoView({block:'nearest',behavior:'smooth'})});
el('wcSmartLinkApply').addEventListener('click',()=>{
 const n=studio.getSelection();if(!n||!['A','BUTTON'].includes(n.tagName))return message('Selecciona primero un botón o enlace.',true);
 const kind=el('wcSmartLinkKind').value,href=transform(kind,el('wcSmartLinkValue').value);
 if(!href)return message('Introduce una dirección, un email, número o #sección válidos.',true);
 if(href.startsWith('#')&&!studio.getDocument()?.getElementById(href.slice(1)))return message('La sección '+href+' no existe en esta web.',true);
 if(n.tagName==='BUTTON'&&n.closest('form')&&!confirm('Este botón forma parte de un formulario. Al convertirlo en enlace dejará de enviarlo. ¿Continuar?'))return;
 let target=n;const blank=el('wcSmartLinkTab').checked&&['web','whatsapp'].includes(kind)&&/^https?:\/\//i.test(href);
 const changed=studio.change(()=>{
  if(n.tagName==='BUTTON'){
   target=n.ownerDocument.createElement('a');
   for(const attr of [...n.attributes])if(!/^(?:on|form|type|disabled|autofocus|name|value)/i.test(attr.name))target.setAttribute(attr.name,attr.value);
   while(n.firstChild)target.append(n.firstChild);
   n.replaceWith(target);
  }
  target.setAttribute('href',href);target.removeAttribute('aria-disabled');
  if(blank){target.setAttribute('target','_blank');target.setAttribute('rel','noopener noreferrer')}
  else{target.removeAttribute('target');target.removeAttribute('rel')}
 },'Enlace actualizado. Comprueba el destino en Vista real.');
 if(changed){studio.selectNode(target);message('Conexión guardada. Verifica su funcionamiento en Vista real.')}
});
function insertElement(kind){
 const doc=studio.getDocument();if(!doc)return message('Abre primero un proyecto.',true);
 const txt=el('wcInsertText').value.trim(),raw=el('wcInsertUrl').value.trim();
 const current=studio.getSelection();
 const parent=current?.closest('section,article,main,header,footer')||doc.querySelector('main')||doc.body;
 let after=current;
 if(after&&['SPAN','A','BUTTON','SMALL','STRONG','EM','I','B'].includes(after.tagName)){
  after=after.closest('h1,h2,h3,h4,h5,h6,p,li,div,section,article')||after;
 }
 const canInsertAfter=Boolean(after?.parentElement&&after!==parent&&parent.contains(after));

 let n;
 if(kind==='image'){
  const href=validHref(raw);if(!/^https:\/\//.test(href))return message('Escribe una URL de imagen https:// válida.',true);
  n=doc.createElement('img');n.src=href;n.alt=txt||'Imagen añadida';n.loading='lazy';n.style.cssText='display:block;max-width:100%;width:340px;height:auto;margin:20px auto;object-fit:contain';
 }else if(kind==='button'){
  n=doc.createElement('a');n.textContent=txt||'Nuevo botón';n.setAttribute('data-wc-kind','button');
  const href=validHref(raw);
  if(href){n.setAttribute('href',href);if(/^https?:\/\//.test(href)){n.target='_blank';n.rel='noopener noreferrer'}}else n.setAttribute('aria-disabled','true');
  n.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:12px 22px;margin:16px auto;background:#2855ee;color:white;font:700 15px/1.3 system-ui,sans-serif;border-radius:11px;text-decoration:none;cursor:pointer';
 }else{
  n=doc.createElement(kind==='badge'?'span':'div');n.setAttribute('data-wc-kind',kind);
  if(kind==='rectangle')n.style.cssText='display:block;width:200px;height:90px;border-radius:12px;background:#b6d7fe;margin:20px auto';
  if(kind==='circle')n.style.cssText='display:block;width:118px;height:118px;border-radius:50%;background:#8cbcf6;margin:20px auto';
  if(kind==='line')n.style.cssText='display:block;width:80%;height:2px;background:#8c9ab0;margin:24px auto';
  if(kind==='card'){n.textContent=txt||'Nueva tarjeta';n.style.cssText='display:block;box-sizing:border-box;width:min(100%,420px);padding:24px;background:#f6f8ff;color:#18284e;border:1px solid #cdd8ea;border-radius:16px;margin:20px auto;font:500 16px/1.5 system-ui,sans-serif'}
  if(kind==='badge'){n.textContent=txt||'Nueva etiqueta';n.style.cssText='display:inline-block;padding:7px 16px;background:#e2efff;color:#153d78;border-radius:999px;margin:12px;font:700 13px/1.4 system-ui,sans-serif'}
 }
 const mode=el('wcInsertPosition').value;
 const done=studio.change(()=>{if(mode==='after'&&canInsertAfter)after.after(n);else parent.append(n)},(labels[kind]||'Elemento')+' añadido. Guarda el proyecto.');
 if(done){studio.selectNode(n);insert.open=false;if(kind==='button'){links.open=true;links.scrollIntoView({block:'nearest',behavior:'smooth'})}message((labels[kind]||'Elemento')+' añadido. Puedes editar sus propiedades.')}
}
insert.addEventListener('click',e=>{const kind=e.target.closest('[data-wc-insert]')?.dataset.wcInsert;if(kind&&labels[kind])insertElement(kind)});
el('wcApplyShape').addEventListener('click',()=>{
 const n=studio.getSelection();if(!n?.hasAttribute('data-wc-kind'))return;
 const vals=['wcShapeWidth','wcShapeHeight','wcShapeRadius'].map(id=>el(id).value.trim()),nums=vals.map(Number);
 if(nums.some((v,i)=>vals[i]!==''&&(!Number.isFinite(v)||v<(i===2?0:1)||v>1800)))return message('Dimensiones fuera de rango.',true);
 studio.change(()=>{if(vals[0])n.style.width=nums[0]+'px';if(vals[1])n.style.height=nums[1]+'px';if(vals[2])n.style.borderRadius=nums[2]+'px'},'Dimensiones guardadas.');
});
window.WebCreatorStudioTools={onSelect,onOpen,label};
onOpen();
})();
