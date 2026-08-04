// netlify/functions/resend-send.js
// Server-side proxy that sends email through Resend.
// The RESEND_API_KEY lives ONLY in Netlify's environment variables — it is
// never shipped to the browser. The dashboard POSTs { to, subject, html, from }
// to this endpoint; this function attaches the secret key and calls Resend
// server-to-server, then reports back whether Resend actually accepted it.

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(500, { ok: false, error: 'RESEND_API_KEY is not set in Netlify environment variables.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { to, subject, html, from } = payload;
  if (!to || !subject || !html) {
    return json(400, { ok: false, error: 'Missing required fields: to, subject, html' });
  }

  // from must be an address on a domain you verified in Resend.
  // Falls back to a sensible default if the client did not send one.
  const fromAddress = from || 'Sytesurge <info@sytesurge.com>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: html
      })
    });

    const d = await r.json().catch(() => ({}));

    // Resend returns { id: "..." } on success, or { name, message } on error.
    // Only trust success when Resend hands back an id — a 200 with no id is
    // not proof it was accepted.
    if (!r.ok || !d.id) {
      return json(r.ok ? 502 : r.status, {
        ok: false,
        error: d.message || ('Resend returned HTTP ' + r.status + ' with no message id')
      });
    }

    return json(200, { ok: true, id: d.id, error: null });
  } catch (e) {
    return json(502, { ok: false, error: 'Network error calling Resend: ' + e.message });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
