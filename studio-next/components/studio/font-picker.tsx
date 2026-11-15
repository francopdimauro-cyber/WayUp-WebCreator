'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Download, FilePlus, HardDrive, Search, Upload, X } from 'lucide-react';
import {
  cssFamily, ensureFontStylesheet, familyFromCSS, FONT_NAMES_KEY, FONT_REMEMBER_KEY,
  FONT_SOURCE_LABELS, fontLookup, initialFonts, loadFontsource, mergeFonts,
  validFamily, WAYUP_WINDOWS_FONT_EXPORT,
  type FontEntry, type FontOrigin
} from '@/lib/font-catalog';

type Filter = FontOrigin | 'all';
const TABS: {id:Filter;label:string}[] = [
  {id:'all',label:'Todas'}, {id:'google',label:'Google'},
  {id:'open',label:'Open Fonts'}, {id:'local',label:'Mi PC'},
  {id:'uploaded',label:'Importadas'}, {id:'system',label:'Sistema'}
];
type LocalFontData = {family:string};
type LocalWindow = Window & {queryLocalFonts?:()=>Promise<LocalFontData[]>};
type UploadedRecord = {family:string;file:Blob;filename:string};
const DB_NAME='wayup-studio-next-imported-fonts-v1';

function openFontDB():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(Error('IndexedDB no disponible'));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('fonts'))db.createObjectStore('fonts',{keyPath:'family'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function getImported():Promise<UploadedRecord[]> {
  const db=await openFontDB();
  try {
    return await new Promise((resolve,reject)=>{
      const txn=db.transaction('fonts','readonly'),request=txn.objectStore('fonts').getAll();
      request.onsuccess=()=>resolve(request.result as UploadedRecord[]);
      request.onerror=()=>reject(request.error);
    });
  }finally{db.close()}
}
async function saveImported(record:UploadedRecord):Promise<void>{
  const db=await openFontDB();
  try{
    await new Promise<void>((resolve,reject)=>{
      const txn=db.transaction('fonts','readwrite');
      txn.objectStore('fonts').put(record);
      txn.oncomplete=()=>resolve();
      txn.onerror=()=>reject(txn.error);
      txn.onabort=()=>reject(txn.error);
    });
  }finally{db.close()}
}
const installed = new Set<string>();
async function installUploaded(record:UploadedRecord):Promise<void>{
  if(installed.has(record.family))return;
  if(typeof FontFace==='undefined')throw Error('Este navegador no admite fuentes importadas.');
  const url=URL.createObjectURL(record.file);
  try{
    const face=new FontFace(record.family,`url("${url}")`,{style:'normal',weight:'400'});
    await face.load();
    document.fonts.add(face);
    installed.add(record.family);
  }finally{URL.revokeObjectURL(url)}
}
function FontCard({font,active,onChoose}:{font:FontEntry;active:boolean;onChoose():void}){
  useEffect(()=>{ensureFontStylesheet(font)},[font.family,font.id,font.source]);
  return <button type="button" role="option" aria-selected={active}
    onClick={onChoose} title={`Aplicar ${font.family}`}
    className={`flex min-h-[66px] w-full flex-col justify-center gap-1 rounded-lg border px-3 py-2 text-left transition-colors duration-150 ${active?'border-[#7696ff80] bg-[#26334c]':'border-white/[.06] bg-[#151b23] hover:border-[#7b95ea70] hover:bg-[#222b39]'}`}>
    <span className="flex items-center justify-between gap-2">
      <span className="truncate text-[11px] font-semibold text-[#d6dfed]">{font.family}</span>
      {active&&<Check size={13} className="shrink-0 text-[#90aaff]"/>}
    </span>
    <span className="truncate text-[15px] leading-6 text-[#e7ebf2]" style={{fontFamily:cssFamily(font.family)}}>Diseña algo extraordinario 123 Áñ</span>
    <span className="text-[9px] text-[#8c9bac]">{FONT_SOURCE_LABELS[font.source]}</span>
  </button>;
}
const importedName=(filename:string)=>{
  const raw=filename.replace(/\.(woff2?|ttf|otf)$/i,'').replace(/[_-]/g,' ')
    .replace(/[^a-zA-Z0-9À-ÿ ]/g,' ').trim().slice(0,70);
  return raw?'WAYUP '+raw:'';
};

export function FontPicker({value,onChange}:{value:string;onChange(nextFamily:string):void}){
  const [open,setOpen]=useState(false);
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [fonts,setFonts]=useState<FontEntry[]>(initialFonts);
  const [visible,setVisible]=useState(24);
  const [status,setStatus]=useState('Catálogo básico disponible. Abre la biblioteca para cargar Google y Open Fonts.');
  const [loading,setLoading]=useState(false),[detecting,setDetecting]=useState(false);
  const [remember,setRemember]=useState(false),[manual,setManual]=useState('');
  const importRef=useRef<HTMLInputElement>(null),listRef=useRef<HTMLInputElement>(null);
  const family=familyFromCSS(value),applied=fontLookup(family);
  const loaded=useRef(false),localNames=useRef<string[]>([]);
  const currentOption=fonts.find(f=>fontLookup(f.family)===applied);
  const addFonts=(incoming:FontEntry[])=>setFonts(prev=>mergeFonts(prev,incoming));
  useEffect(()=>{
    try {
      if(localStorage.getItem(FONT_REMEMBER_KEY)==='1'){
        setRemember(true);
        const saved:unknown=JSON.parse(localStorage.getItem(FONT_NAMES_KEY)||'[]');
        if(Array.isArray(saved)&&saved.length<=7000){
          const names=saved.filter(validFamily);
          localNames.current=names;
          addFonts(names.map(family=>({family,source:'local'})));
        }
      }
    }catch{/* Almacenamiento opcional. */}
    getImported().then(async entries=>{
      const safe=entries.filter(e=>validFamily(e.family)&&e.file instanceof Blob);
      const results=await Promise.allSettled(safe.map(installUploaded));
      addFonts(safe.filter((_,i)=>results[i]?.status==='fulfilled').map(e=>({family:e.family,source:'uploaded'})));
    }).catch(()=>{/* IndexedDB bloqueada. */});
  },[]);
  useEffect(()=>{
    if(!open||loaded.current)return;
    loaded.current=true;
    const controller=new AbortController();setLoading(true);
    loadFontsource(controller.signal).then(all=>{
      addFonts(all);
      setStatus('Catálogo completo disponible: Google Fonts y otras fuentes abiertas.');
    }).catch(error=>{
      loaded.current=false;
      if((error as Error)?.name!=='AbortError'){
        loaded.current=false;
        setStatus('Catálogo temporalmente no disponible. Puedes usar las fuentes incluidas o importar las tuyas.');
      }
    }).finally(()=>setLoading(false));
    return ()=>controller.abort();
  },[open]);
  const filtered=useMemo(()=>fonts.filter(f=>(filter==='all'||f.source===filter)&&
    (!query.trim()||fontLookup(f.family).includes(fontLookup(query.trim())))),[fonts,filter,query]);
  const shown=filtered.slice(0,visible);
  const choose=(entry:FontEntry)=>{
    ensureFontStylesheet(entry);
    onChange(cssFamily(entry.family));setOpen(false);
    setStatus('Fuente '+entry.family+' aplicada al elemento seleccionado.');
  };
  const refreshLocal=(names:string[])=>{
    const unique=[...new Set([...localNames.current,...names.filter(validFamily)])].slice(0,7000);
    localNames.current=unique;
    addFonts(names.filter(validFamily).map(family=>({family,source:'local'})));
    if(remember)try{localStorage.setItem(FONT_NAMES_KEY,JSON.stringify(unique));}catch{}
    setFilter('local');setVisible(24);
  };
  const detect=async()=>{
    const queryFonts=(window as LocalWindow).queryLocalFonts;
    if(typeof queryFonts!=='function'){
      setStatus('Firefox no permite enumerar todas las fuentes del equipo. Usa «Exportar listado Windows», importa su JSON o añade una fuente manualmente.');return;
    }
    setDetecting(true);
    try{
      const results=await queryFonts();
      const names=[...new Set(results.map(font=>font.family).filter(validFamily))];
      refreshLocal(names);
      setStatus('Detectadas '+names.length+' familias de tu ordenador. Solo se guardan sus nombres si activas «Recordar».');
    }catch(error){
      setStatus((error as Error)?.name==='NotAllowedError'?
        'Se ha denegado el permiso. Inténtalo de nuevo o importa un listado de Windows.':
        'No se pudieron detectar las fuentes locales. Puedes importar un JSON o un archivo de fuente.');
    }finally{setDetecting(false)}
  };
  const rememberChange=(checked:boolean)=>{
    setRemember(checked);
    try{
      if(checked){localStorage.setItem(FONT_REMEMBER_KEY,'1');localStorage.setItem(FONT_NAMES_KEY,JSON.stringify(localNames.current));}
      else{localStorage.removeItem(FONT_REMEMBER_KEY);localStorage.removeItem(FONT_NAMES_KEY);}
    }catch{setStatus('El navegador no ha permitido guardar esta preferencia.')}
  };
  const importList=async(file:File|undefined)=>{
    if(!file)return;
    if(!file.name.toLowerCase().endsWith('.json')||file.size>512000){setStatus('Selecciona un listado JSON de hasta 500 KB.');return}
    try{
      const payload=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
      if(payload?.format!=='wayup-local-fonts-v1'||!Array.isArray(payload.families)||payload.families.length>7000)
        throw Error('Formato inválido');
      const names:string[]=payload.families.filter(validFamily);
      refreshLocal(names);
      setStatus('Añadidas '+names.length+' familias de Windows. Deben estar instaladas en el equipo donde se muestren.');
    }catch{setStatus('Listado no válido. Usa el archivo generado con «Exportar listado Windows».')}
  };
  const importFont=async(file:File|undefined)=>{
    if(!file)return;
    if(!/\.(woff2?|ttf|otf)$/i.test(file.name)||file.size>5*1024*1024){
      setStatus('Usa WOFF2, WOFF, TTF u OTF de hasta 5 MB.');return;
    }
    const name=importedName(file.name);
    if(!validFamily(name)){setStatus('El nombre del archivo no es válido.');return}
    const record:UploadedRecord={family:name,file,filename:file.name};
    try{
      await installUploaded(record);
      addFonts([{family:name,source:'uploaded'}]);setFilter('uploaded');onChange(cssFamily(name));
      try{await saveImported(record);setStatus('Fuente importada, aplicada y guardada en este navegador. Revisa la licencia antes de publicarla.');}
      catch{setStatus('Fuente importada y aplicada. No se ha podido conservar al cerrar el navegador.')}
    }catch{setStatus('No se pudo cargar esa fuente. Comprueba que el archivo sea válido.')}
  };
  const downloadWindows=()=>{
    const file=new Blob([WAYUP_WINDOWS_FONT_EXPORT],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(file),a=document.createElement('a');
    a.href=url;a.download='wayup-exportar-fuentes.ps1';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    setStatus('Ejecuta el script PowerShell en Windows. Creará «wayup-fuentes-windows.json» en el Escritorio. Después impórtalo aquí.');
  };
  return <div className="relative mb-3">
    <span className="field-label">Familia tipográfica</span>
    <button type="button" className="field-input flex items-center justify-between gap-3 text-left"
      aria-expanded={open} aria-controls="wayup-next-font-library" aria-label="Abrir biblioteca completa de fuentes"
      onClick={()=>{setOpen(v=>!v);setVisible(24)}}>
      <span className="min-w-0 truncate" style={{fontFamily:value}}>{currentOption?.family||family||'Seleccionar fuente'}</span>
      <ChevronDown size={14} className={`shrink-0 text-faint transition-transform ${open?'rotate-180':''}`}/>
    </button>
    {open&&<section id="wayup-next-font-library" className="mt-2 rounded-xl border border-white/[.11] bg-[#171e29] p-2.5 shadow-panel" aria-label="Biblioteca de fuentes tipográficas">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#e4eafa]">Fuentes disponibles</span>
        <button type="button" className="ui-icon h-6! w-6!" aria-label="Cerrar catálogo" onClick={()=>setOpen(false)}><X size={14}/></button>
      </div>
      <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#0d121b] px-2.5">
        <Search size={14} className="shrink-0 text-[#96a7c2]"/>
        <input autoComplete="off" type="search" value={query} onChange={e=>{setQuery(e.target.value);setVisible(24)}}
          placeholder="Buscar entre todas las fuentes…" aria-label="Buscar familias tipográficas"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-[#eff2fc] outline-none placeholder:text-[#8190a8]"/>
      </label>
      <div className="scroll-subtle mb-2 flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Filtrar fuentes">
        {TABS.map(tab=><button type="button" key={tab.id} aria-pressed={filter===tab.id} onClick={()=>{setFilter(tab.id);setVisible(24)}}
          className={`shrink-0 rounded-md border px-2 py-1.5 text-[9px] font-semibold ${filter===tab.id?'border-[#819aff75] bg-[#304267] text-[#f1f4ff]':'border-white/10 bg-[#202735] text-[#b0bdd0]'}`}>{tab.label}</button>)}
      </div>
      <p className="mb-2 text-[10px] text-[#acb9ca]" role="status">{loading?'Cargando catálogo en línea…':filtered.length+' familias encontradas'}{filtered.length>visible?' · mostrando '+shown.length:''}</p>
      <div className="scroll-subtle grid max-h-[300px] grid-cols-1 gap-1.5 overflow-y-auto pr-1" role="listbox" aria-label="Familias tipográficas disponibles">
        {shown.map(entry=><FontCard key={entry.family+'-'+entry.source} font={entry} active={fontLookup(entry.family)===applied} onChoose={()=>choose(entry)}/>)}
        {!filtered.length&&<p className="px-2 py-5 text-[11px] text-[#aab5c7]">No hay resultados. Prueba otra búsqueda o importa una fuente.</p>}
      </div>
      {visible<filtered.length&&<button type="button" className="ui-ghost mt-2 w-full justify-center" onClick={()=>setVisible(n=>n+24)}>Ver 24 fuentes más</button>}
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="mb-2 text-[10px] font-bold text-[#e4eafa]">Fuentes de tu ordenador</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <button type="button" className="ui-ghost h-auto! min-h-[32px]! px-1.5! text-[9px]!" onClick={detect} disabled={detecting}><HardDrive size={12}/>{detecting?'Detectando…':'Detectar las de mi PC'}</button>
          <button type="button" className="ui-ghost h-auto! min-h-[32px]! px-1.5! text-[9px]!" onClick={downloadWindows}><Download size={12}/>Exportar listado Windows</button>
          <button type="button" className="ui-ghost h-auto! min-h-[32px]! px-1.5! text-[9px]!" onClick={()=>listRef.current?.click()}><Upload size={12}/>Importar lista (.json)</button>
          <button type="button" className="ui-ghost h-auto! min-h-[32px]! px-1.5! text-[9px]!" onClick={()=>importRef.current?.click()}><FilePlus size={12}/>Importar TTF / WOFF</button>
        </div>
        <input ref={importRef} hidden type="file" accept=".woff2,.woff,.ttf,.otf" onChange={e=>{void importFont(e.target.files?.[0]);e.target.value=''}}/>
        <input ref={listRef} hidden type="file" accept=".json,application/json" onChange={e=>{void importList(e.target.files?.[0]);e.target.value=''}}/>
        <div className="mb-2 flex gap-1.5">
          <input type="text" maxLength={95} value={manual} onChange={e=>setManual(e.target.value)} placeholder="Nombre instalado en Windows…"
            aria-label="Añadir una fuente local por su nombre" className="field-input h-[32px]! min-w-0 flex-1"/>
          <button type="button" className="ui-ghost h-[32px]!" onClick={()=>{
            const name=manual.trim();if(!validFamily(name)){setStatus('Introduce un nombre de familia válido.');return}
            refreshLocal([name]);setManual('');onChange(cssFamily(name));
            setStatus('Fuente local '+name+' añadida. Debe estar instalada para visualizarse.');
          }}>Añadir</button>
        </div>
        <label className="mb-2 flex items-start gap-2 text-[10px] leading-4 text-[#c1ccdd]">
          <input type="checkbox" checked={remember} onChange={e=>rememberChange(e.target.checked)} className="mt-0.5 accent-[#7898ff]"/>
          Recordar los nombres de mis fuentes locales en este navegador
        </label>
        <p role="status" className="text-[10px] leading-[1.6] text-[#9aa9be]">{status}</p>
        <p className="mt-2 text-[9px] leading-4 text-[#7989a3]">Las fuentes instaladas solo funcionarán en los equipos que las tengan. Las importadas se almacenan en este navegador; para publicarlas en una web será necesario alojarlas con licencia.</p>
      </div>
    </section>}
  </div>;
}