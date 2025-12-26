import { useEffect } from 'react';
import { Game } from '@/components';
import { EditorToolbar } from '@/components/EditorToolbar';
import { DefinitionEditor } from '@/components/DefinitionEditor';
import { MainMenu } from '@/components/MainMenu';
import { VersionBadge } from '@/components/VersionBadge';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import '@/styles/game.css';

function App() {
  const { currentScreen, returnToMenu } = useGameStateStore();
  const { setEditing } = useMapEditorStore();
  const { closeEditor } = useDefinitionsStore();

  // Open map editor when entering mapEditor screen
  useEffect(() => {
    if (currentScreen === 'mapEditor') {
      setEditing(true);
    }
  }, [currentScreen, setEditing]);

  // Handle ESC key to return to menu from editors
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentScreen === 'materialEditor' || currentScreen === 'creatureEditor') {
          closeEditor();
          returnToMenu();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [currentScreen, closeEditor, returnToMenu]);

  // Show menu screen
  if (currentScreen === 'menu') {
    return (
      <>
        <MainMenu />
        <VersionBadge />
      </>
    );
  }

  // Show game with different editor states
  return (
    <>
      <Game />
      <VersionBadge />

      {/* Show editor toolbar only in game and mapEditor modes */}
      {(currentScreen === 'game' || currentScreen === 'mapEditor') && <EditorToolbar />}

      {/* Show definition editor in materialEditor and creatureEditor modes */}
      {currentScreen === 'materialEditor' && (
        <DefinitionEditor
          initialTab="resources"
          onClose={() => {
            closeEditor();
            returnToMenu();
          }}
        />
      )}
      {currentScreen === 'creatureEditor' && (
        <DefinitionEditor
          initialTab="plants"
          onClose={() => {
            closeEditor();
            returnToMenu();
          }}
        />
      )}

      {/* Show definition editor in game mode (can be toggled with Shift+D) */}
      {currentScreen === 'game' && <DefinitionEditor />}
    </>
  );
}

export default App;
