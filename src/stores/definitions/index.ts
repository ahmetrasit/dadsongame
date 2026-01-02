import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { definitionsService, type GameDefinitions } from '@/services/DefinitionsService';

// Re-export types from entity stores
export type { PlantDefinition, PlantStage, SoilType, PlantSubCategory } from './plantsStore';
export type { AnimalDefinition, AnimalCapability, AnimalSubCategory } from './animalsStore';
export type { ResourceDefinition, ResourceInteractionType } from './resourcesStore';
export type { WaterDefinition, WaterType, WaterInteractionType, FishType } from './waterStore';
export type { ProductSlice } from './productsStore';
// ProductDefinition is exported from @/types/ontology

// Re-export GameDefinitions from service (single source of truth)
export type { GameDefinitions } from '@/services/DefinitionsService';

// Shared types
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// Yield interaction types - how player collects the yield
export type PlantYieldInteraction = 'pick' | 'harvest' | 'collect';
export type AnimalYieldInteraction = 'milk' | 'shear' | 'gather' | 'collect';

// Need interaction types - how player cares for the creature
export type PlantNeedInteraction = 'water' | 'fertilize';
export type AnimalNeedInteraction = 'feed' | 'water' | 'pet' | 'lead' | 'tame';

export interface AliveYield {
  resourceId: string;
  amount: number;
  interval: number;              // Days (not used for timing, just for reference)
  seasons: Season[];
  shedding: boolean;             // true = auto-drops at season end, false = must collect or lose
  interactionType?: PlantYieldInteraction | AnimalYieldInteraction;  // How to collect this yield
  yieldLayerImageUrl?: string;   // Overlay sprite shown when yield is available
}

export interface DeadYield {
  resourceId: string;
  quantity: number;
}

// Import slices
import { PlantSlice, createPlantSlice, initialPlants } from './plantsStore';
import { AnimalSlice, createAnimalSlice, initialAnimals } from './animalsStore';
import { ResourceSlice, createResourceSlice, initialResources } from './resourcesStore';
import { WaterSlice, createWaterSlice, initialWaters } from './waterStore';
import { ProductSlice, createProductSlice, initialProducts } from './productsStore';

// Shared UI state
type EditorTab = 'plants' | 'animals' | 'resources' | 'waters' | 'products';

interface SharedSlice {
  isEditorOpen: boolean;
  activeTab: EditorTab;
  selectedId: string | null;
  firebaseSyncEnabled: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncTime: string | null;

  // UI actions
  openEditor: (tab?: EditorTab) => void;
  closeEditor: () => void;
  toggleEditor: () => void;
  setActiveTab: (tab: EditorTab) => void;
  selectItem: (id: string | null) => void;

  // Import/Export
  exportDefinitions: () => string;
  importDefinitions: (json: string) => boolean;

  // Firebase sync
  initFromFirebase: () => Promise<void>;
  syncToFirebase: () => Promise<void>;
  clearSyncError: () => void;
  disconnectFirebase: () => void;

  // Computed getter for definitions
  getDefinitions: () => GameDefinitions;
}

// Combined state type
type DefinitionsState = SharedSlice & PlantSlice & AnimalSlice & ResourceSlice & WaterSlice & ProductSlice;

// Initial definitions for backward compatibility reference (used in tests)
export const initialDefinitions = {
  plants: initialPlants,
  animals: initialAnimals,
  resources: initialResources,
  waters: initialWaters,
  products: initialProducts,
};

// Debounce constants
const SYNC_DEBOUNCE_MS = 500;

export const useDefinitionsStore = create<DefinitionsState>()(
  subscribeWithSelector(
    persist(
      (set, get, api) => ({
        // Shared UI state
        isEditorOpen: false,
        activeTab: 'plants' as const,
        selectedId: null,
        firebaseSyncEnabled: false,
        isSyncing: false,
        syncError: null as string | null,
        lastSyncTime: null as string | null,

        // UI Actions
        openEditor: (tab) => set({
          isEditorOpen: true,
          activeTab: tab || 'plants',
          selectedId: null,
          draftPlant: null,
          draftAnimal: null,
          draftResource: null,
          draftWater: null,
          draftProduct: null,
        }),

        closeEditor: () => set({
          isEditorOpen: false,
          selectedId: null,
          draftPlant: null,
          draftAnimal: null,
          draftResource: null,
          draftWater: null,
          draftProduct: null,
        }),

        toggleEditor: () => set((s) => ({
          isEditorOpen: !s.isEditorOpen,
          selectedId: null,
          draftPlant: null,
          draftAnimal: null,
          draftResource: null,
          draftWater: null,
          draftProduct: null,
        })),

        setActiveTab: (tab) => set({
          activeTab: tab,
          selectedId: null,
          draftPlant: null,
          draftAnimal: null,
          draftResource: null,
          draftWater: null,
          draftProduct: null,
        }),

        selectItem: (id) => set({
          selectedId: id,
          draftPlant: null,
          draftAnimal: null,
          draftResource: null,
          draftWater: null,
          draftProduct: null,
        }),

        // Computed getter for definitions
        getDefinitions: () => {
          const state = get();
          return {
            plants: state.plants,
            animals: state.animals,
            resources: state.resources,
            waters: state.waters,
            products: state.products,
          };
        },

        // Import/Export
        exportDefinitions: () => {
          const state = get();
          return JSON.stringify({
            plants: state.plants,
            animals: state.animals,
            resources: state.resources,
            waters: state.waters,
            products: state.products,
          }, null, 2);
        },

        importDefinitions: (json) => {
          try {
            const data = JSON.parse(json);

            // Validate structure
            if (!Array.isArray(data.plants) || !Array.isArray(data.animals) || !Array.isArray(data.resources)) {
              console.error('Invalid import format: missing plants, animals, or resources arrays');
              set({ syncError: 'Invalid import format' });
              return false;
            }

            set({
              plants: data.plants,
              animals: data.animals,
              resources: data.resources,
              waters: data.waters || get().waters, // Optional for backwards compatibility
              products: data.products || get().products, // Optional for backwards compatibility
              syncError: null,
            });

            // Only sync if Firebase is enabled
            if (get().firebaseSyncEnabled) {
              get().syncToFirebase();
            }
            return true;
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to parse JSON';
            console.error('Failed to import definitions:', e);
            set({ syncError: message });
            return false;
          }
        },

        // Firebase sync
        initFromFirebase: async () => {
          if (!definitionsService.isAvailable()) {
            console.log('[DefinitionsStore] Firebase not available, using localStorage');
            return;
          }

          set({ isSyncing: true, syncError: null });
          try {
            const result = await definitionsService.loadDefinitions();
            if (result) {
              set({
                plants: result.definitions.plants,
                animals: result.definitions.animals,
                resources: result.definitions.resources,
                waters: result.definitions.waters || get().waters, // Optional for backwards compatibility
                products: result.definitions.products || get().products, // Optional for backwards compatibility
                firebaseSyncEnabled: true,
                lastSyncTime: result.timestamp,
              });
              console.log('[DefinitionsStore] Loaded definitions from Firebase');
            } else {
              // No data in Firebase yet - upload current local data
              const state = get();
              const timestamp = await definitionsService.saveDefinitions({
                plants: state.plants,
                animals: state.animals,
                resources: state.resources,
                waters: state.waters,
                products: state.products,
              });
              set({
                firebaseSyncEnabled: true,
                lastSyncTime: timestamp || new Date().toISOString()
              });
              console.log('[DefinitionsStore] Uploaded local definitions to Firebase');
            }

            // Subscribe to real-time updates from other users
            definitionsService.subscribeToUpdates(
              (definitions, timestamp) => {
                console.log('[DefinitionsStore] Applying remote update');
                // Update lastSyncedData to prevent re-sync loop
                const remoteData = JSON.stringify({
                  plants: definitions.plants,
                  animals: definitions.animals,
                  resources: definitions.resources,
                  waters: definitions.waters || get().waters,
                  products: definitions.products || get().products,
                });
                // This is set in the module scope - we need to export a setter
                updateLastSyncedData(remoteData);

                // Directly set state - service already filters our own saves
                set({
                  plants: definitions.plants,
                  animals: definitions.animals,
                  resources: definitions.resources,
                  waters: definitions.waters || get().waters,
                  products: definitions.products || get().products,
                  lastSyncTime: timestamp,
                });
              },
              (error) => {
                // Handle connection errors
                set({ syncError: error });
              }
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Firebase sync failed';
            console.error('[DefinitionsStore] Firebase init failed:', error);
            set({ syncError: message });
          } finally {
            set({ isSyncing: false });
          }
        },

        syncToFirebase: async () => {
          if (!get().firebaseSyncEnabled) return;

          set({ isSyncing: true, syncError: null });
          try {
            const state = get();
            const timestamp = await definitionsService.saveDefinitions({
              plants: state.plants,
              animals: state.animals,
              resources: state.resources,
              waters: state.waters,
              products: state.products,
            });
            if (timestamp) {
              set({ lastSyncTime: timestamp });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save to Firebase';
            console.error('[DefinitionsStore] Firebase sync failed:', error);
            set({ syncError: message });
          } finally {
            set({ isSyncing: false });
          }
        },

        clearSyncError: () => set({ syncError: null }),

        disconnectFirebase: () => {
          definitionsService.disconnect();
          set({ firebaseSyncEnabled: false });
        },

        // Spread in entity slices
        ...createPlantSlice(set, get, api),
        ...createAnimalSlice(set, get, api),
        ...createResourceSlice(set, get, api),
        ...createWaterSlice(set, get, api),
        ...createProductSlice(set, get, api),
      }),
      {
        name: 'game-definitions',
        // Only persist the data, not UI state
        partialize: (state) => ({
          plants: state.plants,
          animals: state.animals,
          resources: state.resources,
          waters: state.waters,
          products: state.products,
        }),
        // Merge persisted state with initial state
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<DefinitionsState> | undefined;
          return {
            ...currentState,
            plants: persisted?.plants ?? currentState.plants,
            animals: persisted?.animals ?? currentState.animals,
            resources: persisted?.resources ?? currentState.resources,
            waters: persisted?.waters ?? currentState.waters,
            products: persisted?.products ?? currentState.products,
          };
        },
      }
    )
  )
);

// Subscribe to data changes and auto-sync to Firebase
// Using a debounced approach to avoid excessive writes
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSyncedData: string | null = null;

// Setter for lastSyncedData - used by remote update handler to prevent re-sync loop
function updateLastSyncedData(data: string) {
  lastSyncedData = data;
}

const debouncedSync = () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    const state = useDefinitionsStore.getState();
    const currentData = JSON.stringify({
      plants: state.plants,
      animals: state.animals,
      resources: state.resources,
      waters: state.waters,
      products: state.products,
    });

    // Only sync if data actually changed (prevents loop from remote updates)
    if (currentData !== lastSyncedData) {
      lastSyncedData = currentData;
      state.syncToFirebase();
    }
  }, SYNC_DEBOUNCE_MS);
};

useDefinitionsStore.subscribe(
  (state) => ({ plants: state.plants, animals: state.animals, resources: state.resources, waters: state.waters, products: state.products }),
  (current) => {
    const state = useDefinitionsStore.getState();
    if (state.firebaseSyncEnabled) {
      // Update lastSyncedData on remote updates to prevent re-sync
      const currentData = JSON.stringify(current);
      if (lastSyncedData === null) {
        lastSyncedData = currentData;
      }
      debouncedSync();
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

// AliveYield and DeadYield are now defined directly in this file (above)
