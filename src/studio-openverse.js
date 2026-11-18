/* WAY UP Studio · Openverse (WordPress): fotos con licencia abierta, sin clave.
   Solo licencias que permiten uso comercial Y modificación (recortamos las fotos), y siempre con autoría y licencia. */

const API = 'https://api.openverse.org/v1/images/';
const UA = { 'User-Agent': 'WayUpStudio/1.0 (creador de webs)' };
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 4_500_000;

const licenseText = h => (String(h.license || '').toLowerCase() === 'cc0' || String(h.license || '').toLowerCase() === 'pdm')
  ? 'dominio público' : 'CC ' + String(h.license || '').toUpperCase() + (h.license_version ? ' ' + h.license_version : '');
/** Texto de autoría que se guarda en la imagen (data-wc-credit). */
export const openverseCredit = h => clip('Foto de ' + (h.creator || 'autor desconocido') + ' · ' + licenseText(h) + ' · vía Openverse', 120);

async function search(q, { pageSize = 12, orientation } = {}, fetcher = fetch) {
  const aspect = orientation === 'horizontal' ? '&aspect_ratio=wide' : orientation === 'vertical' ? '&aspect_ratio=tall' : '';
  const r = await fetcher(API + '?q=' + encodeURIComponent(clip(q, 100)) + '&license_type=commercial,modification&category=photograph&mature=false&page_size=' + pageSize + aspect,
    { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error('Openverse ' + r.status);
  return ((await r.json())?.results || []).filter(h => ID_RE.test(String(h.id)) && /^https:\/\//.test(String(h.url || '')));
}

/** Descarga la foto (o su miniatura grande si el original pesa demasiado) como data URL. */
async function download(h, fetcher) {
  for (const url of [h.url, API + h.id + '/thumb/?full_size=true']) {
    try {
      const r = await fetcher(url, { headers: UA, signal: AbortSignal.timeout(15000) });
      const type = (r.headers.get('content-type') || '').split(';')[0];
      if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type)) continue;
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES || bytes.byteLength < 1000) continue;
      let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return 'data:' + type + ';base64,' + btoa(bin);
    } catch { /* siguiente opción */ }
  }
  return null;
}
const result = (h, image) => ({ image, source: 'openverse', credit: openverseCredit(h), link: clip(h.foreign_landing_url || 'https://openverse.org/image/' + h.id, 300) });

/** Para la generación: la primera foto descargable que encaje con la descripción (en inglés). */
export async function openversePhoto(prompt, fetcher = fetch) {
  const words = String(prompt || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2).slice(0, 5).join(' ');
  if (!words) return null;
  try {
    for (const h of (await search(words, { pageSize: 6, orientation: 'horizontal' }, fetcher)).slice(0, 4)) {
      const image = await download(h, fetcher);
      if (image) return result(h, image);
    }
  } catch { /* sin Openverse */ }
  return null;
}

/** Para «Cambiar imagen»: resultados con miniatura (ids «ov:<uuid>»). */
export async function openverseSearch(q, orientation, fetcher = fetch) {
  try {
    return (await search(q, { pageSize: 12, orientation }, fetcher)).map(h => ({ id: 'ov:' + h.id, thumb: API + h.id + '/thumb/',
      w: Number(h.width) || 0, h: Number(h.height) || 0, user: clip(h.creator || 'Openverse', 60), tags: clip((h.tags || []).map(t => t?.name).filter(Boolean).join(', ') || h.title, 120) }));
  } catch { return []; }
}

/** Descarga la foto elegida en «Cambiar imagen». */
export async function openverseGet(id, fetcher = fetch) {
  const uuid = String(id || '').replace(/^ov:/, '');
  if (!ID_RE.test(uuid)) throw Error('Foto no válida.');
  const r = await fetcher(API + uuid + '/', { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error('Foto no disponible.');
  const h = await r.json();
  // Se vuelve a comprobar la licencia en el servidor (no nos fiamos del cliente).
  if (!/^(cc0|pdm|by|by-sa)$/i.test(String(h.license || ''))) throw Error('La licencia de esta foto no permite usarla en una web comercial.');
  const image = await download(h, fetcher);
  if (!image) throw Error('No se pudo descargar la foto.');
  return result(h, image);
}
