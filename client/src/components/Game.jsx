import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CardView, { TypeGlyph } from './CardView.jsx';
import { CardDetails } from './CardCodex.jsx';
import { DEFS } from '../../../shared/cards.js';
import { sfx, playLogSound, isMuted, setMuted } from '../sound.js';
import { useI18n } from '../i18n.jsx';

const PHASE_LABEL = { start: 'Beginning', draw: 'Draw', action: 'Action', end: 'End' };

const FLIGHT_MS = 420;
const reducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// FLIP animation pass: after each render, any element with a data-iid that
// moved (hand → chain → stable → discard, steals, returns, …) glides from
// its previous screen position to the new one. Cards appearing for the
// first time in the hand or a stable fly out of the deck.
function useCardFlight(view) {
  const prevRects = useRef(new Map());
  useLayoutEffect(() => {
    const els = [...document.querySelectorAll('[data-iid]')].filter((el) => !el.closest('.modal'));

    // Self-heal: finish any in-flight animation instantly BEFORE measuring,
    // so rects are always the true resting positions and nothing can get
    // stuck mid-flight (e.g. when the tab was backgrounded).
    for (const el of els) {
      if (el.dataset.flying) {
        el.style.transition = '';
        el.style.transform = '';
        el.style.zIndex = '';
        delete el.dataset.flying;
      }
    }

    const deckEl = document.querySelector('[data-zone="deck"]');
    const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;
    const next = new Map();
    const skipAnim = reducedMotion();
    const firstPass = prevRects.current.size === 0; // page load/reconnect: no deal-swarm

    for (const el of els) {
      const iid = el.dataset.iid;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      next.set(iid, r);
      if (skipAnim) continue;

      let from = prevRects.current.get(iid);
      if (!from && !firstPass && deckRect && el.closest('.hand, .stable')) from = deckRect; // fresh draw / new arrival
      if (!from) continue;

      const dx = from.left - r.left;
      const dy = from.top - r.top;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) continue;

      // FLIP without requestAnimationFrame: apply the start transform, force
      // a style flush, then hand movement to a CSS transition. Works even in
      // background tabs; the next pass cleans up regardless.
      const sx = from.width && r.width ? from.width / r.width : 1;
      el.dataset.flying = '1';
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx})`;
      el.style.zIndex = '60';
      void el.offsetWidth; // force reflow so the start transform takes effect
      el.style.transition = `transform ${FLIGHT_MS}ms cubic-bezier(.22,.8,.28,1)`;
      el.style.transform = '';
      setTimeout(() => {
        if (el.dataset.flying) {
          el.style.transition = '';
          el.style.zIndex = '';
          delete el.dataset.flying;
        }
      }, FLIGHT_MS + 60);
    }
    prevRects.current = next;
  }, [view]);
}

const MOD_BADGES = {
  uncounterable: ['Sigil', 'Their plays cannot be stopped by Instants'],
  dragonsSafe: ['Warded', 'Their Dragons cannot be destroyed'],
  noUpgrades: ['No Upgrades', 'Cannot play Upgrade cards'],
  handVisible: ['Scryed', 'Hand visible to everyone'],
  toads: ['Toads!', 'Their Dragons are Toads and do not count'],
  noInstants: ['Silenced', 'Cannot play Instant cards'],
  barbedWire: ['Caged', 'Discards when Dragons enter or leave'],
  maxFive: ['Cramped', 'Max 5 Dragons'],
  suppress: ['Fogged', 'Magical Dragons lose abilities'],
  queensDecree: ['Decree', 'Basic Dragons may only enter this stable'],
};

export default function Game({ view, send, onLeave, connStatus }) {
  const { t, text, card } = useI18n();
  const [selected, setSelected] = useState([]); // multi-select for pickHand n>1
  const [pendingTarget, setPendingTarget] = useState(null); // hand card awaiting a stable choice
  const [showLog, setShowLog] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [cardPreview, setCardPreview] = useState(null);
  const [playedFlash, setPlayedFlash] = useState(null);
  const [muted, setMutedState] = useState(isMuted());
  const lastLogRef = useRef(0);
  const lastTurnRef = useRef(null);
  const lastPlayedRef = useRef(0);
  const previewTimerRef = useRef(null);
  const logEndRef = useRef(null);

  useCardFlight(view);

  const me = view.players.find((p) => p.id === view.you);
  const myHand = view.hands[view.you] || [];
  const prompt = view.prompt;
  const myPrompt = prompt && prompt.mine ? prompt : null;
  const isMyTurn = view.turn && view.turn.playerId === view.you;
  const playableSet = useMemo(() => new Set(view.playable || []), [view.playable]);
  const candidateSet = useMemo(
    () => new Set(myPrompt && Array.isArray(myPrompt.candidates)
      ? myPrompt.candidates.map((c) => (typeof c === 'string' ? c : c.iid))
      : []),
    [myPrompt],
  );

  // Sounds from new log entries + turn chime.
  useEffect(() => {
    for (const entry of view.log) {
      if (entry.n > lastLogRef.current) {
        lastLogRef.current = entry.n;
        if (entry.sound) playLogSound(entry.sound);
      }
    }
    if (view.turn && view.turn.playerId !== lastTurnRef.current) {
      lastTurnRef.current = view.turn.playerId;
      if (view.turn.playerId === view.you && view.status === 'playing') sfx.turn();
    }
  }, [view]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [view.log, showLog]);

  // Reset transient selections when the server state moves on.
  useEffect(() => { setSelected([]); }, [prompt && prompt.kind, prompt && prompt.title]);

  useEffect(() => () => clearTimeout(previewTimerRef.current), []);

  useEffect(() => {
    const play = view.lastPlayed;
    if (!play || play.n <= lastPlayedRef.current) return;
    lastPlayedRef.current = play.n;
    if (Date.now() - play.at > 5_000) return;
    setPlayedFlash(play);
    const timer = setTimeout(() => setPlayedFlash((currentPlay) => (
      currentPlay?.n === play.n ? null : currentPlay
    )), 2_300);
    return () => clearTimeout(timer);
  }, [view.lastPlayed?.n]);

  const showCardPreview = useCallback((defId, event) => {
    if (!defId || !DEFS[defId]) return;
    clearTimeout(previewTimerRef.current);
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const cursorX = Number.isFinite(event?.clientX) && event.clientX > 0
      ? event.clientX : (rect ? rect.right : window.innerWidth / 2);
    const cursorY = Number.isFinite(event?.clientY) && event.clientY > 0
      ? event.clientY : (rect ? rect.top : window.innerHeight / 2);
    const width = Math.min(350, window.innerWidth - 24);
    const height = Math.min(250, window.innerHeight - 24);
    const gap = 16;
    const preferredX = cursorX + gap + width <= window.innerWidth
      ? cursorX + gap : cursorX - width - gap;
    const preferredY = cursorY + gap + height <= window.innerHeight
      ? cursorY + gap : cursorY - height - gap;
    setCardPreview({
      defId,
      x: Math.max(12, Math.min(preferredX, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(preferredY, window.innerHeight - height - 12)),
    });
    if (event?.type === 'click') {
      previewTimerRef.current = setTimeout(() => setCardPreview(null), 4_500);
    }
  }, []);

  const hideCardPreview = useCallback(() => {
    clearTimeout(previewTimerRef.current);
    setCardPreview(null);
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  };

  /* ---------- intents ---------- */

  const playFromHand = (iid) => {
    if (myPrompt && myPrompt.kind === 'pickHand') { pickHandCard(iid); return; }
    if (!playableSet.has(iid)) return;
    const def = DEFS[myHand.find((c) => c.iid === iid)?.defId];
    if (!def) return;
    sfx.click();
    if (def.type === 'upgrade' || def.type === 'downgrade') {
      setPendingTarget({ iid, defId: def.id, type: def.type });
    } else {
      send({ type: 'play', iid });
    }
  };

  const pickHandCard = (iid) => {
    if (!candidateSet.has(iid)) return;
    const n = myPrompt.n || 1;
    sfx.click();
    if (n === 1) {
      send({ type: 'choose', value: [iid] });
      return;
    }
    setSelected((sel) => sel.includes(iid) ? sel.filter((x) => x !== iid) : (sel.length < n ? [...sel, iid] : sel));
  };

  const chooseStableCard = (iid) => {
    if (myPrompt && myPrompt.kind === 'pickCard' && candidateSet.has(iid)) {
      sfx.click();
      send({ type: 'choose', value: iid });
    }
  };

  const choosePlayer = (pid) => {
    if (pendingTarget) {
      sfx.click();
      send({ type: 'play', iid: pendingTarget.iid, targetPlayerId: pid });
      setPendingTarget(null);
      return;
    }
    if (myPrompt && myPrompt.kind === 'pickPlayer' && candidateSet.has(pid)) {
      sfx.click();
      send({ type: 'choose', value: pid });
    }
  };

  const skipPrompt = () => { sfx.click(); send({ type: 'choose', value: null }); };

  /* ---------- derived UI facts ---------- */

  const playerPickable = new Set(
    myPrompt && myPrompt.kind === 'pickPlayer' ? myPrompt.candidates : [],
  );
  const targetPickable = new Set(
    pendingTarget
      ? view.players
          .filter((p) => !p.stable.some((c) => c.defId === pendingTarget.defId))
          .filter((p) => {
            if (pendingTarget.defId && DEFS[pendingTarget.defId].requiresBasic) {
              return p.stable.some((c) => DEFS[c.defId].type === 'basic');
            }
            return true;
          })
          .map((p) => p.id)
      : [],
  );

  const opponents = view.players.filter((p) => p.id !== view.you);

  const statusLine = (() => {
    if (view.winner) return t('{name} wins!', { name: view.winner.name });
    if (view.window) {
      return view.window.canRespond
        ? t('{player} is playing {card} — ROAR or pass!', { player: view.window.topPlayer, card: text(view.window.topName) })
        : t('Waiting for responses to {card}… ({players})', { card: text(view.window.topName), players: view.window.awaiting.join(', ') });
    }
    if (prompt && !prompt.mine) return `${prompt.waitingOn} ${text(prompt.title)}`;
    if (myPrompt) return text(myPrompt.title);
    if (isMyTurn && view.turn.phase === 'action' && view.canDraw) {
      return t(`Your turn — play a card or draw ({count} action${view.turn.actions === 1 ? '' : 's'} left)`, { count: view.turn.actions });
    }
    if (isMyTurn) return t('Your turn — {phase} phase', { phase: t(PHASE_LABEL[view.turn.phase]) });
    return view.turn ? t("{name}'s turn — {phase} phase", { name: view.turn.playerName, phase: t(PHASE_LABEL[view.turn.phase]) }) : '';
  })();

  /* ---------- render ---------- */

  return (
    <main className="game">
      {/* The command rail keeps turn state and utility actions in one predictable place. */}
      <header className="topbar">
        <button className="icon-button topbar-leave" onClick={onLeave} aria-label={t('Leave the game')} title={t('Leave game')}>
          <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="m10 6-6 6 6 6M4 12h12M16 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="topbar-mid">
          <span className="topbar-code" title={t('Room code')}>{t('Realm {code}', { code: view.code })}</span>
          <span className={`topbar-status ${isMyTurn && !view.winner ? 'is-you' : ''}`}>{statusLine}</span>
        </div>
        <TurnTracker turn={view.turn} isMyTurn={isMyTurn} />
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setShowLog((v) => !v)} aria-pressed={showLog} aria-label={t('Open game chronicle')} title={t('Chronicle')}>
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M5 3h11a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Zm2 14h12M8 7h7M8 11h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="icon-button" onClick={toggleMute} aria-pressed={muted} aria-label={t(muted ? 'Unmute sounds' : 'Mute sounds')} title={t(muted ? 'Sound off' : 'Sound on')}>
            {muted ? (
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M5 10v4h4l5 4V6l-5 4H5Zm12-1 4 6m0-6-4 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M5 10v4h4l5 4V6l-5 4H5Zm12-1c1.5 1.7 1.5 4.3 0 6m2.5-8.5c3 3.1 3 7.9 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>
      </header>

      <div className="game-board">
      {/* opponents */}
      <section className={`opponents ${opponents.length <= 2 ? 'few-foes' : ''}`} aria-label={t('Opponents')} style={{ '--opponent-count': Math.max(1, opponents.length) }}>
        {opponents.map((p) => (
          <PlayerPanel
            key={p.id}
            player={p}
            view={view}
            pickable={playerPickable.has(p.id) || targetPickable.has(p.id)}
            onPick={() => choosePlayer(p.id)}
            onCardPick={chooseStableCard}
            candidateSet={candidateSet}
            onInspect={showCardPreview}
            onInspectEnd={hideCardPreview}
          />
        ))}
      </section>

      {/* table center */}
      <section className="table-center" aria-label={t('Table')}>
        <div className="arena-piles">
          <div className="pile" data-zone="deck" title={t('Draw pile — {count} cards', { count: view.deckCount })}>
            <CardView faceDown small count={view.deckCount} />
            <span className="pile-label">{t('Draw pile')}{view.reshuffles > 0 ? t(' · {count}/2 reshuffles', { count: view.reshuffles }) : ''}</span>
          </div>

          <div className="pile" title={t('Discard pile')}>
            {view.discard.length ? (
              <CardView
                iid={view.discard[view.discard.length - 1].iid}
                defId={view.discard[view.discard.length - 1].defId}
                small
                onClick={() => setShowDiscard(true)}
                onInspect={showCardPreview}
                onInspectEnd={hideCardPreview}
                actionLabel={t('Open discard pile')}
              />
            ) : (
              <button type="button" className="pile-empty card card-sm" onClick={() => setShowDiscard(true)}>
                <TypeGlyph type="magic" /><span>{t('Discard')}</span>
              </button>
            )}
            <span className="pile-label">{t('Discard')} · {view.discard.length}</span>
          </div>

          <div className="pile pile-nest" title={t('The Nest — {count} Baby Dragons', { count: view.nestCount })}>
            <CardView defId="baby_dragon" small onInspect={showCardPreview} onInspectEnd={hideCardPreview} />
            <span className="nest-count">{view.nestCount}</span>
            <span className="pile-label">{t('The Nest')}</span>
          </div>
        </div>

        <div className="arena-focus">
        {view.chain.length > 0 && (
          <div className="chain" aria-label={t('Cards being played')}>
            {view.chain.map((e, i) => (
              <div key={e.iid} className="chain-item">
                <CardView iid={e.iid} defId={e.defId} small onInspect={showCardPreview} onInspectEnd={hideCardPreview} />
                <span className="chain-owner">{e.playerName}{e.uncounterable ? t(' · unstoppable') : ''}{i > 0 ? t(' · response') : ''}</span>
              </div>
            ))}
          </div>
        )}
        </div>

        <div className="action-pedestal">
          <div className="action-bar">
            {myPrompt && myPrompt.canSkip && myPrompt.kind !== 'pickList' && (
              <button className="btn" onClick={skipPrompt}>{t('Skip this effect')}</button>
            )}
            {myPrompt && myPrompt.kind === 'pickHand' && (myPrompt.n || 1) > 1 && (
              <button
                className="btn btn-primary"
                disabled={selected.length !== myPrompt.n}
                onClick={() => { sfx.click(); send({ type: 'choose', value: selected }); setSelected([]); }}
              >
                {t('Confirm ({selected}/{total})', { selected: selected.length, total: myPrompt.n })}
              </button>
            )}
            {view.youAreHost && hostToolsNeeded(view) && <HostTools view={view} send={send} />}
          </div>
        </div>
      </section>

      {/* my stable */}
      <section className="my-area" aria-label={t('Your stable')}>
        <PlayerPanel
          player={me}
          view={view}
          isMe
          pickable={playerPickable.has(view.you) || targetPickable.has(view.you)}
          onPick={() => choosePlayer(view.you)}
          onCardPick={chooseStableCard}
          candidateSet={candidateSet}
          onInspect={showCardPreview}
          onInspectEnd={hideCardPreview}
        />
      </section>

      <SideRail view={view} isMyTurn={isMyTurn} send={send} me={me} />
      </div>

      <CardCursorPopup preview={cardPreview} />
      <PlayedCardFlash play={playedFlash} />

      {/* action bar + hand */}
      <section
        className={`hand-area ${(view.playable || []).length ? 'is-ready' : ''} ${view.window?.canRespond ? 'is-roar' : ''}`}
        aria-label={t('Your hand')}
      >
        <div
          className="hand"
          role="group"
          aria-label={t('Your hand, {count} cards', { count: myHand.length })}
          style={{ '--n': myHand.length }}
        >
          {myHand.map((c, i) => {
            const inPrompt = myPrompt && myPrompt.kind === 'pickHand';
            const clickable = inPrompt ? candidateSet.has(c.iid) : playableSet.has(c.iid);
            return (
              <div
                key={c.iid}
                className="fan-slot"
                style={{ '--k': i - (myHand.length - 1) / 2, zIndex: i + 1 }}
              >
                <CardView
                  iid={c.iid}
                  defId={c.defId}
                  small
                  glow={clickable ? (inPrompt ? 'pick' : DEFS[c.defId].type === 'instant' ? 'roar' : 'play') : null}
                  dimmed={(inPrompt || view.window?.canRespond || (isMyTurn && view.canDraw)) && !clickable}
                  selected={selected.includes(c.iid)}
                  onClick={clickable ? () => playFromHand(c.iid) : undefined}
                  onInspect={showCardPreview}
                  onInspectEnd={hideCardPreview}
                  actionLabel={clickable
                    ? `${t(inPrompt ? 'Choose' : 'Play')} ${card(c.defId).name}`
                    : t('Read {card}', { card: card(c.defId).name })}
                />
              </div>
            );
          })}
          {myHand.length === 0 && <p className="hand-empty">{t('Your claws are empty.')}</p>}
        </div>
      </section>

      {/* overlays */}
      {pendingTarget && (
        <Modal title={t('Play {card} on which stable?', { card: card(pendingTarget.defId).name })} onClose={() => setPendingTarget(null)}>
          <div className="player-choices">
            {view.players.map((p) => {
              const ok = targetPickable.has(p.id);
              return (
                <button key={p.id} className="btn player-choice" disabled={!ok} onClick={() => choosePlayer(p.id)}>
                  {p.name}{p.id === view.you ? t(' (you)') : ''}{!ok ? t(' — not allowed') : ''}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {myPrompt && myPrompt.kind === 'yesno' && (
        <Modal title={text(myPrompt.title)}>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => { sfx.click(); send({ type: 'choose', value: true }); }}>{t('Yes')}</button>
            <button className="btn" onClick={() => { sfx.click(); send({ type: 'choose', value: false }); }}>{t('No')}</button>
          </div>
        </Modal>
      )}

      {myPrompt && myPrompt.kind === 'pickPlayer' && (
        <Modal title={text(myPrompt.title)}>
          <div className="player-choices">
            {myPrompt.candidates.map((pid) => {
              const p = view.players.find((x) => x.id === pid);
              return (
                <button key={pid} className="btn player-choice" onClick={() => choosePlayer(pid)}>
                  {p ? p.name : pid}
                </button>
              );
            })}
          </div>
          {myPrompt.canSkip && <button className="btn btn-ghost" onClick={skipPrompt}>{t('Skip')}</button>}
        </Modal>
      )}

      {myPrompt && myPrompt.kind === 'pickList' && (
        <Modal title={text(myPrompt.title)} wide>
          <div className="card-grid">
            {myPrompt.candidates.map((c) => (
              <CardView key={c.iid} defId={c.defId} small onClick={() => { sfx.click(); send({ type: 'choose', value: c.iid }); }} onInspect={showCardPreview} onInspectEnd={hideCardPreview} glow="pick" />
            ))}
          </div>
          {myPrompt.canSkip && <button className="btn btn-ghost" onClick={skipPrompt}>{t('Take nothing')}</button>}
        </Modal>
      )}

      {showDiscard && (
        <Modal title={t('Discard pile ({count})', { count: view.discard.length })} onClose={() => setShowDiscard(false)} wide>
          {view.discard.length ? (
            <div className="card-grid">
              {[...view.discard].reverse().map((c) => <CardView key={c.iid} defId={c.defId} small onInspect={showCardPreview} onInspectEnd={hideCardPreview} />)}
            </div>
          ) : <p className="muted-text">{t('Nothing here yet.')}</p>}
        </Modal>
      )}

      {view.winner && (
        <Modal title={t('Victory!')}>
          <p className="win-text">{text(view.winner.reason)}</p>
          <div className="modal-actions">
            {view.youAreHost && (
              <button className="btn btn-primary" onClick={() => { sfx.click(); send({ type: 'restart' }); }}>{t('Rematch')}</button>
            )}
            <button className="btn" onClick={onLeave}>{t('Leave room')}</button>
          </div>
        </Modal>
      )}

      {/* game log drawer */}
      <aside className={`log-drawer ${showLog ? 'open' : ''}`} aria-label={t('Game chronicle')} aria-hidden={!showLog}>
        <div className="log-head">
          <div>
            <span className="log-eyebrow">{t('Realm history')}</span>
            <h2>{t('Chronicle')}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(false)} aria-label={t('Close chronicle')}>{t('Close')}</button>
        </div>
        <ol className="log-list" aria-live="polite" aria-relevant="additions">
          {view.log.map((entry) => (
            <ChronicleEntry
              key={entry.n}
              entry={entry}
              onInspect={showCardPreview}
              onInspectEnd={hideCardPreview}
            />
          ))}
          <li ref={logEndRef} className="log-end" aria-hidden="true" />
        </ol>
      </aside>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function ChronicleEntry({ entry, onInspect, onInspectEnd }) {
  const { t, text, card } = useI18n();
  const def = entry.defId ? card(entry.defId) : null;
  if (!def) {
    return (
      <li className="log-entry log-entry-text">
        <span className="log-seq" aria-hidden="true">{entry.n}</span>
        <p>{text(entry.msg)}</p>
      </li>
    );
  }

  return (
    <li className="log-entry log-entry-card">
      <div className="chronicle-card">
        <CardView
          defId={entry.defId}
          mini
          onInspect={onInspect}
          onInspectEnd={onInspectEnd}
          actionLabel={t('Inspect {card}', { card: def.name })}
          title={t('Inspect {card}', { card: def.name })}
        />
      </div>
      <div className="log-copy">
        <span className="log-kicker"><TypeGlyph type={def.type} /> {t('Card played')}</span>
        <strong>{def.name}</strong>
        <p>{text(entry.msg)}</p>
      </div>
    </li>
  );
}

// Right-hand score rail: opponent tally on top, the timer and round action in
// the middle (draw / pass-response), your tally at the bottom.
function SideRail({ view, isMyTurn, send, me }) {
  const { t, text } = useI18n();
  const foes = view.players.filter((p) => p.id !== view.you);
  const topFoe = foes.reduce((best, p) => (!best || p.dragons > best.dragons ? p : best), null);
  const respond = view.window && view.window.canRespond;

  return (
    <aside className="side-rail" aria-label={t('Score and turn actions')}>
      {topFoe && (
        <div className={`rail-score ${view.turn?.playerId === topFoe.id ? 'is-turn' : ''}`}>
          <span className="rail-score-name">{foes.length > 1 ? t('Top rival · {name}', { name: topFoe.name }) : topFoe.name}</span>
          <strong>{topFoe.dragons}</strong>
          <span className="rail-score-goal">{t('of {goal}', { goal: view.winThreshold })}</span>
        </div>
      )}

      <div className="rail-middle">
        <div className="rail-action">
          <TurnTimer turn={view.turn} serverNow={view.serverNow} isMyTurn={isMyTurn} />
          {respond ? (
            <button
              type="button"
              className="medallion medallion-pass"
              aria-label={t('Pass — let {card} resolve', { card: text(view.window.topName) })}
              onClick={() => { sfx.click(); send({ type: 'pass' }); }}
            >
              <em>{t('Let it resolve')}</em>
              <strong>{t('PASS')}</strong>
            </button>
          ) : view.canDraw ? (
            <button
              type="button"
              className="medallion medallion-draw"
              aria-label={t('Draw a card and end your turn')}
              onClick={() => { sfx.click(); send({ type: 'drawAction' }); }}
            >
              <em>{t('End turn &')}</em>
              <strong>{t('DRAW')}</strong>
            </button>
          ) : (
            <div className={`medallion medallion-idle ${isMyTurn ? 'is-you' : ''}`} aria-hidden="true">
              <strong>{view.winThreshold}</strong>
              <em>{t('to win')}</em>
            </div>
          )}
        </div>
        <span className="rail-turn">{isMyTurn ? t('Your move') : t("{name}'s move", { name: view.turn?.playerName ?? '—' })}</span>
      </div>

      <div className={`rail-score rail-score-you ${isMyTurn ? 'is-turn' : ''}`}>
        <span className="rail-score-name">{t('You')}</span>
        <strong>{me ? me.dragons : 0}</strong>
        <span className="rail-score-goal">{t('of {goal}', { goal: view.winThreshold })}</span>
      </div>
    </aside>
  );
}

function TurnTimer({ turn, serverNow, isMyTurn }) {
  const { t } = useI18n();
  const initial = Math.max(0, (turn?.deadline || 0) - (serverNow || Date.now()));
  const [remaining, setRemaining] = useState(initial);

  useEffect(() => {
    if (!turn?.deadline) {
      setRemaining(0);
      return undefined;
    }
    const localDeadline = performance.now() + Math.max(0, turn.deadline - (serverNow || Date.now()));
    const update = () => setRemaining(Math.max(0, localDeadline - performance.now()));
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [turn?.deadline, serverNow]);

  if (!turn?.deadline) return null;
  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, remaining / 60_000));
  const urgency = seconds <= 10 ? 'is-urgent' : seconds <= 20 ? 'is-warning' : '';
  return (
    <div
      className={`turn-timer ${isMyTurn ? 'is-you' : ''} ${urgency}`}
      role="timer"
      aria-label={t("{seconds} seconds remaining in {name}'s turn", { seconds, name: turn.playerName })}
      style={{ '--timer-progress': progress }}
    >
      <span className="timer-crest" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 3h10M7 21h10M8 4c0 4 1.4 5.4 4 8-2.6 2.6-4 4-4 8m8-16c0 4-1.4 5.4-4 8 2.6 2.6 4 4 4 8" />
          <path d="M9.2 7h5.6M9.3 17h5.4" />
        </svg>
      </span>
      <strong className="timer-number">{seconds}</strong>
      <span className="timer-unit">{t(seconds <= 10 ? 'Hurry' : 'seconds')}</span>
      <span className="timer-track" aria-hidden="true">
        <span className="timer-fill" />
        <span className="timer-ticks" />
      </span>
    </div>
  );
}

function CardCursorPopup({ preview }) {
  if (!preview) return null;
  return (
    <aside
      className="card-cursor-popup"
      role="tooltip"
      aria-live="polite"
      style={{ left: preview.x, top: preview.y }}
    >
      <CardDetails defId={preview.defId} compact />
    </aside>
  );
}

function PlayedCardFlash({ play }) {
  const { t, card } = useI18n();
  if (!play || !DEFS[play.defId]) return null;
  const def = card(play.defId);
  return (
    <div key={play.n} className="played-card-flash" role="status" aria-live="polite">
      <div className="played-card-flash-content">
        <span>{t('{name} played', { name: play.playerName })}</span>
        <CardView defId={play.defId} />
        <strong>{def.name}</strong>
        {play.targetName && <small>{t("on {name}'s stable", { name: play.targetName })}</small>}
      </div>
    </div>
  );
}

function TurnTracker({ turn, isMyTurn }) {
  const { t } = useI18n();
  if (!turn) return null;
  const phaseIndex = { start: 0, draw: 1, action: 2, end: 3 }[turn.phase] ?? 0;
  return (
    <div className={`turn-tracker ${isMyTurn ? 'is-you' : ''}`} aria-label={t('Turn phase: {phase}', { phase: t(PHASE_LABEL[turn.phase]) })}>
      {['Start', 'Draw', 'Action', 'End'].map((label, index) => (
        <span key={label} className={index < phaseIndex ? 'is-done' : index === phaseIndex ? 'is-current' : ''}>
          <i>{index + 1}</i><b>{t(label)}</b>
        </span>
      ))}
    </div>
  );
}

function hostToolsNeeded(view) {
  const someoneOff = view.players.some((p) => !p.connected);
  return someoneOff && view.status === 'playing';
}

function HostTools({ view, send }) {
  const { t } = useI18n();
  return (
    <details className="host-tools">
      <summary className="btn btn-ghost btn-sm">{t('Host tools')}</summary>
      <div className="host-tools-menu">
        <button className="btn btn-sm" onClick={() => send({ type: 'forceChoice' })}>{t('Auto-resolve stuck choice')}</button>
        <button className="btn btn-sm" onClick={() => send({ type: 'forcePass' })}>{t('Pass for disconnected')}</button>
        <button className="btn btn-sm" onClick={() => send({ type: 'forceEndTurn' })}>{t('Skip disconnected turn')}</button>
      </div>
    </details>
  );
}

function Modal({ title, children, onClose, wide }) {
  const { t } = useI18n();
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-button" onClick={onClose} aria-label={t('Close')}>
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function PlayerPanel({ player: p, view, isMe, pickable, onPick, onCardPick, candidateSet, onInspect, onInspectEnd }) {
  const { t } = useI18n();
  const isTurn = view.turn && view.turn.playerId === p.id;
  const visibleHand = !isMe && view.hands[p.id];
  const compactStable = !isMe && view.players.length > 3;

  return (
    <div
      className={[
        'player-panel',
        isMe ? 'is-me' : '',
        isTurn ? 'is-turn' : '',
        pickable ? 'is-pickable' : '',
        !p.connected ? 'is-away' : '',
        compactStable ? 'has-compact-stable' : 'has-full-stable',
      ].filter(Boolean).join(' ')}
    >
      <header className="player-head">
        <span className="avatar" style={{ '--seat': p.seat }} aria-hidden="true">
          {p.name.charAt(0).toUpperCase()}
          <i className={`avatar-dot ${p.connected ? 'dot-on' : 'dot-off'}`} />
        </span>
        <span className="player-name">{p.name}{isMe ? t(' (you)') : ''}</span>
        {p.isHost && <span className="badge badge-host">{t('Host')}</span>}
        {p.isBot && <span className="badge badge-bot">{t('Bot')} · {t(p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1))}</span>}
        <span className="player-meta">
          <span className="badge badge-dragons" title={t('Dragons / goal')}>{p.dragons}/{view.winThreshold}</span>
          {!isMe && <span className="badge" title={t('Cards in hand')}>{t('{count} cards', { count: p.handCount })}</span>}
        </span>
      </header>

      {pickable && (
        <button type="button" className="player-target" onClick={onPick}>{t("Choose {name}'s stable", { name: p.name })}</button>
      )}

      {p.mods.filter((m) => MOD_BADGES[m]).length > 0 && (
        <div className="player-mods">
          {p.mods.filter((m) => MOD_BADGES[m]).map((m) => (
            <span key={m} className={`badge badge-mod mod-${m}`} title={t(MOD_BADGES[m][1])}>{t(MOD_BADGES[m][0])}</span>
          ))}
        </div>
      )}

      <div className="stable" style={{ '--stable-count': Math.max(1, p.stable.length) }}>
        <div className="stable-row stable-cards">
          {p.stable.map((c) => (
            <CardView
              key={c.iid}
              iid={c.iid}
              defId={c.defId}
              small={!compactStable}
              mini={compactStable}
              toad={c.toad}
              suppressed={c.suppressed}
              glow={candidateSet.has(c.iid) ? 'pick' : null}
              onClick={candidateSet.has(c.iid) ? () => onCardPick(c.iid) : undefined}
              onInspect={onInspect}
              onInspectEnd={onInspectEnd}
            />
          ))}
          {p.stable.length === 0 && <span className="stable-empty">{t('Empty stable')}</span>}
        </div>
      </div>

      {visibleHand && (
        <div className="revealed-hand" title={t('Hand revealed by Scrying Orb')}>
          {visibleHand.map((c) => <CardView key={c.iid} iid={c.iid} defId={c.defId} mini onInspect={onInspect} onInspectEnd={onInspectEnd} />)}
        </div>
      )}
    </div>
  );
}
