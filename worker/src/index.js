// Worker entry point: HTTP API + WebSocket routing to GameRoom Durable Objects.
// The Worker itself is stateless; every room lives in its own DO instance
// keyed by room code via idFromName(code).

import { GameRoom } from './GameRoom.js';
export { GameRoom };

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

function normalizeCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4,8}$/.test(code) ? code : null;
}

function cors(resp, origin) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', origin || '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(resp.body, { status: resp.status, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), origin);
    }

    // POST /api/rooms -> create a room, returns { code }
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
        const res = await stub.fetch('https://do/init', {
          method: 'POST',
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) return cors(Response.json({ code }), origin);
        // 409: code collision with an existing room — try another code.
      }
      return cors(Response.json({ error: 'Could not allocate a room code.' }, { status: 500 }), origin);
    }

    // GET /api/rooms/:code -> { exists, status, playerCount }
    const infoMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (infoMatch && request.method === 'GET') {
      const code = normalizeCode(infoMatch[1]);
      if (!code) return cors(Response.json({ exists: false }), origin);
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
      const res = await stub.fetch('https://do/info');
      return cors(new Response(res.body, res), origin);
    }

    // GET /api/rooms/:code/ws -> WebSocket upgrade, forwarded to the DO
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (wsMatch) {
      const code = normalizeCode(wsMatch[1]);
      if (!code) return new Response('Bad room code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 });
      }
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
      const doUrl = new URL(request.url);
      doUrl.pathname = '/ws';
      return stub.fetch(new Request(doUrl, request));
    }

    return cors(new Response('Unstable Dragons API. The frontend is served separately (Cloudflare Pages).', { status: 404 }), origin);
  },
};
