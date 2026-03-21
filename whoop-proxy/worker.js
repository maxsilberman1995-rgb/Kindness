/**
 * Cloudflare Worker — WHOOP OAuth token proxy
 *
 * Deploy steps:
 *   1. Go to https://dash.cloudflare.com/ → Workers & Pages → Create
 *   2. Paste this file, click Save & Deploy
 *   3. Copy the worker URL (e.g. https://whoop-proxy.YOUR-SUBDOMAIN.workers.dev)
 *   4. Paste that URL into the "Proxy URL" field in the app
 *
 * The worker does one thing: forward token-exchange requests to WHOOP's
 * token endpoint and add the CORS headers that WHOOP itself omits.
 */

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

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
      return new Response(JSON.stringify({ error: 'proxy_error', error_description: err.message }), {
        status:  502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
