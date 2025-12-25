import type {
  LegacyPlayer as Player,
  RemotePlayer,
  LegacyFastState as FastState,
  SlowState,
  GameEvent,
  ConnectionState,
  Vector2
} from '@/types';

/**
 * MultiplayerService Interface
 *
 * This abstraction allows swapping between different backends:
 * - MockMultiplayerService (local development, single player)
 * - FirebaseMultiplayerService (initial multiplayer via Firestore)
 * - ColyseusMultiplayerService (future: real-time server)
 * - PartyKitMultiplayerService (future: edge-based)
 */
export interface MultiplayerService {
  // Connection lifecycle
  connect(roomId: string, player: Player): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;

  // Fast state (positions, real-time actions) - synced frequently
  broadcastFastState(state: Partial<FastState>): void;
  onFastStateUpdate(callback: (state: FastState) => void): () => void;

  // Slow state (inventory, world saves) - synced on explicit save
  saveSlowState(state: SlowState): Promise<void>;
  loadSlowState(): Promise<SlowState | null>;

  // Game events (actions, chat, etc.)
  sendEvent(event: GameEvent): void;
  onEvent(callback: (event: GameEvent) => void): () => void;

  // Player management
  getPlayers(): Map<string, RemotePlayer>;
  getLocalPlayerId(): string | null;
  onPlayerJoin(callback: (player: RemotePlayer) => void): () => void;
  onPlayerLeave(callback: (playerId: string) => void): () => void;

  // Latency info (for interpolation/prediction)
  getLatency(): number;
}

/**
 * Event emitter helper for service implementations
 */
export type EventCallback<T> = (data: T) => void;

export class EventEmitter<T extends Record<string, unknown>> {
  private listeners: Map<keyof T, Set<EventCallback<unknown>>> = new Map();

  on<K extends keyof T>(event: K, callback: EventCallback<T[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Base class with common functionality for all implementations
 */
export abstract class BaseMultiplayerService implements MultiplayerService {
  protected connectionState: ConnectionState = 'disconnected';
  protected localPlayerId: string | null = null;
  protected players: Map<string, RemotePlayer> = new Map();
  protected latency = 0;

  protected events = new EventEmitter<{
    fastState: FastState;
    event: GameEvent;
    playerJoin: RemotePlayer;
    playerLeave: string;
  }>();

  abstract connect(roomId: string, player: Player): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract broadcastFastState(state: Partial<FastState>): void;
  abstract saveSlowState(state: SlowState): Promise<void>;
  abstract loadSlowState(): Promise<SlowState | null>;
  abstract sendEvent(event: GameEvent): void;

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getPlayers(): Map<string, RemotePlayer> {
    return this.players;
  }

  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  getLatency(): number {
    return this.latency;
  }

  onFastStateUpdate(callback: (state: FastState) => void): () => void {
    return this.events.on('fastState', callback);
  }

  onEvent(callback: (event: GameEvent) => void): () => void {
    return this.events.on('event', callback);
  }

  onPlayerJoin(callback: (player: RemotePlayer) => void): () => void {
    return this.events.on('playerJoin', callback);
  }

  onPlayerLeave(callback: (playerId: string) => void): () => void {
    return this.events.on('playerLeave', callback);
  }
}

/**
 * Helper to generate chunk keys for world state
 */
export function getChunkKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Helper to interpolate between positions based on latency
 */
export function interpolatePosition(
  current: Vector2,
  target: Vector2,
  delta: number,
  latency: number
): Vector2 {
  const lerpFactor = Math.min(1, delta / Math.max(latency, 16));
  return {
    x: current.x + (target.x - current.x) * lerpFactor,
    y: current.y + (target.y - current.y) * lerpFactor
  };
}
