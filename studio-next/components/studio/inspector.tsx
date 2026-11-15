'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Check, ChevronDown, CircleHelp, Link2, MousePointer2,
  Paintbrush, RotateCcw, SlidersHorizontal, Sparkles, Type, X
} from 'lucide-react';
import type { ElementStyle, InspectorTab, ProjectDoc, StudioElement } from '@/lib/studio-types';
import { BUTTON_PRESETS } from '@/lib/demo-project';
import { FontPicker } from './font-picker';

interface InspectorProps {
  doc: ProjectDoc;
  selectedId: string | null;
  tab: InspectorTab;
  onTab(tab: InspectorTab): void;
  onStyle(id: string, patch: Partial<ElementStyle>): void;
  onElement(id: string, patch: Partial<StudioElement>): void;
  mobileOpen: boolean;
  onCloseMobile(): void;
}

function Group({ title, children, first = false }: { title: string; children: ReactNode; first?: boolean }) {
  return <section className={`panel-section ${first ? 'border-t-0!' : ''}`}>
    <h3 className="panel-heading mb-4 flex items-center justify-between">{title}<ChevronDown size={13} className="text-[#667285]"/></h3>
    {children}
  </section>;
}

function NumberField({ label, value, unit, min, max, onCommit }: {label: string; value: number; unit?: string; min: number; max: number; onCommit(v: number): void}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(()=>setRaw(String(value)),[value]);
  return <label className="block min-w-0"><span className="field-label">{label}</span>
    <span className="relative block"><input type="number" min={min} max={max} value={raw} onChange={e=>setRaw(e.target.value)}
      onBlur={()=>{const n=Number(raw);if(Number.isFinite(n)){const safe=Math.max(min,Math.min(max,n));setRaw(String(safe));if(safe!==value)onCommit(safe);}else setRaw(String(value));}}
      onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}
      className="field-input pr-7 font-mono tabular-nums"/><span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-faint">{unit}</span></span>
  </label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  const valid = /^#[\da-f]{6}$/i.test(value);
  return <label className="block min-w-0"><span className="field-label">{label}</span><span className="field-color">
    <input aria-label={`Elegir ${label.toLowerCase()}`} type="color" value={valid ? value : '#242933'} onChange={e=>onChange(e.target.value)}/>
    <code className="truncate">{valid ? value.toUpperCase() : 'Sin color'}</code>
  </span></label>;
}

function ControlLine({label,children}:{label:string;children:ReactNode}) {
  return <div className="mb-3 flex items-center justify-between gap-3"><span className="text-[10.5px] text-[#8994a6]">{label}</span>{children}</div>;
}

export function Inspector({ doc, selectedId, tab, onTab, onStyle, onElement, mobileOpen, onCloseMobile }: InspectorProps) {
  const selected = selectedId ? doc.elements[selectedId] : null;
  const [textDraft, setTextDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [buttonCategory, setButtonCategory] = useState('Todos');
  const [buttonSearch, setButtonSearch] = useState('');
  useEffect(()=>{setTextDraft(selected?.text||'');setLinkDraft(selected?.href||'');setLinkError('')},[selectedId, selected?.text, selected?.href]);
  const style = selected?.style;
  const visibleButtons = BUTTON_PRESETS.filter(p => (buttonCategory==='Todos' || p.group===buttonCategory) && (p.title.toLocaleLowerCase('es').includes(buttonSearch.toLocaleLowerCase('es'))));

  function saveLink() {
    if(!selected)return;
    const href = linkDraft.trim();
    const relative = /^#[\w-]+$/.test(href) || /^\/(?!\/)[^\s]*$/.test(href);
    const external = /^https?:\/\//i.test(href);
    const special = /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href) || /^tel:\+?[\d\s().-]{6,22}$/i.test(href);
    if(href && !relative && !external && !special){setLinkError('Utiliza una URL https://, #sección, correo o teléfono válido.');return;}
    if(external){try{const parsed=new URL(href);if(!['http:','https:'].includes(parsed.protocol))throw Error();}catch{setLinkError('La dirección web no es válida.');return}}
    setLinkError('');onElement(selected.id,{href});
  }

  return <aside data-mobile-open={mobileOpen} className="studio-right flex h-full flex-col overflow-hidden border-l border-white/[.07] bg-panel" aria-label="Inspector contextual de propiedades">
    <div className="shrink-0 border-b border-white/[.07] px-[17px] pb-3 pt-[17px]">
      <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><SlidersHorizontal size={15} className="text-brand"/><h2 className="text-[12px] font-bold tracking-[-.015em]">Inspector</h2></div><button onClick={onCloseMobile} className="ui-icon h-[27px]! w-[27px]! md:hidden" aria-label="Cerrar inspector"><X size={14}/></button><span className="hidden font-mono text-[9px] text-faint md:block">PROPIEDADES</span></div>
      <div className="ui-segment grid w-full grid-cols-3" role="group" aria-label="Secciones del Inspector">
        <button className="px-0!" aria-pressed={tab==='diseno'} onClick={()=>onTab('diseno')}><Paintbrush size={12}/>Diseño</button>
        <button className="px-0!" aria-pressed={tab==='contenido'} onClick={()=>onTab('contenido')}><Type size={12}/>Contenido</button>
        <button className="px-0!" aria-pressed={tab==='interacciones'} onClick={()=>onTab('interacciones')}><MousePointer2 size={12}/>Acciones</button>
      </div>
    </div>
    <div className="scroll-subtle flex-1 overflow-y-auto">
      <div className="border-b border-white/[.07] px-[17px] py-[15px]">
        <span className="panel-kicker">Elemento seleccionado</span>
        {selected ? <div className="mt-3 flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#89a4ff27] bg-[#7891ff17] text-brand"><Type size={16}/></span><div className="min-w-0"><div className="truncate text-[12px] font-[690] text-[#f0f3fa]">{selected.label}</div><div className="mt-0.5 truncate font-mono text-[9px] text-faint">#{selected.id} · {selected.kind}</div></div></div>
        :<div className="mt-3 flex items-center gap-2.5 rounded-lg border border-dashed border-white/[.09] p-3 text-[11px] text-faint"><MousePointer2 size={16}/> Selecciona un elemento en el Canvas.</div>}
      </div>
      {selected && style && tab === 'diseno' && <>
        {selected.kind==='boton'&&<details className="border-b border-white/[.07] px-[17px] py-4" open>
          <summary className="panel-heading flex cursor-pointer items-center justify-between">Biblioteca de botones <span className="font-mono text-[9px] font-normal text-faint">{BUTTON_PRESETS.length} diseños · <ChevronDown size={12} className="inline"/></span></summary>
          <p className="mb-3 mt-2 text-[10px] leading-5 text-faint">Cambia de estilo sin modificar el enlace ni el texto.</p>
          <input className="field-input mb-2" value={buttonSearch} onChange={e=>setButtonSearch(e.target.value)} placeholder="Buscar un diseño…" aria-label="Buscar diseños de botones" />
          <div className="scroll-subtle mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Categorías de diseños">
            {['Todos','Modernos','Minimalistas','Elegantes','Llamativos','Social'].map(cat=><button key={cat} className={`shrink-0 rounded-md border px-2.5 py-[6px] text-[9px] font-semibold transition-colors ${buttonCategory===cat?'border-[#7a97ff50] bg-[#7a97ff24] text-[#c5d3ff]':'border-white/[.06] bg-[#1a1d23] text-faint hover:bg-[#252a34]'}`} onClick={()=>setButtonCategory(cat)} aria-pressed={buttonCategory===cat}>{cat}</button>)}
          </div>
          <div className="scroll-subtle grid max-h-[248px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
            {visibleButtons.map(p=><button key={p.id} title={`Aplicar ${p.title}`} onClick={()=>onStyle(selected.id,{background:p.background,color:p.color,radius:p.radius,shadow:p.shadow||'ninguna',border:p.border})}
              className="group flex min-h-[86px] flex-col items-stretch justify-center gap-2.5 rounded-lg border border-white/[.07] bg-[#171b22] px-2.5 py-2 text-left transition-all duration-200 hover:border-[#879fff55] hover:bg-[#202633]">
              <span className="flex min-h-[32px] items-center justify-center border px-2 text-[10px] font-[750]" style={{background:p.background,color:p.color,borderColor:p.border||'transparent',borderRadius:p.radius}}>Continuar</span>
              <span className="text-[10px] font-semibold text-[#a4aebd] group-hover:text-white">{p.title}</span>
            </button>)}
            {!visibleButtons.length&&<p className="col-span-2 py-4 text-center text-[10px] text-faint">No hay resultados para esta búsqueda.</p>}
          </div>
        </details>}
        <Group title="Posición y medidas" first>
          <div className="mb-3 grid grid-cols-2 gap-2.5">
            <NumberField label="Posición X" value={style.x} unit="px" min={-600} max={600} onCommit={x=>onStyle(selected.id,{x})}/>
            <NumberField label="Posición Y" value={style.y} unit="px" min={-600} max={600} onCommit={y=>onStyle(selected.id,{y})}/>
          </div>
          <div className="flex items-center justify-between"><span className="text-[10px] text-faint">Posicionamiento libre</span><button className="ui-ghost h-[28px]! px-2.5!" onClick={()=>onStyle(selected.id,{x:0,y:0})} title="Restablecer posición"><RotateCcw size={12}/>Restablecer</button></div>
        </Group>
        <Group title="Tipografía">
          <FontPicker value={style.fontFamily} onPick={fontFamily=>onStyle(selected.id,{fontFamily})}/>
          <div className="mb-3 grid grid-cols-2 gap-2.5"><NumberField label="Tamaño" value={style.fontSize} unit="px" min={10} max={96} onCommit={fontSize=>onStyle(selected.id,{fontSize})}/>
            <div><label className="field-label">Peso</label><select className="field-input" value={style.fontWeight} onChange={e=>onStyle(selected.id,{fontWeight:Number(e.target.value)})}>
              {[400,500,600,700,800,900].map(n=><option value={n} key={n}>{n===400?'Regular':n===500?'Medio':n===600?'Seminegrita':n===700?'Negrita':'Extra'} · {n}</option>)}
            </select></div>
          </div>
          <ColorField label="Color del texto" value={style.color} onChange={color=>onStyle(selected.id,{color})}/>
        </Group>
        <Group title="Apariencia">
          <div className="mb-3 grid grid-cols-2 gap-2.5"><ColorField label="Fondo" value={style.background} onChange={background=>onStyle(selected.id,{background})}/><NumberField label="Radio" value={style.radius} unit="px" min={0} max={999} onCommit={radius=>onStyle(selected.id,{radius})}/></div>
          {selected.kind==='boton'&&<div className="mb-3 grid grid-cols-2 gap-2.5"><NumberField label="Espacio horizontal" value={style.paddingX} unit="px" min={0} max={80} onCommit={paddingX=>onStyle(selected.id,{paddingX})}/><NumberField label="Espacio vertical" value={style.paddingY} unit="px" min={0} max={50} onCommit={paddingY=>onStyle(selected.id,{paddingY})}/></div>}
          <label><span className="field-label">Sombra</span><select className="field-input" value={style.shadow} onChange={e=>onStyle(selected.id,{shadow:e.target.value})}><option value="ninguna">Sin sombra</option><option value="suave">Suave</option><option value="fuerte">Profunda</option></select></label>
        </Group>
      </>}
      {selected && tab === 'contenido' && <>
        <Group title="Contenido del elemento" first><label className="field-label" htmlFor="wc-content">Texto visible</label>
          <textarea id="wc-content" className="field-input field-textarea" value={textDraft} maxLength={9000} onChange={e=>setTextDraft(e.target.value)} rows={5}/>
          <div className="mt-3 flex justify-end"><button className="ui-primary" onClick={()=>onElement(selected.id,{text:textDraft})} disabled={textDraft===selected.text}><Check size={13}/> Aplicar texto</button></div>
        </Group>
        <Group title="Detalles"><ControlLine label="Tipo"><span className="ui-tag">{selected.kind}</span></ControlLine><ControlLine label="Identificador"><span className="font-mono text-[10px] text-[#c5d0e2]">{selected.id}</span></ControlLine></Group>
      </>}
      {selected && tab === 'interacciones' && <>
        {selected.kind === 'boton' ? <Group title="Destino del enlace" first>
          <div className="mb-3 rounded-lg border border-[#82a3ff21] bg-[#82a3ff0a] p-3 text-[10px] leading-5 text-[#b6c5e5]"><Link2 size={15} className="mb-2 text-brand"/>Configura la acción del botón sin alterar su apariencia.</div>
          <label className="field-label" htmlFor="wc-href">Dirección o sección</label><input id="wc-href" className="field-input" placeholder="https://… o #contacto" value={linkDraft} maxLength={1400} onChange={e=>setLinkDraft(e.target.value)}/>
          {linkError&&<p className="mt-2 text-[10px] text-rose-400" role="alert">{linkError}</p>}
          <div className="mt-3 flex items-center justify-end"><button className="ui-primary" onClick={saveLink} disabled={linkDraft===selected.href}><Check size={13}/>Guardar enlace</button></div>
        </Group>:<Group title="Interacciones" first><p className="text-[11px] leading-5 text-faint">Este elemento no tiene una acción de navegación. Selecciona un botón para editar su destino.</p></Group>}
        <Group title="Consejos"><p className="text-[10px] leading-5 text-faint">Usa un ancla como <code className="font-mono text-brand">#contacto</code> para navegar por la página o una URL completa para visitar un recurso externo.</p></Group>
      </>}
      {!selected&&<div className="px-[17px] py-7 text-[11px] leading-6 text-faint"><Sparkles size={17} className="mb-3 text-[#8ba7ff]"/>El Inspector muestra únicamente las opciones que corresponden al elemento seleccionado. Así el Canvas permanece despejado.</div>}
    </div>
    <div className="flex shrink-0 items-center justify-between border-t border-white/[.065] bg-[#0e1116] px-[17px] py-3"><span className="flex items-center gap-1.5 text-[10px] text-faint"><CircleHelp size={13}/> Editor contextual</span><span className="font-mono text-[9px] text-[#596678]">01 / 03</span></div>
  </aside>;
}