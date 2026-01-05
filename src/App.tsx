import { useEffect, useState } from 'react';
import { Game } from '@/components';
import { EditorToolbar } from '@/components/EditorToolbar';
import { DefinitionEditor } from '@/components/DefinitionEditor';
import { SpriteEditor } from '@/components/SpriteEditor';
import { Gallery } from '@/components/Gallery';
import { MainMenu } from '@/components/MainMenu';
import { VersionBadge } from '@/components/VersionBadge';
import { InteractionPrompt } from '@/components/InteractionPrompt';
import { HUD } from '@/components/HUD';
import { BuildingMenu } from '@/components/BuildingMenu';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import '@/styles/game.css';

function App() {
  const { currentScreen, returnToMenu, setScreen } = useGameStateStore();
  const { setEditing, initFromFirebase: initMapFromFirebase } = useMapEditorStore();
  const { closeEditor, initFromFirebase: initDefinitionsFromFirebase } = useDefinitionsStore();

  // State for sprite editor when loading from gallery
  const [spriteEditorProps, setSpriteEditorProps] = useState<{
    initialPixels?: string[][];
  }>({});

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
        } else if (currentScreen === 'materialEditor' || currentScreen === 'creatureEditor' || currentScreen === 'spriteEditor') {
          closeEditor();
          setSpriteEditorProps({});
          returnToMenu();
        } else if (currentScreen === 'gallery') {
          returnToMenu();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [currentScreen, closeEditor, returnToMenu, setEditing]);

  // Handle opening sprite editor from gallery
  const handleEditSpriteFromGallery = (pixels: string[][]) => {
    setSpriteEditorProps({ initialPixels: pixels });
    setScreen('spriteEditor');
  };

  // Handle closing sprite editor
  const handleCloseSpriteEditor = () => {
    setSpriteEditorProps({});
    returnToMenu();
  };

  // Show sprite editor screen
  if (currentScreen === 'spriteEditor') {
    return (
      <>
        <SpriteEditor
          onClose={handleCloseSpriteEditor}
          initialPixels={spriteEditorProps.initialPixels}
        />
        <VersionBadge />
      </>
    );
  }

  // Show gallery screen
  if (currentScreen === 'gallery') {
    return (
      <>
        <Gallery
          onClose={returnToMenu}
          onEditSprite={handleEditSpriteFromGallery}
        />
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

      {/* Show HUD in game mode */}
      {currentScreen === 'game' && <HUD />}

      {/* Show editor toolbar only in game and mapEditor modes */}
      {(currentScreen === 'game' || currentScreen === 'mapEditor') && <EditorToolbar />}

      {/* Show interaction prompt in game mode */}
      {currentScreen === 'game' && <InteractionPrompt />}

      {/* Show building menu in game mode (toggle with B key) */}
      {currentScreen === 'game' && <BuildingMenu />}

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
