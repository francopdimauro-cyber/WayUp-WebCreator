import test from 'node:test';
import assert from 'node:assert/strict';
import {serperSearch} from '../src/studio-agent-serper.js';
import {webSearch} from '../src/studio-agent-brain.js';

const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json'}});
const GOOGLE={sportsResults:{title:'Club Ficticio',games:[{date:'15 nov',league:'Liga Ficticia',teams:[{name:'Club Ficticio',score:'2'},{name:'Rival',score:'1'}],status:'Final'}]},
  answerBox:{answer:'Club Ficticio 2-1 Rival',link:'https://diario.example/cronica'},
  organic:[{title:'Crónica',link:'https://diario.example/cronica',snippet:'Victoria por 2-1.',date:'hace 2 días'},{title:'Post',link:'https://www.facebook.com/x',snippet:'ruido'}]};

test('Serper: ficha deportiva, respuesta destacada, sin redes sociales y clave en cabecera',async()=>{
  const seen=[];
  const t=await serperSearch({SERPER_API_KEY:'k'},'Club Ficticio resultado',async(u,init)=>{seen.push({u,init,body:JSON.parse(init.body)});return json(GOOGLE);});
  assert.match(t,/FICHA DEPORTIVA DE GOOGLE[\s\S]*15 nov · Liga Ficticia · Club Ficticio 2 – Rival 1 · Final/);
  assert.match(t,/RESPUESTA DESTACADA DE GOOGLE \[diario\.example\]: Club Ficticio 2-1 Rival/);
  assert.doesNotMatch(t,/facebook/);
  assert.equal(seen[0].u,'https://google.serper.dev/search');assert.equal(seen[0].init.headers['X-API-KEY'],'k');
  assert.equal(seen[0].body.gl,'es');
});

test('Si Tavily falla (cupo agotado), la búsqueda web pasa a Serper',async()=>{
  const t=await webSearch({TAVILY_API_KEY:'t',SERPER_API_KEY:'s'},'algo',async u=>/tavily/.test(u)?new Response('{}',{status:432}):json(GOOGLE));
  assert.match(t,/RESPUESTA DESTACADA DE GOOGLE/);
  const solo=await webSearch({SERPER_API_KEY:'s'},'algo',async()=>json(GOOGLE));
  assert.match(solo,/Club Ficticio/);
});
