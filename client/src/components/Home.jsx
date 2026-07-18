import React, { useState } from 'react';
import { sfx } from '../sound.js';
import { LanguageSwitcher, useI18n } from '../i18n.jsx';

export default function Home({ onCreate, onJoin, busy }) {
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
    <main className="home">
      <div className="home-card">
        <LanguageSwitcher />
        <h1 className="title">
          <span className="title-un">{t('Unstable')}</span>
          <span className="title-dragons">{t('Dragons')}</span>
        </h1>
        <p className="tagline">{t('Build a stable of 7 dragons before your friends burn it down.')}</p>

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

        <p className="home-hint">{t('2–8 players · share the room code with the table')}</p>
      </div>
    </main>
  );
}
