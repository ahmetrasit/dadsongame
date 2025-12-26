import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  push,
  off,
  remove,
  type Database,
  type Unsubscribe,
  type DatabaseReference
} from 'firebase/database';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp as firestoreServerTimestamp,
  type Firestore
} from 'firebase/firestore';
import type {
  LegacyPlayer as Player,
  RemotePlayer,
  LegacyFastState as FastState,
  SlowState,
  GameEvent
} from '@/types';
import { BaseMultiplayerService } from './MultiplayerService';

/**
 * Firebase configuration
 * Uses environment variables - set these in your .env file:
 * VITE_FIREBASE_API_KEY
 * VITE_FIREBASE_AUTH_DOMAIN
 * VITE_FIREBASE_PROJECT_ID
 * VITE_FIREBASE_STORAGE_BUCKET
 * VITE_FIREBASE_MESSAGING_SENDER_ID
 * VITE_FIREBASE_APP_ID
 * VITE_FIREBASE_DATABASE_URL
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ''
};

/**
 * Firebase Multiplayer Service
 *
 * Uses Firebase Realtime Database for fast state (real-time player positions, movements)
 * and Firestore for slow state persistence (saved game data).
 */
export class FirebaseMultiplayerService extends BaseMultiplayerService {
  private roomId: string | null = null;
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private rtdb: Database | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private presenceRef: DatabaseReference | null = null;
  private latencyCheckInterval: number | null = null;

  /**
   * Initialize Firebase app if not already initialized
   */
  private initializeFirebase(): void {
    if (!firebaseConfig.apiKey) {
      throw new Error(
        'Firebase configuration is missing. Please set VITE_FIREBASE_* environment variables.'
      );
    }

    // Use existing app or initialize new one
    if (getApps().length === 0) {
      this.app = initializeApp(firebaseConfig);
    } else {
      this.app = getApp();
    }

    this.db = getFirestore(this.app);
    this.rtdb = getDatabase(this.app);
  }

  async connect(roomId: string, player: Player): Promise<void> {
    console.log(`[FirebaseMP] Connecting to room: ${roomId}`);
    this.connectionState = 'connecting';
    this.roomId = roomId;

    try {
      // Initialize Firebase
      this.initializeFirebase();

      if (!this.rtdb) {
        throw new Error('Realtime Database not initialized');
      }

      this.localPlayerId = player.id;

      // Set up presence in Realtime Database
      const playerPresenceRef = ref(this.rtdb, `rooms/${roomId}/players/${player.id}`);
      this.presenceRef = playerPresenceRef;

      const playerData = {
        id: player.id,
        name: player.name,
        position: player.position,
        velocity: player.velocity,
        facing: player.facing,
        state: player.state,
        lastSeen: serverTimestamp(),
        isLocalPlayer: false // Remote players see this as false
      };

      // Set initial presence
      await set(playerPresenceRef, playerData);

      // Set up onDisconnect to remove player when they leave
      await onDisconnect(playerPresenceRef).remove();

      // Listen for other players joining/leaving
      this.setupPlayersListener(roomId, player.id);

      // Listen for fast state updates from other players
      this.setupFastStateListener(roomId, player.id);

      // Listen for game events
      this.setupEventsListener(roomId);

      // Start latency measurement
      this.startLatencyMeasurement();

      this.connectionState = 'connected';
      console.log(`[FirebaseMP] Connected as ${player.name}`);
    } catch (error) {
      console.error('[FirebaseMP] Connection failed:', error);
      this.connectionState = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log('[FirebaseMP] Disconnecting...');

    // Stop latency measurement
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }

    // Unsubscribe from all Firebase listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Remove presence from Realtime Database
    if (this.presenceRef) {
      try {
        await remove(this.presenceRef);
      } catch (error) {
        console.warn('[FirebaseMP] Error removing presence:', error);
      }
      this.presenceRef = null;
    }

    this.players.clear();
    this.connectionState = 'disconnected';
    this.localPlayerId = null;
    this.roomId = null;
    this.events.clear();
  }

  /**
   * Set up listener for players joining and leaving the room
   */
  private setupPlayersListener(roomId: string, localPlayerId: string): void {
    if (!this.rtdb) return;

    const playersRef = ref(this.rtdb, `rooms/${roomId}/players`);

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const playersData = snapshot.val();
      if (!playersData) return;

      const currentPlayerIds = new Set(this.players.keys());
      const newPlayerIds = new Set<string>();

      // Process each player from Firebase
      for (const [playerId, playerDataRaw] of Object.entries(playersData)) {
        // Skip local player
        if (playerId === localPlayerId) continue;

        const playerData = playerDataRaw as {
          id: string;
          name: string;
          position: { x: number; y: number };
          velocity: { x: number; y: number };
          facing: string;
          state: string;
          lastSeen: number;
        };

        newPlayerIds.add(playerId);

        const remotePlayer: RemotePlayer = {
          id: playerData.id,
          name: playerData.name,
          position: playerData.position,
          velocity: playerData.velocity,
          facing: playerData.facing as RemotePlayer['facing'],
          state: playerData.state as RemotePlayer['state'],
          lastUpdate: typeof playerData.lastSeen === 'number' ? playerData.lastSeen : Date.now(),
          isLocalPlayer: false
        };

        // Check if this is a new player
        if (!currentPlayerIds.has(playerId)) {
          this.players.set(playerId, remotePlayer);
          this.events.emit('playerJoin', remotePlayer);
        } else {
          // Update existing player
          this.players.set(playerId, remotePlayer);
        }
      }

      // Check for players who left
      for (const playerId of currentPlayerIds) {
        if (!newPlayerIds.has(playerId)) {
          this.players.delete(playerId);
          this.events.emit('playerLeave', playerId);
        }
      }
    });

    this.unsubscribers.push(() => off(playersRef, 'value', unsubscribe as never));
  }

  /**
   * Set up listener for fast state updates (positions, actions)
   */
  private setupFastStateListener(roomId: string, localPlayerId: string): void {
    if (!this.rtdb) return;

    const stateRef = ref(this.rtdb, `rooms/${roomId}/state`);

    const unsubscribe = onValue(stateRef, (snapshot) => {
      const stateData = snapshot.val();
      if (!stateData) return;

      const fastState: FastState = { players: {} };

      for (const [playerId, playerStateRaw] of Object.entries(stateData)) {
        // Skip local player's own state
        if (playerId === localPlayerId) continue;

        const playerState = playerStateRaw as {
          position: { x: number; y: number };
          velocity: { x: number; y: number };
          facing: string;
          state: string;
          timestamp: number;
        };

        fastState.players[playerId] = {
          position: playerState.position,
          velocity: playerState.velocity,
          facing: playerState.facing,
          state: playerState.state,
          timestamp: typeof playerState.timestamp === 'number' ? playerState.timestamp : Date.now()
        };
      }

      // Emit fast state update if there are any players
      if (Object.keys(fastState.players).length > 0) {
        this.events.emit('fastState', fastState);
      }
    });

    this.unsubscribers.push(() => off(stateRef, 'value', unsubscribe as never));
  }

  /**
   * Set up listener for game events (chat, actions, etc.)
   */
  private setupEventsListener(roomId: string): void {
    if (!this.rtdb) return;

    const eventsRef = ref(this.rtdb, `rooms/${roomId}/events`);

    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const eventsData = snapshot.val();
      if (!eventsData) return;

      // Process only new events (events created after connection)
      // In a production app, you'd track the last processed event timestamp
      for (const [, eventDataRaw] of Object.entries(eventsData)) {
        const eventData = eventDataRaw as GameEvent & { timestamp?: number };

        // Skip events from local player
        if ('playerId' in eventData && eventData.playerId === this.localPlayerId) {
          continue;
        }

        this.events.emit('event', eventData);
      }
    });

    this.unsubscribers.push(() => off(eventsRef, 'value', unsubscribe as never));
  }

  /**
   * Start measuring latency to Firebase
   */
  private startLatencyMeasurement(): void {
    if (!this.rtdb) return;

    const latencyRef = ref(this.rtdb, '.info/serverTimeOffset');

    const unsubscribe = onValue(latencyRef, (snapshot) => {
      const offset = snapshot.val() as number;
      // Server time offset gives us an approximation of latency
      // The offset is the difference between server time and local time
      // Latency is approximately |offset| / 2 (round trip time estimate)
      this.latency = Math.abs(offset) / 2;
    });

    this.unsubscribers.push(() => off(latencyRef, 'value', unsubscribe as never));
  }

  broadcastFastState(state: Partial<FastState>): void {
    if (!this.roomId || !this.localPlayerId || !this.rtdb) return;

    const stateRef = ref(this.rtdb, `rooms/${this.roomId}/state/${this.localPlayerId}`);

    // Get the local player's state from the partial fast state
    const localPlayerState = state.players?.[this.localPlayerId];

    if (localPlayerState) {
      set(stateRef, {
        ...localPlayerState,
        timestamp: serverTimestamp()
      }).catch((error) => {
        console.error('[FirebaseMP] Error broadcasting fast state:', error);
      });
    }

    // Also update presence to keep lastSeen current
    if (this.presenceRef && localPlayerState) {
      set(this.presenceRef, {
        id: this.localPlayerId,
        name: this.players.get(this.localPlayerId)?.name || 'Unknown',
        position: localPlayerState.position,
        velocity: localPlayerState.velocity,
        facing: localPlayerState.facing,
        state: localPlayerState.state,
        lastSeen: serverTimestamp(),
        isLocalPlayer: false
      }).catch((error) => {
        console.error('[FirebaseMP] Error updating presence:', error);
      });
    }
  }

  async saveSlowState(state: SlowState): Promise<void> {
    if (!this.roomId || !this.localPlayerId) {
      throw new Error('Not connected');
    }

    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    console.log('[FirebaseMP] Saving slow state to Firestore...');

    try {
      const docRef = doc(this.db, 'players', this.localPlayerId, 'saves', this.roomId);
      await setDoc(docRef, {
        ...state,
        lastSaved: firestoreServerTimestamp()
      });
      console.log('[FirebaseMP] Slow state saved');
    } catch (error) {
      console.error('[FirebaseMP] Error saving slow state:', error);
      throw error;
    }
  }

  async loadSlowState(): Promise<SlowState | null> {
    if (!this.roomId || !this.localPlayerId) {
      return null;
    }

    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    console.log('[FirebaseMP] Loading slow state from Firestore...');

    try {
      const docRef = doc(this.db, 'players', this.localPlayerId, 'saves', this.roomId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('[FirebaseMP] Slow state loaded');
        return {
          inventory: data.inventory,
          worldChanges: data.worldChanges || [],
          lastSaved: data.lastSaved?.toMillis?.() || data.lastSaved || Date.now()
        } as SlowState;
      }

      console.log('[FirebaseMP] No saved state found');
      return null;
    } catch (error) {
      console.error('[FirebaseMP] Error loading slow state:', error);
      throw error;
    }
  }

  sendEvent(event: GameEvent): void {
    if (!this.roomId || !this.rtdb) return;

    const eventsRef = ref(this.rtdb, `rooms/${this.roomId}/events`);

    push(eventsRef, {
      ...event,
      timestamp: serverTimestamp()
    }).catch((error) => {
      console.error('[FirebaseMP] Error sending event:', error);
    });

    console.log('[FirebaseMP] Event sent:', event.type);
  }
}
