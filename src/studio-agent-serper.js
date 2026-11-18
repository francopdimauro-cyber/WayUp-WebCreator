/* WAY UP Studio · Serper.dev (resultados de Google) como segundo buscador de los agentes.
   Secreto SERPER_API_KEY. Aporta la «ficha deportiva» de Google (marcadores y próximos partidos), la respuesta
   destacada y el panel de información, además de los resultados normales y de noticias. */

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'web'; } };
const SOCIAL = /(^|\.)(facebook|instagram|x|twitter|tiktok|youtube|reddit|pinterest|threads)\.(com|net)$/i;

/** Ficha deportiva de Google («sportsResults»): partidos con marcador, fecha y competición. */
function sportsBlock(s) {
  if (!s) return '';
  const games = (Array.isArray(s.games) ? s.games : []).slice(0, 6).map(g => {
    const teams = (g.teams || []).map(t => clip(t.name, 40) + (t.score != null && t.score !== '' ? ' ' + clip(t.score, 6) : '')).join(' – ');
    return '· ' + [clip(g.date, 40), clip(g.league || g.tournament, 60), teams, clip(g.status, 30)].filter(Boolean).join(' · ');
  });
  return games.length ? 'FICHA DEPORTIVA DE GOOGLE' + (s.title ? ' (' + clip(s.title, 80) + ')' : '') + ':\n' + games.join('\n') + '\n\n' : '';
}

export async function serperSearch(env, query, fetcher = fetch, { news = false } = {}) {
  if (!env?.SERPER_API_KEY) throw Error('Serper no configurado');
  const r = await fetcher('https://google.serper.dev/' + (news ? 'news' : 'search'), { method: 'POST', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': env.SERPER_API_KEY },
    body: JSON.stringify({ q: clip(query, 200), gl: 'es', hl: 'es', num: 8, ...(news ? { tbs: 'qdr:w' } : {}) }) });
  if (!r.ok) throw Error('Serper ' + r.status);
  const b = await r.json();
  const ab = b.answerBox, kg = b.knowledgeGraph;
  const answer = ab ? 'RESPUESTA DESTACADA DE GOOGLE' + (ab.link ? ' [' + host(ab.link) + ']' : '') + ': ' + clip(ab.answer || ab.snippet || ab.title, 500) + '\n\n' : '';
  const panel = kg && (kg.description || kg.title) ? 'PANEL DE GOOGLE: ' + clip(kg.title, 80) + (kg.description ? ' — ' + clip(kg.description, 300) : '') + '\n\n' : '';
  const items = (news ? b.news : b.organic) || [];
  const list = items.filter(h => h?.link && !SOCIAL.test(host(h.link))).slice(0, 6)
    .map((h, i) => (i + 1) + '. [' + host(h.link) + ']' + (h.date ? ' (' + clip(h.date, 30) + ')' : '') + ' ' + clip(h.title, 120) + ' — ' + clip(h.link, 200) + '\n' + clip(h.snippet, 400)).join('\n\n');
  return (sportsBlock(b.sportsResults) + answer + panel + list) || 'Sin resultados.';
}
