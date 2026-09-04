import React, { useState } from 'react';
import { sfx } from '../sound.js';
import { LanguageSwitcher, useI18n } from '../i18n/index.jsx';
import BattlefieldSettings from './home/BattlefieldSettings.jsx';
import { DEFAULT_FACTION_ID, FACTIONS } from '../../../shared/cards.js';

export default function Home({ onCreate, onJoin, busy, onOpenStudio }) {
  const { t } = useI18n();
  const [name, setName] = useState(localStorage.getItem('ud_name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'join'
  const [factionId, setFactionId] = useState(() => localStorage.getItem('ud_faction') || DEFAULT_FACTION_ID);
  const selectedFaction = FACTIONS[factionId] || FACTIONS[DEFAULT_FACTION_ID];

  const validName = name.trim().length >= 1;

  const create = () => {
    if (!validName) return;
    sfx.click();
    localStorage.setItem('ud_faction', selectedFaction.id);
    onCreate(name.trim(), selectedFaction.id);
  };
  const join = (e) => {
    e.preventDefault();
    if (!validName || code.trim().length < 4) return;
    sfx.click();
    onJoin(code, name.trim());
  };

  return (
    <main className={`home home-faction-${selectedFaction.id}`} style={{ '--home-hero': `url("${selectedFaction.hero}")`, '--faction-accent': selectedFaction.color }}>
      <div className="home-card">
        <LanguageSwitcher />
        <h1 className="title">
          <span className="title-un">{t('Unstable')}</span>
          <span className="title-dragons">{t(selectedFaction.name)}</span>
        </h1>
        <p className="tagline">{t(selectedFaction.description)}</p>

        <label className="field">
          <span>{t('Your name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder={t('e.g. Smoulder')}
            autoComplete="nickname"
            enterKeyHint="done"
          />
        </label>

        {mode !== 'join' && (
          <fieldset className="faction-picker">
            <legend>{t('Choose a faction')}</legend>
            <div className="faction-options">
              {Object.values(FACTIONS).map((faction) => (
                <label className="faction-option" key={faction.id} style={{ '--option-accent': faction.color }}>
                  <input
                    type="radio"
                    name="faction"
                    value={faction.id}
                    checked={selectedFaction.id === faction.id}
                    onChange={() => { sfx.click(); setFactionId(faction.id); }}
                  />
                  <span className="faction-option-card">
                    <span className="faction-option-art" style={{ backgroundImage: `url("${faction.hero}")` }} aria-hidden="true" />
                    <span className="faction-option-copy">
                      <strong>{t(faction.name)}</strong>
                      <small>{t(faction.playstyle)}</small>
                    </span>
                    <span className="faction-check" aria-hidden="true">
                      <svg viewBox="0 0 20 20"><path d="m5 10.2 3.1 3.1L15.4 6" /></svg>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {mode !== 'join' ? (
          <div className="home-actions">
            <button className="btn btn-primary" disabled={!validName || busy} onClick={create}>
              {busy ? t('Summoning…') : t('Create room')}
            </button>
            <button className="btn" disabled={busy} onClick={() => { sfx.click(); setMode('join'); }}>
              {t('Join with a code')}
            </button>
          </div>
        ) : (
          <form className="home-actions" onSubmit={join}>
            <label className="field">
              <span>{t('Room code')}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder={t('e.g. QK7XN')}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="code-input"
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!validName || code.trim().length < 4 || busy}>
              {busy ? t('Joining…') : t('Join room')}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode(null)}>{t('Back')}</button>
          </form>
        )}

        <BattlefieldSettings />

        <button
          type="button"
          className="home-studio-btn"
          onClick={() => {
            sfx.click();
            onOpenStudio?.();
          }}
          title="Open Developer Card & Faction Studio"
        >
          <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
            <path d="M4 18c2-6 6-9 13-11l3-3-1 5c1 1 2 2 2 4l-4 .5 2 2.5-5 .5c-.5 2.5-2.5 4-5 4l1.5-3L8 18l-1.5-2.5L4 18Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('Card & Faction Studio (Dev)')}
        </button>

        <p className="home-hint">{t('2–8 players · share the room code with the table')}</p>
      </div>
    </main>
  );
}
