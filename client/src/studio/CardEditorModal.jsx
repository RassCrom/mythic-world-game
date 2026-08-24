import React, { useState, useEffect, useRef } from 'react';
import CardView, { TYPE_LABEL, TypeGlyph } from '../components/CardView.jsx';
import { CARD_TYPES, DEV_STATUSES, extractMechanicTags } from './cardStudioData.js';

const KEYWORDS = ['DESTROY', 'SACRIFICE', 'STEAL', 'DRAW', 'DISCARD', 'STOP', 'Nest', 'Stable', 'Dragon', 'Upgrade', 'Downgrade', 'Magic', 'Instant'];

export default function CardEditorModal({
  card,
  factions,
  isOpen,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}) {
  const [form, setForm] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general | mechanics | dev
  const rulesInputRef = useRef(null);

  useEffect(() => {
    if (card) {
      setForm({
        id: card.id || '',
        name: card.name || '',
        type: card.type || 'magical',
        sub: card.sub || '',
        faction: card.faction || 'neutral',
        color: card.color || '#7d3c98',
        text: card.text || '',
        flavor: card.flavor || '',
        qty: card.qty != null ? card.qty : 1,
        status: card.status || 'draft',
        powerRating: card.powerRating || 3,
        complexity: card.complexity || 'medium',
        devNotes: card.devNotes || '',
        // Booleans
        uncounterable: !!card.uncounterable,
        guardian: !!card.guardian,
        noMagicDestroy: !!card.noMagicDestroy,
        protected: !!card.protected,
        wanders: !!card.wanders,
        requiresBasic: !!card.requiresBasic,
        countsAs: card.countsAs || 1,
        // Advanced JSON
        onEnterJson: card.onEnter ? JSON.stringify(card.onEnter, null, 2) : '',
        onTurnStartJson: card.onTurnStart ? JSON.stringify(card.onTurnStart, null, 2) : '',
        onLeaveJson: card.onLeave ? JSON.stringify(card.onLeave, null, 2) : '',
        stepsJson: card.steps ? JSON.stringify(card.steps, null, 2) : '',
        modsJson: card.mods ? JSON.stringify(card.mods, null, 2) : '',
      });
      setJsonError(null);
    }
  }, [card]);

  if (!isOpen || !form) return null;

  const currentFaction = factions.find((f) => f.id === form.faction) || factions[0];

  const handleField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-update color when faction changes, but only if color matches old faction
      if (key === 'faction') {
        const oldFac = factions.find((f) => f.id === prev.faction);
        const newFac = factions.find((f) => f.id === value);
        if (newFac && (!oldFac || prev.color === oldFac.color)) {
          next.color = newFac.color;
        }
      }
      return next;
    });
  };

  const insertKeyword = (kw) => {
    const textarea = rulesInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const oldText = form.text;
    const newText = oldText.substring(0, start) + kw + oldText.substring(end);
    handleField('text', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + kw.length, start + kw.length);
    }, 10);
  };

  const handleSave = () => {
    setJsonError(null);
    try {
      const payload = {
        id: form.id.trim(),
        name: form.name.trim(),
        type: form.type,
        sub: form.sub.trim() || undefined,
        faction: form.faction,
        color: form.color,
        text: form.text.trim(),
        flavor: form.flavor.trim() || undefined,
        qty: Math.max(1, parseInt(form.qty, 10) || 1),
        status: form.status,
        powerRating: form.powerRating,
        complexity: form.complexity,
        devNotes: form.devNotes.trim(),
        uncounterable: form.uncounterable || undefined,
        guardian: form.guardian || undefined,
        noMagicDestroy: form.noMagicDestroy || undefined,
        protected: form.protected || undefined,
        wanders: form.wanders || undefined,
        requiresBasic: form.requiresBasic || undefined,
        countsAs: form.countsAs > 1 ? form.countsAs : undefined,
      };

      if (form.onEnterJson.trim()) payload.onEnter = JSON.parse(form.onEnterJson);
      if (form.onTurnStartJson.trim()) payload.onTurnStart = JSON.parse(form.onTurnStartJson);
      if (form.onLeaveJson.trim()) payload.onLeave = JSON.parse(form.onLeaveJson);
      if (form.stepsJson.trim()) payload.steps = JSON.parse(form.stepsJson);
      if (form.modsJson.trim()) payload.mods = JSON.parse(form.modsJson);

      payload.tags = extractMechanicTags(payload);

      onSave(payload, card.id);
    } catch (err) {
      setJsonError(`Invalid JSON in effect definitions: ${err.message}`);
    }
  };

  // Build a live preview def from the current form state
  const previewDef = {
    id: form.id,
    name: form.name || 'Untitled Card',
    type: form.type,
    sub: form.sub || undefined,
    color: form.color,
    text: form.text,
    flavor: form.flavor || undefined,
    qty: parseInt(form.qty, 10) || 1,
  };

  return (
    <div className="studio-modal-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="studio-modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="studio-modal-header">
          <h2>{card.id ? `Edit Card: ${card.name || card.id}` : 'Create New Card Draft'}</h2>
          <button type="button" className="btn-studio btn-studio-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="studio-modal-body">
          {/* Left Live Preview */}
          <div className="studio-modal-preview-pane">
            <div style={{ transform: 'scale(1.05)', margin: '15px 0' }}>
              <CardView
                defId={form.id}
                cardDef={previewDef}
                title={form.name}
                style={{
                  '--card-color': form.color,
                }}
              />
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div className="studio-faction-pill" style={{ color: currentFaction.color, borderColor: currentFaction.color }}>
                <span>{currentFaction.icon}</span> {currentFaction.name}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                Copies in Deck: <strong>{form.qty}</strong>
              </div>
            </div>
          </div>

          {/* Right Form Fields */}
          <div className="studio-modal-form-pane">
            {/* Tabs */}
            <div className="studio-nav" style={{ alignSelf: 'flex-start' }}>
              <button
                type="button"
                className={`studio-nav-btn ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                General & Rules
              </button>
              <button
                type="button"
                className={`studio-nav-btn ${activeTab === 'mechanics' ? 'active' : ''}`}
                onClick={() => setActiveTab('mechanics')}
              >
                Engine Triggers & JSON
              </button>
              <button
                type="button"
                className={`studio-nav-btn ${activeTab === 'dev' ? 'active' : ''}`}
                onClick={() => setActiveTab('dev')}
              >
                Dev Status & Balance
              </button>
            </div>

            {jsonError && (
              <div className="studio-warning-item studio-warning-error">{jsonError}</div>
            )}

            {activeTab === 'general' && (
              <>
                <div className="studio-form-row">
                  <div className="studio-field">
                    <label>Card ID (Slug)</label>
                    <input
                      className="studio-input"
                      value={form.id}
                      onChange={(e) => handleField('id', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="e.g. m_fire_drake"
                    />
                  </div>
                  <div className="studio-field" style={{ flex: 1.5 }}>
                    <label>Card Name</label>
                    <input
                      className="studio-input"
                      value={form.name}
                      onChange={(e) => handleField('name', e.target.value)}
                      placeholder="e.g. Pyreflame Drake"
                    />
                  </div>
                </div>

                <div className="studio-form-row">
                  <div className="studio-field">
                    <label>Card Type</label>
                    <select
                      className="studio-select"
                      value={form.type}
                      onChange={(e) => handleField('type', e.target.value)}
                    >
                      {CARD_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="studio-field">
                    <label>Faction / Clan</label>
                    <select
                      className="studio-select"
                      value={form.faction}
                      onChange={(e) => handleField('faction', e.target.value)}
                    >
                      {factions.map((f) => (
                        <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="studio-field">
                    <label>Sub-Type / Kind</label>
                    <input
                      className="studio-input"
                      value={form.sub}
                      onChange={(e) => handleField('sub', e.target.value)}
                      placeholder="e.g. wyvern"
                    />
                  </div>
                  <div className="studio-field" style={{ maxWidth: '90px' }}>
                    <label>Color</label>
                    <input
                      type="color"
                      className="studio-input"
                      style={{ padding: '2px', height: '36px', cursor: 'pointer' }}
                      value={form.color}
                      onChange={(e) => handleField('color', e.target.value)}
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Rules Text</label>
                    <div className="studio-keywords-bar">
                      {KEYWORDS.map((kw) => (
                        <button
                          type="button"
                          key={kw}
                          className="studio-keyword-btn"
                          onClick={() => insertKeyword(kw)}
                        >
                          +{kw}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={rulesInputRef}
                    className="studio-textarea"
                    rows={3}
                    value={form.text}
                    onChange={(e) => handleField('text', e.target.value)}
                    placeholder="Enter card effect rules text..."
                  />
                </div>

                <div className="studio-form-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>Flavor Text (Optional)</label>
                    <input
                      className="studio-input"
                      value={form.flavor}
                      onChange={(e) => handleField('flavor', e.target.value)}
                      placeholder="“It burns brightly until someone throws water.”"
                    />
                  </div>
                  <div className="studio-field" style={{ maxWidth: '100px' }}>
                    <label>Copies in Deck</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="studio-input"
                      value={form.qty}
                      onChange={(e) => handleField('qty', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'mechanics' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.uncounterable}
                      onChange={(e) => handleField('uncounterable', e.target.checked)}
                    />
                    <span>Uncounterable (Anti-Roar)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.guardian}
                      onChange={(e) => handleField('guardian', e.target.checked)}
                    />
                    <span>Guardian Protector</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.noMagicDestroy}
                      onChange={(e) => handleField('noMagicDestroy', e.target.checked)}
                    />
                    <span>Immune to Magic Destroy</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.protected}
                      onChange={(e) => handleField('protected', e.target.checked)}
                    />
                    <span>Protected (Indestructible)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.wanders}
                      onChange={(e) => handleField('wanders', e.target.checked)}
                    />
                    <span>Wanders Stables</span>
                  </label>
                </div>

                <div className="studio-field" style={{ marginTop: '10px' }}>
                  <label>Entrance Effect (onEnter JSON)</label>
                  <textarea
                    className="studio-code-editor"
                    rows={4}
                    value={form.onEnterJson}
                    onChange={(e) => handleField('onEnterJson', e.target.value)}
                    placeholder='[ { "do": "draw", "who": "owner", "n": 1 } ]'
                  />
                </div>

                <div className="studio-field">
                  <label>Turn Start Effect (onTurnStart JSON)</label>
                  <textarea
                    className="studio-code-editor"
                    rows={4}
                    value={form.onTurnStartJson}
                    onChange={(e) => handleField('onTurnStartJson', e.target.value)}
                    placeholder='{ "steps": [ { "do": "extraAction" } ] }'
                  />
                </div>

                <div className="studio-field">
                  <label>One-Shot Magic Steps (steps JSON)</label>
                  <textarea
                    className="studio-code-editor"
                    rows={4}
                    value={form.stepsJson}
                    onChange={(e) => handleField('stepsJson', e.target.value)}
                    placeholder='[ { "do": "destroy", "chooser": "owner", "filter": { "kind": "dragon" } } ]'
                  />
                </div>

                <div className="studio-field">
                  <label>Leave / Destroy Trigger (onLeave JSON)</label>
                  <textarea
                    className="studio-code-editor"
                    rows={3}
                    value={form.onLeaveJson}
                    onChange={(e) => handleField('onLeaveJson', e.target.value)}
                    placeholder='[ { "do": "destroy", "chooser": "owner", "filter": { "kind": "dragon", "zone": "any" }, "optional": true } ]'
                  />
                </div>

                <div className="studio-field">
                  <label>Continuous Modifiers (mods JSON Array)</label>
                  <textarea
                    className="studio-code-editor"
                    rows={2}
                    value={form.modsJson}
                    onChange={(e) => handleField('modsJson', e.target.value)}
                    placeholder='[ "dragonsSafe", "uncounterable" ]'
                  />
                </div>

                <div className="studio-form-row" style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.requiresBasic}
                      onChange={(e) => handleField('requiresBasic', e.target.checked)}
                    />
                    <span>Requires Basic Dragon in Stable</span>
                  </label>
                  <div className="studio-field" style={{ maxWidth: '140px' }}>
                    <label>Counts As # Dragons</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="studio-input"
                      value={form.countsAs}
                      onChange={(e) => handleField('countsAs', parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'dev' && (
              <>
                <div className="studio-form-row">
                  <div className="studio-field">
                    <label>Development Status</label>
                    <select
                      className="studio-select"
                      value={form.status}
                      onChange={(e) => handleField('status', e.target.value)}
                    >
                      {DEV_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="studio-field">
                    <label>Power Rating (1 to 5 Stars)</label>
                    <select
                      className="studio-select"
                      value={form.powerRating}
                      onChange={(e) => handleField('powerRating', parseInt(e.target.value, 10))}
                    >
                      <option value={1}>★☆☆☆☆ (Weak / Niche)</option>
                      <option value={2}>★★☆☆☆ (Modest / Basic)</option>
                      <option value={3}>★★★☆☆ (Standard / Solid)</option>
                      <option value={4}>★★★★☆ (Strong / Powerful)</option>
                      <option value={5}>★★★★★ (Game Changer / High Power)</option>
                    </select>
                  </div>
                  <div className="studio-field">
                    <label>Rules Complexity</label>
                    <select
                      className="studio-select"
                      value={form.complexity}
                      onChange={(e) => handleField('complexity', e.target.value)}
                    >
                      <option value="low">Low (Simple)</option>
                      <option value="medium">Medium (Moderate)</option>
                      <option value="high">High (Complex interaction)</option>
                    </select>
                  </div>
                </div>

                <div className="studio-field">
                  <label>Developer Notes & Design Intent</label>
                  <textarea
                    className="studio-textarea"
                    rows={4}
                    value={form.devNotes}
                    onChange={(e) => handleField('devNotes', e.target.value)}
                    placeholder="Document balance rationale, synergies, edge cases, or test observations..."
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="studio-modal-footer">
          <div>
            {onDelete && card.id && (
              <button type="button" className="btn-studio btn-studio-danger" onClick={() => onDelete(card.id)}>
                Delete Card
              </button>
            )}
            {onDuplicate && card.id && (
              <button type="button" className="btn-studio" style={{ marginLeft: '8px' }} onClick={() => onDuplicate(card)}>
                Duplicate as Draft
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-studio btn-studio-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-studio btn-studio-primary" onClick={handleSave}>
              Save Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
