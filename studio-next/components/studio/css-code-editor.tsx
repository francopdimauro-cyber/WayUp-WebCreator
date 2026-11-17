'use client';
import React,{useRef,useState,type ReactNode} from 'react';
import {Braces,ChevronDown,Command,Lightbulb,AlertCircle,CheckCircle2} from 'lucide-react';

type Props={value:string;onChange(value:string):void;error:string|null};
const PROPERTIES=[
  'display','position','width','height','min-width','max-width','min-height','max-height',
  'margin','padding','gap','color','background','background-color','background-image',
  'font-family','font-size','font-weight','line-height','letter-spacing','text-align',
  'border','border-radius','box-shadow','opacity','overflow','z-index','top','right','bottom','left',
  'flex-direction','flex-wrap','justify-content','align-items','grid-template-columns','grid-template-rows',
  'object-fit','object-position','transform','transition','animation','cursor','filter','aspect-ratio'
];
const TOKEN=/(\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[a-z-]+|#[\da-f]{3,8}\b|!important|\b[a-z-]+(?=\s*:)|[{}:;,]|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|vmin|vmax|%)\b)/gi;
function tokenClass(token:string):string{
  if(token.startsWith('/*'))return 'text-[#8492a6] italic';
  if(token.startsWith('"')||token.startsWith("'"))return 'text-[#d7a6ff]';
  if(token.startsWith('@'))return 'text-[#e5a6ff]';
  if(token.startsWith('#'))return 'text-[#a7d7a1]';
  if(token==='!important')return 'text-[#ffb86b]';
  if(/^[a-z-]+$/i.test(token))return 'text-[#8fc9ff]';
  if(/^[{}:;,]$/.test(token))return 'text-[#d2d9e5]';
  return 'text-[#e8c58b]';
}
function highlightLine(line:string):ReactNode[]{
  const out:ReactNode[]=[];let last=0,index=0;TOKEN.lastIndex=0;
  for(let match=TOKEN.exec(line);match;match=TOKEN.exec(line)){
    if(match.index>last)out.push(<React.Fragment key={'t'+index++}>{line.slice(last,match.index)}</React.Fragment>);
    out.push(<span key={'h'+index++} className={tokenClass(match[0])}>{match[0]}</span>);
    last=match.index+match[0].length;
  }
  if(last<line.length)out.push(<React.Fragment key={'t'+index}>{line.slice(last)}</React.Fragment>);
  return out;
}
export function CssCodeEditor({value,onChange,error}:Props){
  const editor=useRef<HTMLTextAreaElement>(null),highlight=useRef<HTMLPreElement>(null),gutter=useRef<HTMLDivElement>(null);
  const [completionOpen,setCompletionOpen]=useState(false);
  const [completionFilter,setCompletionFilter]=useState('');
  const lines=value.split('\n');
  const suggestions=PROPERTIES.filter(p=>p.includes(completionFilter.toLowerCase())).slice(0,16);
  const syncScroll=()=>{const el=editor.current;if(!el)return;if(highlight.current){highlight.current.scrollTop=el.scrollTop;highlight.current.scrollLeft=el.scrollLeft;}if(gutter.current)gutter.current.scrollTop=el.scrollTop;};
  const insertProperty=(property:string)=>{
    const el=editor.current;if(!el)return;
    const start=el.selectionStart,end=el.selectionEnd;
    const before=value.slice(0,start),match=before.match(/[a-z-]*$/i),from=start-(match?.[0].length||0);
    const insert=property+': ';
    const next=value.slice(0,from)+insert+value.slice(end);
    onChange(next);setCompletionOpen(false);setCompletionFilter('');
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(from+insert.length,from+insert.length);});
  };
  const keyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if((e.ctrlKey||e.metaKey)&&e.code==='Space'){
      e.preventDefault();const before=value.slice(0,e.currentTarget.selectionStart);
      setCompletionFilter(before.match(/[a-z-]*$/i)?.[0]||'');setCompletionOpen(true);return;
    }
    if(e.key==='Escape'&&completionOpen){e.preventDefault();setCompletionOpen(false);return;}
    if(e.key==='Tab'){
      e.preventDefault();const el=e.currentTarget,start=el.selectionStart,end=el.selectionEnd;
      const next=value.slice(0,start)+'  '+value.slice(end);onChange(next);
      requestAnimationFrame(()=>{el.focus();el.setSelectionRange(start+2,start+2);});return;
    }
    if(e.key==='Enter'){
      const el=e.currentTarget,start=el.selectionStart,end=el.selectionEnd;
      const lineStart=value.lastIndexOf('\n',start-1)+1;
      const current=value.slice(lineStart,start);
      const indent=current.match(/^\s*/)?.[0]||'';
      const extra=current.trimEnd().endsWith('{')?'  ':'';
      const insert='\n'+indent+extra;
      e.preventDefault();onChange(value.slice(0,start)+insert+value.slice(end));
      requestAnimationFrame(()=>{el.focus();el.setSelectionRange(start+insert.length,start+insert.length);});
    }
  };
  return <div className="flex min-h-0 flex-1 flex-col bg-[#10141c]">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#151b26] px-4 py-2 text-[11px] text-[#b6c3d7]">
      <span className="inline-flex items-center gap-2"><Braces size={14} className="text-[#91aaff]"/> CSS personalizado <span className="text-[#78869a]">· {value.length.toLocaleString('es-ES')} caracteres</span></span>
      <button type="button" onClick={()=>{setCompletionOpen(v=>!v);setCompletionFilter('');editor.current?.focus();}} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[10px] hover:bg-white/5" title="Sugerencias CSS · Ctrl+Espacio"><Lightbulb size={12}/> Autocompletar <kbd className="font-mono text-[#8392aa]">Ctrl+Espacio</kbd></button>
    </div>
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={gutter} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[52px] overflow-hidden border-r border-white/5 bg-[#0d1119] px-2.5 pt-4 text-right font-mono text-[12px] leading-6 text-[#5f6d82]">
        {lines.map((_,i)=><div key={i}>{i+1}</div>)}
      </div>
      <pre ref={highlight} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre py-4 pl-[68px] pr-5 font-mono text-[12px] leading-6 text-[#dce6f5] [tab-size:2]">
        {lines.map((line,i)=><React.Fragment key={i}>{highlightLine(line)}{i<lines.length-1?'\n':''}</React.Fragment>)}
      </pre>
      <textarea ref={editor} aria-label="Editor de código CSS" spellCheck={false} wrap="off" value={value}
        onChange={e=>{onChange(e.target.value);setCompletionOpen(false);}}
        onKeyDown={keyDown} onScroll={syncScroll}
        className="scroll-subtle absolute inset-0 z-[2] h-full w-full resize-none overflow-auto whitespace-pre bg-transparent py-4 pl-[68px] pr-5 font-mono text-[12px] leading-6 text-transparent caret-[#f2f6ff] outline-none selection:bg-[#587cff]/35"
        style={{WebkitTextFillColor:'transparent',tabSize:2}} />
      {completionOpen&&<div className="absolute right-4 top-3 z-[5] w-[230px] overflow-hidden rounded-lg border border-[#34445e] bg-[#182131] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] font-semibold text-[#c7d4e8]"><span>Propiedades CSS</span><button type="button" onClick={()=>setCompletionOpen(false)} aria-label="Cerrar sugerencias"><ChevronDown size={13}/></button></div>
        <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto p-2">
          {suggestions.map(p=><button key={p} type="button" onClick={()=>insertProperty(p)} className="rounded px-2 py-1.5 text-left font-mono text-[10px] text-[#c9dcff] hover:bg-[#2b3b55]">{p}</button>)}
          {!suggestions.length&&<p className="col-span-2 p-2 text-[10px] text-[#a7b4c9]">No hay sugerencias para este texto.</p>}
        </div>
      </div>}
    </div>
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#151b26] px-4 py-2 text-[10px]">
      <span className="text-[#8d9bb0]">{lines.length} líneas · Tab inserta sangría · Intro conserva la indentación</span>
      {error?<span role="alert" className="inline-flex items-center gap-1.5 text-[#ff8d91]"><AlertCircle size={12}/>{error}</span>
        :<span className="inline-flex items-center gap-1.5 text-[#9bcda6]"><CheckCircle2 size={12}/> Estructura CSS correcta</span>}
    </div>
  </div>;
}
