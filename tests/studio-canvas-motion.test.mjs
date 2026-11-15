import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const motion=read('public/studio-canvas-motion.js');
const editor=read('public/studio.js');
const stylesheet=read('public/studio-canvas-motion.css');
const build=read('scripts/build.mjs');
const worker=read('dist/worker.js');

test('Canvas bridge and inspector parse as valid JavaScript',()=>{
 assert.doesNotThrow(()=>new vm.Script(motion,{filename:'studio-canvas-motion.js'}));
 assert.doesNotThrow(()=>new vm.Script(editor,{filename:'studio.js'}));
 assert.match(editor,/WebCreatorCanvasDragBridge\.toString\(\)/);
 assert.match(worker,/wcCanvasMotionGroup/);
 assert.match(worker,/wc-direct-dragging/);
});

function simulation(){
 const handlers=new Map(),messages=[];
 const handlersFor=name=>handlers.get(name)||[];
 const add=(name,fn)=>handlers.set(name,[...handlersFor(name),fn]);
 function emit(name,data){for(const fn of handlersFor(name))fn(data)}
 class Element{
  constructor(tag='div',index=null,parentElement=null){
   this.tagName=tag.toUpperCase();this.index=index;this.parentElement=parentElement;this.attributes=new Map();
   const properties=new Map();
   this.style={
    getPropertyValue:key=>properties.get(key)||'',
    getPropertyPriority:()=>'',setProperty:(key,val)=>properties.set(key,String(val)),
    removeProperty:key=>properties.delete(key)
   };
   this.properties=properties;
   if(index!=null)this.attributes.set('data-wc-index',String(index));
   this.classList={add:()=>{},remove:()=>{}};
  }
  hasAttribute(k){return this.attributes.has(k)}
  getAttribute(k){return this.attributes.get(k)||null}
  setAttribute(k,v){this.attributes.set(k,String(v))}
  closest(query){
   if(query.includes('[contenteditable')||query.includes('input,textarea,select'))return null;
   if(query==='a,button,[role="button"]')return ['A','BUTTON'].includes(this.tagName)?this:null;
   if(query==='[data-wc-index]')return this.hasAttribute('data-wc-index')?this:this.parentElement?.closest(query)||null;
   return null;
  }
  getBoundingClientRect(){return this.rect||{left:50,top:55,right:240,bottom:100,width:190,height:45}}
  setPointerCapture(){}
  addEventListener(){}
  append(){}
 }
 const parentElement=new Element('section');
 const first=new Element('h2',0,parentElement),second=new Element('p',1,parentElement);
 first.rect={left:50,top:55,right:240,bottom:100,width:190,height:45};
 second.rect={left:50,top:110,right:240,bottom:145,width:190,height:35};
 const frameParent={postMessage:v=>messages.push(v)};
 const doc={
  documentElement:new Element('html'),
  head:new Element('head'),
  createElement:tag=>new Element(tag),
  querySelectorAll:()=>[first,second],
  elementFromPoint:()=>second
 };
 const env={window:{},document:doc,parent:frameParent,Element,addEventListener:add,innerWidth:500,innerHeight:400,
  scrollY:0,scrollTo:()=>{},performance:{now:()=>1000},console,Math,Number,String};
 const context=vm.createContext(env);
 vm.runInContext(motion,context,{filename:'motion.js'});
 const bridge=context.window.WebCreatorCanvasDragBridge;
 assert.equal(typeof bridge,'function');
 bridge();
 const pointer=(target,x,y,pointerId=2)=>({pointerId,pointerType:'mouse',button:0,target,clientX:x,clientY:y,
  preventDefault(){},stopImmediatePropagation(){},ctrlKey:false,altKey:false,metaKey:false});
 return {emit,messages,first,second,parentElement,pointer};
}

test('real mouse drag moves a selected text block, snaps and emits a persistent move',()=>{
 const s=simulation();
 s.emit('message',{source:undefined,data:{wcHighlight:true,index:0}});
 // The parent object is intentionally private in the test, but pointer dragging also works without an initial highlight.
 s.emit('pointerdown',s.pointer(s.first,100,80));
 s.emit('pointermove',s.pointer(s.first,135,99));
 s.emit('pointerup',s.pointer(s.first,135,99));
 assert.equal(s.first.properties.get('translate'),'35px 19px');
 assert.ok(s.messages.some(x=>x.type==='select'&&x.index===0));
 assert.ok(s.messages.some(x=>x.type==='move'&&x.index===0&&x.x===35&&x.y===19));
});
test('no movement means no persisted edit and pointer-cancel restores prior position',()=>{
 const s=simulation();
 s.first.style.setProperty('translate','8px 16px');
 s.emit('pointerdown',s.pointer(s.first,100,80));
 s.emit('pointerup',s.pointer(s.first,101,81));
 assert.ok(!s.messages.some(x=>x.type==='move'));
 s.emit('pointerdown',s.pointer(s.first,100,80,3));
 s.emit('pointermove',s.pointer(s.first,120,100,3));
 s.emit('pointercancel',s.pointer(s.first,120,100,3));
 assert.equal(s.first.properties.get('translate'),'8px 16px');
 assert.ok(!s.messages.some(x=>x.type==='move'));
});
test('parent accepts drag and reorder messages only with verified source and in-range indices',()=>{
 assert.match(editor,/e\.source!==el\('wcFrame'\)\.contentWindow/);
 assert.match(editor,/Number\.isInteger\(x\)/);
 assert.match(editor,/Math\.abs\(x\)>1800/);
 assert.match(editor,/node\.parentElement!==target\.parentElement/);
 assert.match(editor,/target\.parentElement\.insertBefore/);
 assert.match(editor,/data-wc-original-translate/);
 assert.match(editor,/selectIndex\(nextIndex\)/);
 assert.match(editor,/refreshCanvasSelection:highlight/);
});
test('drag uses pointer events, touch-safe handles, safe sibling reordering, undo and scrolling recovery',()=>{
 assert.match(motion,/addEventListener\('pointerdown'/);
 assert.match(motion,/addEventListener\('pointermove'/);
 assert.match(motion,/addEventListener\('pointerup'/);
 assert.match(motion,/event\.pointerType==='touch'/);
 assert.match(motion,/data-wc-index/);
 assert.match(motion,/target\.parentElement===node\.parentElement/);
 assert.match(motion,/send\('reorder'/);
 assert.match(motion,/wcRestoreScroll/);
 assert.match(editor,/state\.canvasScrollY/);
 assert.match(editor,/wcRestoreScroll:true/);
 assert.match(editor,/update\(\(\)=>/);
});
test('positioning works with exact coordinates, grid toggle, reset, and semantic DOM order',()=>{
 for(const id of ['wcCanvasMotionGroup','wcMotionMode','wcMotionSnap','wcMotionX','wcMotionY',
  'wcMotionApply','wcMotionReset','wcMotionUp','wcMotionDown','wcMotionNotice']){
  assert.ok(motion.includes(id),id);
 }
 assert.match(motion,/studio\.change\(/);
 assert.match(motion,/wcDragSnap/);
 assert.match(editor,/wcDragSnap:motion\.snap\|\|0/);
 assert.match(motion,/data-wc-original-translate/);
 assert.match(motion,/style\.removeProperty\('translate'\)/);
 assert.match(stylesheet,/#wcStudio #wcCanvasMotionGroup/);
});
test('bundler keeps controls inside Studio and does not alter the AI backend',()=>{
 assert.match(build,/canvasMotionJs=read\('public\/studio-canvas-motion\.js'\)/);
 assert.match(build,/canvasMotionCss=read\('public\/studio-canvas-motion\.css'\)/);
 assert.match(build,/\+buttonLibraryJs\+'\\n<\/script><script>\\n'\+canvasMotionJs/);
 assert.match(worker,/window\.WebCreatorCanvasDragBridge/);
 assert.match(worker,/wcButtonStylesGroup/);
 assert.match(worker,/wcFontSearch/);
 assert.doesNotMatch(motion,/fetch\s*\(/);
 assert.doesNotMatch(motion,/\/api\//);
});
