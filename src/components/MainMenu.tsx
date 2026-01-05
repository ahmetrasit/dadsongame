import { useState, useEffect } from 'react';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useRuntimeMapStore } from '@/stores/runtimeMapStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useYieldStateStore } from '@/stores/yieldStateStore';
import { useWorldStore } from '@/stores/worldStore';

export function MainMenu() {
  const { setScreen } = useGameStateStore();
  const { openEditor } = useDefinitionsStore();
  const savedMaps = useMapEditorStore((s) => s.savedMaps);
  const isLoadingMaps = useMapEditorStore((s) => s.isLoadingMaps);
  const refreshMapList = useMapEditorStore((s) => s.refreshMapList);
  const loadMap = useMapEditorStore((s) => s.loadMap);
  const newMap = useMapEditorStore((s) => s.newMap);
  const syncError = useMapEditorStore((s) => s.syncError);

  const [showMapSelect, setShowMapSelect] = useState(false);
  const [showEditorMenu, setShowEditorMenu] = useState(false);

  // Fetch saved maps when showing map selection
  useEffect(() => {
    if (showMapSelect) {
      refreshMapList();
    }
  }, [showMapSelect, refreshMapList]);

  const handleNewGame = () => {
    setShowMapSelect(true);
  };

  // Reset all runtime game state for a fresh start
  const resetGameState = () => {
    useInventoryStore.getState().initInventory();
    useYieldStateStore.getState().clearAll();
    useWorldStore.getState().initWorld();
  };

  const handleSelectMap = async (mapId: string) => {
    await loadMap(mapId);
    // Only navigate if load succeeded (no error set)
    const error = useMapEditorStore.getState().syncError;
    if (!error) {
      // Reset all game state for new game
      resetGameState();
      // Initialize runtime map from the loaded blueprint
      const blueprint = useMapEditorStore.getState().mapData;
      useRuntimeMapStore.getState().initFromBlueprint(blueprint, mapId);
      setScreen('game');
    }
  };

  const handleDefaultMap = () => {
    newMap();  // Start fresh with default map
    // Reset all game state for new game
    resetGameState();
    // Initialize runtime map from the default blueprint
    const blueprint = useMapEditorStore.getState().mapData;
    useRuntimeMapStore.getState().initFromBlueprint(blueprint, null);
    setScreen('game');
  };

  const handleStartGame = () => {
    // Resume uses existing runtime state (don't reinitialize)
    setScreen('game');
  };

  const handleMapEditor = () => {
    setScreen('mapEditor');
  };

  const handleObjectEditor = () => {
    openEditor('plants');
    setScreen('creatureEditor');
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#FFF1E5',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#333',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      onClick={stopProp}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: '64px',
          fontWeight: 'bold',
          marginBottom: '60px',
          color: '#0D0D0D',
          letterSpacing: '4px',
        }}
      >
        Dad & Son Game
      </h1>

      {/* Main Menu */}
      {!showMapSelect && !showEditorMenu && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
          <MenuButton onClick={handleNewGame}>New Game</MenuButton>
          <MenuButton onClick={handleStartGame}>Resume</MenuButton>
          <MenuButton onClick={() => setScreen('gallery')}>Gallery</MenuButton>
          <MenuButton onClick={() => setShowEditorMenu(true)}>Editor</MenuButton>
        </div>
      )}

      {/* Map Selection */}
      {showMapSelect && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '24px' }}>Select Map</h2>

          {/* Error display */}
          {syncError && (
            <div style={{
              padding: '10px',
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '14px',
              textAlign: 'center',
            }}>
              {syncError}
            </div>
          )}

          <MenuButton onClick={handleDefaultMap}>Default Map</MenuButton>

          {/* Saved Maps */}
          {isLoadingMaps && (
            <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>
              Loading saved maps...
            </div>
          )}

          {!isLoadingMaps && savedMaps.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '10px',
              background: '#E8DDD1',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Saved Maps:
              </div>
              {savedMaps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => handleSelectMap(map.id)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '16px',
                    background: '#FFF1E5',
                    border: '1px solid #D4C4B0',
                    borderRadius: '6px',
                    color: '#333',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0D0D0D';
                    e.currentTarget.style.color = '#FFF1E5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFF1E5';
                    e.currentTarget.style.color = '#333';
                  }}
                >
                  {map.name}
                </button>
              ))}
            </div>
          )}

          {!isLoadingMaps && savedMaps.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '10px' }}>
              No saved maps. Create one in Map Editor!
            </div>
          )}

          <MenuButton onClick={() => setShowMapSelect(false)} secondary>Back</MenuButton>
        </div>
      )}

      {/* Editor Menu */}
      {showEditorMenu && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '24px' }}>Editor</h2>
          <MenuButton onClick={handleMapEditor}>Map Editor</MenuButton>
          <MenuButton onClick={handleObjectEditor}>Object Editor</MenuButton>
          <MenuButton onClick={() => setScreen('spriteEditor')}>Sprite Editor</MenuButton>
          <MenuButton onClick={() => setShowEditorMenu(false)} secondary>Back</MenuButton>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '14px',
          color: '#666',
        }}
      >
        Press ESC to return to menu
      </div>
    </div>
  );
}

// Menu Button Component
function MenuButton({
  children,
  onClick,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '20px 40px',
        fontSize: '20px',
        fontWeight: 'bold',
        background: secondary ? '#E8DDD1' : '#0D0D0D',
        border: 'none',
        borderRadius: '8px',
        color: secondary ? '#333' : '#FFF1E5',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s ease',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
    >
      {children}
    </button>
  );
}
