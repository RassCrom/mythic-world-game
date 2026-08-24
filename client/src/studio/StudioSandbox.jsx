import React, { useState } from 'react';
import CardView, { TYPE_LABEL, TypeGlyph } from '../components/CardView.jsx';
import { isDragonType } from '../../../shared/cards.js';

export default function StudioSandbox({ cards, factions }) {
  const [hand, setHand] = useState(['m_harvest', 'basic_crimson', 'u_armor', 's_venom', 'i_roar']);
  const [myStable, setMyStable] = useState(['baby_dragon', 'm_phoenix', 'm_guardian']);
  const [oppStable, setOppStable] = useState(['baby_dragon', 'm_colossal', 'd_fog']);
  const [discard, setDiscard] = useState(['s_bargain', 'm_battering']);
  const [search, setSearch] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(null);

  const allCardsList = Object.values(cards);

  const filteredCards = allCardsList.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.text.toLowerCase().includes(q);
  });

  const countDragons = (list) => {
    return list.reduce((acc, id) => {
      const def = cards[id];
      if (!def) return acc;
      if (isDragonType(def.type)) {
        return acc + (def.countsAs || 1);
      }
      return acc;
    }, 0);
  };

  const myDragonCount = countDragons(myStable);
  const oppDragonCount = countDragons(oppStable);

  const spawnCard = (id, targetZone) => {
    if (targetZone === 'hand') setHand((prev) => [...prev, id]);
    else if (targetZone === 'myStable') setMyStable((prev) => [...prev, id]);
    else if (targetZone === 'oppStable') setOppStable((prev) => [...prev, id]);
    else if (targetZone === 'discard') setDiscard((prev) => [...prev, id]);
  };

  const removeCard = (index, zone) => {
    if (zone === 'hand') setHand((prev) => prev.filter((_, i) => i !== index));
    else if (zone === 'myStable') setMyStable((prev) => prev.filter((_, i) => i !== index));
    else if (zone === 'oppStable') setOppStable((prev) => prev.filter((_, i) => i !== index));
    else if (zone === 'discard') setDiscard((prev) => prev.filter((_, i) => i !== index));
  };

  const moveCard = (index, fromZone, toZone) => {
    let cardId;
    if (fromZone === 'hand') {
      cardId = hand[index];
      setHand((prev) => prev.filter((_, i) => i !== index));
    } else if (fromZone === 'myStable') {
      cardId = myStable[index];
      setMyStable((prev) => prev.filter((_, i) => i !== index));
    } else if (fromZone === 'oppStable') {
      cardId = oppStable[index];
      setOppStable((prev) => prev.filter((_, i) => i !== index));
    } else if (fromZone === 'discard') {
      cardId = discard[index];
      setDiscard((prev) => prev.filter((_, i) => i !== index));
    }

    if (cardId) {
      if (toZone === 'hand') setHand((prev) => [...prev, cardId]);
      else if (toZone === 'myStable') setMyStable((prev) => [...prev, cardId]);
      else if (toZone === 'oppStable') setOppStable((prev) => [...prev, cardId]);
      else if (toZone === 'discard') setDiscard((prev) => [...prev, cardId]);
    }
  };

  const clearAll = () => {
    setHand([]);
    setMyStable([]);
    setOppStable([]);
    setDiscard([]);
  };

  const resetPreset = () => {
    setHand(['m_harvest', 'basic_crimson', 'u_armor', 's_venom', 'i_roar']);
    setMyStable(['baby_dragon', 'm_phoenix', 'm_guardian']);
    setOppStable(['baby_dragon', 'm_colossal', 'd_fog']);
    setDiscard(['s_bargain', 'm_battering']);
  };

  return (
    <div className="studio-sandbox-wrap">
      <div className="studio-toolbar" style={{ marginBottom: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Interactive Test Sandbox</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Simulate game scenarios, test card interactions, check visual layouts, and evaluate win condition counts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-studio" onClick={resetPreset}>Reset Preset Board</button>
          <button type="button" className="btn-studio btn-studio-danger" onClick={clearAll}>Clear Board</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Virtual Board Zones */}
        <div className="sandbox-board">
          {/* Opponent Stable */}
          <div className="sandbox-zone">
            <div className="sandbox-zone-title">
              <span>Opponent Stable ({oppDragonCount} Dragons)</span>
              <span style={{ fontSize: '11px', color: oppDragonCount >= 7 ? '#2ecc71' : '#8892b0' }}>
                {oppDragonCount >= 7 ? '🏆 Win condition reached!' : `${7 - oppDragonCount} more needed`}
              </span>
            </div>
            <div className="sandbox-zone-cards">
              {oppStable.map((id, index) => (
                <div key={`${id}-${index}`} style={{ position: 'relative' }}>
                  <CardView defId={id} small onClick={() => setSelectedCardId(id)} />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Steal to My Stable" onClick={() => moveCard(index, 'oppStable', 'myStable')}>Steal</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Destroy to Discard" onClick={() => moveCard(index, 'oppStable', 'discard')}>Destroy</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px', color: '#e74c3c' }} onClick={() => removeCard(index, 'oppStable')}>✕</button>
                  </div>
                </div>
              ))}
              {!oppStable.length && <span style={{ fontSize: '12px', color: '#64748b' }}>Empty Stable</span>}
            </div>
          </div>

          {/* Player Stable */}
          <div className="sandbox-zone" style={{ borderColor: 'rgba(230, 126, 34, 0.4)', background: 'rgba(230, 126, 34, 0.04)' }}>
            <div className="sandbox-zone-title" style={{ color: '#f39c12' }}>
              <span>Your Stable ({myDragonCount} Dragons)</span>
              <span style={{ fontSize: '11px', color: myDragonCount >= 7 ? '#2ecc71' : '#f39c12' }}>
                {myDragonCount >= 7 ? '🏆 Win condition reached (7 Dragons)!' : `${7 - myDragonCount} dragons away from win`}
              </span>
            </div>
            <div className="sandbox-zone-cards">
              {myStable.map((id, index) => (
                <div key={`${id}-${index}`} style={{ position: 'relative' }}>
                  <CardView defId={id} small onClick={() => setSelectedCardId(id)} />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Return to Hand" onClick={() => moveCard(index, 'myStable', 'hand')}>Hand</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Sacrifice to Discard" onClick={() => moveCard(index, 'myStable', 'discard')}>Sacrifice</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px', color: '#e74c3c' }} onClick={() => removeCard(index, 'myStable')}>✕</button>
                  </div>
                </div>
              ))}
              {!myStable.length && <span style={{ fontSize: '12px', color: '#64748b' }}>No dragons in your stable yet.</span>}
            </div>
          </div>

          {/* Player Hand */}
          <div className="sandbox-zone">
            <div className="sandbox-zone-title">
              <span>Your Hand ({hand.length} cards)</span>
              <span style={{ fontSize: '11px', color: hand.length > 7 ? '#e74c3c' : '#8892b0' }}>
                {hand.length > 7 ? '⚠️ Hand limit exceeded (Max 7 at end of turn)' : 'Hand size OK'}
              </span>
            </div>
            <div className="sandbox-zone-cards">
              {hand.map((id, index) => (
                <div key={`${id}-${index}`} style={{ position: 'relative' }}>
                  <CardView defId={id} small onClick={() => setSelectedCardId(id)} />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                    <button type="button" className="btn-studio btn-studio-primary" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => moveCard(index, 'hand', 'myStable')}>Play</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} onClick={() => moveCard(index, 'hand', 'discard')}>Discard</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px', color: '#e74c3c' }} onClick={() => removeCard(index, 'hand')}>✕</button>
                  </div>
                </div>
              ))}
              {!hand.length && <span style={{ fontSize: '12px', color: '#64748b' }}>Empty Hand</span>}
            </div>
          </div>

          {/* Discard Pile */}
          <div className="sandbox-zone">
            <div className="sandbox-zone-title">
              <span>Discard Pile ({discard.length} cards)</span>
            </div>
            <div className="sandbox-zone-cards">
              {discard.map((id, index) => (
                <div key={`${id}-${index}`} style={{ position: 'relative', opacity: 0.85 }}>
                  <CardView defId={id} small onClick={() => setSelectedCardId(id)} />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Reanimate to Stable" onClick={() => moveCard(index, 'discard', 'myStable')}>Reanimate</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px' }} title="Recover to Hand" onClick={() => moveCard(index, 'discard', 'hand')}>Hand</button>
                    <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 4px', fontSize: '10px', color: '#e74c3c' }} onClick={() => removeCard(index, 'discard')}>✕</button>
                  </div>
                </div>
              ))}
              {!discard.length && <span style={{ fontSize: '12px', color: '#64748b' }}>Discard pile empty</span>}
            </div>
          </div>
        </div>

        {/* Card Spawner Pool Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(22, 27, 38, 0.7)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Card Spawner</h3>
          <input
            className="studio-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter cards to spawn..."
          />

          <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCards.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(10, 13, 19, 0.6)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {TYPE_LABEL[c.type]} · {c.faction}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" className="btn-studio btn-studio-ghost" style={{ padding: '2px 6px', fontSize: '10px' }} title="Spawn to Hand" onClick={() => spawnCard(c.id, 'hand')}>+Hand</button>
                  <button type="button" className="btn-studio btn-studio-primary" style={{ padding: '2px 6px', fontSize: '10px' }} title="Spawn to Stable" onClick={() => spawnCard(c.id, 'myStable')}>+Stable</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
