import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MapData, ResourcePlacement } from './mapEditorStore';
import { useWorldStore } from './worldStore';

/**
 * Runtime Map Store
 *
 * This store holds the RUNTIME copy of map data used during gameplay.
 * It is separate from mapEditorStore which holds the BLUEPRINT (template).
 *
 * When a player starts a game:
 * 1. The blueprint is deep-cloned into this runtime store
 * 2. All gameplay changes (collecting, shedding, etc.) modify this store
 * 3. The original blueprint remains unchanged
 *
 * This allows players to replay maps and keeps the editor's map pristine.
 */

interface RuntimeMapState {
  // The runtime map data (modified during gameplay)
  mapData: MapData;

  // ID counters for runtime-created objects
  idCounters: {
    resource: number;
  };

  // Whether runtime data has been initialized
  isInitialized: boolean;

  // The source map ID (for reference)
  sourceMapId: string | null;

  // Actions
  initFromBlueprint: (blueprint: MapData, sourceMapId?: string | null) => void;
  reset: () => void;

  // Resource actions (used during gameplay)
  addResource: (definitionId: string, x: number, y: number, sourceId?: string) => void;
  removeResource: (id: string) => void;

  // Villager actions (used during gameplay)
  addVillager: (definitionId: string, x: number, y: number, recruitmentQuest?: object) => void;
  removeVillager: (id: string) => void;

  // Plant/Animal removal (for harvesting trees, killing animals, etc.)
  removePlant: (id: string) => void;
  removeAnimal: (id: string) => void;
}

const emptyMapData: MapData = {
  rivers: [],
  plants: [],
  animals: [],
  waters: [],
  resources: [],
  villagers: [],
  spawn: { x: 160, y: 320 },
};

export const useRuntimeMapStore = create<RuntimeMapState>()(
  persist(
    (set, _get) => ({
      mapData: { ...emptyMapData },
      idCounters: { resource: 0 },
      isInitialized: false,
      sourceMapId: null,

      initFromBlueprint: (blueprint, sourceMapId = null) => {
        // Deep clone the blueprint to avoid modifying the original
        const clonedData: MapData = {
          rivers: blueprint.rivers.map(r => ({ ...r, points: [...r.points.map(p => ({ ...p }))] })),
          plants: blueprint.plants.map(p => ({ ...p })),
          animals: blueprint.animals.map(a => ({ ...a })),
          waters: blueprint.waters.map(w => ({ ...w })),
          resources: (blueprint.resources || []).map(r => ({ ...r })),
          villagers: (blueprint.villagers || []).map(v => ({ ...v })),
          spawn: { ...blueprint.spawn },
        };

        // Calculate starting ID counter from existing resources
        let maxResourceId = 0;
        for (const r of clonedData.resources) {
          const match = r.id.match(/^resource-(\d+)$/);
          if (match) {
            maxResourceId = Math.max(maxResourceId, parseInt(match[1], 10) + 1);
          }
          // Also check for runtime- prefix
          const runtimeMatch = r.id.match(/^runtime-resource-(\d+)$/);
          if (runtimeMatch) {
            maxResourceId = Math.max(maxResourceId, parseInt(runtimeMatch[1], 10) + 1);
          }
        }

        set({
          mapData: clonedData,
          idCounters: { resource: maxResourceId },
          isInitialized: true,
          sourceMapId,
        });

        console.log('[RuntimeMapStore] Initialized from blueprint:', sourceMapId || 'default');
      },

      reset: () => {
        set({
          mapData: { ...emptyMapData, resources: [], villagers: [] },
          idCounters: { resource: 0 },
          isInitialized: false,
          sourceMapId: null,
        });
      },

      addResource: (definitionId, x, y, sourceId) => {
        set((state) => {
          const newId = `runtime-resource-${state.idCounters.resource}`;
          const newResource: ResourcePlacement = {
            id: newId,
            definitionId,
            x,
            y,
            placedAtDay: useWorldStore.getState().day,
            sourceId,
          };

          return {
            idCounters: { ...state.idCounters, resource: state.idCounters.resource + 1 },
            mapData: {
              ...state.mapData,
              resources: [...state.mapData.resources, newResource],
            },
          };
        });
      },

      removeResource: (id) => {
        set((state) => ({
          mapData: {
            ...state.mapData,
            resources: state.mapData.resources.filter(r => r.id !== id),
          },
        }));
      },

      addVillager: (definitionId, x, y, recruitmentQuest) => {
        set((state) => {
          const newId = `runtime-villager-${state.mapData.villagers.length}`;
          const newVillager = {
            id: newId,
            definitionId,
            x,
            y,
            recruitmentQuest,
          };

          return {
            mapData: {
              ...state.mapData,
              villagers: [...state.mapData.villagers, newVillager],
            },
          };
        });
      },

      removeVillager: (id) => {
        set((state) => ({
          mapData: {
            ...state.mapData,
            villagers: state.mapData.villagers.filter(v => v.id !== id),
          },
        }));
      },

      removePlant: (id) => {
        set((state) => ({
          mapData: {
            ...state.mapData,
            plants: state.mapData.plants.filter(p => p.id !== id),
          },
        }));
      },

      removeAnimal: (id) => {
        set((state) => ({
          mapData: {
            ...state.mapData,
            animals: state.mapData.animals.filter(a => a.id !== id),
          },
        }));
      },
    }),
    {
      name: 'runtime-map-storage',
      partialize: (state) => ({
        mapData: state.mapData,
        idCounters: state.idCounters,
        isInitialized: state.isInitialized,
        sourceMapId: state.sourceMapId,
      }),
    }
  )
);

// Selectors
export const useRuntimeMapData = () => useRuntimeMapStore((s) => s.mapData);
export const useRuntimeResources = () => useRuntimeMapStore((s) => s.mapData.resources);
export const useRuntimePlants = () => useRuntimeMapStore((s) => s.mapData.plants);
export const useRuntimeAnimals = () => useRuntimeMapStore((s) => s.mapData.animals);
