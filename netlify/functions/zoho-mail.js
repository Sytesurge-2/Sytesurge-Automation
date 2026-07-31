// Generic proxy for the Zoho Mail data API (accounts, folders, messages).
// Unlike the OAuth token endpoint, these mail.zoho.com/api/* endpoints CAN
// support direct browser CORS calls — but only if the caller's origin is
// registered under "CORS Domains" in the Zoho API Console, a setting that's
// easy to miss and hard to verify. Routing through this function sidesteps
// that entirely: the call happens server-to-server, where CORS doesn't
// apply, so there's nothing extra to configure on Zoho's side.
//
// The browser sends { path, method, token, body }; this function forwards
// the request to https://mail.zoho.com<path> with the given access token
// and returns the response verbatim. `path` is restricted to /api/... to
// keep this from being usable as an open proxy to arbitrary hosts.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { path, method, token, body } = JSON.parse(event.body || '{}');
    if (!path || !token) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'missing path or token' }) };
    }
    if (!/^\/api\//.test(path)) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'invalid path' }) };
    }
    const r = await fetch('https://mail.zoho.com' + path, {
      method: method || 'GET',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + token,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
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
