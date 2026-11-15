/* WAYUP Studio — unified professional interface.
   A visual skin only. No project API, Canvas document, font import,
   D1/R2 connection, or generation flow is replaced.
*/
(function wayupUnifiedStudio(){
 'use strict';
 const studio=document.getElementById('wcStudio');
 const actions=studio?.querySelector('.wc-top-actions');
 const anchor=document.getElementById('wcUndo');
 if(!studio||!actions||!anchor||document.getElementById('wcStudioThemeControl'))return;
 const UI_KEY='wc-studio-unified-ui-v1';
 const THEME_KEY='wc-studio-integrated-theme-v2';
 // Tema del editor independiente del generador; oscuro por defecto y reversible.
 const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 let theme=read(THEME_KEY,'dark')==='light'?'light':'dark';
 let layout=read(UI_KEY,'premium')==='legacy'?'legacy':'premium';
 const row=document.createElement('div');row.className='wc-unified-top-actions';
 row.setAttribute('role','group');row.setAttribute('aria-label','Apariencia de WAYUP Studio');
 const themeButton=document.createElement('button'),layoutButton=document.createElement('button');
 themeButton.type='button';themeButton.id='wcStudioThemeControl';
 themeButton.className='wc-toolbar-quiet';
 layoutButton.type='button';layoutButton.id='wcStudioLayoutControl';
 layoutButton.className='wc-toolbar-quiet';
 row.append(themeButton,layoutButton);
 actions.insertBefore(row,anchor);
 const nextLink=document.createElement('a');
 nextLink.id='wcStudioNextIntegrated';
 nextLink.className='wc-toolbar-quiet wc-studio-next-link';
 nextLink.href='/studio-next/';
 nextLink.textContent='✦ Studio Next';
 nextLink.setAttribute('aria-label','Abrir Studio Next integrado dentro de WebCreator');
 nextLink.title='Abrir la nueva vista de diseño en este mismo WebCreator';
 actions.insertBefore(nextLink,anchor);
 const homepageHeader=document.querySelector('.wrap>header');
 if(homepageHeader&&!document.getElementById('wcStudioNextHome')){
   const homeLink=document.createElement('a');homeLink.href='/studio-next/';
   homeLink.id='wcStudioNextHome';homeLink.className='wc-open-btn wc-studio-next-home';
   homeLink.textContent='✦ Studio Next';homeLink.title='Abrir el Studio Next de este WebCreator';
   const command=document.getElementById('cmdOpen');
   homepageHeader.insertBefore(homeLink,command||null);
 }
 function paint(){
   studio.dataset.wcUi=layout;
   studio.dataset.wcMode=theme;
   const nextTheme=theme==='dark'?'claro':'oscuro';
   themeButton.textContent=theme==='dark'?'☀ Claro':'☾ Oscuro';
   themeButton.setAttribute('aria-label','Activar modo '+nextTheme+' en WAYUP Studio');
   themeButton.title='Cambiar al modo '+nextTheme;
   themeButton.setAttribute('aria-pressed',String(theme==='dark'));
   layoutButton.textContent=layout==='premium'?'◫ Diseño clásico':'✦ Diseño profesional';
   layoutButton.setAttribute('aria-label',layout==='premium'?'Cambiar al diseño clásico del editor':'Activar diseño profesional del editor');
   layoutButton.setAttribute('aria-pressed',String(layout==='premium'));
   layoutButton.title=layout==='premium'?'Volver a la interfaz anterior sin perder cambios':'Activar interfaz profesional conservando proyectos y fuentes';
 }
 themeButton.addEventListener('click',()=>{
   theme=theme==='dark'?'light':'dark';
   write(THEME_KEY,theme);
   paint();
 });
 layoutButton.addEventListener('click',()=>{
   layout=layout==='premium'?'legacy':'premium';write(UI_KEY,layout);paint();
 });
 const close=document.getElementById('wcClose');
 if(close){close.setAttribute('title','Volver a WebCreator');close.setAttribute('aria-label','Cerrar Studio y volver a WebCreator')}
 const label=studio.querySelector('.wc-identity-sub');
 if(label)label.textContent='EDITOR INTEGRADO / WEBCREATOR';
 paint();
 const params=new URL(location.href).searchParams;
 const projectId=params.get('studioProject');
 if(projectId&&/^[a-f0-9-]{36}$/i.test(projectId)){
   Promise.resolve(window.WebCreatorStudio?.open(projectId)).then(()=>{
     history.replaceState(null,'',location.pathname);
   }).catch(()=>{});
 }else if(params.get('studio')==='1'){
   // Los antiguos enlaces guardados van directamente al Studio Next.
   location.replace('/studio-next/');
 }
})();
