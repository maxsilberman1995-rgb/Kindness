const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_V1        = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_V2        = 'https://api.prod.whoop.com/developer/v2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function respond(body, status) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS });

    // Token exchange / refresh
    if (request.method === 'POST') {
      try {
        const up = await fetch(WHOOP_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    await request.text(),
        });
        return respond(await up.text(), up.status);
      } catch (e) {
        return respond(JSON.stringify({ error: 'proxy_error', error_description: e.message }), 502);
      }
    }

    // API proxy: /v1/* → WHOOP v1, /v2/* → WHOOP v2
    if (request.method === 'GET') {
      const isV2 = url.pathname.startsWith('/v2/');
      const isV1 = url.pathname.startsWith('/v1/');
      if (isV1 || isV2) {
        try {
          const base    = isV2 ? WHOOP_V2 : WHOOP_V1;
          const apiPath = url.pathname.replace(/^\/(v1|v2)/, '') + url.search;
          const up      = await fetch(base + apiPath, {
            headers: { Authorization: request.headers.get('Authorization') || '' },
          });
          return respond(await up.text(), up.status);
        } catch (e) {
          return respond(JSON.stringify({ error: 'proxy_error', error_description: e.message }), 502);
        }
      }
    }

    return respond('"Not found"', 404);
  },
};
