'use client';
/** Pestaña «Símbolos» del panel Insertar: más de 2 000 iconos (Lucide, ISC) con búsqueda en castellano.
 *  Se insertan como SVG en línea dentro de un contenedor seleccionable: el color sigue a «Color del texto»
 *  y el tamaño se cambia con los tiradores. */
import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { loadSymbols, searchSymbols, symbolBlock, SYMBOL_CATEGORIES, type SymbolEntry } from '@/lib/symbols';

const CATS = [...Object.keys(SYMBOL_CATEGORIES), 'Todos'];
const MAX = 240;

function Glyph({ entry, stroke }: { entry: SymbolEntry; stroke: number }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {entry.node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
  </svg>;
}

export function SymbolLibrary({ query, onInsert, onDrag, mode='insert', onReplace }: { query: string;
  onInsert(name: string, html: string): void; onDrag(name: string, html: string, e: React.PointerEvent<HTMLButtonElement>): void;
  mode?:'insert'|'replace'; onReplace?(entry:SymbolEntry):void }) {
  const [all, setAll] = useState<SymbolEntry[] | null>(null);
  const [error, setError] = useState('');
  const [cat, setCat] = useState('Destacados');
  const [stroke, setStroke] = useState(1.75);
  const [frame, setFrame] = useState<'solo' | 'circulo' | 'cuadrado'>('solo');
  useEffect(() => { let alive = true; loadSymbols().then(s => { if (alive) setAll(s); }, e => { if (alive) setError(e instanceof Error ? e.message : 'Error al cargar.'); }); return () => { alive = false; }; }, []);
  const list = useMemo(() => all ? searchSymbols(all, query, cat === 'Todos' ? '' : cat) : [], [all, query, cat]);
  const block = (s: SymbolEntry) => symbolBlock(s, { stroke, style: frame });
  if (error) return <p className="p-4 text-center text-[11px] text-red-500">{error}</p>;
  if (!all) return <p className="flex items-center justify-center gap-2 p-6 text-[11px] text-faint"><LoaderCircle size={14} className="animate-spin" /> Cargando símbolos…</p>;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="space-y-2 border-b border-stroke px-2.5 py-2">
      {!query.trim() && <div className="flex flex-wrap gap-1" role="group" aria-label="Categorías de símbolos">
        {CATS.map(c => <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}
          className={'rounded-full border px-2 py-0.5 text-[10.5px] ' + (c === cat ? 'border-brand bg-brandsoft text-brand' : 'border-stroke text-mist hover:text-ink')}>{c}</button>)}
      </div>}
      {mode==='insert'?<div className="flex items-center gap-2 text-[10.5px] text-mist">
        <label className="flex flex-1 items-center gap-1.5" title="Grosor del trazo">Trazo
          <input type="range" min={1} max={3} step={0.25} value={stroke} onChange={e => setStroke(Number(e.target.value))} className="w-full accent-[var(--wu-brand)]" aria-label="Grosor del trazo" /></label>
        <select value={frame} onChange={e => setFrame(e.target.value as typeof frame)} aria-label="Fondo del símbolo"
          className="rounded-md border border-stroke bg-elevated px-1.5 py-1 text-[10.5px] text-ink">
          <option value="solo">Sin fondo</option><option value="circulo">Círculo</option><option value="cuadrado">Cuadrado</option>
        </select>
      </div>:<p className="text-[10px] leading-4 text-faint">El nuevo icono conservará el tamaño, color y grosor del símbolo seleccionado.</p>}
    </div>
    <div className="scroll-subtle grid min-h-0 flex-1 auto-rows-[52px] grid-cols-5 gap-1 overflow-y-auto p-2.5">
      {list.slice(0, MAX).map(s => <button key={s.name} type="button" draggable={false}
        title={mode==='replace'?'Sustituir por '+s.name.replace(/-/g,' '):s.name.replace(/-/g, ' ') + ' · arrastra o haz clic'}
        onPointerDown={e => { if (mode==='insert'&&e.button === 0) onDrag('Símbolo ' + s.name, block(s), e); }}
        onClick={()=>{if(mode==='replace')onReplace?.(s);}}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();if(mode==='replace')onReplace?.(s);else onInsert('Símbolo ' + s.name, block(s)); } }}
        className={'flex cursor-pointer items-center justify-center border border-stroke bg-elevated text-ink transition hover:border-brand/60 hover:bg-brandsoft hover:text-brand ' + (mode==='insert'&&frame === 'circulo' ? 'rounded-full' : 'rounded-lg')}>
        <Glyph entry={s} stroke={mode==='insert'?stroke:1.75} /></button>)}
      {!list.length && <p className="col-span-5 p-3 text-center text-[11px] text-faint">Sin resultados. Prueba con otra palabra (también en inglés).</p>}
    </div>
    <p className="border-t border-stroke px-3 py-1.5 text-[10px] text-faint">{list.length > MAX ? 'Mostrando ' + MAX + ' de ' + list.length + ' · afina la búsqueda' : list.length + ' símbolos'} · Iconos Lucide (ISC)</p>
  </div>;
}
