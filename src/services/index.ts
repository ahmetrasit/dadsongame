export type { MultiplayerService } from './MultiplayerService';
export { BaseMultiplayerService, EventEmitter, getChunkKey, interpolatePosition } from './MultiplayerService';
export { MockMultiplayerService } from './MockMultiplayerService';
export { FirebaseMultiplayerService, firebaseConfig } from './FirebaseMultiplayerService';
export { definitionsService } from './DefinitionsService';

import type { MultiplayerService } from './MultiplayerService';
import { MockMultiplayerService } from './MockMultiplayerService';
import { FirebaseMultiplayerService } from './FirebaseMultiplayerService';

export type MultiplayerBackend = 'mock' | 'firebase' | 'colyseus' | 'partykit';

/**
 * Factory function to create the appropriate multiplayer service
 * This is where we swap implementations without touching game code
 */
export function createMultiplayerService(backend: MultiplayerBackend): MultiplayerService {
  switch (backend) {
    case 'mock':
      return new MockMultiplayerService();
    case 'firebase':
      return new FirebaseMultiplayerService();
    case 'colyseus':
      // TODO: return new ColyseusMultiplayerService();
      console.warn('Colyseus backend not implemented, falling back to mock');
      return new MockMultiplayerService();
    case 'partykit':
      // TODO: return new PartyKitMultiplayerService();
      console.warn('PartyKit backend not implemented, falling back to mock');
      return new MockMultiplayerService();
    default:
      return new MockMultiplayerService();
  }
}

// Singleton instance - can be swapped at runtime if needed
let multiplayerServiceInstance: MultiplayerService | null = null;

export function getMultiplayerService(): MultiplayerService {
  if (!multiplayerServiceInstance) {
    // Default to mock for development
    const backend = (import.meta.env.VITE_MULTIPLAYER_BACKEND as MultiplayerBackend) || 'mock';
    multiplayerServiceInstance = createMultiplayerService(backend);
  }
  return multiplayerServiceInstance;
}

export function setMultiplayerService(service: MultiplayerService): void {
  multiplayerServiceInstance = service;
}
