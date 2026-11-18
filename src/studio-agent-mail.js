/* WAY UP Studio · Correos de los agentes con Resend (plan gratuito: 3 000 correos/mes).
   Secretos del Worker de chats: RESEND_API_KEY y LEAD_NOTIFY_EMAIL (a quién avisar).
   Opcional, con un dominio verificado en Resend: MAIL_FROM («Negocio <hola@tudominio.es>») y
   MAIL_CONFIRM_VISITOR="on" para enviar también una confirmación al visitante. */

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const line = v => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, 160);

async function resend(env, payload, fetcher) {
  const r = await fetcher('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RESEND_API_KEY }, body: JSON.stringify(payload) });
  if (!r.ok) throw Error('Resend ' + r.status);
  return r.json().catch(() => ({}));
}
const fromOf = env => env.MAIL_FROM || 'WAY UP Studio <onboarding@resend.dev>';

/** Avisa al negocio de un contacto nuevo y, si está configurado, confirma al visitante. Nunca lanza: el contacto ya está guardado. */
export async function notifyLead(env, lead, fetcher = fetch) {
  const out = { owner: false, visitor: false };
  if (!env?.RESEND_API_KEY || !env?.LEAD_NOTIFY_EMAIL) return out;
  const agent = line(lead.agentName || 'tu asistente');
  try {
    await resend(env, {
      from: fromOf(env), to: [env.LEAD_NOTIFY_EMAIL], reply_to: lead.email,
      subject: 'Nuevo contacto desde ' + agent + ': ' + line(lead.name),
      text: 'Nuevo contacto recibido por el chat «' + agent + '»' + (lead.origin ? ' en ' + lead.origin : '') + '.\n\nNombre: ' + lead.name + '\nCorreo: ' + lead.email + '\n\nMensaje:\n' + lead.message +
        '\n\nPuedes responder directamente a este correo. El visitante dio su consentimiento para ser contactado.',
      html: '<p>Nuevo contacto recibido por el chat <strong>' + esc(agent) + '</strong>' + (lead.origin ? ' en ' + esc(lead.origin) : '') + '.</p>' +
        '<p><strong>Nombre:</strong> ' + esc(lead.name) + '<br><strong>Correo:</strong> ' + esc(lead.email) + '</p>' +
        '<p><strong>Mensaje:</strong><br>' + esc(lead.message).replace(/\n/g, '<br>') + '</p>' +
        '<p style="color:#666;font-size:12px">Responde directamente a este correo. El visitante dio su consentimiento para ser contactado.</p>',
    }, fetcher);
    out.owner = true;
  } catch (e) { console.warn('agent-mail owner', String(e?.message || e).slice(0, 120)); }
  // Confirmación al visitante: solo con dominio propio verificado (sin él, Resend solo entrega a la cuenta del dueño).
  if (env.MAIL_FROM && String(env.MAIL_CONFIRM_VISITOR || '').toLowerCase() === 'on') {
    try {
      await resend(env, {
        from: fromOf(env), to: [lead.email], reply_to: env.LEAD_NOTIFY_EMAIL,
        subject: 'Hemos recibido tu mensaje',
        text: 'Hola ' + line(lead.name) + ',\n\nHemos recibido tu mensaje y te responderemos lo antes posible.\n\nTu mensaje:\n' + lead.message + '\n\nGracias.',
        html: '<p>Hola ' + esc(line(lead.name)) + ',</p><p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p>' +
          '<p style="color:#555"><em>' + esc(lead.message).replace(/\n/g, '<br>') + '</em></p><p>Gracias.</p>',
      }, fetcher);
      out.visitor = true;
    } catch (e) { console.warn('agent-mail visitor', String(e?.message || e).slice(0, 120)); }
  }
  return out;
}
