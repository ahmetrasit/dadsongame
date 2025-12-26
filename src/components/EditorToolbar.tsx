import { useEffect } from 'react';
import { useMapEditorStore, EditorTool } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';

const tools: { id: EditorTool; label: string; key: string }[] = [
  { id: 'plant', label: 'Plant', key: '1' },
  { id: 'animal', label: 'Animal', key: '2' },
  { id: 'water', label: 'Water', key: '3' },
  { id: 'river', label: 'River', key: '4' },
  { id: 'spawn', label: 'Spawn', key: '5' },
  { id: 'eraser', label: 'Eraser', key: '6' },
];

export function EditorToolbar() {
  const {
    isEditing,
    currentTool,
    setTool,
    activeRiver,
    closeRiver,
    cancelRiver,
    exportMap,
    clearMap,
    selectedPlantId,
    selectedAnimalId,
    selectedWaterId,
    setSelectedPlantId,
    setSelectedAnimalId,
    setSelectedWaterId,
  } = useMapEditorStore();

  const { plants, animals, waters } = useDefinitionsStore();

  // Auto-select first plant/animal if none selected
  useEffect(() => {
    if (!selectedPlantId && plants.length > 0) {
      setSelectedPlantId(plants[0].id);
    }
  }, [selectedPlantId, plants, setSelectedPlantId]);

  useEffect(() => {
    if (!selectedAnimalId && animals.length > 0) {
      setSelectedAnimalId(animals[0].id);
    }
  }, [selectedAnimalId, animals, setSelectedAnimalId]);

  useEffect(() => {
    if (!selectedWaterId && waters.length > 0) {
      setSelectedWaterId(waters[0].id);
    }
  }, [selectedWaterId, waters, setSelectedWaterId]);

  if (!isEditing) return null;

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportMap();
    console.log('Map data:', json);
    try {
      await navigator.clipboard.writeText(json);
      alert('Map copied to clipboard!');
    } catch {
      prompt('Copy map data:', json);
    }
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    minWidth: '120px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.9)',
        padding: '12px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 100,
        pointerEvents: 'auto',
        minWidth: '280px',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
        Map Editor (E to toggle)
      </div>

      {/* Tool buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            style={{
              padding: '6px 10px',
              background: currentTool === tool.id ? '#3b82f6' : '#444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {tool.label} ({tool.key})
          </button>
        ))}
      </div>

      {/* Plant selector */}
      {currentTool === 'plant' && (
        <div style={{ marginBottom: '10px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Select Plant Type:</div>
          {plants.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#f59e0b' }}>
              No plants defined. Create plants in the Object Editor first.
            </div>
          ) : (
            <select
              value={selectedPlantId || ''}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              style={selectStyle}
            >
              {plants.map(plant => (
                <option key={plant.id} value={plant.id}>
                  {plant.name} ({plant.subCategory})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Animal selector */}
      {currentTool === 'animal' && (
        <div style={{ marginBottom: '10px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Select Animal Type:</div>
          {animals.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#f59e0b' }}>
              No animals defined. Create animals in the Object Editor first.
            </div>
          ) : (
            <select
              value={selectedAnimalId || ''}
              onChange={(e) => setSelectedAnimalId(e.target.value)}
              style={selectStyle}
            >
              {animals.map(animal => (
                <option key={animal.id} value={animal.id}>
                  {animal.name} ({animal.subCategory})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Water selector */}
      {currentTool === 'water' && (
        <div style={{ marginBottom: '10px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Select Water Type:</div>
          {waters.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#f59e0b' }}>
              No waters defined. Create water bodies in the Object Editor first.
            </div>
          ) : (
            <select
              value={selectedWaterId || ''}
              onChange={(e) => setSelectedWaterId(e.target.value)}
              style={selectStyle}
            >
              {waters.map(water => (
                <option key={water.id} value={water.id}>
                  {water.name} ({water.waterType})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* River drawing UI */}
      {currentTool === 'river' && activeRiver.length > 0 && (
        <div style={{ marginBottom: '10px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
          <span style={{ fontSize: '12px' }}>Points: {activeRiver.length} </span>
          <button
            onClick={closeRiver}
            disabled={activeRiver.length < 3}
            style={{
              padding: '4px 8px',
              background: activeRiver.length >= 3 ? '#22c55e' : '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: activeRiver.length >= 3 ? 'pointer' : 'not-allowed',
              marginRight: '4px',
              fontSize: '12px',
            }}
          >
            Close (Enter)
          </button>
          <button
            onClick={cancelRiver}
            style={{
              padding: '4px 8px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Export/Clear buttons */}
      <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid #444', paddingTop: '10px' }}>
        <button
          onClick={handleExport}
          style={{
            padding: '6px 10px',
            background: '#22c55e',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Export
        </button>
        <button
          onClick={clearMap}
          style={{
            padding: '6px 10px',
            background: '#ef4444',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
        Click to place | Right-click to cancel
      </div>
    </div>
  );
}
