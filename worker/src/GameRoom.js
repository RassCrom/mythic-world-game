// GameRoom — one Durable Object instance per room code.
// Uses the WebSocket Hibernation API (state.acceptWebSocket + class-level
// webSocketMessage/webSocketClose handlers) so idle rooms are evicted from
// memory without dropping connections. Game state lives in DO storage and is
// re-read lazily after a hibernation wake-up.

import {
  createGame, addPlayer, markDisconnected, markConnected,
  startGame, restartGame, playCard, drawAction, passWindow, choose,
  forceChoice, forcePass, forceEndTurn, expireTurn, viewFor, addLog,
  addBotPlayer, removeBotPlayer, botWaitingId,
} from './engine.js';
import { decideBotAction } from './bot.js';

const IDLE_CLEANUP_MS = 1000 * 60 * 60 * 24; // wipe rooms idle for 24h
const BOT_STEP_MS = 700; // thinking pause between bot actions

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.game = null; // in-memory cache; reloaded from storage after wake-up
  }

  async loadGame() {
    if (!this.game) this.game = (await this.state.storage.get('game')) || null;
    return this.game;
  }

  async saveGame() {
    if (this.game) await this.state.storage.put('game', this.game);
    await this.armAlarm();
  }

  // One alarm slot serves bot steps, the authoritative turn deadline, and cleanup.
  async armAlarm() {
    const now = Date.now();
    const candidates = [now + IDLE_CLEANUP_MS];
    if (this.game && botWaitingId(this.game)) candidates.push(now + BOT_STEP_MS);
    if (this.game?.status === 'playing' && this.game.turn?.deadline) {
      candidates.push(Math.max(now + 1, this.game.turn.deadline));
    }
    await this.state.storage.setAlarm(Math.min(...candidates));
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Called by the Worker when a client creates a room.
    if (url.pathname === '/init' && request.method === 'POST') {
      const existing = await this.loadGame();
      if (existing) return new Response('exists', { status: 409 });
      const { code } = await request.json();
      this.game = createGame(code);
      await this.saveGame();
      return Response.json({ ok: true });
    }

    if (url.pathname === '/info') {
      const g = await this.loadGame();
      if (!g) return Response.json({ exists: false });
      return Response.json({
        exists: true,
        status: g.status,
        playerCount: g.players.length,
      });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 });
      }
      const g = await this.loadGame();
      if (!g) return new Response('Room not found', { status: 404 });

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      // Hibernation API: the runtime keeps the socket alive while the DO
      // itself can be evicted. The attachment survives hibernation.
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ playerId: null });
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  /* ---------------- hibernation-safe socket handlers ---------------- */

  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.sendTo(ws, { type: 'error', msg: 'Bad message.' });
    }

    const g = await this.loadGame();
    if (!g) return this.sendTo(ws, { type: 'error', msg: 'Room no longer exists.' });

    const att = ws.deserializeAttachment() || {};

    if (msg.type === 'ping') return this.sendTo(ws, { type: 'pong' });

    if (msg.type === 'join') {
      const res = addPlayer(g, { token: String(msg.token || ''), name: msg.name });
      if (res.error) {
        this.sendTo(ws, { type: 'error', msg: res.error, fatal: true });
        try { ws.close(4000, res.error); } catch {}
        return;
      }
      // Close any older socket for the same seat (refresh/reopen).
      for (const other of this.state.getWebSockets()) {
        if (other === ws) continue;
        const oa = other.deserializeAttachment() || {};
        if (oa.playerId === res.playerId) {
          try { other.close(4001, 'Replaced by a new connection'); } catch {}
        }
      }
      ws.serializeAttachment({ playerId: res.playerId });
      markConnected(g, res.playerId);
      if (res.reconnected && g.status !== 'lobby') {
        addLog(g, `${g.players.find((p) => p.id === res.playerId).name} reconnected.`);
      }
      this.sendTo(ws, { type: 'joined', playerId: res.playerId, code: g.code });
      await this.saveGame();
      this.broadcast(g);
      return;
    }

    const pid = att.playerId;
    if (!pid) return this.sendTo(ws, { type: 'error', msg: 'Join the room first.' });

    const res = this.dispatch(g, pid, msg);

    if (res && res.error) {
      this.sendTo(ws, { type: 'error', msg: res.error });
      return;
    }
    await this.saveGame();
    this.broadcast(g);
  }

  dispatch(g, pid, msg) {
    switch (msg.type) {
      case 'start': return startGame(g, pid);
      case 'restart': return restartGame(g, pid);
      case 'play': return playCard(g, pid, String(msg.iid), msg.targetPlayerId ? String(msg.targetPlayerId) : undefined);
      case 'drawAction': return drawAction(g, pid);
      case 'pass': return passWindow(g, pid);
      case 'choose': return choose(g, pid, msg.value === null ? null : msg.value);
      case 'addBot': return addBotPlayer(g, pid, String(msg.difficulty || 'medium'));
      case 'removeBot': return removeBotPlayer(g, pid, String(msg.playerId));
      case 'forceChoice': return forceChoice(g, pid);
      case 'forcePass': return forcePass(g, pid);
      case 'forceEndTurn': return forceEndTurn(g, pid);
      default: return { error: 'Unknown action.' };
    }
  }

  // Run one bot decision. Falls back to a safe default so a bot bug can
  // never wedge the room.
  botStep(g, botId) {
    const bot = g.players.find((p) => p.id === botId);
    const view = viewFor(g, botId);
    let action = null;
    try {
      action = decideBotAction(view, bot.difficulty);
    } catch (e) {
      action = null;
    }
    let res = action ? this.dispatch(g, botId, action) : { error: 'no action' };
    if (res && res.error) {
      // Safe fallbacks: skip/first-candidate for prompts, pass windows, draw turns.
      if (g.prompt && g.prompt.playerId === botId) {
        const pr = g.prompt;
        let value;
        if (pr.canSkip) value = null;
        else if (pr.kind === 'yesno') value = false;
        else if (pr.kind === 'pickHand') value = pr.candidates.slice(0, pr.n || 1);
        else if (pr.kind === 'pickList') value = pr.candidates[0]?.iid ?? pr.candidates[0];
        else value = pr.candidates[0];
        res = choose(g, botId, value);
      } else if (g.window && g.window.awaiting.includes(botId)) {
        res = passWindow(g, botId);
      } else {
        res = drawAction(g, botId);
      }
      if (res && res.error) addLog(g, `${bot.name} short-circuited (${res.error}).`);
    }
  }

  async webSocketClose(ws) {
    await this.handleGone(ws);
  }

  async webSocketError(ws) {
    await this.handleGone(ws);
  }

  async handleGone(ws) {
    const att = ws.deserializeAttachment() || {};
    if (!att.playerId) return;
    const g = await this.loadGame();
    if (!g) return;
    // Another live socket for the same player means this was a stale tab.
    const stillHere = this.state.getWebSockets().some((other) => {
      if (other === ws) return false;
      const oa = other.deserializeAttachment() || {};
      return oa.playerId === att.playerId;
    });
    if (!stillHere) {
      markDisconnected(g, att.playerId);
      await this.saveGame();
      this.broadcast(g);
    }
  }

  async alarm() {
    const g = await this.loadGame();
    if (g?.status === 'playing' && g.turn?.deadline && g.turn.deadline <= Date.now()) {
      expireTurn(g);
      await this.saveGame();
      this.broadcast(g);
      return;
    }
    // A bot has something to do — take one step, then re-arm.
    const botId = g && botWaitingId(g);
    if (botId) {
      this.botStep(g, botId);
      await this.saveGame(); // re-arms: soon if a bot is still pending, else 24h
      this.broadcast(g);
      return;
    }
    // Otherwise this is the idle-cleanup alarm: wipe if nobody is connected.
    if (this.state.getWebSockets().length === 0) {
      await this.state.storage.deleteAll();
      this.game = null;
    } else {
      await this.armAlarm();
    }
  }

  /* ---------------- outbound ---------------- */

  sendTo(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  broadcast(g) {
    for (const ws of this.state.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      if (!att.playerId) continue;
      this.sendTo(ws, { type: 'state', state: viewFor(g, att.playerId) });
    }
  }
}
