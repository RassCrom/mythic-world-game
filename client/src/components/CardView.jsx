import React, { useEffect, useRef, useState } from 'react';
import { DEFS, FACTIONS, SUB_LABEL } from '../../../shared/cards.js';
import { useI18n } from '../i18n/index.jsx';

export const TYPE_LABEL = {
  baby: 'Baby',
  basic: 'Basic',
  magical: 'Magical',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  magic: 'Magic',
  instant: 'Instant',
};

const CREATURE_TYPES = new Set(['baby', 'basic', 'magical']);

// Every card ships with its own illustration at /cards/<defId>.webp; the
// placeholder below only appears if a file is missing.
export function artForCard(defId) {
  if (!DEFS[defId]) return null;
  return `/cards/${defId}.webp`;
}

// "Magical Unicorn · Pegasus", "Basic Dragon", "Upgrade", …
export function cardKindLabel(def, t) {
  if (!def) return '';
  if (CREATURE_TYPES.has(def.type)) {
    const faction = FACTIONS[def.faction];
    const base = t(`${TYPE_LABEL[def.type]} ${faction ? faction.creature : 'creature'}`);
    return def.sub ? `${base} · ${t(SUB_LABEL[def.sub] || def.sub)}` : base;
  }
  return t(TYPE_LABEL[def.type]);
}

// Inline SVG glyphs use one consistent stroke style throughout the UI.
export function TypeGlyph({ type }) {
  const stroke = 'currentColor';
  const common = { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'baby':
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M12 3c3.5 0 6 3.4 6 8 0 4.4-2.7 8-6 8s-6-3.6-6-8c0-4.6 2.5-8 6-8Z" />
          <path {...common} d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'upgrade':
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M6 14l6-6 6 6" /><path {...common} d="M6 19l6-6 6 6" />
        </svg>
      );
    case 'downgrade':
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M6 10l6 6 6-6" /><path {...common} d="M6 5l6 6 6-6" />
        </svg>
      );
    case 'magic':
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2Z" />
          <path {...common} d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" />
        </svg>
      );
    case 'instant':
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M13 2L5 13h5l-1 9 8-11h-5l1-9Z" />
        </svg>
      );
    case 'unicorn':
      return <FactionGlyph faction="unicorn" />;
    case 'llama':
      return <FactionGlyph faction="llama" />;
    default:
      return <FactionGlyph faction="dragon" />;
  }
}

// Faction emblems: a curling flame for the Dragon Clan, a horn-and-star for the Herd,
// and a long-necked head with two tall ears for the Llama Caravan.
export function FactionGlyph({ faction, className = 'glyph' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (faction === 'llama') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path {...common} d="M7 21.5v-6c0-3.2 1.8-5.4 4.5-6.2V6l1.6 2 1.6-2v3.3c2.3.7 3.8 2.4 3.8 4.7v1.3c0 1-.7 1.7-1.7 1.7h-3.3" />
        <path {...common} d="M14.8 12.6h.01" strokeWidth={2.6} />
        <path {...common} d="M10 21.5v-4" />
      </svg>
    );
  }
  if (faction === 'unicorn') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path {...common} d="M12 21V9" />
        <path {...common} d="M12 9 9.5 2.5 12 4l2.5-1.5L12 9Z" />
        <path {...common} d="M6 15c1.5-.5 3 0 4 1M18 15c-1.5-.5-3 0-4 1" />
        <path {...common} d="M4 8.5l.6 1.4 1.4.6-1.4.6L4 12.5l-.6-1.4L2 10.5l1.4-.6L4 8.5ZM20 6l.6 1.4L22 8l-1.4.6L20 10l-.6-1.4L18 8l1.4-.6L20 6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...common} d="M12 22c-4 0-7-2.8-7-6.5 0-3 2-4.6 3.2-6.7.5 1.4 1.3 2.2 2.3 2.7.3-2.7 1.2-5.6 3.5-7.5.2 2.7 1.7 4.5 3.1 6.3 1.2 1.6 1.9 3 1.9 5.2 0 3.7-3 6.5-7 6.5Z" />
      <path {...common} d="M12 22c-1.7 0-3-1.4-3-3.2 0-1.6 1.2-2.5 1.9-3.6.7 1.3 1.6 1.9 2.4 2.2.5.5.7 1 .7 1.6 0 1.7-1.2 3-2 3Z" />
    </svg>
  );
}

// The back is drawn, not photographed: one 5:7 vector ornament that stays
// crisp from a 34px mini card up to the codex preview, tinted per faction by
// the stylesheet. Ray angles are fixed, so the array is built once.
const BACK_RAYS = Array.from({ length: 12 }, (_, index) => index * 30);
const BACK_SPARKS = [[17, 21], [83, 21], [17, 119], [83, 119]];
const SPARK_PATH = 'M0,-4.4 C0.7,-1.3 1.3,-0.7 4.4,0 C1.3,0.7 0.7,1.3 0,4.4 C-0.7,1.3 -1.3,0.7 -4.4,0 C-1.3,-0.7 -0.7,-1.3 0,-4.4 Z';

function CardBackArt() {
  return (
    <svg className="card-back-art" viewBox="0 0 100 140" aria-hidden="true" focusable="false">
      <rect className="back-frame-outer" x="3.2" y="3.2" width="93.6" height="133.6" rx="11" />
      <rect className="back-frame-inner" x="8.5" y="8.5" width="83" height="123" rx="7" />

      <g className="back-rays">
        {BACK_RAYS.map((angle) => (
          <path key={angle} d="M48.7,31 L47.1,20 L52.9,20 L51.3,31 Z" transform={`rotate(${angle} 50 60)`} />
        ))}
      </g>

      <circle className="back-halo" cx="50" cy="60" r="25.6" />
      <circle className="back-halo-thin" cx="50" cy="60" r="28.4" />

      <g className="back-sparks">
        {BACK_SPARKS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={SPARK_PATH} transform={`translate(${x} ${y})`} />
        ))}
      </g>

      <g className="back-rule">
        <path d="M22,112 H45 M55,112 H78" />
        <path d="M50,108.6 L53.4,112 L50,115.4 L46.6,112 Z" />
      </g>
      <text className="back-wordmark" x="50" y="124.6" textAnchor="middle">MYTHIC WORLD</text>
    </svg>
  );
}

export default function CardView({
  defId, cardDef, faceDown, onClick, onInspect, onInspectEnd, actionLabel, glow, selected, dimmed, small, mini,
  suppressed, toad, wild, tamed, stopped, count, title, iid, style, touchInspectFirst, backFaction,
}) {
  const { t, card } = useI18n();
  const [imgOk, setImgOk] = useState(true);
  const tiltFrame = useRef(0);
  const def = cardDef || (defId ? card(defId) : null);

  useEffect(() => setImgOk(true), [defId, cardDef]);
  useEffect(() => () => cancelAnimationFrame(tiltFrame.current), []);

  const faction = def?.faction && FACTIONS[def.faction] ? def.faction : 'neutral';

  const cls = [
    'card',
    small ? 'card-sm' : '',
    mini ? 'card-mini' : '',
    faceDown ? 'card-back' : `card-${def?.type}`,
    faceDown ? `back-${backFaction || 'neutral'}` : `faction-${faction}`,
    def?.sub ? `sub-${def.sub}` : '',
    glow ? `glow-${glow}` : '',
    selected ? 'card-selected' : '',
    dimmed ? 'card-dimmed' : '',
    wild ? 'card-wild' : '',
    onClick || onInspect ? 'card-clickable' : '',
    touchInspectFirst && onClick && onInspect ? 'card-touch-split' : '',
  ].filter(Boolean).join(' ');

  if (faceDown) {
    const backSide = FACTIONS[backFaction] ? backFaction : 'neutral';
    return (
      <article className={cls} data-iid={iid} title={title} aria-label={title || t('Face-down card')} style={style}>
        <div className="card-back-frame" aria-hidden="true">
          <CardBackArt />
          <span className={`card-back-seal ${backSide === 'neutral' ? 'is-trio' : ''}`}>
            {backSide === 'neutral' ? (
              <>
                <FactionGlyph faction="dragon" className="glyph back-emblem-dragon" />
                <FactionGlyph faction="unicorn" className="glyph back-emblem-unicorn" />
                <FactionGlyph faction="llama" className="glyph back-emblem-llama" />
              </>
            ) : (
              <FactionGlyph faction={backSide} className={`glyph back-emblem-${backSide}`} />
            )}
          </span>
        </div>
        {count != null && <span className="card-count">{count}</span>}
        {onClick && <button type="button" className="card-action-hit" onClick={onClick} aria-label={actionLabel || title || t('Select card')} />}
      </article>
    );
  }
  if (!def) return null;

  const inspect = (event) => onInspect?.(defId, event);
  const primaryAction = onClick || (onInspect ? inspect : null);
  const kindLabel = cardKindLabel(def, t);

  // getBoundingClientRect forces layout, so the tilt is measured at most once
  // per frame rather than once per pointer sample.
  const handleMouseMove = (event) => {
    if (mini) return;
    const element = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const py = Math.max(0, Math.min(100, (y / rect.height) * 100));
      const rx = ((y - rect.height / 2) / (rect.height / 2)) * -8;
      const ry = ((x - rect.width / 2) / (rect.width / 2)) * 8;
      element.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
      element.style.setProperty('--glare-x', `${px.toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${py.toFixed(1)}%`);
      element.style.setProperty('--glare-opacity', '1');
    });
  };

  const handleMouseLeave = (event) => {
    cancelAnimationFrame(tiltFrame.current);
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
    event.currentTarget.style.setProperty('--glare-opacity', '0');
    onInspectEnd?.(defId);
  };

  return (
    <article
      className={cls}
      data-iid={iid}
      style={{ '--card-color': def.color, ...style }}
      onMouseMove={handleMouseMove}
      onMouseEnter={inspect}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={inspect}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) handleMouseLeave(event);
      }}
      aria-label={`${def.name}, ${kindLabel}`}
      title={title || (!onInspect ? `${def.name} — ${def.text}` : undefined)}
    >
      <div className="card-frame-deco" aria-hidden="true">
        <span className="deco deco-a" /><span className="deco deco-b" /><span className="deco deco-c" /><span className="deco deco-d" />
      </div>
      <div className="card-holo-glare" aria-hidden="true" />

      <div className="card-art">
        {imgOk ? (
          <img
            src={artForCard(defId)}
            alt={t('Illustration for {card}', { card: def.name })}
            width="512"
            height="768"
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="card-art-placeholder"><TypeGlyph type={def.type} /></div>
        )}
        <span className="card-art-vignette" aria-hidden="true" />
        {toad && <span className="card-flag flag-toad">{t('TOAD')}</span>}
        {wild && !toad && <span className="card-flag flag-wild">{t('WILD')}</span>}
        {tamed && !toad && !wild && <span className="card-flag flag-tamed">{t('TAMED')}</span>}
        {suppressed && !toad && !wild && <span className="card-flag flag-fog">{t('FOGGED')}</span>}
        {stopped && <span className="card-flag flag-stopped">{t('STOPPED')}</span>}
      </div>

      <span className={`card-emblem emblem-${faction}`} aria-hidden="true">
        {faction === 'neutral' ? <TypeGlyph type={def.type} /> : <FactionGlyph faction={faction} />}
      </span>

      {!mini && (
        <div className="card-body">
          <span className="card-type"><TypeGlyph type={def.type} />{kindLabel}</span>
          {!small && <p className="card-text">{def.text}</p>}
        </div>
      )}
      <header className="card-head">
        <span className="card-name">{def.name}</span>
      </header>

      {primaryAction && (
        <button
          type="button"
          className="card-action-hit"
          onClick={primaryAction}
          aria-label={actionLabel || (onClick ? t('Select {card}', { card: def.name }) : t('Inspect {card}', { card: def.name }))}
        />
      )}
      {touchInspectFirst && onInspect && onClick && (
        <>
          <button
            type="button"
            className="card-touch-inspect"
            onClick={(event) => { event.stopPropagation(); inspect(event); }}
            aria-label={t('Read {card}', { card: def.name })}
          />
          <button
            type="button"
            className="card-touch-action"
            onClick={(event) => {
              event.stopPropagation();
              onInspectEnd?.(defId);
              onClick(event);
            }}
            aria-label={actionLabel || t('Select {card}', { card: def.name })}
            title={actionLabel || t('Select {card}', { card: def.name })}
          >
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
              <path d="m8 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
      {onInspect && onClick && (
        <button
          type="button"
          className="card-info-button"
          onClick={(event) => { event.stopPropagation(); inspect(event); }}
          aria-label={t('Read {card}', { card: def.name })}
          title={t('Read {card}', { card: def.name })}
        >i</button>
      )}
    </article>
  );
}
