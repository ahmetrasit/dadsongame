import { useState, useEffect } from 'react';
import { useMapEditorStore, EditorTool } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { generatePlantPreview, generateAnimalPreview } from '@/utils/generatePreviewImage';

type Category = 'plants' | 'animals' | 'materials' | 'river' | 'spawn' | 'eraser';

export function EditorToolbar() {
  const {
    isEditing,
    currentTool,
    setTool,
    activeRiver,
    closeRiver,
    cancelRiver,
    selectedPlantId,
    selectedAnimalId,
    selectedResourceId,
    setSelectedPlantId,
    setSelectedAnimalId,
    setSelectedResourceId,
    // Map state
    currentMapId,
    currentMapName,
    setMapName,
    saveMap,
    loadMap,
    newMap,
    deleteMap,
    savedMaps,
    isLoadingMaps,
    refreshMapList,
    // Sync state
    firebaseSyncEnabled,
    isSyncing,
    syncError,
    clearSyncError,
    isOnline,
  } = useMapEditorStore();

  const { plants, animals, resources } = useDefinitionsStore();

  const [expandedCategory, setExpandedCategory] = useState<Category | null>('plants');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showLoadPanel, setShowLoadPanel] = useState(false);

  // Load saved maps list when panel is opened
  useEffect(() => {
    if (showLoadPanel) {
      refreshMapList();
    }
  }, [showLoadPanel, refreshMapList]);

  // Auto-select first item if none selected
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
    if (!selectedResourceId && resources.length > 0) {
      setSelectedResourceId(resources[0].id);
    }
  }, [selectedResourceId, resources, setSelectedResourceId]);

  if (!isEditing) return null;

  const handleSave = async () => {
    setSaveStatus('saving');
    await saveMap();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleLoad = async (mapId: string) => {
    await loadMap(mapId);
    setShowLoadPanel(false);
  };

  const handleNew = () => {
    newMap();
    setShowLoadPanel(false);
  };

  const handleDelete = async (mapId: string, mapName: string) => {
    if (confirm(`Delete "${mapName}"?`)) {
      await deleteMap(mapId);
    }
  };

  const toggleCategory = (category: Category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    // Set appropriate tool when expanding
    const toolMap: Record<Category, EditorTool> = {
      plants: 'plant',
      animals: 'animal',
      materials: 'resource',
      river: 'river',
      spawn: 'spawn',
      eraser: 'eraser',
    };
    if (expandedCategory !== category) {
      setTool(toolMap[category]);
    }
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const categoryHeaderStyle = (_category: Category, isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    background: isActive ? '#3b82f6' : '#2a2a2a',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '2px',
  });

  const badgeStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px',
    background: isSelected ? '#3b82f6' : '#1a1a1a',
    border: isSelected ? '2px solid #60a5fa' : '2px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '60px',
    transition: 'all 0.15s ease',
  });

  const badgeImageStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    marginBottom: '4px',
    objectFit: 'cover',
  };

  const badgeLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    color: '#ccc',
    textAlign: 'center',
    maxWidth: '56px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  // Get image for an object
  const getPlantImage = (plant: typeof plants[0]) => {
    return plant.imageUrl || generatePlantPreview(plant.subCategory, plant.name);
  };

  const getAnimalImage = (animal: typeof animals[0]) => {
    return animal.imageUrl || generateAnimalPreview(animal.subCategory, animal.name);
  };

  const getResourceImage = (resource: typeof resources[0]) => {
    return resource.imageUrl || '';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.95)',
        padding: '12px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Avenir, system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        zIndex: 100,
        pointerEvents: 'auto',
        width: '240px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      {/* Header with sync status */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Map Editor</span>
        <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {firebaseSyncEnabled ? (
            <>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: !isOnline ? '#888' : isSyncing ? '#f59e0b' : syncError ? '#ef4444' : '#22c55e',
              }} />
              <span style={{ color: !isOnline ? '#888' : syncError ? '#ef4444' : '#888' }}>
                {!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : syncError ? 'Error' : 'Synced'}
              </span>
            </>
          ) : (
            <span style={{ color: '#666' }}>Local</span>
          )}
        </span>
      </div>

      {/* Sync error */}
      {syncError && (
        <div style={{
          marginBottom: '10px',
          padding: '6px 8px',
          background: '#7f1d1d',
          borderRadius: '4px',
          fontSize: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{syncError}</span>
          <button onClick={clearSyncError} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Map name and Save */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#1a1a1a', borderRadius: '6px' }}>
        <input
          type="text"
          value={currentMapName}
          onChange={(e) => setMapName(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          placeholder="Map name..."
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'Avenir, system-ui, sans-serif',
            marginBottom: '8px',
          }}
        />
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <button
            onClick={handleSave}
            disabled={isSyncing || saveStatus === 'saving'}
            style={{
              flex: 1,
              padding: '8px',
              background: saveStatus === 'saved' ? '#22c55e' : '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={() => setShowLoadPanel(!showLoadPanel)}
            disabled={isSyncing}
            style={{
              flex: 1,
              padding: '8px',
              background: showLoadPanel ? '#6b7280' : '#4b5563',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Load
          </button>
          <button
            onClick={handleNew}
            disabled={isSyncing}
            style={{
              padding: '8px 12px',
              background: '#4b5563',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            New
          </button>
        </div>
        {currentMapId && (
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
            ID: {currentMapId.slice(0, 20)}...
          </div>
        )}
      </div>

      {/* Load Map Modal */}
      {showLoadPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowLoadPanel(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: '12px',
              padding: '20px',
              minWidth: '320px',
              maxWidth: '400px',
              maxHeight: '70vh',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                Load Map
              </h3>
              <button
                onClick={() => setShowLoadPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>

            {isLoadingMaps ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                Loading maps...
              </div>
            ) : savedMaps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No saved maps found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
                {savedMaps.map((map) => (
                  <div
                    key={map.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: map.id === currentMapId ? '#3b82f6' : '#2a2a2a',
                      border: map.id === currentMapId ? '2px solid #60a5fa' : '2px solid transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleLoad(map.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', marginBottom: '2px' }}>
                        {map.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        Updated: {new Date(map.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(map.id, map.name);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '6px',
                        borderRadius: '4px',
                        opacity: 0.7,
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                      title="Delete map"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

        {/* Plants */}
        <div>
          <button
            style={categoryHeaderStyle('plants', currentTool === 'plant')}
            onClick={() => toggleCategory('plants')}
          >
            <span>Plants ({plants.length})</span>
            <span>{expandedCategory === 'plants' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'plants' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              {plants.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '8px' }}>
                  No plants defined
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {plants.map(plant => (
                    <div
                      key={plant.id}
                      style={badgeStyle(selectedPlantId === plant.id)}
                      onClick={() => setSelectedPlantId(plant.id)}
                    >
                      <img src={getPlantImage(plant)} alt={plant.name} style={badgeImageStyle} />
                      <span style={badgeLabelStyle}>{plant.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animals */}
        <div>
          <button
            style={categoryHeaderStyle('animals', currentTool === 'animal')}
            onClick={() => toggleCategory('animals')}
          >
            <span>Animals ({animals.length})</span>
            <span>{expandedCategory === 'animals' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'animals' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              {animals.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '8px' }}>
                  No animals defined
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {animals.map(animal => (
                    <div
                      key={animal.id}
                      style={badgeStyle(selectedAnimalId === animal.id)}
                      onClick={() => setSelectedAnimalId(animal.id)}
                    >
                      <img src={getAnimalImage(animal)} alt={animal.name} style={badgeImageStyle} />
                      <span style={badgeLabelStyle}>{animal.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Materials */}
        <div>
          <button
            style={categoryHeaderStyle('materials', currentTool === 'resource')}
            onClick={() => toggleCategory('materials')}
          >
            <span>Materials ({resources.length})</span>
            <span>{expandedCategory === 'materials' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'materials' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              {resources.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '8px' }}>
                  No materials defined
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {resources.map(resource => (
                    <div
                      key={resource.id}
                      style={badgeStyle(selectedResourceId === resource.id)}
                      onClick={() => setSelectedResourceId(resource.id)}
                    >
                      {getResourceImage(resource) ? (
                        <img src={getResourceImage(resource)} alt={resource.name} style={badgeImageStyle} />
                      ) : (
                        <div style={{ ...badgeImageStyle, background: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          📦
                        </div>
                      )}
                      <span style={badgeLabelStyle}>{resource.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* River */}
        <div>
          <button
            style={categoryHeaderStyle('river', currentTool === 'river')}
            onClick={() => toggleCategory('river')}
          >
            <span>River</span>
            <span>{expandedCategory === 'river' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'river' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                Click to add points. Need 3+ points to close.
              </div>
              {activeRiver.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px' }}>Points: {activeRiver.length}</span>
                  <button
                    onClick={closeRiver}
                    disabled={activeRiver.length < 3}
                    style={{
                      padding: '4px 8px',
                      background: activeRiver.length >= 3 ? '#22c55e' : '#444',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: activeRiver.length >= 3 ? 'pointer' : 'not-allowed',
                      fontSize: '11px',
                    }}
                  >
                    Close
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
                      fontSize: '11px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spawn */}
        <div>
          <button
            style={categoryHeaderStyle('spawn', currentTool === 'spawn')}
            onClick={() => toggleCategory('spawn')}
          >
            <span>Spawn Point</span>
            <span>{expandedCategory === 'spawn' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'spawn' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Click on the map to set player spawn location.
              </div>
            </div>
          )}
        </div>

        {/* Eraser */}
        <div>
          <button
            style={categoryHeaderStyle('eraser', currentTool === 'eraser')}
            onClick={() => toggleCategory('eraser')}
          >
            <span>Eraser</span>
            <span>{expandedCategory === 'eraser' ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === 'eraser' && (
            <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '0 0 4px 4px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Click on objects to remove them.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      <div style={{ marginTop: '12px', fontSize: '10px', color: '#555', textAlign: 'center' }}>
        Click to place • Right-click to cancel
      </div>
    </div>
  );
}
