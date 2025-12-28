import { useEffect } from 'react';
import { Game } from '@/components';
import { EditorToolbar } from '@/components/EditorToolbar';
import { DefinitionEditor } from '@/components/DefinitionEditor';
import { SpriteEditor } from '@/components/SpriteEditor';
import { TileEditor } from '@/components/TileEditor';
import { MainMenu } from '@/components/MainMenu';
import { VersionBadge } from '@/components/VersionBadge';
import { InteractionPrompt } from '@/components/InteractionPrompt';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import '@/styles/game.css';

function App() {
  const { currentScreen, returnToMenu } = useGameStateStore();
  const { setEditing, initFromFirebase: initMapFromFirebase } = useMapEditorStore();
  const { closeEditor, initFromFirebase: initDefinitionsFromFirebase } = useDefinitionsStore();

  // Initialize from Firebase on app start
  useEffect(() => {
    initDefinitionsFromFirebase();
    initMapFromFirebase();
  }, [initDefinitionsFromFirebase, initMapFromFirebase]);

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
        if (currentScreen === 'mapEditor') {
          setEditing(false);
          returnToMenu();
        } else if (currentScreen === 'materialEditor' || currentScreen === 'creatureEditor' || currentScreen === 'spriteEditor' || currentScreen === 'tileEditor') {
          closeEditor();
          returnToMenu();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [currentScreen, closeEditor, returnToMenu, setEditing]);

  // Show sprite editor screen
  if (currentScreen === 'spriteEditor') {
    return (
      <>
        <SpriteEditor onClose={returnToMenu} />
        <VersionBadge />
      </>
    );
  }

  // Show tile editor screen
  if (currentScreen === 'tileEditor') {
    return (
      <>
        <TileEditor onClose={returnToMenu} />
        <VersionBadge />
      </>
    );
  }

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

      {/* Show interaction prompt in game mode */}
      {currentScreen === 'game' && <InteractionPrompt />}

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
