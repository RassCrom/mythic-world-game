import React from 'react';
import CardView, { TypeGlyph } from '../CardView.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function ChronicleEntry({ entry, onInspect, onInspectEnd }) {
  const { t, text, card } = useI18n();
  const def = entry.defId ? card(entry.defId) : null;
  if (!def) {
    return (
      <li className="log-entry log-entry-text">
        <span className="log-seq" aria-hidden="true">{entry.n}</span>
        <p>{text(entry.msg)}</p>
      </li>
    );
  }

  return (
    <li className="log-entry log-entry-card">
      <div className="chronicle-card">
        <CardView
          defId={entry.defId}
          mini
          onInspect={onInspect}
          onInspectEnd={onInspectEnd}
          actionLabel={t('Inspect {card}', { card: def.name })}
          title={t('Inspect {card}', { card: def.name })}
        />
      </div>
      <div className="log-copy">
        <span className="log-kicker"><TypeGlyph type={def.type} /> {t('Card played')}</span>
        <strong>{def.name}</strong>
        <p>{text(entry.msg)}</p>
      </div>
    </li>
  );
}
