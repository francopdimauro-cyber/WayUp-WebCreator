/* Navegación de Studio Next integrado. Se ejecuta en /studio-next/, no en WebCreator. */
(function wayupIntegratedNextNavigation(){
 'use strict';
 if(window.__wayupNextNavigation)return;
 window.__wayupNextNavigation=true;
 const make=(tag,txt,className)=>{
  const el=document.createElement(tag);if(txt)el.textContent=txt;if(className)el.className=className;return el;
 };
 function mount(){
  if(document.getElementById('wayup-real-projects-bar'))return;
  const style=make('style');style.textContent=[
  '#wayup-real-projects-bar{position:fixed;z-index:2147483600;bottom:15px;left:15px;display:flex;align-items:center;gap:7px;',
  'padding:8px;background:rgba(17,21,29,.94);border:1px solid rgba(255,255,255,.14);border-radius:13px;',
  'backdrop-filter:blur(18px);box-shadow:0 12px 36px #0008;color:#f6f7fa;font:600 11px/1.3 Inter,system-ui,sans-serif}',
  '#wayup-real-projects-bar a,#wayup-real-projects-bar button{display:inline-flex;align-items:center;gap:6px;text-decoration:none;',
  'border:1px solid rgba(255,255,255,.13);border-radius:8px;padding:9px 11px;background:#222a37;color:#f6f7fa;',
  'font:700 11px/1.3 inherit;cursor:pointer}',
  '#wayup-real-projects-bar button[aria-expanded=true]{background:#384c81}',
  '#wayup-real-projects-bar a:hover,#wayup-real-projects-bar button:hover{background:#354155}',
  '#wayup-real-projects-panel{position:fixed;z-index:2147483601;bottom:76px;left:15px;width:min(355px,calc(100vw - 30px));',
  'max-height:65vh;overflow:auto;padding:14px;background:#141a25;color:#eaf0fd;border:1px solid #ffffff22;',
  'border-radius:13px;box-shadow:0 20px 60px #000a;font:500 12px/1.5 Inter,system-ui,sans-serif}',
  '#wayup-real-projects-panel[hidden]{display:none!important}',
  '#wayup-real-projects-panel h2{font:750 14px/1.4 Inter,system-ui,sans-serif;margin:0 0 5px}',
  '#wayup-real-projects-panel p{color:#a3aec3;margin:0 0 12px;font-size:11px}',
  '#wayup-real-projects-panel a{display:block;padding:11px;border-radius:8px;color:#eef2ff;',
  'border:1px solid #ffffff19;text-decoration:none;margin-bottom:7px;background:#1c2432}',
  '#wayup-real-projects-panel a:hover{border-color:#7496fb;background:#25344e}',
  '#wayup-real-projects-panel small{display:block;color:#9baac0;margin-top:3px}',
  '@media(max-width:650px){#wayup-real-projects-bar{left:8px;bottom:8px;padding:5px}',
  '#wayup-real-projects-bar a,#wayup-real-projects-bar button{padding:8px;font-size:10px}}'
  ].join('');
  document.head.append(style);
  const bar=make('nav');bar.id='wayup-real-projects-bar';
  bar.setAttribute('aria-label','Navegación integrada de WAYUP');
  const home=make('a','← WebCreator');home.href='/?studio=1';
  home.title='Volver al creador con el editor real';
  const projects=make('button','Mis webs reales');projects.type='button';
  projects.setAttribute('aria-expanded','false');projects.setAttribute('aria-controls','wayup-real-projects-panel');
  const panel=make('section');panel.id='wayup-real-projects-panel';panel.hidden=true;panel.setAttribute('aria-label','Proyectos guardados de WebCreator');
  const title=make('h2','Tus proyectos en Cloudflare');
  const summary=make('p','La interfaz Next es una vista de diseño. Para editar y guardar una web real utiliza el editor integrado.');
  const container=make('div');container.id='wayup-real-projects-list';
  panel.append(title,summary,container);bar.append(home,projects);
  document.body.append(bar,panel);
  let loaded=false;
  async function show(){
    const next=panel.hidden;panel.hidden=!next;projects.setAttribute('aria-expanded',String(next));
    if(!next||loaded)return;
    loaded=true;container.textContent='Cargando proyectos…';
    try{
      const response=await fetch('/api/projects',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw Error('No se ha podido leer la biblioteca ('+response.status+').');
      const payload=await response.json(),items=Array.isArray(payload.projects)?payload.projects:[];
      container.replaceChildren();
      if(!items.length){container.textContent='Todavía no tienes webs guardadas.';return}
      for(const project of items){
        const id=String(project.id||'');
        if(!/^[a-f0-9-]{36}$/i.test(id))continue;
        const link=make('a',String(project.name||'Web sin nombre'));
        link.href='/?studioProject='+encodeURIComponent(id);
        const small=make('small','Abrir en el editor completo · Versión '+String(project.version||1));
        link.append(small);container.append(link);
      }
    }catch(error){loaded=false;container.textContent='No se pudieron cargar los proyectos. '+String(error.message||'Inténtalo de nuevo.');}
  }
  projects.addEventListener('click',show);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;projects.setAttribute('aria-expanded','false')}});
 }
 if(document.readyState==='complete')setTimeout(mount,220);
 else window.addEventListener('load',()=>setTimeout(mount,220),{once:true});
})();
