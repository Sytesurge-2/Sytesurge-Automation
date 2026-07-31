// Zoho's OAuth token endpoint (accounts.zoho.com/oauth/v2/token) never sends
// Access-Control-Allow-Origin headers, so the browser can never call it
// directly — every call (initial code exchange AND refresh) has to be
// server-side. This function is that server side: the browser posts the
// same form fields it would have sent to Zoho, this function forwards them
// to Zoho from Netlify's servers (no CORS applies to server-to-server
// calls), and returns Zoho's response verbatim.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const fields = JSON.parse(event.body || '{}');
    const params = new URLSearchParams(fields);
    const r = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const text = await r.text();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: text };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'proxy_failed', error_description: e.message })
    };
  }
};
