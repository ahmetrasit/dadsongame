import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseConfig } from './FirebaseMultiplayerService';
import type { MapData } from '@/stores/mapEditorStore';

// Constants
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const RECONNECT_DELAY_MS = 5000;

export interface SavedMapInfo {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface FirestoreMapDoc {
  name: string;
  mapData: MapData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validate that the data has the expected structure
 */
function validateMapData(data: unknown): data is MapData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // Check required arrays exist
  if (!Array.isArray(d.rivers)) return false;
  if (!Array.isArray(d.plants)) return false;
  if (!Array.isArray(d.animals)) return false;
  if (!Array.isArray(d.waters)) return false;

  // Check spawn point exists
  if (!d.spawn || typeof d.spawn !== 'object') return false;
  const spawn = d.spawn as Record<string, unknown>;
  if (typeof spawn.x !== 'number' || typeof spawn.y !== 'number') return false;

  return true;
}

export type SyncErrorCallback = (error: string) => void;

/**
 * Firebase Map Service
 *
 * Handles saving and loading multiple maps to/from Firestore.
 * Each map has a unique ID and a user-defined name.
 */
class MapService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private initialized = false;
  private currentMapId: string | null = null;
  private currentMapCreatedAt: string | null = null; // Cache createdAt to avoid extra reads
  private lastSavedTimestamp: string | null = null;
  private pendingSaveTimestamp: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private updateCallback: ((mapData: MapData, timestamp: string) => void) | null = null;
  private errorCallback: SyncErrorCallback | null = null;

  /**
   * Initialize Firebase if not already done
   */
  private initializeFirebase(): boolean {
    if (this.initialized && this.db) return true;

    if (!firebaseConfig.apiKey) {
      console.warn('[MapService] Firebase not configured, using localStorage only');
      return false;
    }

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApp();
      }
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log('[MapService] Firebase initialized');
      return true;
    } catch (error) {
      console.error('[MapService] Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Generate a unique map ID
   */
  private generateMapId(): string {
    return `map-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * List all saved maps
   */
  async listMaps(): Promise<SavedMapInfo[]> {
    if (!this.initializeFirebase() || !this.db) {
      return [];
    }

    try {
      const mapsRef = collection(this.db, 'maps');
      const q = query(mapsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const maps: SavedMapInfo[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreMapDoc;
        maps.push({
          id: doc.id,
          name: data.name || 'Untitled Map',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
      });

      console.log(`[MapService] Found ${maps.length} saved maps`);
      return maps;
    } catch (error) {
      console.error('[MapService] Error listing maps:', error);
      return [];
    }
  }

  /**
   * Load a specific map by ID
   */
  async loadMap(mapId: string): Promise<{ name: string; mapData: MapData; timestamp: string } | null> {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    try {
      const docRef = doc(this.db, 'maps', mapId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as FirestoreMapDoc;

        if (!validateMapData(data.mapData)) {
          console.error('[MapService] Invalid map data structure');
          return null;
        }

        this.currentMapId = mapId;
        this.currentMapCreatedAt = data.createdAt || new Date().toISOString(); // Cache for saves
        this.lastSavedTimestamp = data.updatedAt || new Date().toISOString();
        console.log(`[MapService] Loaded map: ${data.name}`);

        return {
          name: data.name || 'Untitled Map',
          mapData: {
            rivers: data.mapData.rivers || [],
            plants: data.mapData.plants || [],
            animals: data.mapData.animals || [],
            waters: data.mapData.waters || [],
            spawn: data.mapData.spawn || { x: 160, y: 320 },
          },
          timestamp: this.lastSavedTimestamp,
        };
      }

      console.log('[MapService] Map not found:', mapId);
      return null;
    } catch (error) {
      console.error('[MapService] Error loading map:', error);
      throw error;
    }
  }

  /**
   * Save a map (create new or update existing)
   */
  async saveMap(
    mapId: string | null,
    name: string,
    mapData: MapData,
    retries = RETRY_ATTEMPTS
  ): Promise<{ id: string; timestamp: string } | null> {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    const id = mapId || this.generateMapId();
    const timestamp = new Date().toISOString();
    const isNew = !mapId;
    this.pendingSaveTimestamp = timestamp;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const docRef = doc(this.db, 'maps', id);

        // Use cached createdAt if available for the current map, otherwise fetch
        let createdAt = timestamp;
        if (!isNew) {
          if (id === this.currentMapId && this.currentMapCreatedAt) {
            createdAt = this.currentMapCreatedAt;
          } else {
            createdAt = (await this.getCreatedAt(id)) || timestamp;
          }
        }

        const docData: FirestoreMapDoc = {
          name: name || 'Untitled Map',
          mapData: {
            rivers: mapData.rivers,
            plants: mapData.plants,
            animals: mapData.animals,
            waters: mapData.waters,
            spawn: mapData.spawn,
          },
          createdAt,
          updatedAt: timestamp,
        };

        await setDoc(docRef, docData);

        this.currentMapId = id;
        this.currentMapCreatedAt = createdAt; // Cache for future saves
        this.lastSavedTimestamp = timestamp;
        this.pendingSaveTimestamp = null;
        console.log(`[MapService] Map saved: ${name} (${id})`);
        return { id, timestamp };
      } catch (error) {
        console.error(`[MapService] Save attempt ${attempt}/${retries} failed:`, error);

        if (attempt === retries) {
          this.pendingSaveTimestamp = null;
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * RETRY_BASE_DELAY_MS));
      }
    }

    this.pendingSaveTimestamp = null;
    return null;
  }

  /**
   * Get the createdAt timestamp for an existing map
   */
  private async getCreatedAt(mapId: string): Promise<string | null> {
    if (!this.db) return null;

    try {
      const docRef = doc(this.db, 'maps', mapId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as FirestoreMapDoc;
        return data.createdAt || null;
      }
    } catch {
      // Ignore errors, will use current timestamp
    }
    return null;
  }

  /**
   * Delete a map
   */
  async deleteMap(mapId: string): Promise<boolean> {
    if (!this.initializeFirebase() || !this.db) {
      return false;
    }

    try {
      const docRef = doc(this.db, 'maps', mapId);
      await deleteDoc(docRef);
      console.log(`[MapService] Map deleted: ${mapId}`);

      if (this.currentMapId === mapId) {
        this.currentMapId = null;
      }
      return true;
    } catch (error) {
      console.error('[MapService] Error deleting map:', error);
      return false;
    }
  }

  /**
   * Get current map ID
   */
  getCurrentMapId(): string | null {
    return this.currentMapId;
  }

  /**
   * Set current map ID (for tracking)
   */
  setCurrentMapId(mapId: string | null): void {
    this.currentMapId = mapId;
  }

  /**
   * Check if a timestamp represents our own save
   */
  private isOwnSave(remoteTimestamp: string): boolean {
    return remoteTimestamp === this.lastSavedTimestamp ||
           remoteTimestamp === this.pendingSaveTimestamp;
  }

  /**
   * Subscribe to real-time updates for a specific map
   */
  subscribeToUpdates(
    mapId: string,
    callback: (mapData: MapData, timestamp: string) => void,
    onError?: SyncErrorCallback
  ): Unsubscribe | null {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    this.currentMapId = mapId;
    this.updateCallback = callback;
    this.errorCallback = onError || null;

    this.cleanupSubscription();

    return this.createSubscription(mapId);
  }

  /**
   * Create the Firestore subscription for a specific map
   */
  private createSubscription(mapId: string): Unsubscribe | null {
    if (!this.db) return null;

    const docRef = doc(this.db, 'maps', mapId);

    this.unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FirestoreMapDoc;
          const remoteTimestamp = data.updatedAt || '';

          if (this.isOwnSave(remoteTimestamp)) {
            console.log('[MapService] Skipping snapshot - own save');
            return;
          }

          if (remoteTimestamp === this.lastSavedTimestamp) {
            return;
          }

          if (!validateMapData(data.mapData)) {
            console.error('[MapService] Invalid data in snapshot, ignoring');
            return;
          }

          console.log('[MapService] Received remote update');
          this.lastSavedTimestamp = remoteTimestamp;

          if (this.updateCallback) {
            this.updateCallback({
              rivers: data.mapData.rivers || [],
              plants: data.mapData.plants || [],
              animals: data.mapData.animals || [],
              waters: data.mapData.waters || [],
              spawn: data.mapData.spawn || { x: 160, y: 320 },
            }, remoteTimestamp);
          }
        }
      },
      (error) => {
        console.error('[MapService] Snapshot error:', error);
        if (this.errorCallback) {
          this.errorCallback(error.message || 'Connection lost');
        }
        this.scheduleReconnect(mapId);
      }
    );

    return this.unsubscribe;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(mapId: string): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('[MapService] Attempting to reconnect...');
      this.cleanupSubscription();

      if (this.updateCallback) {
        this.createSubscription(mapId);
      }
    }, RECONNECT_DELAY_MS);
  }

  /**
   * Cleanup subscription without clearing callbacks
   */
  private cleanupSubscription(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get last saved timestamp
   */
  getLastTimestamp(): string | null {
    return this.lastSavedTimestamp;
  }

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return this.initializeFirebase();
  }

  /**
   * Full cleanup
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.cleanupSubscription();
    this.updateCallback = null;
    this.errorCallback = null;
    this.currentMapId = null;
    this.currentMapCreatedAt = null;
    this.lastSavedTimestamp = null;
    this.pendingSaveTimestamp = null;
  }
}

// Singleton instance
export const mapService = new MapService();
