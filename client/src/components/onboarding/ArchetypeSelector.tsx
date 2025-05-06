import React, { useState } from 'react';
import { ARCHETYPES, Archetype } from '../../constants/archetypes';
import './ArchetypeSelector.css';

interface ArchetypeSelectorProps {
  onArchetypeSelected: (archetype: Archetype) => void;
}

export const ArchetypeSelector: React.FC<ArchetypeSelectorProps> = ({ onArchetypeSelected }) => {
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);

  const handleArchetypeClick = (archetype: Archetype) => {
    setSelectedArchetype(archetype);
  };

  const handleConfirmSelection = () => {
    if (selectedArchetype) {
      onArchetypeSelected(selectedArchetype);
    }
  };

  return (
    <div className="archetype-selector-container">
      <div className="archetype-selector-header">
        <h1>Choose Your Archetype</h1>
        <p>Select an archetype that resonates with your journey of knowledge synthesis.</p>
      </div>
      <div className="archetype-grid">
        {ARCHETYPES.map((archetype) => (
          <div
            key={archetype.id}
            className={`archetype-card ${selectedArchetype?.id === archetype.id ? 'selected' : ''}`}
            onClick={() => handleArchetypeClick(archetype)}
            style={{ '--archetype-color': archetype.color } as React.CSSProperties}
          >
            <div className="archetype-image-container">
              <img src={archetype.image} alt={archetype.name} className="archetype-image" />
            </div>
            <div className="archetype-content">
              <h3>{archetype.name}</h3>
              <p>{archetype.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="archetype-selector-footer">
        <button
          className="confirm-button"
          onClick={handleConfirmSelection}
          disabled={!selectedArchetype}
          style={{ '--archetype-color': selectedArchetype?.color || '#2a2a2a' } as React.CSSProperties}
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
}; 