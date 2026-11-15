'use client';

import { useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CodeXml, Eye, Grip, LayoutGrid, Minus, Monitor, MousePointer2,
  Plus, Smartphone, Tablet
} from 'lucide-react';
import type { Device, Mode, ProjectDoc, StudioElement } from '@/lib/studio-types';

interface CanvasProps {
  doc: ProjectDoc;
  mode: Mode;
  device: Device;
  zoom: number;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onMode(mode: Mode): void;
  onDevice(device: Device): void;
  onZoom(value: number): void;
  onMove(id: string, x: number, y: number): void;
}

type Drag = { id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean; target: HTMLElement };

const VIEWPORT = { escritorio: 1060, tableta: 768, movil: 390 } as const;

function renderCode(doc: ProjectDoc) {
  const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const text = (id: string) => esc(doc.elements[id]?.text || '');
  return `<!-- Previsualización de la estructura principal del proyecto -->\n<section id="inicio" class="hero">\n  <h1>${text('titulo')}</h1>\n  <h2>${text('subtitulo')}</h2>\n  <p>${text('descripcion')}</p>\n  <div class="acciones">\n    <a href="${esc(doc.elements.cta.href || '#contacto')}">${text('cta')}</a>\n    <a href="${esc(doc.elements.secundario.href || '#servicios')}">${text('secundario')}</a>\n  </div>\n</section>`;
}

function Node({node, selected, isDesign, onSelect, onMove, children, className = '', extraStyle}: {
  node: StudioElement; selected: boolean; isDesign: boolean; onSelect(id: string): void;
  onMove(id: string, x: number, y: number): void;
  children?: React.ReactNode; className?: string; extraStyle?: CSSProperties;
}) {
  const drag = useRef<Drag | null>(null);
  const style: CSSProperties = {
    fontSize: node.style.fontSize,
    fontWeight: node.style.fontWeight,
    fontFamily: node.style.fontFamily,
    boxShadow: node.style.shadow === 'suave' ? '0 8px 20px #0005' : node.style.shadow === 'fuerte' ? '0 12px 28px #0009' : undefined,
    color: node.style.color,
    background: node.style.background,
    border: node.style.border ? `1px solid ${node.style.border}` : undefined,
    borderRadius: node.style.radius,
    padding: node.kind === 'boton' ? `${node.style.paddingY}px ${node.style.paddingX}px` : undefined,
    transform: `translate(${node.style.x}px, ${node.style.y}px)`,
    width: node.style.width === 'auto' ? undefined : node.style.width,
    ...extraStyle,
  };

  function pointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!isDesign || event.button !== 0) return;
    event.preventDefault();
    onSelect(node.id);
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    drag.current = { id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: node.style.x, originY: node.style.y, moved: false, target };
  }
  function pointerMove(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.startX, dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < 4) return;
    state.moved = true;
    const x = Math.max(-600, Math.min(600, Math.round(state.originX + dx)));
    const y = Math.max(-600, Math.min(600, Math.round(state.originY + dy)));
    event.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
    event.currentTarget.dataset.dragging = 'true';
  }
  function pointerUp(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    drag.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* navegador sin captura */ }
    event.currentTarget.dataset.dragging = 'false';
    if (!state.moved) return;
    onMove(node.id,
      Math.max(-600, Math.min(600, Math.round(state.originX + event.clientX - state.startX))),
      Math.max(-600, Math.min(600, Math.round(state.originY + event.clientY - state.startY))));
  }
  function pointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.style.transform = `translate(${node.style.x}px,${node.style.y}px)`;
    event.currentTarget.dataset.dragging = 'false';
  }

  const shared = { 'data-selected': selected, 'data-draggable': isDesign,
    onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp,
    onPointerCancel: pointerCancel, style,
    className: `canvas-element relative ${className}` } as const;

  if (node.kind === 'boton') {
    return <a href={isDesign ? undefined : node.href}
      onClick={event=>{if(isDesign){event.preventDefault();onSelect(node.id);} }} {...shared}>
      {selected && isDesign && <span className="absolute -top-[27px] left-0 inline-flex items-center gap-1 rounded-[5px] bg-[#6085ff] px-2 py-[4px] font-mono text-[9px] font-semibold whitespace-nowrap text-white"><Grip size={10}/>{node.label}</span>}
      {children || node.text}
    </a>;
  }
  const Tag = node.kind === 'titulo' ? 'h1' : node.kind === 'subtitulo' ? 'h2' : 'p';
  return <Tag {...shared}>
    {selected && isDesign && <span className="absolute -top-[27px] left-0 inline-flex items-center gap-1 rounded-[5px] bg-[#6085ff] px-2 py-[4px] font-mono text-[9px] font-semibold whitespace-nowrap text-white"><Grip size={10}/>{node.label}</span>}
    {children || node.text}
  </Tag>;
}

function GymPreview({ doc, mode, selectedId, onSelect, onMove, device }: Pick<CanvasProps, 'doc' | 'mode' | 'selectedId' | 'onSelect' | 'onMove' | 'device'>) {
  const design = mode === 'diseno';
  const items = doc.elements;
  const node = (id: string, className: string, extra?: CSSProperties) => {
    const entry = items[id]; if (!entry) return null;
    return <Node key={id} node={entry} selected={selectedId === id} isDesign={design} onSelect={onSelect} onMove={onMove} className={className} extraStyle={extra}/>;
  };
  return <div className="min-h-[620px] overflow-hidden bg-[#080b09] text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
    <nav className="flex h-[76px] items-center justify-between border-b border-white/10 bg-[#090c0a] px-[5%]" aria-label="Navegación de la web en edición">
      <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b3ee06] text-2xl font-black text-black">!</span><span className="text-[16px] font-[750] tracking-[-.05em]">Entrena-T</span></div>
      <div className={`items-center gap-[26px] text-[10px] font-bold tracking-[.035em] ${device === 'movil' ? 'hidden' : 'hidden min-[620px]:flex'}`}>
        {['INICIO','SERVICIOS','PLANES','MÉTODO','TESTIMONIOS','CONTACTO'].map(x=><span key={x} className="opacity-90">{x}</span>)}
      </div>
      <span className="hidden rounded-md bg-[#b3ee06] px-4 py-3 text-[10px] font-extrabold text-[#101609] sm:block">EMPEZAR</span>
    </nav>
    <section id="inicio" className="relative flex min-h-[510px] flex-col items-center justify-center px-[5%] pb-14 pt-12 text-center" style={{background: 'radial-gradient(ellipse 55% 48% at 50% 55%, #172009 0%, #090c09 68%, #070908 100%)'}}>
      {node('titulo', 'mx-auto my-0 max-w-full leading-[1.05] tracking-[-.058em]')}
      {node('subtitulo', 'mx-auto mb-7 mt-1.5 max-w-full leading-[1.1] tracking-[-.04em]')}
      {node('descripcion', 'mx-auto my-0 max-w-[650px] leading-[1.75] tracking-[-.01em]', {fontSize: device === 'movil' ? 13 : items.descripcion.style.fontSize})}
      <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
        {node('cta', 'inline-flex min-h-[52px] items-center justify-center text-center no-underline')}
        {node('secundario', 'inline-flex min-h-[52px] items-center justify-center border border-white/35 text-center no-underline')}
      </div>
      <div className="pointer-events-none absolute bottom-8 left-8 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#ecebda] text-[#1c241f]">◷</div>
      <div className="pointer-events-none absolute bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#b3ee06] text-[24px] text-black shadow-[0_0_23px_#b3ee0663]">✆</div>
    </section>
    <div id="servicios" className="border-t border-white/10 bg-[#101410] px-8 py-14 text-center"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#b3ee06]">Entrena-T Parquesol</span><p className="mt-3 text-xl font-semibold">Entrenamiento diseñado para ti</p><p className="mx-auto mt-3 max-w-lg text-[12px] leading-relaxed text-[#abb2a9]">Metodología cercana, programas personalizados y objetivos reales.</p></div>
  </div>;
}

export function Canvas({ doc, mode, device, zoom, selectedId, onSelect, onMode, onDevice, onZoom, onMove }: CanvasProps) {
  const width = VIEWPORT[device];
  const isDesign = mode === 'diseno';
  const code = useMemo(()=>renderCode(doc),[doc]);
  return <main className="studio-center relative flex h-full min-w-0 flex-col overflow-hidden bg-app" aria-label="Área del Canvas">
    <div className="relative z-10 flex min-h-[67px] shrink-0 items-center justify-between gap-2 border-b border-white/[.06] bg-[#101217] px-4 xl:px-6">
      <div className="min-w-0"><div className="mb-1 hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.13em] text-faint sm:flex"><span className="text-brand">Espacio de trabajo</span><span>/</span><span>Inicio</span></div><div className="truncate text-[12px] font-[680] tracking-[-.016em] text-[#dce2ed]">{doc.name} <span className="ml-1 hidden font-normal text-faint lg:inline">/ Página de inicio</span></div></div>
      <div className="hidden items-center gap-1 text-[10px] text-faint xl:flex"><span className="h-[6px] w-[6px] rounded-full bg-emerald-500"/> Vista en edición</div>
    </div>
    <div className="stage-grid stage-rail relative flex-1 overflow-auto px-3 pb-[55px] pt-[79px] sm:px-8" onClick={event=>{if (event.target===event.currentTarget) onSelect(null);}}>
      <div className="absolute left-1/2 top-[16px] z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-white/[.09] bg-[#1a1f29]/95 p-1.5 shadow-[0_10px_40px_#0008] backdrop-blur-xl">
        <div className="ui-segment" role="group" aria-label="Modo de trabajo">
          <button aria-pressed={mode==='diseno'} onClick={()=>onMode('diseno')} title="Diseño interactivo"><MousePointer2 size={13}/><span className="hidden sm:inline">Diseño</span></button>
          <button aria-pressed={mode==='vista'} onClick={()=>onMode('vista')} title="Vista funcional"><Eye size={13}/><span className="hidden sm:inline">Vista real</span></button>
          <button aria-pressed={mode==='codigo'} onClick={()=>onMode('codigo')} title="Consultar código"><CodeXml size={13}/><span className="hidden sm:inline">Código</span></button>
        </div>
        <span className="mx-0.5 h-[21px] w-px bg-white/10"/>
        <div className="ui-segment" role="group" aria-label="Dispositivo de previsualización">
          <button aria-pressed={device==='escritorio'} onClick={()=>onDevice('escritorio')} title="Escritorio"><Monitor size={14}/></button>
          <button aria-pressed={device==='tableta'} onClick={()=>onDevice('tableta')} title="Tableta"><Tablet size={14}/></button>
          <button aria-pressed={device==='movil'} onClick={()=>onDevice('movil')} title="Móvil"><Smartphone size={14}/></button>
        </div>
        <span className="mx-0.5 hidden h-[21px] w-px bg-white/10 md:block"/>
        <div className="hidden items-center gap-1 md:flex">
          <button className="ui-icon h-[29px]! w-[29px]!" onClick={()=>onZoom(Math.max(50,zoom-10))} aria-label="Alejar"><Minus size={13}/></button>
          <button className="min-w-[42px] font-mono text-[10px] tabular-nums text-[#b0bac9]" onClick={()=>onZoom(100)} title="Restablecer zoom">{zoom}%</button>
          <button className="ui-icon h-[29px]! w-[29px]!" onClick={()=>onZoom(Math.min(140,zoom+10))} aria-label="Acercar"><Plus size={13}/></button>
        </div>
      </div>
      <div className="mx-auto flex w-full justify-center" style={{minWidth:device==='escritorio'?560:undefined}}>
        {mode==='codigo'?<div className="canvas-window min-h-[550px] w-full max-w-[840px] overflow-hidden rounded-xl border border-white/[.09] bg-[#11151b]">
          <div className="flex h-11 items-center justify-between border-b border-white/[.07] px-4"><span className="flex items-center gap-2 font-mono text-[11px] text-[#c5d0e2]"><CodeXml size={13} className="text-brand"/> index.html</span><span className="font-mono text-[10px] text-faint">Vista de la estructura</span></div>
          <pre className="scroll-subtle overflow-x-auto px-5 py-6 font-mono text-[11.5px] leading-7 text-[#a9bddd]">{code}</pre>
          <p className="border-t border-white/[.07] px-5 py-3 text-[10px] text-faint">Esta vista muestra el HTML del ejemplo. La edición completa del código se conectará al editor existente.</p>
        </div>:<div className="relative origin-top transition-[width] duration-200" style={{width:Math.min(width,1200),maxWidth:'100%', zoom:`${zoom}%`}}>
          <div className="mb-2 flex items-center justify-between px-[2px] font-mono text-[9px] tabular-nums text-[#707e91]"><span>{device==='escritorio'?'Escritorio':device==='tableta'?'Tableta':'Móvil'}</span><span>{width} px · {zoom}%</span></div>
          <div className="canvas-window min-h-[620px] overflow-hidden rounded-[5px] bg-[#090b09]">
            <GymPreview doc={doc} mode={mode} selectedId={selectedId} onSelect={onSelect} onMove={onMove} device={device}/>
          </div>
          {isDesign&&<p className="mt-5 text-center text-[10px] text-[#667186]">Selecciona y arrastra elementos para ajustar su posición. Los cambios aparecerán en el Inspector.</p>}
        </div>}
      </div>
    </div>
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/[.09] bg-[#1a1f27]/95 px-3.5 py-2 text-[10px] text-[#a3adbf] shadow-[0_8px_24px_#0008] backdrop-blur-md">
      <LayoutGrid size={13} className="text-[#7e9afb]"/><span className="whitespace-nowrap">{selectedId ? doc.elements[selectedId]?.label : 'Ningún elemento seleccionado'}</span><span className="ml-1 rounded bg-white/[.07] px-1.5 py-[2px] font-mono text-[9px] text-[#8c97a9]">{selectedId ? '1' : '0'} seleccionados</span>
    </div>
  </main>;
}