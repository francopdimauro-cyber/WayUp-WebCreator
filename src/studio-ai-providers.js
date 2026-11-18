import Anthropic from '@anthropic-ai/sdk';
/* WAY UP Studio · Proveedores de IA externos (Gemini, Groq, OpenRouter).
   Los modelos se configuran en variables del Worker (sin adivinar nombres en el código):
     GEMINI_MODEL, GROQ_MODEL, OPENROUTER_MODEL   → modelos por proveedor
     STUDIO_WEB_PROVIDERS, STUDIO_AGENT_PROVIDERS  → orden de preferencia por uso, p. ej. "gemini,openrouter"
   Las claves son secretos: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY. Nunca se devuelven ni se registran. */

export class ProviderError extends Error{
  constructor(provider,status,message){super(message);this.provider=provider;this.status=status;this.code=status===429?'provider_limit':'provider';}
}
const TIMEOUT_MS=150000;
const clip=(v,n=300)=>String(v||'').replace(/\s+/g,' ').trim().slice(0,n);
// Los mensajes de error de los proveedores pueden repetir la clave en la URL: se enmascara cualquier cosa que lo parezca.
const scrub=v=>clip(v,400).replace(/(key=|Bearer\s+)[A-Za-z0-9._-]+/gi,'$1•••').replace(/\b(AIza|gsk_|sk-or-)[A-Za-z0-9._-]{8,}/g,'$1•••');

export const PROVIDERS={
  gemini:{label:'Google Gemini',secret:'GEMINI_API_KEY',modelVar:'GEMINI_MODEL'},
  groq:{label:'Groq',secret:'GROQ_API_KEY',modelVar:'GROQ_MODEL'},
  openrouter:{label:'OpenRouter',secret:'OPENROUTER_API_KEY',modelVar:'OPENROUTER_MODEL'},
  anthropic:{label:'Anthropic Claude',secret:'ANTHROPIC_API_KEY',modelVar:'ANTHROPIC_MODEL'},
  cerebras:{label:'Cerebras',secret:'CEREBRAS_API_KEY',modelVar:'CEREBRAS_MODEL'}
};
export const providerModel=(env,name)=>clip(env?.[PROVIDERS[name]?.modelVar],120);
export const providerReady=(env,name)=>Boolean(PROVIDERS[name]&&env?.[PROVIDERS[name].secret]&&providerModel(env,name));
/** Proveedores externos listos para un uso («web» o «agent»), en el orden configurado. Devuelve referencias «proveedor:modelo». */
export function externalModels(env,use){
  const list=String((use==='agent'?env?.STUDIO_AGENT_PROVIDERS:env?.STUDIO_WEB_PROVIDERS)||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  return [...new Set(list)].filter(n=>providerReady(env,n)).map(n=>n+':'+providerModel(env,n));
}
export const isExternal=ref=>/^(gemini|groq|openrouter|anthropic|cerebras):/.test(String(ref||''));
/** Listas de modelos por tarea (variables del Worker, en orden de preferencia, «proveedor:modelo» separados por comas):
 *  plan  → STUDIO_WEB_PLAN_MODELS  (director, redactor, revisor y dirección creativa)
 *  build → STUDIO_WEB_BUILD_MODELS (constructores de secciones)
 *  agent → STUDIO_AGENT_MODELS     (propuesta y prueba de agentes)
 *  Solo se devuelven los de proveedores con clave. Si la lista está vacía, se usa la configuración anterior por proveedor. */
/** ¿Se puede usar Workers AI? STUDIO_WORKERS_AI="off" lo desactiva por completo (solo modelos externos). */
export const workersAIEnabled=env=>String(env?.STUDIO_WORKERS_AI??'on').trim().toLowerCase()!=='off'&&Boolean(env?.AI?.run);
export function modelsFor(env,use){
  const raw=use==='agent'?env?.STUDIO_AGENT_MODELS:use==='build'?env?.STUDIO_WEB_BUILD_MODELS:use==='vision'?env?.STUDIO_VISION_MODELS:env?.STUDIO_WEB_PLAN_MODELS;
  const list=String(raw||'').split(',').map(s=>s.trim()).filter(r=>/^(gemini|groq|openrouter|anthropic|cerebras):[\w./:-]{2,120}$/.test(r))
    .filter(r=>Boolean(env?.[PROVIDERS[r.split(':')[0]].secret]));
  if(list.length||use==='vision')return [...new Set(list)];
  const legacy=externalModels(env,use==='agent'?'agent':'web');
  return use==='build'?legacy.filter(r=>!r.startsWith('gemini:')):legacy;
}
// Gemini: si en este tiempo no ha empezado a responder (saturado), se pasa al siguiente modelo.
const GEMINI_FIRST_TOKEN_MS=15000;

async function timedFetch(url,init,ms=TIMEOUT_MS){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms);
  try{return await fetch(url,{...init,signal:ctl.signal});}
  catch(e){throw new ProviderError('red',0,e?.name==='AbortError'?'Tiempo de espera agotado':'Error de red: '+clip(e?.message,120));}
  finally{clearTimeout(t);}
}
async function failure(name,res){
  let detail='';try{const j=await res.json();detail=j?.error?.message||j?.error?.status||j?.message||JSON.stringify(j).slice(0,200);}catch{try{detail=await res.text();}catch{}}
  return new ProviderError(name,res.status,PROVIDERS[name].label+' respondió '+res.status+(detail?': '+scrub(detail):''));
}

/** Llamada de chat a un proveedor externo. messages: [{role:'system'|'user'|'assistant',content:string}]. Devuelve {text,finish}. */
export async function callExternal(env,ref,messages,{maxTokens=8000,temperature=0.6,timeoutMs=TIMEOUT_MS,effort}={}){
  const i=String(ref).indexOf(':');const name=ref.slice(0,i),model=ref.slice(i+1);
  const p=PROVIDERS[name];const key=p&&env?.[p.secret];
  if(!p||!key||!model)throw new ProviderError(name,0,(p?.label||name)+' no está configurado');
  if(name==='gemini'){
    const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n');
    const toParts=c=>Array.isArray(c)?c.map(x=>{
        if(x?.type==='image_url'){const m=/^data:([^;]+);base64,(.+)$/.exec(String(x.image_url?.url||''));return m?{inline_data:{mime_type:m[1],data:m[2]}}:null;}
        return {text:String(x?.text??'')};
      }).filter(Boolean):[{text:String(c)}];
    const contents=messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:toParts(m.content)}));
    // En streaming: si no llega nada en 15 s (modelo saturado) se corta; si ya está escribiendo, se le deja terminar.
    const ctl=new AbortController();let started=false;
    const firstTimer=setTimeout(()=>{if(!started)ctl.abort();},Math.min(GEMINI_FIRST_TOKEN_MS,timeoutMs));
    const totalTimer=setTimeout(()=>ctl.abort(),timeoutMs);
    let text='',finish='',blocked='';
    try{
      let res;
      try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':streamGenerateContent?alt=sse',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:ctl.signal,
        body:JSON.stringify({...(system?{systemInstruction:{parts:[{text:system}]}}:{}),contents,generationConfig:{maxOutputTokens:maxTokens,temperature}})});}
      catch(e){throw new ProviderError(name,0,e?.name==='AbortError'?'Gemini no empezó a responder en '+Math.round(GEMINI_FIRST_TOKEN_MS/1000)+' s (saturado)':'Error de red: '+clip(e?.message,120));}
      if(!res.ok)throw await failure(name,res);
      const reader=res.body.getReader(),decoder=new TextDecoder();let carry='';
      const take=line=>{
        if(!line.startsWith('data:'))return;
        let j;try{j=JSON.parse(line.slice(5).trim());}catch{return;}
        const cand=j?.candidates?.[0];
        const piece=(cand?.content?.parts||[]).filter(x=>!x?.thought).map(x=>x?.text||'').join('');
        if(piece){started=true;text+=piece;}
        if(cand?.finishReason)finish=String(cand.finishReason);
        if(j?.promptFeedback?.blockReason)blocked=String(j.promptFeedback.blockReason);
      };
      try{
        while(true){
          const {value,done}=await reader.read();if(done)break;
          carry+=decoder.decode(value,{stream:true});
          const lines=carry.split(/\r?\n/);carry=lines.pop()||'';lines.forEach(take);
        }
        if(carry)take(carry);
      }catch(e){throw new ProviderError(name,0,started?'Gemini cortó la respuesta (tiempo total agotado)':'Gemini no empezó a responder en '+Math.round(GEMINI_FIRST_TOKEN_MS/1000)+' s (saturado)');}
    }finally{clearTimeout(firstTimer);clearTimeout(totalTimer);}
    if(!text)throw new ProviderError(name,200,'Gemini no devolvió texto'+(blocked?' (bloqueado: '+blocked+')':finish?' ('+finish+')':''));
    return {text,finish:finish==='MAX_TOKENS'?'length':finish};
  }
  if(name==='anthropic')return callClaude(key,model,messages,{maxTokens,timeoutMs,effort});
  // Groq, OpenRouter y Cerebras usan el mismo formato de chat (compatible con OpenAI).
  const url=name==='groq'?'https://api.groq.com/openai/v1/chat/completions':name==='cerebras'?'https://api.cerebras.ai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';
  const headers={'Content-Type':'application/json',Authorization:'Bearer '+key};
  if(name==='openrouter')headers['X-Title']='WayUp Studio';
  const res=await timedFetch(url,{method:'POST',headers,body:JSON.stringify({model,messages,max_tokens:maxTokens,temperature})},timeoutMs);
  if(!res.ok)throw await failure(name,res);
  const j=await res.json();
  const text=String(j?.choices?.[0]?.message?.content||'');
  if(!text)throw new ProviderError(name,200,PROVIDERS[name].label+' no devolvió texto');
  return {text,finish:String(j?.choices?.[0]?.finish_reason||'')};
}

/** Claude (API de Anthropic, SDK oficial). Mensajes con formato OpenAI → formato Claude (imágenes en base64).
 *  Sin temperature (la API actual la rechaza); profundidad con «effort». El system va con caché de prompt
 *  para que los constructores (mismo system) lo reutilicen. Opus/Sonnet 5.5 con reserva automática si rechazan. */
async function callClaude(key,model,messages,{maxTokens,timeoutMs,effort}){
  const client=new Anthropic({apiKey:key,timeout:timeoutMs,maxRetries:1});
  const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n');
  const toBlocks=c=>Array.isArray(c)?c.map(x=>{
      if(x?.type==='image_url'){const m=/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(String(x.image_url?.url||''));return m?{type:'image',source:{type:'base64',media_type:m[1],data:m[2]}}:null;}
      return {type:'text',text:String(x?.text??'')};
    }).filter(Boolean):String(c);
  const params={model,max_tokens:maxTokens,
    ...(system?{system:[{type:'text',text:system,cache_control:{type:'ephemeral'}}]}:{}),
    messages:messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'assistant':'user',content:toBlocks(m.content)})),
    ...(effort?{output_config:{effort}}:{})};
  let msg;
  try{
    msg=/^claude-(opus|sonnet)-5-5$/.test(model)
      ?await client.beta.messages.stream({...params,betas:['server-side-fallback-2026-07-01'],fallbacks:'default'}).finalMessage()
      :await client.messages.stream(params).finalMessage();
  }catch(e){throw new ProviderError('anthropic',Number(e?.status)||0,'Anthropic Claude: '+scrub(e?.message||e));}
  if(msg.stop_reason==='refusal')throw new ProviderError('anthropic',200,'Claude rechazó la petición'+(msg.stop_details?.category?' ('+msg.stop_details.category+')':''));
  const text=(msg.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
  if(!text)throw new ProviderError('anthropic',200,'Claude no devolvió texto');
  return {text,finish:msg.stop_reason==='max_tokens'?'length':String(msg.stop_reason||'')};
}

/** Modelos que ofrece cada proveedor con tu clave (para saber el nombre exacto). filter: texto a buscar. */
export async function listModels(env,name,filter=''){
  const p=PROVIDERS[name];const key=p&&env?.[p.secret];
  if(!key)return {ok:false,error:'Falta el secreto '+p.secret,models:[]};
  try{
    let res,ids=[];
    if(name==='anthropic'){
      for await(const m of new Anthropic({apiKey:key,timeout:20000}).models.list())ids.push(String(m?.id||''));
    }else if(name==='gemini'){
      res=await timedFetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':key}},20000);
      if(!res.ok)throw await failure(name,res);
      ids=((await res.json())?.models||[]).filter(m=>(m?.supportedGenerationMethods||[]).includes('generateContent')).map(m=>String(m.name||'').replace(/^models\//,''));
    }else{
      res=await timedFetch(name==='groq'?'https://api.groq.com/openai/v1/models':name==='cerebras'?'https://api.cerebras.ai/v1/models':'https://openrouter.ai/api/v1/models',{headers:{Authorization:'Bearer '+key}},20000);
      if(!res.ok)throw await failure(name,res);
      ids=((await res.json())?.data||[]).map(m=>String(m?.id||''));
    }
    const f=String(filter||'').toLowerCase();
    return {ok:true,models:ids.filter(Boolean).filter(id=>!f||id.toLowerCase().includes(f)).sort().slice(0,80)};
  }catch(e){return {ok:false,error:scrub(e?.message||e),models:[]};}
}

// Imagen de prueba (PNG 64×64: círculo rojo sobre fondo blanco) para comprobar que un modelo «ve».
export const PROBE_IMAGE='data:image/png;base64,'+PROBE_PNG_B64();
function PROBE_PNG_B64(){
  // PNG generado en el arranque: sin dependencias. Escala de grises no, RGB sin compresión (stored deflate).
  const W=64,H=64,raw=new Uint8Array((W*3+1)*H);
  for(let y=0;y<H;y++){raw[y*(W*3+1)]=0;for(let x=0;x<W;x++){const i=y*(W*3+1)+1+x*3;const inside=(x-32)**2+(y-32)**2<20*20;raw[i]=inside?220:255;raw[i+1]=inside?30:255;raw[i+2]=inside?30:255;}}
  const crcT=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcT[n]=c>>>0;}
  const crc=b=>{let c=0xffffffff;for(const v of b)c=crcT[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const u32=v=>[v>>>24&255,v>>>16&255,v>>>8&255,v&255];
  const chunk=(t,d)=>{const td=[...t].map(c=>c.charCodeAt(0)).concat([...d]);return [...u32(d.length),...td,...u32(crc(td))];};
  let a=1,b2=0;for(const v of raw){a=(a+v)%65521;b2=(b2+a)%65521;}
  const blocks=[];for(let i=0;i<raw.length;i+=65535){const part=raw.subarray(i,i+65535),last=i+65535>=raw.length;blocks.push(last?1:0,part.length&255,part.length>>8,~part.length&255,(~part.length>>8)&255,...part);}
  const idat=[0x78,0x01,...blocks,...u32(((b2<<16)|a)>>>0)];
  const ihdr=[...u32(W),...u32(H),8,2,0,0,0];
  const png=[137,80,78,71,13,10,26,10,...chunk('IHDR',ihdr),...chunk('IDAT',idat),...chunk('IEND',[])];
  let s='';for(const v of png)s+=String.fromCharCode(v);return btoa(s);
}
/** Prueba rápida de varios modelos a la vez («proveedor:modelo», máx. 8): responde, tiempo y error exacto.
 *  Pide algo de criterio (no solo «OK») para comparar también la calidad de la respuesta. */
export async function probeModels(env,refs,{vision=false}={}){
  const list=[...new Set(String(refs||'').split(',').map(s=>s.trim()).filter(r=>/^(gemini|groq|openrouter|anthropic|cerebras):[\w./:-]{2,120}$/.test(r)))].slice(0,8);
  const out={};
  await Promise.all(list.map(async ref=>{
    const t0=Date.now();
    try{
      const content=vision?[{type:'text',text:'Describe esta imagen en una frase: qué forma y qué color ves.'},{type:'image_url',image_url:{url:PROBE_IMAGE}}]:
        'En una sola frase de máximo 25 palabras, escribe un titular publicitario original para un gimnasio de entrenamiento personal en Valladolid.';
      const x=await callExternal(env,ref,[{role:'user',content}],{maxTokens:vision?1500:400,temperature:0.7,timeoutMs:45000});
      out[ref]={ok:true,ms:Date.now()-t0,respuesta:clip(x.text,220)};
    }catch(e){out[ref]={ok:false,ms:Date.now()-t0,estado:e?.status??null,error:scrub(e?.message||e)};}
  }));
  return out;
}
/** Diagnóstico de los tres proveedores: configuración, modelos disponibles y una llamada mínima real. */
export async function diagnoseProviders(env,filters={}){
  const out={};
  // Los tres proveedores se comprueban a la vez para que la página responda rápido.
  await Promise.all(Object.keys(PROVIDERS).map(async name=>{
    const p=PROVIDERS[name];const model=providerModel(env,name);
    const r={proveedor:p.label,secreto:env?.[p.secret]?'presente':'FALTA ('+p.secret+')',modelo:model||'sin configurar ('+p.modelVar+')'};
    const listed=await listModels(env,name,filters[name]||'');
    r.modelos_disponibles=listed.ok?listed.models:[];
    if(!listed.ok)r.error_lista=listed.error;
    if(model&&env?.[p.secret]){
      const t0=Date.now();
      try{const x=await callExternal(env,name+':'+model,[{role:'user',content:'Responde solo con la palabra: OK'}],{maxTokens:200,temperature:0,timeoutMs:40000});
        r.prueba={ok:true,ms:Date.now()-t0,respuesta:clip(x.text,40)};}
      catch(e){r.prueba={ok:false,ms:Date.now()-t0,estado:e?.status??null,error:scrub(e?.message||e)};}
      if(listed.ok&&listed.models.length&&!filters[name]&&!listed.models.includes(model))r.aviso='El modelo configurado no aparece en la lista del proveedor: revisa el nombre.';
    }
    out[name]=r;
  }));
  out.uso={workers_ai:workersAIEnabled(env)?'activado':'desactivado',webs_director_redactor_revisor:modelsFor(env,'plan'),webs_constructores:modelsFor(env,'build'),agentes:modelsFor(env,'agent'),vision:modelsFor(env,'vision'),
    nota:'Listas en STUDIO_WEB_PLAN_MODELS, STUDIO_WEB_BUILD_MODELS y STUDIO_AGENT_MODELS. Si un modelo falla, se pasa al siguiente y por último a Workers AI.'};
  return out;
}
