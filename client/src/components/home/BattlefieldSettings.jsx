import React, { useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { BATTLEFIELDS, loadPreferences, savePreferences } from '../../preferences.js';
import { isMuted, setMuted, sfx } from '../../sound.js';

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19 13.4a7.2 7.2 0 0 0 0-2.8l2-1.5-2-3.4-2.5 1a8 8 0 0 0-2.4-1.4L13.8 3h-4l-.3 2.3a8 8 0 0 0-2.4 1.4l-2.5-1-2 3.4 2 1.5a7.2 7.2 0 0 0 0 2.8l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 2.4 1.4l.3 2.3h4l.3-2.3a8 8 0 0 0 2.4-1.4l2.5 1 2-3.4-2-1.5Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="settings-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 9.5 5 5 5-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10.2 3.1 3.1L15.4 6" />
    </svg>
  );
}

export default function BattlefieldSettings() {
  const { t } = useI18n();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [soundEnabled, setSoundEnabled] = useState(() => !isMuted());

  const updatePreferences = (updates) => {
    const next = savePreferences({ ...preferences, ...updates });
    setPreferences(next);
    sfx.click();
  };

  const updateSound = (enabled) => {
    setSoundEnabled(enabled);
    setMuted(!enabled);
    if (enabled) sfx.click();
  };

  return (
    <details className="home-settings">
      <summary>
        <span className="settings-summary-icon"><SettingsIcon /></span>
        <span className="settings-summary-copy">
          <strong>{t('Settings')}</strong>
          <span>{t('Personalize your battlefield')}</span>
        </span>
        <ChevronIcon />
      </summary>

      <div className="settings-body">
        <fieldset className="settings-group battlefield-picker">
          <legend>{t('Battlefield')}</legend>
          <div className="battlefield-options">
            {BATTLEFIELDS.map((battlefield) => (
              <label className="battlefield-option" key={battlefield.id}>
                <input
                  type="radio"
                  name="battlefield"
                  value={battlefield.id}
                  checked={preferences.battlefield === battlefield.id}
                  onChange={() => updatePreferences({ battlefield: battlefield.id })}
                />
                <span className="battlefield-choice">
                  <span
                    className="battlefield-thumb"
                    style={{ '--battlefield-thumb': `url("${battlefield.image}")` }}
                    aria-hidden="true"
                  >
                    <span className="battlefield-check"><CheckIcon /></span>
                  </span>
                  <span>{t(battlefield.name)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="settings-toggles">
          <label className="settings-toggle">
            <span className="settings-toggle-copy">
              <strong>{t('Sound effects')}</strong>
              <span>{t('Draws, roars, and turn cues')}</span>
            </span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => updateSound(event.target.checked)}
            />
            <span className="settings-switch" aria-hidden="true" />
          </label>

          <label className="settings-toggle">
            <span className="settings-toggle-copy">
              <strong>{t('Reduced visual effects')}</strong>
              <span>{t('Calmer transitions and fewer particles')}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences.reducedEffects}
              onChange={(event) => updatePreferences({ reducedEffects: event.target.checked })}
            />
            <span className="settings-switch" aria-hidden="true" />
          </label>
        </div>
      </div>
    </details>
  );
}
