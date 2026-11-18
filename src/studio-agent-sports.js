/* WAY UP Studio · Datos deportivos para los agentes (herramienta «sports_data») con API-Sports.
   Una sola clave (secreto APISPORTS_KEY) vale para todos sus deportes; plan gratuito con cupo diario por deporte.
   Fútbol: partidos de un equipo (forma y próximos) y clasificación de una liga. Baloncesto: partidos de un equipo. */

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const HOSTS = { football: 'https://v3.football.api-sports.io', basketball: 'https://v1.basketball.api-sports.io' };

async function api(env, sport, path, fetcher) {
  if (!env?.APISPORTS_KEY) throw Error('datos deportivos no configurados');
  const r = await fetcher(HOSTS[sport] + path, { headers: { 'x-apisports-key': env.APISPORTS_KEY }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error('API-Sports ' + r.status);
  const j = await r.json();
  // API-Sports responde 200 con «errors» cuando se agota el cupo o el plan no permite la consulta.
  const errs = j?.errors && (Array.isArray(j.errors) ? j.errors : Object.values(j.errors));
  if (errs && errs.length) throw Error('API-Sports: ' + clip(errs.join(' '), 160));
  return Array.isArray(j?.response) ? j.response : [];
}
const day = iso => String(iso || '').slice(0, 10);

/** Fútbol: últimos 5 resultados y próximos 3 partidos de un equipo. */
export async function footballTeam(env, query, fetcher = fetch) {
  const team = (await api(env, 'football', '/teams?search=' + encodeURIComponent(clip(query, 40)), fetcher))[0]?.team;
  if (!team) return 'No encuentro ese equipo de fútbol.';
  const [last, next] = await Promise.all([
    api(env, 'football', '/fixtures?team=' + team.id + '&last=5', fetcher).catch(() => []),
    api(env, 'football', '/fixtures?team=' + team.id + '&next=3', fetcher).catch(() => [])]);
  const row = f => day(f.fixture?.date) + ' · ' + clip(f.league?.name, 40) + ' · ' + clip(f.teams?.home?.name, 40) + ' ' +
    (f.goals?.home ?? '–') + '-' + (f.goals?.away ?? '–') + ' ' + clip(f.teams?.away?.name, 40);
  const form = last.map(f => { const home = f.teams?.home?.id === team.id, w = home ? f.teams?.home?.winner : f.teams?.away?.winner; return w === true ? 'G' : w === false ? 'P' : 'E'; }).join('');
  return team.name + (form ? ' — forma en los últimos 5 (G ganado, E empate, P perdido; mismo orden que la lista): ' + form : '') +
    '\nÚltimos resultados:\n' + (last.map(row).join('\n') || 'Sin datos.') +
    '\nPróximos partidos:\n' + (next.map(f => day(f.fixture?.date) + ' · ' + clip(f.league?.name, 40) + ' · ' + clip(f.teams?.home?.name, 40) + ' vs ' + clip(f.teams?.away?.name, 40)).join('\n') || 'Sin datos.');
}

/** Fútbol: clasificación de la temporada actual de una liga. */
export async function footballStandings(env, query, fetcher = fetch) {
  const lg = (await api(env, 'football', '/leagues?search=' + encodeURIComponent(clip(query, 40)), fetcher))[0];
  if (!lg) return 'No encuentro esa liga.';
  const season = (lg.seasons || []).find(s => s.current)?.year || (lg.seasons || []).at(-1)?.year;
  const table = (await api(env, 'football', '/standings?league=' + lg.league.id + '&season=' + season, fetcher))[0]?.league?.standings?.[0] || [];
  return clip(lg.league.name, 60) + ' ' + season + ' (clasificación):\n' +
    (table.slice(0, 20).map(t => t.rank + '. ' + clip(t.team?.name, 40) + ' — ' + t.points + ' pts, ' + (t.all?.played ?? '?') + ' PJ' + (t.form ? ', racha ' + t.form : '')).join('\n') || 'Sin datos de esta temporada en tu plan.');
}

/** Baloncesto: últimos resultados y próximos partidos de un equipo (temporada actual). */
export async function basketballTeam(env, query, fetcher = fetch, now = new Date()) {
  const team = (await api(env, 'basketball', '/teams?search=' + encodeURIComponent(clip(query, 40)), fetcher))[0];
  if (!team) return 'No encuentro ese equipo de baloncesto.';
  const y = now.getUTCFullYear(), season = now.getUTCMonth() >= 7 ? y + '-' + (y + 1) : (y - 1) + '-' + y;
  const games = await api(env, 'basketball', '/games?team=' + team.id + '&season=' + season, fetcher);
  const today = now.toISOString().slice(0, 10);
  const played = games.filter(g => day(g.date) < today && g.scores?.home?.total != null).slice(-5);
  const next = games.filter(g => day(g.date) >= today).slice(0, 3);
  return team.name + ' (' + season + ')\nÚltimos resultados:\n' +
    (played.map(g => day(g.date) + ' · ' + clip(g.teams?.home?.name, 40) + ' ' + g.scores.home.total + '-' + g.scores.away.total + ' ' + clip(g.teams?.away?.name, 40)).join('\n') || 'Sin datos.') +
    '\nPróximos partidos:\n' + (next.map(g => day(g.date) + ' · ' + clip(g.teams?.home?.name, 40) + ' vs ' + clip(g.teams?.away?.name, 40)).join('\n') || 'Sin datos.');
}
