/** Exportación de agentes en ZIP: guardarlo, reutilizarlo y añadirlo a cualquier web o app.
 *  - agentZip: ZIP del propio agente (configuración, código para insertar, demo y LÉEME).
 *  - injectAgentIntoWebZip: devuelve el ZIP de una web con el chat del agente en todas sus páginas. */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { agentSnippet } from './web-project-files';

export type ExportableAgent = {
  id: string; name: string; description?: string; role: string; objective: string; instructions: string;
  knowledge?: string; tools?: string[]; status?: string;
};
export type AgentChat = { chatId: string; origin: string } | null;

const esc = (v: string) => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const slug = (v: string) => String(v || 'agente').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'agente';
export const agentZipName = (a: ExportableAgent) => 'agente-' + slug(a.name) + '.zip';

export function agentZip(agent: ExportableAgent, chat: AgentChat): Uint8Array {
  const snippet = chat ? agentSnippet(chat.chatId) : '';
  const config = {
    formato: 'wayup-agent-v1', exportado: new Date().toISOString(),
    agente: { id: agent.id, nombre: agent.name, descripcion: agent.description || '', rol: agent.role, objetivo: agent.objective,
      instrucciones: agent.instructions, conocimiento: agent.knowledge || '', permisos: agent.tools || ['text_generation'], estado: agent.status || '' },
    chat_publicado: chat ? { id: chat.chatId, dominio_autorizado: chat.origin, codigo: snippet } : null
  };
  const files: Record<string, Uint8Array> = { 'agente.json': strToU8(JSON.stringify(config, null, 2)) };
  if (chat) {
    files['insertar-en-tu-web.html'] = strToU8(
      '<!-- Asistente IA «' + esc(agent.name) + '» · WayUp Studio\n' +
      '     Pega esta línea justo antes de </body> en cada página donde quieras el chat.\n' +
      '     Solo responde en el dominio autorizado: ' + chat.origin + ' -->\n' + snippet + '\n');
    files['demo.html'] = strToU8('<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Demo · ' + esc(agent.name) + '</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:60px auto;padding:0 20px;line-height:1.6;color:#1c1c1c}code{background:#f2f2f2;padding:2px 6px;border-radius:4px}</style></head><body>' +
      '<h1>' + esc(agent.name) + '</h1><p>Página de demostración del asistente. El botón del chat aparece abajo a la derecha.</p>' +
      (chat.origin
        ? '<p><strong>Importante:</strong> por seguridad, el chat solo responde cuando esta página se sirve desde <code>' + esc(chat.origin) + '</code>. Desde otro dominio, el botón indicará «Asistente no disponible».</p>\n'
        : '<p><strong>Modo prueba:</strong> este chat aún no tiene dominio, así que solo responde al abrir esta página en tu ordenador (máx. 40 mensajes al día). Para publicarlo, añade el dominio en WAY UP Studio › Agente IA.</p>\n') +
      '<p>Si el botón indica «Asistente no disponible», comprueba en WAY UP Studio › Agentes IA que el agente está <strong>activo</strong> (no en pausa).</p>\n' +
      snippet + '\n</body></html>\n');
  }
  files['LEEME.txt'] = strToU8([
    'ASISTENTE IA «' + agent.name + '» · WAYUP STUDIO', '',
    'CONTENIDO', '- agente.json: configuración completa (rol, objetivo, instrucciones, conocimiento y permisos). Guárdala como copia o para recrear el agente.',
    chat ? '- insertar-en-tu-web.html: la línea de código que añade el chat a cualquier web o app web.' : '',
    chat ? '- demo.html: página de prueba con el chat ya puesto.' : '', '',
    chat ? 'CÓMO AÑADIRLO A UNA WEB' : 'CÓMO PUBLICARLO',
    ...(chat ? ['1. Abre el HTML de cada página donde quieras el chat.', '2. Pega el contenido de insertar-en-tu-web.html justo antes de </body>.',
      '3. Publica la web en ' + chat.origin + ' (HTTPS). El chat solo responde desde ese dominio.', '',
      'También puedes hacerlo automáticamente en WayUp Studio: paso «Agente IA» → «Añadir a una web (ZIP)».']
      : ['Este agente aún no tiene chat publicado. En WayUp Studio, paso «Agente IA», escribe el dominio HTTPS y pulsa', '«Activar agente y vincularlo a la web» y vuelve a descargar el ZIP: incluirá el código para insertarlo.']),
    '', 'SEGURIDAD', '- El ZIP no contiene ninguna clave de IA: el chat funciona a través de WayUp Studio.',
    '- Las respuestas del asistente se muestran como texto con formato; nunca se ejecuta código que venga del modelo.'
  ].filter(l => l !== '').join('\n').replace(/\n(CONTENIDO|CÓMO|SEGURIDAD)/g, '\n\n$1') + '\n');
  return zipSync(files, { level: 6 });
}

/** Añade el chat a todas las páginas HTML de una web en ZIP. Devuelve el ZIP nuevo y cuántas páginas se tocaron. */
export function injectAgentIntoWebZip(input: Uint8Array, chatId: string, agentName: string): { zip: Uint8Array; pages: number; already: number } {
  if (input.byteLength > 25_000_000) throw Error('El ZIP supera 25 MB.');
  const snippet = agentSnippet(chatId);
  let total = 0;
  const files = unzipSync(input, { filter: f => { total += f.originalSize; if (total > 120_000_000) throw Error('El ZIP descomprimido es demasiado grande.'); return true; } });
  const names = Object.keys(files).filter(n => !n.endsWith('/'));
  if (names.some(n => n.includes('..') || n.startsWith('/'))) throw Error('El ZIP contiene rutas no permitidas.');
  const pages = names.filter(n => /\.html?$/i.test(n) && !/(^|\/)__macosx\//i.test(n));
  if (!pages.length) throw Error('El ZIP no contiene páginas HTML.');
  let changed = 0, already = 0;
  for (const name of pages) {
    const html = strFromU8(files[name]);
    if (html.includes('data-chat="' + chatId + '"')) { already++; continue; }
    // Si ya llevaba un asistente de WayUp, se sustituye (nunca dos chats a la vez).
    const clean = html.replace(/\s*<!--\s*Asistente (?:IA|de WayUp)[^>]*-->\s*<script src="https:\/\/[a-z0-9.-]+\.workers\.dev\/widget\.js" data-chat="[0-9a-f-]{36}" defer><\/script>/gi, '');
    const block = '\n<!-- Asistente IA · ' + agentName.replace(/--/g, '-').slice(0, 80) + ' · WayUp Studio -->\n' + snippet + '\n';
    const out = /<\/body\s*>/i.test(clean) ? clean.replace(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i, block + '</body>') : clean + block;
    files[name] = strToU8(out); changed++;
  }
  return { zip: zipSync(files, { level: 6 }), pages: changed, already };
}
