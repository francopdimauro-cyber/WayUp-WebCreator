import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherData,holidayData,currencyData,wikipediaData} from '../src/studio-agent-data.js';
import {agentAnswer} from '../src/studio-agent-brain.js';

const json=b=>new Response(JSON.stringify(b),{status:200,headers:{'Content-Type':'application/json'}});

test('Tiempo: geocodifica la localidad y resume la previsión en castellano',async()=>{
  const urls=[];
  const f=async u=>{urls.push(u);return /geocoding/.test(u)?json({results:[{name:'Valladolid',admin1:'Castilla y León',latitude:41.6,longitude:-4.7}]}):
    json({current:{temperature_2m:12.4,weather_code:61},daily:{time:['2026-11-18'],weather_code:[3],temperature_2m_min:[4],temperature_2m_max:[13],precipitation_probability_max:[40]}});};
  const t=await weatherData('Valladolid',f);
  assert.match(t,/Valladolid \(Castilla y León\): ahora 12 °C, lluvia débil/);
  assert.match(t,/2026-11-18: nublado, 4–13 °C, lluvia 40 %/);
  assert.match(urls[1],/latitude=41\.6&longitude=-4\.7/);
});

test('Festivos: nacionales y de la comunidad nombrada, solo los que quedan',async()=>{
  const f=async()=>json([{date:'2026-01-01',localName:'Año Nuevo',counties:null},{date:'2026-12-08',localName:'Inmaculada',counties:null},
    {date:'2026-12-09',localName:'Fiesta solo de Madrid',counties:['ES-MD']},{date:'2026-12-10',localName:'Fiesta de Cataluña',counties:['ES-CT']}]);
  const t=await holidayData('festivos en Madrid',f,new Date('2026-11-18T10:00:00Z'));
  assert.match(t,/Inmaculada/);assert.match(t,/solo de Madrid/);
  assert.doesNotMatch(t,/Año Nuevo/);assert.doesNotMatch(t,/Cataluña/);
});

test('Divisas y Wikipedia',async()=>{
  const c=await currencyData('100 EUR USD',async u=>{assert.match(u,/amount=100&from=EUR&to=USD/);return json({rates:{USD:108.2},date:'2026-11-17'});});
  assert.equal(c,'100 EUR USD'.replace(' USD','')+' = 108.2 USD (tipo del Banco Central Europeo, 2026-11-17).');
  const w=await wikipediaData('Acueducto de Segovia',async u=>/search/.test(u)?json({pages:[{key:'Acueducto_de_Segovia'}]}):
    json({title:'Acueducto de Segovia',extract:'Construcción romana.',content_urls:{desktop:{page:'https://es.wikipedia.org/wiki/Acueducto_de_Segovia'}}}));
  assert.match(w,/Acueducto de Segovia: Construcción romana\.\nFuente: https/);
});

test('El agente usa TIEMPO solo si tiene «data_apis» activado',async()=>{
  const agent={name:'A',role:'r',objective:'o',instructions:'',knowledge:''};
  const calls=[];
  const call=async m=>{calls.push(m);return calls.length===1?'TIEMPO: Valladolid':'Mañana, **nublado**.';};
  const f=async u=>/geocoding/.test(u)?json({results:[{name:'Valladolid',latitude:1,longitude:2}]}):json({current:{temperature_2m:10,weather_code:3},daily:{}});
  assert.equal(await agentAnswer({},agent,{message:'¿Qué tiempo hará?',tools:['data_apis']},call,f),'Mañana, **nublado**.');
  assert.match(calls[0][0].content,/TIEMPO: <localidad>/);
  assert.match(calls[1].at(-1).content,/RESULTADOS DE OPEN-METEO/);
});
