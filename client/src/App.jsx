import React, { useCallback, useEffect, useRef, useState } from 'react';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import CardCodex, { CodexIcon } from './components/CardCodex.jsx';
import { Connection, createRoom, roomInfo, getToken } from './net.js';
import { sfx } from './sound.js';
import { useI18n } from './i18n/index.jsx';

const EMBER_INDICES = Array.from({ length: 14 }, (_, index) => index);

export default function App() {
  const { t, text } = useI18n();
  const [view, setView] = useState(null); // authoritative state from the server
  const [status, setStatus] = useState('idle'); // idle|connecting|reconnecting|open|closed
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const connRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, isError = true) => {
    setToast({ msg, isError });
    if (isError) sfx.error();
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const leave = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    localStorage.removeItem('ud_room');
    setView(null);
    setStatus('idle');
  }, []);

  const connectToRoom = useCallback(async (code, name) => {
    code = code.trim().toUpperCase();
    const info = await roomInfo(code);
    if (!info.exists) throw new Error(`Room ${code} was not found.`);

    localStorage.setItem('ud_name', name);
    localStorage.setItem('ud_room', code);
    connRef.current?.close();
    connRef.current = new Connection({
      code,
      name,
      token: getToken(),
      handlers: {
        onState: setView,
        onStatus: setStatus,
        onError: (msg, fatal) => {
          showToast(msg);
          if (fatal) leave();
        },
      },
    });
    return true;
  }, [leave, showToast]);

  const runBusy = useCallback(async (operation, fallbackMessage) => {
    setBusy(true);
    try {
      return await operation();
    } catch (e) {
      showToast(e.message || fallbackMessage);
      return false;
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const joinRoom = useCallback((code, name) => (
    runBusy(() => connectToRoom(code, name), 'Connection failed.')
  ), [connectToRoom, runBusy]);

  const create = useCallback((name) => (
    runBusy(async () => {
      const { code } = await createRoom();
      return connectToRoom(code, name);
    }, 'Could not create a room.')
  ), [connectToRoom, runBusy]);

  // Auto-rejoin after a refresh: same room code + player token = same seat.
  useEffect(() => {
    const code = localStorage.getItem('ud_room');
    const name = localStorage.getItem('ud_name');
    if (code && name) joinRoom(code, name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    connRef.current?.close();
  }, []);

  const send = useCallback((msg) => connRef.current?.send(msg), []);

  let screen;
  if (!view) {
    screen = <Home onCreate={create} onJoin={joinRoom} busy={busy || status === 'connecting'} />;
  } else if (view.status === 'lobby') {
    screen = <Lobby view={view} send={send} onLeave={leave} showToast={showToast} />;
  } else {
    screen = <Game view={view} send={send} onLeave={leave} />;
  }

  return (
    <div className="app">
      <div className="embers" aria-hidden="true">
        {EMBER_INDICES.map((index) => <span key={index} className="ember" style={{ '--i': index }} />)}
      </div>
      {screen}
      <button className="codex-fab" type="button" onClick={() => setCodexOpen(true)}>
        <CodexIcon />
        <span>{t('Card Codex')}</span>
      </button>
      <CardCodex open={codexOpen} onClose={() => setCodexOpen(false)} />
      {status === 'reconnecting' && view && (
        <div className="reconnect-banner" role="status">{t('Connection lost — reconnecting…')}</div>
      )}
      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`} role="alert">{text(toast.msg)}</div>
      )}
    </div>
  );
}
