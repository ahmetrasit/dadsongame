// ==========================================
// Multiplayer Types
// ==========================================

import type { Vector2, Direction } from './core';
import type { Inventory } from './tools';
import type { HumanState, Player } from './humans';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  sharedInventory: Inventory;
}

export interface MultiplayerState {
  connectionState: ConnectionState;
  roomId: string | null;
  localPlayerId: string | null;
  team: Team | null;
  remotePlayers: Map<string, Player>;
  latency: number;
}

// Fast state = synced frequently (positions, actions)
export interface FastState {
  players: Record<string, {
    position: Vector2;
    velocity: Vector2;
    facing: Direction;
    state: HumanState;
    timestamp: number;
  }>;
}

// Slow state = persisted (inventory, world changes)
export interface SlowState {
  inventory: Inventory;
  worldChanges: WorldChange[];
  lastSaved: number;
}

export interface WorldChange {
  islandId: string;
  chunkKey: string;
  tileX: number;
  tileY: number;
  newTileId: number;
  timestamp: number;
}
