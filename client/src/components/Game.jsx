import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CardView, { TypeGlyph } from './CardView.jsx';
import { DEFS } from '../../../shared/cards.js';
import { sfx, playLogSound, isMuted, setMuted } from '../sound.js';
import { useI18n } from '../i18n/index.jsx';
import ChronicleEntry from './game/ChronicleEntry.jsx';
import { HostTools, hostToolsNeeded } from './game/HostTools.jsx';
import { CardCursorPopup, Modal, PlayedCardFlash } from './game/Overlays.jsx';
import PlayerPanel from './game/PlayerPanel.jsx';
import { SideRail, TurnTracker } from './game/TurnUi.jsx';
import { PHASE_LABEL } from './game/constants.js';
import { useCardFlight } from './game/useCardFlight.js';

export default function Game({ view, send, onLeave }) {
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
                touchInspectFirst
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
            {view.youAreHost && hostToolsNeeded(view) && <HostTools send={send} />}
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
                  touchInspectFirst={clickable}
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
              <CardView key={c.iid} defId={c.defId} small onClick={() => { sfx.click(); send({ type: 'choose', value: c.iid }); }} onInspect={showCardPreview} onInspectEnd={hideCardPreview} touchInspectFirst glow="pick" />
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
