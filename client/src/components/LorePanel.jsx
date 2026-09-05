import React from 'react';
import { useI18n } from '../i18n/index.jsx';
import { FACTION_IDS, FACTIONS } from '../../../shared/cards.js';
import { FACTION_LORE, NEST_LORE, WORLD } from '../../../shared/lore.js';
import { FactionGlyph } from './CardView.jsx';

function ScrollIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h11a3 3 0 0 1 3 3v1h-4V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v10a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h6M8 13.5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

// One faction's motto and origin story, tinted with its colours.
export function FactionLoreCard({ faction, showPassive = false }) {
  const { t } = useI18n();
  const def = FACTIONS[faction];
  const lore = FACTION_LORE[faction];
  if (!def || !lore) return null;
  return (
    <article className={`lore-faction faction-${faction}`}>
      <strong><FactionGlyph faction={faction} /> {t(def.name)}</strong>
      <span className="lore-motto">“{t(lore.motto)}”</span>
      <p>{t(lore.story)}</p>
      {showPassive && <em className="lore-passive">{t(lore.passiveLore)}</em>}
    </article>
  );
}

// The legend of the Hollow as a collapsible panel. Styled like the settings
// disclosure on the home screen so the two read as one stack.
export default function WorldLore({ className = '', open = false, showFactions = true, showNest = true }) {
  const { t } = useI18n();
  return (
    <details className={`home-settings lore-panel ${className}`.trim()} open={open || undefined}>
      <summary>
        <span className="settings-summary-icon"><ScrollIcon /></span>
        <span className="settings-summary-copy">
          <strong>{t(WORLD.title)}</strong>
          <span>{t('Why the Clan and the Herd fight over the Hollow')}</span>
        </span>
        <ChevronIcon />
      </summary>
      <div className="lore-body">
        <span className="eyebrow">{t(WORLD.eyebrow)}</span>
        {WORLD.paragraphs.map((paragraph) => <p key={paragraph}>{t(paragraph)}</p>)}
        {showFactions && (
          <div className="lore-factions">
            {FACTION_IDS.map((id) => <FactionLoreCard key={id} faction={id} />)}
          </div>
        )}
        {showNest && (
          <p className="lore-nest"><strong>{t(NEST_LORE.title)}.</strong> {t(NEST_LORE.text)}</p>
        )}
      </div>
    </details>
  );
}
