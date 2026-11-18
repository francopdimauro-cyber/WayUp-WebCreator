'use client';
/** Diálogo «Cambiar imagen»: subir una foto, buscarla en Pixabay o ajustar la actual; recortar con proporciones fijas
 *  y zoom, elegir el punto de enfoque (escritorio y móvil) y aplicar filtros. La caja de la imagen se mantiene. */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ImageIcon, LoaderCircle, Monitor, Search, Smartphone, Upload, X } from 'lucide-react';
import type { ElementInfo } from './property-panel';
import { FILTER_PRESETS, NO_FILTERS, cropAttr, cropFor, filterCss, focusCss, mimeOf, parseCrop, parseFilterCss, parseFocus, renderCrop,
  type Crop, type Focus, type ImageFilters } from '@/lib/image-editing';

export type ImageSource = { bytes: Uint8Array; mime: string; isOriginal: boolean };
export type ImageApply = {
  file?: { bytes: Uint8Array; ext: string }; original?: { bytes: Uint8Array; ext: string } | null;
  crop: string | null; aspect: number; position: string; positionMobile: string | null; filter: string; alt: string;
  credit?: { text: string; link: string } | null;
};
type Src = { url: string; bytes: Uint8Array; mime: string; kind: 'actual' | 'nueva'; isOriginal: boolean; credit?: { text: string; link: string } };
type Photo = { id: number | string; thumb: string; w: number; h: number; user: string; tags: string };

const RATIOS: { id: string; name: string; r: number | null }[] = [
  { id: 'caja', name: 'Caja actual', r: null }, { id: 'libre', name: 'Libre', r: null },
  { id: '1:1', name: '1:1', r: 1 }, { id: '4:3', name: '4:3', r: 4 / 3 }, { id: '16:9', name: '16:9', r: 16 / 9 }, { id: '3:4', name: '3:4', r: 3 / 4 },
];
const MAX_UPLOAD = 15_000_000;
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const near = (a: Crop, b: Crop) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) < 0.004;

export function ImageDialog({ info, loadCurrent, onApply, onClose }: {
  info: ElementInfo; loadCurrent(): ImageSource | null; onApply(change: ImageApply): Promise<void> | void; onClose(): void;
}) {
  const im = info.image!;
  const boxRatio = im.w > 0 && im.h > 0 ? im.w / im.h : 4 / 3;
  const [tab, setTab] = useState<'actual' | 'subir' | 'buscar'>('actual');
  const [src, setSrc] = useState<Src | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ratioId, setRatioId] = useState('caja');
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [focus, setFocus] = useState<Focus>(parseFocus(im.position));
  const [focusMobile, setFocusMobile] = useState<Focus>(parseFocus(im.positionMobile || im.position));
  const [focusMode, setFocusMode] = useState<'escritorio' | 'movil'>('escritorio');
  const [filters, setFilters] = useState<ImageFilters>(parseFilterCss(im.filter));
  const [alt, setAlt] = useState(info.attrs.alt || '');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  // Pixabay
  const [query, setQuery] = useState('');
  const [orientation, setOrientation] = useState<'all' | 'horizontal' | 'vertical'>(boxRatio >= 1 ? 'horizontal' : 'vertical');
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const pendingCrop = useRef<Crop | null>(null);
  const takeSource = useCallback((s: Omit<Src, 'url'>, initial?: Crop | null) => {
    setSrc(old => { if (old) URL.revokeObjectURL(old.url); return { ...s, url: URL.createObjectURL(new Blob([s.bytes.slice().buffer], { type: s.mime })) }; });
    setNat(null); setError('');
    if (initial) { setCenter({ x: initial.x + initial.w / 2, y: initial.y + initial.h / 2 }); setZoom(-1); /* se calcula al cargar */ pendingCrop.current = initial; }
    else { setCenter({ x: 0.5, y: 0.5 }); setZoom(1); pendingCrop.current = null; }
    setRatioId('caja');
  }, []);

  // La imagen actual (desde su original si lo hay, con el recorte guardado).
  const [current] = useState(() => loadCurrent());
  useEffect(() => {
    if (current) takeSource({ bytes: current.bytes, mime: current.mime, kind: 'actual', isOriginal: current.isOriginal }, current.isOriginal ? parseCrop(im.crop) : null);
    else setTab('subir');
    // Solo al abrir el diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src.url); }, [src]);

  const ratio = ratioId === 'caja' ? boxRatio : ratioId === 'libre' ? null : RATIOS.find(r => r.id === ratioId)!.r;
  const crop = useMemo(() => nat ? cropFor(nat.w, nat.h, ratio, zoom < 1 ? 1 : zoom, center.x, center.y) : null, [nat, ratio, zoom, center]);
  const cropRatio = crop && nat ? (crop.w * nat.w) / (crop.h * nat.h) : boxRatio;

  function onLoaded(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget; imgRef.current = el;
    const n = { w: el.naturalWidth, h: el.naturalHeight }; setNat(n);
    const c = pendingCrop.current;
    if (c) {
      // Zoom equivalente al recorte guardado (respecto al mayor recorte posible con la proporción de la caja).
      const base = cropFor(n.w, n.h, boxRatio, 1, 0.5, 0.5);
      setZoom(clamp(base.w / c.w, 1, 8)); pendingCrop.current = null;
    } else if (zoom < 1) setZoom(1);
  }

  // Vista previa del recorte (baja resolución) para los marcos de encuadre y filtros.
  useEffect(() => {
    const el = imgRef.current;
    if (!el || !crop || !nat) return;
    const t = setTimeout(() => {
      const W = el.naturalWidth, H = el.naturalHeight, sw = crop.w * W, sh = crop.h * H, s = Math.min(1, 640 / Math.max(sw, sh));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
      c.getContext('2d')?.drawImage(el, crop.x * W, crop.y * H, sw, sh, 0, 0, c.width, c.height);
      setPreview(c.toDataURL('image/jpeg', 0.85));
    }, 60);
    return () => clearTimeout(t);
  }, [crop, nat]);

  // Arrastrar el recorte.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  function onCropDown(e: RPointerEvent<HTMLDivElement>) {
    if (!crop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: crop.x + crop.w / 2, cy: crop.y + crop.h / 2 };
  }
  function onCropMove(e: RPointerEvent<HTMLDivElement>) {
    const d = drag.current, stage = stageRef.current?.getBoundingClientRect();
    if (!d || !stage || !crop) return;
    setCenter({ x: clamp(d.cx + (e.clientX - d.x) / stage.width, crop.w / 2, 1 - crop.w / 2), y: clamp(d.cy + (e.clientY - d.y) / stage.height, crop.h / 2, 1 - crop.h / 2) });
  }

  async function addFile(file: File) {
    setError('');
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setError('Usa una imagen PNG, JPG, WebP o GIF.'); return; }
    if (file.size > MAX_UPLOAD) { setError('La imagen pesa más de 15 MB.'); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    takeSource({ bytes, mime: mimeOf(bytes), kind: 'nueva', isOriginal: true });
    if (!alt.trim()) setAlt(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120));
  }
  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true); setError('');
    try {
      const r = await fetch('/studio-api/webcreator/photo-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store',
        body: JSON.stringify({ q: query.trim(), orientation }) });
      const d = await r.json().catch(() => ({})) as { photos?: Photo[]; error?: string };
      if (!r.ok) throw Error(d.error || 'No se pudo buscar.');
      setPhotos(Array.isArray(d.photos) ? d.photos : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo buscar.'); setPhotos(null); }
    finally { setSearching(false); }
  }
  async function pickPhoto(p: Photo) {
    setBusy('Descargando la foto…'); setError('');
    try {
      const r = await fetch('/studio-api/webcreator/photo-get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ id: p.id }) });
      const d = await r.json().catch(() => ({})) as { image?: string; credit?: string; link?: string; error?: string };
      if (!r.ok || typeof d.image !== 'string' || !d.image.startsWith('data:image/')) throw Error(d.error || 'No se pudo descargar la foto.');
      const bytes = Uint8Array.from(atob(d.image.split(',')[1] || ''), c => c.charCodeAt(0));
      takeSource({ bytes, mime: mimeOf(bytes), kind: 'nueva', isOriginal: true, credit: { text: String(d.credit || 'Pixabay'), link: String(d.link || 'https://pixabay.com/') } });
      if (!alt.trim()) setAlt(p.tags.split(',')[0]?.trim() || '');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo descargar la foto.'); }
    finally { setBusy(''); }
  }

  async function apply() {
    if (!src || !crop || !nat || !imgRef.current) return;
    setBusy('Preparando la imagen…'); setError('');
    try {
      const full = near(crop, { x: 0, y: 0, w: 1, h: 1 });
      const ext = EXT[src.mime] || 'jpg';
      const out: ImageApply = { crop: null, aspect: cropRatio, position: focusCss(focus), positionMobile: focusCss(focusMobile) === focusCss(focus) ? null : focusCss(focusMobile),
        filter: filterCss(filters), alt };
      if (src.kind === 'nueva') {
        // Original guardado (reducido si es enorme) para poder volver a recortar sin perder calidad.
        const big = src.bytes.byteLength > 3_000_000 || Math.max(nat.w, nat.h) > 2400;
        const original = big ? await renderCrop(imgRef.current, { x: 0, y: 0, w: 1, h: 1 }, src.mime) : { bytes: src.bytes, ext };
        if (full) { out.file = original; out.original = null; }
        else { out.file = await renderCrop(imgRef.current, crop, src.mime); out.original = original; out.crop = cropAttr(crop); }
        out.credit = src.credit || null;
      } else {
        // Imagen actual: solo se crea un archivo nuevo si cambia el recorte.
        const saved = src.isOriginal ? parseCrop(im.crop) : null;
        const same = src.isOriginal ? (saved ? near(crop, saved) : full) : full;
        if (!same) {
          out.file = await renderCrop(imgRef.current, crop, src.mime);
          if (!src.isOriginal) out.original = { bytes: src.bytes, ext };
          out.crop = cropAttr(crop);
        } else out.crop = saved ? cropAttr(saved) : null;
      }
      await onApply(out);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo aplicar.'); }
    finally { setBusy(''); }
  }

  const fcss = filterCss(filters);
  const shownFocus = focusMode === 'movil' ? focusMobile : focus;
  const setShownFocus = focusMode === 'movil' ? setFocusMobile : setFocus;
  const tabBtn = (id: typeof tab, label: string, icon: React.ReactNode, disabled = false) =>
    <button type="button" role="tab" aria-selected={tab === id} disabled={disabled} onClick={() => { setTab(id); if (id === 'actual' && current) takeSource({ bytes: current.bytes, mime: current.mime, kind: 'actual', isOriginal: current.isOriginal }, current.isOriginal ? parseCrop(im.crop) : null); }}
      className={'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] disabled:opacity-40 ' + (tab === id ? 'bg-brandsoft font-semibold text-brand' : 'text-mist hover:text-ink')}>{icon}{label}</button>;

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true" aria-label="Cambiar imagen" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="flex h-[92vh] max-h-[820px] w-full max-w-[1020px] flex-col overflow-hidden rounded-2xl border border-stroke bg-panel shadow-2xl">
      <header className="flex items-center justify-between border-b border-stroke px-5 py-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold"><ImageIcon size={16} className="text-brand" /> Cambiar imagen</h2>
        <div className="flex items-center gap-1" role="tablist" aria-label="Origen de la imagen">
          {tabBtn('actual', 'Ajustar la actual', <ImageIcon size={13} />, !current)}
          {tabBtn('subir', 'Subir', <Upload size={13} />)}
          {tabBtn('buscar', 'Buscar fotos', <Search size={13} />)}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-mist hover:bg-elevated"><X size={16} /></button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_300px]">
        <div className="scroll-subtle flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
          {tab === 'subir' && <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void addFile(f); }}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stroke bg-elevated px-4 py-5 text-center text-[11.5px] text-mist hover:border-brand">
            <Upload size={18} className="text-brand" /><span className="font-semibold text-ink">Arrastra una imagen o haz clic para elegirla</span>
            <span>PNG, JPG, WebP o GIF · hasta 15 MB · se guarda dentro del proyecto</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label="Subir imagen"
              onChange={e => { const f = e.target.files?.[0]; if (f) void addFile(f); e.currentTarget.value = ''; }} /></label>}
          {tab === 'buscar' && <div className="space-y-2">
            <form onSubmit={search} className="flex gap-2">
              <label className="relative flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Ej.: café con leche, gimnasio, playa al atardecer" aria-label="Buscar fotos"
                  className="w-full rounded-lg border border-stroke bg-elevated py-2 pl-9 pr-3 text-[12px] text-ink outline-none focus:border-brand" /></label>
              <select value={orientation} onChange={e => setOrientation(e.target.value as typeof orientation)} aria-label="Orientación" className="rounded-lg border border-stroke bg-elevated px-2 text-[11.5px] text-ink">
                <option value="all">Todas</option><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select>
              <button type="submit" disabled={searching} className="rounded-lg bg-brand px-3 text-[12px] font-semibold text-white disabled:opacity-50">{searching ? <LoaderCircle size={14} className="animate-spin" /> : 'Buscar'}</button>
            </form>
            {photos && <div className="grid max-h-[230px] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {photos.map(p => <button key={p.id} type="button" onClick={() => void pickPhoto(p)} title={p.tags + ' · ' + p.user}
                className="aspect-square overflow-hidden rounded-md border border-stroke hover:border-brand">
                {/* Miniatura de resultados de Pixabay (se muestra desde Pixabay solo mientras buscas). */}
                <img src={p.thumb} alt={p.tags} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /></button>)}
              {!photos.length && <p className="col-span-full p-3 text-center text-[11px] text-faint">Sin resultados. Prueba con otras palabras.</p>}
            </div>}
            <p className="text-[10px] text-faint">Fotos gratuitas de Pixabay y Openverse (licencias abiertas). La elegida se descarga al proyecto y se guarda su autoría.</p>
          </div>}

          {src ? <>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Proporción del recorte">
              {RATIOS.map(r => <button key={r.id} type="button" aria-pressed={ratioId === r.id} onClick={() => { setRatioId(r.id); setZoom(1); }}
                className={'rounded-full border px-2.5 py-1 text-[10.5px] ' + (ratioId === r.id ? 'border-brand bg-brandsoft text-brand' : 'border-stroke text-mist hover:text-ink')}>
                {r.name}{r.id === 'caja' ? ' (' + (Math.round(boxRatio * 100) / 100) + ')' : ''}</button>)}
            </div>
            <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-xl bg-[#111] p-3">
              <div ref={stageRef} className="relative max-h-full select-none overflow-hidden" style={{ lineHeight: 0 }}>
                <img src={src.url} alt="" onLoad={onLoaded} draggable={false} className="max-h-[340px] max-w-full" style={{ filter: fcss || undefined }} />
                {crop && <div aria-label="Zona recortada: arrástrala para moverla" role="slider" aria-valuenow={Math.round(center.x * 100)}
                  onPointerDown={onCropDown} onPointerMove={onCropMove} onPointerUp={() => { drag.current = null; }}
                  className="absolute cursor-move border-2 border-white" style={{ left: crop.x * 100 + '%', top: crop.y * 100 + '%', width: crop.w * 100 + '%', height: crop.h * 100 + '%', boxShadow: '0 0 0 9999px rgba(0,0,0,.55)' }}>
                  <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right,transparent 33%,rgba(255,255,255,.35) 33%,rgba(255,255,255,.35) calc(33% + 1px),transparent calc(33% + 1px),transparent 66%,rgba(255,255,255,.35) 66%,rgba(255,255,255,.35) calc(66% + 1px),transparent calc(66% + 1px)),linear-gradient(to bottom,transparent 33%,rgba(255,255,255,.35) 33%,rgba(255,255,255,.35) calc(33% + 1px),transparent calc(33% + 1px),transparent 66%,rgba(255,255,255,.35) 66%,rgba(255,255,255,.35) calc(66% + 1px),transparent calc(66% + 1px))' }} />
                </div>}
              </div>
            </div>
            <label className="flex items-center gap-3 text-[11px] text-mist">Zoom
              <input type="range" min={1} max={4} step={0.01} value={zoom < 1 ? 1 : zoom} onChange={e => setZoom(Number(e.target.value))} aria-label="Zoom del recorte" className="flex-1 accent-[var(--wu-brand)]" />
              <span className="w-10 text-right font-mono">{(zoom < 1 ? 1 : zoom).toFixed(1)}×</span></label>
            {src.credit && <p className="text-[10.5px] text-faint">{src.credit.text}</p>}
          </> : <p className="flex flex-1 items-center justify-center text-[12px] text-faint">{tab === 'buscar' ? 'Busca y elige una foto.' : 'Elige una imagen para empezar.'}</p>}
        </div>

        <aside className="scroll-subtle space-y-4 overflow-y-auto border-t border-stroke bg-elevated p-4 md:border-l md:border-t-0">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[.12em] text-faint">Punto de enfoque</h3>
            <div className="flex gap-1" role="group" aria-label="Dispositivo del enfoque">
              {(['escritorio', 'movil'] as const).map(m => <button key={m} type="button" aria-pressed={focusMode === m} onClick={() => setFocusMode(m)}
                className={'inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10.5px] ' + (focusMode === m ? 'border-brand bg-brandsoft text-brand' : 'border-stroke text-mist')}>
                {m === 'movil' ? <Smartphone size={12} /> : <Monitor size={12} />}{m === 'movil' ? 'Móvil' : 'Escritorio'}</button>)}
            </div>
            {preview ? <div className="relative cursor-crosshair overflow-hidden rounded-lg" aria-label="Haz clic para elegir el punto de enfoque"
              onClick={e => { const b = e.currentTarget.getBoundingClientRect(); setShownFocus({ x: clamp((e.clientX - b.left) / b.width * 100, 0, 100), y: clamp((e.clientY - b.top) / b.height * 100, 0, 100) }); }}>
              <img src={preview} alt="" className="block w-full" style={{ filter: fcss || undefined }} draggable={false} />
              <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow" style={{ left: shownFocus.x + '%', top: shownFocus.y + '%' }} />
            </div> : <div className="h-24 rounded-lg bg-panel" />}
            <div className="grid grid-cols-[1fr_auto] items-end gap-2 text-center text-[10px] text-faint">
              <div><div className="overflow-hidden rounded-md bg-panel" style={{ aspectRatio: String(cropRatio) }}>{preview && <img src={preview} alt="" className="h-full w-full" style={{ objectFit: 'cover', objectPosition: focusCss(focus), filter: fcss || undefined }} />}</div>Escritorio</div>
              <div className="w-[64px]"><div className="overflow-hidden rounded-md bg-panel" style={{ aspectRatio: '9 / 16' }}>{preview && <img src={preview} alt="" className="h-full w-full" style={{ objectFit: 'cover', objectPosition: focusCss(focusMobile), filter: fcss || undefined }} />}</div>Móvil</div>
            </div>
            <p className="text-[10px] leading-4 text-faint">Decide qué parte de la foto se ve cuando su caja la recorta (por ejemplo, en pantallas estrechas).</p>
          </section>
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[.12em] text-faint">Filtros</h3>
            <div className="grid grid-cols-4 gap-1">
              {FILTER_PRESETS.map(p => <button key={p.id} type="button" title={p.name} aria-pressed={filterCss(p.f) === fcss} onClick={() => setFilters(p.f)}
                className={'overflow-hidden rounded-md border text-[9.5px] ' + (filterCss(p.f) === fcss ? 'border-brand text-brand' : 'border-stroke text-mist')}>
                <div className="h-9 bg-panel">{preview && <img src={preview} alt="" className="h-full w-full object-cover" style={{ filter: filterCss(p.f) || undefined }} />}</div>
                <span className="block truncate px-0.5 py-0.5">{p.name}</span></button>)}
            </div>
            {([['brightness', 'Brillo', 50, 150], ['contrast', 'Contraste', 50, 150], ['saturate', 'Saturación', 0, 200]] as const).map(([k, label, a, b]) =>
              <label key={k} className="grid grid-cols-[72px_1fr_34px] items-center gap-2 text-[10.5px] text-mist">{label}
                <input type="range" min={a} max={b} value={filters[k]} onChange={e => setFilters({ ...filters, [k]: Number(e.target.value) })} aria-label={label} className="accent-[var(--wu-brand)]" />
                <span className="text-right font-mono">{filters[k]}</span></label>)}
            {fcss && <button type="button" onClick={() => setFilters(NO_FILTERS)} className="text-[10.5px] text-brand hover:underline">Quitar filtros</button>}
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[.12em] text-faint">Texto alternativo</h3>
            <input value={alt} onChange={e => setAlt(e.target.value)} maxLength={200} aria-label="Texto alternativo de la imagen" placeholder="Describe la foto (accesibilidad y SEO)"
              className="w-full rounded-lg border border-stroke bg-panel px-2.5 py-1.5 text-[11.5px] text-ink outline-none focus:border-brand" />
          </section>
          <p className="text-[10px] leading-4 text-faint">La imagen mantiene sus clases, su id y su caja ({im.w}×{im.h} px). Con «Caja actual» el diseño no se mueve.</p>
        </aside>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-stroke px-5 py-3">
        <p role="status" className={'text-[11px] ' + (error ? 'text-red-500' : 'text-mist')}>{error || busy}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-stroke px-4 py-2 text-[12px] text-ink hover:bg-elevated">Cancelar</button>
          <button type="button" disabled={!src || !crop || !!busy} onClick={() => void apply()} className="rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-40">Aplicar imagen</button>
        </div>
      </footer>
    </div>
  </div>;
}
