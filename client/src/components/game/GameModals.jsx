import React from 'react';
import CardView, { FactionGlyph } from '../CardView.jsx';
import { FACTIONS } from '../../../../shared/cards.js';
import { sfx } from '../../sound.js';
import { useI18n } from '../../i18n/index.jsx';
import { Modal } from './Overlays.jsx';

// Every blocking surface the table can raise: choosing a stable for an
// attachment, answering a prompt, browsing the discard, and the result.
export default function GameModals({
  view, myPrompt, send, onLeave, skipPrompt,
  pendingTarget, setPendingTarget, targetPickable, choosePlayer,
  showDiscard, setShowDiscard, onInspect, onInspectEnd,
}) {
  const { t, text, card } = useI18n();

  return (
    <>
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
              <CardView
                key={c.iid}
                defId={c.defId}
                small
                onClick={() => { sfx.click(); send({ type: 'choose', value: c.iid }); }}
                onInspect={onInspect}
                onInspectEnd={onInspectEnd}
                touchInspectFirst
                glow="pick"
              />
            ))}
          </div>
          {myPrompt.canSkip && <button className="btn btn-ghost" onClick={skipPrompt}>{t('Take nothing')}</button>}
        </Modal>
      )}

      {showDiscard && (
        <Modal title={t('Discard pile ({count})', { count: view.discard.length })} onClose={() => setShowDiscard(false)} wide>
          {view.discard.length ? (
            <div className="card-grid">
              {[...view.discard].reverse().map((c) => (
                <CardView key={c.iid} defId={c.defId} small onInspect={onInspect} onInspectEnd={onInspectEnd} />
              ))}
            </div>
          ) : <p className="muted-text">{t('Nothing here yet.')}</p>}
        </Modal>
      )}

      {view.winner && (
        <Modal title={view.winner.youWon ? t('Victory!') : t('Defeat…')}>
          <div className={`win-banner faction-${view.winner.faction || 'dragon'}`} aria-hidden="true">
            <FactionGlyph faction={view.winner.faction} />
          </div>
          <p className="win-text">{text(view.winner.reason)}</p>
          {view.settings?.factionWar && view.winner.faction && (
            <p className="win-sub">{t('The {faction} share the victory.', { faction: t(FACTIONS[view.winner.faction].name) })}</p>
          )}
          <div className="modal-actions">
            {view.youAreHost && (
              <button className="btn btn-primary" onClick={() => { sfx.click(); send({ type: 'restart' }); }}>{t('Rematch')}</button>
            )}
            <button className="btn" onClick={onLeave}>{t('Leave room')}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
