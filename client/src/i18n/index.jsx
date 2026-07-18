import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFS } from '../../../shared/cards.js';
import { CARD_NAME_RU, RU, RU_CARDS, interpolate, translateDynamicRussian } from './translations.js';

const STORAGE_KEY = 'ud_locale';
const SUPPORTED_LOCALES = ['en', 'ru'];

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(saved) ? saved : 'en';
  });

  const setLocale = useCallback((nextLocale) => {
    const safeLocale = SUPPORTED_LOCALES.includes(nextLocale) ? nextLocale : 'en';
    localStorage.setItem(STORAGE_KEY, safeLocale);
    setLocaleState(safeLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'ru' ? 'Нестабильные драконы' : 'Unstable Dragons';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = locale === 'ru'
        ? 'Unstable Dragons — хаотичная многопользовательская карточная игра. Соберите логово драконов раньше соперников.'
        : 'Unstable Dragons — a chaotic multiplayer card game. Build your stable of dragons before your friends stop you.';
    }
  }, [locale]);

  const value = useMemo(() => {
    const t = (key, vars) => interpolate(locale === 'ru' ? (RU[key] || key) : key, vars);
    const card = (defId) => {
      const original = DEFS[defId];
      if (!original || locale !== 'ru' || !RU_CARDS[defId]) return original;
      return { ...original, ...RU_CARDS[defId] };
    };
    const text = (input) => {
      if (!input || locale !== 'ru') return input;
      return RU[input] || CARD_NAME_RU[input] || translateDynamicRussian(input);
    };
    return { locale, setLocale, t, card, text };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside LanguageProvider');
  return context;
}

export function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`language-switcher ${className}`.trim()}>
      <span>{t('Language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value)} aria-label={t('Language')}>
        <option value="en">{t('English')}</option>
        <option value="ru">{t('Russian')}</option>
      </select>
    </label>
  );
}
