import test from 'node:test';
import assert from 'node:assert/strict';
import {footballTeam,footballStandings,basketballTeam} from '../src/studio-agent-sports.js';
import {agentAnswer} from '../src/studio-agent-brain.js';

const json=b=>new Response(JSON.stringify(b),{status:200,headers:{'Content-Type':'application/json'}});
const ENV={APISPORTS_KEY:'clave-ficticia'};

test('Fútbol: equipo con forma, últimos resultados y próximos partidos; clave en cabecera',async()=>{
  const seen=[];
  const f=async(url,init)=>{seen.push({url,init});
    if(/\/teams\?search=/.test(url))return json({response:[{team:{id:7,name:'Club Ficticio'}}]});
    if(/last=5/.test(url))return json({response:[{fixture:{date:'2026-11-10T20:00:00Z'},league:{name:'Liga Ficticia'},teams:{home:{id:7,name:'Club Ficticio',winner:true},away:{id:9,name:'Rival',winner:false}},goals:{home:2,away:0}}]});
    return json({response:[{fixture:{date:'2026-11-22T18:00:00Z'},league:{name:'Liga Ficticia'},teams:{home:{id:9,name:'Rival'},away:{id:7,name:'Club Ficticio'}},goals:{}}]});};
  const t=await footballTeam(ENV,'Club Ficticio',f);
  assert.match(t,/forma en los últimos 5.*: G/);
  assert.match(t,/2026-11-10 · Liga Ficticia · Club Ficticio 2-0 Rival/);
  assert.match(t,/Próximos partidos:\n2026-11-22 · Liga Ficticia · Rival vs Club Ficticio/);
  assert.equal(seen[0].init.headers['x-apisports-key'],'clave-ficticia');
  assert.match(seen[0].url,/^https:\/\/v3\.football\.api-sports\.io\/teams/);
});

test('Fútbol: clasificación de la temporada actual',async()=>{
  const f=async url=>/\/leagues/.test(url)?json({response:[{league:{id:140,name:'Liga Ficticia'},seasons:[{year:2025,current:false},{year:2026,current:true}]}]}):
    (assert.match(url,/league=140&season=2026/),json({response:[{league:{standings:[[{rank:1,team:{name:'Club Ficticio'},points:30,all:{played:12},form:'GGEGP'}]]}}]}));
  assert.match(await footballStandings(ENV,'Liga Ficticia',f),/1\. Club Ficticio — 30 pts, 12 PJ, racha GGEGP/);
});

test('Cupo agotado o plan sin acceso: error claro; sin clave no se consulta',async()=>{
  await assert.rejects(footballTeam(ENV,'x',async()=>json({errors:{requests:'You have reached the request limit for the day'},response:[]})),/request limit/);
  await assert.rejects(footballTeam({},'x',async()=>{throw Error('no')}),/no configurados/);
});

test('Baloncesto: temporada en curso y resultados',async()=>{
  const f=async url=>/\/teams/.test(url)?json({response:[{id:3,name:'Basket Ficticio'}]}):(assert.match(url,/season=2026-2027/),
    json({response:[{date:'2026-11-01T19:00:00Z',teams:{home:{name:'Basket Ficticio'},away:{name:'Rival'}},scores:{home:{total:88},away:{total:80}}},{date:'2026-12-01T19:00:00Z',teams:{home:{name:'Rival'},away:{name:'Basket Ficticio'}},scores:{home:{total:null},away:{total:null}}}]}));
  const t=await basketballTeam(ENV,'Basket Ficticio',f,new Date('2026-11-18T10:00:00Z'));
  assert.match(t,/2026-11-01 · Basket Ficticio 88-80 Rival/);assert.match(t,/2026-12-01 · Rival vs Basket Ficticio/);
});

test('El agente usa FUTBOL_EQUIPO solo con «sports_data» activado',async()=>{
  const agent={name:'A',role:'r',objective:'o',instructions:'',knowledge:''};
  const calls=[];const call=async m=>{calls.push(m);return calls.length===1?'FUTBOL_EQUIPO: Club Ficticio':'Viene de **ganar 2-0**.';};
  const f=async url=>/\/teams/.test(url)?json({response:[{team:{id:7,name:'Club Ficticio'}}]}):json({response:[]});
  assert.equal(await agentAnswer(ENV,agent,{message:'¿Cómo llega el Club Ficticio?',tools:['sports_data']},call,f),'Viene de **ganar 2-0**.');
  assert.match(calls[0][0].content,/FUTBOL_CLASIFICACION/);assert.match(calls[1].at(-1).content,/RESULTADOS DE API-FOOTBALL \(EQUIPO\)/);
});
