'use client';

import { useCallback, useEffect, useMemo, useReducer, useState, type CSSProperties } from 'react';
import { Circle, Command } from 'lucide-react';
import { Canvas } from './canvas';
import { Inspector } from './inspector';
import { Navigator } from './navigator';
import { TopBar } from './top-bar';
import { DEMO_PROJECT } from '@/lib/demo-project';
import { loadLocalDemo, persistLocalDemo } from '@/lib/studio-service';
import { historyReducer } from '@/lib/studio-store';
import type { Device, ElementStyle, InspectorTab, Mode, StudioElement } from '@/lib/studio-types';

export function StudioApp() {
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: DEMO_PROJECT, future: [] });
  const [selectedId, setSelectedId] = useState<string | null>('cta');
  const [mode, setMode] = useState<Mode>('diseno');
  const [device, setDevice] = useState<Device>('escritorio');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('diseno');
  const [zoom, setZoom] = useState(90);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [mobileInspector, setMobileInspector] = useState(false);
  const [savedContent, setSavedContent] = useState(JSON.stringify(DEMO_PROJECT));
  const [notice, setNotice] = useState('');
  const doc = history.present;
  const dirty = useMemo(()=>JSON.stringify(doc) !== savedContent,[doc,savedContent]);

  useEffect(()=>{
    if(window.innerWidth<=1024)setNavCollapsed(true);
  }, []);

  useEffect(()=>{
    const restored = loadLocalDemo(DEMO_PROJECT);
    dispatch({ type: 'restaurar', doc: restored });
    setSavedContent(JSON.stringify(restored));
  }, []);

  const undo = useCallback(()=>dispatch({type:'deshacer'}),[]);
  const redo = useCallback(()=>dispatch({type:'rehacer'}),[]);

  const onSave = useCallback(()=>{
    try {
      persistLocalDemo(doc);
      setSavedContent(JSON.stringify(doc));
      setNotice('Cambios guardados en este navegador.');
    } catch {
      setNotice('No se han podido guardar los cambios en este navegador.');
    }
  },[doc]);

  useEffect(()=>{
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey||event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(target?.tagName) || target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      if(key==='z'){event.preventDefault();if(event.shiftKey) redo();else undo();}
      if(key==='y'){event.preventDefault();redo();}
      if(key==='s'){event.preventDefault();onSave();}
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[undo,redo,onSave]);

  useEffect(()=>{
    if(!notice)return;
    const id = window.setTimeout(()=>setNotice(''),4200);
    return ()=>window.clearTimeout(id);
  },[notice]);

  const onStyle = (id: string, patch: Partial<ElementStyle>) => dispatch({type:'estilo',elementId:id,patch});
  const onElement = (id: string, patch: Partial<StudioElement>) => dispatch({type:'modificar',elementId:id,patch});
  const onMove = (id: string, x: number, y: number) => dispatch({type:'estilo',elementId:id,patch:{x,y}});
  const onSelect = (id: string | null) => { setSelectedId(id); setMobileNav(false); };

  return <div className="studio-shell" style={{'--nav-width':navCollapsed?'64px':'264px'} as CSSProperties}>
    <TopBar project={doc} dirty={dirty} saving={false} canUndo={history.past.length>0} canRedo={history.future.length>0}
      onUndo={undo} onRedo={redo} onSave={onSave} onToggleLibrary={()=>{setNavCollapsed(false);setMobileNav(v=>!v)}} onToggleInspector={()=>setMobileInspector(v=>!v)}/>
    <Navigator doc={doc} selectedId={selectedId} onSelect={onSelect} collapsed={navCollapsed} onCollapse={()=>setNavCollapsed(v=>!v)} mobileOpen={mobileNav} onCloseMobile={()=>setMobileNav(false)}/>
    <Canvas doc={doc} mode={mode} device={device} zoom={zoom} selectedId={selectedId} onSelect={onSelect} onMode={setMode} onDevice={setDevice} onZoom={setZoom} onMove={onMove}/>
    <Inspector doc={doc} selectedId={selectedId} tab={inspectorTab} onTab={setInspectorTab} onStyle={onStyle} onElement={onElement} mobileOpen={mobileInspector} onCloseMobile={()=>setMobileInspector(false)}/>
    {(mobileNav||mobileInspector)&&<button className="fixed inset-0 z-[30] bg-black/45 md:hidden" onClick={()=>{setMobileNav(false);setMobileInspector(false)}} aria-label="Cerrar paneles"/>}
    <footer className="studio-status z-10 flex items-center justify-between border-t border-white/[.07] bg-[#0e1116] px-4" role="status" aria-live="polite">
      <div className="flex min-w-0 items-center gap-3 text-[9px] text-[#738094]"><span className="inline-flex items-center gap-1.5"><Circle size={6} className="fill-emerald-400 text-emerald-400"/>Vista de diseño</span><span className="hidden truncate sm:block">{notice||'Prototipo local · No conectado a producción'}</span></div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] tabular-nums text-[#748296]"><span>{doc.sections.length} secciones</span><span>{device==='escritorio'?'Escritorio':device==='tableta'?'Tableta':'Móvil'}</span><span>{zoom}%</span><span className="hidden items-center gap-1 sm:inline-flex"><Command size={10}/> + S</span></div>
    </footer>
  </div>;
}