import type { LegacyPlayer as Player, RemotePlayer, LegacyFastState as FastState, SlowState, GameEvent } from '@/types';
import { BaseMultiplayerService } from './MultiplayerService';

/**
 * Mock Multiplayer Service
 *
 * Simulates a second player for local development and testing.
 * No network calls - everything runs locally.
 */
export class MockMultiplayerService extends BaseMultiplayerService {
  private mockPlayerInterval: number | null = null;
  private savedSlowState: SlowState | null = null;

  async connect(roomId: string, player: Player): Promise<void> {
    console.log(`[MockMP] Connecting to room: ${roomId}`);
    this.connectionState = 'connecting';

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));

    this.connectionState = 'connected';
    this.localPlayerId = player.id;
    this.latency = 50; // Fake 50ms latency

    // Create a fake second player that wanders around
    this.spawnMockPlayer();

    console.log(`[MockMP] Connected as ${player.name}`);
  }

  async disconnect(): Promise<void> {
    console.log('[MockMP] Disconnecting...');

    if (this.mockPlayerInterval) {
      clearInterval(this.mockPlayerInterval);
      this.mockPlayerInterval = null;
    }

    this.players.clear();
    this.connectionState = 'disconnected';
    this.localPlayerId = null;
    this.events.clear();
  }

  broadcastFastState(state: Partial<FastState>): void {
    // In mock mode, we just log it - no actual broadcasting
    // In a real implementation, this would send to the server
    console.log('[MockMP] Broadcasting fast state:', Object.keys(state));
  }

  async saveSlowState(state: SlowState): Promise<void> {
    console.log('[MockMP] Saving slow state...');
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 200));
    this.savedSlowState = { ...state, lastSaved: Date.now() };
    console.log('[MockMP] Slow state saved');
  }

  async loadSlowState(): Promise<SlowState | null> {
    console.log('[MockMP] Loading slow state...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.savedSlowState;
  }

  sendEvent(event: GameEvent): void {
    console.log('[MockMP] Event sent:', event.type);
    // Echo events back for testing
    this.events.emit('event', event);
  }

  /**
   * Creates a fake player that moves around randomly
   * This demonstrates how remote players will appear
   */
  private spawnMockPlayer(): void {
    const mockPlayer: RemotePlayer = {
      id: 'mock-player-2',
      name: 'Son (AI)',
      position: { x: 200, y: 200 },
      velocity: { x: 0, y: 0 },
      facing: 'right',
      state: 'idle',
      lastUpdate: Date.now(),
      isLocalPlayer: false
    };

    this.players.set(mockPlayer.id, mockPlayer);
    this.events.emit('playerJoin', mockPlayer);

    // Move the mock player around randomly
    let targetX = mockPlayer.position.x;
    let targetY = mockPlayer.position.y;
    let moveTimer = 0;

    this.mockPlayerInterval = window.setInterval(() => {
      const player = this.players.get(mockPlayer.id);
      if (!player) return;

      moveTimer += 100;

      // Pick new target every 2-4 seconds
      if (moveTimer > 2000 + Math.random() * 2000) {
        targetX = 100 + Math.random() * 400;
        targetY = 100 + Math.random() * 300;
        moveTimer = 0;
      }

      // Move towards target
      const dx = targetX - player.position.x;
      const dy = targetY - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const speed = 2;
        player.velocity.x = (dx / dist) * speed;
        player.velocity.y = (dy / dist) * speed;
        player.position.x += player.velocity.x;
        player.position.y += player.velocity.y;
        player.state = 'walking';

        // Update facing direction
        if (Math.abs(dx) > Math.abs(dy)) {
          player.facing = dx > 0 ? 'right' : 'left';
        } else {
          player.facing = dy > 0 ? 'down' : 'up';
        }
      } else {
        player.velocity.x = 0;
        player.velocity.y = 0;
        player.state = 'idle';
      }

      player.lastUpdate = Date.now();

      // Emit fast state update
      this.events.emit('fastState', {
        players: {
          [player.id]: {
            position: player.position,
            velocity: player.velocity,
            facing: player.facing,
            state: player.state,
            timestamp: player.lastUpdate
          }
        }
      });
    }, 100);
  }
}
