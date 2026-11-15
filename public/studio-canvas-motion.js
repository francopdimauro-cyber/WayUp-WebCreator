/* WAYUP Studio direct manipulation — Canvas (iframe) + inspector. */
window.WebCreatorCanvasDragBridge=(function canvasDragBridge(){
 'use strict';
 const nodes=()=>document.querySelectorAll('[data-wc-index]');
 const handle=document.createElement('button'),marker=document.createElement('div');
 let current=null,mode='move',snap=0,gesture=null,suppressClickUntil=0;
 handle.type='button';handle.textContent='⠿ Mover';handle.title='Arrastra para mover el elemento';
 handle.setAttribute('aria-label','Arrastrar el elemento seleccionado en el Canvas');
 handle.style.cssText='position:fixed;z-index:2147483647;display:none;pointer-events:auto;touch-action:none;cursor:grab;background:#2655f5;color:#fff;border:1px solid #fff;border-radius:7px;padding:6px 10px;font:800 12px/1.3 system-ui,sans-serif;box-shadow:0 3px 12px #0006';
 marker.style.cssText='display:none;position:fixed;z-index:2147483646;pointer-events:none;background:#22c55e;height:4px;border-radius:5px;box-shadow:0 0 0 3px #22c55e25';
 document.documentElement.append(handle,marker);
 const parse=v=>{const match=String(v||'').trim().match(/^(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?$/);return match?[Number(match[1]),Number(match[2]||0)]:[0,0]};
 const clamp=n=>Math.max(-1800,Math.min(1800,Math.round(n)));
 const round=n=>clamp(snap===8?Math.round(n/8)*8:n);
 const send=(type,n,extra={})=>{
  const index=Number(n?.getAttribute('data-wc-index'));
  if(Number.isInteger(index)&&index>=0)parent.postMessage({webCreatorCanvas:true,type,index,...extra},'*');
 };
 function draw(){
  if(!current||!current.isConnected){handle.style.display='none';return}
  const r=current.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight||r.left>innerWidth||r.right<0){handle.style.display='none';return}
  handle.style.display='block';handle.textContent=mode==='order'?'⠿ Reordenar':'⠿ Mover';
  handle.title=mode==='order'?'Arrastra a la posición de otro elemento hermano':'Arrastra el elemento libremente';
  handle.style.left=Math.max(0,Math.min(innerWidth-114,r.right-111))+'px';
  handle.style.top=Math.max(0,Math.min(innerHeight-36,r.top+5))+'px';
 }
 function selected(n){
  current=n;
  draw();
 }
 addEventListener('message',event=>{
  if(event.source!==parent)return;
  if(event.data?.wcRestoreScroll===true){scrollTo(0,Math.max(0,Number(event.data.y)||0));return}
  if(event.data?.wcHighlight!==true)return;
  mode=event.data.wcDragMode==='order'?'order':'move';
  snap=event.data.wcDragSnap===8?8:0;
  selected(nodes()[event.data.index]||null);
 });
 addEventListener('scroll',()=>{
   draw();
   parent.postMessage({webCreatorCanvas:true,type:'scroll',y:Math.max(0,scrollY)},'*');
 },true);
 addEventListener('resize',draw,true);
 function getTarget(event){
  const tag=event.target;
  if(!(tag instanceof Element)||tag.closest('[contenteditable="true"],input,textarea,select'))return null;
  const link=tag.closest('a,button,[role="button"]');
  if(link?.hasAttribute('data-wc-index'))return link;
  return tag.closest('[data-wc-index]');
 }
 function begin(event,element,isHandle=false){
  if(gesture||!element?.hasAttribute('data-wc-index'))return;
  if(event.button!==0||event.altKey||event.ctrlKey||event.metaKey)return;
  if(!isHandle&&event.pointerType==='touch')return;
  event.preventDefault();
  if(isHandle)event.stopImmediatePropagation();
  const offset=parse(element.style.getPropertyValue('translate'));
  gesture={pointer:event.pointerId,node:element,startX:event.clientX,startY:event.clientY,offset,
   original:element.style.getPropertyValue('translate'),priority:element.style.getPropertyPriority('translate'),
   originalOpacity:element.style.getPropertyValue('opacity'),opacityPriority:element.style.getPropertyPriority('opacity'),
   active:false,mode,after:null,before:true,nextX:offset[0],nextY:offset[1]};
  try{(isHandle?handle:element).setPointerCapture(event.pointerId)}catch{}
 }
 addEventListener('pointerdown',event=>{
  if(event.target===handle)return;
  const n=getTarget(event);
  if(n)begin(event,n);
 },true);
 handle.addEventListener('pointerdown',event=>begin(event,current,true));
 function restoreOpacity(d){
  if(d.originalOpacity)d.node.style.setProperty('opacity',d.originalOpacity,d.opacityPriority);
  else d.node.style.removeProperty('opacity');
 }
 function findDrop(x,y,node){
  const sourcePointer=node.style.getPropertyValue('pointer-events'),sourcePriority=node.style.getPropertyPriority('pointer-events');
  const controlPointer=handle.style.pointerEvents;
  node.style.setProperty('pointer-events','none','important');handle.style.pointerEvents='none';
  let target=document.elementFromPoint(x,y)?.closest('[data-wc-index]')||null;
  if(sourcePointer)node.style.setProperty('pointer-events',sourcePointer,sourcePriority);
  else node.style.removeProperty('pointer-events');
  handle.style.pointerEvents=controlPointer;
  while(target&&target.parentElement!==node.parentElement)target=target.parentElement?.closest('[data-wc-index]')||null;
  return target&&target!==node&&target.parentElement===node.parentElement?target:null;
 }
 function drawDrop(target,before){
  if(!target){marker.style.display='none';return}
  const r=target.getBoundingClientRect();
  marker.style.display='block';marker.style.left=Math.max(0,r.left)+'px';
  marker.style.top=(before?r.top:r.bottom-2)+'px';
  marker.style.width=Math.max(20,Math.min(innerWidth,r.right)-Math.max(0,r.left))+'px';
 }
 function move(event){
  const d=gesture;if(!d||event.pointerId!==d.pointer)return;
  const dx=event.clientX-d.startX,dy=event.clientY-d.startY;
  if(!d.active&&Math.hypot(dx,dy)<5)return;
  if(!d.active){
   d.active=true;
   suppressClickUntil=performance.now()+320;
   selected(d.node);
   send('select',d.node);
   document.documentElement.classList.add('wc-direct-dragging');
   handle.style.cursor='grabbing';
  }
  event.preventDefault();
  if(d.mode==='order'){
   d.node.style.setProperty('opacity','.45','important');
   d.after=findDrop(event.clientX,event.clientY,d.node);
   if(d.after){const rect=d.after.getBoundingClientRect();d.before=event.clientY<rect.top+rect.height/2}
   drawDrop(d.after,d.before);
  }else{
   d.nextX=round(d.offset[0]+dx);d.nextY=round(d.offset[1]+dy);
   d.node.style.setProperty('translate',d.nextX+'px '+d.nextY+'px','important');
   draw();
  }
 }
 function finish(event,cancel=false){
  const d=gesture;if(!d||event.pointerId!==d.pointer)return;
  gesture=null;marker.style.display='none';
  document.documentElement.classList.remove('wc-direct-dragging');
  handle.style.cursor='grab';restoreOpacity(d);
  if(!d.active||cancel){
   if(d.mode==='move'){
    if(d.original)d.node.style.setProperty('translate',d.original,d.priority);
    else d.node.style.removeProperty('translate');
   }
   draw();return;
  }
  suppressClickUntil=performance.now()+260;
  if(d.mode==='move'){
   if(d.nextX!==d.offset[0]||d.nextY!==d.offset[1])send('move',d.node,{x:d.nextX,y:d.nextY,frameScrollY:Math.max(0,scrollY)});
   else if(d.original)d.node.style.setProperty('translate',d.original,d.priority);
   else d.node.style.removeProperty('translate');
  }else if(d.after)send('reorder',d.node,{target:Number(d.after.getAttribute('data-wc-index')),before:d.before,frameScrollY:Math.max(0,scrollY)});
  draw();
 }
 addEventListener('pointermove',move,true);
 addEventListener('pointerup',event=>finish(event),true);
 addEventListener('pointercancel',event=>finish(event,true),true);
 addEventListener('blur',()=>{if(gesture)finish({pointerId:gesture.pointer},true)});
 addEventListener('keydown',event=>{if(event.key==='Escape'&&gesture){event.preventDefault();finish({pointerId:gesture.pointer},true)}},true);
 addEventListener('click',event=>{
  if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}
 },true);
 const css=document.createElement('style');
 css.textContent='html.wc-direct-dragging,html.wc-direct-dragging *{user-select:none!important;-webkit-user-select:none!important;cursor:grabbing!important}';
 document.head.append(css);
});
(function studioCanvasMotion(){
 'use strict';
 const studio=window.WebCreatorStudio,prev=window.WebCreatorStudioTools,el=id=>document.getElementById(id);
 if(!studio?.change||!prev?.onSelect||!el('wcSelectedInfo'))return;
 let mode='move',snap=0;
 const group=document.createElement('details');group.id='wcCanvasMotionGroup';group.className='wc-property-group';group.open=true;
 group.innerHTML=`<summary><span>✥</span> Mover en el Canvas <b aria-hidden="true">⌄</b></summary>
 <div class="wc-property-body wc-motion-body">
 <p id="wcMotionIntro" class="wc-motion-intro">Selecciona un elemento y arrástralo con el ratón directamente sobre el Canvas. También puedes utilizar el control azul ⠿ Mover.</p>
 <label>Modo de movimiento<select id="wcMotionMode"><option value="move">Mover libremente</option><option value="order">Reordenar dentro del contenedor</option></select></label>
 <label class="wc-inline-check"><input id="wcMotionSnap" type="checkbox"> Ajustar a cuadrícula de 8 px</label>
 <div class="wc-field-two"><label>Posición X <span>px</span><input id="wcMotionX" type="number" step="1" min="-1800" max="1800" value="0"></label>
 <label>Posición Y <span>px</span><input id="wcMotionY" type="number" step="1" min="-1800" max="1800" value="0"></label></div>
 <div class="wc-motion-actions"><button type="button" id="wcMotionApply">Aplicar posición</button><button type="button" id="wcMotionReset">⟲ Restablecer</button></div>
 <div class="wc-motion-layers"><span>Orden de los elementos</span>
 <div><button type="button" id="wcMotionUp" title="Subir elemento en su contenedor">↑ Subir</button>
 <button type="button" id="wcMotionDown" title="Bajar elemento en su contenedor">↓ Bajar</button></div></div>
 <p id="wcMotionNotice" class="wc-motion-notice">Mover libremente desplaza el elemento sin mover los demás. Para cambiar el orden adaptable a móviles, selecciona «Reordenar».</p>
 </div>`;
 el('wcSelectedInfo').insertAdjacentElement('afterend',group);
 const current=()=>studio.getSelection();
 const parse=n=>{
  const s=n?.style.getPropertyValue('translate')||'',m=s.match(/^(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?$/);
  return m?[Math.round(Number(m[1])),Math.round(Number(m[2]||0))]:[0,0];
 };
 function refresh(node){
  const available=Boolean(node),[x,y]=parse(node);
  el('wcMotionX').value=x;el('wcMotionY').value=y;
  for(const id of ['wcMotionApply','wcMotionReset','wcMotionX','wcMotionY'])el(id).disabled=!available;
  el('wcMotionUp').disabled=!node?.previousElementSibling;
  el('wcMotionDown').disabled=!node?.nextElementSibling;
 }
 const onSelect=node=>{prev.onSelect(node);refresh(node)};
 const onOpen=()=>{prev.onOpen();refresh(null)};
 window.WebCreatorStudioTools={...prev,onSelect,onOpen};
 const settings=()=>({mode,snap});
 window.WebCreatorCanvasMotion={settings};
 const announce=text=>{el('wcStatus').textContent=text};
 el('wcMotionMode').addEventListener('change',()=>{
  mode=el('wcMotionMode').value==='order'?'order':'move';
  el('wcMotionIntro').textContent=mode==='order'
   ?'Arrastra un elemento encima de otro del mismo contenedor. La línea verde indica dónde lo insertarás.'
   :'Arrastra cualquier elemento del Canvas, o usa el control azul ⠿ Mover.';
  el('wcMotionNotice').textContent=mode==='order'
   ?'Reordenar modifica el HTML y suele adaptarse mejor a diferentes tamaños de pantalla. Solo permite elementos del mismo contenedor.'
   :'Mover libremente conserva el flujo original y desplaza visualmente el elemento. Revisa también las vistas tablet y móvil.';
  studio.refreshCanvasSelection?.();
 });
 el('wcMotionSnap').addEventListener('change',()=>{snap=el('wcMotionSnap').checked?8:0;studio.refreshCanvasSelection?.()});
 function commitMove(n,x,y,description){
  if(!n||!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>1800||Math.abs(y)>1800)return false;
  const done=studio.change(()=>{
   if(!n.hasAttribute('data-wc-original-translate'))n.setAttribute('data-wc-original-translate',n.style.getPropertyValue('translate')||'');
   n.style.setProperty('translate',x+'px '+y+'px','important');
  },description||'Posición actualizada en Canvas.');
  if(done){studio.selectNode(n);return true}
  return false;
 }
 el('wcMotionApply').addEventListener('click',()=>{
  const n=current();if(!n)return;
  const x=Number(el('wcMotionX').value),y=Number(el('wcMotionY').value);
  if(!commitMove(n,x,y,'Posición ajustada con precisión. Guarda el proyecto.'))announce('Coordenadas inválidas. Utiliza valores entre −1800 y 1800 px.');
 });
 el('wcMotionReset').addEventListener('click',()=>{
  const n=current();if(!n)return;
  const done=studio.change(()=>{
   const original=n.getAttribute('data-wc-original-translate');
   if(original)n.style.setProperty('translate',original);
   else n.style.removeProperty('translate');
   n.removeAttribute('data-wc-original-translate');
  },'Posición original recuperada.');
  if(done)studio.selectNode(n);
 });
 function swap(direction){
  const n=current(),neighbor=direction==='up'?n?.previousElementSibling:n?.nextElementSibling;
  if(!n||!neighbor||!n.parentElement)return;
  const done=studio.change(()=>{if(direction==='up')n.parentElement.insertBefore(n,neighbor);else n.parentElement.insertBefore(n,neighbor.nextSibling)},'Orden de elementos actualizado.');
  if(done)studio.selectNode(n);
 }
 el('wcMotionUp').addEventListener('click',()=>swap('up'));
 el('wcMotionDown').addEventListener('click',()=>swap('down'));
 refresh(current());
})();
