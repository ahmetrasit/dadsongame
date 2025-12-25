import { create } from 'zustand';
import type { LocalPlayer, Vector2 } from '@/types';

interface PlayerState {
  player: LocalPlayer | null;
  isInitialized: boolean;

  // Actions
  initPlayer: (name: string) => void;
  setPosition: (position: Vector2) => void;
  setVelocity: (velocity: Vector2) => void;
  setFacing: (facing: LocalPlayer['facing']) => void;
  setState: (state: LocalPlayer['state']) => void;
  updatePlayer: (updates: Partial<LocalPlayer>) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: null,
  isInitialized: false,

  initPlayer: (name: string) => {
    const player: LocalPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      position: { x: 300, y: 300 },
      velocity: { x: 0, y: 0 },
      facing: 'down',
      state: 'idle',
      isLocalPlayer: true
    };
    set({ player, isInitialized: true });
  },

  setPosition: (position) =>
    set((state) => ({
      player: state.player ? { ...state.player, position } : null
    })),

  setVelocity: (velocity) =>
    set((state) => ({
      player: state.player ? { ...state.player, velocity } : null
    })),

  setFacing: (facing) =>
    set((state) => ({
      player: state.player ? { ...state.player, facing } : null
    })),

  setState: (playerState) =>
    set((state) => ({
      player: state.player ? { ...state.player, state: playerState } : null
    })),

  updatePlayer: (updates) =>
    set((state) => ({
      player: state.player ? { ...state.player, ...updates } : null
    }))
}));

// Selector hooks for performance (only re-render when specific values change)
export const usePlayerPosition = () => usePlayerStore((state) => state.player?.position);
export const usePlayerFacing = () => usePlayerStore((state) => state.player?.facing);
export const usePlayerState = () => usePlayerStore((state) => state.player?.state);
