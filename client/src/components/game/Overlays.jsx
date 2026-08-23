import React, { useLayoutEffect, useRef, useState } from 'react';
import { DEFS } from '../../../../shared/cards.js';
import CardView from '../CardView.jsx';
import { CardDetails } from '../CardCodex.jsx';
import { useI18n } from '../../i18n/index.jsx';

const POPUP_GAP = 12;
const POPUP_EDGE = 8;

// The popup is sized by CSS (and therefore by breakpoint), so its placement is
// resolved from the measured box rather than from a hard-coded guess. Pointer
// and touch both land next to the card they came from instead of a fixed corner.
function placePopup(box, anchor, point) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.max(POPUP_EDGE, Math.min(x, vw - box.width - POPUP_EDGE));
  const clampY = (y) => Math.max(POPUP_EDGE, Math.min(y, vh - box.height - POPUP_EDGE));
  const beside = clampY(point.y - box.height / 2);
  const centred = clampX(point.x - box.width / 2);

  if (anchor) {
    const right = anchor.right + POPUP_GAP;
    if (right + box.width <= vw - POPUP_EDGE) return { x: right, y: beside };
    const left = anchor.left - POPUP_GAP - box.width;
    if (left >= POPUP_EDGE) return { x: left, y: beside };
    const above = anchor.top - POPUP_GAP - box.height;
    if (above >= POPUP_EDGE) return { x: centred, y: above };
    const below = anchor.bottom + POPUP_GAP;
    if (below + box.height <= vh - POPUP_EDGE) return { x: centred, y: below };
  }
  return { x: clampX(point.x + POPUP_GAP), y: clampY(point.y + POPUP_GAP) };
}

export function CardCursorPopup({ preview }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  // Measure once the content for this card is in the DOM; until then the box is
  // rendered hidden so a half-placed tooltip never flashes in the corner.
  useLayoutEffect(() => {
    if (!preview || !ref.current) { setPos(null); return; }
    const box = ref.current.getBoundingClientRect();
    setPos(placePopup(box, preview.anchor, { x: preview.x, y: preview.y }));
  }, [preview?.defId, preview?.x, preview?.y]);

  if (!preview) return null;
  return (
    <aside
      ref={ref}
      className="card-cursor-popup"
      role="tooltip"
      aria-live="polite"
      style={pos
        ? { left: pos.x, top: pos.y }
        : { left: 0, top: 0, visibility: 'hidden' }}
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
