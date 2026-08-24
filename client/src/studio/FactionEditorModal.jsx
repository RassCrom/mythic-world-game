import React, { useState, useEffect, useRef } from 'react';

const EMOJI_OPTIONS = [
  '🔥', '🌊', '🍃', '🪙', '💀', '✨', '⏳', '⚙️', '⚡', '🐉', '🛡️', '🌙', '☀️', '🌋', '❄️', '🔮',
  '🦄', '🐎', '🐺', '🦅', '🦇', '🐍', '🐢', '🦊', '🦁', '🐲', '🐙', '🦑', '🪶', '💎', '🌸', '🌀', '⭐', '🌈', '🎭', '🗡️',
  '🐾', '🕷️', '🦂', '🪄', '👑', '🏰', '🩸', '👁️'
];

const COLOR_PRESETS = [
  '#e63946', '#e67e22', '#f1c40f', '#2a9d8f', 
  '#27ae60', '#1abc9c', '#3498db', '#3a86ff', 
  '#9b59b6', '#8e44ad', '#8338ec', '#ff006e', 
  '#34495e', '#7f8c8d', '#2c3e50', '#ffffff'
];

export default function FactionEditorModal({
  faction,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (faction) {
      setForm({
        id: faction.id || '',
        name: faction.name || '',
        icon: faction.icon || '🐉',
        color: faction.color || '#e67e22',
        description: faction.description || '',
        strengths: faction.strengths || '',
        weaknesses: faction.weaknesses || '',
        playstyle: faction.playstyle || '',
        mechanicsStr: (faction.mechanics || []).join(', '),
        tier: faction.tier || 'Core Faction',
        notes: faction.notes || '',
      });
      setErrors({});
    }
  }, [faction]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target.tagName !== 'TEXTAREA')) {
        // Only trigger save on Enter if not in a textarea, or if pressing Ctrl+Enter
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, form]);

  if (!isOpen || !form) return null;

  const handleField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!form.id.trim()) newErrors.id = 'Faction ID is required';
    if (!form.name.trim()) newErrors.name = 'Faction Name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const mechanics = form.mechanicsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      id: form.id.trim().toLowerCase().replace(/\s+/g, '_'),
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      description: form.description.trim(),
      strengths: form.strengths.trim(),
      weaknesses: form.weaknesses.trim(),
      playstyle: form.playstyle.trim(),
      mechanics,
      tier: form.tier,
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="studio-modal-overlay" onMouseDown={onClose}>
      <div className="studio-modal-card" style={{ maxWidth: '680px' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="studio-modal-header">
          <h2>{faction.id ? `Edit Faction: ${faction.name || faction.id}` : 'Create New Faction'}</h2>
          <button type="button" className="btn-studio btn-studio-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="studio-modal-body" style={{ flexDirection: 'column' }}>
          
          {/* Live Preview Banner */}
          <div 
            style={{ 
              backgroundColor: form.color, 
              padding: '12px 16px', 
              borderRadius: '6px', 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              color: '#fff',
              textShadow: '0px 1px 3px rgba(0,0,0,0.8)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <span style={{ fontSize: '32px' }}>{form.icon}</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{form.name || 'Unnamed Faction'}</span>
            <span style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.8 }}>Preview</span>
          </div>

          <div className="studio-form-row">
            <div className="studio-field" style={{ maxWidth: '100px' }}>
              <label>Icon</label>
              <select
                className="studio-select"
                value={form.icon}
                onChange={(e) => handleField('icon', e.target.value)}
                style={{ fontSize: '20px', textAlign: 'center' }}
              >
                {EMOJI_OPTIONS.map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
            </div>
            
            <div className="studio-field">
              <label>Faction ID (Slug)</label>
              <input
                className="studio-input"
                value={form.id}
                onChange={(e) => handleField('id', e.target.value)}
                placeholder="e.g. pyre"
                disabled={!!faction.id}
                style={errors.id ? { borderColor: '#e74c3c' } : {}}
              />
              {errors.id && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.id}</span>}
            </div>
            
            <div className="studio-field" style={{ flex: 1.5 }}>
              <label>Faction Name</label>
              <input
                className="studio-input"
                value={form.name}
                onChange={(e) => handleField('name', e.target.value)}
                placeholder="e.g. Pyre Clan"
                style={errors.name ? { borderColor: '#e74c3c' } : {}}
              />
              {errors.name && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.name}</span>}
            </div>
          </div>
          
          <div className="studio-field" style={{ marginBottom: '16px' }}>
            <label>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {COLOR_PRESETS.map(c => (
                <div 
                  key={c}
                  onClick={() => handleField('color', c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: c,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: form.color.toLowerCase() === c.toLowerCase() ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                    boxShadow: form.color.toLowerCase() === c.toLowerCase() ? '0 0 0 2px #3498db' : 'none',
                  }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              className="studio-input"
              style={{ padding: '2px', height: '36px', cursor: 'pointer', maxWidth: '80px' }}
              value={form.color}
              onChange={(e) => handleField('color', e.target.value)}
            />
          </div>

          <div className="studio-form-row">
            <div className="studio-field">
              <label>Playstyle Archetype</label>
              <input
                className="studio-input"
                value={form.playstyle}
                onChange={(e) => handleField('playstyle', e.target.value)}
                placeholder="e.g. Aggro / High Tempo / Destruction"
              />
            </div>
            <div className="studio-field">
              <label>Category / Tier</label>
              <select
                className="studio-select"
                value={form.tier}
                onChange={(e) => handleField('tier', e.target.value)}
              >
                <option value="Core Faction">Core Faction</option>
                <option value="Expansion Faction">Expansion Faction</option>
                <option value="Exotic Faction">Exotic Faction</option>
                <option value="Universal">Universal</option>
              </select>
            </div>
          </div>

          <div className="studio-field">
            <label>Key Mechanics (comma separated)</label>
            <input
              className="studio-input"
              value={form.mechanicsStr}
              onChange={(e) => handleField('mechanicsStr', e.target.value)}
              placeholder="e.g. destroy, sacrifice, tempo, directDamage"
            />
          </div>

          <div className="studio-field">
            <label>Lore & Description</label>
            <textarea
              className="studio-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              placeholder="Describe faction thematic identity, behavior, visual motifs..."
            />
          </div>

          <div className="studio-form-row">
            <div className="studio-field">
              <label>Strengths</label>
              <textarea
                className="studio-textarea"
                rows={2}
                value={form.strengths}
                onChange={(e) => handleField('strengths', e.target.value)}
                placeholder="e.g. High burst damage, swarm tactics..."
              />
            </div>
            <div className="studio-field">
              <label>Weaknesses</label>
              <textarea
                className="studio-textarea"
                rows={2}
                value={form.weaknesses}
                onChange={(e) => handleField('weaknesses', e.target.value)}
                placeholder="e.g. Vulnerable to AoE, slow ramp up..."
              />
            </div>
          </div>

          <div className="studio-field">
            <label>Design Notes & Signature Synergies</label>
            <textarea
              className="studio-textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => handleField('notes', e.target.value)}
              placeholder="Signature dragons, key combo lines, balance targets..."
            />
          </div>
        </div>

        <div className="studio-modal-footer">
          <div>
            {onDelete && faction.id && faction.id !== 'neutral' && (
              <button type="button" className="btn-studio btn-studio-danger" onClick={() => onDelete(faction.id)}>
                Delete Faction
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-studio btn-studio-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-studio btn-studio-primary" onClick={handleSave}>
              Save Faction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
