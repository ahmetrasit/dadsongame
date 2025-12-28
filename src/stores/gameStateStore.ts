import { create } from 'zustand';

export type GameScreen = 'menu' | 'game' | 'mapEditor' | 'materialEditor' | 'creatureEditor' | 'spriteEditor';

interface GameStateStore {
  currentScreen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  startGame: () => void;
  returnToMenu: () => void;
}

export const useGameStateStore = create<GameStateStore>((set) => ({
  currentScreen: 'menu',

  setScreen: (screen) => set({ currentScreen: screen }),

  startGame: () => set({ currentScreen: 'game' }),

  returnToMenu: () => set({ currentScreen: 'menu' }),
}));
