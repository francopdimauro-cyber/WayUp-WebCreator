import test from 'node:test';
import assert from 'node:assert/strict';
import {notifyLead} from '../src/studio-agent-mail.js';

const LEAD={agentName:'Asistente Ficticio',origin:'https://negocio-ficticio.example',name:'Visitante <b>Demo</b>',email:'visitante@example.com',message:'Hola,\nquiero info <script>x</script>'};
const ok=()=>new Response('{"id":"1"}',{status:200});

test('Sin clave o sin destinatario no se envía nada',async()=>{
  assert.deepEqual(await notifyLead({},LEAD,async()=>{throw Error('no')}),{owner:false,visitor:false});
  assert.deepEqual(await notifyLead({RESEND_API_KEY:'re_x'},LEAD,async()=>{throw Error('no')}),{owner:false,visitor:false});
});

test('Avisa al dueño con Resend, responder-a el visitante y HTML escapado; sin dominio no confirma al visitante',async()=>{
  const sent=[];
  const r=await notifyLead({RESEND_API_KEY:'re_x',LEAD_NOTIFY_EMAIL:'dueno@example.com'},LEAD,async(url,init)=>{sent.push({url,init,body:JSON.parse(init.body)});return ok();});
  assert.deepEqual(r,{owner:true,visitor:false});
  assert.equal(sent.length,1);
  assert.equal(sent[0].url,'https://api.resend.com/emails');
  assert.equal(sent[0].init.headers.Authorization,'Bearer re_x');
  const b=sent[0].body;
  assert.deepEqual(b.to,['dueno@example.com']);assert.equal(b.reply_to,'visitante@example.com');
  assert.equal(b.from,'WAY UP Studio <onboarding@resend.dev>');
  assert.doesNotMatch(b.html,/<script>|<b>Demo/);assert.match(b.html,/&lt;script&gt;/);
});

test('Con dominio verificado y MAIL_CONFIRM_VISITOR=on, también confirma al visitante',async()=>{
  const sent=[];
  const r=await notifyLead({RESEND_API_KEY:'re_x',LEAD_NOTIFY_EMAIL:'dueno@example.com',MAIL_FROM:'Negocio <hola@negocio-ficticio.example>',MAIL_CONFIRM_VISITOR:'on'},LEAD,
    async(url,init)=>{sent.push(JSON.parse(init.body));return ok();});
  assert.deepEqual(r,{owner:true,visitor:true});
  assert.deepEqual(sent[1].to,['visitante@example.com']);assert.equal(sent[1].reply_to,'dueno@example.com');
});

test('Si Resend falla, no rompe el guardado del contacto',async()=>{
  const r=await notifyLead({RESEND_API_KEY:'re_x',LEAD_NOTIFY_EMAIL:'dueno@example.com'},LEAD,async()=>new Response('{}',{status:500}));
  assert.deepEqual(r,{owner:false,visitor:false});
});
