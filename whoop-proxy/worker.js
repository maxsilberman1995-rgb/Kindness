/**
 * Cloudflare Worker — WHOOP OAuth + API proxy
 *
 * Deploy steps:
 *   1. Go to https://dash.cloudflare.com/ → Workers & Pages → Create
 *   2. Paste this file, click Save & Deploy
 *   3. Copy the worker URL (e.g. https://whoop-proxy.YOUR-SUBDOMAIN.workers.dev)
 *   4. Paste that URL into the "Proxy URL" field in the app
 *
 * Routes:
 *   POST /          → WHOOP token endpoint (OAuth token exchange / refresh)
 *   GET  /v1/*      → WHOOP Developer API  (recovery, sleep, cycle, etc.)
 *   OPTIONS *       → CORS preflight
 */

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE  = 'https://api.prod.whoop.com/developer/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST / → token exchange / refresh
    if (request.method === 'POST') {
      try {
        const upstream = await fetch(WHOOP_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    await request.text(),
        });
        const body = await upstream.text();
        return new Response(body, {
          status:  upstream.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'proxy_error', error_description: err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    // GET /v1/* → WHOOP Developer API
    if (request.method === 'GET' && url.pathname.startsWith('/v1/')) {
      const apiPath = url.pathname.replace(/^\/v1/, '') + url.search;
      const apiUrl  = WHOOP_API_BASE + apiPath;

      try {
        const upstream = await fetch(apiUrl, {
          method:  'GET',
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        });
        const body = await upstream.text();
        return new Response(body, {
          status:  upstream.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'proxy_error', error_description: err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
