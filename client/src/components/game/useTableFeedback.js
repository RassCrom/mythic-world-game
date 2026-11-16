import { useEffect, useRef, useState } from 'react';
import { sfx, playLogSound } from '../../sound.js';

const TURN_BANNER_MS = 2_000;
const PLAYED_FLASH_MS = 2_300;
// A play older than this arrived with a reconnect snapshot, not live, so
// replaying its flash would show the newcomer a stale animation.
const PLAY_FRESHNESS_MS = 5_000;

// Everything the table does in reaction to server state that is not rendering:
// the chronicle's sound cues, the "your turn" banner, and the flash that names
// the card someone just played.
export function useTableFeedback(view) {
  const [turnFlash, setTurnFlash] = useState(0);
  const [playedFlash, setPlayedFlash] = useState(null);
  const lastLogRef = useRef(0);
  const lastTurnRef = useRef(null);
  const lastPlayedRef = useRef(0);

  useEffect(() => {
    for (const entry of view.log) {
      if (entry.n > lastLogRef.current) {
        lastLogRef.current = entry.n;
        if (entry.sound) playLogSound(entry.sound);
      }
    }
    if (view.turn && view.turn.playerId !== lastTurnRef.current) {
      lastTurnRef.current = view.turn.playerId;
      if (view.turn.playerId === view.you && view.status === 'playing') {
        sfx.turn();
        setTurnFlash((n) => n + 1);
      }
    }
  }, [view]);

  useEffect(() => {
    if (!turnFlash) return undefined;
    const timer = setTimeout(() => setTurnFlash(0), TURN_BANNER_MS);
    return () => clearTimeout(timer);
  }, [turnFlash]);

  useEffect(() => {
    const play = view.lastPlayed;
    if (!play || play.n <= lastPlayedRef.current) return undefined;
    lastPlayedRef.current = play.n;
    if (view.serverNow - play.at > PLAY_FRESHNESS_MS) return undefined;
    setPlayedFlash(play);
    const timer = setTimeout(() => setPlayedFlash((current) => (
      current?.n === play.n ? null : current
    )), PLAYED_FLASH_MS);
    return () => clearTimeout(timer);
  }, [view.lastPlayed?.n]);

  return { turnFlash, playedFlash };
}
