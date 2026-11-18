// Prueba de «Crear un agente» desde inicio (sin web). La sesión del panel de agentes se simula.
// Uso: con el servidor de desarrollo en marcha →  node scripts/agent-only-test.mjs [url] [captura.png]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3123/';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const sent = [];
await page.route('**/studio-api/agents/**', async r => {
  const u = r.request().url();
  if (u.endsWith('/auth/me')) return r.fulfill({ json: { user: { id: 'access:x', email: 'demo@example.com' } } });
  if (u.endsWith('/agents') && r.request().method() === 'GET') return r.fulfill({ json: { agents: [] } });
  if (u.endsWith('/agents/generate')) { sent.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ json: { config: { name: 'Asistente Fisio Ficticia', description: 'd', role: 'Atención', objective: 'Resolver dudas', instructions: 'Tutea.', capabilities: [] } } }); }
  return r.fulfill({ json: {} });
});
const out = []; const check = (l, ok, x = '') => out.push((ok ? '✔ ' : '✘ ') + l + (x ? ' · ' + x : ''));
try {
  await page.goto(URL);
  const card = page.getByRole('button', { name: /Crear un agente/ });
  check('En inicio está la tarjeta «Crear un agente»', await card.isVisible());
  await card.click();
  check('Abre el modo solo agente', await page.getByText('Un agente IA para tu negocio, sin necesidad de web.').isVisible());
  check('No ofrece «Continuar sin agente» ni «Volver al editor»', !(await page.getByRole('button', { name: 'Continuar sin agente' }).count()) && await page.getByRole('button', { name: /Volver al inicio/ }).isVisible());
  await page.getByLabel('Descripción del negocio').fill('Clínica de fisioterapia ficticia en Valladolid. Abrimos de lunes a viernes de 9 a 20 h. Primera visita 45 euros.');
  if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
  await page.getByRole('button', { name: /Proponer agente con IA/ }).click();
  await page.getByText('Configuración editable').waitFor();
  check('La IA recibe la descripción del negocio', /fisioterapia ficticia/.test(sent[0]?.prompt || ''), (sent[0]?.prompt || '').slice(0, 80));
  check('Propone el agente con su nombre', (await page.locator('input').evaluateAll(xs => xs.map(x => x.value))).includes('Asistente Fisio Ficticia'));
  await page.getByRole('button', { name: /Volver al inicio/ }).click();
  check('Vuelve a inicio', await page.getByRole('button', { name: /Crear un agente/ }).isVisible());
} catch (e) { out.push('✘ ERROR: ' + e.message.split('\n')[0]); await page.screenshot({ path: 'agent-only-error.png' }); }
console.log(out.join('\n'));
await browser.close();
