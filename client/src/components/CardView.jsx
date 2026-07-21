import React, { useEffect, useState } from 'react';
import { DEFS } from '../../../shared/cards.js';
import { useI18n } from '../i18n/index.jsx';

export const TYPE_LABEL = {
  baby: 'Baby Dragon',
  basic: 'Basic Dragon',
  magical: 'Magical Dragon',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  magic: 'Magic',
  instant: 'Instant',
};

const FEATURE_ART = new Set([
  'baby_dragon',
  'basic_verdant',
  'm_battering',
  'm_cataclysm',
  'm_spellscale',
  'm_ironclaw',
  'm_phoenix',
  'm_harvest',
  'm_colossal',
  'm_stormwing',
  'm_galewing',
  'm_hoardwing',
  'm_baron',
  'm_bonescale',
  'm_alluring',
  'm_enchanting',
  'm_queen',
  'm_guardian',
  'm_elder',
  'm_gilded_wyv',
  'm_scrappy',
  'm_razorfin',
  'm_torpedo',
  'm_spiteclaw',
  'm_stray',
  'm_seraph',
  'm_tidal',
  'm_nagging',
  'm_pest',
  'u_armor',
  'd_fog',
  's_venom',
  'i_roar',
]);

const TYPE_ART = {
  baby: ['baby_dragon'],
  basic: ['basic_verdant'],
  magical: ['m_phoenix', 'm_harvest', 'm_stormwing'],
  upgrade: ['u_armor'],
  downgrade: ['d_fog'],
  magic: ['s_venom'],
  instant: ['i_roar'],
};

function hashId(value) {
  let n = 0;
  for (let i = 0; i < value.length; i++) n = ((n << 5) - n + value.charCodeAt(i)) | 0;
  return Math.abs(n);
}

export function artForCard(defId) {
  const def = DEFS[defId];
  if (!def) return null;
  if (FEATURE_ART.has(defId)) return `/cards/${defId}.webp`;
  const options = TYPE_ART[def.type] || TYPE_ART.basic;
  return `/cards/${options[hashId(defId) % options.length]}.webp`;
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
    default:
      return (
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path {...common} d="M3 17c2-6 6-9 13-11l4-3-1 5c1 1 2 2 2 4l-4 .5 2 2.5-5 .5c-.5 2.5-2.5 4-5 4l1.5-3L8 17l-1.5-2.5L3 17Z" />
          <circle cx="15.4" cy="9.2" r="0.7" fill={stroke} stroke="none" />
        </svg>
      );
  }
}

export default function CardView({
  defId, faceDown, onClick, onInspect, onInspectEnd, actionLabel, glow, selected, dimmed, small, mini,
  suppressed, toad, stopped, count, title, iid, style, touchInspectFirst,
}) {
  const { t, card } = useI18n();
  const [imgOk, setImgOk] = useState(true);
  const def = defId ? card(defId) : null;

  useEffect(() => setImgOk(true), [defId]);

  const cls = [
    'card',
    small ? 'card-sm' : '',
    mini ? 'card-mini' : '',
    faceDown ? 'card-back' : `card-${def?.type}`,
    glow ? `glow-${glow}` : '',
    selected ? 'card-selected' : '',
    dimmed ? 'card-dimmed' : '',
    onClick || onInspect ? 'card-clickable' : '',
    touchInspectFirst && onClick && onInspect ? 'card-touch-split' : '',
  ].filter(Boolean).join(' ');

  if (faceDown) {
    return (
      <article className={cls} data-iid={iid} title={title} aria-label={title || t('Face-down card')} style={style}>
        <div className="card-back-frame" aria-hidden="true">
          <div className="card-back-pattern"><TypeGlyph type="basic" /></div>
          <span className="card-back-rune">MW</span>
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

  const isDragon = ['baby', 'basic', 'magical'].includes(def.type);
  const dragonValue = toad ? 0 : def.countsAs === 2 && !suppressed ? 2 : 1;

  return (
    <article
      className={cls}
      data-iid={iid}
      style={{ '--card-color': def.color, ...style }}
      onMouseEnter={inspect}
      onMouseLeave={() => onInspectEnd?.(defId)}
      onFocusCapture={inspect}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onInspectEnd?.(defId);
      }}
      aria-label={`${def.name}, ${t(TYPE_LABEL[def.type])}`}
      title={title || (!onInspect ? `${def.name} — ${def.text}` : undefined)}
    >
      <div className="card-ornament" aria-hidden="true" />
      <span
        className={`card-value ${isDragon ? `value-${dragonValue}` : 'value-spell'}`}
        title={isDragon ? t(`Counts as {count} Dragon${dragonValue === 1 ? '' : 's'}`, { count: dragonValue }) : t(TYPE_LABEL[def.type])}
        aria-hidden="true"
      >
        {isDragon ? dragonValue : <TypeGlyph type={def.type} />}
      </span>
      <header className="card-head">
        <span className="card-name">{def.name}</span>
      </header>
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
        {suppressed && !toad && <span className="card-flag flag-fog">{t('FOGGED')}</span>}
        {stopped && <span className="card-flag flag-stopped">{t('STOPPED')}</span>}
      </div>
      {!mini && (
        <div className="card-body">
          <span className="card-type">{t(TYPE_LABEL[def.type])}{def.sub ? ` · ${t('Wyvern')}` : ''}</span>
          {!small && <p className="card-text">{def.text}</p>}
        </div>
      )}
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
