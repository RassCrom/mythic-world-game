import React, { useState } from 'react';
import { sfx } from '../sound.js';
import { LanguageSwitcher, useI18n } from '../i18n/index.jsx';
import BattlefieldSettings from './home/BattlefieldSettings.jsx';
import WorldLore from './LorePanel.jsx';
import SceneVideo from './SceneVideo.jsx';
import { HOLLOW_POSTER, HOLLOW_VIDEO } from '../preferences.js';
import { FactionGlyph } from './CardView.jsx';

export default function Home({ onCreate, onJoin, busy, onOpenStudio }) {
  const { t } = useI18n();
  const [name, setName] = useState(localStorage.getItem('ud_name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'join'

  const validName = name.trim().length >= 1;

  const create = () => {
    if (!validName) return;
    sfx.click();
    onCreate(name.trim());
  };
  const join = (e) => {
    e.preventDefault();
    if (!validName || code.trim().length < 4) return;
    sfx.click();
    onJoin(code, name.trim());
  };

  return (
    <main className="home" style={{ '--home-hero': 'url("/hero-dragons-vs-unicorns.webp")' }}>
      <SceneVideo sources={HOLLOW_VIDEO} poster={HOLLOW_POSTER.large} posterSmall={HOLLOW_POSTER.small} />
      <div className="home-card">
        <LanguageSwitcher />
        <h1 className="title">
          <span className="title-un">{t('Mythic World')}</span>
          <span className="title-vs">
            <span className="title-dragons">{t('Dragons')}</span>
            <span className="title-versus">{t('vs')}</span>
            <span className="title-unicorns">{t('Unicorns')}</span>
          </span>
        </h1>
        <p className="tagline">{t('Pledge to a faction, build a stable of 7 creatures, and stop your friends from doing the same.')}</p>

        <ul className="home-factions" aria-label={t('Factions')}>
          <li className="faction-dragon"><FactionGlyph faction="dragon" /> <span>{t('Dragons burn: destroy a rival card, draw a card.')}</span></li>
          <li className="faction-unicorn"><FactionGlyph faction="unicorn" /> <span>{t('Unicorns sparkle: lose a loyal creature, draw a card.')}</span></li>
          <li className="faction-llama"><FactionGlyph faction="llama" /> <span>{t('Llamas chew: discard a card, draw a card.')}</span></li>
        </ul>

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

        <WorldLore />

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
          <span>🛠️</span> {t('Card & Faction Studio (Dev)')}
        </button>

        <p className="home-hint">{t('2–8 players · share the room code with the table')}</p>
      </div>
    </main>
  );
}
