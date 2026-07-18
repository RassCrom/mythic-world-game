// Worker entry point: HTTP API + WebSocket routing to GameRoom Durable Objects.
// The Worker itself is stateless; every room lives in its own DO instance
// keyed by room code.

import { GameRoom } from './GameRoom.js';
export { GameRoom };

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const CODE_LENGTH = 5;
const MAX_UNBIASED_BYTE = 256 - (256 % CODE_ALPHABET.length);

export function makeCode() {
  const characters = [];
  const randomBytes = new Uint8Array(CODE_LENGTH * 2);
  while (characters.length < CODE_LENGTH) {
    crypto.getRandomValues(randomBytes);
    for (const value of randomBytes) {
      if (value >= MAX_UNBIASED_BYTE) continue;
      characters.push(CODE_ALPHABET[value % CODE_ALPHABET.length]);
      if (characters.length === CODE_LENGTH) break;
    }
  }
  return characters.join('');
}

export function normalizeCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4,8}$/.test(code) ? code : null;
}

function cors(resp) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(resp.body, { status: resp.status, headers: h });
}

function roomStub(env, code) {
  return env.GAME_ROOM.getByName(code);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    // POST /api/rooms -> create a room, returns { code }
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const stub = roomStub(env, code);
        const res = await stub.fetch('https://do/init', {
          method: 'POST',
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) return cors(Response.json({ code }));
        // 409: code collision with an existing room — try another code.
      }
      return cors(Response.json({ error: 'Could not allocate a room code.' }, { status: 500 }));
    }

    // GET /api/rooms/:code -> { exists, status, playerCount }
    const infoMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (infoMatch && request.method === 'GET') {
      const code = normalizeCode(infoMatch[1]);
      if (!code) return cors(Response.json({ exists: false }));
      const stub = roomStub(env, code);
      const res = await stub.fetch('https://do/info');
      return cors(new Response(res.body, res));
    }

    // GET /api/rooms/:code/ws -> WebSocket upgrade, forwarded to the DO
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (wsMatch) {
      const code = normalizeCode(wsMatch[1]);
      if (!code) return new Response('Bad room code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 });
      }
      const stub = roomStub(env, code);
      const doUrl = new URL(request.url);
      doUrl.pathname = '/ws';
      return stub.fetch(new Request(doUrl, request));
    }

    return cors(new Response('Unstable Dragons API. The frontend is served separately (Cloudflare Pages).', { status: 404 }));
  },
};
