import test from 'node:test';
import assert from 'node:assert/strict';
import {openversePhoto,openverseSearch,openverseGet,openverseCredit} from '../src/studio-openverse.js';

const ID='11111111-2222-4333-8444-555555555555';
const HIT={id:ID,url:'https://fotos.example/a.jpg',creator:'Autora Ficticia',license:'by',license_version:'4.0',foreign_landing_url:'https://fotos.example/pagina',width:1600,height:1000,tags:[{name:'playa'}]};
const json=b=>new Response(JSON.stringify(b),{status:200,headers:{'Content-Type':'application/json'}});
const jpeg=()=>new Response(new Uint8Array(5000),{status:200,headers:{'Content-Type':'image/jpeg'}});

test('Solo pide licencias comerciales y modificables, y guarda autoría y licencia',async()=>{
  const urls=[];
  const r=await openversePhoto('sunny beach with palm trees',async u=>{urls.push(u);return /api\.openverse\.org\/v1\/images\/\?/.test(u)?json({results:[HIT]}):jpeg();});
  assert.match(urls[0],/license_type=commercial,modification/);assert.match(urls[0],/mature=false/);
  assert.equal(r.source,'openverse');assert.match(r.image,/^data:image\/jpeg;base64,/);
  assert.equal(r.credit,'Foto de Autora Ficticia · CC BY 4.0 · vía Openverse');assert.equal(r.link,'https://fotos.example/pagina');
  assert.equal(openverseCredit({creator:'X',license:'cc0'}),'Foto de X · dominio público · vía Openverse');
});

test('Buscador: ids «ov:» con miniatura de Openverse; si falla, lista vacía',async()=>{
  const list=await openverseSearch('playa','horizontal',async u=>(assert.match(u,/aspect_ratio=wide/),json({results:[HIT,{id:'malo',url:'http://x'}]})));
  assert.equal(list.length,1);assert.equal(list[0].id,'ov:'+ID);assert.match(list[0].thumb,/\/v1\/images\/1111.*\/thumb\/$/);
  assert.deepEqual(await openverseSearch('x',undefined,async()=>new Response('',{status:500})),[]);
});

test('Descarga elegida: vuelve a comprobar la licencia en el servidor',async()=>{
  const ok=await openverseGet('ov:'+ID,async u=>/fotos\.example/.test(u)?jpeg():json(HIT));
  assert.equal(ok.source,'openverse');
  await assert.rejects(openverseGet('ov:'+ID,async()=>json({...HIT,license:'by-nc'})),/licencia/);
  await assert.rejects(openverseGet('ov:../../etc',async()=>json(HIT)),/no válida/);
});
