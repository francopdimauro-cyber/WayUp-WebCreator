import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const smartToolsJs=read('public/studio-smart-tools.js');
const smartToolsCss=read('public/studio-smart-tools.css');
const buttonLibraryCss=read('public/studio-button-library.css');
const buttonLibraryJs=read('public/studio-button-library.js');
const canvasMotionJs=read('public/studio-canvas-motion.js');
const canvasMotionCss=read('public/studio-canvas-motion.css');
const integratedPremiumCss=read('public/studio-premium-integrated.css');
const unifiedAppearanceJs=read('public/studio-unified-appearance.js');
const mediaServer=read('src/studio-media.js');
const studioServer=read('src/studio.js');
const worker=read('src/worker.js');
const nextRoute=read('src/studio-next-route.js');
const nextNavigation=read('public/studio-next-navigation.js');
const nextAssets={};
const nextRoot=new URL('../studio-next/.next/',import.meta.url);
const nextHtml=new URL('server/app/index.html',nextRoot);
if(existsSync(nextHtml)){
  const html=readFileSync(nextHtml);
  nextAssets['/']=[html.toString('base64'),'text/html; charset=utf-8'];
  const staticFolder=new URL('static/',nextRoot);
  if(existsSync(staticFolder)){
    const root=fileURLToPath(staticFolder);
    function walk(dir){
      for(const item of readdirSync(dir,{withFileTypes:true})){
        const absolute=join(dir,item.name);
        if(item.isDirectory())walk(absolute);
        else if(item.isFile()){
          const relativeName=relative(root,absolute).split('\\').join('/');
          const path='/_next/static/'+relativeName;
          const ext=relativeName.split('.').pop().toLowerCase();
          const mime=({js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',
            svg:'image/svg+xml',woff2:'font/woff2',woff:'font/woff',
            png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
            ico:'image/x-icon',json:'application/json; charset=utf-8'})[ext]||'application/octet-stream';
          nextAssets[path]=[readFileSync(absolute).toString('base64'),mime];
        }
      }
    }
    walk(root);
  }
  const htmlBody=html.toString('utf8'),references=[...htmlBody.matchAll(/\/_next\/static\/[a-zA-Z0-9._/-]+/g)].map(m=>m[0]);
  for(const path of references)if(!Object.hasOwn(nextAssets,path))throw Error('Falta un recurso de Studio Next: '+path);
}
if(process.env.STUDIO_NEXT_BUNDLE_REQUIRED==='1'&&!nextAssets['/'])
  throw Error('El build integrado requiere compilar primero studio-next con Next.js');
if(!nextRoute.includes('__WEBCREATOR_NEXT_ASSETS__')||!worker.includes('/*__WEBCREATOR_STUDIO_NEXT__*/'))
  throw Error('Falta el punto de inserción de Studio Next');
const packedNext=nextRoute.replace('__WEBCREATOR_NEXT_ASSETS__',JSON.stringify(nextAssets))
  .replace('__WEBCREATOR_NEXT_NAV__',JSON.stringify(nextNavigation));
if(!worker.includes('__WEBCREATOR_HTML__')||!worker.includes('/*__WEBCREATOR_STUDIO_SERVER__*/'))
  throw new Error('Faltan puntos de inserción de Studio');
if(!base.includes('id="downloadZip"')||!base.includes('id="preview"'))
  throw new Error('Faltan controles del constructor original');
const html=base.replace('__WAYUP_OFFICIAL_LOGO__','data:image/png;base64,'+originalLogoBase64).replace('</head>','<style>\n'+css+'\n'+theme+'\n'+compact+'\n'+precisionDark+'\n'+vibrant+'\n'+urbanType+'\n'+officialCss+'\n'+mediaCss+'\n'+studioPro+'\n'+fontLibraryCss+'\n'+smartToolsCss+'\n'+buttonLibraryCss+'\n'+canvasMotionCss+'\n'+integratedPremiumCss+'\n</style></head>')
  .replace('</body>','<script>\n'+studioClient+'\n</script><script>\n'+fontLibraryJs+'\n</script><script>\n'+smartToolsJs+'\n</script><script>\n'+buttonLibraryJs+'\n</script><script>\n'+canvasMotionJs+'\n</script><script>\n'+commandPalette+'\n</script><script>\n'+themeToggle+'\n</script><script>\n'+unifiedAppearanceJs+'\n</script><script>\n'+mediaClient+'\n</script></body>');
const built=worker.replace('/*__WEBCREATOR_STUDIO_SERVER__*/',studioServer+'\n'+mediaServer)
  .replace('/*__WEBCREATOR_STUDIO_NEXT__*/',packedNext)
  .replace('__WEBCREATOR_HTML__',JSON.stringify(html));
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/worker.js',import.meta.url),built);
console.log('Built WebCreator Studio + original Multi-IA generator + Studio Next ('+Object.keys(nextAssets).length+' static files)');
