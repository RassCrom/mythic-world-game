import React, { useEffect, useState } from 'react';
import { sfx } from '../../sound.js';
import { useI18n } from '../../i18n/index.jsx';
import { PHASE_LABEL } from './constants.js';

export function SideRail({ view, isMyTurn, send, me }) {
  const { t, text } = useI18n();
  const foes = view.players.filter((player) => player.id !== view.you);
  const topFoe = foes.reduce((best, player) => (
    !best || player.dragons > best.dragons ? player : best
  ), null);
  const canRespond = Boolean(view.window?.canRespond);

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
          {canRespond ? (
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

export function TurnTracker({ turn, isMyTurn }) {
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
