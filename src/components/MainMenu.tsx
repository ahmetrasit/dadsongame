import { useState } from 'react';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';

export function MainMenu() {
  const { setScreen } = useGameStateStore();
  const { openEditor } = useDefinitionsStore();
  const [showMapSelect, setShowMapSelect] = useState(false);
  const [showEditorMenu, setShowEditorMenu] = useState(false);

  const handleNewGame = () => {
    setShowMapSelect(true);
  };

  const handleStartGame = () => {
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
          <MenuButton onClick={() => setShowEditorMenu(true)}>Editor</MenuButton>
        </div>
      )}

      {/* Map Selection */}
      {showMapSelect && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '24px' }}>Select Map</h2>
          <MenuButton onClick={handleStartGame}>Default Map</MenuButton>
          <MenuButton onClick={() => setShowMapSelect(false)} secondary>Back</MenuButton>
        </div>
      )}

      {/* Editor Menu */}
      {showEditorMenu && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '24px' }}>Editor</h2>
          <MenuButton onClick={handleMapEditor}>Map Editor</MenuButton>
          <MenuButton onClick={handleObjectEditor}>Object Editor</MenuButton>
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
