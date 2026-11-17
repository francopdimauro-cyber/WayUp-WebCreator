'use client';
/** Biblioteca de botones para enlaces y botones del HTML real: aplica estilos completos de un clic,
 *  sin tocar el texto ni el destino. Todo pasa por setStyles (validado y con deshacer). */
import { useState } from 'react';
import { BUTTON_PRESETS } from '@/lib/demo-project';

const SHADOW: Record<string, string> = { suave: '0 8px 20px rgba(0, 0, 0, 0.18)', fuerte: '0 12px 28px rgba(0, 0, 0, 0.35)' };
const SIZES: [string, string, Record<string, string>][] = [
  ['S', 'Pequeño', { 'padding-top': '8px', 'padding-bottom': '8px', 'padding-left': '14px', 'padding-right': '14px', 'font-size': '13px' }],
  ['M', 'Mediano', { 'padding-top': '12px', 'padding-bottom': '12px', 'padding-left': '22px', 'padding-right': '22px', 'font-size': '15px' }],
  ['L', 'Grande', { 'padding-top': '16px', 'padding-bottom': '16px', 'padding-left': '30px', 'padding-right': '30px', 'font-size': '17px' }],
];
export function presetStyles(id: string): Record<string, string> {
  const p = BUTTON_PRESETS.find(x => x.id === id);
  if (!p) return {};
  const gradient = p.background.startsWith('linear-gradient');
  return {
    'background-color': gradient ? '' : p.background,
    'background-image': gradient ? p.background.replace(/,(?=\S)/g, ', ') : 'none',
    color: p.color,
    'border-radius': p.radius + 'px',
    'border-width': p.border ? '1px' : '0px',
    'border-style': p.border ? 'solid' : 'none',
    'border-color': p.border || '',
    'box-shadow': p.shadow ? SHADOW[p.shadow] : 'none',
    'text-decoration-line': p.id === 'subrayado' ? 'underline' : 'none',
    // No forzar display: conserva la distribución interna (flex/inline-flex) y los iconos del botón original.
    'font-weight': '600',
  };
}

export function ButtonStyles({ onStyles }: { onStyles(styles: Record<string, string>): void }) {
  const groups = ['Todos', ...Array.from(new Set(BUTTON_PRESETS.map(p => p.group)))];
  const [group, setGroup] = useState('Todos');
  const list = BUTTON_PRESETS.filter(p => group === 'Todos' || p.group === group);
  return <div className="space-y-2.5">
    <div className="flex flex-wrap gap-1" role="group" aria-label="Familias de botones">
      {groups.map(g => <button key={g} type="button" aria-pressed={g === group} onClick={() => setGroup(g)}
        className={'rounded-full border px-2.5 py-1 text-[10.5px] transition ' + (g === group ? 'border-brand bg-brandsoft text-brand' : 'border-stroke text-mist hover:text-ink')}>{g}</button>)}
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {list.map(p => <button key={p.id} type="button" title={'Aplicar estilo ' + p.title} aria-label={'Aplicar estilo ' + p.title}
        onClick={() => onStyles(presetStyles(p.id))}
        className="group flex flex-col items-stretch gap-1.5 rounded-lg border border-stroke bg-elevated p-2 text-left transition hover:border-brand/50">
        <span className="flex h-[38px] items-center justify-center rounded-md" style={{ background: p.color === '#ffffff' || p.background === 'transparent' ? '#1b1f2a' : '#f4f3ef' }}>
          <span className="px-3 py-1.5 text-[11px] font-semibold" style={{
            background: p.background, color: p.color, borderRadius: Math.min(p.radius, 20),
            border: p.border ? '1px solid ' + p.border : undefined, boxShadow: p.shadow ? SHADOW[p.shadow] : undefined,
            textDecoration: p.id === 'subrayado' ? 'underline' : undefined,
          }}>Botón</span>
        </span>
        <span className="truncate text-[10.5px] text-mist group-hover:text-ink">{p.title}</span>
      </button>)}
    </div>
    <div>
      <span className="block text-[10px] font-medium text-faint">Tamaño</span>
      <div className="mt-1 flex gap-1" role="group" aria-label="Tamaño del botón">
        {SIZES.map(([k, l, s]) => <button key={k} type="button" title={l} onClick={() => onStyles(s)}
          className="flex-1 rounded-md border border-stroke py-1.5 text-[11px] text-mist transition hover:border-brand/50 hover:text-ink">{l}</button>)}
      </div>
    </div>
    <button type="button" onClick={() => onStyles(Object.fromEntries(Object.keys(presetStyles('cobalto')).concat(SIZES[0][2] ? Object.keys(SIZES[0][2]) : []).map(k => [k, ''])))}
      className="text-[10.5px] text-faint hover:text-ink hover:underline">Quitar estilo personalizado (volver al diseño original)</button>
  </div>;
}
