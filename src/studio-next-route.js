/* WAYUP Studio Next: same Worker, same origin, same Cloudflare Access boundary.
   The React preview is served as a static workspace view. Existing D1/R2-backed
   project editing remains in WebCreator Studio, never silently saved locally.
*/
const WAYUP_NEXT_FILES = new Map(Object.entries(__WEBCREATOR_NEXT_ASSETS__));
const WAYUP_NEXT_MEMORY = new Map();
const WAYUP_NEXT_NAV = __WEBCREATOR_NEXT_NAV__;
function wayupNextBytes(path) {
  if (WAYUP_NEXT_MEMORY.has(path)) return WAYUP_NEXT_MEMORY.get(path);
  const entry = WAYUP_NEXT_FILES.get(path);
  if (!entry) return null;
  const binary = atob(entry[0]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  WAYUP_NEXT_MEMORY.set(path, bytes);
  return bytes;
}
function wayupNextAsset(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response('Método no permitido', { status:405, headers:{Allow:'GET, HEAD'} });
  const path = ['/studio-next','/studio-next/','/studio-next/index.html'].includes(url.pathname) ? '/' : url.pathname;
  if (path !== '/' && !path.startsWith('/_next/static/'))
    return new Response('Recurso no encontrado', {status:404});
  const entry = WAYUP_NEXT_FILES.get(path);
  if (!entry)
    return new Response(WAYUP_NEXT_FILES.size ? 'Recurso no encontrado' : 'Studio Next todavía no está compilado.', {status:WAYUP_NEXT_FILES.size?404:503,
      headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const headers = new Headers({
    'content-type':entry[1],
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'x-wayup-studio':'integrado-en-webcreator',
    'cache-control':path.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'private, no-store'
  });
  if (path==='/') {
    headers.set('content-type','text/html; charset=utf-8');
    const html=new TextDecoder().decode(wayupNextBytes('/'));
    const modified=html.replace('</body>','<script id="wc-next-integrated-navigation">'+WAYUP_NEXT_NAV+'</script></body>');
    return new Response(request.method==='HEAD'?null:modified,{status:200,headers});
  }
  return new Response(request.method==='HEAD'?null:wayupNextBytes(path),{status:200,headers});
}
