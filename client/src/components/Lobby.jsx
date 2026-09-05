import React, { useState } from 'react';
import { sfx } from '../sound.js';
import { useI18n } from '../i18n/index.jsx';
import { FACTIONS, FACTION_IDS } from '../../../shared/cards.js';
import { FactionGlyph } from './CardView.jsx';

export default function Lobby({ view, send, onLeave, showToast }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [botFaction, setBotFaction] = useState('auto');
  const canStart = view.youAreHost && view.players.length >= 2;
  const roomFull = view.players.length >= 8;
  const me = view.players.find((p) => p.id === view.you);
  const counts = Object.fromEntries(FACTION_IDS.map((f) => [f, view.players.filter((p) => p.faction === f).length]));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(view.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(t('Copy failed — the code is {code}', { code: view.code }), true);
    }
  };

  const pickFaction = (faction) => {
    if (me?.faction === faction) return;
    sfx.click();
    send({ type: 'setFaction', faction });
  };

  return (
    <main className="lobby">
      <div className="lobby-card">
        <h1 className="lobby-title">{t('The Roost')}</h1>
        <p className="lobby-sub">{t('Pick a side, gather your players, then let the sparks fly.')}</p>

        <button className="room-code" onClick={copy} title={t('Copy room code')}>
          <span className="room-code-label">{t('Room code')}</span>
          <span className="room-code-value">{view.code}</span>
          <span className="room-code-copy">{copied ? t('Copied!') : t('Tap to copy')}</span>
        </button>

        <section className="faction-pick" aria-label={t('Choose your faction')}>
          {FACTION_IDS.map((id) => {
            const f = FACTIONS[id];
            const active = me?.faction === id;
            return (
              <button
                key={id}
                type="button"
                className={`faction-option faction-${id} ${active ? 'is-active' : ''}`}
                onClick={() => pickFaction(id)}
                aria-pressed={active}
              >
                <span className="faction-emblem"><FactionGlyph faction={id} /></span>
                <span className="faction-copy">
                  <strong>{t(f.name)}</strong>
                  <small>{t(f.blurb)}</small>
                  <em>{t(f.passiveName)}: {t(f.passive)}</em>
                </span>
                <span className="faction-count">{counts[id]}</span>
              </button>
            );
          })}
        </section>

        <ul className="lobby-players" aria-label={t('Players in the room')}>
          {view.players.map((p) => (
            <li key={p.id} className={`${p.connected ? '' : 'player-away'} row-${p.faction}`}>
              <span className={`dot ${p.connected ? 'dot-on' : 'dot-off'}`} aria-hidden="true" />
              <span className={`lobby-faction faction-${p.faction}`} title={t(FACTIONS[p.faction]?.name || '')}><FactionGlyph faction={p.faction} /></span>
              <span className="lobby-player-name">{p.name}{p.id === view.you ? t(' (you)') : ''}</span>
              {p.isHost && <span className="badge badge-host">{t('Host')}</span>}
              {p.isBot && <span className="badge badge-bot">{t('Bot')} · {t(p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1))}</span>}
              {p.isBot && view.youAreHost && (
                <button
                  className="btn btn-ghost btn-sm bot-remove"
                  aria-label={t('Remove {name}', { name: p.name })}
                  onClick={() => { sfx.click(); send({ type: 'removeBot', playerId: p.id }); }}
                >
                  <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: Math.max(0, 2 - view.players.length) }, (_, i) => (
            <li key={'empty' + i} className="player-empty">{t('Waiting for a challenger…')}</li>
          ))}
        </ul>

        {view.youAreHost && (
          <>
            <div className="bot-row">
              <label className="field bot-field">
                <span>{t('Bot difficulty')}</span>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">{t('Easy')}</option>
                  <option value="medium">{t('Medium')}</option>
                  <option value="hard">{t('Hard')}</option>
                </select>
              </label>
              <label className="field bot-field">
                <span>{t('Bot faction')}</span>
                <select value={botFaction} onChange={(e) => setBotFaction(e.target.value)}>
                  <option value="auto">{t('Balance the table')}</option>
                  {FACTION_IDS.map((id) => <option key={id} value={id}>{t(FACTIONS[id].name)}</option>)}
                </select>
              </label>
              <button
                className="btn"
                disabled={roomFull}
                onClick={() => { sfx.click(); send({ type: 'addBot', difficulty, faction: botFaction === 'auto' ? undefined : botFaction }); }}
              >
                {roomFull ? t('Room full') : t('Add a bot')}
              </button>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={!!view.settings?.factionWar}
                onChange={(e) => { sfx.click(); send({ type: 'setSettings', settings: { factionWar: e.target.checked } }); }}
              />
              <span>
                <strong>{t('Faction War')}</strong>
                <small>{t('When anyone wins, their whole faction shares the victory.')}</small>
              </span>
            </label>
          </>
        )}
        {!view.youAreHost && view.settings?.factionWar && (
          <p className="lobby-rule">{t('Faction War is on: a win is shared by the whole faction.')}</p>
        )}

        {view.youAreHost ? (
          <button
            className="btn btn-primary btn-lg"
            disabled={!canStart}
            onClick={() => { sfx.click(); send({ type: 'start' }); }}
          >
            {canStart ? t('Start the game') : t('Need at least 2 players')}
          </button>
        ) : (
          <p className="lobby-wait">{t('Waiting for the host to start… ({count}/8 seats filled)', { count: view.players.length })}</p>
        )}

        <button className="btn btn-ghost" onClick={onLeave}>{t('Leave room')}</button>
      </div>
    </main>
  );
}
