import React from 'react';
import CardView from '../CardView.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { MOD_BADGES } from './constants.js';

export default function PlayerPanel({ player, view, isMe, pickable, onPick, onCardPick, candidateSet, onInspect, onInspectEnd }) {
  const { t } = useI18n();
  const isTurn = view.turn?.playerId === player.id;
  const compactStable = !isMe && view.players.length > 3;
  const activeMods = player.mods.filter((mod) => MOD_BADGES[mod]);

  return (
    <div
      className={[
        'player-panel',
        isMe ? 'is-me' : '',
        isTurn ? 'is-turn' : '',
        pickable ? 'is-pickable' : '',
        !player.connected ? 'is-away' : '',
        compactStable ? 'has-compact-stable' : 'has-full-stable',
      ].filter(Boolean).join(' ')}
    >
      <header className="player-head">
        <span className="avatar" style={{ '--seat': player.seat }} aria-hidden="true">
          {player.name.charAt(0).toUpperCase()}
          <i className={`avatar-dot ${player.connected ? 'dot-on' : 'dot-off'}`} />
        </span>
        <span className="player-name">{player.name}{isMe ? t(' (you)') : ''}</span>
        {player.isHost && <span className="badge badge-host">{t('Host')}</span>}
        {player.isBot && (
          <span className="badge badge-bot">
            {t('Bot')} · {t(player.difficulty.charAt(0).toUpperCase() + player.difficulty.slice(1))}
          </span>
        )}
        <span className="player-meta">
          <span className="badge badge-dragons" title={t('Dragons / goal')}>{player.dragons}/{view.winThreshold}</span>
          {!isMe && <span className="badge" title={t('Cards in hand')}>{t('{count} cards', { count: player.handCount })}</span>}
        </span>
      </header>

      {pickable && (
        <button type="button" className="player-target" onClick={onPick}>{t("Choose {name}'s stable", { name: player.name })}</button>
      )}

      {activeMods.length > 0 && (
        <div className="player-mods">
          {activeMods.map((mod) => (
            <span key={mod} className={`badge badge-mod mod-${mod}`} title={t(MOD_BADGES[mod][1])}>{t(MOD_BADGES[mod][0])}</span>
          ))}
        </div>
      )}

      <div className="stable" style={{ '--stable-count': Math.max(1, player.stable.length) }}>
        <div className="stable-row stable-cards">
          {player.stable.map((stableCard) => {
            const isCandidate = candidateSet.has(stableCard.iid);
            return (
              <CardView
                key={stableCard.iid}
                iid={stableCard.iid}
                defId={stableCard.defId}
                small={!compactStable}
                mini={compactStable}
                toad={stableCard.toad}
                suppressed={stableCard.suppressed}
                glow={isCandidate ? 'pick' : null}
                onClick={isCandidate ? () => onCardPick(stableCard.iid) : undefined}
                onInspect={onInspect}
                onInspectEnd={onInspectEnd}
                touchInspectFirst={isCandidate}
              />
            );
          })}
          {player.stable.length === 0 && <span className="stable-empty">{t('Empty stable')}</span>}
        </div>
      </div>
    </div>
  );
}
