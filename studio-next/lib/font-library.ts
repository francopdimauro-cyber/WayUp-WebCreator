/* Fontsource es la misma biblioteca abierta que ya utilizaba WebCreator.
   React Studio Next comparte catálogo, sin inventar familias ni permisos locales. */
export type FontSource = 'google' | 'open' | 'local' | 'system';
export type FontEntry = {
  name: string;
  source: FontSource;
  id?: string;
  category?: string;
  weights?: number[];
};

export const FONT_SOURCE_API = 'https://api.fontsource.org/v1/fonts';
export const WINDOWS_FONT_EXPORT_SCRIPT = "# WAYUP Studio - export installed Windows font family names only.\n# Compatible with Windows PowerShell 5.1+. No admin rights, font binaries, or secrets.\n$ErrorActionPreference = 'Stop'\ntry {\n    Add-Type -AssemblyName System.Drawing\n    $catalogue = New-Object System.Drawing.Text.InstalledFontCollection\n    $families = @($catalogue.Families | ForEach-Object { $_.Name } | Where-Object { $_ } | Sort-Object -Unique)\n    if ($families.Count -eq 0) { throw 'No font families found.' }\n    $output = [ordered]@{\n        format = 'wayup-local-fonts-v1'\n        generatedBy = 'WAYUP Studio local font exporter'\n        families = $families\n    }\n    $desktop = [Environment]::GetFolderPath('Desktop')\n    if ([string]::IsNullOrWhiteSpace($desktop)) {\n        $desktop = [Environment]::GetFolderPath('MyDocuments')\n    }\n    $path = Join-Path $desktop 'wayup-fuentes-windows.json'\n    $output | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $path -Encoding UTF8\n    Write-Host ('Exported {0} font families to: {1}' -f $families.Count, $path)\n    Write-Host 'Only font NAMES were exported. No font binaries or private files.'\n} catch {\n    Write-Error ('Could not export fonts: ' + $_.Exception.Message)\n    exit 1\n}\n";
export const INITIAL_OPEN_FAMILIES: readonly string[] = [
 "Inter",
 "Roboto",
 "Open Sans",
 "Lato",
 "Montserrat",
 "Poppins",
 "Nunito",
 "Nunito Sans",
 "Raleway",
 "Ubuntu",
 "Work Sans",
 "DM Sans",
 "Manrope",
 "Space Grotesk",
 "Outfit",
 "Sora",
 "Archivo",
 "Oswald",
 "Anton",
 "Bricolage Grotesque",
 "Plus Jakarta Sans",
 "Libre Baskerville",
 "Merriweather",
 "Playfair Display",
 "Cormorant Garamond",
 "Lora",
 "EB Garamond",
 "Source Serif 4",
 "Roboto Slab",
 "Bitter",
 "Bodoni Moda",
 "DM Serif Display",
 "Fraunces",
 "Prata",
 "Cinzel",
 "Abril Fatface",
 "Cormorant",
 "Noto Serif",
 "Noto Sans",
 "Noto Sans Display",
 "Noto Sans Mono",
 "Roboto Mono",
 "Fira Code",
 "JetBrains Mono",
 "IBM Plex Mono",
 "Space Mono",
 "Inconsolata",
 "Ubuntu Mono",
 "PT Mono",
 "Source Code Pro",
 "Syne",
 "Urbanist",
 "Barlow",
 "Barlow Condensed",
 "Barlow Semi Condensed",
 "Rubik",
 "Karla",
 "Mulish",
 "Josefin Sans",
 "Exo 2",
 "Kanit",
 "Cabin",
 "Quicksand",
 "Public Sans",
 "Lexend",
 "Figtree",
 "Red Hat Display",
 "Red Hat Text",
 "Arimo",
 "Heebo",
 "Hind",
 "Asap",
 "Signika",
 "Assistant",
 "Titillium Web",
 "Alegreya Sans",
 "Alegreya",
 "PT Sans",
 "PT Serif",
 "Vollkorn",
 "Spectral",
 "Crimson Pro",
 "Arvo",
 "Rokkitt",
 "Tinos",
 "Teko",
 "Bebas Neue",
 "Rajdhani",
 "Archivo Black",
 "Archivo Narrow",
 "Chivo",
 "Chivo Mono",
 "Fjalla One",
 "Alfa Slab One",
 "Righteous",
 "Permanent Marker",
 "Pacifico",
 "Caveat",
 "Dancing Script",
 "Great Vibes",
 "Sacramento",
 "Parisienne",
 "Lobster",
 "Satisfy",
 "Indie Flower",
 "Shadows Into Light",
 "Amatic SC",
 "Kalam",
 "Comfortaa",
 "Poiret One",
 "Italiana",
 "Tenor Sans",
 "Jost",
 "Questrial",
 "Varela Round",
 "Yanone Kaffeesatz",
 "Noto Sans Arabic",
 "Noto Sans JP",
 "Noto Sans KR",
 "Noto Sans SC",
 "Montserrat Alternates"
];
export const BUILTIN_SYSTEM_FAMILIES: readonly string[] = [
 "system-ui",
 "Georgia",
 "Arial",
 "Verdana",
 "Tahoma",
 "Trebuchet MS",
 "Times New Roman",
 "Courier New",
 "Segoe UI",
 "Helvetica",
 "Consolas",
 "Impact",
 "Comic Sans MS",
 "Palatino Linotype",
 "Garamond",
 "Cambria",
 "Calibri",
 "Candara",
 "Century Gothic",
 "Franklin Gothic Medium"
];

export const fontIdFromName = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export const isSafeFontName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 95
  && !/["'<>\\;{}\r\n\t]/.test(value);

export const makeFontStack = (name: string): string =>
  isSafeFontName(name) ? JSON.stringify(name.trim()) + ', sans-serif' : 'system-ui, sans-serif';

export const fontNameFromStack = (value: string): string => {
  const first = String(value||'').trim().split(',')[0].trim().replace(/^['"]|['"]$/g,'');
  return isSafeFontName(first) ? first : 'Arial';
};
export const normalizeFontSearch = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');

export const baseFontEntries = (): FontEntry[] => {
  const entries = new Map<string, FontEntry>();
  for(const name of INITIAL_OPEN_FAMILIES) entries.set(normalizeFontSearch(name),{name,source:'google',id:fontIdFromName(name)});
  for(const name of BUILTIN_SYSTEM_FAMILIES)entries.set(normalizeFontSearch(name),{name,source:'system'});
  return [...entries.values()];
};

/** Solo el catálogo oficial determina qué familias abiertas existen; filtrar también icon fonts. */
export function parseFontsourceCatalog(payload: unknown): FontEntry[] {
  if(!Array.isArray(payload))throw new Error('El catálogo de fuentes no tiene un formato válido.');
  const result = new Map<string, FontEntry>();
  for(const item of payload.slice(0,8000)){
    if(!item || typeof item!=='object')continue;
    const font=item as Record<string,unknown>;
    if(font.type!=='google'&&font.type!=='other')continue;
    if(!isSafeFontName(font.family)||typeof font.id!=='string'||!/^[a-z0-9-]+$/.test(font.id))continue;
    const name=font.family.trim();
    const weights=Array.isArray(font.weights)?font.weights.filter((x):x is number=>Number.isInteger(x)&&Number(x)>=100&&Number(x)<=900):undefined;
    result.set(normalizeFontSearch(name),{
      name,source:font.type==='google'?'google':'open',id:font.id,
      category:typeof font.category==='string'?font.category.slice(0,40):'',
      weights
    });
  }
  return [...result.values()];
}

export function mergeFontEntries(...sets: FontEntry[][]): FontEntry[]{
  const merged=new Map<string,FontEntry>();
  for(const item of sets.flat()){
    if(!isSafeFontName(item.name))continue;
    const key=normalizeFontSearch(item.name);
    const old=merged.get(key);
    // Nunca reemplazar una fuente local seleccionada por una entrada de red.
    if(old?.source==='local' && (item.source==='google'||item.source==='open'))continue;
    merged.set(key,item);
  }
  return [...merged.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
}

export function fontStylesheetUrl(font: FontEntry): string | null {
  if(font.source!=='google'&&font.source!=='open')return null;
  const id=font.id||fontIdFromName(font.name);
  if(!/^[a-z0-9-]+$/.test(id))return null;
  return 'https://cdn.jsdelivr.net/fontsource/css/'+id+'@latest/index.css';
}

/** Solo se inyectan hojas de estilo de Fontsource con id estrictamente validado. */
export function ensureFontStylesheet(font: FontEntry, root: Document=document): boolean {
  const url=fontStylesheetUrl(font);
  if(!url)return false;
  const id='wayup-next-font-'+(font.id||fontIdFromName(font.name));
  if(root.getElementById(id))return true;
  const link=root.createElement('link');
  link.id=id;link.rel='stylesheet';link.href=url;link.crossOrigin='anonymous';
  root.head.append(link);
  return true;
}

export type WindowsFontNames = {format:string;families:string[]};
export function parseWindowsFontList(raw: string): string[] {
  const value=JSON.parse(raw.replace(/^\uFEFF/,''));
  if(!value||value.format!=='wayup-local-fonts-v1'||!Array.isArray(value.families)||value.families.length>7000)
    throw new Error('El archivo no es un listado de WAYUP compatible.');
  const names:unknown[]=value.families;
  const valid:string[]=names.filter(isSafeFontName).map(name=>name.trim());
  return [...new Set<string>(valid)].slice(0,7000);
}
