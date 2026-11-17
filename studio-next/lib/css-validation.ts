/**
 * Validación defensiva del CSS personalizado de una web.
 * No intenta sustituir a un parser completo: detecta errores estructurales y bloquea
 * cargas externas/imports y construcciones activas antes de aplicar el código al proyecto.
 */
export function validateCssSource(source:string):string|null{
  if(source.length>50_000)return 'El CSS supera el límite de 50.000 caracteres.';
  if(/<\/?\s*style\b/i.test(source))return 'No incluyas etiquetas <style>: escribe únicamente reglas CSS.';
  if(/@import\b/i.test(source))return 'Las reglas @import están desactivadas. Añade los estilos al propio editor.';
  if(/expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|<\s*script\b/i.test(source))
    return 'El CSS contiene una construcción no permitida.';
  const urls=source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi);
  for(const match of urls){
    const value=(match[1]??match[2]??match[3]??'').trim();
    if(!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value))
      return 'No se permiten recursos externos en CSS. Utiliza imágenes incorporadas al proyecto.';
  }
  const stack:{char:string;line:number;column:number}[]=[];
  let quote='',comment=false,escaped=false,line=1,column=0;
  for(let i=0;i<source.length;i++){
    const ch=source[i],next=source[i+1]||'';
    column++;
    if(ch==='\n'){line++;column=0;}
    if(comment){
      if(ch==='*'&&next==='/'){comment=false;i++;column++;}
      continue;
    }
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==='/'&&next==='*'){comment=true;i++;column++;continue;}
    if(ch==='"'||ch==="'"){quote=ch;continue;}
    if(ch==='{'||ch==='('||ch==='['){stack.push({char:ch,line,column});continue;}
    if(ch==='}'||ch===')'||ch===']'){
      const top=stack.pop();
      const expected=ch==='}'?'{':ch===')'?'(': '[';
      if(!top||top.char!==expected)return 'Cierre inesperado «'+ch+'» en la línea '+line+'.';
    }
  }
  if(comment)return 'Hay un comentario CSS sin cerrar.';
  if(quote)return 'Hay una cadena CSS sin cerrar.';
  if(stack.length){
    const open=stack[stack.length-1];
    return 'Falta cerrar «'+open.char+'» abierto en la línea '+open.line+'.';
  }
  return null;
}
