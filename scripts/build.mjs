import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const base=read('public/index.html');
const css=read('public/studio.css');
const theme=read('public/studio-theme.css');
const compact=read('public/compact-shell.css');
const precisionDark=read('public/precision-dark.css');
const vibrant=read('public/wayup-vibrant.css');
const urbanType=read('public/wayup-urban-type.css');
const officialCss=read('public/wayup-official-brand.css');
const originalLogoBase64=read('public/official-wayup-logo-cobalt.base64.txt').trim();
const themeToggle=read('public/theme-toggle.js');
const commandPalette=read('public/command-palette.js');
const studioClient=read('public/studio.js');
const mediaClient=read('public/studio-media.js');
const mediaCss=read('public/studio-media.css');
const studioPro=read('public/studio-pro.css');
const fontLibraryCss=read('public/studio-font-library.css');
const windowsFontExporter=read('scripts/export-windows-fonts.ps1');
const fontLibraryJs=read('public/studio-font-library.js').replace("'__WAYUP_WINDOWS_FONT_EXPORTER__'",JSON.stringify(windowsFontExporter));
const mediaServer=read('src/studio-media.js');
const studioServer=read('src/studio.js');
const worker=read('src/worker.js');
if(!worker.includes('__WEBCREATOR_HTML__')||!worker.includes('/*__WEBCREATOR_STUDIO_SERVER__*/'))
  throw new Error('Faltan puntos de inserción de Studio');
if(!base.includes('id="downloadZip"')||!base.includes('id="preview"'))
  throw new Error('Faltan controles del constructor original');
const html=base.replace('__WAYUP_OFFICIAL_LOGO__','data:image/png;base64,'+originalLogoBase64).replace('</head>','<style>\n'+css+'\n'+theme+'\n'+compact+'\n'+precisionDark+'\n'+vibrant+'\n'+urbanType+'\n'+officialCss+'\n'+mediaCss+'\n'+studioPro+'\n'+fontLibraryCss+'\n</style></head>')
  .replace('</body>','<script>\n'+studioClient+'\n</script><script>\n'+fontLibraryJs+'\n</script><script>\n'+commandPalette+'\n</script><script>\n'+themeToggle+'\n</script><script>\n'+mediaClient+'\n</script></body>');
const built=worker.replace('/*__WEBCREATOR_STUDIO_SERVER__*/',studioServer+'\n'+mediaServer)
  .replace('__WEBCREATOR_HTML__',JSON.stringify(html));
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/worker.js',import.meta.url),built);
console.log('Built WebCreator Studio + original Multi-IA generator');
