'use client';

import { Check, ChevronDown, ChevronRight, Cloud, FolderOpen, Menu, PanelRightOpen, Redo2, Save, Undo2 } from 'lucide-react';
import type { ProjectDoc } from '@/lib/studio-types';

interface TopBarProps {
  project: ProjectDoc;
  dirty: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  onSave(): void;
  onToggleLibrary(): void;
  onToggleInspector(): void;
}

export function TopBar({ project, dirty, saving, canUndo, canRedo, onUndo, onRedo, onSave, onToggleLibrary, onToggleInspector }: TopBarProps) {
  return (
    <header className="studio-header flex items-center justify-between border-b border-white/[.07] bg-[#11141a]/95 px-3 backdrop-blur-xl sm:px-5" aria-label="Barra superior de WAY UP Studio">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onToggleLibrary} className="ui-icon md:hidden" aria-label="Mostrar biblioteca"><Menu size={17} /></button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#466bef] text-[17px] font-black italic tracking-[-.11em] text-white shadow-[0_0_22px_#426bfb42]" aria-hidden="true">W</div>
        <div className="mr-4 hidden leading-tight sm:block">
          <div className="text-[13px] font-[780] tracking-[-.035em] text-[#f0f3fa]">WAY UP <span className="font-[430] text-[#8996ae]">Studio</span></div>
          <div className="mt-[2px] font-mono text-[8px] font-semibold tracking-[.14em] text-[#687488]">ESPACIO DE CREACIÓN</div>
        </div>
        <div className="mx-1 hidden h-5 w-px bg-white/10 lg:block" />
        <div className="hidden shrink-0 items-center gap-2 text-faint lg:flex"><FolderOpen size={13} /><span className="text-[11px]">Proyectos</span><ChevronRight size={12} /></div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-[220px] truncate text-[11.5px] font-[680] tracking-[-.01em] text-ink xl:max-w-[330px]">{project.name}</span>
          <span className="hidden items-center gap-1 rounded-md bg-white/[.045] px-1.5 py-1 font-mono text-[9px] text-faint md:inline-flex">v{project.version}<ChevronDown size={11} /></span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="mr-2 hidden items-center gap-2 text-[10px] text-mist lg:flex"><span className={`h-[6px] w-[6px] rounded-full ${dirty ? 'bg-amber-400' : 'bg-emerald-400'}`} /><span>{dirty ? 'Cambios sin guardar' : 'Cambios guardados'}</span></div>
        <span className="mx-1 hidden h-5 w-px bg-white/[.09] md:block" />
        <button className="ui-icon" disabled={!canUndo} onClick={onUndo} title="Deshacer (Ctrl + Z)" aria-label="Deshacer"><Undo2 size={16}/></button>
        <button className="ui-icon" disabled={!canRedo} onClick={onRedo} title="Rehacer (Ctrl + Mayús + Z)" aria-label="Rehacer"><Redo2 size={16}/></button>
        <button className="ui-primary ml-1" onClick={onSave} disabled={!dirty || saving} aria-label={saving ? 'Guardando' : 'Guardar proyecto'}>
          {saving ? <Cloud size={14} className="animate-pulse"/> : dirty ? <Save size={14}/> : <Check size={14}/>}
          <span className="hidden sm:inline">{saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}</span>
        </button>
        <button onClick={onToggleInspector} className="ui-icon ml-1 md:hidden" aria-label="Mostrar inspector"><PanelRightOpen size={17}/></button>
      </div>
    </header>
  );
}