// ==========================================
// Legacy Types (for scaffolded placeholder code)
// TODO: Remove after implementing proper game systems
// ==========================================

import type { Vector2 } from './core';

export interface LocalPlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
  isLocalPlayer: true;
}

export interface RemotePlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
  lastUpdate: number;
  isLocalPlayer: false;
}

export interface LegacyInventorySlot {
  itemId: string | null;
  quantity: number;
}

export interface LegacyInventory {
  slots: LegacyInventorySlot[];
  maxSlots: number;
  selectedSlot: number;
}

// Simple player type for multiplayer service connection
export interface LegacyPlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
}

// Legacy FastState for placeholder multiplayer
export interface LegacyFastState {
  players: Record<string, {
    position: Vector2;
    velocity: Vector2;
    facing: string;
    state: string;
    timestamp: number;
  }>;
}
