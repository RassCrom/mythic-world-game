import React, { useEffect, useState } from 'react';
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
    default:
      return <FactionGlyph faction="dragon" />;
  }
}

// Faction emblems: a curling flame for the Dragon Clan, a horn-and-star for the Herd.
export function FactionGlyph({ faction, className = 'glyph' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
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

export default function CardView({
  defId, cardDef, faceDown, onClick, onInspect, onInspectEnd, actionLabel, glow, selected, dimmed, small, mini,
  suppressed, toad, wild, tamed, stopped, count, title, iid, style, touchInspectFirst, backFaction,
}) {
  const { t, card } = useI18n();
  const [imgOk, setImgOk] = useState(true);
  const def = cardDef || (defId ? card(defId) : null);

  useEffect(() => setImgOk(true), [defId, cardDef]);

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
    return (
      <article className={cls} data-iid={iid} title={title} aria-label={title || t('Face-down card')} style={style}>
        <div className="card-back-frame" aria-hidden="true">
          <div className="card-back-pattern"><TypeGlyph type="magic" /></div>
          <span className="card-back-rune">
            <FactionGlyph faction="dragon" className="glyph back-emblem-dragon" />
            <FactionGlyph faction="unicorn" className="glyph back-emblem-unicorn" />
          </span>
          <span className="card-back-title">Mythic<br />World</span>
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

  const handleMouseMove = (event) => {
    if (mini) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100));
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -8;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 8;
    event.currentTarget.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--glare-x', `${px.toFixed(1)}%`);
    event.currentTarget.style.setProperty('--glare-y', `${py.toFixed(1)}%`);
    event.currentTarget.style.setProperty('--glare-opacity', '1');
  };

  const handleMouseLeave = (event) => {
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
