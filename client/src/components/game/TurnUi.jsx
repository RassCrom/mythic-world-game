import React, { useEffect, useState } from 'react';
import { sfx } from '../../sound.js';
import { useI18n } from '../../i18n/index.jsx';
import { PHASE_LABEL } from './constants.js';

const TURN_LENGTH_MS = 60_000;
const MAX_PIPS = 9;

export function SideRail({ view, isMyTurn, send, me }) {
  const { t, text } = useI18n();
  const foes = view.players.filter((player) => player.id !== view.you);
  const topFoe = foes.reduce((best, player) => (
    !best || player.creatures > best.creatures ? player : best
  ), null);
  const canRespond = Boolean(view.window?.canRespond);

  return (
    <aside className="side-rail" aria-label={t('Score and turn actions')}>
      {topFoe && (
        <RailScore
          name={foes.length > 1 ? t('Top rival · {name}', { name: topFoe.name }) : topFoe.name}
          creatures={topFoe.creatures}
          goal={view.winThreshold}
          faction={topFoe.faction}
          isTurn={view.turn?.playerId === topFoe.id}
        />
      )}

      <div className="rail-middle">
        <TurnDial turn={view.turn} serverNow={view.serverNow} isMyTurn={isMyTurn}>
          {canRespond ? (
            <button
              type="button"
              className="coin coin-pass"
              aria-label={t('Pass — let {card} resolve', { card: text(view.window.topName) })}
              onClick={() => { sfx.click(); send({ type: 'pass' }); }}
            >
              <em>{t('Let it resolve')}</em>
              <strong>{t('PASS')}</strong>
            </button>
          ) : view.canDraw ? (
            <button
              type="button"
              className="coin coin-draw"
              aria-label={t('Draw a card and end your turn')}
              onClick={() => { sfx.click(); send({ type: 'drawAction' }); }}
            >
              <em>{t('End turn &')}</em>
              <strong>{t('DRAW')}</strong>
            </button>
          ) : (
            <div className={`coin coin-idle ${isMyTurn ? 'is-you' : ''}`} aria-hidden="true">
              <strong>{view.winThreshold}</strong>
              <em>{t('to win')}</em>
            </div>
          )}
        </TurnDial>
        <span className={`rail-turn ${isMyTurn ? 'is-you' : ''}`}>{isMyTurn ? t('Your move') : t("{name}'s move", { name: view.turn?.playerName ?? '—' })}</span>
      </div>

      <RailScore
        name={t('You')}
        creatures={me ? me.creatures : 0}
        goal={view.winThreshold}
        faction={me?.faction}
        isTurn={isMyTurn}
        isYou
      />
    </aside>
  );
}

// The score reads as a numeral over a row of crystal pips — one per creature
// still needed — so progress toward the goal is legible without arithmetic.
function RailScore({ name, creatures, goal, faction, isTurn, isYou }) {
  const { t } = useI18n();
  const pips = goal <= MAX_PIPS ? goal : 0;
  return (
    <div
      className={`rail-score ${isYou ? 'rail-score-you' : ''} ${isTurn ? 'is-turn' : ''} score-${faction || 'neutral'}`}
      aria-label={t('{name}: {count} of {goal} creatures', { name, count: creatures, goal })}
    >
      <span className="rail-score-name">{name}</span>
      <strong aria-hidden="true">{creatures}<small>/{goal}</small></strong>
      {pips ? (
        <span className="rail-pips" aria-hidden="true">
          {Array.from({ length: pips }, (_, index) => (
            <i key={index} className={index < creatures ? 'is-lit' : ''} />
          ))}
        </span>
      ) : (
        <span className="rail-score-goal" aria-hidden="true">{t('of {goal}', { goal })}</span>
      )}
    </div>
  );
}

// A round clock face: the coin sits in the middle and the remaining time drains
// anticlockwise out of the ring around it, so the action and its deadline are
// one object instead of two competing widgets.
function TurnDial({ turn, serverNow, isMyTurn, children }) {
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(() => Math.max(0, (turn?.deadline || 0) - (serverNow || Date.now())));

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

  if (!turn?.deadline) return <div className="turn-dial is-blank">{children}</div>;

  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, remaining / TURN_LENGTH_MS));
  const urgency = seconds <= 10 ? 'is-urgent' : seconds <= 20 ? 'is-warning' : '';

  return (
    <div
      className={`turn-dial ${isMyTurn ? 'is-you' : ''} ${urgency}`}
      style={{ '--dial-progress': progress }}
    >
      <span className="dial-track" aria-hidden="true" />
      <span className="dial-sweep" aria-hidden="true" />
      <span className="dial-notches" aria-hidden="true" />
      {children}
      <span
        className="dial-clock"
        role="timer"
        aria-label={t("{seconds} seconds remaining in {name}'s turn", { seconds, name: turn.playerName })}
      >
        {seconds}
      </span>
    </div>
  );
}

export function TurnTracker({ turn, isMyTurn }) {
  const { t } = useI18n();
  if (!turn) return null;
  const phaseIndex = { start: 0, draw: 1, action: 2, end: 3 }[turn.phase] ?? 0;
  return (
    <div className={`turn-tracker ${isMyTurn ? 'is-you' : ''}`} aria-label={t('Turn phase: {phase}', { phase: t(PHASE_LABEL[turn.phase]) })}>
      {['Start', 'Draw', 'Action', 'End'].map((label, index) => (
        <span key={label} className={index < phaseIndex ? 'is-done' : index === phaseIndex ? 'is-current' : ''}>
          <i aria-hidden="true" /><b>{t(label)}</b>
        </span>
      ))}
    </div>
  );
}
