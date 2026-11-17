'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Braces, Check, ChevronRight, CodeXml, Download, FileArchive, FileCode2,
  FilePlus2, FileUp, FolderOpen, Globe, LoaderCircle, Monitor, Paintbrush, Redo2, Tablet,
  Save, Smartphone, Sparkles, Undo2, X, Copy, Trash2, ArrowUp, ArrowDown, ImagePlus, Link2, Layers3, Move, SlidersHorizontal, Search, MousePointer2, SquarePlus, Play, RotateCcw, Shapes } from 'lucide-react';
import { parseColorCode } from '@/lib/color-codes';
import {cloudListSites,cloudLoadSite,cloudSaveSite,type CloudSiteSummary} from '@/lib/studio-cloud';
import { AgentSetup, type LinkedAgent } from './agent-setup';
import { SectionExplorer, type SectionAction } from './section-explorer';
import { BrandLockup } from './brand-lockup';
import { PropertyPanel, type ElementInfo } from './property-panel';
import { SymbolLibrary } from './symbol-library';
import { CssCodeEditor } from './css-code-editor';
import type { SymbolEntry } from '@/lib/symbols';
import { CanvasMenu, type CanvasCommand } from './canvas-menu';
import { SeoPanel } from './seo-panel';
import { AgentLibrary } from './agent-library';
import { CreatorWizard, type Direction, type ClientPhoto } from './creator-wizard';
import { ParkedItem, type Parked } from './parked-item';
import { InsertPanel, BLOCK_MIME, SECTION_MIME } from './insert-panel';
import { computeDrop, showIndicator, hideIndicator, drawHandles, clearHandles } from './canvas-interactions';
import { blockById, isSectionBlock, instantiateBlock } from '@/lib/canvas-blocks';
import { EDITABLE_STYLE_PROPS, copyElement, duplicateElement, isTextEditable, moveElement, parentIndex, pasteElement, removeElement, setAttributes, setFont, setInlineContent, setStyles, toggleHidden, groupElements, ungroupElement, insertSnippet, moveElementTo, canContain, writeSeo, replaceInlineSymbol, resolveSymbolTarget, symbolFitTransform, type EditResult } from '@/lib/element-editing';
import { validateCssSource } from '@/lib/css-validation';
import { ThemeToggle } from './theme-toggle';
import { addSection, duplicateSection, ensureSectionKeys, listSections, moveSection, removeSection, renameSection, sectionForIndex } from '@/lib/html-sections';
import { starterHtml } from '@/lib/starter-web';
import { strFromU8, strToU8 } from 'fflate';
import { visualReview } from '@/lib/visual-review';
import { assetMime, attachLocalImage, editHtmlStructure, htmlLayerOutline, removeLocalImage, resolveImageTarget,
  downloadBytes, htmlForExport, listSavedSites, livePreview, patchSelectedElement, safePreview,
  saveSite, siteFromHtml, siteFromZip, siteZip,
  type SiteBundle } from '@/lib/web-project-files';

type Stage='home'|'create'|'editor'|'agent'|'export';
type View='preview'|'code';
type BrowserEditorProps={onClose?():void};
const cleanName=(value:string):string=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').slice(0,64)||'web';
const BASE='rounded-lg border border-stroke bg-panel px-3 py-2.5 text-[12.5px] text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15';
const btn='inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-stroke bg-panel px-2.5 text-[11.5px] font-medium text-ink transition hover:border-brand/45 hover:bg-elevated disabled:opacity-40 disabled:hover:border-stroke';
const primary='inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[11.5px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50';
/** Añade el CSS propio del cliente al final del <head>, sin código activo ni recursos externos. */
function appendCustomCss(html:string,css:string):string{
  const clean=css.slice(0,20000).replace(/<\/?\s*style[^>]*>/gi,'').replace(/@import[^;]*;?/gi,'')
    .replace(/url\(\s*(['"]?)(?:https?:|\/\/|javascript:)[^)]*\)/gi,'none').replace(/expression\s*\(/gi,'').replace(/javascript:/gi,'');
  const doc=new DOMParser().parseFromString(html,'text/html');
  const style=doc.createElement('style');style.setAttribute('data-wc-custom-css','true');style.textContent=clean;
  doc.head.append(style);
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}
/** Estilos propios de la página: un <style data-wc-page-css> al final del <head> (saneado como el CSS propio). */
function setPageCss(html:string,css:string):string{
  const clean=css.slice(0,50000).replace(/<\/?\s*style[^>]*>/gi,'').replace(/@import[^;]*;?/gi,'')
    .replace(/url\(\s*(['"]?)(?:https?:|\/\/|javascript:)[^)]*\)/gi,'none').replace(/expression\s*\(/gi,'').replace(/javascript:/gi,'');
  const doc=new DOMParser().parseFromString(html,'text/html');
  let style=doc.head.querySelector('style[data-wc-page-css]');
  if(!clean.trim()){style?.remove();}
  else{if(!style){style=doc.createElement('style');style.setAttribute('data-wc-page-css','true');}doc.head.append(style);style.textContent=clean;}
  return '<!DOCTYPE html>'+String.fromCharCode(10)+doc.documentElement.outerHTML;
}
/** Script propio de la página: un <script data-wc-page-js> al final del <body>. Se ejecuta en la web publicada
 *  y en la vista «En vivo»; nunca dentro del lienzo de edición. */
function setPageJs(html:string,js:string):string{
  const code=js.slice(0,80000).replace(/<\/(script)/gi,'<\\/$1');
  const doc=new DOMParser().parseFromString(html,'text/html');
  let script=doc.body.querySelector('script[data-wc-page-js]');
  if(!code.trim()){script?.remove();}
  else{if(!script){script=doc.createElement('script');script.setAttribute('data-wc-page-js','true');}doc.body.append(script);script.textContent=code;}
  return '<!DOCTYPE html>'+String.fromCharCode(10)+doc.documentElement.outerHTML;
}
/** Propiedades visuales que se «congelan» al sacar un elemento de su contexto (p. ej. a la mesa de trabajo). */
const BAKE_PROPS=['color','-webkit-text-fill-color','background-color','background-image','font-family','font-size','font-weight','font-style',
  'line-height','letter-spacing','word-spacing','text-transform','text-decoration-line','text-align','text-shadow','border-radius','box-shadow',
  'padding-top','padding-right','padding-bottom','padding-left','opacity'];
/** Copia el aspecto calculado del elemento vivo (y de sus hijos) en estilos en línea del HTML copiado. */
function bakeStyles(live:HTMLElement,html:string):string{
  const doc=new DOMParser().parseFromString('<body>'+html+'</body>','text/html');
  const root=doc.body.firstElementChild as HTMLElement|null;
  if(!root)return html;
  const liveNodes=[live,...Array.from(live.querySelectorAll<HTMLElement>('*'))];
  const copyNodes=[root,...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const win=live.ownerDocument.defaultView;
  if(!win)return html;
  liveNodes.forEach((node,i)=>{
    const target=copyNodes[i];if(!target||target.tagName!==node.tagName)return;
    const cs=win.getComputedStyle(node);
    const decl:string[]=[];
    for(const prop of BAKE_PROPS){
      const value=cs.getPropertyValue(prop);
      if(!value||/url\(|blob:|var\(/i.test(value))continue; // nada de recursos temporales de la vista
      if(prop==='background-image'&&value==='none')continue;
      decl.push(prop+': '+value);
    }
    // El elemento raíz conserva su forma de mostrarse (p. ej. un <em> que su contenedor convertía en bloque);
    // si era «en línea», pasa a inline-block para que se pueda mover y redimensionar fuera de su sitio.
    if(i===0){const d=cs.display;decl.push('display: '+(d==='inline'?'inline-block':d));}
    const own=target.getAttribute('style')||'';
    target.setAttribute('style',decl.join('; ')+(own?'; '+own:''));
  });
  return root.outerHTML;
}
/** Lee la posición libre (translate) en cualquiera de sus formas: «», «80px» o «80px -12px». */
function readTranslate(value:string):{x:number;y:number}{
  const m=String(value||'').trim().match(/^(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?/);
  return {x:m?Math.round(Number(m[1])):0,y:m&&m[2]!==undefined?Math.round(Number(m[2])):0};
}
function escapeText(text:string):string{
  return text.replace(/[<>&]/g,ch=>ch==='<'?'&lt;':ch==='>'?'&gt;':'&amp;').replace(/\n/g,'<br>');
}
const steps=[['01','Crear'],['02','Editar'],['03','Agente IA'],['04','Exportar']] as const;
function fileByte(bytes:Uint8Array):string{
  if(bytes.length>2_000_000)throw Error('El archivo HTML supera 2 MB.');
  return strFromU8(bytes);
}
function briefFrom(form:Record<string,string>):string{
  return [
    'CREA UNA WEB PROFESIONAL COMPLETA Y EDITABLE PARA ESTE NEGOCIO.',
    'Negocio: '+form.name,
    'Sector: '+form.industry,
    'Público objetivo: '+form.audience,
    'Objetivo principal: '+form.goal,
    'Dirección de arte: '+form.style,
    'Servicios, contenido y valores reales: '+form.services,
    'Datos proporcionados: '+form.contact,
    'Funciones solicitadas: '+form.features,
    'Marca y colores de referencia: '+form.palette,
    'REQUISITOS DEL EDITOR WAYUP: utiliza secciones semánticas con data-wc-section estable,',
    'títulos reales, navegación y botones funcionales con anclas válidas.',
    'Entrega HTML5 completo y responsivo, con JavaScript propio para las interacciones (sin librerías externas), tipografías de Google Fonts y fotografías pedidas con data-wc-ai-image.'
  ].join('\n');
}
/** Imagen de reserva (PNG) si una foto IA no se pudo generar: mantiene la composición y se sustituye desde Propiedades. */
async function placeholderPng(label:string):Promise<Uint8Array>{
  const c=document.createElement('canvas');c.width=1600;c.height=1000;
  const g=c.getContext('2d');
  if(g){
    const grad=g.createLinearGradient(0,0,1600,1000);grad.addColorStop(0,'#d9d6cf');grad.addColorStop(1,'#b9b5ac');
    g.fillStyle=grad;g.fillRect(0,0,1600,1000);
    g.fillStyle='rgba(0,0,0,.45)';g.font='600 44px system-ui,sans-serif';g.textAlign='center';
    g.fillText('Imagen pendiente',800,480);g.font='28px system-ui,sans-serif';g.fillText(label.slice(0,70),800,540);
  }
  const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));
  return new Uint8Array(await (blob||new Blob()).arrayBuffer());
}
/** Rellena las <img data-wc-ai-image="…"> de la web generada con fotografías creadas por IA (máx. 6, de dos en dos). */
async function fillAiImages(html:string,onProgress:(v:string)=>void):Promise<{html:string;assets:Record<string,Uint8Array>;made:number;failed:number;real:number}>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const imgs=Array.from(doc.querySelectorAll<HTMLImageElement>('img[data-wc-ai-image]'));
  const assets:Record<string,Uint8Array>={};
  if(!imgs.length)return {html,assets,made:0,failed:0,real:0};
  let made=0,failed=0,done=0,real=0;
  const total=Math.min(imgs.length,6);
  onProgress('Creando fotografías con IA… 0/'+total);
  const one=async(img:HTMLImageElement,i:number)=>{
    const prompt=(img.getAttribute('data-wc-ai-image')||'').trim();
    const id=crypto.randomUUID().slice(0,6);
    let bytes:Uint8Array|null=null,ext='jpg';
    if(i<6&&prompt.length>=8){
      try{
        const res=await fetch('/studio-api/webcreator/image',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({prompt:prompt.slice(0,500)})});
        const data=await res.json().catch(()=>({})) as {image?:string;source?:string;credit?:string;link?:string};
        if(res.ok&&typeof data.image==='string'&&data.image.startsWith('data:image/')){
          bytes=Uint8Array.from(atob(data.image.split(',')[1]||''),c=>c.charCodeAt(0));
          // Foto real (Pixabay): se guarda su procedencia en la propia imagen.
          if(data.source==='pixabay'){real++;img.setAttribute('data-wc-credit',String(data.credit||'Pixabay').slice(0,120));if(data.link)img.setAttribute('data-wc-credit-link',String(data.link).slice(0,300));}
          else made++;
        }
      }catch{/* se usa la imagen de reserva */}
    }
    if(!bytes){bytes=await placeholderPng(img.alt||prompt);ext='png';failed++;}
    const path='wayup-media/ia-'+(i+1)+'-'+id+'.'+ext;
    assets[path]=bytes;
    img.setAttribute('src',path);
    img.setAttribute('data-wc-ai-prompt',prompt.slice(0,500));
    img.removeAttribute('data-wc-ai-image');
    if(!img.getAttribute('style')?.includes('object-fit'))img.style.objectFit='cover';
    if(i<6){done++;onProgress('Creando fotografías con IA… '+done+'/'+total);}
  };
  for(let i=0;i<imgs.length;i+=2)await Promise.all(imgs.slice(i,i+2).map((img,k)=>one(img,i+k)));
  return {html:'<!DOCTYPE html>'+String.fromCharCode(10)+doc.documentElement.outerHTML,assets,made,failed,real};
}
async function streamGeneratedWeb(briefing:string,onProgress:(v:string)=>void,direction:Direction|null=null):Promise<string>{
  const res=await fetch('/studio-api/webcreator/generate-stream',{
    method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'same-origin',cache:'no-store',body:JSON.stringify(direction?{briefing,direction}:{briefing})
  });
  if(!res.ok){
    const data=await res.json().catch(()=>({}));
    throw Error(data.error||'El motor de generación no está disponible en Studio (HTTP '+res.status+').');
  }
  if(!res.body)throw Error('El motor de generación no devolvió un flujo de datos.');
  const reader=res.body.getReader(),decoder=new TextDecoder();
  let carry='',html='',completed=false,event='message';
  function handle(raw:string){
    let payload='';
    for(const line of raw.split('\n')){
      if(line.startsWith('event:'))event=line.slice(6).trim();
      if(line.startsWith('data:'))payload+=line.slice(5).trim();
    }
    if(!payload)return;
    let data:Record<string,unknown>;
    try{data=JSON.parse(payload) as Record<string,unknown>;}catch{return;}
    if(event==='complete'){
      if(typeof data.html==='string'){html=data.html;completed=true;}
      onProgress('Web generada. Preparando editor…');
    }else if(event==='error')throw Error(String(data.error||data.message||'Ha fallado la generación.'));
    else if(event==='progress'||event==='status')onProgress(String(data.message||'Generando diseño y estructura…'));
    event='message';
  }
  while(true){
    const chunk=await reader.read();if(chunk.done)break;
    carry+=decoder.decode(chunk.value,{stream:true});
    const parts=carry.split(/\r?\n\r?\n/);carry=parts.pop()||'';
    for(const part of parts)handle(part);
  }
  if(carry.trim())handle(carry);
  if(!completed)throw Error('La generación terminó sin entregar un documento HTML completo.');
  return html;
}
export function WebWorkspace({onClose}:BrowserEditorProps={}){
  const [agentsOpen,setAgentsOpen]=useState(false);
  const [stage,setStage]=useState<Stage>('home');
  const [site,setSite]=useState<SiteBundle|null>(null);
  const [savedSites,setSavedSites]=useState<SiteBundle[]>([]);
  const [cloudItems,setCloudItems]=useState<CloudSiteSummary[]>([]);
  const [cloudInfo,setCloudInfo]=useState('Inicia sesión para sincronizar tus proyectos.');
  const [cloudBusy,setCloudBusy]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  // Progreso de la generación con IA, visible en el propio creador mientras dura (no se oculta solo).
  const [genStatus,setGenStatus]=useState<{message:string;startedAt:number}|null>(null);
  const [fileError,setFileError]=useState('');
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
  const [view,setView]=useState<View>('preview');
  const [device,setDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');
  // Vista «En vivo»: la web con su JavaScript funcionando (aislada del editor). liveKey reinicia la página.
  const [live,setLive]=useState(false);
  const [liveKey,setLiveKey]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  // Herramientas del lienzo: seleccionar (V), mover/reordenar (M) e insertar (I).
  const [tool,setTool]=useState<'select'|'move'|'insert'>('select');
  const toolRef=useRef<'select'|'move'|'insert'>('select');
  // Al mover: «ordenar» lo encaja en la maquetación (responsive); «libre» lo deja exactamente donde se suelta.
  const [moveStyle,setMoveStyle]=useState<'ordenar'|'libre'>('libre');
  const moveStyleRef=useRef<'ordenar'|'libre'>('libre');moveStyleRef.current=moveStyle;
  const moveMode=tool==='move';
  const moveModeRef={get current(){return toolRef.current==='move';}};
  const setMoveMode=(v:boolean|((p:boolean)=>boolean))=>{const next=typeof v==='function'?v(toolRef.current==='move'):v;setTool(next?'move':'select');};
  const [selectedValues,setSelectedValues]=useState({text:'',color:'',background:'',fontSize:'',href:'',alt:'',width:'',height:'',padding:'',margin:'',radius:'',fontWeight:'',fontFamily:'',textAlign:'',posX:'0',posY:'0'});
  const [explorerOpen,setExplorerOpen]=useState(false);
  const [inspectorOpen,setInspectorOpen]=useState(false);
  const [inspectorTab,setInspectorTab]=useState<'properties'|'image'|'symbol'>('properties');
  const [symbolQuery,setSymbolQuery]=useState('');
  const pendingSectionRef=useRef<string|null>(null);
  const pendingIndexRef=useRef<number|null>(null);
  // Selección múltiple (Mayús + clic): índices adicionales a la selección principal.
  const [multi,setMulti]=useState<number[]>([]);
  const multiRef=useRef<number[]>([]);multiRef.current=multi;
  const siteRef=useRef<SiteBundle|null>(null);
  // Posición de scroll de la vista: se conserva cuando el HTML cambia y la vista se vuelve a pintar.
  const scrollRef=useRef({x:0,y:0});
  // Mesa de trabajo (como en Illustrator/InDesign): zona alrededor de la página donde aparcar elementos.
  const BOARD_SIDE=360;
  const boardRef=useRef<HTMLDivElement>(null);
  const canvasScrollRef=useRef<HTMLDivElement>(null);
  // Zoom solo del lienzo (página + mesa de trabajo), independiente del zoom del navegador.
  const [zoom,setZoom]=useState(1);
  const zoomRef=useRef(1);zoomRef.current=zoom;
  // Desplazamiento con la mano (como Figma/Adobe): rueda pulsada, o barra espaciadora + clic izquierdo.
  const spaceHeldRef=useRef(false);
  const panRef=useRef<{x:number;y:number}|null>(null);
  /** Empieza a desplazar: usa coordenadas de pantalla para que funcione igual sobre la web y sobre la mesa. */
  function startPan(e:PointerEvent){
    panRef.current={x:e.screenX,y:e.screenY};
    e.preventDefault();e.stopPropagation();
    const setCursor=(c:string)=>{document.body.style.cursor=c;const d=previewFrame.current?.contentDocument;if(d?.body)d.body.style.cursor=c;};
    setCursor('grabbing');
    const docs=[document,previewFrame.current?.contentDocument].filter(Boolean) as Document[];
    const move=(ev:PointerEvent)=>{
      const last=panRef.current;if(!last)return;
      ev.preventDefault();
      const dx=ev.screenX-last.x,dy=ev.screenY-last.y;
      panRef.current={x:ev.screenX,y:ev.screenY};
      const c=canvasScrollRef.current;if(c){c.scrollLeft-=dx;c.scrollTop-=dy;}
      // Lo vertical recorre la propia web (su scroll interno), en píxeles de la página según el zoom.
      previewFrame.current?.contentWindow?.scrollBy({left:0,top:-dy/zoomRef.current,behavior:'instant' as ScrollBehavior});
    };
    const up=()=>{
      panRef.current=null;
      for(const d of docs){d.removeEventListener('pointermove',move,true);d.removeEventListener('pointerup',up,true);d.removeEventListener('pointercancel',up,true);}
      setCursor(spaceHeldRef.current?'grab':(toolRef.current==='move'?'grab':''));
    };
    for(const d of docs){d.addEventListener('pointermove',move,true);d.addEventListener('pointerup',up,true);d.addEventListener('pointercancel',up,true);}
  }
  /** ¿Este clic empieza un desplazamiento? Rueda (botón central) o espacio + botón izquierdo. */
  const isPanStart=(e:PointerEvent|MouseEvent)=>e.button===1||(e.button===0&&spaceHeldRef.current);
  const clampZoom=(z:number)=>Math.min(2,Math.max(0.2,Math.round(z*100)/100));
  const zoomBy=(f:number)=>setZoom(z=>clampZoom(z*f));
  const fitZoom=()=>{const c=canvasScrollRef.current;if(!c)return;const pageW=(device==='mobile'?390:device==='tablet'?820:1280);setZoom(clampZoom((c.clientWidth-48)/pageW));};
  // Webs con tema claro/oscuro (data-theme en <html>, que normalmente elige un script): la vista imita lo que
  // vería un visitante (preferencia del sistema) y se puede cambiar. No modifica el HTML guardado.
  const siteThemes=useMemo(()=>/<html\b[^>]*\bdata-theme\s*=\s*["'](?:light|dark)["']/i.test(site?.html||''),[site?.html]);
  // Al abrir una web o cambiar de dispositivo: la página entera cabe en el lienzo (como en Figma) y queda centrada.
  useEffect(()=>{
    const c=canvasScrollRef.current;if(!c)return;
    const pageW=device==='mobile'?390:device==='tablet'?820:1280;
    const fit=Math.min(1,clampZoom((c.clientWidth-48)/pageW));
    setZoom(fit);
    requestAnimationFrame(()=>{c.scrollLeft=Math.max(0,(c.scrollWidth-c.clientWidth)/2);});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[device,stage,site?.id]);
  useEffect(()=>{const c=canvasScrollRef.current;if(c)requestAnimationFrame(()=>{c.scrollLeft=Math.max(0,(c.scrollWidth-c.clientWidth)/2);});},[zoom,view]);
  useEffect(()=>{
    const c=canvasScrollRef.current;if(!c)return;
    const onWheel=(e:WheelEvent)=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoomBy(e.deltaY<0?1.1:1/1.1);};
    c.addEventListener('wheel',onWheel,{passive:false});
    const onDown=(e:PointerEvent)=>{if(isPanStart(e))startPan(e);};
    const noAuto=(e:MouseEvent)=>{if(e.button===1)e.preventDefault();}; // sin el desplazamiento automático de Firefox/Windows
    c.addEventListener('pointerdown',onDown,true);c.addEventListener('auxclick',noAuto,true);
    return()=>{c.removeEventListener('wheel',onWheel);c.removeEventListener('pointerdown',onDown,true);c.removeEventListener('auxclick',noAuto,true);};
  },[stage,view,site?.id]);
  const [webTheme,setWebTheme]=useState<'light'|'dark'>(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  const webThemeRef=useRef(webTheme);webThemeRef.current=webTheme;
  useEffect(()=>{const d=previewFrame.current?.contentDocument;if(d&&siteThemes)d.documentElement.setAttribute('data-theme',webTheme);},[webTheme,siteThemes]);
  const [elementInfo,setElementInfo]=useState<ElementInfo|null>(null);
  const [canvasMenu,setCanvasMenu]=useState<{x:number;y:number}|null>(null);
  const [seoOpen,setSeoOpen]=useState(false);
  const clipboardRef=useRef('');
  const [hasClip,setHasClip]=useState(false);
  const editingRef=useRef<{el:HTMLElement;index:number;original:string}|null>(null);
  const keyRef=useRef<(e:KeyboardEvent)=>void>(()=>{});
  const [draftHtml,setDraftHtml]=useState('');
  // Historial: cada paso recuerda el HTML y los archivos (CSS, imágenes) para poder deshacer cualquier cambio.
  type Snap={html:string;assets:Record<string,Uint8Array>;parked?:SiteBundle['parked']};
  const [past,setPast]=useState<Snap[]>([]);
  const [future,setFuture]=useState<Snap[]>([]);
  const [codeFile,setCodeFile]=useState<string>('__html__');
  const [draftCode,setDraftCode]=useState('');
  const [dirty,setDirty]=useState(false);
  const [postSavePrompt,setPostSavePrompt]=useState(false);
  const [form,setForm]=useState<Record<string,string>>({
    name:'',industry:'',audience:'',goal:'Conseguir contactos y clientes',
    style:'Editorial, moderno, profesional y responsive',
    services:'',contact:'',features:'Formulario de contacto, WhatsApp opcional',
    palette:'Respetar la identidad corporativa disponible'
  });
  const fileInput=useRef<HTMLInputElement>(null);
  const previewFrame=useRef<HTMLIFrameElement>(null);
  const selectedRef=useRef<HTMLElement|null>(null);
  siteRef.current=site;
  const preview=useMemo(()=>site?safePreview(site):null,[site]);
  const imageTarget=useMemo(()=>site&&selected!==null?resolveImageTarget(site,selected):null,[site,selected]);
  const symbolTarget=useMemo(()=>site&&selected!==null?resolveSymbolTarget(site.html,selected):null,[site,selected]);
  const [imagePreviewUrl,setImagePreviewUrl]=useState('');
  useEffect(()=>{
    const bytes=imageTarget?.assetKey&&site?site.assets[imageTarget.assetKey]:undefined;
    if(!bytes||!imageTarget?.imagePath){setImagePreviewUrl('');return;}
    const copy=new Uint8Array(bytes.length);copy.set(bytes);
    const url=URL.createObjectURL(new Blob([copy.buffer],{type:assetMime(imageTarget.imagePath)}));
    setImagePreviewUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[site,imageTarget?.assetKey,imageTarget?.imagePath]);
  const liveHtml=useMemo(()=>{if(!live||!site)return '';try{return livePreview(site);}catch{return '';}},[live,site]);
  useEffect(()=>{if(!live)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setLive(false);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[live]);
  const previewHead=useMemo(()=>(preview?.html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]||''),[preview?.html]);
  useEffect(()=>{toolRef.current=tool;const doc=previewFrame.current?.contentDocument;if(doc?.body){doc.body.style.cursor=tool==='move'?'grab':'';doc.body.style.userSelect=tool==='move'?'none':'';}
    if(tool!=='select')clearHandles(doc);else if(selectedRef.current)drawResize(selectedRef.current);},[tool]);
  const layers=useMemo(()=>site?htmlLayerOutline(site.html):[],[site]);
  const sections=useMemo(()=>{try{return site?listSections(site.html):[];}catch{return [];}},[site]);
  const sectionsRef=useRef(sections);sectionsRef.current=sections;
  const activeSection=sectionForIndex(sections,selected);
  const activeLayer=layers.find(layer=>layer.index===selected)||
    (activeSection&&activeSection.index===selected?{index:selected,tag:activeSection.tag,label:activeSection.name,depth:0,id:''}:undefined);
  useEffect(()=>()=>preview?.revoke(),[preview]);
  // Doble marco: la nueva versión se pinta en un marco oculto y solo se muestra cuando ya está lista (sin parpadeo).
  const frameA=useRef<HTMLIFrameElement>(null),frameB=useRef<HTMLIFrameElement>(null);
  const [frameHtml,setFrameHtml]=useState<[string,string]>(['','']);
  const [activeFrame,setActiveFrame]=useState(0);
  const pendingFrameRef=useRef<number|null>(null);
  const frameVersion=useRef(0);
  useEffect(()=>{
    const html=preview?.html||'';
    if(!html)return;
    const target=frameHtml[activeFrame]===''?activeFrame:1-activeFrame;
    pendingFrameRef.current=target;
    frameVersion.current+=1;
    const versioned=html+'<!--wayup-v'+frameVersion.current+'-->';
    setFrameHtml(old=>{const next=[...old] as [string,string];next[target]=versioned;return next;});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[preview?.html]);
  function frameLoaded(i:number){
    // El marco visible vuelve a montarse (al volver del modo Código o de otro paso): se reconecta.
    if(pendingFrameRef.current===null&&i===activeFrame){
      const el=(i===0?frameA:frameB).current;
      if(el){(previewFrame as {current:HTMLIFrameElement|null}).current=el;previewLoaded();}
      return;
    }
    if(pendingFrameRef.current!==i)return;
    const el=(i===0?frameA:frameB).current;
    if(!el)return;
    const doc=el.contentDocument,win=el.contentWindow;
    // Antes de mostrarla: tipografías listas (máx. 0,8 s) y scroll restaurado en el marco oculto.
    const imagesReady=doc?Promise.all(Array.from(doc.images).slice(0,40).map(img=>img.decode().catch(()=>undefined))):Promise.resolve();
    const fontsReady=Promise.race([Promise.all([doc?.fonts?.ready,imagesReady]),new Promise(r=>setTimeout(r,800))]);
    void fontsReady.then(()=>{
      if(pendingFrameRef.current!==i)return; // llegó otra versión mientras tanto
      pendingFrameRef.current=null;
      (previewFrame as {current:HTMLIFrameElement|null}).current=el;
      previewLoaded();
      if(win)win.scrollTo({left:scrollRef.current.x,top:scrollRef.current.y,behavior:'instant' as ScrollBehavior});
      win?.requestAnimationFrame(()=>setActiveFrame(i));
    });
  }
  useEffect(()=>{void listSavedSites().then(setSavedSites).catch(()=>setNotice('No se pudo abrir la biblioteca local de proyectos.'));},[]);
  const changeHtml=useCallback((html:string)=>{
    if(!site||html===site.html)return;
    setPast(old=>[...old.slice(-49),{html:site.html,assets:site.assets,parked:site.parked}]);setFuture([]);
    setSite(old=>old?{...old,html,updatedAt:Date.now()}:old);
    setDraftHtml(html);setDirty(true);setSelected(null);selectedRef.current=null;setElementInfo(null);setCanvasMenu(null);setMulti([]);
  },[site]);
  const changeSite=(loaded:SiteBundle)=>{
    scrollRef.current={x:0,y:0};
    // Claves estables de sección (data-wc-section) para que el Explorador opere sobre el HTML real.
    let value=loaded;
    try{const html=ensureSectionKeys(loaded.html);if(html!==loaded.html)value={...loaded,html};}catch{}
    setSite(value);setDraftHtml(value.html);setPast([]);setFuture([]);setDirty(false);
    setSelected(null);setNotice('');setPostSavePrompt(false);setView('preview');setStage('editor');
  };
  const undo=()=>{
    if(!site||!past.length)return;
    const previous=past[past.length-1];setPast(past.slice(0,-1));setFuture(v=>[{html:site.html,assets:site.assets,parked:site.parked},...v]);
    setSite({...site,html:previous.html,assets:previous.assets,parked:previous.parked});setDraftHtml(previous.html);setDirty(true);setSelected(null);
  };
  const redo=()=>{
    if(!site||!future.length)return;
    const [next,...rest]=future;setFuture(rest);setPast(v=>[...v,{html:site.html,assets:site.assets,parked:site.parked}].slice(-50));
    setSite({...site,html:next.html,assets:next.assets,parked:next.parked});setDraftHtml(next.html);setDirty(true);setSelected(null);
  };
  /** Cambia un archivo de texto del proyecto (p. ej. css/styles.css) con historial. */
  const changeAsset=(path:string,text:string)=>{
    if(!site)return;
    const bytes=strToU8(text.slice(0,2_000_000));
    setPast(old=>[...old.slice(-49),{html:site.html,assets:site.assets,parked:site.parked}]);setFuture([]);
    setSite(old=>old?{...old,assets:{...old.assets,[path]:bytes},updatedAt:Date.now()}:old);
    setDirty(true);
  };
  const cssFiles=useMemo(()=>site?Object.keys(site.assets).filter(p=>/\.css$/i.test(p)).sort():[],[site]);
  const PAGE_CSS='__page__';
  const PAGE_JS='__js__';
  const readPageCss=(html:string)=>new DOMParser().parseFromString(html,'text/html').head.querySelector('style[data-wc-page-css]')?.textContent||'';
  const readPageJs=(html:string)=>(new DOMParser().parseFromString(html,'text/html').body.querySelector('script[data-wc-page-js]')?.textContent||'').replace(/<\\\/script/gi,'</script');
  const jsFiles=useMemo(()=>site?Object.keys(site.assets).filter(p=>/\.m?js$/i.test(p)).sort():[],[site]);
  const openCodeFile=(file:string)=>{
    if(!site)return;
    setCodeFile(file);
    if(file==='__html__')setDraftHtml(site.html);
    else if(file===PAGE_CSS)setDraftCode(readPageCss(site.html));
    else if(file===PAGE_JS)setDraftCode(readPageJs(site.html));
    else setDraftCode(strFromU8(site.assets[file]||new Uint8Array()));
  };
  /** Aplica el contenido de la pestaña de código abierta. */
  const applyCode=():boolean=>{
    if(!site)return false;
    if(codeFile==='__html__'){if(draftHtml!==site.html)changeHtml(draftHtml);return true;}
    if(codeFile===PAGE_CSS){
      const error=validateCssSource(draftCode);
      if(error){setNotice(error);return false;}
      if(draftCode!==readPageCss(site.html)){changeHtml(setPageCss(site.html,draftCode));setNotice('CSS personalizado aplicado al proyecto.');}
      return true;
    }
    if(codeFile===PAGE_JS){
      if(draftCode!==readPageJs(site.html)){changeHtml(setPageJs(site.html,draftCode));setNotice('Script propio guardado. Pruébalo con «En vivo».');}
      return true;
    }
    if(draftCode!==strFromU8(site.assets[codeFile]||new Uint8Array())){changeAsset(codeFile,draftCode);setNotice(codeFile+' actualizado.');}
    return true;
  };
  async function importFile(file:File){
    setBusy(true);setFileError('');
    try{
      if(file.size>25_000_000)throw Error('El archivo supera el límite de 25 MB.');
      const buffer=await file.arrayBuffer();
      const site=file.name.toLowerCase().endsWith('.zip')?siteFromZip(new Uint8Array(buffer)):
        siteFromHtml(fileByte(new Uint8Array(buffer)),file.name.replace(/\.html?$/i,''));
      changeSite(site);
    }catch(error){setFileError(error instanceof Error?error.message:'No se pudo importar esta web.');}
    finally{setBusy(false);if(fileInput.current)fileInput.current.value='';}
  }
  async function onSave(){
    if(!site)return;
    setBusy(true);
    try{
      const saved=await saveSite(site);
      setSite(saved);setDirty(false);setNotice('Versión '+saved.version+' guardada en este dispositivo.');
      if(saved.version===1 && !saved.agent)setPostSavePrompt(true);
      setSavedSites(await listSavedSites());
    }catch{setNotice('No fue posible guardar la web. Descarga una copia ZIP para no perder cambios.');}
    finally{setBusy(false);}
  }
  async function refreshCloud(){
    setCloudBusy(true);
    try{const projects=await cloudListSites();setCloudItems(projects);setCloudInfo('Nube conectada · Proyectos privados de tu cuenta');}
    catch{setCloudItems([]);setCloudInfo('Nube no disponible: inicia sesión y comprueba los bindings de Studio.');}
    finally{setCloudBusy(false);}
  }
  async function openCloudSite(item:CloudSiteSummary){
    setBusy(true);
    try{changeSite(await cloudLoadSite(item));setNotice('Proyecto recuperado desde el almacenamiento privado.');}
    catch(error){setNotice(error instanceof Error?error.message:'No se pudo abrir la versión remota.');}
    finally{setBusy(false);}
  }
  async function onCloudSave(){
    if(!site)return;
    setBusy(true);
    try{
      const remote=await cloudSaveSite(site);
      const local=await saveSite(remote);
      setSite(local);setDirty(false);
      setSavedSites(await listSavedSites());
      await refreshCloud();
      setNotice('Proyecto guardado de forma privada en la nube · versión '+remote.cloud?.version+'.');
      if(!site.cloud&&!site.agent)setPostSavePrompt(true);
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo guardar en la nube. La copia local permanece disponible.');}
    finally{setBusy(false);}
  }
  function createLocalWeb(){
    setFileError('');
    try{
      const html=starterHtml(form as Parameters<typeof starterHtml>[0]);
      const draft=siteFromHtml(html,form.name.trim());
      changeSite({...draft,source:'generated'});
      setNotice('Web creada a partir de tu briefing. Puedes editar cada elemento, su código y exportar el ZIP.');
    }catch(error){setFileError(error instanceof Error?error.message:'No se pudo crear la web.');}
  }
  const [webAIReady,setWebAIReady]=useState(false);
  const [webAIReason,setWebAIReason]=useState('');
  const refreshWebAI=useCallback(async()=>{
    try{
      const response=await fetch('/studio-api/webcreator/status',{cache:'no-store',credentials:'same-origin'});
      const data=await response.json().catch(()=>null);
      setWebAIReady(response.ok&&data?.configured===true&&data?.authorized===true);
      setWebAIReason(String(data?.reason||'').slice(0,240));
    }catch{setWebAIReady(false);setWebAIReason('No se pudo comprobar el motor IA de Studio.');}
  },[]);
  useEffect(()=>{if(stage==='create')void refreshWebAI()},[stage,refreshWebAI]);
  async function createWeb(direction:Direction|null=null,photos:ClientPhoto[]=[],style:{notes:string;css:string;js?:string}={notes:'',css:''}){
    if(form.name.trim().length<2||form.services.trim().length<20){
      setFileError('Introduce el nombre del negocio y al menos 20 caracteres sobre sus servicios.');return;
    }
    setFileError('');setBusy(true);
    const startedAt=Date.now();
    setGenStatus({message:'Enviando el encargo al motor IA…',startedAt});
    const onProgress=(message:string)=>setGenStatus({message,startedAt});
    try{
      // Fotos del cliente: rutas del proyecto que la IA debe usar; los archivos se añaden al proyecto (y al ZIP).
      const assets=photos.slice(0,8).map((photo,i)=>{
        const mime=photo.dataUrl.slice(5,photo.dataUrl.indexOf(';'));
        const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
        const bytes=Uint8Array.from(atob(photo.dataUrl.split(',')[1]||''),c=>c.charCodeAt(0));
        const alt=(photo.note||photo.description||photo.name.replace(/\.[a-z0-9]+$/i,'')).replace(/["<>]/g,'').slice(0,120);
        return {path:'wayup-media/foto-'+(i+1)+'-'+crypto.randomUUID().slice(0,6)+'.'+ext,bytes,alt};
      });
      const photoBrief=assets.length?'\n\nFOTOS REALES DEL CLIENTE (OBLIGATORIO usarlas TODAS en secciones adecuadas, con estas rutas exactas en <img src="...">, alt descriptivo y object-fit:cover):\n'+
        assets.map(a=>'- '+a.path+' — '+a.alt).join('\n'):'';
      const styleBrief=style.notes.trim()?'\n\nINDICACIONES DE ESTILO DEL CLIENTE (prioritarias sobre la dirección general):\n'+style.notes.trim().slice(0,3000):'';
      const cssBrief=style.css.trim()?'\n\nEl cliente aportará su propio CSS, que se añadirá al final: no lo contradigas ni lo dupliques.':'';
      const jsBrief=style.js?.trim()?'\n\nEl cliente aportará su propio JavaScript, que se añadirá al final del <body>: no dupliques lo que ya hace. Su código empieza así:\n'+style.js.trim().slice(0,600):'';
      let html=await streamGeneratedWeb(briefFrom(form)+photoBrief+styleBrief+cssBrief+jsBrief,onProgress,direction);
      const ai=await fillAiImages(html,onProgress);
      html=ai.html;
      // Revisión visual: capturas de cada sección → notas del director de arte → CSS de corrección. Nunca bloquea la entrega.
      let review={notes:0,fixed:false};
      try{
        const r=await visualReview(html,{...ai.assets,...Object.fromEntries(assets.map(a=>[a.path,a.bytes]))},onProgress);
        html=r.html;review=r;
      }catch(e){console.warn('Revisión visual omitida',e);}
      if(style.css.trim())html=appendCustomCss(html,style.css);
      if(style.js?.trim())html=setPageJs(html,style.js);
      // Si la IA se ha dejado alguna foto, se añade en una galería para no perder ninguna.
      const missing=assets.filter(a=>!html.includes(a.path));
      if(missing.length)html=insertSnippet(html,null,'<section data-wc-section="galeria-fotos" data-wc-name="Galería" id="galeria-fotos" style="padding:72px 6%;max-width:1200px;margin:0 auto"><h2 style="margin:0 0 24px">Galería</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">'+
        missing.map(a=>'<img src="'+a.path+'" alt="'+a.alt+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px">').join('')+'</div></section>','after').html;
      const generated=siteFromHtml(html,form.name.trim());
      const withPhotos={...generated,assets:{...generated.assets,...ai.assets,...Object.fromEntries(assets.map(a=>[a.path,a.bytes]))}};
      changeSite({...withPhotos,source:'generated'});
      const notes=[assets.length?assets.length+' foto(s) tuyas incluidas'+(missing.length?' ('+missing.length+' en una galería)':''):'',
        ai.made?ai.made+' fotografía(s) creadas con IA':'',
        ai.real?ai.real+' foto(s) reales de Pixabay':'',
        review.fixed?'revisión visual: '+review.notes+' bloque(s) corregidos':review.notes===0?'':'revisión visual sin cambios',ai.failed?ai.failed+' imagen(es) pendientes: sustitúyelas desde Propiedades':''].filter(Boolean);
      if(notes.length)setNotice(notes.join(' · ')+'.');
    }catch(error){
      setFileError(error instanceof Error?error.message:'Error al crear la web.');
      setNotice('El editor local sigue disponible. Comprueba el estado del motor IA y reintenta.');
    }finally{setBusy(false);setGenStatus(null);}
  }

  function selectLayer(index:number,scroll=true){
    const element=previewFrame.current?.contentDocument?.querySelector<HTMLElement>('[data-wayup-edit="'+index+'"]');
    if(!element)return;
    selectedRef.current?.removeAttribute('data-wayup-selected');
    if(multiRef.current.length){
      for(const el of Array.from(element.ownerDocument.querySelectorAll('[data-wayup-selected]')))el.removeAttribute('data-wayup-selected');
      setMulti([]);
    }
    element.dataset.wayupSelected='true';
    selectedRef.current=element;
    setSelected(index);
    setSelectedValues({
      text:element.children.length?'':element.textContent?.slice(0,5000)||'',
      color:element.style.color||'#ffffff',
      background:element.style.backgroundColor||'transparent',
      fontSize:element.style.fontSize||'16px',
      href:element.getAttribute('href')||'',
      alt:element.getAttribute('alt')||'',
      width:element.style.width||'',height:element.style.height||'',
      padding:element.style.padding||'',margin:element.style.margin||'',
      radius:element.style.borderRadius||'',fontWeight:element.style.fontWeight||'',
      fontFamily:element.style.fontFamily||'',textAlign:element.style.textAlign||'',
      posX:String(readTranslate(element.style.translate).x),
      posY:String(readTranslate(element.style.translate).y)
    });
    try{
      const cs=element.ownerDocument.defaultView!.getComputedStyle(element);
      const inline:Record<string,string>={},computed:Record<string,string>={};
      for(const prop of [...EDITABLE_STYLE_PROPS,'border-top-width','border-top-color','border-top-left-radius']){
        inline[prop]=element.style.getPropertyValue(prop);computed[prop]=cs.getPropertyValue(prop);
      }
      setElementInfo({index,tag:element.tagName,textEditable:isTextEditable(element),text:element.textContent||'',inline,computed,
        attrs:{href:element.getAttribute('href')||'',target:element.getAttribute('target')||'',alt:element.getAttribute('alt')||'',
          id:element.id||'',title:element.getAttribute('title')||'',ariaLabel:element.getAttribute('aria-label')||''}});
    }catch{setElementInfo(null);}
    const currentSite=siteRef.current;
    const iconTarget=currentSite?resolveSymbolTarget(currentSite.html,index):null;
    const photoTarget=currentSite?resolveImageTarget(currentSite,index):null;
    if(iconTarget){
      setInspectorTab('symbol');
      setInspectorOpen(true);
      setSymbolQuery('');
    }else if(photoTarget&&(photoTarget.kind==='item'||photoTarget.kind==='section')){
      setInspectorTab('image');
      setInspectorOpen(true);
    }else setInspectorTab('properties');
    if(scroll)element.scrollIntoView({block:'center',behavior:'smooth'});
    if(toolRef.current==='select')drawResize(element);
  }
  /** Tiradores de redimensionado: se ven en vivo y se guardan al soltar (un paso de deshacer). */
  function drawResize(element:HTMLElement){
    const doc=element.ownerDocument;
    const index=Number(element.dataset.wayupEdit);
    drawHandles(doc,element,styles=>{
      if(!siteRef.current)return;
      const dims=[styles.width,styles.height].filter(Boolean).join(' × ');
      tryEdit(()=>setStyles(siteRef.current!.html,index,styles),
        (styles['font-size']?'Escalado: letra '+styles['font-size']+(dims?' · '+dims:''):'Tamaño actualizado: '+dims)+'.');
    });
  }
  type DragItem={name:string;html:()=>string;section:boolean;parkedId?:string};
  const blockItem=(id:string):DragItem|null=>{const b=blockById(id);return b?{name:b.name,html:()=>instantiateBlock(b.html),section:isSectionBlock(b)}:null;};
  /** Arrastrar un bloque del panel (o un elemento aparcado) a la web con eventos de puntero:
   *  funciona igual en todos los navegadores, también cuando el cursor pasa por encima del iframe. */
  function dragItemStart(item:DragItem,e:React.PointerEvent<HTMLElement>){
    const source=e.currentTarget,start={x:e.clientX,y:e.clientY};
    e.preventDefault();
    try{source.setPointerCapture(e.pointerId);}catch{}
    let moved=false,ghost:HTMLDivElement|null=null,last:{index:number;position:'before'|'after'|'inside'}|null=null;
    const frame=previewFrame.current,doc=frame?.contentDocument||null;
    const move=(ev:PointerEvent)=>{
      if(!moved&&Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<5)return;
      if(!moved){
        moved=true;
        ghost=document.createElement('div');
        ghost.textContent=item.name;
        ghost.setAttribute('aria-hidden','true');
        ghost.style.cssText='position:fixed;z-index:200;pointer-events:none;padding:6px 12px;border-radius:8px;background:var(--wu-brand);color:#fff;font:600 12px/1.2 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:translate(12px,12px)';
        document.body.append(ghost);document.body.style.cursor='grabbing';
      }
      ghost!.style.left=ev.clientX+'px';ghost!.style.top=ev.clientY+'px';
      if(!frame||!doc)return;
      const r=frame.getBoundingClientRect();
      const inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
      if(!inside){last=null;hideIndicator(doc);return;}
      const drop=computeDrop(doc,(ev.clientX-r.left)/zoomRef.current,(ev.clientY-r.top)/zoomRef.current,{sectionLevel:item.section});
      last=drop?{index:drop.index,position:drop.position}:null;
      showIndicator(doc,drop,drop?(drop.position==='inside'?'Insertar dentro':drop.position==='before'?'Insertar antes':'Insertar después'):'');
    };
    const cleanup=()=>{source.removeEventListener('pointermove',move);source.removeEventListener('pointerup',up);source.removeEventListener('pointercancel',cancel);
      ghost?.remove();document.body.style.cursor='';if(doc)hideIndicator(doc);};
    const up=()=>{
      cleanup();
      if(!moved){if(!item.parkedId)insertItem(item);return;}
      if(last)insertItem(item,last);else setNotice('Suelta el elemento encima de la web para colocarlo.');
    };
    const cancel=()=>{moved=false;last=null;cleanup();};
    source.addEventListener('pointermove',move);source.addEventListener('pointerup',up);source.addEventListener('pointercancel',cancel);
  }
  const dragBlockStart=(id:string,e:React.PointerEvent<HTMLButtonElement>)=>{const it=blockItem(id);if(it)dragItemStart(it,e);};
  const insertBlock=(id:string,drop?:{index:number;position:'before'|'after'|'inside'})=>{const it=blockItem(id);if(it)insertItem(it,drop);};
  /** Inserta un bloque o un elemento aparcado en la posición indicada o junto a la selección. */
  function insertItem(item:DragItem,drop?:{index:number;position:'before'|'after'|'inside'}){
    const current=siteRef.current;
    if(!current)return;
    let index:number|null=drop?.index??selected;
    let position=drop?.position??'after';
    if(!drop&&index!==null){
      const el=previewFrame.current?.contentDocument?.querySelector<HTMLElement>('[data-wayup-edit="'+index+'"]');
      if(el&&!item.section&&canContain(el)&&el.children.length===0)position='inside';
      if(el&&item.section){const s=el.closest<HTMLElement>('section,header,footer,[data-wc-section]');if(s?.dataset.wayupEdit)index=Number(s.dataset.wayupEdit);position='after';}
    }
    try{
      const result=insertSnippet(current.html,index,item.html(),position);
      applyEdit(result,item.parkedId?item.name+' devuelto a la página desde la mesa de trabajo.':item.name+' añadido. Edítalo en Propiedades o con doble clic.');
      if(item.parkedId)setSite(old=>old?{...old,parked:(old.parked||[]).filter(x=>x.id!==item.parkedId)}:old);
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo insertar.');}
  }
  function dragParked(item:Parked,e:React.PointerEvent<HTMLDivElement>){
    if(e.button!==0)return;
    const el=e.currentTarget,start={x:e.clientX,y:e.clientY};
    e.preventDefault();
    try{el.setPointerCapture(e.pointerId);}catch{}
    const frame=previewFrame.current,doc=frame?.contentDocument||null;
    let moved=false,drop:{index:number;position:'before'|'after'|'inside'}|null=null,overPage=false;
    const move=(ev:PointerEvent)=>{
      const dx=ev.clientX-start.x,dy=ev.clientY-start.y;
      if(!moved&&Math.hypot(dx,dy)<4)return;
      moved=true;el.style.translate=(dx/zoomRef.current)+'px '+(dy/zoomRef.current)+'px';el.style.zIndex='30';
      if(!frame||!doc)return;
      const r=frame.getBoundingClientRect();
      overPage=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
      if(!overPage){drop=null;hideIndicator(doc);return;}
      const d=computeDrop(doc,(ev.clientX-r.left)/zoomRef.current,(ev.clientY-r.top)/zoomRef.current,{sectionLevel:/^<(section|header|footer|nav)\b/i.test(item.html)});
      drop=d?{index:d.index,position:d.position}:null;
      showIndicator(doc,d,d?(d.position==='inside'?'Devolver dentro':d.position==='before'?'Devolver antes':'Devolver después'):'');
    };
    const up=(ev:PointerEvent)=>{
      window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);
      try{el.releasePointerCapture(e.pointerId);}catch{}
      if(doc)hideIndicator(doc);
      const dx=ev.clientX-start.x,dy=ev.clientY-start.y;
      el.style.translate='';el.style.zIndex='';
      if(!moved)return;
      if(overPage){insertItem({name:item.name,html:()=>item.html,section:/^<(section|header|footer|nav)\b/i.test(item.html),parkedId:item.id},drop||undefined);return;}
      setSite(old=>old?{...old,parked:(old.parked||[]).map(x=>x.id===item.id?{...x,x:Math.round((x.x??24)+dx/zoomRef.current),y:Math.round((x.y??24)+dy/zoomRef.current)}:x)}:old);setDirty(true);
    };
    // Se escucha en toda la ventana: el soltar llega siempre, también sobre la página o fuera del lienzo.
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  }
  /** Mesa de trabajo: un elemento soltado fuera de la página se aparca (no se publica) y se puede devolver. */
  function parkElement(index:number,pos?:{x:number;y:number;w:number},prepared?:string){
    const current=siteRef.current;if(!current)return false;
    try{
      const html=prepared||copyElement(current.html,index);
      const holder=new DOMParser().parseFromString(html,'text/html').body.firstElementChild;
      const name=(holder?.getAttribute('data-wc-name')||holder?.getAttribute('aria-label')||(holder?.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)||holder?.tagName.toLowerCase()||'Elemento');
      const removed=removeElement(current.html,index);
      pendingIndexRef.current=null;
      changeHtml(removed.html);
      setSite(old=>old?{...old,parked:[...(old.parked||[]),{id:crypto.randomUUID(),name,html,...(pos||{})}].slice(-40)}:old);
      setNotice('«'+name+'» en la mesa de trabajo. Muévelo por la mesa o arrástralo a la página para devolverlo.');
      return true;
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo aparcar.');return false;}
  }
  /** Añade o quita un elemento de la selección múltiple (la selección principal se mantiene). */
  function toggleMulti(index:number){
    const doc=previewFrame.current?.contentDocument;if(!doc)return;
    if(index===selected)return;
    const el=doc.querySelector<HTMLElement>('[data-wayup-edit="'+index+'"]');if(!el)return;
    const has=multiRef.current.includes(index);
    if(has)el.removeAttribute('data-wayup-selected');else el.dataset.wayupSelected='true';
    const next=has?multiRef.current.filter(i=>i!==index):[...multiRef.current,index];
    setMulti(next);
    if(next.length)setNotice((next.length+1)+' elementos seleccionados · Ctrl+G para agrupar · Supr para eliminar');
  }
  const selection=()=>selected===null?[]:[selected,...multi.filter(i=>i!==selected)];
  function groupSelection(){
    const current=siteRef.current;const ids=selection();
    if(!current)return;
    if(ids.length<2){setNotice('Selecciona varios elementos con Mayús + clic para agruparlos.');return;}
    setMulti([]);
    tryEdit(()=>groupElements(current.html,ids),'Grupo creado con '+ids.length+' elementos. Ctrl+Mayús+G para separar.');
  }
  function ungroupSelection(){
    const current=siteRef.current;if(!current||selected===null)return;
    tryEdit(()=>ungroupElement(current.html,selected),'Grupo separado.');
  }
  /** Aplica una operación sobre el HTML real y conserva la selección resultante tras recargar la vista. */
  function applyEdit(result:EditResult,message:string){
    pendingIndexRef.current=result.index;
    changeHtml(result.html);
    if(message)setNotice(message);
  }
  function tryEdit(fn:()=>EditResult,message:string){
    try{applyEdit(fn(),message);}catch(error){setNotice(error instanceof Error?error.message:'No se pudo aplicar el cambio.');}
  }
  function startTextEdit(index:number){
    const doc=previewFrame.current?.contentDocument;
    const el=doc?.querySelector<HTMLElement>('[data-wayup-edit="'+index+'"]');
    if(!doc||!el||!site)return;
    if(!isTextEditable(el)){setNotice('Este bloque contiene otros elementos: haz doble clic sobre un texto concreto.');return;}
    finishTextEdit(false);
    editingRef.current={el,index,original:el.innerHTML};
    el.dataset.wayupEditing='true';el.contentEditable='true';el.spellcheck=true;el.focus();
    const range=doc.createRange();range.selectNodeContents(el);const sel=doc.getSelection();sel?.removeAllRanges();sel?.addRange(range);
    setNotice('Editando texto · Intro guarda · Mayús+Intro salto de línea · Esc cancela · Ctrl+B / Ctrl+I / Ctrl+U dan formato');
  }
  function finishTextEdit(commit:boolean){
    const editing=editingRef.current;if(!editing)return;
    editingRef.current=null;
    const {el,index,original}=editing;
    el.removeAttribute('contenteditable');delete el.dataset.wayupEditing;
    const content=el.innerHTML;
    if(!commit||content===original){el.innerHTML=original;setNotice('');return;}
    if(!site)return;
    tryEdit(()=>setInlineContent(site.html,index,content),'Texto actualizado en el HTML.');
  }
  function runCanvasCommand(command:CanvasCommand){
    if(!site)return;
    const index=selected;
    if(command==='paste'||command==='paste-inside'){
      if(!clipboardRef.current){setNotice('Primero copia o corta un elemento.');return;}
      tryEdit(()=>pasteElement(site.html,index,clipboardRef.current,command==='paste-inside'?'inside':'after'),'Elemento pegado.');return;
    }
    if(index===null){setNotice('Selecciona primero un elemento de la web.');return;}
    if(command==='edit-text'){startTextEdit(index);return;}
    if(command==='copy'||command==='cut'){
      try{clipboardRef.current=copyElement(site.html,index);setHasClip(true);}catch(error){setNotice(error instanceof Error?error.message:'No se pudo copiar.');return;}
      if(command==='copy'){setNotice('Elemento copiado. Pégalo con Ctrl+V o desde el menú.');return;}
      tryEdit(()=>removeElement(site.html,index),'Elemento cortado. Pégalo donde quieras.');return;
    }
    if(command==='parent'){const parent=parentIndex(site.html,index);if(parent!==null)selectLayer(parent);return;}
    if(command==='hide'){
      try{const r=toggleHidden(site.html,index);applyEdit(r,r.hidden?'Elemento oculto: no aparecerá en la web publicada.':'Elemento visible de nuevo.');}
      catch(error){setNotice(error instanceof Error?error.message:'No se pudo ocultar.');}
      return;
    }
    if(command==='duplicate')tryEdit(()=>duplicateElement(site.html,index),'Elemento duplicado.');
    if(command==='group'){groupSelection();return;}
    if(command==='ungroup'){ungroupSelection();return;}
    if(command==='delete'&&multi.length){
      const ids=selection().sort((a,b)=>b-a);
      tryEdit(()=>{let h=site.html;for(const i of ids)h=removeElement(h,i).html;return {html:h,index:null};},ids.length+' elementos eliminados. Ctrl+Z para deshacer.');
      return;
    }
    if(command==='delete')tryEdit(()=>removeElement(site.html,index),'Elemento eliminado. Ctrl+Z para deshacer.');
    if(command==='up'||command==='down')tryEdit(()=>moveElement(site.html,index,command),'Orden actualizado.');
  }
  // Atajos de teclado del editor (no se activan mientras escribes en un campo o editas un texto).
  useEffect(()=>{
    const up=(e:KeyboardEvent)=>{if(e.code==='Space'){spaceHeldRef.current=false;if(!panRef.current){document.body.style.cursor='';const d=previewFrame.current?.contentDocument;if(d?.body)d.body.style.cursor=toolRef.current==='move'?'grab':'';}}};
    window.addEventListener('keyup',up);return()=>window.removeEventListener('keyup',up);
  },[]);
  keyRef.current=(e:KeyboardEvent)=>{
    if(live)return; // en «En vivo» no hay atajos de edición (Esc la cierra)
    if(e.code==='Space'&&stage==='editor'&&view==='preview'&&!editingRef.current){
      const t=e.target as HTMLElement|null;
      if(!(t&&(t.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(t.tagName)))){
        e.preventDefault();
        if(!spaceHeldRef.current){spaceHeldRef.current=true;document.body.style.cursor='grab';const d=previewFrame.current?.contentDocument;if(d?.body)d.body.style.cursor='grab';}
        return;
      }
    }
    if(stage!=='editor'||view!=='preview'||seoOpen)return;
    const t=e.target as HTMLElement|null;
    if(editingRef.current){
      if(e.key==='Escape'){e.preventDefault();finishTextEdit(false);}
      else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finishTextEdit(true);}
      return;
    }
    if(t&&(t.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t.tagName)))return;
    const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    const go=(fn:()=>void)=>{e.preventDefault();fn();};
    if(mod&&k==='z'&&!e.shiftKey)return go(undo);
    if(mod&&(k==='y'||(k==='z'&&e.shiftKey)))return go(redo);
    if(mod&&k==='s')return go(()=>void onSave());
    if(mod&&k==='c')return go(()=>runCanvasCommand('copy'));
    if(mod&&k==='x')return go(()=>runCanvasCommand('cut'));
    if(mod&&k==='v')return go(()=>runCanvasCommand('paste'));
    if(mod&&k==='d')return go(()=>runCanvasCommand('duplicate'));
    if(mod&&k==='g'&&e.shiftKey)return go(ungroupSelection);
    if(mod&&k==='g')return go(groupSelection);
    if(mod&&k==='h')return go(()=>runCanvasCommand('hide'));
    if(!mod&&!e.altKey&&k==='v')return go(()=>setTool('select'));
    if(!mod&&!e.altKey&&k==='m')return go(()=>setTool('move'));
    if(!mod&&!e.altKey&&k==='i')return go(()=>setTool('insert'));
    if(selected===null)return;
    if(k==='delete'||k==='backspace')return go(()=>runCanvasCommand('delete'));
    if(k==='enter')return go(()=>runCanvasCommand('edit-text'));
    if(k==='escape')return go(()=>runCanvasCommand('parent'));
    if(e.altKey&&k==='arrowup')return go(()=>runCanvasCommand('up'));
    if(e.altKey&&k==='arrowdown')return go(()=>runCanvasCommand('down'));
  };
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>keyRef.current(e);
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);
  function previewLoaded(){
    const doc=previewFrame.current?.contentDocument;
    if(!doc)return;
    if(/^(light|dark)$/.test(doc.documentElement.getAttribute('data-theme')||''))doc.documentElement.setAttribute('data-theme',webThemeRef.current);
    doc.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();setZoom(z=>clampZoom(z*(e.deltaY<0?1.1:1/1.1)));},{passive:false});
    const win=doc.defaultView;
    if(win){
      const {x,y}=scrollRef.current;
      const restore=()=>win.scrollTo({left:x,top:y,behavior:'instant' as ScrollBehavior});
      restore();win.requestAnimationFrame(restore);win.setTimeout(restore,120);
      win.addEventListener('scroll',()=>{scrollRef.current={x:win.scrollX,y:win.scrollY};},{passive:true});
    }
    if(doc.body){doc.body.style.cursor=moveModeRef.current?'grab':'';doc.body.style.userSelect=moveModeRef.current?'none':'';}
    doc.addEventListener('click',event=>{
      if(spaceHeldRef.current){event.preventDefault();event.stopPropagation();return;} // estaba desplazándose con la mano
      if(editingRef.current&&editingRef.current.el.contains(event.target as Node))return;
      // Las pestañas (solo CSS) se pueden cambiar en el editor para editar el contenido de cada una.
      const tabLabel=(event.target as Element).closest('label[data-wc-tab]');
      if(!tabLabel)event.preventDefault();
      event.stopPropagation();
      const element=(event.target as Element).closest<HTMLElement>('[data-wayup-edit]');
      if(!element)return;
      const index=Number(element.dataset.wayupEdit);
      if(Number.isSafeInteger(index)){if((event as MouseEvent).shiftKey&&selectedRef.current)toggleMulti(index);else selectLayer(index,false);} // sin desplazar: el elemento sigue bajo el cursor
    },true);
    doc.addEventListener('submit',event=>event.preventDefault(),true);
    const pending=pendingSectionRef.current;pendingSectionRef.current=null;
    if(pending){const target=sectionsRef.current.find(s=>s.key===pending);if(target)setTimeout(()=>selectLayer(target.index),0);}
    const pendingIndex=pendingIndexRef.current;pendingIndexRef.current=null;
    if(pendingIndex!==null&&!pending)setTimeout(()=>selectLayer(pendingIndex,false),0);
    doc.addEventListener('keydown',event=>keyRef.current(event),true);
    doc.addEventListener('dblclick',event=>{
      if(moveModeRef.current)return;
      const element=(event.target as Element).closest<HTMLElement>('[data-wayup-edit]');
      if(!element)return;
      event.preventDefault();
      const index=Number(element.dataset.wayupEdit);
      if(Number.isSafeInteger(index)){selectLayer(index,false);startTextEdit(index);}
    },true);
    doc.addEventListener('focusout',event=>{
      if(editingRef.current&&event.target===editingRef.current.el)finishTextEdit(true);
    },true);
    doc.addEventListener('contextmenu',event=>{
      if(editingRef.current)return; // menú nativo para corregir o copiar mientras se edita texto
      const element=(event.target as Element).closest<HTMLElement>('[data-wayup-edit]');
      if(!element)return;
      event.preventDefault();
      const index=Number(element.dataset.wayupEdit);
      if(!Number.isSafeInteger(index))return;
      selectLayer(index,false);
      const rect=previewFrame.current!.getBoundingClientRect();
      setCanvasMenu({x:rect.left+event.clientX*zoomRef.current,y:rect.top+event.clientY*zoomRef.current});
    },true);
    type Moving={element:HTMLElement;index:number;pointerId:number;clientX:number;clientY:number;x:number;y:number;moved:boolean;free:boolean;
      prev:{translate:string;opacity:string;pointerEvents:string;boxShadow:string;zIndex:string;position:string;transition:string}};
    let moving:Moving|null=null;
    const clamp=(n:number)=>Math.max(-6000,Math.min(6000,Math.round(n)));
    // El navegador (sobre todo Firefox) inicia su propio «arrastre nativo» de enlaces e imágenes: lo bloqueamos dentro de la vista.
    doc.addEventListener('dragstart',event=>event.preventDefault(),true);
    // Rueda pulsada o espacio + arrastrar: desplazarse por la página (antes que cualquier otra herramienta).
    doc.addEventListener('pointerdown',event=>{if(isPanStart(event)){startPan(event);event.stopImmediatePropagation();}},true);
    doc.addEventListener('mousedown',event=>{if(event.button===1)event.preventDefault();},true);
    doc.addEventListener('auxclick',event=>{if(event.button===1)event.preventDefault();},true);
    doc.addEventListener('keyup',event=>{if(event.code==='Space'){spaceHeldRef.current=false;if(doc.body)doc.body.style.cursor=toolRef.current==='move'?'grab':'';}},true);
    // Mayús + clic sirve para seleccionar varios: que no seleccione texto a la vez.
    doc.addEventListener('mousedown',event=>{if(event.shiftKey)event.preventDefault();},true);
    doc.addEventListener('mousedown',event=>{if(toolRef.current==='move')event.preventDefault();},true);
    doc.addEventListener('pointerdown',event=>{
      if(toolRef.current!=='move'||event.button!==0)return;
      const element=(event.target as Element).closest<HTMLElement>('[data-wayup-edit]');
      if(!element||element===doc.body)return;
      const index=Number(element.dataset.wayupEdit);
      if(!Number.isSafeInteger(index))return;
      const position=readTranslate(element.style.translate);
      const st=element.style;
      moving={element,index,pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,
        x:position.x,y:position.y,moved:false,free:event.altKey||moveStyleRef.current==='libre',
        prev:{translate:st.translate,opacity:st.opacity,pointerEvents:st.pointerEvents,boxShadow:st.boxShadow,zIndex:st.zIndex,position:st.position,transition:st.transition}};
      event.preventDefault();
      try{doc.documentElement.setPointerCapture(event.pointerId);}catch{}
      selectLayer(index,false);
      clearHandles(doc);
    },true);
    doc.addEventListener('pointermove',event=>{
      if(!moving||event.pointerId!==moving.pointerId)return;
      const dx=event.clientX-moving.clientX,dy=event.clientY-moving.clientY;
      if(!moving.moved&&Math.hypot(dx,dy)<4)return;
      const st=moving.element.style;
      if(!moving.moved){
        moving.moved=true;
        // El elemento sigue al cursor (como en un editor de diseño) mientras se decide dónde cae.
        st.setProperty('transition','none','important');st.setProperty('pointer-events','none','important');
        st.setProperty('opacity','0.82','important');st.setProperty('box-shadow','0 18px 40px rgba(0,0,0,.35)','important');
        if(!st.position||st.position==='static')st.setProperty('position','relative','important');
        st.setProperty('z-index','2147483000','important');
        doc.body.style.cursor='grabbing';
      }
      st.setProperty('translate',clamp(moving.x+dx)+'px '+clamp(moving.y+dy)+'px','important');
      if(moving.free){hideIndicator(doc);return;}
      const drop=computeDrop(doc,event.clientX,event.clientY,{exclude:moving.element});
      showIndicator(doc,drop,drop?(drop.position==='inside'?'Soltar dentro':drop.position==='before'?'Soltar antes':'Soltar después'):'');
    },true);
    const finishMove=(event:PointerEvent|null)=>{
      if(!moving)return;
      const state=moving;moving=null;
      try{doc.documentElement.releasePointerCapture(state.pointerId);}catch{}
      const st=state.element.style;
      // Restaura el aspecto del arrastre; la posición solo vuelve atrás si el movimiento no se aplica
      // (así el elemento no «salta» a su sitio original mientras se prepara la nueva versión de la vista).
      const restore=(keepPosition:boolean)=>{
        for(const [k,v] of Object.entries(state.prev)){
          if(keepPosition&&k==='translate')continue;
          const prop=k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());if(v)st.setProperty(prop,v);else st.removeProperty(prop);
        }
      };
      doc.body.style.cursor=toolRef.current==='move'?'grab':'';
      hideIndicator(doc);
      if(!state.moved||!event||!siteRef.current){restore(false);return;}
      const current=siteRef.current;
      // Fuera de la página (en los laterales del lienzo): se aparca en la mesa de trabajo.
      const vw=doc.defaultView?.innerWidth||0,vh=doc.defaultView?.innerHeight||0;
      if(event.clientX<0||event.clientY<0||event.clientX>vw||event.clientY>vh){
        restore(false);
        const fr=previewFrame.current?.getBoundingClientRect(),board=boardRef.current?.getBoundingClientRect();
        const w=Math.round(state.element.getBoundingClientRect().width);
        const z=zoomRef.current;
        const pos=fr&&board?{x:Math.round((fr.left+event.clientX*z-board.left)/z-Math.min(w,320)/2),y:Math.round((fr.top+event.clientY*z-board.top)/z-12),w}:undefined;
        let baked:string|undefined;
        try{baked=bakeStyles(state.element,copyElement(current.html,state.index));}catch{baked=undefined;}
        parkElement(state.index,pos,baked);return;
      }
      // Libertad total: si en «Ordenar» se suelta en una zona sin elementos, se coloca libremente ahí mismo.
      const drop=state.free?null:computeDrop(doc,event.clientX,event.clientY,{exclude:state.element});
      if(state.free||!drop){
        const x=clamp(state.x+event.clientX-state.clientX),y=clamp(state.y+event.clientY-state.clientY);
        restore(true);st.setProperty('translate',x+'px '+y+'px','important');
        // Un elemento «en línea» (span, em, a…) no se desplaza con translate: se pasa a inline-block, que se ve igual.
        const inline=doc.defaultView?.getComputedStyle(state.element).display==='inline';
        if(inline)st.setProperty('display','inline-block','important');
        try{
          let html=patchSelectedElement(current.html,state.index,{moveX:x,moveY:y});
          if(inline)html=setStyles(html,state.index,{display:'inline-block'}).html;
          applyEdit({html,index:state.index},'Elemento colocado libremente ('+x+', '+y+' px). Deshacer lo devuelve a su sitio.');
        }catch{restore(false);}
        return;
      }
      // En «Ordenar» se oculta hasta que aparece ya en su nuevo sitio (sin volver al original).
      try{
        const result=moveElementTo(current.html,state.index,drop.index,drop.position);
        restore(true);st.setProperty('opacity','0','important');
        applyEdit(result,'Elemento movido '+(drop.position==='inside'?'dentro del contenedor':drop.position==='before'?'antes':'después')+'.');
      }catch{
        // No se puede encajar ahí (p. ej. dentro de sí mismo o de un texto): se coloca libremente donde se soltó.
        const x=clamp(state.x+event.clientX-state.clientX),y=clamp(state.y+event.clientY-state.clientY);
        try{restore(true);st.setProperty('translate',x+'px '+y+'px','important');
          applyEdit({html:patchSelectedElement(current.html,state.index,{moveX:x,moveY:y}),index:state.index},'Elemento colocado donde lo soltaste.');}
        catch{restore(false);}
      }
    };
    doc.addEventListener('pointerup',event=>finishMove(event),true);
    doc.addEventListener('pointercancel',()=>finishMove(null),true);
    // Soltar bloques arrastrados desde el panel «Insertar».
    let dragSection=false;
    doc.addEventListener('dragenter',event=>{dragSection=false;event.preventDefault();},true);
    doc.addEventListener('dragover',event=>{
      if(!event.dataTransfer?.types.includes(BLOCK_MIME))return;
      event.preventDefault();event.dataTransfer.dropEffect='copy';
      dragSection=event.dataTransfer.types.includes(SECTION_MIME);
      const drop=computeDrop(doc,event.clientX,event.clientY,{sectionLevel:dragSection});
      showIndicator(doc,drop,drop?(drop.position==='inside'?'Insertar dentro':drop.position==='before'?'Insertar antes':'Insertar después'):'');
    },true);
    doc.addEventListener('dragleave',event=>{if(!event.relatedTarget)hideIndicator(doc);},true);
    doc.addEventListener('drop',event=>{
      const id=event.dataTransfer?.getData(BLOCK_MIME);
      hideIndicator(doc);
      if(!id)return;
      event.preventDefault();
      const block=blockById(id);if(!block)return;
      const drop=computeDrop(doc,event.clientX,event.clientY,{sectionLevel:isSectionBlock(block)});
      insertBlock(id,drop?{index:drop.index,position:drop.position}:undefined);
    },true);
  }
  function modifyStructure(action:'duplicate'|'remove'|'up'|'down'){
    if(!site||selected===null)return;
    try{
      if(action==='duplicate'){applyEdit(duplicateElement(site.html,selected),'Elemento duplicado.');return;}
      if(action==='up'||action==='down'){applyEdit(moveElement(site.html,selected,action),'Orden cambiado; puedes deshacerlo.');return;}
      applyEdit(removeElement(site.html,selected),'Elemento eliminado; puedes deshacerlo.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo modificar el bloque.');}
  }
  function onSectionAction(action:SectionAction){
    if(!site)return;
    try{
      const result=action.type==='add'?addSection(site.html,action.position,action.key):
        action.type==='duplicate'?duplicateSection(site.html,action.key):
        action.type==='remove'?removeSection(site.html,action.key):
        action.type==='rename'?renameSection(site.html,action.key,action.name):
        moveSection(site.html,action.key,action.type);
      pendingSectionRef.current=action.type==='remove'?null:result.key||null;
      changeHtml(result.html);
      setNotice(({add:action.type==='add'&&action.position==='inside'?'Bloque añadido dentro de la sección.':'Nueva sección añadida al documento.',
        duplicate:'Sección duplicada con identificadores únicos.',remove:'Sección eliminada. Puedes deshacerlo.',
        rename:'Sección renombrada.',up:'Sección movida arriba en el HTML.',down:'Sección movida abajo en el HTML.'} as Record<string,string>)[action.type]);
    }catch(error){pendingSectionRef.current=null;setNotice(error instanceof Error?error.message:'No se pudo modificar la sección.');}
  }
  async function changeImage(file:File){
    if(!site||selected===null)return;
    const target=resolveImageTarget(site,selected);
    if(!target)return;
    try{
      const image=attachLocalImage(site,selected,new Uint8Array(await file.arrayBuffer()));
      setPast(old=>[...old.slice(-49),{html:site.html,assets:site.assets,parked:site.parked}]);setFuture([]);
      pendingIndexRef.current=target.index;
      setSite(image);setDraftHtml(image.html);setDirty(true);
      setSelected(null);selectedRef.current=null;setElementInfo(null);
      setInspectorTab('image');
      setNotice('Fotografía asociada a «'+target.label+'». Se guardará dentro del proyecto y del ZIP.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo adjuntar la imagen.');}
  }
  function removeImage(){
    if(!site||selected===null)return;
    const target=resolveImageTarget(site,selected);
    if(!target)return;
    try{
      const next=removeLocalImage(site,selected);
      setPast(old=>[...old.slice(-49),{html:site.html,assets:site.assets,parked:site.parked}]);setFuture([]);
      pendingIndexRef.current=target.index;
      setSite(next);setDraftHtml(next.html);setDirty(true);
      setSelected(null);selectedRef.current=null;setElementInfo(null);
      setInspectorTab('image');
      setNotice('Fotografía eliminada de «'+target.label+'». Puedes deshacer el cambio.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo eliminar la fotografía.');}
  }
  function replaceSelectedSymbol(entry:SymbolEntry){
    if(!site||selected===null)return;
    const currentSvg=selectedRef.current?.querySelector('svg') as SVGSVGElement|null;
    const fitTransform=currentSvg?symbolFitTransform(entry,currentSvg):null;
    tryEdit(()=>replaceInlineSymbol(site.html,selected,entry,fitTransform),
      'Símbolo sustituido por «'+entry.name.replace(/-/g,' ')+'». Se han conservado su caja, color y tamaño visual.');
  }
  const patch=(changes:{text?:string;color?:string;background?:string;fontSize?:string;href?:string;alt?:string;width?:string;height?:string;padding?:string;margin?:string;radius?:string;fontWeight?:string;fontFamily?:string;textAlign?:string;moveX?:number;moveY?:number})=>{
    if(!site||selected===null)return;
    try{
      const next=patchSelectedElement(site.html,selected,changes);
      changeHtml(next);
      setNotice('Elemento actualizado en el HTML de la web.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo actualizar el elemento.');}
  };
  async function handleAgentLinked(agent:LinkedAgent){
    if(!site)return;
    const attached:SiteBundle={...site,agent,updatedAt:Date.now()};
    setSite(attached);setDirty(true);
    setNotice('El asistente se ha vinculado a esta web. Se añadirá al ZIP y HTML exportados.');
    try{
      let saved=attached;
      if(attached.cloud)saved=await cloudSaveSite(saved);
      saved=await saveSite(saved);
      setSite(saved);setDirty(false);
      setSavedSites(await listSavedSites());
      setNotice(saved.cloud?'Agente vinculado y guardado con la web en Cloudflare.':'Agente vinculado y guardado en este dispositivo.');
    }catch{
      setNotice('Agente vinculado en esta sesión, pero no se pudo guardar en este dispositivo. Descarga el ZIP ahora.');
    }
    setStage('export');setPostSavePrompt(false);
  }
  function exportHtml(){
    if(!site)return;
    const bytes=strToU8(htmlForExport(site));
    downloadBytes(bytes,cleanName(site.name)+'.html','text/html;charset=utf-8');
    setNotice('HTML descargado.');
  }
  function exportZip(){
    if(!site)return;
    try{
      const bytes=siteZip(site);
      downloadBytes(bytes,cleanName(site.name)+'.zip','application/zip');
      setNotice(site.agent?'ZIP descargado con web y agente vinculado.':'ZIP descargado con HTML y recursos actualizados.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo exportar.');}
  }
  const editInputs=(id:keyof typeof form,label:string,placeholder:string,required=false)=>(
    <label key={id} className="flex flex-col gap-1.5 text-[11px] text-mist">{label}
      <input className={BASE} value={form[id]} placeholder={placeholder}
        required={required} onChange={event=>setForm({...form,[id]:event.target.value})}/>
    </label>
  );
  return <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-app text-ink">
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-stroke bg-panel px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLockup size={32}/>
        {site&&<>
          <span className="hidden h-6 w-px bg-stroke md:block" aria-hidden/>
          <span className="hidden min-w-0 flex-col leading-tight md:flex">
            <span className="truncate text-[12.5px] font-semibold text-ink">{site.name}</span>
            <span className="flex items-center gap-1.5 text-[10px] text-faint">
              <span className={'h-1.5 w-1.5 rounded-full '+(dirty?'bg-amber-400':'bg-emerald-500')} aria-hidden/>
              {dirty?'Cambios sin guardar':site.cloud?'Guardado en la nube · v'+site.cloud.version:'Guardado en este dispositivo'}
            </span>
          </span>
        </>}
      </div>
      <nav aria-label="Pasos del proyecto" className="hidden items-center rounded-full border border-stroke bg-elevated p-1 lg:flex">
        {steps.map(([number,label],index)=>{
          const current=(stage==='home'||stage==='create'?0:stage==='editor'?1:stage==='agent'?2:3);
          return <span key={number} aria-current={index===current?'step':undefined}
            className={'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors '+(index===current?'bg-panel text-ink shadow-panel':index<current?'text-mist':'text-faint')}>
            <span className={'inline-flex h-[18px] w-[18px] items-center justify-center rounded-full font-mono text-[9.5px] '+(index===current?'bg-brand text-white':index<current?'bg-brandsoft text-brand':'border border-stroke')}>{index<current?<Check size={10}/>:index+1}</span>
            {label}
          </span>;
        })}
      </nav>
      <div className="flex items-center gap-1.5">
        <ThemeToggle/>
        {site&&<button onClick={()=>setStage('home')} className={btn}><FolderOpen size={14}/><span className="hidden sm:inline">Mis webs</span></button>}
        <button onClick={()=>setAgentsOpen(true)} className={btn} title="Gestionar tus agentes IA"><Bot size={14}/><span className="hidden sm:inline">Agentes IA</span></button>
        {onClose&&<button onClick={onClose} className={btn} aria-label="Cerrar"><X size={15}/></button>}
      </div>
    </header>
    {(notice||fileError)&&<div role="status" className={'pointer-events-none fixed bottom-5 left-1/2 z-[85] max-w-[min(680px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border px-4 py-2.5 text-[12px] shadow-pop '+(fileError?'border-red-500/40 bg-red-950/90 text-red-200':'border-stroke bg-panel text-ink')}>{fileError||notice}</div>}
    {(stage==='home'||stage==='create')&&<main className="scroll-subtle mx-auto w-full max-w-[1090px] flex-1 overflow-y-auto px-5 py-8 sm:px-9">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div><div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[.22em] text-brand">{stage==='create'?'Crear web':'Mis webs'}</div>
          <h1 className="font-display text-[clamp(34px,4.4vw,54px)] font-semibold leading-[1.02] tracking-[-.02em]">Una web real. <em className="font-medium text-brand">Tu diseño.</em> Tu agente.</h1>
          <p className="mt-3 max-w-[580px] text-[13px] leading-6 text-mist">Genera una web con IA, importa un proyecto HTML o ZIP, o empieza en blanco. Todo se edita sobre el código real y se exporta sin dependencias.</p></div>
        {stage==='create'&&<button onClick={()=>setStage('home')} className={btn}><ArrowLeft size={14}/> Volver</button>}
      </div>
      {stage==='home'?<>
        <div className="grid gap-4 md:grid-cols-3">
          <button onClick={()=>{setStage('create');setFileError('');}} className="group flex min-h-[176px] flex-col items-start gap-3 rounded-xl border border-brand/35 bg-brandsoft p-5 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
            <Sparkles size={25} className="text-brand"/>
            <span className="font-display text-[22px] font-semibold leading-none">Generar con IA</span>
            <span className="text-[12px] leading-5 text-mist">Briefing profesional, motor IA de Studio y apertura automática en el editor.</span>
            <span className="mt-auto text-[11px] font-semibold text-brand">Crear proyecto →</span>
          </button>
          <button onClick={()=>fileInput.current?.click()} className="group flex min-h-[176px] flex-col items-start gap-3 rounded-xl border border-stroke bg-panel p-5 text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-panel">
            <FileUp size={25} className="text-brand"/>
            <span className="font-display text-[22px] font-semibold leading-none">Importar una web</span>
            <span className="text-[12px] leading-5 text-mist">HTML o ZIP completo. Conserva CSS, imágenes, fuentes y estructura.</span>
            <span className="mt-auto text-[11px] font-semibold text-brand">Elegir archivo →</span>
          </button>
          <button onClick={()=>{
            const title='Mi nuevo proyecto';
            changeSite(siteFromHtml('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{font:16px system-ui;margin:0;background:#f8f9fc;color:#151a26}header{padding:26px 6%;background:#fff;border-bottom:1px solid #ddd}main{padding:90px 6%;max-width:900px;margin:auto}h1{font-size:clamp(38px,6vw,72px);line-height:1.07}p{line-height:1.8}</style></head><body><header>MI MARCA · INICIO · SERVICIOS · CONTACTO</header><main><h1>Tu próxima gran web comienza aquí</h1><p>Selecciona cualquier elemento del lienzo y empieza a personalizarlo desde el Inspector. También puedes editar el código HTML completo.</p></main></body></html>',title));
          }} className="group flex min-h-[176px] flex-col items-start gap-3 rounded-xl border border-stroke bg-panel p-5 text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-panel">
            <FilePlus2 size={25} className="text-brand"/>
            <span className="font-display text-[22px] font-semibold leading-none">Empezar en blanco</span>
            <span className="text-[12px] leading-5 text-mist">Editor libre con código HTML y personalización de elementos reales.</span>
            <span className="mt-auto text-[11px] font-semibold text-brand">Nuevo lienzo →</span>
          </button>
        </div>
        <div className="mt-9 flex items-center justify-between"><h2 className="text-[14px] font-semibold">Tus proyectos guardados</h2><span className="font-mono text-[10px] text-faint">{savedSites.length} proyectos · guardados en este dispositivo</span></div>
        <div className="mt-3 grid gap-2">
          {savedSites.map(item=><button key={item.id} className="flex w-full items-center gap-3 rounded-xl border border-stroke bg-panel p-4 text-left hover:border-brand/50" onClick={()=>changeSite(item)}>
            <Globe size={20} className="text-brand"/><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{item.name}</span><span className="text-[10px] text-faint">Versión {item.version} · {new Date(item.updatedAt).toLocaleString('es-ES')}</span></span><ChevronRight size={16} className="text-faint"/>
          </button>)}
          {!savedSites.length&&<div className="rounded-xl border border-dashed border-stroke px-5 py-7 text-center text-[12px] text-faint">Todavía no tienes webs guardadas. Genera una o importa un ZIP.</div>}
        </div>
        <div className="mt-8 border-t border-stroke pt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold"><Globe size={15} className="text-brand"/> Tus proyectos en la nube</h2>
            <button disabled={cloudBusy} onClick={()=>void refreshCloud()} className={btn}>Actualizar nube</button>
          </div>
          <p className="mb-3 text-[10px] leading-5 text-faint">{cloudInfo}</p>
          <div className="grid gap-2">
            {cloudItems.map(item=><button key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-stroke bg-panel p-3 text-left hover:border-brand/40" onClick={()=>void openCloudSite(item)}>
              <span className="min-w-0 truncate text-[12px] font-semibold">{item.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-mist">v{item.version}</span>
            </button>)}
          </div>
        </div>
        <input ref={fileInput} type="file" hidden accept=".zip,.html,.htm" onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);}}/>
      </>:<CreatorWizard form={form} setForm={setForm} brief={briefFrom(form)} busy={busy} aiReady={webAIReady} aiReason={webAIReason}
        onCheckAI={()=>void refreshWebAI()} onGenerate={(direction,photos,style)=>void createWeb(direction,photos,style)} onLocal={createLocalWeb} error={fileError} progress={genStatus}/>}
    </main>}
    {site&&stage==='editor'&&<main className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stroke bg-panel px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={()=>{setExplorerOpen(v=>!v);setInspectorOpen(false);}} aria-pressed={explorerOpen} className={btn+' xl:hidden'} title="Abrir explorador de secciones"><Layers3 size={14}/> Explorador</button>
          <button onClick={()=>{setInspectorOpen(v=>!v);setExplorerOpen(false);}} aria-pressed={inspectorOpen} className={btn+' lg:hidden'} title="Abrir propiedades del elemento"><SlidersHorizontal size={14}/> Propiedades</button>
          <div className="flex items-center gap-0.5">
            <button onClick={undo} disabled={!past.length} className={btn+' w-[34px] px-0'} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><Undo2 size={14}/></button>
            <button onClick={redo} disabled={!future.length} className={btn+' w-[34px] px-0'} title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer"><Redo2 size={14}/></button>
          </div>
          <div role="group" aria-label="Herramientas del lienzo" className="flex items-center gap-0.5 rounded-lg border border-stroke bg-elevated p-[3px]">
            <button onClick={()=>{setView('preview');setTool('select');}} aria-pressed={view==='preview'&&tool==='select'} title="Seleccionar y editar (V)" className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(view==='preview'&&tool==='select'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><MousePointer2 size={13}/> Seleccionar</button>
            <button onClick={()=>{setView('preview');setTool('move');}} aria-pressed={view==='preview'&&tool==='move'} title="Arrastrar para reordenar · Alt+arrastrar para desplazar libremente (M)" className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(view==='preview'&&tool==='move'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><Move size={13}/> Mover</button>
            <button onClick={()=>{setView('preview');setTool('insert');}} aria-pressed={view==='preview'&&tool==='insert'} title="Insertar textos, botones, formas, imágenes y secciones (I)" className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(view==='preview'&&tool==='insert'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><SquarePlus size={13}/> Insertar</button>
            <button onClick={()=>{setView('code');setTool('select');openCodeFile(PAGE_CSS);}} aria-pressed={view==='code'&&codeFile===PAGE_CSS} title="Abrir editor de CSS personalizado" className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(view==='code'&&codeFile===PAGE_CSS?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><Braces size={13}/> CSS</button>
            <button onClick={()=>{setView('code');setTool('select');openCodeFile(codeFile==='__page__'?'__html__':codeFile);}} aria-pressed={view==='code'&&codeFile!==PAGE_CSS} title="Código HTML y archivos del proyecto" className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(view==='code'&&codeFile!==PAGE_CSS?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><CodeXml size={13}/> Código</button>
          </div>
          {tool==='move'&&view==='preview'&&<div role="group" aria-label="Modo de mover" className="flex items-center gap-0.5 rounded-lg border border-brand/40 bg-brandsoft p-[3px]">
            <button onClick={()=>setMoveStyle('ordenar')} aria-pressed={moveStyle==='ordenar'} title="Encaja el elemento entre otros (mantiene la web responsive)"
              className={'inline-flex h-[26px] items-center rounded-md px-2.5 text-[11px] font-medium '+(moveStyle==='ordenar'?'bg-panel text-ink shadow-sm':'text-brand')}>Ordenar</button>
            <button onClick={()=>setMoveStyle('libre')} aria-pressed={moveStyle==='libre'} title="Lo deja exactamente donde lo sueltas"
              className={'inline-flex h-[26px] items-center rounded-md px-2.5 text-[11px] font-medium '+(moveStyle==='libre'?'bg-panel text-ink shadow-sm':'text-brand')}>Libre</button>
          </div>}
          <span className="hidden items-center gap-2 pl-1 text-[10.5px] text-faint xl:flex">
            <span className="rounded bg-brandsoft px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-brand">{site.source==='generated'?'Generada':'Importada'}</span>
            <span className="font-mono">{site.entry}</span><span>· {Object.keys(site.assets).length} recursos</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={()=>setSeoOpen(true)} className={btn} title="Título, descripción y metadatos para buscadores"><Search size={14}/> SEO</button>
          <button onClick={()=>void onSave()} disabled={busy} className={btn} title="Guardar en este dispositivo (Ctrl+S)"><Save size={14}/> Guardar</button>
          <button onClick={()=>void onCloudSave()} disabled={busy} className={btn} title="Guardar una versión privada en la nube"><Globe size={14}/> Guardar en la nube</button>
          <button onClick={()=>setStage('agent')} className={primary}><Bot size={14}/> Siguiente: agente IA</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {view==='preview'&&<SectionExplorer sections={sections} selectedIndex={selected}
          onSelect={(index,additive)=>{if(additive&&selectedRef.current){toggleMulti(index);return;}selectLayer(index);if(window.matchMedia('(max-width: 1279px)').matches)setExplorerOpen(false);}}
          onAction={onSectionAction} mobileOpen={explorerOpen} onCloseMobile={()=>setExplorerOpen(false)}
          onElementMenu={(index,x,y)=>{selectLayer(index,true);setCanvasMenu({x,y});}}/>}
        {(explorerOpen||inspectorOpen)&&<button type="button" aria-label="Cerrar paneles" className="fixed inset-0 z-[65] bg-black/45 xl:hidden"
          onClick={()=>{setExplorerOpen(false);setInspectorOpen(false);}}/>}
        <div className="flex min-w-0 flex-1 flex-col bg-canvas">
          {view==='preview'?<>
            <div className="flex items-center justify-between gap-2 border-b border-stroke bg-panel/60 px-3 py-1.5">
              <span className="hidden truncate text-[11px] text-faint sm:block">{activeSection?<>Sección: <span className="text-mist">{activeSection.name}</span></>:'Haz clic en la web para seleccionar un elemento'}</span>
              {siteThemes&&<div role="group" aria-label="Tema de la web" title="Tu web tiene modo claro y oscuro: elige cuál ver en el editor" className="flex items-center gap-0.5 rounded-lg border border-stroke bg-elevated p-[3px]">
                {(['light','dark'] as const).map(t=><button key={t} onClick={()=>setWebTheme(t)} aria-pressed={webTheme===t}
                  className={'inline-flex h-[28px] items-center rounded-md px-2.5 text-[11px] font-medium '+(webTheme===t?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}>{t==='light'?'Web clara':'Web oscura'}</button>)}
              </div>}
              <div role="group" aria-label="Dispositivo de vista previa" className="mx-auto flex items-center gap-0.5 rounded-lg border border-stroke bg-elevated p-[3px] sm:mx-0">
                {([['desktop','Escritorio',Monitor],['tablet','Tableta',Tablet],['mobile','Móvil',Smartphone]] as const).map(([id,label,Icon])=>
                  <button key={id} onClick={()=>setDevice(id)} aria-pressed={device===id} title={label}
                    className={'inline-flex h-[28px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition '+(device===id?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}><Icon size={13}/><span className="hidden md:inline">{label}</span></button>)}
              </div>
              <div role="group" aria-label="Zoom del lienzo" className="flex items-center gap-0.5 rounded-lg border border-stroke bg-elevated p-[3px]">
                <button type="button" onClick={()=>zoomBy(1/1.2)} aria-label="Alejar" title="Alejar (Ctrl + rueda)" className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-mist hover:bg-panel hover:text-ink">−</button>
                <button type="button" onClick={()=>setZoom(1)} title="Volver al 100 %" className="min-w-[46px] rounded-md px-1 font-mono text-[11px] text-ink hover:bg-panel">{Math.round(zoom*100)} %</button>
                <button type="button" onClick={()=>zoomBy(1.2)} aria-label="Acercar" title="Acercar (Ctrl + rueda)" className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-mist hover:bg-panel hover:text-ink">+</button>
                <button type="button" onClick={fitZoom} title="Ajustar la página a la ventana" className="rounded-md px-2 text-[11px] text-mist hover:bg-panel hover:text-ink">Ajustar</button>
              </div>
              <button type="button" onClick={()=>{setLive(v=>!v);setLiveKey(k=>k+1);setCanvasMenu(null);}} aria-pressed={live}
                title="Ver la web funcionando de verdad: animaciones, menús y JavaScript (Esc para volver a editar)"
                className={'inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-semibold transition '+(live?'border-brand bg-brand text-white':'border-brand/40 bg-brandsoft text-brand hover:border-brand')}>
                <Play size={13}/>{live?'Volver a editar':'En vivo'}</button>
            </div>
            <div className="relative min-h-0 flex-1">
            {live&&<div className="absolute inset-0 z-[40] flex flex-col bg-canvas">
              <div className="flex items-center justify-between gap-2 border-b border-brand/30 bg-brandsoft px-3 py-1.5 text-[11px] text-brand">
                <span><b>En vivo</b> · la web funciona como publicada (JavaScript, animaciones, menús). Aquí no se edita; los enlaces externos y formularios están desactivados.</span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={()=>setLiveKey(k=>k+1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-panel" title="Recargar la página"><RotateCcw size={12}/> Recargar</button>
                  <button type="button" onClick={()=>setLive(false)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-panel" title="Volver a editar (Esc)"><X size={12}/> Cerrar</button>
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
                <iframe key={liveKey} title="Vista en vivo de la web" srcDoc={liveHtml} sandbox="allow-scripts" referrerPolicy="no-referrer"
                  className="mx-auto block h-full min-h-[560px] rounded-md border border-stroke bg-white shadow-panel"
                  style={{width:device==='mobile'?390:device==='tablet'?820:'100%',maxWidth:'100%'}}/>
              </div>
            </div>}
            {tool==='insert'&&<InsertPanel onInsert={id=>insertBlock(id)} onDragBlock={dragBlockStart} onClose={()=>setTool('select')}
              onInsertHtml={(name,html)=>insertItem({name,html:()=>html,section:false})}
              onDragHtml={(name,html,e)=>dragItemStart({name,html:()=>html,section:false},e)}
              target={selected!==null?'después del elemento seleccionado (o dentro, si es un contenedor vacío)':'al final de la página'}/>}
            <div ref={canvasScrollRef} className="scroll-subtle absolute inset-0 overflow-auto py-3 sm:py-6" style={{backgroundImage:'radial-gradient(circle at 1px 1px, var(--wu-stroke) 1px, transparent 0)',backgroundSize:'22px 22px'}}>
              <div ref={boardRef} className="relative mx-auto h-full min-h-[480px]" aria-label="Mesa de trabajo"
                style={{width:(device==='mobile'?390:device==='tablet'?820:1280)+BOARD_SIDE*2,paddingLeft:BOARD_SIDE,paddingRight:BOARD_SIDE,zoom}}>
              {(site.parked||[]).map(item=><ParkedItem key={item.id} item={item} head={previewHead} theme={webTheme}
                onPointerDown={e=>dragParked(item,e)}
                onDelete={()=>{setSite(old=>old?{...old,parked:(old.parked||[]).filter(x=>x.id!==item.id)}:old);setDirty(true);}}/>)}
              {tool==='move'&&!(site.parked?.length)&&<p className="pointer-events-none absolute left-4 top-4 w-[300px] rounded-lg border border-dashed border-stroke p-3 text-[11px] leading-5 text-faint">Mesa de trabajo: arrastra elementos fuera de la página y suéltalos aquí. Lo que dejes en la mesa no se publica.</p>}
              <div className="h-full min-h-[480px] overflow-hidden rounded-md border border-stroke bg-white shadow-panel">
                <div className="relative h-full min-h-[620px] w-full">
                  {([0,1] as const).map(i=><iframe key={i} title={i===activeFrame?'Previsualización segura de la web importada':'Preparando vista'}
                    ref={i===0?frameA:frameB} onLoad={()=>frameLoaded(i)} aria-hidden={i!==activeFrame}
                    sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={frameHtml[i]} tabIndex={i===activeFrame?0:-1}
                    className={'absolute inset-0 h-full min-h-[620px] w-full border-0 bg-white '+(i===activeFrame?'z-[1] opacity-100':'pointer-events-none z-0 opacity-0')}/>)}
                </div>
              </div>
              </div>
            </div>
            </div>
          </>:<>
            <div role="tablist" aria-label="Archivos del proyecto" className="flex flex-wrap items-center gap-1 border-b border-stroke bg-panel px-3 py-2">
              {[['__html__',site.entry],...cssFiles.map(f=>[f,f]),...jsFiles.map(f=>[f,f]),[PAGE_CSS,'Estilos propios'],[PAGE_JS,'Script propio']].map(([id,label])=>
                <button key={id} role="tab" aria-selected={codeFile===id} onClick={()=>openCodeFile(id)}
                  className={'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] '+(codeFile===id?'bg-brandsoft text-brand':'text-mist hover:bg-elevated hover:text-ink')}>
                  <FileCode2 size={12}/>{label}</button>)}
              <span className="ml-auto text-[10.5px] text-faint">{codeFile==='__html__'?site.html.length.toLocaleString('es-ES')+' caracteres':codeFile===PAGE_CSS?'CSS tuyo, se añade al final y gana al original':codeFile===PAGE_JS?'JavaScript tuyo, al final de la página · se ejecuta en «En vivo» y al publicar':/\.m?js$/i.test(codeFile)?'Archivo JavaScript del proyecto':'Archivo CSS del proyecto'}</span>
            </div>
            {codeFile==='__html__'?<textarea aria-label="Editor completo de HTML de la web"
              className="scroll-subtle min-h-0 flex-1 resize-none bg-[#10141c] p-5 font-mono text-[12px] leading-6 text-[#dae6ff] outline-none"
              spellCheck={false} value={draftHtml} onChange={e=>setDraftHtml(e.target.value)}
              onBlur={()=>{if(draftHtml!==site.html)changeHtml(draftHtml)}}/>
            :codeFile===PAGE_CSS?<CssCodeEditor value={draftCode} onChange={setDraftCode} error={validateCssSource(draftCode)}/>
            :<textarea aria-label={codeFile===PAGE_JS?'Script propio de la página':'Editor del archivo '+codeFile}
              className="scroll-subtle min-h-0 flex-1 resize-none bg-[#10141c] p-5 font-mono text-[12px] leading-6 text-[#dae6ff] outline-none"
              spellCheck={false} value={draftCode} onChange={e=>setDraftCode(e.target.value)} onBlur={applyCode}
              placeholder={codeFile===PAGE_JS?'// Tu JavaScript: se ejecuta al cargar la página publicada\ndocument.querySelectorAll(\'section\').forEach(s => s.classList.add(\'visible\'));':''}/>}
            <div className="flex items-center justify-between gap-2 border-t border-stroke p-2">
              <span className="text-[10.5px] text-faint">{codeFile===PAGE_CSS?'CSS personalizado del proyecto · se guarda con la web y se incluye en el ZIP.':'Se aplica al salir del editor o con el botón. Ctrl+Z deshace.'}</span>
              <button onClick={()=>{if(applyCode())setView('preview')}} disabled={codeFile===PAGE_CSS&&Boolean(validateCssSource(draftCode))} className={primary}><Check size={14}/> Aplicar y ver resultado</button>
            </div>
          </>}
        </div>
        <aside aria-label="Inspector de elementos" className={'scroll-subtle w-[278px] shrink-0 overflow-y-auto border-l border-stroke bg-panel p-4 max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[70] max-lg:w-[min(320px,88vw)] max-lg:shadow-2xl '+(inspectorOpen?'':'max-lg:hidden')}>
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[12px] font-semibold">{inspectorTab==='image'?<ImagePlus size={14} className="text-brand"/>:inspectorTab==='symbol'?<Shapes size={14} className="text-brand"/>:<SlidersHorizontal size={14} className="text-brand"/>} {inspectorTab==='image'?'Imagen':inspectorTab==='symbol'?'Símbolo':'Propiedades'}</h2>
            <button type="button" onClick={()=>setInspectorOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-mist hover:bg-raised lg:hidden" aria-label="Cerrar inspector"><X size={15}/></button></div>
          <p className="mb-4 text-[11px] leading-5 text-mist">{inspectorTab==='image'?'Asocia una fotografía al plato o sección.':inspectorTab==='symbol'?'Sustituye el icono seleccionado sin alterar su caja ni su estilo.':'Selecciona un elemento en la web o en el Explorador. Cada cambio se puede deshacer.'}</p>
          {selected===null?<div className="rounded-lg border border-dashed border-stroke p-4 text-[11px] text-faint">Nada seleccionado.</div>:<>
            <div className="mb-2 rounded-lg border border-stroke bg-elevated px-3 py-2 font-mono text-[10px] text-mist">{activeLayer?.tag||'Nodo'} · #{selected}{activeSection?' · '+activeSection.name:''}</div>
            <div className={'mb-3 grid gap-1 rounded-lg border border-stroke bg-elevated p-1 '+(symbolTarget?'grid-cols-3':'grid-cols-2')} role="tablist" aria-label="Panel del elemento">
              <button type="button" role="tab" aria-selected={inspectorTab==='properties'} onClick={()=>setInspectorTab('properties')}
                className={'rounded-md px-2 py-2 text-[11px] font-medium transition '+(inspectorTab==='properties'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}>Propiedades</button>
              <button type="button" role="tab" aria-selected={inspectorTab==='image'} onClick={()=>setInspectorTab('image')}
                className={'rounded-md px-2 py-2 text-[11px] font-medium transition '+(inspectorTab==='image'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}>Imagen</button>
              {symbolTarget&&<button type="button" role="tab" aria-selected={inspectorTab==='symbol'} onClick={()=>setInspectorTab('symbol')}
                className={'rounded-md px-2 py-2 text-[11px] font-medium transition '+(inspectorTab==='symbol'?'bg-panel text-ink shadow-sm':'text-mist hover:text-ink')}>Símbolo</button>}
            </div>
            {inspectorTab==='symbol'&&symbolTarget?<div className="flex h-[500px] min-h-[360px] flex-col gap-2">
              <div className="rounded-lg border border-stroke bg-elevated px-3 py-2">
                <p className="text-[10px] font-semibold text-ink">Icono actual</p>
                <p className="mt-1 truncate text-[11px] text-mist">{symbolTarget.name}</p>
                <p className="mt-1 text-[10px] text-faint">Caja original: {symbolTarget.width||'CSS'} × {symbolTarget.height||'CSS'}</p>
              </div>
              <label className="relative block shrink-0"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"/>
                <input value={symbolQuery} onChange={e=>setSymbolQuery(e.target.value)} placeholder="Buscar símbolo: casa, fuego, mapa…" aria-label="Buscar símbolo para sustituir"
                  className="w-full rounded-md border border-stroke bg-elevated py-1.5 pl-8 pr-2 text-[11px] text-ink outline-none focus:border-brand"/></label>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-stroke">
                <SymbolLibrary query={symbolQuery} mode="replace" onReplace={replaceSelectedSymbol} onInsert={()=>{}} onDrag={()=>{}}/>
              </div>
            </div>:inspectorTab==='image'?<div className="space-y-3">
              <div className="rounded-lg border border-stroke bg-elevated p-3">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold"><ImagePlus size={14} className="text-brand"/>{imageTarget?.kind==='item'?'Fotografía del plato':imageTarget?.kind==='section'?'Fotografía de la sección':'Fotografía del elemento'}</div>
                <p className="text-[11px] leading-5 text-mist">{imageTarget?.label||'Elemento seleccionado'}</p>
              </div>
              {imagePreviewUrl?<img src={imagePreviewUrl} alt={imageTarget?.imageAlt||'Fotografía asociada'} className="max-h-48 w-full rounded-lg border border-stroke object-cover"/>:
                imageTarget?.hasImage?<div className="rounded-lg border border-dashed border-stroke p-3 text-[11px] leading-5 text-mist">Este elemento ya contiene una imagen enlazada. Puedes sustituirla por una fotografía guardada dentro del proyecto.</div>:
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stroke p-4 text-center">
                  <ImagePlus size={24} className="text-faint"/><span className="text-[11px] text-mist">Todavía no hay ninguna fotografía asociada.</span>
                </div>}
              <label className={primary+' w-full cursor-pointer'}>
                <ImagePlus size={14}/>{imageTarget?.hasImage?'Sustituir fotografía':'Subir fotografía'}
                <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Subir fotografía del elemento"
                  onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void changeImage(file);e.currentTarget.value='';}}/>
              </label>
              {imageTarget?.managedImage&&<button type="button" className={btn+' w-full justify-center text-red-400'} onClick={removeImage}><Trash2 size={13}/> Eliminar fotografía</button>}
              <p className="text-[10px] leading-5 text-faint">PNG, JPG, GIF o WebP · máximo 5 MB. La foto se inserta en el plato o sección seleccionada, se incluye en el ZIP y puedes deshacer el cambio.</p>
            </div>:inspectorTab!=='symbol'&&elementInfo&&elementInfo.index===selected?<PropertyPanel info={elementInfo}
              onStyles={styles=>tryEdit(()=>setStyles(site.html,elementInfo.index,styles),'Estilo aplicado al elemento.')}
              onFont={family=>tryEdit(()=>setFont(site.html,elementInfo.index,family),'Tipografía aplicada: '+family.split(',')[0].replace(/["']/g,'')+'.')}
              onPreview={styles=>{const el=selectedRef.current;if(!el)return;for(const [prop,value] of Object.entries(styles))el.style.setProperty(prop,value);}}
              onAttrs={attrs=>tryEdit(()=>setAttributes(site.html,elementInfo.index,attrs),'Atributos actualizados.')}
              onText={text=>tryEdit(()=>setInlineContent(site.html,elementInfo.index,escapeText(text)),'Texto actualizado.')}
              onEditText={()=>startTextEdit(elementInfo.index)}/>:<div className="rounded-lg border border-dashed border-stroke p-3 text-[11px] text-faint">No hay propiedades disponibles para esta selección.</div>}
          </>}
          <div className="mt-7 border-t border-stroke pt-4 text-[10px] leading-5 text-faint">Lienzo de edición protegido: aquí el JavaScript no se ejecuta. Pulsa «En vivo» para ver la web funcionando con sus scripts; todo se conserva al exportar.</div>
        </aside>
      </div>
    </main>}
    {site&&stage==='agent'&&<main className="scroll-subtle mx-auto w-full max-w-[790px] flex-1 overflow-y-auto px-6 py-10">
      <AgentSetup site={site} onBack={()=>setStage('editor')} onSkip={()=>setStage('export')} onLinked={agent=>void handleAgentLinked(agent)}/>
    </main>}
    {site&&stage==='export'&&<main className="scroll-subtle mx-auto w-full max-w-[730px] flex-1 overflow-y-auto px-6 py-10">
      <button onClick={()=>setStage('agent')} className={btn+' mb-7'}><ArrowLeft size={14}/> Volver al agente</button>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-brand">04 / ENTREGA</div>
      <h1 className="text-[30px] font-bold tracking-[-.04em]">Tu web, lista para llevar.</h1>
      <p className="mt-3 text-[13px] leading-6 text-mist">Descarga el HTML o el ZIP con la web real y sus recursos. {site.agent?'El asistente está vinculado y se incluye automáticamente.':'Puedes asociar un agente en cualquier momento.'}</p>
      {site.agent&&<div className="mt-5 rounded-xl border border-brand/30 bg-brandsoft p-4 text-[12px] leading-6 text-ink"><Bot size={16} className="mr-2 inline text-brand"/>Agente: <strong>{site.agent.title}</strong><div className="text-[10px] text-mist">Dominio autorizado: {site.agent.origin}</div></div>}
      <div className="mt-7 flex flex-col gap-3">
        <button onClick={exportZip} className={primary+' w-full justify-start py-4 text-[13px]'}><FileArchive size={19}/> Descargar {site.agent?'web + agente':'proyecto ZIP completo'}</button>
        <button onClick={exportHtml} className={btn+' w-full justify-start py-4 text-[13px]'}><FileCode2 size={19}/> Descargar HTML {site.agent?'con widget':'actualizado'}</button>
        <button onClick={()=>setStage('editor')} className={btn+' w-full justify-start py-4'}><Paintbrush size={17}/> Seguir editando</button>
      </div>
      <div className="mt-6 rounded-xl border border-stroke bg-elevated p-4 text-[11px] leading-5 text-mist">Los agentes necesitan un backend activo y deben publicarse en el dominio HTTPS autorizado. Si la web importada incluye scripts, revisa su procedencia antes de publicarlos.</div>
    </main>}
    {canvasMenu&&elementInfo&&<CanvasMenu x={canvasMenu.x} y={canvasMenu.y} tag={elementInfo.tag} canEditText={elementInfo.textEditable}
      canPaste={hasClip} hidden={false} multiCount={multi.length+1} inGroup={!!previewFrame.current?.contentDocument?.querySelector('[data-wayup-edit="'+selected+'"]')?.closest('[data-wc-group]')} hasParent={selected!==null&&!!site&&parentIndex(site.html,selected)!==null}
      onCommand={runCanvasCommand} onClose={()=>setCanvasMenu(null)}/>}
    {seoOpen&&site&&<SeoPanel html={site.html} onClose={()=>setSeoOpen(false)} onSave={seo=>{
      try{changeHtml(writeSeo(site.html,seo));setSeoOpen(false);setNotice('SEO actualizado en el documento.');}
      catch(error){setNotice(error instanceof Error?error.message:'No se pudo guardar el SEO.');}
    }}/>}
    {agentsOpen&&<AgentLibrary onClose={()=>setAgentsOpen(false)} onCreateForWeb={()=>{setAgentsOpen(false);if(site)setStage('agent');else{setStage('home');setNotice('Abre o crea una web: el agente se configura a partir de su contenido.');}}}/>}
    {postSavePrompt&&stage==='editor'&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPostSavePrompt(false)}}>
      <div role="dialog" aria-modal="true" aria-labelledby="wayup-link-agent-question" className="w-full max-w-[470px] rounded-2xl border border-stroke bg-panel p-7 shadow-panel">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brandsoft text-brand"><Bot size={25}/></div>
        <h2 id="wayup-link-agent-question" className="text-[22px] font-semibold tracking-tight">¡Web guardada! ¿Le añadimos un agente IA?</h2>
        <p className="mt-3 text-[12px] leading-6 text-mist">Usaremos los contenidos de esta web para proponerte un rol, objetivo y capacidades. Podrás revisarlo todo antes de crear y publicar el agente.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className={primary} onClick={()=>{setPostSavePrompt(false);setStage('agent')}}><Bot size={15}/> Sí, configurar agente</button>
          <button className={btn} onClick={()=>{setPostSavePrompt(false);setStage('export')}}>No, exportar web</button>
          <button className={btn} onClick={()=>setPostSavePrompt(false)}>Seguir editando</button>
        </div>
      </div>
    </div>}
  </div>;
}
