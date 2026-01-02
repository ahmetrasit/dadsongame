import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseConfig } from './FirebaseMultiplayerService';
import type { PlantDefinition } from '@/stores/definitions/plantsStore';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';
import type { WaterDefinition } from '@/stores/definitions/waterStore';
import type { ProductDefinition } from '@/types/ontology';

// Constants
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const RECONNECT_DELAY_MS = 5000;

export interface GameDefinitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  resources: ResourceDefinition[];
  waters?: WaterDefinition[]; // Optional for backwards compatibility
  products?: ProductDefinition[]; // Optional for backwards compatibility
}

interface FirestoreDefinitionsDoc extends GameDefinitions {
  updatedAt: string;
}

/**
 * Validate that the data has the expected structure
 */
function validateDefinitions(data: unknown): data is GameDefinitions {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.plants)) return false;
  if (!Array.isArray(d.animals)) return false;
  if (!Array.isArray(d.resources)) return false;

  // Validate at least the first item of each array has required fields
  if (d.plants.length > 0) {
    const plant = d.plants[0] as Record<string, unknown>;
    if (typeof plant.id !== 'string' || typeof plant.name !== 'string') return false;
  }
  if (d.animals.length > 0) {
    const animal = d.animals[0] as Record<string, unknown>;
    if (typeof animal.id !== 'string' || typeof animal.name !== 'string') return false;
  }
  if (d.resources.length > 0) {
    const resource = d.resources[0] as Record<string, unknown>;
    if (typeof resource.id !== 'string' || typeof resource.name !== 'string') return false;
  }

  return true;
}

export type SyncErrorCallback = (error: string) => void;

/**
 * Firebase Definitions Service
 *
 * Handles global sync of game definitions (plants, animals, resources) to Firestore.
 * All users share the same definitions - admin edits are reflected globally.
 */
class DefinitionsService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private initialized = false;
  private lastSavedTimestamp: string | null = null;
  private pendingSaveTimestamp: string | null = null; // Track in-flight saves
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private updateCallback: ((definitions: GameDefinitions, timestamp: string) => void) | null = null;
  private errorCallback: SyncErrorCallback | null = null;

  /**
   * Initialize Firebase if not already done
   */
  private initializeFirebase(): boolean {
    if (this.initialized && this.db) return true;

    if (!firebaseConfig.apiKey) {
      console.warn('[DefinitionsService] Firebase not configured, using localStorage only');
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
      console.log('[DefinitionsService] Firebase initialized');
      return true;
    } catch (error) {
      console.error('[DefinitionsService] Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Load definitions from Firestore
   */
  async loadDefinitions(): Promise<{ definitions: GameDefinitions; timestamp: string } | null> {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    try {
      const docRef = doc(this.db, 'definitions', 'global');
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as FirestoreDefinitionsDoc;

        // Validate data structure
        if (!validateDefinitions(data)) {
          console.error('[DefinitionsService] Invalid data structure in Firebase');
          return null;
        }

        this.lastSavedTimestamp = data.updatedAt || new Date().toISOString();
        console.log('[DefinitionsService] Definitions loaded from Firebase');
        return {
          definitions: {
            plants: data.plants || [],
            animals: data.animals || [],
            resources: data.resources || [],
            waters: data.waters || [],
            products: data.products || [],
          },
          timestamp: this.lastSavedTimestamp,
        };
      }

      console.log('[DefinitionsService] No definitions in Firebase yet');
      return null;
    } catch (error) {
      console.error('[DefinitionsService] Error loading definitions:', error);
      throw error;
    }
  }

  /**
   * Save all definitions to Firestore with retry logic
   * Returns the timestamp of the save for tracking
   */
  async saveDefinitions(definitions: GameDefinitions, retries = RETRY_ATTEMPTS): Promise<string | null> {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    const timestamp = new Date().toISOString();
    this.pendingSaveTimestamp = timestamp;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const docRef = doc(this.db, 'definitions', 'global');

        // Sanitize resources to ensure no undefined values (Firebase rejects undefined)
        const sanitizedResources = (definitions.resources || []).map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          spoilageRate: r.spoilageRate,
          weight: r.weight,
          emoji: r.emoji || '📦',
          interactionTypes: r.interactionTypes || ['collect'],
          interactionRadius: r.interactionRadius ?? 24,
          isBlocking: r.isBlocking ?? false,
          ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
          ...(r.spriteVersions ? { spriteVersions: r.spriteVersions } : {}),
          ...(r.nutrition ? {
            nutrition: {
              kcalPerKg: r.nutrition.kcalPerKg ?? 100,
              vitamins: r.nutrition.vitamins || [],
              protein: r.nutrition.protein ?? 25,
              carbs: r.nutrition.carbs ?? 25,
              goodFat: r.nutrition.goodFat ?? 25,
              badFat: r.nutrition.badFat ?? 25,
            }
          } : {}),
        }));

        await setDoc(docRef, {
          plants: definitions.plants,
          animals: definitions.animals,
          resources: sanitizedResources,
          waters: definitions.waters || [],
          products: definitions.products || [],
          updatedAt: timestamp,
        }, { merge: true });

        this.lastSavedTimestamp = timestamp;
        this.pendingSaveTimestamp = null;
        console.log('[DefinitionsService] Definitions saved to Firebase');
        return timestamp;
      } catch (error) {
        console.error(`[DefinitionsService] Save attempt ${attempt}/${retries} failed:`, error);

        if (attempt === retries) {
          this.pendingSaveTimestamp = null;
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * RETRY_BASE_DELAY_MS));
      }
    }

    this.pendingSaveTimestamp = null;
    return null;
  }

  /**
   * Check if a timestamp represents our own save (to prevent sync loops)
   */
  private isOwnSave(remoteTimestamp: string): boolean {
    return remoteTimestamp === this.lastSavedTimestamp ||
           remoteTimestamp === this.pendingSaveTimestamp;
  }

  /**
   * Subscribe to real-time updates from Firestore
   * Returns unsubscribe function
   */
  subscribeToUpdates(
    callback: (definitions: GameDefinitions, timestamp: string) => void,
    onError?: SyncErrorCallback
  ): Unsubscribe | null {
    if (!this.initializeFirebase() || !this.db) {
      return null;
    }

    // Store callbacks for reconnection
    this.updateCallback = callback;
    this.errorCallback = onError || null;

    // Unsubscribe from previous listener if exists
    this.cleanupSubscription();

    return this.createSubscription();
  }

  /**
   * Create the Firestore subscription
   */
  private createSubscription(): Unsubscribe | null {
    if (!this.db) return null;

    const docRef = doc(this.db, 'definitions', 'global');

    this.unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FirestoreDefinitionsDoc;
          const remoteTimestamp = data.updatedAt || '';

          // Skip if this is our own save (prevents sync loop)
          if (this.isOwnSave(remoteTimestamp)) {
            console.log('[DefinitionsService] Skipping snapshot - own save');
            return;
          }

          // Skip if we've already processed this timestamp
          if (remoteTimestamp === this.lastSavedTimestamp) {
            return;
          }

          if (!validateDefinitions(data)) {
            console.error('[DefinitionsService] Invalid data in snapshot, ignoring');
            return;
          }

          console.log('[DefinitionsService] Received remote update');
          this.lastSavedTimestamp = remoteTimestamp;

          if (this.updateCallback) {
            this.updateCallback({
              plants: data.plants || [],
              animals: data.animals || [],
              resources: data.resources || [],
              waters: data.waters || [],
              products: data.products || [],
            }, remoteTimestamp);
          }
        }
      },
      (error) => {
        console.error('[DefinitionsService] Snapshot error:', error);
        if (this.errorCallback) {
          this.errorCallback(error.message || 'Connection lost');
        }
        // Attempt to reconnect
        this.scheduleReconnect();
      }
    );

    return this.unsubscribe;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('[DefinitionsService] Attempting to reconnect...');
      this.cleanupSubscription();

      if (this.updateCallback) {
        this.createSubscription();
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
   * Full cleanup - call on app unmount
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.cleanupSubscription();
    this.updateCallback = null;
    this.errorCallback = null;
    this.lastSavedTimestamp = null;
    this.pendingSaveTimestamp = null;
  }
}

// Singleton instance
export const definitionsService = new DefinitionsService();
