'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Circle, FileCode2, Files, FolderOpen,
  Heading1, Layers3, PanelLeft, MousePointer2, Search, Square,
  TextCursor, Type, X
} from 'lucide-react';
import type { ProjectDoc, StudioElement } from '@/lib/studio-types';

interface NavigatorProps {
  doc: ProjectDoc;
  selectedId: string | null;
  onSelect(id: string | null): void;
  collapsed: boolean;
  onCollapse(): void;
  mobileOpen: boolean;
  onCloseMobile(): void;
}

const treeIcon = (node: StudioElement) => {
  if (node.kind === 'titulo') return Heading1;
  if (node.kind === 'subtitulo') return Type;
  if (node.kind === 'boton') return MousePointer2;
  if (node.kind === 'parrafo') return TextCursor;
  return Square;
};

export function Navigator({ doc, selectedId, onSelect, collapsed, onCollapse, mobileOpen, onCloseMobile }: NavigatorProps) {
  const [tab, setTab] = useState<'capas' | 'proyectos'>('capas');
  const [search, setSearch] = useState('');
  const [closed, setClosed] = useState<string[]>([]);
  const sections = useMemo(() => doc.sections.filter(section =>
    !search || section.label.toLowerCase().includes(search.toLowerCase()) || section.children.some(id =>
      doc.elements[id]?.label.toLowerCase().includes(search.toLowerCase())
    )), [doc, search]);

  return (
    <aside data-mobile-open={mobileOpen} className="studio-left flex flex-col overflow-hidden border-r border-white/[.065] bg-panel" aria-label="Biblioteca y estructura de la página">
      <div className="flex h-[57px] shrink-0 items-center justify-between border-b border-white/[.06] px-3.5">
        {!collapsed ? <div className="flex items-center gap-2"><Layers3 size={14} className="text-brand"/><span className="text-[12px] font-[730]">Explorador</span></div> : <Layers3 size={16} className="mx-auto text-brand"/>}
        <div className="flex items-center gap-1">
          <button className="ui-icon h-7! w-7!" title={collapsed ? 'Expandir biblioteca' : 'Contraer biblioteca'} aria-label={collapsed ? 'Expandir biblioteca' : 'Contraer biblioteca'} onClick={onCollapse}>
            {collapsed ? <ChevronsRight size={16}/> : <ChevronsLeft size={16}/>}</button>
          <button onClick={onCloseMobile} className="ui-icon h-7! w-7! md:hidden" aria-label="Cerrar biblioteca"><X size={15}/></button>
        </div>
      </div>
      {!collapsed && <>
        <div className="px-3 pb-3 pt-3">
          <div className="ui-segment flex w-full" role="group" aria-label="Contenido del explorador">
            <button className="min-w-0 flex-1" onClick={() => setTab('capas')} aria-pressed={tab === 'capas'}><Layers3 size={13}/> Capas</button>
            <button className="min-w-0 flex-1" onClick={() => setTab('proyectos')} aria-pressed={tab === 'proyectos'}><FolderOpen size={13}/> Proyecto</button>
          </div>
          {tab === 'capas' && <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-white/[.075] bg-app px-3 text-faint">
            <Search size={14}/><input className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-[#667184]" placeholder="Buscar elementos…" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar elementos"/>
          </div>}
        </div>
        <div className="scroll-subtle flex-1 overflow-y-auto px-2.5 pb-4">
          {tab === 'capas' ? <>
            <div className="mb-2 flex items-center justify-between px-2"><span className="panel-kicker">Estructura</span><span className="font-mono text-[10px] text-faint">{doc.sections.length}</span></div>
            <button className="panel-row mb-1 flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] font-semibold text-[#d3dbe7]" onClick={()=>onSelect(null)}><FileCode2 size={15} className="text-[#9ea8bc]"/><span>Página de inicio</span></button>
            {sections.map(section=>{
              const folded = closed.includes(section.id) && !search;
              return <div key={section.id} className="mb-[2px]">
                <button className="panel-row flex h-[32px] w-full items-center gap-1.5 rounded-md px-2 text-left text-[11px] text-[#aeb6c4]" aria-expanded={!folded} onClick={()=>setClosed(items=>folded?items.filter(x=>x!==section.id):[...items,section.id])}>
                  {folded?<ChevronRight size={13} className="text-faint"/>:<ChevronDown size={13} className="text-faint"/>}
                  <PanelLeft size={13} className="text-[#73839b]"/><span className="min-w-0 flex-1 truncate">{section.label}</span>
                  {section.children.length>0&&<span className="font-mono text-[9px] text-faint">{section.children.length}</span>}
                </button>
                {!folded && section.children.filter(id=>!search||doc.elements[id]?.label.toLowerCase().includes(search.toLowerCase())||section.label.toLowerCase().includes(search.toLowerCase())).map(id=>{
                  const node=doc.elements[id];if(!node)return null;
                  const Icon=treeIcon(node);
                  return <button key={id} className="panel-row ml-4 flex h-[30px] w-[calc(100%-16px)] items-center gap-2 rounded-md pl-4 pr-2 text-left text-[10.5px] text-[#8591a4]" data-selected={selectedId===id} onClick={()=>onSelect(id)}>
                    <Icon size={13} className="shrink-0 opacity-75"/><span className="min-w-0 flex-1 truncate">{node.label}</span>
                    {selectedId===id&&<span className="h-1 w-1 rounded-full bg-[#8ca5ff]"/>}
                  </button>;
                })}
              </div>;
            })}
            {!sections.length&&<p className="px-3 pt-5 text-center text-[11px] text-faint">No se han encontrado elementos.</p>}
          </>:<div className="px-1"><span className="panel-kicker">Biblioteca privada</span>
            <button className="mt-3 w-full rounded-xl border border-[#839dff32] bg-[#607fff13] p-3 text-left transition-colors hover:bg-[#607fff23]" onClick={()=>setTab('capas')}>
              <div className="flex items-center gap-2"><Files size={17} className="text-brand"/><span className="truncate text-[11.5px] font-[710] text-[#dbe3f6]">{doc.name}</span></div>
              <div className="mt-2 pl-6 font-mono text-[10px] text-mist">Versión {doc.version} · {doc.lastEdited}</div>
            </button>
            <p className="mt-4 px-2 text-[10.5px] leading-5 text-faint">La biblioteca completa de proyectos se conectará al servicio de almacenamiento de WAYUP.</p>
          </div>}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-white/[.065] px-4 py-3 text-[10px] text-faint"><span className="inline-flex items-center gap-2"><Circle size={7} className="fill-emerald-400 text-emerald-400"/> Edición local</span><span className="font-mono">{doc.sections.length} secciones</span></div>
      </>}
    </aside>
  );
}