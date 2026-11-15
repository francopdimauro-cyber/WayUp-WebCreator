'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Monitor, Search, Upload, X } from 'lucide-react';
import {
  FONT_SOURCE_API, WINDOWS_FONT_EXPORT_SCRIPT, baseFontEntries, ensureFontStylesheet,
  fontNameFromStack, isSafeFontName, makeFontStack, mergeFontEntries, normalizeFontSearch,
  parseFontsourceCatalog, parseWindowsFontList,
  type FontEntry, type FontSource
} from '@/lib/font-library';

type Filter = 'all' | FontSource;
type Props = { value: string; onPick(value: string): void };
const REMEMBER_KEY='wayup-next-remember-local-fonts-v1';
const LOCAL_KEY='wayup-next-local-fonts-v1';
const PAGE=24;
const filters: {value:Filter;label:string}[]=[
 {value:'all',label:'Todas'},{value:'google',label:'Google'},
 {value:'open',label:'Open Fonts'},{value:'local',label:'Mi PC'},{value:'system',label:'Sistema'}
];
const origins:Record<FontSource,string>={
 google:'Google Fonts',open:'Open Fonts',local:'Mi ordenador',system:'Sistema'
};
let remoteCache:FontEntry[]|null=null;
let localCache:string[]=[];

function downloadWindowsScript(){
 const url=URL.createObjectURL(new Blob([WINDOWS_FONT_EXPORT_SCRIPT],{type:'text/plain; charset=utf-8'}));
 const link=document.createElement('a');
 link.href=url;link.download='wayup-exportar-fuentes.ps1';
 document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function FontPicker({value,onPick}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const [filter,setFilter]=useState<Filter>('all'),[visible,setVisible]=useState(PAGE);
 const [remote,setRemote]=useState<FontEntry[]>(remoteCache||[]);
 const [local,setLocal]=useState<string[]>(localCache);
 const [remember,setRemember]=useState(false),[loading,setLoading]=useState(false);
 const [detecting,setDetecting]=useState(false),[status,setStatus]=useState('');
 const [manual,setManual]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 const selectedName=fontNameFromStack(value);

 useEffect(()=>{
  try {
   if(localStorage.getItem(REMEMBER_KEY)==='1'){
    const payload=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');
    if(Array.isArray(payload)&&payload.length<=7000){
     localCache=[...new Set([...localCache,...payload.filter(isSafeFontName).map((x:string)=>x.trim())])].slice(0,7000);
     setLocal(localCache);
     setRemember(true);
    }
   }
  }catch{/* Las fuentes solo se conservarán durante esta sesión. */}
 },[]);

 useEffect(()=>{
  if(!open)return;
  if(remoteCache){setRemote(remoteCache);return}
  let live=true;
  const controller=new AbortController();
  setLoading(true);
  fetch(FONT_SOURCE_API,{mode:'cors',cache:'force-cache',signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
   .then(data=>{const items=parseFontsourceCatalog(data);remoteCache=items;if(live){setRemote(items);setStatus('Catálogo abierto actualizado: '+items.length+' familias.')}})
   .catch(e=>{if(live)setStatus('Catálogo en línea no disponible. Las fuentes incorporadas siguen accesibles. '+String(e?.message||''))})
   .finally(()=>{if(live)setLoading(false)});
  return ()=>{live=false;controller.abort()};
 },[open]);

 const entries=useMemo(()=>{
  const extra:FontEntry[]=local.map(name=>({name,source:'local'}));
  const all=mergeFontEntries(baseFontEntries(),remote,extra);
  if(!all.some(f=>normalizeFontSearch(f.name)===normalizeFontSearch(selectedName))&&isSafeFontName(selectedName))
   all.push({name:selectedName,source:'local'});
  return all;
 },[remote,local,selectedName]);
 const current=useMemo(()=>entries.find(f=>normalizeFontSearch(f.name)===normalizeFontSearch(selectedName)),[entries,selectedName]);
 useEffect(()=>{if(current)ensureFontStylesheet(current)},[current]);
 const results=useMemo(()=>{
  const needle=normalizeFontSearch(query.trim());
  return entries.filter(f=>(filter==='all'||f.source===filter)&&(!needle||normalizeFontSearch(f.name).includes(needle)));
 },[entries,filter,query]);

 // Nunca descargar las miles de hojas de estilo: solo la primera página de vista previa.
 useEffect(()=>{if(open)for(const font of results.slice(0,Math.min(visible,10)))ensureFontStylesheet(font)},[open,results,visible]);

 const addLocal=(names:string[],message:string)=>{
  localCache=[...new Set([...localCache,...names.filter(isSafeFontName).map(s=>s.trim())])].slice(0,7000);
  setLocal(localCache);
  if(remember)try{localStorage.setItem(LOCAL_KEY,JSON.stringify(localCache))}catch{}
  setFilter('local');setQuery('');setVisible(PAGE);setStatus(message);
 };
 async function detect(){
  const compatible=window as Window&{queryLocalFonts?:()=>Promise<Array<{family?:string}>>};
  if(typeof compatible.queryLocalFonts!=='function'){
   setStatus('Firefox no permite enumerar las fuentes instaladas. Descarga el exportador de Windows e importa el archivo JSON; Chrome y Edge admiten detección directa con permiso.');
   return;
  }
  setDetecting(true);
  try{
   const fonts=await compatible.queryLocalFonts();
   const families=[...new Set(fonts.map(f=>f.family).filter(isSafeFontName))];
   addLocal(families,'Detectadas '+families.length+' familias instaladas. Solo se han leído sus nombres.');
  }catch(e){setStatus('No se ha podido acceder a las fuentes: '+(e instanceof Error?e.message:'permiso no disponible')+'. Puedes importar un listado de Windows.')}
  finally{setDetecting(false)}
 }
 async function importNames(file:File|undefined){
  if(!file)return;
  if(!/\.json$/i.test(file.name)||file.size>512000){setStatus('Selecciona un listado JSON de WAYUP (máximo 500 KB).');return}
  try{
   const families=parseWindowsFontList(await file.text());
   addLocal(families,'Importadas '+families.length+' familias del sistema. Solo se verán donde estén instaladas.');
  }catch(e){setStatus(e instanceof Error?e.message:'No se pudo leer el listado')}
 }
 function changeRemember(checked:boolean){
  setRemember(checked);
  try{
   if(checked){
    localStorage.setItem(REMEMBER_KEY,'1');
    localStorage.setItem(LOCAL_KEY,JSON.stringify(localCache));
    setStatus('Solo los nombres de las fuentes se guardan en este navegador.');
   }else{
    localStorage.removeItem(REMEMBER_KEY);localStorage.removeItem(LOCAL_KEY);
    setStatus('No se guardará el listado en este navegador.');
   }
  }catch{setStatus('No se pudo acceder al almacenamiento local.')}
 }
 const pick=(font:FontEntry)=>{
  ensureFontStylesheet(font);onPick(makeFontStack(font.name));setOpen(false);
  setStatus('Tipografía aplicada: '+font.name);
 };
 return <div className="mb-3" onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false)}}}>
  <span id="wayup-font-label" className="field-label">Familia tipográfica</span>
  <button type="button" aria-labelledby="wayup-font-label" aria-expanded={open} aria-controls="wayup-font-browser"
   className="field-input flex items-center justify-between text-left" onClick={()=>setOpen(x=>!x)}>
   <span className="truncate" style={{fontFamily:value}}>{selectedName}</span>
   <ChevronDown size={14} className="shrink-0 text-faint"/>
  </button>
  {open&&<section id="wayup-font-browser" aria-label="Biblioteca de tipografías" className="mt-2 rounded-xl border border-white/10 bg-[#171d28] p-2.5 shadow-panel">
   <div className="relative mb-2">
    <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-[#8795aa]"/>
    <input type="search" className="field-input pl-8 pr-8" placeholder="Buscar fuentes…" aria-label="Buscar entre todas las fuentes"
     autoComplete="off" value={query} onChange={e=>{setQuery(e.target.value);setVisible(PAGE)}}/>
    {query&&<button type="button" aria-label="Limpiar búsqueda" onClick={()=>setQuery('')}
     className="absolute right-1.5 top-1.5 rounded p-1 text-faint hover:text-white"><X size={13}/></button>}
   </div>
   <div role="group" aria-label="Origen de las fuentes" className="scroll-subtle mb-2 flex gap-1 overflow-x-auto pb-1">
    {filters.map(f=><button key={f.value} type="button" aria-pressed={filter===f.value}
     onClick={()=>{setFilter(f.value);setVisible(PAGE)}}
     className={filter===f.value?'shrink-0 rounded-lg border border-[#869fff90] bg-[#829cff21] px-2 py-1.5 text-[10px] font-semibold text-[#d2dfff]':'shrink-0 rounded-lg border border-white/10 bg-[#202631] px-2 py-1.5 text-[10px] font-semibold text-[#a3afc0] hover:bg-[#2b3444]'}>
     {f.label}</button>)}
   </div>
   <div className="mb-2 flex items-center justify-between text-[10px] text-[#98a6bc]">
    <span>{results.length.toLocaleString('es-ES')} familias {loading?'· Actualizando…':''}</span>
    <span>{filter==='all'?'Catálogo completo':filters.find(f=>f.value===filter)?.label}</span>
   </div>
   <div role="listbox" aria-label="Seleccionar tipografía" className="scroll-subtle max-h-[265px] overflow-y-auto rounded-lg border border-white/[.06] bg-[#111722] p-1">
    {results.slice(0,visible).map(font=><button type="button" role="option" key={font.source+':'+font.name}
     aria-selected={normalizeFontSearch(selectedName)===normalizeFontSearch(font.name)}
     onClick={()=>pick(font)}
     className="flex w-full flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left text-[#edf1fa] transition-colors hover:bg-[#ffffff0e] aria-selected:bg-[#617dff1c]">
     <span className="flex w-full items-center justify-between gap-2 text-[12px] font-semibold">
      <span className="truncate">{font.name}</span>
      {normalizeFontSearch(selectedName)===normalizeFontSearch(font.name)&&<Check size={13} className="text-[#94afff]"/>}
     </span>
     <span className="w-full truncate text-[12px] font-normal text-[#aab5ca]" style={{fontFamily:makeFontStack(font.name)}}>Diseña algo extraordinario 123 Áñ</span>
     <span className="text-[9px] text-[#788ba8]">{origins[font.source]}</span>
    </button>)}
    {!results.length&&<p className="p-3 text-[11px] text-[#9faabd]">Ninguna fuente coincide con la búsqueda.</p>}
    {results.length>visible&&<button type="button" onClick={()=>setVisible(v=>v+PAGE)}
      className="mt-1 w-full rounded-lg border border-white/10 py-2 text-[10px] font-semibold text-[#bbcbec] hover:bg-white/10">
      Ver más fuentes ({results.length-visible} restantes)</button>}
   </div>
   <div className="mt-3 border-t border-white/10 pt-3">
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#dfe8f7]"><Monitor size={13}/>Fuentes de mi equipo</div>
    <div className="grid grid-cols-2 gap-1.5">
     <button type="button" className="ui-ghost h-auto! min-h-[33px] px-2!" onClick={detect} disabled={detecting}>
      {detecting?'Detectando…':'Detectar fuentes'}</button>
     <button type="button" className="ui-ghost h-auto! min-h-[33px] px-2!" onClick={downloadWindowsScript}><Download size={12}/>Exportar Windows</button>
     <button type="button" className="ui-ghost col-span-2 h-auto! min-h-[33px]" onClick={()=>inputRef.current?.click()}>
      <Upload size={12}/>Importar lista de Windows (.json)</button>
     <input ref={inputRef} type="file" accept=".json,application/json" hidden
      onChange={e=>{void importNames(e.target.files?.[0]);e.target.value=''}}/>
    </div>
    <form className="mt-2 flex gap-1.5" onSubmit={e=>{e.preventDefault();if(isSafeFontName(manual)){addLocal([manual.trim()],'Familia local añadida: '+manual.trim());setManual('')}else setStatus('Escribe un nombre de fuente válido.')}}>
     <input className="field-input min-w-0 flex-1" value={manual} maxLength={95}
      onChange={e=>setManual(e.target.value)} placeholder="Fuente instalada…" aria-label="Introducir familia local por nombre"/>
     <button type="submit" className="ui-ghost h-[34px]! px-2.5!">Añadir</button>
    </form>
    <label className="mt-2 flex items-start gap-2 text-[10px] leading-5 text-[#9ba8bc]">
     <input type="checkbox" className="mt-0.5 accent-[#809cff]" checked={remember} onChange={e=>changeRemember(e.target.checked)}/>
     Recordar nombres de mis fuentes en este navegador
    </label>
    <p className="mt-2 text-[10px] leading-[1.5] text-[#7f90a8]">Google y Open Fonts se descargan de Internet. Las fuentes del sistema solo estarán disponibles donde estén instaladas. Comprueba las licencias al distribuir fuentes.</p>
   </div>
   {status&&<p role="status" className="mt-2 rounded-md bg-[#2a3651]/50 p-2 text-[10px] leading-4 text-[#bccff5]">{status}</p>}
  </section>}
 </div>;
}
