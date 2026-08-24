import React, { useState, useEffect, useMemo } from 'react';
import CardView, { TYPE_LABEL, TypeGlyph } from '../components/CardView.jsx';
import CardEditorModal from './CardEditorModal.jsx';
import FactionEditorModal from './FactionEditorModal.jsx';
import StudioSandbox from './StudioSandbox.jsx';
import {
  loadStudioData,
  saveStudioData,
  resetStudioData,
  computeDeckAnalytics,
  generateCardsJsExport,
  generateMarkdownSpec,
  CARD_TYPES,
  DEV_STATUSES,
} from './cardStudioData.js';
import './studio.css';

export default function CardStudio({ onExitToGame }) {
  const [data, setData] = useState(() => loadStudioData());
  const [tab, setTab] = useState('cards'); // cards | factions | analytics | sandbox | export
  const [viewMode, setViewMode] = useState('grid'); // grid | table

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [factionFilter, setFactionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name | id | type | faction | power | qty

  // Modals & Selected items
  const [editingCard, setEditingCard] = useState(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState(null);
  const [isFactionModalOpen, setIsFactionModalOpen] = useState(false);
  const [inspectCardId, setInspectCardId] = useState('m_phoenix');
  const [toast, setToast] = useState(null);

  // Auto-persist on data update
  useEffect(() => {
    saveStudioData(data);
  }, [data]);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const analytics = useMemo(() => {
    return computeDeckAnalytics(data.cards, data.factions);
  }, [data.cards, data.factions]);

  // Filtered & Sorted cards
  const filteredCards = useMemo(() => {
    const q = search.toLowerCase().trim();
    return Object.values(data.cards).filter((c) => {
      const matchSearch = !q || (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.text && c.text.toLowerCase().includes(q)) ||
        (c.flavor && c.flavor.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
      );
      const matchType = typeFilter === 'all' || c.type === typeFilter;
      const matchFaction = factionFilter === 'all' || (c.faction || 'neutral') === factionFilter;
      const matchStatus = statusFilter === 'all' || (c.status || 'active') === statusFilter;
      return matchSearch && matchType && matchFaction && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'id') return (a.id || '').localeCompare(b.id || '');
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'faction') return (a.faction || '').localeCompare(b.faction || '');
      if (sortBy === 'power') return (b.powerRating || 3) - (a.powerRating || 3);
      if (sortBy === 'qty') return (b.qty || 1) - (a.qty || 1);
      return 0;
    });
  }, [data.cards, search, typeFilter, factionFilter, statusFilter, sortBy]);

  // Card Handlers
  const handleSaveCard = (cardPayload, originalId) => {
    if (!cardPayload.id || !cardPayload.id.trim()) {
      showNotification('Card ID cannot be empty!');
      return;
    }
    setData((prev) => {
      const nextCards = { ...prev.cards };
      // If the card was renamed (ID changed), remove the old entry
      if (originalId && originalId !== cardPayload.id && nextCards[originalId]) {
        delete nextCards[originalId];
      }
      nextCards[cardPayload.id] = cardPayload;
      return { ...prev, cards: nextCards };
    });
    setIsCardModalOpen(false);
    setEditingCard(null);
    setInspectCardId(cardPayload.id);
    showNotification(`Card "${cardPayload.name || cardPayload.id}" saved successfully!`);
  };

  const handleDuplicateCard = (card) => {
    const newId = `${card.id}_draft_${Date.now().toString().slice(-4)}`;
    const newCard = {
      ...card,
      id: newId,
      name: `${card.name} (Draft)`,
      status: 'draft',
      devNotes: `Draft duplicate of ${card.name} (${card.id})`,
    };
    setData((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [newId]: newCard,
      },
    }));
    setIsCardModalOpen(false);
    setInspectCardId(newId);
    showNotification(`Duplicated as draft: "${newCard.name}"`);
  };

  const handleDeleteCard = (cardId) => {
    if (confirm(`Are you sure you want to delete card "${cardId}"?`)) {
      setData((prev) => {
        const next = { ...prev.cards };
        delete next[cardId];
        // Pick new inspect target from the updated card set
        if (inspectCardId === cardId) {
          const remaining = Object.keys(next);
          setInspectCardId(remaining.length > 0 ? remaining[0] : null);
        }
        return { ...prev, cards: next };
      });
      setIsCardModalOpen(false);
      setEditingCard(null);
      showNotification(`Card ${cardId} deleted.`);
    }
  };

  // Faction Handlers
  const handleSaveFaction = (factionPayload) => {
    setData((prev) => {
      const exists = prev.factions.some((f) => f.id === factionPayload.id);
      const updated = exists
        ? prev.factions.map((f) => (f.id === factionPayload.id ? factionPayload : f))
        : [...prev.factions, factionPayload];
      return { ...prev, factions: updated };
    });
    setIsFactionModalOpen(false);
    setEditingFaction(null);
    showNotification(`Faction "${factionPayload.name}" saved.`);
  };

  const handleDeleteFaction = (factionId) => {
    if (confirm(`Delete faction ${factionId}? Assigned cards will be moved to Neutral.`)) {
      setData((prev) => {
        const nextCards = { ...prev.cards };
        Object.keys(nextCards).forEach((k) => {
          if (nextCards[k].faction === factionId) {
            nextCards[k] = { ...nextCards[k], faction: 'neutral' };
          }
        });
        return {
          ...prev,
          factions: prev.factions.filter((f) => f.id !== factionId),
          cards: nextCards,
        };
      });
      setIsFactionModalOpen(false);
      setEditingFaction(null);
      showNotification(`Faction ${factionId} deleted.`);
    }
  };

  // Reassign Card Faction Quick Action
  const handleQuickReassignFaction = (cardId, newFactionId) => {
    setData((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: {
          ...prev.cards[cardId],
          faction: newFactionId,
        },
      },
    }));
    showNotification(`Card reassigned to ${newFactionId}`);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all cards and factions to default game baseline? Any custom drafts will be reset.')) {
      const reset = resetStudioData();
      setData(reset);
      showNotification('Studio reset to game defaults.');
    }
  };

  // Import JSON handler
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.cards && imported.factions) {
          setData(imported);
          saveStudioData(imported);
          showNotification('Successfully imported Studio data package!');
        } else {
          alert('Invalid studio data file format.');
        }
      } catch (err) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export File Download helper
  const downloadFile = (content, filename, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showNotification(`Downloaded ${filename}`);
  };

  const inspectedCard = data.cards[inspectCardId] || Object.values(data.cards)[0];

  return (
    <div className="studio-root">
      {/* Studio Header */}
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-logo">🐉</span>
          <div className="studio-title-block">
            <h1>
              Card & Faction Studio <span className="studio-tag">Dev Hub</span>
            </h1>
            <p className="studio-subtitle">
              {analytics.totalCardsInDeck} Deck Cards · {analytics.uniqueCardsCount} Unique · {data.factions.length} Factions
            </p>
          </div>
        </div>

        {/* Top Navigation */}
        <nav className="studio-nav">
          <button
            type="button"
            className={`studio-nav-btn ${tab === 'cards' ? 'active' : ''}`}
            onClick={() => setTab('cards')}
          >
            <span>🃏</span> Cards <span className="studio-nav-badge">{filteredCards.length}</span>
          </button>
          <button
            type="button"
            className={`studio-nav-btn ${tab === 'factions' ? 'active' : ''}`}
            onClick={() => setTab('factions')}
          >
            <span>🛡️</span> Factions <span className="studio-nav-badge">{data.factions.length}</span>
          </button>
          <button
            type="button"
            className={`studio-nav-btn ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            <span>📊</span> Deck & Balance
          </button>
          <button
            type="button"
            className={`studio-nav-btn ${tab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setTab('sandbox')}
          >
            <span>🧪</span> Sandbox
          </button>
          <button
            type="button"
            className={`studio-nav-btn ${tab === 'export' ? 'active' : ''}`}
            onClick={() => setTab('export')}
          >
            <span>💾</span> Code Gen & Export
          </button>
        </nav>

        {/* Action Controls */}
        <div className="studio-header-actions">
          <button
            type="button"
            className="btn-studio btn-studio-primary"
            onClick={() => {
              setEditingCard({
                id: `card_${Date.now().toString().slice(-4)}`,
                name: '',
                type: 'magical',
                faction: 'neutral',
                color: '#7d3c98',
                text: '',
                qty: 1,
                status: 'draft',
                powerRating: 3,
                complexity: 'medium',
                devNotes: '',
              });
              setIsCardModalOpen(true);
            }}
          >
            + New Card
          </button>
          <button
            type="button"
            className="btn-studio"
            onClick={() => {
              setEditingFaction({
                id: '',
                name: '',
                icon: '🐉',
                color: '#e67e22',
                description: '',
                playstyle: '',
                mechanicsStr: '',
                tier: 'Core Faction',
              });
              setIsFactionModalOpen(true);
            }}
          >
            + New Faction
          </button>
          {onExitToGame && (
            <button
              type="button"
              className="btn-studio btn-studio-ghost"
              onClick={onExitToGame}
              title="Return to Unstable Dragons game lobby/table"
            >
              ← Exit to Game
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="studio-content">
        {/* Toast Alert */}
        {toast && (
          <div className="studio-toast">
            <span>✓</span> {toast}
          </div>
        )}

        {/* TAB 1: CARDS EXPLORER */}
        {tab === 'cards' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="studio-toolbar">
              <div className="studio-search-box">
                <span>🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cards by name, rules, keywords, tags..."
                />
                {search && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                    onClick={() => setSearch('')}
                  >✕</button>
                )}
              </div>

              <div className="studio-filter-group">
                {/* Type Filter */}
                <select
                  className="studio-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {CARD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>

                {/* Faction Filter */}
                <select
                  className="studio-select"
                  value={factionFilter}
                  onChange={(e) => setFactionFilter(e.target.value)}
                >
                  <option value="all">All Factions</option>
                  {data.factions.map((f) => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  className="studio-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Dev Statuses</option>
                  {DEV_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                {/* Sort Filter */}
                <select
                  className="studio-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="id">Sort: Card ID</option>
                  <option value="type">Sort: Card Type</option>
                  <option value="faction">Sort: Faction</option>
                  <option value="power">Sort: Power Rating</option>
                  <option value="qty">Sort: Deck Copies</option>
                </select>

                {/* View Mode Toggle */}
                <div className="view-toggle-group">
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid Card View"
                  >
                    🎴
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Data Spreadsheet View"
                  >
                    📑
                  </button>
                </div>
              </div>
            </div>

            {/* Split layout: Card List / Grid + Detail Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: inspectedCard ? '1fr 340px' : '1fr', gap: '24px' }}>
              {/* Cards View */}
              <div>
                {viewMode === 'grid' ? (
                  <div className="studio-card-grid">
                    {filteredCards.map((c) => {
                      const fac = data.factions.find((f) => f.id === c.faction) || data.factions[0];
                      const statusDef = DEV_STATUSES.find((s) => s.id === c.status) || DEV_STATUSES[0];
                      const isSelected = inspectCardId === c.id;

                      return (
                        <div
                          key={c.id}
                          className="studio-card-item"
                          style={{
                            borderColor: isSelected ? '#f39c12' : undefined,
                            boxShadow: isSelected ? '0 0 15px rgba(243, 156, 18, 0.3)' : undefined,
                          }}
                          onClick={() => setInspectCardId(c.id)}
                        >
                          <div className="studio-card-badge-row">
                            <span
                              className="studio-faction-pill"
                              style={{ color: fac?.color || '#cbd5e1', borderColor: fac?.color || 'rgba(255,255,255,0.1)' }}
                            >
                              <span>{fac?.icon}</span> {fac?.name}
                            </span>
                            <span
                              className="studio-status-pill"
                              style={{ color: statusDef.color, background: statusDef.bg }}
                            >
                              {statusDef.label}
                            </span>
                          </div>

                          <div style={{ transform: 'scale(0.95)', margin: '4px 0' }}>
                            <CardView
                              defId={c.id}
                              small
                              style={{
                                '--card-color': c.color || fac?.color,
                              }}
                            />
                          </div>

                          <div className="studio-card-actions">
                            <button
                              type="button"
                              className="btn-studio btn-studio-ghost"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCard(c);
                                setIsCardModalOpen(true);
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn-studio btn-studio-ghost"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateCard(c);
                              }}
                              title="Duplicate as Draft"
                            >
                              📋 Clone
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="studio-table-wrap">
                    <table className="studio-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Card Name</th>
                          <th>Type</th>
                          <th>Faction</th>
                          <th>Qty</th>
                          <th>Power</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCards.map((c) => {
                          const fac = data.factions.find((f) => f.id === c.faction);
                          const statusDef = DEV_STATUSES.find((s) => s.id === c.status) || DEV_STATUSES[0];
                          const isSelected = inspectCardId === c.id;

                          return (
                            <tr
                              key={c.id}
                              style={{
                                background: isSelected ? 'rgba(243, 156, 18, 0.08)' : undefined,
                                cursor: 'pointer',
                              }}
                              onClick={() => setInspectCardId(c.id)}
                            >
                              <td className="studio-table-card-id">{c.id}</td>
                              <td>
                                <div className="studio-table-card-name">
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color || '#e67e22' }} />
                                  {c.name}
                                </div>
                              </td>
                              <td>
                                <span className={`type-pill type-${c.type}`} style={{ fontSize: '11px' }}>
                                  {TYPE_LABEL[c.type]}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: fac?.color || '#94a3b8', fontSize: '12px' }}>
                                  {fac?.icon} {fac?.name || 'Neutral'}
                                </span>
                              </td>
                              <td><strong>{c.qty}</strong></td>
                              <td>{'★'.repeat(c.powerRating || 3)}</td>
                              <td>
                                <span
                                  className="studio-status-pill"
                                  style={{ color: statusDef.color, background: statusDef.bg }}
                                >
                                  {statusDef.label}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    className="btn-studio btn-studio-ghost"
                                    style={{ padding: '2px 6px', fontSize: '11px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCard(c);
                                      setIsCardModalOpen(true);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-studio btn-studio-ghost"
                                    style={{ padding: '2px 6px', fontSize: '11px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateCard(c);
                                    }}
                                  >
                                    Clone
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!filteredCards.length && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(22, 27, 38, 0.4)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                    <h3 style={{ margin: 0, color: '#fff' }}>No cards matched your filter</h3>
                    <p style={{ color: '#8892b0', fontSize: '13px' }}>Try resetting your search query or filters.</p>
                  </div>
                )}
              </div>

              {/* Inspector Drawer */}
              {inspectedCard && (
                <aside
                  style={{
                    background: 'rgba(22, 27, 38, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'sticky',
                    top: '80px',
                    maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Card Inspector</span>
                    <button
                      type="button"
                      className="btn-studio btn-studio-primary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => {
                        setEditingCard(inspectedCard);
                        setIsCardModalOpen(true);
                      }}
                    >
                      ✏️ Edit Card
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CardView
                      defId={inspectedCard.id}
                      style={{ '--card-color': inspectedCard.color }}
                    />
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#fff' }}>{inspectedCard.name}</h3>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{inspectedCard.id}</div>
                  </div>

                  <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(10, 13, 19, 0.6)', padding: '10px 12px', borderRadius: '8px' }}>
                    {inspectedCard.text}
                  </div>

                  {inspectedCard.flavor && (
                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                      “{inspectedCard.flavor}”
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b' }}>Faction: </span>
                      <strong style={{ color: '#fff' }}>{inspectedCard.faction}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b' }}>Deck Copies: </span>
                      <strong style={{ color: '#fff' }}>{inspectedCard.qty}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b' }}>Power: </span>
                      <strong style={{ color: '#f39c12' }}>{'★'.repeat(inspectedCard.powerRating || 3)}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b' }}>Complexity: </span>
                      <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{inspectedCard.complexity || 'Medium'}</strong>
                    </div>
                  </div>

                  {/* Dev Notes */}
                  {inspectedCard.devNotes && (
                    <div style={{ background: 'rgba(142, 68, 173, 0.1)', border: '1px solid rgba(142, 68, 173, 0.3)', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                      <strong style={{ color: '#a569bd' }}>Dev Notes:</strong>
                      <p style={{ margin: '4px 0 0 0', color: '#e5e9f0' }}>{inspectedCard.devNotes}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {inspectedCard.tags && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {inspectedCard.tags.map((t) => (
                        <span key={t} className="studio-tag-chip">{t}</span>
                      ))}
                    </div>
                  )}
                </aside>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FACTIONS MANAGEMENT */}
        {tab === 'factions' && (
          <div>
            <div className="studio-toolbar">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Faction Catalog & Lore</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Manage dragon clans, theme colors, archetype identities, and assign cards.
                </p>
              </div>
              <button
                type="button"
                className="btn-studio btn-studio-primary"
                onClick={() => {
                  setEditingFaction({
                    id: '',
                    name: '',
                    icon: '🐉',
                    color: '#e67e22',
                    description: '',
                    playstyle: '',
                    mechanicsStr: '',
                    tier: 'Core Faction',
                  });
                  setIsFactionModalOpen(true);
                }}
              >
                + Add Faction
              </button>
            </div>

            <div className="studio-factions-grid">
              {data.factions.map((f) => {
                const stats = analytics.factionCounts[f.id] || { unique: 0, total: 0 };
                return (
                  <div
                    key={f.id}
                    className="studio-faction-card"
                    style={{
                      '--faction-color': f.color,
                    }}
                  >
                    <div className="studio-faction-header">
                      <div className="studio-faction-title">
                        <span className="studio-faction-icon">{f.icon}</span>
                        <div>
                          <h3>{f.name}</h3>
                          <span className="studio-faction-tier">{f.tier} · <code>{f.id}</code></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-studio btn-studio-ghost"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => {
                          setEditingFaction(f);
                          setIsFactionModalOpen(true);
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    <div className="studio-faction-stats">
                      <div className="studio-stat-item">
                        <dt>Unique Cards</dt>
                        <dd>{stats.unique}</dd>
                      </div>
                      <div className="studio-stat-item">
                        <dt>Total in Deck</dt>
                        <dd>{stats.total} cards</dd>
                      </div>
                    </div>

                    <div className="studio-faction-playstyle">
                      ⚔️ {f.playstyle}
                    </div>

                    <p className="studio-faction-desc">
                      {f.description}
                    </p>

                    {f.mechanics && f.mechanics.length > 0 && (
                      <div className="studio-faction-mechanics">
                        {f.mechanics.map((m) => (
                          <span key={m} className="studio-tag-chip">#{m}</span>
                        ))}
                      </div>
                    )}

                    {f.notes && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                        {f.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Faction Card Matrix / Reassignment */}
            <div className="studio-chart-card" style={{ marginTop: '30px' }}>
              <h3>
                <span>Quick Card Faction Reassignment Matrix</span>
                <span style={{ fontSize: '12px', color: '#8892b0', fontWeight: 400 }}>Instantly assign cards to factions</span>
              </h3>
              <div className="studio-table-wrap">
                <table className="studio-table">
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Type</th>
                      <th>Current Faction</th>
                      <th>Reassign Faction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(data.cards).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>({c.id})</span></td>
                        <td><span className={`type-pill type-${c.type}`}>{TYPE_LABEL[c.type]}</span></td>
                        <td>
                          {(() => {
                            const fac = data.factions.find((f) => f.id === c.faction);
                            return (
                              <span style={{ color: fac?.color || '#fff' }}>
                                {fac?.icon} {fac?.name || 'Neutral'}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <select
                            className="studio-select"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            value={c.faction || 'neutral'}
                            onChange={(e) => handleQuickReassignFaction(c.id, e.target.value)}
                          >
                            {data.factions.map((f) => (
                              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DECK & BALANCE ANALYTICS */}
        {tab === 'analytics' && (
          <div className="studio-analytics-container">
            {/* Top Metric Cards */}
            <div className="studio-metrics-row">
              <div className="studio-metric-box">
                <span className="label">Total Deck Size</span>
                <span className="value">{analytics.totalCardsInDeck}</span>
                <span className="subtext">Active cards in draw deck</span>
              </div>
              <div className="studio-metric-box">
                <span className="label">Nest Baby Dragons</span>
                <span className="value">{analytics.babyCount}</span>
                <span className="subtext">Shared Nest starters</span>
              </div>
              <div className="studio-metric-box">
                <span className="label">Unique Cards</span>
                <span className="value">{analytics.uniqueCardsCount}</span>
                <span className="subtext">Distinct card definitions</span>
              </div>
              <div className="studio-metric-box">
                <span className="label">Total Factions</span>
                <span className="value">{data.factions.length}</span>
                <span className="subtext">Active dragon archetypes</span>
              </div>
            </div>

            {/* Health / Warnings Check */}
            {analytics.warnings.length > 0 && (
              <div className="studio-chart-card">
                <h3 style={{ color: '#f39c12' }}>⚠️ Deck Balance & Health Warnings ({analytics.warnings.length})</h3>
                <div className="studio-warnings-list">
                  {analytics.warnings.map((w, index) => (
                    <div key={index} className={`studio-warning-item studio-warning-${w.level}`}>
                      <span>{w.level === 'error' ? '❌' : w.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribution Charts */}
            <div className="studio-charts-grid">
              {/* Card Type Distribution */}
              <div className="studio-chart-card">
                <h3>Card Type Distribution</h3>
                <div className="studio-bar-list">
                  {Object.entries(analytics.typeCounts).map(([typeId, count]) => {
                    const typeDef = CARD_TYPES.find((t) => t.id === typeId);
                    const pct = analytics.totalCardsInDeck > 0 ? ((count / analytics.totalCardsInDeck) * 100).toFixed(1) : 0;
                    return (
                      <div key={typeId} className="studio-bar-row">
                        <div className="studio-bar-labels">
                          <span>{typeDef?.icon} {typeDef?.label || typeId}</span>
                          <span><strong>{count}</strong> ({pct}%)</span>
                        </div>
                        <div className="studio-progress-track">
                          <div
                            className="studio-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: typeDef?.color || '#e67e22',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Faction Distribution */}
              <div className="studio-chart-card">
                <h3>Faction Representation in Deck</h3>
                <div className="studio-bar-list">
                  {data.factions.map((f) => {
                    const stats = analytics.factionCounts[f.id] || { unique: 0, total: 0 };
                    const pct = analytics.totalCardsInDeck > 0 ? ((stats.total / analytics.totalCardsInDeck) * 100).toFixed(1) : 0;
                    return (
                      <div key={f.id} className="studio-bar-row">
                        <div className="studio-bar-labels">
                          <span>{f.icon} {f.name}</span>
                          <span><strong>{stats.total}</strong> ({pct}%)</span>
                        </div>
                        <div className="studio-progress-track">
                          <div
                            className="studio-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: f.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mechanic Prevalence */}
              <div className="studio-chart-card">
                <h3>Key Mechanic Prevalence (Copies in Deck)</h3>
                <div className="studio-bar-list">
                  {Object.entries(analytics.mechanicCounts).map(([tag, count]) => {
                    const maxTag = 20;
                    const pct = Math.min(100, (count / maxTag) * 100);
                    return (
                      <div key={tag} className="studio-bar-row">
                        <div className="studio-bar-labels">
                          <span>#{tag}</span>
                          <span><strong>{count}</strong> cards</span>
                        </div>
                        <div className="studio-progress-track">
                          <div
                            className="studio-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: '#3498db',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Development Status Distribution */}
              <div className="studio-chart-card">
                <h3>Development Status</h3>
                <div className="studio-bar-list">
                  {DEV_STATUSES.map((s) => {
                    const count = analytics.statusCounts[s.id] || 0;
                    const pct = analytics.uniqueCardsCount > 0 ? ((count / analytics.uniqueCardsCount) * 100).toFixed(1) : 0;
                    return (
                      <div key={s.id} className="studio-bar-row">
                        <div className="studio-bar-labels">
                          <span style={{ color: s.color }}>● {s.label}</span>
                          <span><strong>{count}</strong> unique ({pct}%)</span>
                        </div>
                        <div className="studio-progress-track">
                          <div
                            className="studio-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: s.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INTERACTIVE TEST SANDBOX */}
        {tab === 'sandbox' && (
          <StudioSandbox cards={data.cards} factions={data.factions} />
        )}

        {/* TAB 5: CODE GEN & EXPORT / IMPORT */}
        {tab === 'export' && (
          <div className="studio-export-wrap">
            <div className="studio-toolbar">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Code Generation & Backups</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Export production-ready JavaScript for <code>shared/cards.js</code>, save JSON backups, or download Markdown specs.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-studio btn-studio-primary"
                  onClick={() => downloadFile(generateCardsJsExport(data.cards, data.factions), 'cards.js', 'text/javascript')}
                >
                  Download cards.js
                </button>
                <button
                  type="button"
                  className="btn-studio"
                  onClick={() => downloadFile(JSON.stringify(data, null, 2), `card_studio_backup_${new Date().toISOString().slice(0,10)}.json`)}
                >
                  Export JSON Backup
                </button>
                <label className="btn-studio" style={{ cursor: 'pointer' }}>
                  Import JSON Backup
                  <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  className="btn-studio"
                  onClick={() => downloadFile(generateMarkdownSpec(data.cards, data.factions), 'cards_specification.md', 'text/markdown')}
                >
                  Export Markdown Spec
                </button>
                <button
                  type="button"
                  className="btn-studio btn-studio-danger"
                  onClick={handleResetDefaults}
                >
                  Reset Studio to Defaults
                </button>
              </div>
            </div>

            {/* Generated cards.js preview */}
            <div className="studio-code-box">
              <div className="studio-code-box-header">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e9f0' }}>Generated JavaScript Code (shared/cards.js)</span>
                <button
                  type="button"
                  className="btn-studio btn-studio-ghost"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(generateCardsJsExport(data.cards, data.factions));
                    showNotification('Copied code to clipboard!');
                  }}
                >
                  📋 Copy Code
                </button>
              </div>
              <pre>{generateCardsJsExport(data.cards, data.factions)}</pre>
            </div>
          </div>
        )}
      </main>

      {/* Card Editor Modal */}
      {isCardModalOpen && editingCard && (
        <CardEditorModal
          card={editingCard}
          factions={data.factions}
          isOpen={isCardModalOpen}
          onClose={() => {
            setIsCardModalOpen(false);
            setEditingCard(null);
          }}
          onSave={handleSaveCard}
          onDuplicate={handleDuplicateCard}
          onDelete={handleDeleteCard}
        />
      )}

      {/* Faction Editor Modal */}
      {isFactionModalOpen && editingFaction && (
        <FactionEditorModal
          faction={editingFaction}
          isOpen={isFactionModalOpen}
          onClose={() => {
            setIsFactionModalOpen(false);
            setEditingFaction(null);
          }}
          onSave={handleSaveFaction}
          onDelete={handleDeleteFaction}
        />
      )}
    </div>
  );
}
