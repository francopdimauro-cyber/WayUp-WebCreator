'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {Bot,CheckCircle2,LoaderCircle,MessageCircle,Pause,Play,RefreshCw,Trash2,Users,X} from 'lucide-react';

// Gestor nativo de agentes de Studio: usa la API privada /studio-api/agents con la sesión de Cloudflare Access.
// Sustituye al antiguo script inyectado (#wayup-own-agent-open), sin segundo inicio de sesión.
const ROOT='/studio-api/agents';
type Agent={id:string;name:string;status:'draft'|'active'|'paused';updated_at?:string};
type Chat={id:string;agentId:string;enabled:boolean;allowedOrigins?:string[]};
type Lead={id:string;name:string;email:string;message:string;created_at:string};

async function api(method:string,path:string,body?:unknown):Promise<any>{
 const r=await fetch(ROOT+path,{method,credentials:'same-origin',cache:'no-store',
  headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(typeof data.error==='string'?data.error:r.status===401||r.status===403?
  'Tu sesión por correo no está activa. Recarga la página para volver a entrar con Cloudflare Access.':'Error del servidor ('+r.status+').');
 return data;
}
const STATUS={draft:'Borrador',active:'Activo',paused:'En pausa'} as const;
const btn='inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg border border-stroke bg-elevated px-3 text-[11px] font-semibold text-ink hover:border-brand/40 disabled:opacity-40';
const primary='inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg bg-brand px-3 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-40';

export function AgentLibrary({onClose,onCreateForWeb}:{onClose():void;onCreateForWeb():void}){
 const [email,setEmail]=useState('');
 const [state,setState]=useState('Comprobando tu sesión por correo…');
 const [agents,setAgents]=useState<Agent[]>([]);
 const [chats,setChats]=useState<Chat[]>([]);
 const [selected,setSelected]=useState('');
 const [busy,setBusy]=useState(false);
 const [question,setQuestion]=useState('¿Qué servicios ofrecéis y cómo puedo contactar?');
 const [result,setResult]=useState('');
 const [leads,setLeads]=useState<Lead[]|null>(null);
 const closeRef=useRef<HTMLButtonElement>(null);

 const refresh=useCallback(async()=>{
  setState(s=>s?'Comprobando tu sesión por correo…':s);
  try{
   const me=await api('GET','/auth/me');
   const [a,c]=await Promise.all([api('GET','/agents'),api('GET','/public-chats')]);
   const list:Agent[]=Array.isArray(a.agents)?a.agents:[];
   setEmail(String(me.user?.email||''));setAgents(list);setChats(Array.isArray(c.chats)?c.chats:[]);
   setSelected(prev=>list.some(x=>x.id===prev)?prev:(list[0]?.id||''));
   setState('');
  }catch(e){setEmail('');setAgents([]);setState(e instanceof Error?e.message:'No se pudo conectar con los agentes.');}
 },[]);
 useEffect(()=>{void refresh();closeRef.current?.focus();},[refresh]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[onClose]);

 const agent=agents.find(a=>a.id===selected);
 const published=chats.filter(c=>c.agentId===selected&&c.enabled);
 async function run(label:string,fn:()=>Promise<void>){
  setBusy(true);setResult(label);
  try{await fn();}catch(e){setResult(e instanceof Error?e.message:'No se pudo completar la acción.');}
  finally{setBusy(false);}
 }
 /** Elimina para siempre el agente seleccionado (con sus chats publicados y contactos), tras confirmación. */
 const remove=()=>{
  const a=agents.find(x=>x.id===selected);if(!a)return;
  if(!window.confirm('¿Eliminar para siempre «'+a.name+'»?\n\nSe borrarán también sus chats publicados y los contactos recibidos. '+
   'El chat dejará de funcionar en las webs donde esté insertado. Esta acción NO se puede deshacer.'))return;
  return run('Eliminando…',async()=>{
   await api('DELETE','/agents/'+a.id);setLeads(null);await refresh();
   setResult('«'+a.name+'» eliminado.');
  });
 };
 const setStatus=(status:'active'|'paused')=>run(status==='active'?'Activando…':'Pausando…',async()=>{
  await api('POST','/agents/'+selected+'/status',{status});await refresh();
  setResult(status==='active'?'Agente activo: sus widgets autorizados ya pueden responder.':'Agente en pausa: sus widgets dejan de responder.');
 });
 const test=()=>run('Consultando el modelo IA real…',async()=>{
  const r=await api('POST','/agents/'+selected+'/test',{message:question.trim()});
  if(typeof r.reply!=='string'||!r.reply)throw Error('El modelo no devolvió respuesta.');
  setResult(r.reply);
 });
 const loadLeads=()=>run('Cargando contactos…',async()=>{
  const r=await api('GET','/agents/'+selected+'/leads');setLeads(Array.isArray(r.leads)?r.leads:[]);setResult('');
 });

 return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-3 sm:p-6" role="presentation"
  onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section role="dialog" aria-modal="true" aria-labelledby="agent-library-title"
   className="scroll-subtle flex max-h-[calc(100dvh-24px)] w-full max-w-[720px] flex-col overflow-y-auto rounded-2xl border border-stroke bg-panel p-5 text-ink shadow-2xl sm:p-6">
   <header className="flex items-start justify-between gap-4">
    <div>
     <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.19em] text-brand"><Bot size={14}/> Agentes IA</div>
     <h2 id="agent-library-title" className="mt-1 text-[20px] font-semibold tracking-[-.03em]">Biblioteca de agentes de Studio</h2>
     <p className="mt-1 text-[11px] leading-5 text-mist">Gestionados con tu acceso por correo. Sin segunda contraseña ni conexión con los agentes antiguos.</p>
    </div>
    <button ref={closeRef} className={btn} onClick={onClose} aria-label="Cerrar agentes"><X size={15}/></button>
   </header>

   {state?<div className="mt-5 rounded-xl border border-stroke bg-elevated p-4 text-[11px] leading-5 text-mist" role="status">
    {state}<div className="mt-3 flex flex-wrap gap-2"><button className={btn} onClick={()=>void refresh()}><RefreshCw size={14}/> Reintentar</button>
     <button className={btn} onClick={()=>window.location.reload()}>Recargar sesión</button></div>
   </div>:<>
    <p className="mt-4 flex items-center gap-2 text-[11px] text-mist"><CheckCircle2 size={14} className="text-green-500"/>{email} · {agents.length} {agents.length===1?'agente':'agentes'}</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <button className={primary} onClick={onCreateForWeb}><Bot size={14}/> Crear agente para una web</button>
     <button className={btn} disabled={busy} onClick={()=>void refresh()}><RefreshCw size={14}/> Actualizar</button>
    </div>
    {agents.length===0?<p className="mt-5 rounded-xl border border-dashed border-stroke p-5 text-[12px] leading-6 text-mist">
     Todavía no tienes agentes. Se crean a partir del contenido de una web: abre o genera una web y, en el paso «03 · Agente IA», la IA propondrá su configuración.</p>:
    <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
     <ul className="flex flex-col gap-1" aria-label="Tus agentes">
      {agents.map(a=><li key={a.id}><button onClick={()=>{setSelected(a.id);setResult('');setLeads(null);}} aria-current={a.id===selected}
       className={'w-full rounded-lg border px-3 py-2 text-left text-[12px] '+(a.id===selected?'border-brand bg-brandsoft':'border-transparent hover:bg-elevated')}>
       <span className="block truncate font-semibold">{a.name}</span>
       <span className="text-[10px] text-mist">{STATUS[a.status]||a.status}</span>
      </button></li>)}
     </ul>
     {agent&&<div className="min-w-0">
      <p className="text-[11px] text-mist">Estado: <strong className="text-ink">{STATUS[agent.status]}</strong> · Widgets publicados: {published.length}
       {published.length>0&&<> ({published.flatMap(c=>c.allowedOrigins||[]).join(', ')})</>}</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <button className={btn} disabled={busy||agent.status==='active'} onClick={()=>void setStatus('active')}><Play size={14}/> Activar</button>
       <button className={btn} disabled={busy||agent.status!=='active'} onClick={()=>void setStatus('paused')}><Pause size={14}/> Pausar</button>
       <button className={btn} disabled={busy} onClick={()=>void loadLeads()}><Users size={14}/> Contactos</button>
       <button className={btn+' text-red-600 hover:border-red-400'} disabled={busy} onClick={()=>void remove()}><Trash2 size={14}/> Eliminar</button>
      </div>
      <label className="mt-4 block text-[11px] text-mist">Pregunta de prueba
       <textarea className="mt-1 w-full resize-y rounded-lg border border-stroke bg-elevated px-3 py-2 text-[12px] text-ink outline-none focus:border-brand"
        rows={3} maxLength={1500} value={question} onChange={e=>setQuestion(e.target.value)}/>
      </label>
      <button className={primary+' mt-2'} disabled={busy||!question.trim()} onClick={()=>void test()}>
       {busy?<LoaderCircle size={14} className="animate-spin"/>:<MessageCircle size={14}/>} Probar conversación real
      </button>
      {result&&<div className="mt-3 whitespace-pre-wrap rounded-lg bg-elevated p-3 text-[12px] leading-6" role="status">{result}</div>}
      {leads&&<div className="mt-3 rounded-lg bg-elevated p-3 text-[11px] leading-5">
       {leads.length===0?'Todavía no hay contactos.':leads.map(l=><p key={l.id} className="mb-2"><strong>{l.name}</strong> · {l.email}<br/>{l.message}</p>)}
      </div>}
      <p className="mt-4 text-[10px] leading-5 text-faint">Herramientas disponibles: conversación con memoria, conocimiento del negocio, contactos con consentimiento (con aviso por correo), búsqueda en internet y en Google Maps, tiempo, festivos, divisas, Wikipedia y datos deportivos. Se activan al crear o editar el agente. Reservas y pagos: no habilitados.</p>
     </div>}
    </div>}
   </>}
  </section>
 </div>;
}
