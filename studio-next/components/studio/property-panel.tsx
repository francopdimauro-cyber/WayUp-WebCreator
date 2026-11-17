'use client';
/** Panel «Propiedades»: controles reales sobre el elemento seleccionado del HTML.
 *  Cada control aplica estilos en línea validados (lib/element-editing) y entra en el historial. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Italic, Link2, Strikethrough, Type, Underline } from 'lucide-react';
import { parseColorCode } from '@/lib/color-codes';
import { FontPicker } from './font-picker';

export type ElementInfo = {
  index: number; tag: string; textEditable: boolean; text: string;
  inline: Record<string, string>; computed: Record<string, string>;
  attrs: { href: string; target: string; alt: string; id: string; title: string; ariaLabel: string };
};
type Props = {
  info: ElementInfo;
  onStyles(styles: Record<string, string>): void;
  /** Cambiar tipografía (enlaza Google Fonts si hace falta). */
  onFont?(familyCss: string): void;
  /** Vista previa en vivo (sin historial) mientras se arrastra un control. */
  onPreview?(styles: Record<string, string>): void;
  onAttrs(attrs: Record<string, string>): void;
  onText(text: string): void;
  onEditText(): void;
  extra?: ReactNode;
};

const input = 'w-full min-w-0 rounded-md border border-stroke bg-panel px-2 py-1.5 text-[11.5px] text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15';
const label = 'block text-[10px] font-medium text-faint';
const seg = 'inline-flex h-7 min-w-7 flex-1 items-center justify-center rounded px-1.5 text-[11px] text-mist transition hover:text-ink';

function Group({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details open={open} className="group border-b border-stroke py-0.5 [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer select-none items-center justify-between py-2.5 text-[11.5px] font-semibold text-ink">
      {title}<ChevronDown size={13} className="text-faint transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-2.5 pb-3.5">{children}</div>
  </details>;
}
/** Campo que aplica al pulsar Intro o al salir; muestra el valor calculado como pista. */
function Field({ value, placeholder, onCommit, ariaLabel, mono = true, type = 'text' }: { value: string; placeholder?: string; onCommit(v: string): void; ariaLabel: string; mono?: boolean; type?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onCommit(draft); };
  return <input type={type} aria-label={ariaLabel} className={input + (mono ? ' font-mono' : '')} value={draft} placeholder={placeholder}
    onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } if (e.key === 'Escape') setDraft(value); }} />;
}
function Select({ value, options, onChange, ariaLabel }: { value: string; options: [string, string][]; onChange(v: string): void; ariaLabel: string }) {
  return <select aria-label={ariaLabel} className={input} value={value} onChange={e => onChange(e.target.value)}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>;
}
function toHex(color: string): { hex: string; alpha: number } {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) return { hex: '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join(''), alpha: m[4] !== undefined ? Number(m[4]) : 1 };
  if (/^#[\da-f]{6}$/i.test(color)) return { hex: color, alpha: 1 };
  return { hex: '#000000', alpha: color === 'transparent' ? 0 : 1 };
}
function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  return alpha >= 1 ? hex.toUpperCase() : `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}
/** Cambios continuos (arrastrar un regulador o el selector de color): se ven en vivo sobre la web
 *  y solo se guardan UNA vez al soltar, como un único paso de deshacer. */
function useLive(value: string, onCommit: (v: string) => void, onPreview?: (v: string) => void) {
  const [live, setLive] = useState<string | null>(null);
  const latest = useRef<string | null>(null);
  const move = (v: string) => { latest.current = v; setLive(v); onPreview?.(v); };
  const end = () => { const v = latest.current; latest.current = null; setLive(null); if (v !== null && v !== value) onCommit(v); };
  return { live, move, end };
}
/** Regulador que previsualiza mientras se arrastra y confirma al soltar. */
function LiveRange({ value, onMove, onEnd, ariaLabel, className = '' }: { value: number; onMove(n: number): void; onEnd(): void; ariaLabel: string; className?: string }) {
  return <input type="range" min={0} max={100} value={value} aria-label={ariaLabel}
    onChange={e => onMove(Number(e.target.value))} onPointerUp={onEnd} onKeyUp={onEnd} onBlur={onEnd} onTouchEnd={onEnd}
    className={'accent-[var(--wu-brand)] ' + className} />;
}
function OpacityControl({ value, onCommit, onPreview }: { value: string; onCommit(v: string): void; onPreview(v: string): void }) {
  const { live, move, end } = useLive(value, onCommit, onPreview);
  const pct = Math.round(Number(live ?? value) * 100);
  return <div><span className={label}>Opacidad · {pct}%</span>
    <LiveRange value={pct} ariaLabel="Opacidad" className="mt-1 w-full" onMove={n => move(String(n / 100))} onEnd={end} /></div>;
}
/** Selector visual de color con HEX/RGB y transparencia. */
function ColorField({ name, value, computed, onChange, onPreview }: { name: string; value: string; computed: string; onChange(v: string): void; onPreview?(v: string): void }) {
  const { live, move, end } = useLive(value, onChange, onPreview);
  const shown = live ?? (value || computed);
  const { hex, alpha } = toHex(shown);
  const [invalid, setInvalid] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = picker.current; if (!el) return; el.addEventListener('change', end); return () => el.removeEventListener('change', end); });
  return <div>
    <span className={label}>{name}</span>
    <div className="mt-1 flex items-center gap-1.5">
      <label className="relative h-[30px] w-[30px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-stroke"
        style={{ backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0,4px 4px' }}>
        <span className="absolute inset-0" style={{ background: shown }} />
        <input ref={picker} type="color" aria-label={'Elegir ' + name.toLowerCase()} value={hex}
          onChange={e => move(rgba(e.target.value, alpha > 0 ? alpha : 1))} onBlur={end} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <Field ariaLabel={name + ' en HEX o RGB'} value={live ?? value} placeholder={computed} onCommit={v => {
        if (!v.trim()) { setInvalid(false); onChange(''); return; }
        const c = parseColorCode(v); setInvalid(!c); if (c) onChange(c);
      }} />
      <LiveRange value={Math.round(alpha * 100)} ariaLabel={'Opacidad de ' + name.toLowerCase()} className="w-[62px] shrink-0"
        onMove={n => move(rgba(hex, n / 100))} onEnd={end} />
    </div>
    {invalid && <p className="mt-1 text-[10px] text-red-500">Formato no válido. Usa #RRGGBB, #RGB o rgb(0, 0, 0).</p>}
  </div>;
}
function Box({ prefix, info, onStyles }: { prefix: 'margin' | 'padding'; info: ElementInfo; onStyles(s: Record<string, string>): void }) {
  const sides = [['top', 'Arriba'], ['right', 'Derecha'], ['bottom', 'Abajo'], ['left', 'Izquierda']] as const;
  return <div>
    <div className="flex items-center justify-between"><span className={label}>{prefix === 'margin' ? 'Margen exterior' : 'Relleno interior'}</span>
      <button type="button" className="text-[10px] text-brand hover:underline" onClick={() => {
        const v = window.prompt('Valor para los cuatro lados (ej. 24px):', info.inline[prefix + '-top'] || '');
        if (v !== null) onStyles(Object.fromEntries(sides.map(([s]) => [prefix + '-' + s, v])));
      }}>Igualar</button></div>
    <div className="mt-1 grid grid-cols-4 gap-1">
      {sides.map(([s, l]) => <Field key={s} ariaLabel={(prefix === 'margin' ? 'Margen ' : 'Relleno ') + l.toLowerCase()} value={info.inline[prefix + '-' + s] || ''}
        placeholder={info.computed[prefix + '-' + s]} onCommit={v => onStyles({ [prefix + '-' + s]: v })} />)}
    </div>
  </div>;
}
const primary = (css: string) => (css.split(',')[0] || '').trim().replace(/^["']|["']$/g, '') || '—';
const SHADOWS: [string, string][] = [['', 'Sin sombra'], ['0 1px 3px rgba(0, 0, 0, 0.12)', 'Sutil'], ['0 8px 24px rgba(0, 0, 0, 0.14)', 'Media'], ['0 20px 50px rgba(0, 0, 0, 0.22)', 'Profunda'], ['0 0 0 1px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.12)', 'Flotante']];

export function PropertyPanel({ info, onStyles, onFont, onPreview, onAttrs, onText, onEditText, extra }: Props) {
  const preview = (p: string) => (val: string) => onPreview?.({ [p]: val });
  const v = (p: string) => info.inline[p] || '';
  const c = (p: string) => info.computed[p] || '';
  // Un degradado (background-image) tapa el color de fondo: al elegir un color sólido se sustituye.
  const hasGradient = /gradient\(/.test(v('background-image') || c('background-image'));
  const bgStyles = (val: string): Record<string, string> => hasGradient && val ? { 'background-color': val, 'background-image': 'none' } : { 'background-color': val };
  const solidBg = (val: string) => onStyles(bgStyles(val));
  const set = (p: string) => (val: string) => onStyles({ [p]: val });
  const display = v('display') || c('display');
  const isFlex = display.includes('flex'), isGrid = display.includes('grid');
  const toggle = (p: string, on: string, off: string) => onStyles({ [p]: (v(p) || c(p)).includes(on) ? off : on });
  const pressed = (p: string, on: string) => (v(p) || c(p)).includes(on);
  return <div className="text-ink">
    {extra}
    <Group title="Contenido" open>
      {info.textEditable ? <>
        <textarea aria-label="Texto del elemento" className={input + ' min-h-[74px] resize-y font-sans'} defaultValue={info.text} key={info.index + info.text}
          onBlur={e => { if (e.target.value !== info.text) onText(e.target.value); }} />
        <button type="button" onClick={onEditText} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand hover:underline"><Type size={12} /> Editar sobre la web (doble clic)</button>
      </> : <p className="text-[11px] leading-5 text-faint">Este bloque contiene otros elementos. Selecciona un texto concreto para editarlo.</p>}
      {info.tag === 'A' && <div className="space-y-2 rounded-md border border-stroke p-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold"><Link2 size={13} className="text-brand" /> Enlace</span>
        <Field ariaLabel="Destino del enlace" value={info.attrs.href} placeholder="https://… · #seccion · mailto: · tel:" onCommit={href => onAttrs({ href })} />
        <label className="flex items-center gap-2 text-[11px] text-mist"><input type="checkbox" checked={info.attrs.target === '_blank'} onChange={e => onAttrs({ target: e.target.checked ? '_blank' : '_self' })} /> Abrir en una pestaña nueva</label>
      </div>}
    </Group>

    <Group title="Tipografía" open>
      <div><span className={label}>Familia · {primary(v('font-family') || c('font-family'))}</span>
        <FontPicker value={v('font-family') || c('font-family')} onChange={family => onFont ? onFont(family) : onStyles({ 'font-family': family })} /></div>
      <div className="grid grid-cols-2 gap-1.5">
        <div><span className={label}>Tamaño</span><Field ariaLabel="Tamaño de letra" value={v('font-size')} placeholder={c('font-size')} onCommit={set('font-size')} /></div>
        <div><span className={label}>Grosor</span><Select ariaLabel="Grosor" value={v('font-weight')} onChange={set('font-weight')}
          options={[['', 'Heredado (' + c('font-weight') + ')'], ...['100', '200', '300', '400', '500', '600', '700', '800', '900'].map(w => [w, w] as [string, string])]} /></div>
        <div><span className={label}>Interlineado</span><Field ariaLabel="Interlineado" value={v('line-height')} placeholder={c('line-height')} onCommit={set('line-height')} /></div>
        <div><span className={label}>Espaciado</span><Field ariaLabel="Espaciado entre letras" value={v('letter-spacing')} placeholder={c('letter-spacing')} onCommit={set('letter-spacing')} /></div>
      </div>
      <div className="flex gap-1">
        <div role="group" aria-label="Estilo" className="flex flex-1 gap-0.5 rounded-md border border-stroke bg-elevated p-0.5">
          <button type="button" aria-pressed={Number(v('font-weight') || c('font-weight')) >= 600} title="Negrita" className={seg} onClick={() => onStyles({ 'font-weight': Number(c('font-weight')) >= 600 ? '400' : '700' })}><Bold size={13} /></button>
          <button type="button" aria-pressed={pressed('font-style', 'italic')} title="Cursiva" className={seg + (pressed('font-style', 'italic') ? ' bg-panel text-ink shadow-sm' : '')} onClick={() => toggle('font-style', 'italic', 'normal')}><Italic size={13} /></button>
          <button type="button" aria-pressed={pressed('text-decoration-line', 'underline')} title="Subrayado" className={seg + (pressed('text-decoration-line', 'underline') ? ' bg-panel text-ink shadow-sm' : '')} onClick={() => toggle('text-decoration-line', 'underline', 'none')}><Underline size={13} /></button>
          <button type="button" aria-pressed={pressed('text-decoration-line', 'line-through')} title="Tachado" className={seg + (pressed('text-decoration-line', 'line-through') ? ' bg-panel text-ink shadow-sm' : '')} onClick={() => toggle('text-decoration-line', 'line-through', 'none')}><Strikethrough size={13} /></button>
        </div>
        <div role="group" aria-label="Alineación" className="flex flex-1 gap-0.5 rounded-md border border-stroke bg-elevated p-0.5">
          {([['left', AlignLeft, 'Izquierda'], ['center', AlignCenter, 'Centro'], ['right', AlignRight, 'Derecha'], ['justify', AlignJustify, 'Justificado']] as const).map(([a, Icon, t]) =>
            <button key={a} type="button" title={t} aria-pressed={(v('text-align') || c('text-align')) === a} className={seg + ((v('text-align') || c('text-align')) === a ? ' bg-panel text-ink shadow-sm' : '')} onClick={() => onStyles({ 'text-align': a })}><Icon size={13} /></button>)}
        </div>
      </div>
      <div><span className={label}>Mayúsculas</span><Select ariaLabel="Transformación del texto" value={v('text-transform')} onChange={set('text-transform')}
        options={[['', 'Heredado'], ['none', 'Normal'], ['uppercase', 'MAYÚSCULAS'], ['lowercase', 'minúsculas'], ['capitalize', 'Primera Letra']]} /></div>
      <ColorField name="Color del texto" value={v('color')} computed={c('color')} onChange={set('color')} onPreview={preview('color')} />
    </Group>

    <Group title="Fondo">
      <ColorField name="Color de fondo" value={v('background-color')} computed={c('background-color')} onChange={solidBg} onPreview={val => onPreview?.(bgStyles(val))} />
      {hasGradient && <p className="text-[10px] leading-4 text-faint">Este elemento tiene un degradado encima del color. Al elegir un color sólido se sustituye (puedes deshacerlo).</p>}
      <div><span className={label}>Degradado (CSS)</span><Field ariaLabel="Degradado de fondo" value={v('background-image').startsWith('linear') || v('background-image').startsWith('radial') ? v('background-image') : ''}
        placeholder="linear-gradient(135deg, #0029ff, #8cdded)" onCommit={set('background-image')} /></div>
      {v('background-image').startsWith('url') && <div className="grid grid-cols-2 gap-1.5">
        <Select ariaLabel="Ajuste de la imagen de fondo" value={v('background-size')} onChange={set('background-size')} options={[['', 'Tamaño'], ['cover', 'Cubrir'], ['contain', 'Contener'], ['auto', 'Original']]} />
        <Field ariaLabel="Posición de la imagen de fondo" value={v('background-position')} placeholder="center" onCommit={set('background-position')} />
      </div>}
    </Group>

    <Group title="Bordes y esquinas">
      <div className="grid grid-cols-2 gap-1.5">
        <div><span className={label}>Grosor</span><Field ariaLabel="Grosor del borde" value={v('border-width')} placeholder={c('border-top-width')} onCommit={w => onStyles(w && !v('border-style') ? { 'border-width': w, 'border-style': 'solid' } : { 'border-width': w })} /></div>
        <div><span className={label}>Estilo</span><Select ariaLabel="Estilo del borde" value={v('border-style')} onChange={set('border-style')} options={[['', 'Heredado'], ['none', 'Ninguno'], ['solid', 'Continuo'], ['dashed', 'Discontinuo'], ['dotted', 'Punteado'], ['double', 'Doble']]} /></div>
      </div>
      <ColorField name="Color del borde" value={v('border-color')} computed={c('border-top-color')} onChange={set('border-color')} onPreview={preview('border-color')} />
      <div><span className={label}>Radio de esquinas</span><Field ariaLabel="Radio de esquinas" value={v('border-radius')} placeholder={c('border-top-left-radius')} onCommit={set('border-radius')} /></div>
    </Group>

    <Group title="Efectos">
      <div><span className={label}>Sombra</span><Select ariaLabel="Sombra" value={SHADOWS.some(([s]) => s === v('box-shadow')) ? v('box-shadow') : '__custom'} onChange={val => val !== '__custom' && onStyles({ 'box-shadow': val })}
        options={[...SHADOWS, ...(SHADOWS.some(([s]) => s === v('box-shadow')) ? [] : [['__custom', 'Personalizada'] as [string, string]])]} /></div>
      <OpacityControl value={v('opacity') || c('opacity') || '1'} onCommit={set('opacity')} onPreview={preview('opacity')} />
    </Group>

    <Group title="Espaciado">
      <Box prefix="margin" info={info} onStyles={onStyles} />
      <Box prefix="padding" info={info} onStyles={onStyles} />
    </Group>

    <Group title="Dimensiones">
      <div className="grid grid-cols-2 gap-1.5">
        {([['width', 'Ancho'], ['height', 'Alto'], ['min-width', 'Ancho mín.'], ['max-width', 'Ancho máx.'], ['min-height', 'Alto mín.'], ['max-height', 'Alto máx.']] as const).map(([p, l]) =>
          <div key={p}><span className={label}>{l}</span><Field ariaLabel={l} value={v(p)} placeholder={c(p)} onCommit={set(p)} /></div>)}
      </div>
      {info.tag === 'IMG' && <div className="grid grid-cols-2 gap-1.5">
        <div><span className={label}>Encaje</span><Select ariaLabel="Encaje de la imagen" value={v('object-fit')} onChange={set('object-fit')} options={[['', 'Heredado'], ['cover', 'Cubrir'], ['contain', 'Contener'], ['fill', 'Estirar'], ['none', 'Original']]} /></div>
        <div><span className={label}>Encuadre</span><Field ariaLabel="Encuadre de la imagen" value={v('object-position')} placeholder="center" onCommit={set('object-position')} /></div>
      </div>}
    </Group>

    <Group title="Distribución">
      <div><span className={label}>Tipo de caja</span><Select ariaLabel="Tipo de caja" value={v('display')} onChange={set('display')}
        options={[['', 'Heredado (' + c('display') + ')'], ['block', 'Bloque'], ['inline-block', 'En línea (bloque)'], ['flex', 'Flexbox'], ['grid', 'Cuadrícula (Grid)'], ['inline', 'En línea'], ['none', 'Oculto (CSS)']]} /></div>
      {isFlex && <div className="grid grid-cols-2 gap-1.5">
        <Select ariaLabel="Dirección" value={v('flex-direction')} onChange={set('flex-direction')} options={[['', 'Dirección'], ['row', 'Horizontal'], ['column', 'Vertical'], ['row-reverse', 'Horizontal inversa'], ['column-reverse', 'Vertical inversa']]} />
        <Select ariaLabel="Ajuste de línea" value={v('flex-wrap')} onChange={set('flex-wrap')} options={[['', 'Una línea'], ['wrap', 'Varias líneas'], ['nowrap', 'Sin saltos']]} />
      </div>}
      {(isFlex || isGrid) && <div className="grid grid-cols-2 gap-1.5">
        <Select ariaLabel="Distribución en el eje principal" value={v('justify-content')} onChange={set('justify-content')} options={[['', 'Distribuir'], ['flex-start', 'Al inicio'], ['center', 'Centrado'], ['flex-end', 'Al final'], ['space-between', 'Espacio entre'], ['space-around', 'Espacio alrededor'], ['space-evenly', 'Espacio uniforme']]} />
        <Select ariaLabel="Alineación en el eje cruzado" value={v('align-items')} onChange={set('align-items')} options={[['', 'Alinear'], ['stretch', 'Estirar'], ['flex-start', 'Arriba'], ['center', 'Centro'], ['flex-end', 'Abajo'], ['baseline', 'Línea base']]} />
        <div><span className={label}>Separación</span><Field ariaLabel="Separación (gap)" value={v('gap')} placeholder={c('gap')} onCommit={set('gap')} /></div>
        {isGrid && <div><span className={label}>Columnas</span><Field ariaLabel="Columnas de la cuadrícula" value={v('grid-template-columns')} placeholder="repeat(3, 1fr)" onCommit={set('grid-template-columns')} /></div>}
      </div>}
    </Group>

    <Group title="Posición">
      <div className="grid grid-cols-2 gap-1.5">
        <div><span className={label}>Modo</span><Select ariaLabel="Posicionamiento" value={v('position')} onChange={set('position')} options={[['', 'Heredado'], ['static', 'Normal'], ['relative', 'Relativo'], ['absolute', 'Absoluto'], ['sticky', 'Fijo al desplazar']]} /></div>
        <div><span className={label}>Capa (z-index)</span><Field ariaLabel="Orden de capa" value={v('z-index')} placeholder={c('z-index')} onCommit={set('z-index')} /></div>
        {(['top', 'right', 'bottom', 'left'] as const).map(p => <div key={p}><span className={label}>{{ top: 'Arriba', right: 'Derecha', bottom: 'Abajo', left: 'Izquierda' }[p]}</span>
          <Field ariaLabel={'Desplazamiento ' + p} value={v(p)} placeholder={c(p)} onCommit={set(p)} /></div>)}
      </div>
      <p className="text-[10px] leading-4 text-faint">El modo «Mover» de la barra desplaza el elemento arrastrándolo sin romper el diseño responsive.</p>
    </Group>

    <Group title="Accesibilidad y atributos">
      {info.tag === 'IMG' && <div><span className={label}>Texto alternativo</span><Field ariaLabel="Texto alternativo" mono={false} value={info.attrs.alt} onCommit={alt => onAttrs({ alt })} /></div>}
      <div><span className={label}>Etiqueta accesible</span><Field ariaLabel="Etiqueta accesible (aria-label)" mono={false} value={info.attrs.ariaLabel} onCommit={ariaLabel => onAttrs({ ariaLabel })} /></div>
      <div><span className={label}>Información al pasar el ratón</span><Field ariaLabel="Título del elemento" mono={false} value={info.attrs.title} onCommit={title => onAttrs({ title })} /></div>
      <div><span className={label}>Identificador (para anclas)</span><Field ariaLabel="Identificador" value={info.attrs.id} placeholder="sin id" onCommit={id => onAttrs({ id })} /></div>
    </Group>
  </div>;
}
