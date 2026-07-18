import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFS, buildDeckList } from '../../../shared/cards.js';
import CardView, { TYPE_LABEL, TypeGlyph } from './CardView.jsx';
import { useI18n } from '../i18n.jsx';

const TYPE_ORDER = ['all', 'baby', 'basic', 'magical', 'upgrade', 'downgrade', 'magic', 'instant'];
const ALL_CARDS = Object.values(DEFS).sort((a, b) => {
  const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  return typeDiff || a.name.localeCompare(b.name);
});

export function CodexIcon() {
  return (
    <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CardDetails({ defId, compact = false }) {
  const { t, card } = useI18n();
  const def = card(defId);
  if (!def) return null;
  return (
    <div className={`card-details ${compact ? 'is-compact' : ''}`}>
      <div className="card-details-preview"><CardView defId={defId} small={compact} /></div>
      <div className="card-details-copy">
        <span className={`type-pill type-${def.type}`}><TypeGlyph type={def.type} /> {t(TYPE_LABEL[def.type])}</span>
        <h2>{def.name}</h2>
        <p className="card-rules-text">{def.text}</p>
        {def.flavor && <p className="card-flavor">“{def.flavor}”</p>}
        <dl className="card-facts">
          <div><dt>{t('Copies')}</dt><dd>{def.qty}</dd></div>
          <div><dt>{t('Zone')}</dt><dd>{t(def.type === 'magic' || def.type === 'instant' ? 'Discard after use' : def.type === 'baby' ? 'Nest / Stable' : 'Deck')}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export default function CardCodex({ open, onClose }) {
  const { locale, t, card } = useI18n();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState('baby_dragon');
  const searchRef = useRef(null);

  const cards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ALL_CARDS
      .map((original) => card(original.id))
      .filter((item) => (
        (type === 'all' || item.type === type)
        && (!needle || `${item.name} ${item.text} ${t(TYPE_LABEL[item.type])}`.toLowerCase().includes(needle))
      ))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [card, locale, query, t, type]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => searchRef.current?.focus(), 40);
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (cards.length && !cards.some((card) => card.id === selected)) setSelected(cards[0].id);
  }, [cards, selected]);

  if (!open) return null;

  return (
    <div className="codex-scrim" role="dialog" aria-modal="true" aria-labelledby="codex-title" onMouseDown={onClose}>
      <section className="codex" onMouseDown={(event) => event.stopPropagation()}>
        <header className="codex-head">
          <div>
            <span className="eyebrow">{t('The Archivist’s library')}</span>
            <h1 id="codex-title">{t('Card Codex')}</h1>
            <p>{t('{unique} unique cards · {deck}-card draw deck · Baby Dragons live in the Nest', { unique: ALL_CARDS.length, deck: buildDeckList().length })}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('Close card codex')}>
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="codex-tools">
          <label className="search-field">
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span className="sr-only">{t('Search cards')}</span>
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by name or effect…')} />
          </label>
          <div className="type-filters" role="group" aria-label={t('Filter cards by type')}>
            {TYPE_ORDER.map((key) => (
              <button
                type="button"
                key={key}
                className={type === key ? 'is-active' : ''}
                onClick={() => setType(key)}
                aria-pressed={type === key}
              >
                {key === 'all' ? t('All') : t(TYPE_LABEL[key])}
              </button>
            ))}
          </div>
        </div>

        <div className="codex-body">
          <div className="codex-results" aria-label={t('{count} matching cards', { count: cards.length })}>
            {cards.map((card) => (
              <CardView
                key={card.id}
                defId={card.id}
                small
                selected={selected === card.id}
                onClick={() => setSelected(card.id)}
                onInspect={() => setSelected(card.id)}
                actionLabel={t('Read {card}', { card: card.name })}
              />
            ))}
            {!cards.length && (
              <div className="empty-state">
                <TypeGlyph type="basic" />
                <h2>{t('No cards found')}</h2>
                <p>{t('Try a different name, effect, or card type.')}</p>
              </div>
            )}
          </div>
          <aside className="codex-detail" aria-live="polite">
            <CardDetails defId={selected} />
          </aside>
        </div>
      </section>
    </div>
  );
}
