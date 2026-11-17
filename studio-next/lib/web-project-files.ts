import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type SiteBundle = {
  id: string;
  name: string;
  html: string;
  entry: string;
  assets: Record<string, Uint8Array>;
  version: number;
  updatedAt: number;
  source: 'generated'|'imported';
  agent?: {agentId:string;chatId:string;origin:string;title:string;linkedAt:number};
  cloud?: {id:string;version:number};
  versions: { number:number; html:string; savedAt:number }[];
  /** Mesa de trabajo: elementos aparcados fuera de la página (no se publican ni exportan). */
  parked?: { id:string; name:string; html:string; x?:number; y?:number; w?:number }[];
};
export const MAX_IMPORT_BYTES=25_000_000;
const MAX_FILE_BYTES=9_000_000;
const MAX_UNPACKED_BYTES=65_000_000;
const MAX_FILES=180;
export function safePath(path:string):boolean {
  return Boolean(path)&&path.length<240&&!path.startsWith('/')&&!/[\u0000-\u001f\\]/.test(path)&&
    !path.split('/').some(s=>s==='..'||s==='.'||s==='')&&!/^[A-Za-z]:/.test(path);
}
export function assetMime(path:string):string {
  const ext=path.split('.').pop()?.toLowerCase()||'';
  const types:Record<string,string>={html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',
    svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',ico:'image/x-icon',
    json:'application/json',avif:'image/avif',txt:'text/plain',webmanifest:'application/manifest+json'};
  return types[ext]||'application/octet-stream';
}
function validateDocument(html:string):void {
  if(html.length<40||html.length>3_000_000||!/<html[\s>]/i.test(html)||!/<body[\s>]/i.test(html))
    throw Error('Necesitamos una página HTML completa con <html> y <body>.');
}
export function siteTitle(html:string):string{
  const doc=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  return doc.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,90)||'Web sin título';
}
export function siteFromHtml(html:string,name?:string):SiteBundle {
  validateDocument(html);
  return {id:crypto.randomUUID(),name:name||siteTitle(html),html,entry:'index.html',assets:{},
    version:0,updatedAt:Date.now(),source:'imported',versions:[]};
}
export function siteFromZip(input:Uint8Array):SiteBundle {
  if(input.length>MAX_IMPORT_BYTES)throw Error('El ZIP supera 25 MB.');
  let sum=0,count=0;
  const output=unzipSync(input,{
    filter(file){
      const name=file.name;
      if(name.endsWith('/'))return false;
      if(!safePath(name))throw Error('Archivo con ruta insegura: '+name.slice(0,80));
      count++;
      if(count>MAX_FILES)throw Error('El ZIP contiene demasiados archivos (máximo 180).');
      if(file.originalSize>MAX_FILE_BYTES||sum+file.originalSize>MAX_UNPACKED_BYTES)
        throw Error('El ZIP contiene archivos demasiado grandes.');
      sum+=file.originalSize;
      return true;
    }
  });
  const files=Object.keys(output);
  const entry=files.includes('index.html')?'index.html':files.find(x=>/(^|\/)index\.html$/i.test(x));
  if(!entry)throw Error('El ZIP necesita un archivo index.html.');
  const html=strFromU8(output[entry]);
  validateDocument(html);
  delete output[entry];
  // El manifiesto contiene solo referencias públicas, nunca secretos ni tokens.
  let agent:SiteBundle['agent'];
  const metadata=output['WAYUP_STUDIO_PROJECT.json'];
  if(metadata&&metadata.length<=4_096){
    try{
      const parsed=JSON.parse(strFromU8(metadata)) as {format?:string;agent?:SiteBundle['agent']};
      const candidate=parsed.agent;
      if(parsed.format==='wayup-studio-v1'&&candidate&&
        /^[0-9a-f-]{36}$/i.test(candidate.agentId)&&
        /^[0-9a-f-]{36}$/i.test(candidate.chatId)&&
        /^https:\/\/[^\s/]+$/i.test(candidate.origin)&&
        typeof candidate.title==='string'&&candidate.title.length<=120&&
        Number.isFinite(candidate.linkedAt))
        agent=candidate;
    }catch{/* El ZIP sigue pudiendo importarse sin metadatos válidos. */}
  }
  delete output['WAYUP_STUDIO_PROJECT.json'];
  return {id:crypto.randomUUID(),name:siteTitle(html),html,entry,assets:output,
    version:0,updatedAt:Date.now(),source:'imported',versions:[],...(agent?{agent}:{})};
}
export function agentSnippet(chatId:string):string {
  if(!/^[0-9a-f-]{36}$/i.test(chatId))throw Error('Identificador de chat inválido.');
  return '<script src="https://wayup-studio-agent-preview.francopdimauro.workers.dev/widget.js" data-chat="'+chatId+'" defer></'+'script>';
}
export function htmlForExport(site:SiteBundle,additionalSnippet?:string):string {
  let html=site.html;
  const snippet=additionalSnippet||(site.agent?agentSnippet(site.agent.chatId):undefined);
  if(snippet){
    if(!/^<script src="https:\/\/wayup-studio-agent-preview\.francopdimauro\.workers\.dev\/widget\.js" data-chat="[a-f0-9-]{36}" defer><\/script>$/i.test(snippet))
      throw Error('Código de agente no autorizado.');
    // Si el cliente reemplaza el agente, no deben publicarse dos widgets activos.
    html=html.replace(/\s*<!--\s*Asistente de WayUp\s*-->\s*<script src="https:\/\/(?:agent-factory-free|wayup-studio-agent-preview)\.francopdimauro\.workers\.dev\/widget\.js" data-chat="[a-f0-9-]{36}" defer><\/script>/gi,'');
    if(!html.includes(snippet))html=html.replace(/<\/body>/i,'\n<!-- Asistente de WayUp -->\n'+snippet+'\n</body>');
  }
  return html;
}
export function siteZip(site:SiteBundle,additionalSnippet?:string):Uint8Array {
  const archive:Record<string,Uint8Array>={...site.assets};
  const html=htmlForExport(site,additionalSnippet);
  archive[site.entry]=strToU8(html);
  if(site.agent){
    archive['WAYUP_STUDIO_PROJECT.json']=strToU8(JSON.stringify({
      format:'wayup-studio-v1',
      agent:{agentId:site.agent.agentId,chatId:site.agent.chatId,
        origin:site.agent.origin,title:site.agent.title,linkedAt:site.agent.linkedAt}
    }));
    const notice='WayUp Studio — asistente IA vinculado\n\nOrigen autorizado: '+site.agent.origin+'\nTítulo: '+site.agent.title+'\n\nEl chat requiere que el agente esté activo y conectado al backend.\nAl publicar, utiliza exactamente el dominio HTTPS autorizado.\nNunca incluyas claves privadas de IA en el HTML o ZIP.\n';
    archive['WAYUP_AGENT_SETUP.txt']=strToU8(notice);
  }
  if(Object.keys(archive).length>MAX_FILES)throw Error('El proyecto contiene demasiados archivos para exportar.');
  return zipSync(archive,{level:5});
}
export function downloadBytes(bytes:Uint8Array,filename:string,mime:string):void {
  const copy=new Uint8Array(bytes.length);
  copy.set(bytes);
  const url=URL.createObjectURL(new Blob([copy.buffer],{type:mime}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function siteWithNewHtml(site:SiteBundle,html:string):SiteBundle {
  validateDocument(html);
  return {...site,html,updatedAt:Date.now()};
}
const DB_NAME='wayup-studio-web-projects-v1';
const STORE='projects';
function openDB():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>resolve(request.result);
  });
}
export async function listSavedSites():Promise<SiteBundle[]>{
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');const request=tx.objectStore(STORE).getAll();
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>resolve((request.result as SiteBundle[]).sort((a,b)=>b.updatedAt-a.updatedAt));
  });}finally{db.close()}
}
export async function saveSite(site:SiteBundle):Promise<SiteBundle>{
  const updated={...site,version:site.version+1,updatedAt:Date.now(),
    versions:[...site.versions,{number:site.version+1,html:site.html,savedAt:Date.now()}].slice(-15)};
  const db=await openDB();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(updated);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    return updated;
  }finally{db.close()}
}
export function safePreview(site:SiteBundle):{html:string;revoke():void}{
  const urls:string[]=[];
  const assets:Record<string,string>={};
  for(const [path,data] of Object.entries(site.assets)){
    if(!/\.(?:css|png|jpe?g|webp|gif|ico|avif|woff2?|ttf)$/i.test(path))continue;
    const copy=new Uint8Array(data.length);copy.set(data);
    const url=URL.createObjectURL(new Blob([copy.buffer],{type:assetMime(path)}));
    assets[path]=url;urls.push(url);
  }
  const doc=new DOMParser().parseFromString(site.html,'text/html');
  const eligible=editableHtmlNodes(doc);
  eligible.forEach((node,i)=>node.dataset.wayupEdit=String(i));
  // En el editor nada se arrastra con el «arrastre nativo» del navegador (Firefox lo inicia en enlaces e imágenes).
  for(const node of Array.from(doc.querySelectorAll('img,a,svg,picture,video')))node.setAttribute('draggable','false');
  for(const img of Array.from(doc.querySelectorAll('img[loading]')))img.setAttribute('loading','eager');
  // Elementos ocultos por el usuario: siguen ocultos al exportar, pero en el editor se ven atenuados.
  for(const node of Array.from(doc.querySelectorAll<HTMLElement>('[data-wc-hidden]'))){node.removeAttribute('hidden');node.dataset.wayupHidden='true';}
  for(const node of Array.from(doc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv],template'))){
    node.remove();
  }
  for(const node of Array.from(doc.querySelectorAll<HTMLElement>('*'))){
    for(const attr of Array.from(node.attributes)){
      if(/^on/i.test(attr.name)||attr.name==='srcdoc')node.removeAttribute(attr.name);
    }
  }
  const lookup=(value:string):string|undefined=>{
    if(/^(?:[a-z]+:|\/\/|#)/i.test(value))return undefined;
    const relative=value.split('?')[0].replace(/^\.\//,'');
    const folder=site.entry.includes('/')?site.entry.slice(0,site.entry.lastIndexOf('/')+1):'';
    return assets[folder+relative]||assets[relative];
  };
  for(const node of Array.from(doc.querySelectorAll('img[src],source[src]'))){
    const url=lookup(node.getAttribute('src')||'');
    if(url)node.setAttribute('src',url);
    else node.removeAttribute('src');
  }
  for(const link of Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))){
    const href=link.getAttribute('href')||'';
    // Google Fonts (licencia libre, solo CSS + fuentes): se mantiene para ver la tipografía real.
    if(/^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(href)){link.setAttribute('referrerpolicy','no-referrer');continue;}
    const path=href.split('?')[0].replace(/^\.\//,'');
    const folder=site.entry.includes('/')?site.entry.slice(0,site.entry.lastIndexOf('/')+1):'';
    const bytes=site.assets[folder+path]||site.assets[path];
    if(bytes&&bytes.length<1_000_000){
      const inline=doc.createElement('style');
      inline.textContent=strFromU8(bytes).replace(/@import[^;]+;/gi,'');
      link.replaceWith(inline);
    }else link.remove();
  }
  const csp=doc.createElement('meta');
  csp.httpEquiv='Content-Security-Policy';
  csp.content="default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob: https://fonts.googleapis.com; font-src blob: data: https://fonts.gstatic.com; connect-src 'none'; form-action 'none'; object-src 'none'; script-src 'none'; frame-src 'none'; base-uri 'none'";
  doc.head.prepend(csp);
  const previewStyles=doc.createElement('style');
  previewStyles.textContent='*,*::before,*::after{animation-delay:-1ms!important;animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important}[data-wayup-edit]{cursor:default}[data-wayup-edit][data-wayup-selected="true"]{outline:2px solid #3d5cff!important;outline-offset:2px}[data-wayup-hidden]{opacity:.32!important;outline:1px dashed #9aa3b5!important}[data-wayup-editing]{outline:2px solid #f5b400!important;outline-offset:3px;cursor:text!important}[data-wayup-editing]:focus{outline-style:solid!important}';
  doc.head.append(previewStyles);
  return {html:'<!DOCTYPE html>\n'+doc.documentElement.outerHTML,revoke:()=>urls.forEach(url=>URL.revokeObjectURL(url))};
}

/** Vista «En vivo»: la web tal como se publicará, con su JavaScript funcionando.
 *  Se muestra en un iframe sandbox="allow-scripts" SIN allow-same-origin (origen opaco: no ve el editor ni sus datos),
 *  con CSP sin red (connect-src 'none'), sin marcos ni recursos externos salvo Google Fonts, y sin salir de la página. */
export function livePreview(site:SiteBundle):string{
  const folder=site.entry.includes('/')?site.entry.slice(0,site.entry.lastIndexOf('/')+1):'';
  const asset=(value:string):Uint8Array|undefined=>{
    if(!value||/^(?:[a-z]+:|\/\/|#)/i.test(value))return undefined;
    const path=value.split(/[?#]/)[0].replace(/^\.\//,'');
    return site.assets[folder+path]||site.assets[path];
  };
  const dataUrl=(path:string,bytes:Uint8Array)=>{
    let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return 'data:'+assetMime(path)+';base64,'+btoa(bin);
  };
  const doc=new DOMParser().parseFromString(htmlForExport({...site,agent:undefined}),'text/html');
  for(const node of Array.from(doc.querySelectorAll('iframe,object,embed,base,meta[http-equiv],frame,frameset')))node.remove();
  for(const node of Array.from(doc.querySelectorAll<HTMLElement>('[data-wc-hidden]')))node.hidden=true;
  for(const node of Array.from(doc.querySelectorAll('img[src],source[src],video[src],audio[src],video[poster]'))){
    for(const attr of ['src','poster']){
      const value=node.getAttribute(attr);if(value===null)continue;
      const bytes=asset(value);
      if(bytes&&bytes.length<8_000_000)node.setAttribute(attr,dataUrl(value,bytes));
      else if(!/^data:/i.test(value))node.removeAttribute(attr);
    }
    node.removeAttribute('srcset');
  }
  for(const link of Array.from(doc.querySelectorAll('link[rel~="stylesheet"]'))){
    const href=link.getAttribute('href')||'';
    if(/^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(href)){link.setAttribute('referrerpolicy','no-referrer');continue;}
    const bytes=asset(href);
    if(bytes&&bytes.length<2_000_000){const s=doc.createElement('style');s.textContent=strFromU8(bytes).replace(/@import[^;]+;/gi,'');link.replaceWith(s);}
    else link.remove();
  }
  for(const script of Array.from(doc.querySelectorAll('script[src]'))){
    const bytes=asset(script.getAttribute('src')||'');
    if(bytes&&bytes.length<2_000_000){
      const inline=doc.createElement('script');
      for(const attr of Array.from(script.attributes))if(attr.name!=='src'&&attr.name!=='defer'&&attr.name!=='async')inline.setAttribute(attr.name,attr.value);
      inline.textContent=strFromU8(bytes);
      script.replaceWith(inline);
    }else script.remove();
  }
  const csp=doc.createElement('meta');
  csp.httpEquiv='Content-Security-Policy';
  csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; img-src data: blob:; media-src data: blob:; font-src data: https://fonts.gstatic.com; connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'";
  // Los enlaces externos no sacan la vista de la página: solo funcionan las anclas internas.
  const guard=doc.createElement('script');
  guard.textContent="document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)!=='#'){e.preventDefault();}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);";
  doc.head.prepend(guard);
  doc.head.prepend(csp);
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}

/** Índices DOM estables para vista protegida, árbol y operaciones reales. */
const BLOCKED_EDITOR_TAGS = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','TEMPLATE','LINK','META']);
export function editableHtmlNodes(doc:Document):HTMLElement[]{
  // Las etiquetas SVG llegan en minúsculas («svg», «path»): se comparan en mayúsculas y se excluye todo lo que hay
  // dentro de un dibujo, para que el clic seleccione su contenedor (símbolos, adornos, logotipos en SVG).
  return Array.from(doc.body.querySelectorAll<HTMLElement>('*'))
    .filter(node=>!BLOCKED_EDITOR_TAGS.has(node.tagName.toUpperCase())&&!node.parentElement?.closest('svg'));
}
export const selectableHtmlNode=(doc:Document,index:number):HTMLElement|null=>{
  if(!Number.isSafeInteger(index)||index<0)return null;
  return editableHtmlNodes(doc)[index]||null;
};
export type HtmlLayer = {index:number;tag:string;label:string;depth:number;id:string};
export function htmlLayerOutline(html:string):HtmlLayer[]{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const nodes=editableHtmlNodes(doc);
  const visible=new Set(['HEADER','MAIN','SECTION','ARTICLE','ASIDE','FOOTER','NAV','DIV','H1','H2','H3','H4','P','A','BUTTON','IMG','FORM']);
  return nodes.flatMap((node,index)=>{
    if(!visible.has(node.tagName))return [];
    const label=(node.getAttribute('aria-label')||node.getAttribute('alt')||
      (node.children.length===0?node.textContent:'')||node.getAttribute('id')||node.tagName)
      ?.replace(/\s+/g,' ').trim().slice(0,54)||node.tagName;
    let depth=0,parent=node.parentElement;
    while(parent&&parent!==doc.body){if(['HEADER','MAIN','SECTION','ARTICLE','ASIDE','FOOTER','NAV'].includes(parent.tagName))depth++;parent=parent.parentElement;}
    return [{index,tag:node.tagName,label,depth:Math.min(3,depth),id:node.id||''}];
  }).slice(0,400);
}
export function safeSiteLink(value:string):boolean{
  const raw=value.trim();
  if(!raw||raw.length>1400||/[\u0000-\u001f]/.test(raw))return false;
  if(raw.startsWith('#'))return /^#[\w\-:.]+$/.test(raw);
  if(raw.startsWith('/')&&!raw.startsWith('//'))return !/\\/.test(raw);
  if(/^(mailto:|tel:)/i.test(raw))return !/[<>\s]/.test(raw);
  if(/^https:\/\//i.test(raw)){try{const url=new URL(raw);return Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false}}
  if(/^[a-z][a-z0-9+.-]*:/i.test(raw)||raw.includes(':')||raw.startsWith('//')||/\\/.test(raw))return false;
  return safePath(raw.split(/[?#]/)[0])&&!/[<>"']/.test(raw);
}
export function detectSafeImage(bytes:Uint8Array):{mime:string;ext:string}|null{
  if(bytes.byteLength<12||bytes.byteLength>5_000_000)return null;
  if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10)return {mime:'image/png',ext:'png'};
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',ext:'jpg'};
  const head=String.fromCharCode(...bytes.slice(0,12));
  if(head.startsWith('GIF87a')||head.startsWith('GIF89a'))return {mime:'image/gif',ext:'gif'};
  if(head.slice(0,4)==='RIFF'&&head.slice(8,12)==='WEBP')return {mime:'image/webp',ext:'webp'};
  return null;
}
export type ImageTargetKind='item'|'section'|'element';
export type ImageTargetInfo={
  /** Índice del contenedor real al que se asociará la fotografía. */
  index:number;
  kind:ImageTargetKind;
  tag:string;
  label:string;
  imageIndex:number|null;
  imagePath:string;
  imageAlt:string;
  assetKey:string|null;
  hasImage:boolean;
  managedImage:boolean;
};
const MENU_ITEM_SELECTOR='li,tr,[role="listitem"],[data-wc-menu-item],[data-menu-item],[class*="menu-item"],[class*="menu_item"],[class*="dish"],[class*="plato"],[class*="carta-item"]';
function imageAssetKey(site:SiteBundle,src:string):string|null{
  const raw=src.trim();
  if(!raw||/^(?:[a-z]+:|\/\/|#)/i.test(raw))return null;
  const path=raw.split(/[?#]/)[0].replace(/^\.\//,'');
  const folder=site.entry.includes('/')?site.entry.slice(0,site.entry.lastIndexOf('/')+1):'';
  if(Object.prototype.hasOwnProperty.call(site.assets,folder+path))return folder+path;
  if(Object.prototype.hasOwnProperty.call(site.assets,path))return path;
  return null;
}
function assetReferenced(doc:Document,key:string,entry:string):boolean{
  const folder=entry.includes('/')?entry.slice(0,entry.lastIndexOf('/')+1):'';
  return Array.from(doc.querySelectorAll('[src],[poster]')).some(node=>{
    const src=(node.getAttribute('src')||node.getAttribute('poster')||'').split(/[?#]/)[0].replace(/^\.\//,'');
    return src===key||Boolean(folder&&folder+src===key);
  });
}
/** Resuelve el contenedor correcto para asociar una foto a un plato o a una sección.
 *  Si se selecciona un texto dentro de una fila, la foto se asocia a la fila y no al span del texto. */
export function resolveImageTarget(site:SiteBundle,index:number):ImageTargetInfo|null{
  const doc=new DOMParser().parseFromString(site.html,'text/html');
  const nodes=editableHtmlNodes(doc);
  const selected=nodes[index];
  if(!selected)return null;
  let item=selected.closest<HTMLElement>(MENU_ITEM_SELECTOR);
  // Los <li> de navegación no son platos ni productos.
  if(item&&item.closest('nav,header'))item=null;
  const isSectionNode=selected.matches('[data-wc-section],section,main,header,footer');
  const isSectionHeading=/^H[1-2]$/.test(selected.tagName);
  const section=selected.closest<HTMLElement>('[data-wc-section],section,main,article');
  const compactRow=(node:HTMLElement|null):node is HTMLElement=>{
    if(!node||node.tagName!=='DIV'||node.closest('nav,header')||node.matches('[data-wc-section]'))return false;
    const text=(node.textContent||'').replace(/\s+/g,' ').trim();
    return text.length>0&&text.length<=260&&node.children.length>0&&node.children.length<=8&&
      !node.querySelector('section,article,ul,ol,table,form,header,footer,nav');
  };
  // Un encabezado de sección debe asociarse a su sección, no al div que solo contiene el título.
  if(!item&&!isSectionNode&&!isSectionHeading){
    let parent=selected.parentElement as HTMLElement|null;
    while(parent&&parent!==doc.body&&parent.tagName!=='DIV')parent=parent.parentElement as HTMLElement|null;
    if(compactRow(parent))item=parent;
    else if(compactRow(selected))item=selected;
  }
  let target:HTMLElement;
  let kind:ImageTargetKind;
  if(item){
    target=item;kind='item';
  }else if(section&&(selected===section||isSectionNode||isSectionHeading)){
    target=section;kind='section';
  }else{
    target=selected;kind='element';
  }
  const targetIndex=nodes.indexOf(target);
  if(targetIndex<0)return null;
  let image:HTMLElement|null=selected.tagName==='IMG'?selected:null;
  if(!image&&target.tagName==='IMG')image=target;
  if(!image)image=target.querySelector<HTMLElement>('img[data-wayup-photo],img[alt="Imagen"][src^="wayup-media/"]');
  const imagePath=image?.getAttribute('src')||'';
  const imageAlt=image?.getAttribute('alt')||'';
  const imageIndex=image?nodes.indexOf(image):-1;
  const managedImage=Boolean(image&&(image.hasAttribute('data-wayup-photo')||
    (/^wayup-media\//.test(imagePath)&&imageAlt==='Imagen')));
  const heading=target.querySelector<HTMLElement>('h1,h2,h3,h4,h5,h6');
  const rawLabel=target.getAttribute('data-wc-name')||target.getAttribute('aria-label')||
    (kind==='section'?(heading?.textContent||target.id):target.textContent)||target.id||target.tagName;
  const label=(rawLabel||target.tagName).replace(/\s+/g,' ').trim().slice(0,72)||target.tagName.toLowerCase();
  return {index:targetIndex,kind,tag:target.tagName,label,imageIndex:imageIndex>=0?imageIndex:null,
    imagePath,imageAlt,assetKey:imageAssetKey(site,imagePath),hasImage:Boolean(image),managedImage};
}
export function attachLocalImage(site:SiteBundle,index:number,data:Uint8Array):SiteBundle{
  const kind=detectSafeImage(data);
  if(!kind)throw Error('Imagen no admitida: utiliza PNG, JPEG, GIF o WebP de hasta 5 MB.');
  const info=resolveImageTarget(site,index);
  if(!info)throw Error('Selecciona un elemento de la web.');
  const doc=new DOMParser().parseFromString(site.html,'text/html');
  const nodes=editableHtmlNodes(doc);
  const target=nodes[info.index];
  if(!target)throw Error('El elemento seleccionado ya no existe.');
  const existing=info.imageIndex===null?null:nodes[info.imageIndex];
  const image=(existing?.tagName==='IMG'?existing:doc.createElement('img')) as HTMLImageElement;
  const file='wayup-media/'+crypto.randomUUID()+'.'+kind.ext;
  if(!safePath(file))throw Error('Ruta de recurso inválida.');
  const logo=['A','HEADER','NAV'].includes(target.tagName)||!!target.closest('header,nav');
  image.setAttribute('src',file);
  image.setAttribute('data-wayup-photo','true');
  image.setAttribute('data-wayup-photo-kind',info.kind);
  image.setAttribute('alt','Fotografía de '+info.label);
  image.setAttribute('loading','lazy');
  if(!existing){
    if(logo){
      image.style.cssText='display:inline-block;height:44px;width:auto;max-width:220px;vertical-align:middle;object-fit:contain;margin-right:10px';
    }else if(info.kind==='item'){
      image.style.cssText='display:inline-block;flex:0 0 88px;width:88px;height:64px;max-width:28%;object-fit:cover;vertical-align:middle;margin:0 12px 8px 0;border-radius:8px';
    }else if(info.kind==='section'){
      image.style.cssText='display:block;width:100%;max-width:100%;max-height:280px;height:auto;object-fit:cover;margin:0 0 20px;border-radius:10px';
    }else{
      image.style.cssText='display:block;width:100%;max-width:100%;max-height:240px;height:auto;object-fit:cover;margin:0 0 16px;border-radius:8px';
    }
    const placeholder=target.tagName==='FIGURE'?target.querySelector(':scope > div'):null;
    if(placeholder&&!placeholder.querySelector('img'))placeholder.replaceWith(image);
    else if(info.kind==='section'){
      const heading=Array.from(target.children).find(child=>/^H[1-6]$/.test(child.tagName));
      if(heading)heading.after(image);else target.prepend(image);
    }else target.prepend(image);
  }
  const html=serializeEditedHtml(doc);
  const assetPath=(site.entry.includes('/')?site.entry.slice(0,site.entry.lastIndexOf('/')+1):'')+file;
  const assets={...site.assets,[assetPath]:new Uint8Array(data)};
  if(info.assetKey&&info.assetKey!==assetPath&&!assetReferenced(doc,info.assetKey,site.entry))delete assets[info.assetKey];
  return {...site,html,assets,updatedAt:Date.now()};
}
export function removeLocalImage(site:SiteBundle,index:number):SiteBundle{
  const info=resolveImageTarget(site,index);
  if(!info||info.imageIndex===null||!info.managedImage)throw Error('Este elemento no tiene una fotografía añadida desde el editor.');
  const doc=new DOMParser().parseFromString(site.html,'text/html');
  const image=editableHtmlNodes(doc)[info.imageIndex];
  if(!image||image.tagName!=='IMG')throw Error('La fotografía ya no existe.');
  image.remove();
  const assets={...site.assets};
  if(info.assetKey&&!assetReferenced(doc,info.assetKey,site.entry))delete assets[info.assetKey];
  return {...site,html:serializeEditedHtml(doc),assets,updatedAt:Date.now()};
}
function serializeEditedHtml(doc:Document):string{
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}
export type HtmlStructureAction='duplicate'|'remove'|'up'|'down';
export function editHtmlStructure(html:string,index:number,action:HtmlStructureAction):string{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const node=selectableHtmlNode(doc,index);
  if(!node||!node.parentElement||node===doc.body||node===doc.documentElement)throw Error('Elemento no editable.');
  if(action==='remove'){
    node.remove();
  }else if(action==='duplicate'){
    if(node.querySelector('script,iframe,object,embed'))throw Error('Este bloque contiene código activo: revísalo en HTML antes de duplicarlo.');
    const copy=node.cloneNode(true) as HTMLElement;
    const suffix='-copia-'+crypto.randomUUID().slice(0,8);
    const ids=new Map<string,string>();
    for(const item of [copy,...Array.from(copy.querySelectorAll<HTMLElement>('[id]'))]){
      if(item.id){const previous=item.id;item.id=previous+suffix;ids.set(previous,item.id);}
    }
    for(const anchor of Array.from(copy.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))){
      const target=anchor.getAttribute('href')?.slice(1)||'';
      if(ids.has(target))anchor.setAttribute('href','#'+ids.get(target));
    }
    node.after(copy);
  }else{
    const sibling=action==='up'?node.previousElementSibling:node.nextElementSibling;
    if(!sibling)throw Error('El elemento ya está en el extremo de su contenedor.');
    if(action==='up')sibling.before(node);else sibling.after(node);
  }
  return serializeEditedHtml(doc);
}
export function addHtmlSection(html:string):string{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const main=doc.querySelector('main')||doc.body;
  const section=doc.createElement('section');
  const id='seccion-'+crypto.randomUUID().slice(0,8);
  section.id=id;
  section.dataset.wcSection=id;
  section.style.cssText='padding:64px 6%;max-width:1200px;margin:0 auto';
  const title=doc.createElement('h2');title.textContent='Nueva sección';
  const text=doc.createElement('p');text.textContent='Edita este contenido desde el inspector visual.';
  section.append(title,text);main.append(section);
  return serializeEditedHtml(doc);
}
function cssSize(value:string,maximum=3000,percentage=false):string{
  const text=value.trim();
  if(!text||text==='auto')return text;
  const px=text.match(/^(\d{1,4}(?:\.\d{1,2})?)px$/);
  if(px&&Number(px[1])<=maximum)return text;
  const percent=percentage?text.match(/^(\d{1,3}(?:\.\d{1,2})?)%$/):null;
  if(percent&&Number(percent[1])<=100)return text;
  throw Error('Medida CSS no válida. Utiliza px, porcentaje permitido o auto.');
}
export function patchSelectedElement(html:string,index:number,changes:{
  text?:string;color?:string;background?:string;fontSize?:string;href?:string;src?:string;alt?:string;
  width?:string;height?:string;padding?:string;margin?:string;radius?:string;
  fontWeight?:string;fontFamily?:string;textAlign?:string;moveX?:number;moveY?:number
}):string{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const node=selectableHtmlNode(doc,index);
  if(!node)throw Error('El elemento seleccionado ya no existe.');
  if(changes.text!==undefined){
    if(node.children.length>0)throw Error('Para editar un bloque con elementos internos, selecciona el texto concreto.');
    node.textContent=changes.text.slice(0,5000);
  }
  if(changes.color!==undefined)node.style.color=changes.color;
  if(changes.background!==undefined)node.style.backgroundColor=changes.background;
  if(changes.fontSize!==undefined)node.style.fontSize=cssSize(changes.fontSize,256);
  if(changes.width!==undefined)node.style.width=cssSize(changes.width,3000,true);
  if(changes.height!==undefined)node.style.height=cssSize(changes.height,3000,true);
  if(changes.padding!==undefined)node.style.padding=cssSize(changes.padding,320);
  if(changes.margin!==undefined)node.style.margin=cssSize(changes.margin,320);
  if(changes.radius!==undefined)node.style.borderRadius=cssSize(changes.radius,1000);
  if(changes.fontWeight!==undefined){
    if(changes.fontWeight!==''&&!/^[1-9]00$/.test(changes.fontWeight))throw Error('Peso de tipografía no permitido.');
    node.style.fontWeight=changes.fontWeight;
  }
  if(changes.fontFamily!==undefined){
    if(changes.fontFamily.length>110||!/^[\w\s,\-'"]*$/u.test(changes.fontFamily))
      throw Error('Fuente no permitida.');
    node.style.fontFamily=changes.fontFamily;
  }
  if(changes.textAlign!==undefined){
    if(!['','left','center','right','justify','start','end'].includes(changes.textAlign))
      throw Error('Alineación no permitida.');
    node.style.textAlign=changes.textAlign;
  }
  if(changes.moveX!==undefined||changes.moveY!==undefined){
    const x=changes.moveX??0,y=changes.moveY??0;
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>6000||Math.abs(y)>6000)
      throw Error('El desplazamiento debe estar entre -6000 y 6000 píxeles.');
    node.style.translate=Math.round(x)+'px '+Math.round(y)+'px';
  }
  if(changes.href!==undefined){
    if(node.tagName!=='A')throw Error('Este elemento no es un enlace.');
    if(!safeSiteLink(changes.href))throw Error('Enlace no permitido: utiliza HTTPS, un ancla o una ruta local.');
    node.setAttribute('href',changes.href.trim());
  }
  if(changes.src!==undefined){
    if(node.tagName!=='IMG'||!safePath(changes.src)||!/^wayup-media\/[\w-]+\.(png|jpg|webp|gif)$/i.test(changes.src))
      throw Error('Ruta de imagen no autorizada.');
    node.setAttribute('src',changes.src);
    node.removeAttribute('srcset');
  }
  if(changes.alt!==undefined){
    if(node.tagName!=='IMG')throw Error('Este elemento no es una imagen.');
    node.setAttribute('alt',changes.alt.slice(0,250));
  }
  return serializeEditedHtml(doc);
}
