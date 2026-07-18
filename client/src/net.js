// WebSocket client with automatic reconnection.
// The server is authoritative; this module only ships intent messages up
// and full state views down.

const API_BASE = import.meta.env.VITE_API_BASE || '';

export function apiUrl(path) {
  return API_BASE + path;
}

function wsUrl(code) {
  const base = API_BASE || window.location.origin;
  return base.replace(/^http/, 'ws') + `/api/rooms/${code}/ws`;
}

export async function createRoom() {
  const res = await fetch(apiUrl('/api/rooms'), { method: 'POST' });
  if (!res.ok) throw new Error('Could not create a room. Is the server up?');
  return res.json(); // { code }
}

export async function roomInfo(code) {
  const res = await fetch(apiUrl(`/api/rooms/${code}`));
  if (!res.ok) throw new Error('Could not reach the server.');
  return res.json(); // { exists, status, playerCount }
}

export class Connection {
  constructor({ code, name, token, handlers }) {
    this.code = code;
    this.name = name;
    this.token = token;
    this.handlers = handlers; // { onState, onJoined, onError, onStatus }
    this.ws = null;
    this.closedByUser = false;
    this.retry = 0;
    this.open();
  }

  open() {
    if (this.closedByUser) return;
    this.handlers.onStatus?.(this.retry === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(wsUrl(this.code));
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.handlers.onStatus?.('open');
      ws.send(JSON.stringify({ type: 'join', name: this.name, token: this.token }));
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'state') this.handlers.onState?.(msg.state);
      else if (msg.type === 'joined') this.handlers.onJoined?.(msg);
      else if (msg.type === 'error') {
        this.handlers.onError?.(msg.msg, msg.fatal);
        if (msg.fatal) this.close();
      }
    };

    ws.onclose = (ev) => {
      if (this.closedByUser || ev.code === 4000) return;
      if (ev.code === 4001) {
        // Replaced by a newer tab — don't fight it.
        this.handlers.onError?.('This room was opened in another tab.', true);
        this.close();
        return;
      }
      this.handlers.onStatus?.('closed');
      const delay = Math.min(8000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.open(), delay);
    };

    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    this.closedByUser = true;
    clearTimeout(this.timer);
    try { this.ws?.close(); } catch {}
  }
}

export function getToken() {
  let t = localStorage.getItem('ud_token');
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('ud_token', t);
  }
  return t;
}
