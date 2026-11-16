import React from 'react';
import CardView, { FactionGlyph } from '../CardView.jsx';
import { FACTIONS } from '../../../../shared/cards.js';
import { useI18n } from '../../i18n/index.jsx';
import { BAD_MODS, MOD_BADGES } from './constants.js';

export default function PlayerPanel({ player, view, isMe, pickable, onPick, onCardPick, candidateSet, onInspect, onInspectEnd }) {
  const { t } = useI18n();
  const isTurn = view.turn?.playerId === player.id;
  const compactStable = !isMe && view.players.length > 3;
  const activeMods = player.mods.filter((mod) => MOD_BADGES[mod]);
  const faction = FACTIONS[player.faction] || FACTIONS.dragon;
  // Scrying Orb (mods: handVisible) puts this hand in every viewer's `view.hands`,
  // keyed by owner id — including our own. Only opponents need the extra row;
  // our own hand already renders in the main hand tray.
  const revealedHand = !isMe ? view.hands?.[player.id] : null;
  const wildCount = player.stable.filter((c) => c.wild).length;

  return (
    <div
      className={[
        'player-panel',
        `panel-${player.faction || 'dragon'}`,
        isMe ? 'is-me' : '',
        isTurn ? 'is-turn' : '',
        pickable ? 'is-pickable' : '',
        !player.connected ? 'is-away' : '',
        compactStable ? 'has-compact-stable' : 'has-full-stable',
      ].filter(Boolean).join(' ')}
    >
      <header className="player-head">
        <span className={`avatar avatar-${player.faction || 'dragon'}`} style={{ '--seat': player.seat }} aria-hidden="true">
          <FactionGlyph faction={player.faction} />
          <i className={`avatar-dot ${player.connected ? 'dot-on' : 'dot-off'}`} />
        </span>
        <span className="player-name">{player.name}{isMe ? t(' (you)') : ''}</span>
        <span className={`badge badge-faction faction-${player.faction}`} title={t(faction.name)}>{t(faction.creatures)}</span>
        {player.isHost && <span className="badge badge-host">{t('Host')}</span>}
        {player.isBot && (
          <span className="badge badge-bot">
            {t('Bot')} · {t(player.difficulty.charAt(0).toUpperCase() + player.difficulty.slice(1))}
          </span>
        )}
        <span className="player-meta">
          <span className="badge badge-dragons" title={t('Creatures / goal')}>{player.creatures}/{view.winThreshold}</span>
          {wildCount > 0 && <span className="badge badge-wild" title={t('Wild creatures: rival faction, abilities dormant')}>{t('{count} wild', { count: wildCount })}</span>}
        </span>
      </header>

      {pickable && (
        <button type="button" className="player-target" onClick={onPick}>{t("Choose {name}'s stable", { name: player.name })}</button>
      )}

      {activeMods.length > 0 && (
        <div className="player-mods">
          {activeMods.map((mod) => (
            <span key={mod} className={`badge badge-mod mod-${mod} ${BAD_MODS.has(mod) ? 'is-bad' : ''}`} title={t(MOD_BADGES[mod][1])}>{t(MOD_BADGES[mod][0])}</span>
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
                wild={stableCard.wild}
                tamed={stableCard.tamed}
                suppressed={stableCard.suppressed}
                glow={isCandidate ? 'pick' : null}
                onClick={isCandidate ? () => onCardPick(stableCard.iid) : undefined}
                onInspect={onInspect}
                onInspectEnd={onInspectEnd}
                touchInspectFirst={isCandidate}
                actionVerb={isCandidate ? t('Choose') : undefined}
              />
            );
          })}
          {player.stable.length === 0 && <span className="stable-empty">{t('Empty stable')}</span>}
        </div>
      </div>

      {!isMe && (
        <FoeHand
          revealed={revealedHand}
          count={player.handCount}
          backFaction={view.settings?.deckMode === 'faction' ? player.faction : 'neutral'}
          onInspect={onInspect}
          onInspectEnd={onInspectEnd}
        />
      )}
    </div>
  );
}

// Past ten the fan stops reading as individual cards; the exact number stays on
// the badge in the header.
const FOE_HAND_MAX = 10;

// The mirror of the local hand: a fan hanging from the top edge of the rank.
// Face-down normally, face-up while a Scrying Orb keeps the hand revealed.
function FoeHand({ revealed, count, backFaction, onInspect, onInspectEnd }) {
  const { t } = useI18n();
  const cards = revealed && revealed.length ? revealed.slice(0, FOE_HAND_MAX) : null;
  const size = cards ? cards.length : Math.min(count, FOE_HAND_MAX);
  if (size <= 0) return null;

  return (
    <div
      className={`foe-hand ${cards ? 'is-revealed' : ''}`}
      style={{ '--n': size }}
      aria-label={cards ? t('Hand revealed by Scrying Orb') : t('{count} cards in hand', { count })}
      title={cards ? t('Hand revealed by Scrying Orb') : undefined}
    >
      {Array.from({ length: size }, (_, index) => (
        <div
          key={cards ? cards[index].iid : index}
          className="foe-slot"
          style={{ '--k': index - (size - 1) / 2, zIndex: index + 1 }}
        >
          {cards ? (
            <CardView
              iid={cards[index].iid}
              defId={cards[index].defId}
              small
              onInspect={onInspect}
              onInspectEnd={onInspectEnd}
            />
          ) : (
            <CardView faceDown small backFaction={backFaction} />
          )}
        </div>
      ))}
    </div>
  );
}
