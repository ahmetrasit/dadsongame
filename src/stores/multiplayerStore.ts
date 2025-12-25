import { create } from 'zustand';
import type { RemotePlayer, ConnectionState, LegacyFastState as FastState, GameEvent } from '@/types';
import type { MultiplayerService } from '@/services';
import { getMultiplayerService } from '@/services';

interface MultiplayerState {
  // Connection state
  connectionState: ConnectionState;
  roomId: string | null;
  localPlayerId: string | null;
  latency: number;

  // Remote players
  remotePlayers: Map<string, RemotePlayer>;

  // Service reference
  service: MultiplayerService | null;

  // Actions
  connect: (roomId: string, playerName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  broadcastPosition: (x: number, y: number, vx: number, vy: number, facing: string, state: string) => void;
  sendChatMessage: (message: string) => void;
  getRemotePlayer: (id: string) => RemotePlayer | undefined;

  // Internal actions (called by service callbacks)
  _setConnectionState: (state: ConnectionState) => void;
  _updateRemotePlayer: (player: RemotePlayer) => void;
  _removeRemotePlayer: (playerId: string) => void;
  _handleFastState: (state: FastState) => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  connectionState: 'disconnected',
  roomId: null,
  localPlayerId: null,
  latency: 0,
  remotePlayers: new Map(),
  service: null,

  connect: async (roomId, playerName) => {
    const service = getMultiplayerService();
    set({ service, connectionState: 'connecting' });

    // Create player object for connection
    const player = {
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: playerName,
      position: { x: 300, y: 300 },
      velocity: { x: 0, y: 0 },
      facing: 'down' as const,
      state: 'idle' as const
    };

    try {
      // Set up event listeners before connecting
      service.onPlayerJoin((remotePlayer) => {
        get()._updateRemotePlayer(remotePlayer);
      });

      service.onPlayerLeave((playerId) => {
        get()._removeRemotePlayer(playerId);
      });

      service.onFastStateUpdate((state) => {
        get()._handleFastState(state);
      });

      await service.connect(roomId, player);

      set({
        connectionState: 'connected',
        roomId,
        localPlayerId: player.id,
        latency: service.getLatency()
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      set({ connectionState: 'error' });
    }
  },

  disconnect: async () => {
    const { service } = get();
    if (service) {
      await service.disconnect();
    }
    set({
      connectionState: 'disconnected',
      roomId: null,
      localPlayerId: null,
      remotePlayers: new Map(),
      service: null
    });
  },

  broadcastPosition: (x, y, vx, vy, facing, state) => {
    const { service, localPlayerId } = get();
    if (!service || !localPlayerId) return;

    service.broadcastFastState({
      players: {
        [localPlayerId]: {
          position: { x, y },
          velocity: { x: vx, y: vy },
          facing,
          state,
          timestamp: Date.now()
        }
      }
    });
  },

  sendChatMessage: (message) => {
    const { service, localPlayerId } = get();
    if (!service || !localPlayerId) return;

    const event: GameEvent = {
      type: 'chat_message',
      playerId: localPlayerId,
      message
    };
    service.sendEvent(event);
  },

  getRemotePlayer: (id) => {
    return get().remotePlayers.get(id);
  },

  // Internal actions
  _setConnectionState: (connectionState) => {
    set({ connectionState });
  },

  _updateRemotePlayer: (player) => {
    set((state) => {
      const newPlayers = new Map(state.remotePlayers);
      newPlayers.set(player.id, player);
      return { remotePlayers: newPlayers };
    });
  },

  _removeRemotePlayer: (playerId) => {
    set((state) => {
      const newPlayers = new Map(state.remotePlayers);
      newPlayers.delete(playerId);
      return { remotePlayers: newPlayers };
    });
  },

  _handleFastState: (fastState) => {
    const { localPlayerId } = get();

    set((state) => {
      const newPlayers = new Map(state.remotePlayers);

      for (const [playerId, playerState] of Object.entries(fastState.players)) {
        // Skip local player
        if (playerId === localPlayerId) continue;

        const existing = newPlayers.get(playerId);
        if (existing) {
          newPlayers.set(playerId, {
            ...existing,
            position: playerState.position,
            velocity: playerState.velocity,
            facing: playerState.facing as RemotePlayer['facing'],
            state: playerState.state as RemotePlayer['state'],
            lastUpdate: playerState.timestamp
          });
        }
      }

      return { remotePlayers: newPlayers };
    });
  }
}));

// Selectors
export const useConnectionState = () => useMultiplayerStore((s) => s.connectionState);
export const useRemotePlayers = () => useMultiplayerStore((s) => s.remotePlayers);
export const useLatency = () => useMultiplayerStore((s) => s.latency);
