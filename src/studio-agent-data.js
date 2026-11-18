/* WAY UP Studio · APIs de datos públicas, gratuitas y sin clave para los agentes (herramienta «data_apis»):
   tiempo (Open-Meteo), festivos de España (Nager.Date), divisas del BCE (Frankfurter) y Wikipedia. */

const UA = { 'User-Agent': 'WayUpStudio-Agent/1.0 (asistente de webs)' };
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
async function getJson(fetcher, url) {
  const r = await fetcher(url, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error(String(r.status));
  return r.json();
}

const WMO = { 0: 'despejado', 1: 'casi despejado', 2: 'parcialmente nuboso', 3: 'nublado', 45: 'niebla', 48: 'niebla', 51: 'llovizna', 53: 'llovizna', 55: 'llovizna intensa',
  61: 'lluvia débil', 63: 'lluvia', 65: 'lluvia fuerte', 71: 'nieve débil', 73: 'nieve', 75: 'nieve fuerte', 80: 'chubascos', 81: 'chubascos', 82: 'chubascos fuertes',
  95: 'tormenta', 96: 'tormenta con granizo', 99: 'tormenta con granizo' };
/** Tiempo actual y previsión de 4 días. */
export async function weatherData(query, fetcher = fetch) {
  const g = (await getJson(fetcher, 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name=' + encodeURIComponent(clip(query, 80))))?.results?.[0];
  if (!g) return 'No encuentro esa localidad.';
  const w = await getJson(fetcher, 'https://api.open-meteo.com/v1/forecast?latitude=' + g.latitude + '&longitude=' + g.longitude +
    '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4');
  const d = w.daily || {};
  return 'Tiempo en ' + g.name + (g.admin1 ? ' (' + g.admin1 + ')' : '') + ': ahora ' + Math.round(w.current?.temperature_2m) + ' °C, ' + (WMO[w.current?.weather_code] || 'sin dato') + '.\n' +
    (d.time || []).map((t, i) => t + ': ' + (WMO[d.weather_code?.[i]] || '—') + ', ' + Math.round(d.temperature_2m_min?.[i]) + '–' + Math.round(d.temperature_2m_max?.[i]) + ' °C, lluvia ' + (d.precipitation_probability_max?.[i] ?? '?') + ' %').join('\n');
}

const REGIONS = { andalucia: 'AN', aragon: 'AR', asturias: 'AS', baleares: 'IB', canarias: 'CN', cantabria: 'CB', 'castilla y leon': 'CL', 'castilla-la mancha': 'CM', 'castilla la mancha': 'CM',
  cataluna: 'CT', catalunya: 'CT', valencia: 'VC', 'comunidad valenciana': 'VC', extremadura: 'EX', galicia: 'GA', madrid: 'MD', murcia: 'MC', navarra: 'NC', 'pais vasco': 'PV', euskadi: 'PV',
  'la rioja': 'RI', rioja: 'RI', ceuta: 'CE', melilla: 'ML' };
/** Próximos festivos de España: nacionales y, si se nombra, de la comunidad autónoma. */
export async function holidayData(query, fetcher = fetch, now = new Date()) {
  const q = norm(query), year = Number((/\b(20\d\d)\b/.exec(q) || [])[1]) || now.getFullYear();
  const region = Object.entries(REGIONS).find(([k]) => q.includes(k))?.[1];
  const list = await getJson(fetcher, 'https://date.nager.at/api/v3/PublicHolidays/' + year + '/ES');
  const today = now.toISOString().slice(0, 10);
  const rows = (Array.isArray(list) ? list : []).filter(h => !h.counties || (region && h.counties.includes('ES-' + region)))
    .filter(h => year !== now.getFullYear() || h.date >= today).slice(0, 12);
  return 'Festivos ' + year + ' en España' + (region ? ' (nacionales y de ES-' + region + ')' : ' (nacionales)') + ':\n' +
    (rows.map(h => h.date + ' — ' + clip(h.localName, 60)).join('\n') || 'No quedan festivos este año.');
}

/** Cambio de divisas del Banco Central Europeo. Ej.: «100 EUR USD». */
export async function currencyData(query, fetcher = fetch) {
  const codes = (String(query).toUpperCase().match(/\b[A-Z]{3}\b/g) || []).slice(0, 2);
  const amount = Number(((/(\d+(?:[.,]\d+)?)/.exec(query) || [])[1] || '1').replace(',', '.')) || 1;
  const [from, to] = codes.length === 2 ? codes : ['EUR', codes[0] || 'USD'];
  const r = await getJson(fetcher, 'https://api.frankfurter.app/latest?amount=' + amount + '&from=' + from + '&to=' + to);
  return amount + ' ' + from + ' = ' + r?.rates?.[to] + ' ' + to + ' (tipo del Banco Central Europeo, ' + r?.date + ').';
}

/** Resumen de Wikipedia en castellano. */
export async function wikipediaData(query, fetcher = fetch) {
  const hit = (await getJson(fetcher, 'https://es.wikipedia.org/w/rest.php/v1/search/title?limit=1&q=' + encodeURIComponent(clip(query, 120))))?.pages?.[0];
  if (!hit) return 'Sin artículo en Wikipedia.';
  const s = await getJson(fetcher, 'https://es.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(hit.key));
  return clip(s.title, 120) + ': ' + clip(s.extract, 1200) + '\nFuente: ' + clip(s.content_urls?.desktop?.page, 200);
}
