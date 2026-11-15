/** Fontsource catalog + browser/device fonts. No server-side enumeration. */
export type FontOrigin = 'google' | 'open' | 'system' | 'local' | 'uploaded';
export type FontEntry = { family: string; source: FontOrigin; id?: string; category?: string; weights?: number[] };

export const FONT_CATALOG_API = 'https://api.fontsource.org/v1/fonts';
export const FONT_NAMES_KEY = 'wayup-studio-next-local-font-names-v1';
export const FONT_REMEMBER_KEY = 'wayup-studio-next-remember-font-names-v1';
export const FONT_SOURCE_LABELS: Record<FontOrigin,string> = {
  google:'Google Fonts',open:'Open Fonts',system:'Sistema',
  local:'Mi ordenador',uploaded:'Importada'
};
const DEFAULT_WEB_FONTS = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Nunito Sans',
  'Raleway','Ubuntu','Work Sans','DM Sans','Manrope','Space Grotesk','Outfit','Sora',
  'Archivo','Oswald','Anton','Bricolage Grotesque','Plus Jakarta Sans','Libre Baskerville',
  'Merriweather','Playfair Display','Cormorant Garamond','Lora','EB Garamond',
  'Source Serif 4','Roboto Slab','Bitter','Bodoni Moda','DM Serif Display','Fraunces',
  'Prata','Cinzel','Abril Fatface','Cormorant','Noto Serif','Noto Sans','Noto Sans Display',
  'Noto Sans Mono','Roboto Mono','Fira Code','JetBrains Mono','IBM Plex Mono',
  'Space Mono','Inconsolata','Ubuntu Mono','PT Mono','Source Code Pro','Syne',
  'Urbanist','Barlow','Barlow Condensed','Barlow Semi Condensed','Rubik','Karla',
  'Mulish','Josefin Sans','Exo 2','Kanit','Cabin','Quicksand','Public Sans','Lexend',
  'Figtree','Red Hat Display','Red Hat Text','Arimo','Heebo','Hind','Asap','Signika',
  'Assistant','Titillium Web','Alegreya Sans','Alegreya','PT Sans','PT Serif',
  'Vollkorn','Spectral','Crimson Pro','Arvo','Rokkitt','Tinos','Teko','Bebas Neue',
  'Rajdhani','Archivo Black','Archivo Narrow','Chivo','Chivo Mono','Fjalla One',
  'Alfa Slab One','Righteous','Permanent Marker','Pacifico','Caveat','Dancing Script',
  'Great Vibes','Sacramento','Parisienne','Lobster','Satisfy','Indie Flower',
  'Shadows Into Light','Amatic SC','Kalam','Comfortaa','Poiret One','Italiana',
  'Tenor Sans','Jost','Questrial','Varela Round','Yanone Kaffeesatz','Noto Sans Arabic',
  'Noto Sans JP','Noto Sans KR','Noto Sans SC','Montserrat Alternates'
];
const BUILTIN = [
  'system-ui','Arial','Verdana','Tahoma','Trebuchet MS','Times New Roman','Georgia',
  'Courier New','Segoe UI','Helvetica','Consolas','Impact','Comic Sans MS',
  'Palatino Linotype','Garamond','Cambria','Calibri','Candara','Century Gothic',
  'Franklin Gothic Medium'
];
export function validFamily(family:unknown): family is string {
  return typeof family==='string' && family.length>0 && family.length<=95 &&
    family.trim()===family && !/["'<>\\\r\n;{}]/.test(family);
}
export const fontSlug = (s:string) => s.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const fontLookup = (s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export const familyFromCSS = (s:string) => s.split(',')[0]?.trim().replace(/^["']|["']$/g,'') || s;
export function cssFamily(name:string) {
  if (!validFamily(name))return 'Arial, sans-serif';
  return name==='system-ui'?'system-ui': '"' + name + '", '+
    (/^(Georgia|Times New Roman|Garamond|Cambria|Palatino Linotype)$/i.test(name)?'serif':'sans-serif');
}
export const initialFonts:FontEntry[]=[
  ...BUILTIN.map(family=>({family,source:'system' as const})),
  ...DEFAULT_WEB_FONTS.map(family=>({family,source:'google' as const,id:fontSlug(family)}))
];
export function mergeFonts(...groups:FontEntry[][]):FontEntry[] {
  const map = new Map<string,FontEntry>();
  const priority:Record<FontOrigin,number>={google:1,open:1,system:2,local:3,uploaded:4};
  for(const group of groups)for(const item of group){
    if(!validFamily(item.family))continue;
    const key=fontLookup(item.family),previous=map.get(key);
    if(!previous||priority[item.source]>=priority[previous.source])map.set(key,item);
  }
  return [...map.values()].sort((a,b)=>a.family.localeCompare(b.family,'es',{sensitivity:'base'}));
}
type FontsourceRecord = { id?:unknown;family?:unknown;type?:unknown;category?:unknown;weights?:unknown };
export function parseFontsource(data:unknown):FontEntry[] {
  if(!Array.isArray(data))throw new Error('El catálogo de fuentes tiene un formato desconocido.');
  return data.flatMap((raw:FontsourceRecord)=>{
    const type=raw?.type,id=raw?.id;
    if((type!=='google'&&type!=='other')||typeof id!=='string'||!/^[a-z0-9-]+$/.test(id)||!validFamily(raw.family))return [];
    return [{
      family:raw.family,source:(type==='google'?'google':'open') as FontOrigin,id,
      category:typeof raw.category==='string'?raw.category:undefined,
      weights:Array.isArray(raw.weights)?raw.weights.filter((w:unknown)=>Number.isInteger(w)&&Number(w)>=100&&Number(w)<=900):[]
    }];
  });
}
export async function loadFontsource(signal?:AbortSignal):Promise<FontEntry[]>{
  const response=await fetch(FONT_CATALOG_API,{cache:'force-cache',mode:'cors',signal});
  if(!response.ok)throw new Error('Catálogo no disponible (HTTP '+response.status+').');
  return parseFontsource(await response.json());
}
export function fontStylesheet(entry:FontEntry):string {
  if(entry.source!=='google'&&entry.source!=='open')return '';
  if(entry.id&&/^[a-z0-9-]+$/.test(entry.id))
    return 'https://cdn.jsdelivr.net/fontsource/css/'+entry.id+'@latest/index.css';
  return entry.source==='google'?'https://fonts.googleapis.com/css2?family='+
    encodeURIComponent(entry.family).replace(/%20/g,'+')+'&display=swap':'';
}
const loadedStylesheets=new Set<string>();
export function ensureFontStylesheet(entry:FontEntry):void {
  if(typeof document==='undefined')return;
  const url=fontStylesheet(entry);
  if(!url||loadedStylesheets.has(url))return;
  loadedStylesheets.add(url);
  const link=document.createElement('link');link.rel='stylesheet';link.href=url;
  link.dataset.wayupFont='true';link.crossOrigin='anonymous';
  link.onerror=()=>{
    if(entry.source!=='google')return;
    const fallback='https://fonts.googleapis.com/css2?family='+encodeURIComponent(entry.family).replace(/%20/g,'+')+'&display=swap';
    if(loadedStylesheets.has(fallback))return;
    loadedStylesheets.add(fallback);
    const alternate=document.createElement('link');
    alternate.rel='stylesheet';alternate.href=fallback;alternate.dataset.wayupFont='true';
    document.head.appendChild(alternate);
  };
  document.head.appendChild(link);
}
export const WAYUP_WINDOWS_FONT_EXPORT = String.raw`$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$collection = New-Object System.Drawing.Text.InstalledFontCollection
$families = @($collection.Families | ForEach-Object { $_.Name } | Sort-Object -Unique)
$payload = @{ format = 'wayup-local-fonts-v1'; families = @($families) }
$json = ConvertTo-Json -InputObject $payload -Depth 4
$desktop = [Environment]::GetFolderPath('Desktop')
[System.IO.File]::WriteAllText((Join-Path $desktop 'wayup-fuentes-windows.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Listado de fuentes guardado en el Escritorio."
`;

/** Restore stylesheet links for fonts already used in a saved local project. */
export function ensureDocumentFont(styleFamily:string):void {
  const family=familyFromCSS(styleFamily);
  if(!validFamily(family))return;
  const present=initialFonts.find(entry=>fontLookup(entry.family)===fontLookup(family));
  if(present){ensureFontStylesheet(present);return}
  try {
    const remembered:unknown=JSON.parse(localStorage.getItem(FONT_NAMES_KEY)||'[]');
    if(Array.isArray(remembered)&&remembered.includes(family))return;
  }catch{/* Browser without local storage. */}
  ensureFontStylesheet({family,source:'google',id:fontSlug(family)});
}
