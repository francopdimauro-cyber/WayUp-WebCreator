import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const cwd=resolve(import.meta.dirname,'..');
// Se importa por su ruta real: los módulos importan a su vez otros archivos (p. ej. studio-ai-providers.js).
async function load(path){readFileSync(resolve(cwd,path),'utf8');return import(pathToFileURL(resolve(cwd,path)).href);}
const privateMod=await load('src/studio-next-own-agents-bridge.js');
const publicMod=await load('src/studio-public-agent-worker.js');
const AUD='78890161c85752fcd44d08bde44510aac74aa51d9ee12371327fa6875ac6d8a6';
const origin='https://wayup-studio-motor-preview.francopdimauro.workers.dev';
const customerOrigin='https://test-negocio.example';
const agentId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',chatId='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const context={access:{aud:AUD,getIdentity:async()=>({email:'owner@example.com'})}};
function request(path,{method='GET',data,host=origin,siteOrigin=host}={}){
 return new Request(host+path,{method,headers:{...(method!=='GET'?{'Origin':siteOrigin}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});
}
function fakeDb({agentStatus='active',withLeads=true,chatOrigin=customerOrigin}={}){
 const agent={id:agentId,owner_id:'fake',name:'Agente Prueba',role:'Informador',
 objective:'Informar visitantes',instructions:'Responder solo sobre servicios reales.',
 knowledge:'Se ofrece diseño y mantenimiento web.',tools_json:JSON.stringify(['text_generation','knowledge_lookup',...(withLeads?['lead_capture']:[])]),
 status:agentStatus};
 const chat={id:chatId,agent_id:agentId,origin:chatOrigin,title:'Chat de prueba',
 greeting:'Hola, ¿en qué puedo ayudarte?',enabled:1,daily_limit:50,per_visitor_limit:10};
 const statements=[];
 return {statements,prepare(sql){
  return {bind(...params){
   return {
    async first(){statements.push({op:'first',sql,params});
     if(sql.includes('FROM studio_public_chats c JOIN studio_agents a')&&sql.includes('WHERE c.id=?'))return {...chat,...agent,agent_name:agent.name,id:chatId};
     if(sql.includes('FROM studio_agents WHERE id'))return agent;
     if(sql.includes('count(*)'))return {n:0};
     return null;
    },
    async all(){statements.push({op:'all',sql,params});return {results:[]}},
    async run(){statements.push({op:'run',sql,params});return {meta:{changes:1}}}
   };
  }};
 }};
}
function fakeAI(reply='Respuesta real del modelo'){return{run:async()=>({choices:[{message:{content:reply}}]})};}
test('Agent Studio requires signed Access identity',async()=>{
 const env={STUDIO_DB:fakeDb(),STUDIO_OWNER_EMAIL:'owner@example.com',AI:fakeAI()};
 const unauth=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/auth/me'),env,{});
 assert.equal(unauth.status,401);
 const wrong=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/auth/me'),env,{access:{aud:AUD,getIdentity:async()=>({email:'intruder@example.com'})}});
 assert.equal(wrong.status,401);
 const legit=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/auth/me'),env,context);
 assert.equal(legit.status,200);
 const data=await legit.json();assert.equal(data.user.email,'owner@example.com');
 assert.ok(data.user.id.startsWith('access:'));
});
test('Agent Studio prevents cross-origin mutations and creates isolated agents',async()=>{
 const db=fakeDb(),env={STUDIO_DB:db,STUDIO_OWNER_EMAIL:'owner@example.com',AI:fakeAI()};
 const config={name:'Asistente negocio',role:'Atención',objective:'Ayudar a clientes',
 instructions:'Informa sobre servicios reales; no inventes información.',
 knowledge:'Vendemos servicios de diseño.',tools:['text_generation','knowledge_lookup','lead_capture']};
 const wrong=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/agents',{method:'POST',data:{config},siteOrigin:'https://other.example'}),env,context);
 assert.equal(wrong.status,403);
 const valid=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/agents',{method:'POST',data:{config}}),env,context);
 assert.equal(valid.status,201);assert.ok((await valid.json()).id);
 assert.ok(db.statements.some(x=>x.op==='run'&&x.sql.includes('INSERT INTO studio_agents')&&x.params.some(p=>String(p).includes('lead_capture'))));
});
test('Private agent test uses actual model binding and knowledge',async()=>{
 const env={STUDIO_DB:fakeDb(),STUDIO_OWNER_EMAIL:'owner@example.com',AI:fakeAI('Ofrecemos diseño web.')};
 const response=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/agents/'+agentId+'/test',{method:'POST',data:{message:'¿Qué servicios tenéis?'}}),env,context);
 assert.equal(response.status,200);assert.equal((await response.json()).reply,'Ofrecemos diseño web.');
});
test('Public widget serves script and health without cookies',async()=>{
 const env={STUDIO_DB:fakeDb(),AI:fakeAI()};
 const health=await publicMod.default.fetch(new Request('https://worker.example/health'),env);
 assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
 const widget=await publicMod.default.fetch(new Request('https://worker.example/widget.js'),env);
 assert.equal(widget.status,200);assert.match(await widget.text(),/data-chat/);
});
test('Public chat requires exact HTTPS Origin and active agent',async()=>{
 const env={STUDIO_DB:fakeDb(),AI:fakeAI('Hola, hay atención disponible.')};
 const forbidden=await publicMod.default.fetch(request('/api/chats/'+chatId+'/config',{host:'https://worker.example',siteOrigin:customerOrigin}),env);
 assert.equal(forbidden.status,403);
 const allowed=await publicMod.default.fetch(new Request('https://worker.example/api/chats/'+chatId+'/config',{headers:{Origin:customerOrigin}}),env);
 assert.equal(allowed.status,200);assert.equal((await allowed.json()).leadCapture,true);
 const posted=await publicMod.default.fetch(request('/api/chats/'+chatId+'/message',{method:'POST',host:'https://worker.example',siteOrigin:customerOrigin,data:{message:'¿Qué haces?'}}),env);
 assert.equal(posted.status,200);assert.equal((await posted.json()).reply,'Hola, hay atención disponible.');
 const paused=await publicMod.default.fetch(new Request('https://worker.example/api/chats/'+chatId+'/config',{headers:{Origin:customerOrigin}}),{STUDIO_DB:fakeDb({agentStatus:'paused'}),AI:fakeAI()});
 assert.equal(paused.status,404);
});
test('Contact lead requires explicit consent and enabled permission',async()=>{
 const env={STUDIO_DB:fakeDb(),AI:fakeAI()};
 const p='/api/chats/'+chatId+'/lead',data={name:'Usuario Demo',email:'demo@example.com',message:'Quiero recibir información sobre vuestro trabajo.'};
 const no=await publicMod.default.fetch(request(p,{method:'POST',host:'https://worker.example',siteOrigin:customerOrigin,data}),env);
 assert.equal(no.status,400);
 const yes=await publicMod.default.fetch(request(p,{method:'POST',host:'https://worker.example',siteOrigin:customerOrigin,data:{...data,consent:true}}),env);
 assert.equal(yes.status,201);assert.equal((await yes.json()).saved,true);
});
test('Chat sin dominio: se crea, no responde desde ningún sitio y luego se le asigna el dominio',async()=>{
 const db=fakeDb(),env={STUDIO_DB:db,STUDIO_OWNER_EMAIL:'owner@example.com',AI:fakeAI()};
 const created=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/public-chats',{method:'POST',data:{agentId,allowedOrigins:[],title:'Chat',greeting:'Hola'}}),env,context);
 assert.equal(created.status,201);
 assert.ok(db.statements.some(x=>x.op==='run'&&x.sql.includes('INSERT INTO studio_public_chats')&&x.params[2]===''),'se guarda con el dominio vacío');
 const two=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/public-chats',{method:'POST',data:{agentId,allowedOrigins:[customerOrigin,'https://otro.example']}}),env,context);
 assert.equal(two.status,400);
 const pendingEnv={STUDIO_DB:fakeDb({chatOrigin:''}),AI:fakeAI()};
 const blocked=await publicMod.default.fetch(request('/api/chats/'+chatId+'/message',{method:'POST',host:'https://worker.example',siteOrigin:customerOrigin,data:{message:'Hola'}}),pendingEnv);
 assert.equal(blocked.status,403,'sin dominio no responde desde webs ajenas');
 const local=await publicMod.default.fetch(request('/api/chats/'+chatId+'/message',{method:'POST',host:'https://worker.example',siteOrigin:'null',data:{message:'Hola'}}),pendingEnv);
 assert.equal(local.status,200,'pero sí desde la web descargada abierta en el ordenador (Origin null)');
 const lh=await publicMod.default.fetch(request('/api/chats/'+chatId+'/message',{method:'POST',host:'https://worker.example',siteOrigin:'http://localhost:5500',data:{message:'Hola'}}),pendingEnv);
 assert.equal(lh.status,200,'y desde localhost');
 const put=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/public-chats/'+chatId,{method:'PUT',data:{origin:'https://nuevo-negocio.example',enabled:true}}),{...env,STUDIO_DB:fakeDb({chatOrigin:''})},context);
 assert.equal(put.status,200);assert.equal((await put.json()).origin,'https://nuevo-negocio.example');
 const bad=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/public-chats/'+chatId,{method:'PUT',data:{origin:'http://inseguro.example'}}),env,context);
 assert.equal(bad.status,400);
});
test('Eliminar agente: solo desde el Studio y borra contactos, chats y el agente',async()=>{
 const db=fakeDb(),env={STUDIO_DB:db,STUDIO_OWNER_EMAIL:'owner@example.com',AI:fakeAI()};
 const fuera=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/agents/'+agentId,{method:'DELETE',siteOrigin:'https://otro.example'}),env,context);
 assert.equal(fuera.status,403,'otro origen no puede borrar');
 const ok=await privateMod.wayupStudioOwnAgentBridge(request('/studio-api/agents/agents/'+agentId,{method:'DELETE'}),env,context);
 assert.equal(ok.status,200);assert.equal((await ok.json()).deleted,true);
 const runs=db.statements.filter(x=>x.op==='run').map(x=>x.sql);
 for(const t of ['studio_agent_leads','studio_public_chats','studio_agents'])assert.ok(runs.some(s=>s.startsWith('DELETE FROM '+t)),'borra '+t);
 assert.ok(runs.findIndex(s=>s.startsWith('DELETE FROM studio_agents'))>runs.findIndex(s=>s.startsWith('DELETE FROM studio_public_chats')),'el agente se borra el último');
});
