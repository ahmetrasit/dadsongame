import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { mapService } from '@/services/MapService';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useWorldStore } from '@/stores/worldStore';

export interface Point {
  x: number;
  y: number;
}

export interface River {
  id: string;
  points: Point[];
  closed: boolean;
}

export interface PlantPlacement {
  id: string;
  definitionId: string; // Reference to plant definition
  x: number;
  y: number;
  // Runtime properties (for gameplay)
  stage?: 'seed' | 'sprout' | 'mature' | 'withered';
  daysGrown?: number; // Days since planting or last stage advancement
}

export interface AnimalPlacement {
  id: string;
  definitionId: string; // Reference to animal definition
  x: number;
  y: number;
}

export interface WaterPlacement {
  id: string;
  definitionId: string; // Reference to water definition
  x: number;
  y: number;
}

export interface ResourcePlacement {
  id: string;
  definitionId: string;   // Reference to resource definition
  x: number;
  y: number;
  placedAtDay: number;    // Game day when placed (for spoilage calculation)
  sourceId?: string;      // ID of plant/animal that produced this (if shed)
}

export interface VillagerPlacement {
  id: string;
  definitionId: string; // Reference to villager definition
  x: number;
  y: number;
  recruitmentQuest?: object; // Optional recruitment quest data
}

export interface MapData {
  rivers: River[];
  plants: PlantPlacement[];
  animals: AnimalPlacement[];
  waters: WaterPlacement[];
  resources: ResourcePlacement[];
  villagers: VillagerPlacement[];
  spawn: Point;
  // Legacy support
  trees?: { id: string; x: number; y: number }[];
}

export type EditorTool = 'none' | 'river' | 'plant' | 'animal' | 'water' | 'resource' | 'eraser' | 'spawn';

export interface IdCounters {
  plant: number;
  animal: number;
  water: number;
  resource: number;
  river: number;
}

// Import SavedMapInfo type
import type { SavedMapInfo } from '@/services/MapService';

interface MapEditorState {
  // Editor state
  isEditing: boolean;
  currentTool: EditorTool;

  // Current map info
  currentMapId: string | null;
  currentMapName: string;

  // Selected definition IDs for placement
  selectedPlantId: string | null;
  selectedAnimalId: string | null;
  selectedWaterId: string | null;
  selectedResourceId: string | null;

  // Current river being drawn
  activeRiver: Point[];

  // Map data
  mapData: MapData;

  // ID counters (persisted to prevent duplicates)
  idCounters: IdCounters;

  // Firebase sync state
  firebaseSyncEnabled: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncTime: string | null;
  isOnline: boolean;

  // Saved maps list
  savedMaps: SavedMapInfo[];
  isLoadingMaps: boolean;

  // Actions
  toggleEditor: () => void;
  setEditing: (isEditing: boolean) => void;
  setTool: (tool: EditorTool) => void;

  // Map name
  setMapName: (name: string) => void;

  // Selection actions
  setSelectedPlantId: (id: string | null) => void;
  setSelectedAnimalId: (id: string | null) => void;
  setSelectedWaterId: (id: string | null) => void;
  setSelectedResourceId: (id: string | null) => void;

  // River actions
  addRiverPoint: (point: Point) => void;
  closeRiver: () => void;
  cancelRiver: () => void;

  // Plant actions
  addPlant: (x: number, y: number) => void;
  removePlant: (id: string) => void;

  // Animal actions
  addAnimal: (x: number, y: number) => void;
  removeAnimal: (id: string) => void;

  // Water actions
  addWater: (x: number, y: number) => void;
  removeWater: (id: string) => void;

  // Resource actions
  addResource: (x: number, y: number) => void;
  removeResource: (id: string) => void;

  // Legacy tree support
  addTree: (x: number, y: number) => void;
  removeTree: (id: string) => void;

  // Spawn
  setSpawn: (point: Point) => void;

  // Eraser
  eraseAt: (x: number, y: number, radius: number) => void;

  // Save/Load maps
  saveMap: () => Promise<void>;
  loadMap: (mapId: string) => Promise<void>;
  newMap: () => void;
  refreshMapList: () => Promise<void>;
  deleteMap: (mapId: string) => Promise<void>;

  // Legacy export/import
  exportMap: () => string;
  importMap: (json: string) => void;
  clearMap: () => void;

  // Firebase sync (legacy - now uses saveMap/loadMap)
  initFromFirebase: () => Promise<void>;
  syncToFirebase: () => Promise<void>;
  clearSyncError: () => void;
  disconnectFirebase: () => void;
}

// Debounce constants
const SYNC_DEBOUNCE_MS = 500;

// Collision detection constants
const PLACEMENT_RADIUS = 32; // pixels - 1 meter (TILE_SIZE) - prevents overlapping

/**
 * Validate that a definition ID exists
 */
function validateDefinitionId(type: 'plant' | 'animal' | 'water' | 'resource', id: string): boolean {
  const definitions = useDefinitionsStore.getState();
  switch (type) {
    case 'plant':
      return definitions.plants.some(p => p.id === id);
    case 'animal':
      return definitions.animals.some(a => a.id === id);
    case 'water':
      return definitions.waters.some(w => w.id === id);
    case 'resource':
      return definitions.resources.some(r => r.id === id);
    default:
      return false;
  }
}

/**
 * Check if a position collides with existing placements
 */
function hasCollision(
  x: number,
  y: number,
  mapData: MapData,
  radius: number = PLACEMENT_RADIUS
): { collides: boolean; type?: string } {
  // Check plants
  for (const plant of mapData.plants) {
    const dx = plant.x - x;
    const dy = plant.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      return { collides: true, type: 'plant' };
    }
  }

  // Check animals
  for (const animal of mapData.animals) {
    const dx = animal.x - x;
    const dy = animal.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      return { collides: true, type: 'animal' };
    }
  }

  // Check waters
  for (const water of mapData.waters) {
    const dx = water.x - x;
    const dy = water.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      return { collides: true, type: 'water' };
    }
  }

  // Check resources
  for (const resource of (mapData.resources || [])) {
    const dx = resource.x - x;
    const dy = resource.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      return { collides: true, type: 'resource' };
    }
  }

  return { collides: false };
}

export const useMapEditorStore = create<MapEditorState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        isEditing: false,
        currentTool: 'none',

        // Current map info
        currentMapId: null as string | null,
        currentMapName: 'Untitled Map',

        selectedPlantId: null,
        selectedAnimalId: null,
        selectedWaterId: null,
        selectedResourceId: null,
        activeRiver: [],

        mapData: {
          rivers: [],
          plants: [],
          animals: [],
          waters: [],
          resources: [],
          villagers: [],
          spawn: { x: 160, y: 320 }
        },

        // ID counters (persisted)
        idCounters: {
          plant: 0,
          animal: 0,
          water: 0,
          resource: 0,
          river: 0,
        },

        // Firebase sync state
        firebaseSyncEnabled: false,
        isSyncing: false,
        syncError: null as string | null,
        lastSyncTime: null as string | null,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

        // Saved maps
        savedMaps: [] as SavedMapInfo[],
        isLoadingMaps: false,

      toggleEditor: () => set((state) => ({
        isEditing: !state.isEditing,
        currentTool: state.isEditing ? 'none' : 'plant',
        activeRiver: []
      })),

      setEditing: (isEditing) => set({
        isEditing,
        currentTool: isEditing ? 'plant' : 'none',
        activeRiver: []
      }),

      setTool: (tool) => set({ currentTool: tool, activeRiver: [] }),

      setMapName: (name) => set({ currentMapName: name }),

      setSelectedPlantId: (id) => set({ selectedPlantId: id }),
      setSelectedAnimalId: (id) => set({ selectedAnimalId: id }),
      setSelectedWaterId: (id) => set({ selectedWaterId: id }),
      setSelectedResourceId: (id) => set({ selectedResourceId: id }),

      addRiverPoint: (point) => set((state) => ({
        activeRiver: [...state.activeRiver, point]
      })),

      closeRiver: () => set((state) => {
        if (state.activeRiver.length < 3) return state;

        const newRiver: River = {
          id: `river-${state.idCounters.river}`,
          points: [...state.activeRiver],
          closed: true
        };

        return {
          activeRiver: [],
          idCounters: { ...state.idCounters, river: state.idCounters.river + 1 },
          mapData: {
            ...state.mapData,
            rivers: [...state.mapData.rivers, newRiver]
          }
        };
      }),

      cancelRiver: () => set({ activeRiver: [] }),

      addPlant: (x, y) => set((state) => {
        const definitionId = state.selectedPlantId;
        if (!definitionId) {
          console.warn('No plant type selected');
          return state;
        }

        // Validate definition exists
        if (!validateDefinitionId('plant', definitionId)) {
          console.warn(`Invalid plant definition: ${definitionId}`);
          return state;
        }

        // Check for collision
        const collision = hasCollision(x, y, state.mapData);
        if (collision.collides) {
          console.warn(`Cannot place plant: collision with ${collision.type}`);
          return state;
        }

        return {
          idCounters: { ...state.idCounters, plant: state.idCounters.plant + 1 },
          mapData: {
            ...state.mapData,
            plants: [
              ...state.mapData.plants,
              { id: `plant-${state.idCounters.plant}`, definitionId, x, y }
            ]
          }
        };
      }),

      removePlant: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          plants: state.mapData.plants.filter(p => p.id !== id)
        }
      })),

      addAnimal: (x, y) => set((state) => {
        const definitionId = state.selectedAnimalId;
        if (!definitionId) {
          console.warn('No animal type selected');
          return state;
        }

        // Validate definition exists
        if (!validateDefinitionId('animal', definitionId)) {
          console.warn(`Invalid animal definition: ${definitionId}`);
          return state;
        }

        // Check for collision
        const collision = hasCollision(x, y, state.mapData);
        if (collision.collides) {
          console.warn(`Cannot place animal: collision with ${collision.type}`);
          return state;
        }

        return {
          idCounters: { ...state.idCounters, animal: state.idCounters.animal + 1 },
          mapData: {
            ...state.mapData,
            animals: [
              ...state.mapData.animals,
              { id: `animal-${state.idCounters.animal}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeAnimal: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          animals: state.mapData.animals.filter(a => a.id !== id)
        }
      })),

      addWater: (x, y) => set((state) => {
        const definitionId = state.selectedWaterId;
        if (!definitionId) {
          console.warn('No water type selected');
          return state;
        }

        // Validate definition exists
        if (!validateDefinitionId('water', definitionId)) {
          console.warn(`Invalid water definition: ${definitionId}`);
          return state;
        }

        // Check for collision
        const collision = hasCollision(x, y, state.mapData);
        if (collision.collides) {
          console.warn(`Cannot place water: collision with ${collision.type}`);
          return state;
        }

        return {
          idCounters: { ...state.idCounters, water: state.idCounters.water + 1 },
          mapData: {
            ...state.mapData,
            waters: [
              ...state.mapData.waters,
              { id: `water-${state.idCounters.water}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeWater: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          waters: state.mapData.waters.filter(w => w.id !== id)
        }
      })),

      addResource: (x, y) => set((state) => {
        const definitionId = state.selectedResourceId;
        if (!definitionId) {
          console.warn('No resource type selected');
          return state;
        }

        // Validate definition exists
        if (!validateDefinitionId('resource', definitionId)) {
          console.warn(`Invalid resource definition: ${definitionId}`);
          return state;
        }

        // Check for collision
        const collision = hasCollision(x, y, state.mapData);
        if (collision.collides) {
          console.warn(`Cannot place resource: collision with ${collision.type}`);
          return state;
        }

        return {
          idCounters: { ...state.idCounters, resource: state.idCounters.resource + 1 },
          mapData: {
            ...state.mapData,
            resources: [
              ...(state.mapData.resources || []),
              { id: `resource-${state.idCounters.resource}`, definitionId, x, y, placedAtDay: useWorldStore.getState().day }
            ]
          }
        };
      }),

      removeResource: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          resources: (state.mapData.resources || []).filter(r => r.id !== id)
        }
      })),

      // Legacy tree support - converts to plant placement
      addTree: (x, y) => set((state) => {
        const definitionId = state.selectedPlantId || 'plant-apple-tree';
        return {
          idCounters: { ...state.idCounters, plant: state.idCounters.plant + 1 },
          mapData: {
            ...state.mapData,
            plants: [
              ...state.mapData.plants,
              { id: `plant-${state.idCounters.plant}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeTree: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          plants: state.mapData.plants.filter(p => p.id !== id)
        }
      })),

      setSpawn: (point) => set((state) => ({
        mapData: { ...state.mapData, spawn: point }
      })),

      eraseAt: (x, y, radius) => set((state) => {
        // Remove plants within radius
        const plants = state.mapData.plants.filter(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove animals within radius
        const animals = state.mapData.animals.filter(a => {
          const dx = a.x - x;
          const dy = a.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove waters within radius
        const waters = state.mapData.waters.filter(w => {
          const dx = w.x - x;
          const dy = w.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove resources within radius
        const resources = (state.mapData.resources || []).filter(r => {
          const dx = r.x - x;
          const dy = r.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove points within radius from rivers, delete river if < 3 points remain
        const rivers = state.mapData.rivers
          .map(r => ({
            ...r,
            points: r.points.filter(p => {
              const dx = p.x - x;
              const dy = p.y - y;
              return Math.sqrt(dx * dx + dy * dy) > radius;
            })
          }))
          .filter(r => r.points.length >= 3); // River needs at least 3 points

        return {
          mapData: { ...state.mapData, plants, animals, waters, resources, rivers }
        };
      }),

      exportMap: () => {
        return JSON.stringify(get().mapData, null, 2);
      },

      importMap: (json) => {
        try {
          const data = JSON.parse(json) as MapData;

          // Migrate legacy trees to plants
          if (data.trees && data.trees.length > 0 && (!data.plants || data.plants.length === 0)) {
            data.plants = data.trees.map(t => ({
              id: t.id,
              definitionId: 'plant-apple-tree', // Default to apple tree
              x: t.x,
              y: t.y
            }));
            delete data.trees;
          }

          // Ensure arrays exist
          if (!data.plants) data.plants = [];
          if (!data.animals) data.animals = [];
          if (!data.waters) data.waters = [];

          set({ mapData: data });
        } catch (e) {
          console.error('Failed to import map:', e);
        }
      },

      clearMap: () => set({
        mapData: { rivers: [], plants: [], animals: [], waters: [], resources: [], villagers: [], spawn: { x: 160, y: 320 } },
        activeRiver: [],
        currentMapId: null,
        currentMapName: 'Untitled Map',
        idCounters: { plant: 0, animal: 0, water: 0, resource: 0, river: 0 },
      }),

      // Map save/load actions
      saveMap: async () => {
        const state = get();
        if (!state.isOnline) {
          set({ syncError: 'Offline - cannot save' });
          return;
        }

        set({ isSyncing: true, syncError: null });
        try {
          const result = await mapService.saveMap(
            state.currentMapId,
            state.currentMapName,
            state.mapData
          );
          if (result) {
            set({
              currentMapId: result.id,
              lastSyncTime: result.timestamp,
              firebaseSyncEnabled: true,
            });
            // Refresh map list after save
            await get().refreshMapList();
            console.log('[MapEditorStore] Map saved:', state.currentMapName);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save map';
          console.error('[MapEditorStore] Save failed:', error);
          set({ syncError: message });
        } finally {
          set({ isSyncing: false });
        }
      },

      loadMap: async (mapId: string) => {
        set({ isSyncing: true, syncError: null });
        try {
          const result = await mapService.loadMap(mapId);
          if (result) {
            // Calculate ID counters from loaded data
            const extractMaxId = (items: { id: string }[], prefix: string): number => {
              let max = 0;
              for (const item of items) {
                const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
                if (match) {
                  max = Math.max(max, parseInt(match[1], 10) + 1);
                }
              }
              return max;
            };

            set({
              currentMapId: mapId,
              currentMapName: result.name,
              mapData: result.mapData,
              lastSyncTime: result.timestamp,
              firebaseSyncEnabled: true,
              idCounters: {
                plant: extractMaxId(result.mapData.plants, 'plant'),
                animal: extractMaxId(result.mapData.animals, 'animal'),
                water: extractMaxId(result.mapData.waters, 'water'),
                resource: extractMaxId(result.mapData.resources || [], 'resource'),
                river: extractMaxId(result.mapData.rivers, 'river'),
              },
            });

            // Subscribe to real-time updates for this map
            mapService.subscribeToUpdates(
              mapId,
              (mapData, timestamp) => {
                console.log('[MapEditorStore] Applying remote update');
                markRemoteUpdate();
                set({ mapData, lastSyncTime: timestamp });
              },
              (error) => {
                set({ syncError: error });
              }
            );

            console.log('[MapEditorStore] Loaded map:', result.name);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load map';
          console.error('[MapEditorStore] Load failed:', error);
          set({ syncError: message });
        } finally {
          set({ isSyncing: false });
        }
      },

      newMap: () => {
        mapService.disconnect();
        set({
          currentMapId: null,
          currentMapName: 'Untitled Map',
          mapData: { rivers: [], plants: [], animals: [], waters: [], resources: [], villagers: [], spawn: { x: 160, y: 320 } },
          activeRiver: [],
          idCounters: { plant: 0, animal: 0, water: 0, resource: 0, river: 0 },
          firebaseSyncEnabled: false,
        });
      },

      refreshMapList: async () => {
        set({ isLoadingMaps: true });
        try {
          const maps = await mapService.listMaps();
          set({ savedMaps: maps });
        } catch (error) {
          console.error('[MapEditorStore] Failed to list maps:', error);
        } finally {
          set({ isLoadingMaps: false });
        }
      },

      deleteMap: async (mapId: string) => {
        set({ isSyncing: true });
        try {
          await mapService.deleteMap(mapId);
          // Refresh list after delete
          await get().refreshMapList();
          // If deleted current map, create new one
          if (get().currentMapId === mapId) {
            get().newMap();
          }
        } catch (error) {
          console.error('[MapEditorStore] Delete failed:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Legacy Firebase sync (now just calls saveMap)
      initFromFirebase: async () => {
        if (!mapService.isAvailable()) {
          console.log('[MapEditorStore] Firebase not available');
          return;
        }
        // Just refresh the map list on init
        await get().refreshMapList();
        set({ firebaseSyncEnabled: true });
      },

      syncToFirebase: async () => {
        // Now uses saveMap
        await get().saveMap();
      },

      clearSyncError: () => set({ syncError: null }),

      disconnectFirebase: () => {
        mapService.disconnect();
        set({ firebaseSyncEnabled: false });
      },
    }),
    {
      name: 'map-editor-data',
      // Only persist data, not UI state like isEditing/currentTool
      partialize: (state) => ({
        mapData: state.mapData,
        idCounters: state.idCounters,
        currentMapId: state.currentMapId,
        currentMapName: state.currentMapName,
        selectedPlantId: state.selectedPlantId,
        selectedAnimalId: state.selectedAnimalId,
        selectedWaterId: state.selectedWaterId,
        activeRiver: state.activeRiver,
      }),
      // Migrate old data and initialize counters on load
      onRehydrateStorage: () => (state) => {
        if (state?.mapData) {
          // Migrate legacy trees to plants
          const mapData = state.mapData as MapData & { trees?: { id: string; x: number; y: number }[] };
          if (mapData.trees && mapData.trees.length > 0 && (!mapData.plants || mapData.plants.length === 0)) {
            mapData.plants = mapData.trees.map(t => ({
              id: t.id,
              definitionId: 'plant-apple-tree',
              x: t.x,
              y: t.y
            }));
            delete mapData.trees;
          }
          if (!mapData.plants) mapData.plants = [];
          if (!mapData.animals) mapData.animals = [];
          if (!mapData.waters) mapData.waters = [];

          // Initialize idCounters if not present (migration from old data)
          if (!state.idCounters) {
            // Calculate counters from existing data to avoid ID collisions
            const extractMaxId = (items: { id: string }[], prefix: string): number => {
              let max = 0;
              for (const item of items) {
                const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
                if (match) {
                  max = Math.max(max, parseInt(match[1], 10) + 1);
                }
              }
              return max;
            };

            state.idCounters = {
              plant: extractMaxId(mapData.plants, 'plant'),
              animal: extractMaxId(mapData.animals, 'animal'),
              water: extractMaxId(mapData.waters, 'water'),
              resource: extractMaxId(mapData.resources || [], 'resource'),
              river: extractMaxId(mapData.rivers, 'river'),
            };
          }
        }
      }
    }
  )
  )
);

// Subscribe to mapData changes and auto-sync to Firebase
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSyncedDataHash: string | null = null;
let isRemoteUpdate = false; // Flag to skip syncing remote updates back

// Called by the store when receiving remote updates
export const markRemoteUpdate = () => {
  isRemoteUpdate = true;
};

const debouncedSync = () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    // Skip if this was triggered by a remote update
    if (isRemoteUpdate) {
      isRemoteUpdate = false;
      return;
    }

    const state = useMapEditorStore.getState();
    const currentDataHash = JSON.stringify(state.mapData);

    // Only sync if data actually changed from last successful sync
    if (currentDataHash !== lastSyncedDataHash) {
      await state.syncToFirebase();
      // Update hash only after successful sync
      lastSyncedDataHash = currentDataHash;
    }
  }, SYNC_DEBOUNCE_MS);
};

useMapEditorStore.subscribe(
  (state) => state.mapData,
  (_current, _prev) => {
    const state = useMapEditorStore.getState();
    if (state.firebaseSyncEnabled && state.isOnline) {
      // Initialize hash on first change
      if (lastSyncedDataHash === null) {
        lastSyncedDataHash = JSON.stringify(state.mapData);
        return; // Don't sync initial state
      }
      debouncedSync();
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

// Online/offline detection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useMapEditorStore.setState({ isOnline: true, syncError: null });
    // Trigger sync when coming back online
    const state = useMapEditorStore.getState();
    if (state.firebaseSyncEnabled) {
      state.syncToFirebase();
    }
  });

  window.addEventListener('offline', () => {
    useMapEditorStore.setState({ isOnline: false, syncError: 'Offline - changes saved locally' });
  });
}
