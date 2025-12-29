import { create } from 'zustand';

export type GameScreen = 'menu' | 'game' | 'mapEditor' | 'materialEditor' | 'creatureEditor' | 'spriteEditor';

interface SpriteEditorContext {
  objectType: 'plant' | 'animal' | 'resource' | null;
  objectId: string | null;
}

interface GameStateStore {
  currentScreen: GameScreen;
  spriteEditorContext: SpriteEditorContext;
  setScreen: (screen: GameScreen) => void;
  openSpriteEditor: (objectType: 'plant' | 'animal' | 'resource', objectId: string) => void;
  startGame: () => void;
  returnToMenu: () => void;
}

export const useGameStateStore = create<GameStateStore>((set) => ({
  currentScreen: 'menu',
  spriteEditorContext: { objectType: null, objectId: null },

  setScreen: (screen) => set({ currentScreen: screen }),

  openSpriteEditor: (objectType, objectId) => set({
    currentScreen: 'spriteEditor',
    spriteEditorContext: { objectType, objectId }
  }),

  startGame: () => set({ currentScreen: 'game' }),

  returnToMenu: () => set({
    currentScreen: 'menu',
    spriteEditorContext: { objectType: null, objectId: null }
  }),
}));
