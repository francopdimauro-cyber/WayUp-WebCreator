import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const studio=readFileSync(new URL('../public/studio.js',import.meta.url),'utf8');

test('source code changes count as unsaved before being applied',()=>{
 assert.match(studio,/function hasRawCodeChanges\(\)/);
 assert.match(studio,/wcSourceCode'\)\.addEventListener\('input',sync\)/);
 assert.match(studio,/const pending=state\.dirty\|\|hasRawCodeChanges\(\)/);
 assert.match(studio,/state\.dirty\|\|hasRawCodeChanges\(\)/);
 assert.match(studio,/source\.classList\.remove\('wc-hidden'\);return/);
});
test('save is serialized and preserves newer changes',()=>{
 assert.match(studio,/if\(state\.saving\)return status\('El proyecto ya se está guardando\.'/);
 assert.match(studio,/state\.saving=true;state\.loadSeq\+\+;sync\(\)/);
 assert.match(studio,/const projectId=state\.id,expectedVersion=state\.version,html=serialize\(state\.doc\)/);
 assert.match(studio,/if\(serialize\(state\.doc\)===html\)\{state\.undo=\[\];state\.redo=\[\]\}/);
 assert.match(studio,/finally\{state\.saving=false;sync\(\)\}/);
});
test('last project opening wins and closing invalidates pending loads',()=>{
 assert.match(studio,/const ticket=\+\+state\.loadSeq/);
 assert.match(studio,/if\(ticket!==state\.loadSeq\|\|state\.saving\)return/);
 assert.match(studio,/function close\(\)/);
 assert.match(studio,/state\.loadSeq\+\+/);
});
test('source edits survive rendering until explicitly applied or discarded',()=>{
 assert.doesNotThrow(()=>new vm.Script(studio,{filename:'studio.js'}));
 assert.match(studio,/if\(state\.code\)el\('wcSourceCode'\)\.value=serialize\(state\.doc\)/);
 assert.match(studio,/el\('wcSourceCode'\)\.value=serialize\(state\.doc\);sync\(\)/);
});
