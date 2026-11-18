/* WAY UP Studio — widget y chat público del nuevo Agent Studio (preview).
 * Worker INDEPENDIENTE de producción. D1 compartida con la preview privada;
 * la conversación solo funciona en el origen HTTPS autorizado por el dueño.
 */
import {callExternal,modelsFor,workersAIEnabled} from './studio-ai-providers.js';
import {agentAnswer,agentReply} from './studio-agent-brain.js';
import {notifyLead} from './studio-agent-mail.js';
const AGENT_MODEL='@cf/google/gemma-4-26b-a4b-it';
const AGENT_UUID=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const AGENT_PUBLIC_PREFIX='/api/chats/';
function agentHeaders(origin=''){
 const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'Cross-Origin-Resource-Policy':origin?'cross-origin':'same-origin','Vary':'Origin'};
 if(origin){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Methods']='GET, POST, OPTIONS';
 h['Access-Control-Allow-Headers']='content-type';h['Access-Control-Max-Age']='600';}
 return h;
}
function agentJson(result,status=200,origin=''){return new Response(JSON.stringify(result),{status,headers:agentHeaders(origin)});}
async function agentReadJson(req,max=6500){
 if(!(req.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
  throw Error('Se requiere JSON.');
 if(Number(req.headers.get('Content-Length')||0)>max)throw Error('Solicitud demasiado grande.');
 const raw=await req.text();if(raw.length>max)throw Error('Solicitud demasiado grande.');
 try{return JSON.parse(raw);}catch{throw Error('JSON no válido.');}
}
function agentClean(v,max=1000){return typeof v==='string'?v.trim().slice(0,max):'';}
function agentAiText(x){return typeof x?.response==='string'?x.response:typeof x?.choices?.[0]?.message?.content==='string'?x.choices[0].message.content:'';}
async function agentVisitorHash(req,chat,day){
 const ip=req.headers.get('CF-Connecting-IP')||'no-ip';
 const agent=req.headers.get('User-Agent')||'no-ua';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(chat+'|'+day+'|'+ip+'|'+agent.slice(0,160)));
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
async function agentCheckAndCharge(db,req,row,limitType){
 const day=new Date().toISOString().slice(0,10),hash=await agentVisitorHash(req,row.id,day);
 const visitorMax=Number(row.per_visitor_limit)||20,globalMax=row.origin?(Number(row.daily_limit)||200):Math.min(40,Number(row.daily_limit)||200);
 await db.prepare('INSERT OR IGNORE INTO studio_chat_usage(chat_id,day,visitor_hash,used) VALUES (?,?,?,0)').bind(row.id,day,hash).run();
 const r=await db.prepare('UPDATE studio_chat_usage SET used=used+1 WHERE chat_id=? AND day=? AND visitor_hash=? AND used<?')
 .bind(row.id,day,hash,visitorMax).run();
 if(Number(r?.meta?.changes||0)!==1)return false;
 await db.prepare('INSERT OR IGNORE INTO studio_chat_daily(chat_id,day,used) VALUES (?,?,0)').bind(row.id,day).run();
 const t=await db.prepare('UPDATE studio_chat_daily SET used=used+1 WHERE chat_id=? AND day=? AND used<?')
 .bind(row.id,day,globalMax).run();
 return Number(t?.meta?.changes||0)===1;
}
async function publicChat(req,env,url){
 const match=url.pathname.match(/^\/api\/chats\/([0-9a-f-]{36})\/(config|message|lead)$/i);
 if(!match||!AGENT_UUID.test(match[1]))return agentJson({error:'Ruta no encontrada.'},404);
 if(!env.STUDIO_DB)return agentJson({error:'Chat no disponible.'},503);
 const row=await env.STUDIO_DB.prepare('SELECT c.*,a.name AS agent_name,a.role,a.objective,a.instructions,a.knowledge,a.tools_json,a.status FROM studio_public_chats c JOIN studio_agents a ON a.id=c.agent_id WHERE c.id=?')
 .bind(match[1]).first();
 if(!row||!row.enabled||row.status!=='active')return agentJson({error:'Chat no disponible.'},404);
 // Los datos del widget no son privados, pero los visitantes no pueden usarlo desde otros dominios.
 const origin=req.headers.get('Origin')||'';
 // Sin dominio todavía: solo para PROBAR la web descargada en el propio ordenador (archivo local = Origin «null», o localhost).
 const testing=!row.origin&&(origin==='null'||/^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/.test(origin));
 if(!origin||(origin!==row.origin&&!testing))return agentJson({error:row.origin?'Origen no autorizado.':'Este chat aún no tiene dominio: ábrelo desde la web descargada en tu ordenador o añade el dominio en WAY UP Studio.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:agentHeaders(origin)});
 if(match[2]==='config'&&req.method==='GET')return agentJson({title:row.title,greeting:row.greeting,
  leadCapture:JSON.parse(row.tools_json||'[]').includes('lead_capture')},200,origin);
 if(!['POST'].includes(req.method))return agentJson({error:'Método no permitido.'},405,origin);
 // El mensaje lleva el historial reciente de la conversación (máx. 8 turnos de 1 200 caracteres).
 const data=await agentReadJson(req,match[2]==='message'?16000:6500);
 if(match[2]==='message'){
  const message=agentClean(data.message,1200);
  if(message.length<1)return agentJson({error:'Escribe una pregunta.'},400,origin);
  if(!workersAIEnabled(env)&&!modelsFor(env,'agent').length)return agentJson({error:'El modelo IA no está disponible.'},503,origin);
  if(!(await agentCheckAndCharge(env.STUDIO_DB,req,row,'message')))return agentJson({error:'Límite de mensajes alcanzado. Vuelve a intentarlo mañana.'},429,origin);
  const tools=JSON.parse(row.tools_json||'["text_generation"]');
  // Mismo «cerebro» que la prueba del panel: estrategia de conversación, memoria de los últimos turnos y conocimiento.
  const agent={name:row.agent_name,role:row.role,objective:row.objective,instructions:row.instructions,knowledge:row.knowledge};
  // Una llamada al modelo: primero los externos de agentes (STUDIO_AGENT_MODELS); Workers AI solo si está activado.
  const call=async messages=>{
   for(const ref of modelsFor(env,'agent')){
    try{const t=(await callExternal(env,ref,messages,{maxTokens:900,temperature:0.2,timeoutMs:40000})).text;if(t)return t;}
    catch(e){console.warn('agent-public external error',ref,String(e?.message||e).slice(0,200));}
   }
   if(workersAIEnabled(env))return agentAiText(await env.AI.run(AGENT_MODEL,{messages,max_completion_tokens:750,temperature:0.2}));
   return '';
  };
  try{
   // Cerebro común: memoria, conocimiento y, si están activadas, búsqueda en internet y en Google Maps.
   const reply=agentReply(await agentAnswer(env,agent,{message,history:data.history,tools},call),3800);
   if(!reply)return agentJson({error:'El agente no respondió. Prueba otra vez.'},502,origin);
   return agentJson({reply},200,origin);
  }catch{return agentJson({error:'La IA no pudo responder ahora.'},502,origin);}
 }
 if(match[2]==='lead'){
  const tools=JSON.parse(row.tools_json||'[]');
  if(!tools.includes('lead_capture'))return agentJson({error:'Captación de contactos desactivada.'},403,origin);
  if(data.consent!==true)return agentJson({error:'Necesitamos tu consentimiento explícito.'},400,origin);
  const name=agentClean(data.name,90),email=agentClean(data.email,160),message=agentClean(data.message,1500);
  if(name.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||message.length<10)
   return agentJson({error:'Comprueba nombre, correo y mensaje.'},400,origin);
  if(!(await agentCheckAndCharge(env.STUDIO_DB,req,row,'lead')))return agentJson({error:'Límite temporal de solicitudes alcanzado.'},429,origin);
  await env.STUDIO_DB.prepare('INSERT INTO studio_agent_leads(id,agent_id,chat_id,name,email,message,consent) VALUES (?,?,?,?,?,?,1)')
   .bind(crypto.randomUUID(),row.agent_id,row.id,name,email,message).run();
  // Aviso por correo al negocio (y confirmación al visitante si hay dominio verificado). Si falla, el contacto ya está guardado.
  const mail=await notifyLead(env,{agentName:row.agent_name,origin:row.origin,name,email,message});
  return agentJson({saved:true,message:mail.visitor?'Solicitud recibida. Te hemos enviado una confirmación por correo.':'Solicitud recibida y enviada al responsable del negocio.'},201,origin);
 }
 return agentJson({error:'Ruta no encontrada.'},404,origin);
}
const PUBLIC_WIDGET=String.raw`(()=>{"use strict";
const script=document.currentScript;if(!script)return;
const id=script.getAttribute('data-chat')||'';if(!/^[0-9a-f-]{36}$/i.test(id))return;
const base=new URL(script.src).origin;
const root=document.createElement('div');root.setAttribute('data-wayup-agent',id);
root.style.position='fixed';root.style.right='18px';root.style.bottom='18px';root.style.zIndex='2147483000';
document.body.appendChild(root);const shadow=root.attachShadow({mode:'closed'});
const style=document.createElement('style');
style.textContent='*{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}#toggle{background:#2855ee;color:white;border:0;border-radius:999px;box-shadow:0 8px 35px #0003;padding:14px 22px;font:600 14px system-ui}#dialog{display:none;position:absolute;bottom:62px;right:0;width:min(350px,calc(100vw - 24px));height:min(510px,calc(100dvh - 110px));background:#fff;border:1px solid #d9dfed;box-shadow:0 10px 45px #0002;border-radius:18px;color:#162035;font:13px system-ui;overflow:hidden}#dialog.open{display:flex;flex-direction:column}header{display:flex;align-items:center;justify-content:space-between;padding:14px;background:#2855ee;color:white;font-weight:700}header button{background:none;border:0;color:white;font-size:20px}#conversation{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:9px;min-height:0}#conversation>div{line-height:1.5;padding:10px 12px;border-radius:12px;max-width:90%;overflow-wrap:anywhere}#conversation>div.user{white-space:pre-wrap}#conversation p{margin:0 0 6px}#conversation p:last-child,#conversation ul:last-child{margin-bottom:0}#conversation ul{margin:4px 0 6px;padding-left:18px}#conversation li{margin:2px 0}#conversation strong{font-weight:700}#conversation .user{align-self:flex-end;background:#e7edff}#conversation .agent{align-self:flex-start;background:#f2f4f7}#composer{display:flex;padding:10px;gap:8px;border-top:1px solid #eee}#message{flex:1;min-width:0;border:1px solid #d9dfed;padding:10px;border-radius:8px}#send,#leadSend{background:#2855ee;color:white;border:0;border-radius:8px;padding:10px}#send:disabled,#leadSend:disabled{opacity:.6}#leadToggle{border:0;background:#f7f8fc;color:#2855ee;padding:9px}#lead{display:none;padding:11px;gap:7px;background:#fafbfd;flex-direction:column;max-height:75%;overflow:auto}#lead.open{display:flex}#lead input,#lead textarea{border:1px solid #d9dfed;padding:9px;border-radius:7px;width:100%}#lead label{display:flex;gap:6px;font-size:11px;align-items:start}#lead label input{width:auto}#notice{font-size:11px;color:#555;padding:6px 12px}';
shadow.appendChild(style);
const toggle=document.createElement('button');toggle.id='toggle';toggle.textContent='Hablar con nuestro asistente';toggle.setAttribute('aria-label','Abrir asistente de inteligencia artificial');
const box=document.createElement('section');box.id='dialog';box.setAttribute('role','dialog');box.setAttribute('aria-label','Asistente IA');
box.innerHTML='<header><span id="title">Asistente IA</span><button id="close" aria-label="Cerrar">×</button></header><div id="conversation" aria-live="polite"></div><form id="composer"><input id="message" placeholder="Escribe tu pregunta…" maxlength="1200" aria-label="Mensaje" required/><button id="send" type="submit">Enviar</button></form><button id="leadToggle" hidden>Dejar mis datos de contacto</button><form id="lead"><input id="leadName" placeholder="Tu nombre" maxlength="90" required/><input id="leadEmail" type="email" placeholder="Tu correo" maxlength="160" required/><textarea id="leadMsg" placeholder="¿En qué te podemos ayudar?" minlength="10" maxlength="1500" required></textarea><label><input id="consent" type="checkbox" required/> Consiento el almacenamiento de mis datos para que el negocio responda a esta solicitud.</label><button id="leadSend" type="submit">Enviar solicitud</button></form><div id="notice">Asistente IA. No compartas información sensible.</div>';
shadow.append(toggle,box);
const el=sel=>box.querySelector(sel),conversation=el('#conversation'),notice=el('#notice');
const endpoint=base+'/api/chats/'+id;
async function send(path,body){const r=await fetch(endpoint+path,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error||'No se pudo completar la solicitud');return v;}
function inline(parent,text){const re=/\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;let last=0,m;while((m=re.exec(text))){if(m.index>last)parent.appendChild(document.createTextNode(text.slice(last,m.index)));const n=document.createElement(m[1]!==undefined?'strong':'em');n.textContent=m[1]!==undefined?m[1]:m[2];parent.appendChild(n);last=m.index+m[0].length;}if(last<text.length)parent.appendChild(document.createTextNode(text.slice(last)));}
function markdown(target,text){let list=null;for(const raw of String(text||'').replace(/\r/g,'').split('\n')){const line=raw.trimEnd();const b=/^\s*[-*•]\s+(.*)$/.exec(line)||/^\s*\d+[.)]\s+(.*)$/.exec(line);if(b){if(!list){list=document.createElement('ul');target.appendChild(list);}const li=document.createElement('li');inline(li,b[1]);list.appendChild(li);continue;}list=null;if(!line.trim())continue;const p=document.createElement('p');inline(p,line.replace(/^\s*#{1,6}\s+/,''));target.appendChild(p);}}
function say(message,type){const d=document.createElement('div');d.className=type;if(type==='agent')markdown(d,message);else d.textContent=String(message||'');conversation.appendChild(d);conversation.scrollTop=conversation.scrollHeight;}
toggle.addEventListener('click',()=>{box.classList.toggle('open');if(box.classList.contains('open'))el('#message').focus();});
el('#close').addEventListener('click',()=>box.classList.remove('open'));
fetch(endpoint+'/config',{mode:'cors',credentials:'omit'}).then(r=>r.ok?r.json():Promise.reject(Error('No autorizado'))).then(data=>{
el('#title').textContent=data.title||'Asistente IA';say(data.greeting||'¡Hola! ¿En qué puedo ayudarte?','agent');
el('#leadToggle').hidden=!data.leadCapture;toggle.hidden=false;
}).catch(()=>{toggle.textContent='Asistente no disponible';toggle.disabled=true;});
const history=[];
el('#composer').addEventListener('submit',async event=>{event.preventDefault();const input=el('#message'),value=input.value.trim();if(!value)return;input.value='';say(value,'user');const btn=el('#send');btn.disabled=true;try{const r=await send('/message',{message:value,history:history.slice(-8)});say(r.reply,'agent');history.push({role:'user',text:value.slice(0,1200)},{role:'agent',text:String(r.reply||'').slice(0,1200)});if(history.length>8)history.splice(0,history.length-8);}catch(e){say(e.message||'Ha ocurrido un error.','agent');}finally{btn.disabled=false;}});
el('#leadToggle').addEventListener('click',()=>el('#lead').classList.toggle('open'));
el('#lead').addEventListener('submit',async event=>{event.preventDefault();const btn=el('#leadSend');btn.disabled=true;try{const data=await send('/lead',{name:el('#leadName').value,email:el('#leadEmail').value,message:el('#leadMsg').value,consent:el('#consent').checked});notice.textContent=data.message||'Solicitud recibida';el('#lead').reset();el('#lead').classList.remove('open');}catch(e){notice.textContent=e.message||'Error enviando la solicitud.';}finally{btn.disabled=false;}});
})();`;
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return agentJson({status:'ok',kind:'studio-public-agent-preview',ai:!!env?.AI?.run,storage:!!env?.STUDIO_DB});
  if(url.pathname==='/widget.js'&&request.method==='GET')return new Response(PUBLIC_WIDGET,{headers:{
   'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=120',
   'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'cross-origin',
   'Access-Control-Allow-Origin':'*'}});
  try{return await publicChat(request,env,url);}catch{return agentJson({error:'No se pudo procesar la solicitud.'},503);}
 }
};
