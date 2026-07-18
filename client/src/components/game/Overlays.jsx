import React from 'react';
import { DEFS } from '../../../../shared/cards.js';
import CardView from '../CardView.jsx';
import { CardDetails } from '../CardCodex.jsx';
import { useI18n } from '../../i18n/index.jsx';

export function CardCursorPopup({ preview }) {
  if (!preview) return null;
  return (
    <aside
      className="card-cursor-popup"
      role="tooltip"
      aria-live="polite"
      style={{ left: preview.x, top: preview.y }}
    >
      <CardDetails defId={preview.defId} compact />
    </aside>
  );
}

export function PlayedCardFlash({ play }) {
  const { t, card } = useI18n();
  if (!play || !DEFS[play.defId]) return null;
  const def = card(play.defId);
  return (
    <div key={play.n} className="played-card-flash" role="status" aria-live="polite">
      <div className="played-card-flash-content">
        <span>{t('{name} played', { name: play.playerName })}</span>
        <CardView defId={play.defId} />
        <strong>{def.name}</strong>
        {play.targetName && <small>{t("on {name}'s stable", { name: play.targetName })}</small>}
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose, wide }) {
  const { t } = useI18n();
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-button" onClick={onClose} aria-label={t('Close')}>
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
