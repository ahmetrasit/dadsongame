import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Re-export types from entity stores
export type { PlantDefinition, PlantStage, SoilType, PlantSubCategory } from './plantsStore';
export type { AnimalDefinition, AnimalCapability, AnimalSubCategory } from './animalsStore';
export type { ResourceDefinition } from './resourcesStore';

// Shared types
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface AliveYield {
  resourceId: string;
  amount: number;
  interval: number;
  seasons: Season[];
}

export interface DeadYield {
  resourceId: string;
  quantity: number;
}

// Import slices
import { PlantSlice, createPlantSlice, initialPlants, PlantDefinition } from './plantsStore';
import { AnimalSlice, createAnimalSlice, initialAnimals, AnimalDefinition } from './animalsStore';
import { ResourceSlice, createResourceSlice, initialResources, ResourceDefinition } from './resourcesStore';

// Combined definitions interface (for backward compatibility)
export interface GameDefinitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  resources: ResourceDefinition[];
}

// Shared UI state
interface SharedSlice {
  isEditorOpen: boolean;
  activeTab: 'plants' | 'animals' | 'resources';
  selectedId: string | null;

  // UI actions
  openEditor: (tab?: 'plants' | 'animals' | 'resources') => void;
  closeEditor: () => void;
  toggleEditor: () => void;
  setActiveTab: (tab: 'plants' | 'animals' | 'resources') => void;
  selectItem: (id: string | null) => void;

  // Import/Export
  exportDefinitions: () => string;
  importDefinitions: (json: string) => void;

  // Backward compatibility: computed definitions object
  definitions: GameDefinitions;
}

// Combined state type
type DefinitionsState = SharedSlice & PlantSlice & AnimalSlice & ResourceSlice;

// Initial definitions for backward compatibility reference (used in tests)
export const initialDefinitions: GameDefinitions = {
  plants: initialPlants,
  animals: initialAnimals,
  resources: initialResources,
};

export const useDefinitionsStore = create<DefinitionsState>()(
  persist(
    (set, get, api) => ({
      // Shared UI state
      isEditorOpen: false,
      activeTab: 'plants' as const,
      selectedId: null,

      // Backward compatibility: definitions object (computed via selector)
      definitions: {
        plants: initialPlants,
        animals: initialAnimals,
        resources: initialResources,
      },

      // UI Actions
      openEditor: (tab) => set({
        isEditorOpen: true,
        activeTab: tab || 'plants',
        selectedId: null,
        draftPlant: null,
        draftAnimal: null,
        draftResource: null,
      }),

      closeEditor: () => set({
        isEditorOpen: false,
        selectedId: null,
        draftPlant: null,
        draftAnimal: null,
        draftResource: null,
      }),

      toggleEditor: () => set((s) => ({
        isEditorOpen: !s.isEditorOpen,
        selectedId: null,
        draftPlant: null,
        draftAnimal: null,
        draftResource: null,
      })),

      setActiveTab: (tab) => set({
        activeTab: tab,
        selectedId: null,
        draftPlant: null,
        draftAnimal: null,
        draftResource: null,
      }),

      selectItem: (id) => set({
        selectedId: id,
        draftPlant: null,
        draftAnimal: null,
        draftResource: null,
      }),

      // Import/Export
      exportDefinitions: () => {
        const state = get();
        return JSON.stringify({
          plants: state.plants,
          animals: state.animals,
          resources: state.resources,
        }, null, 2);
      },

      importDefinitions: (json) => {
        try {
          const data = JSON.parse(json) as GameDefinitions;
          set({
            plants: data.plants,
            animals: data.animals,
            resources: data.resources,
          });
        } catch (e) {
          console.error('Failed to import definitions:', e);
        }
      },

      // Spread in entity slices
      ...createPlantSlice(set, get, api),
      ...createAnimalSlice(set, get, api),
      ...createResourceSlice(set, get, api),
    }),
    {
      name: 'game-definitions',
      // Only persist the data, not UI state
      partialize: (state) => ({
        plants: state.plants,
        animals: state.animals,
        resources: state.resources,
      }),
      // Merge persisted state with initial state
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<DefinitionsState> | undefined;
        return {
          ...currentState,
          plants: persisted?.plants ?? currentState.plants,
          animals: persisted?.animals ?? currentState.animals,
          resources: persisted?.resources ?? currentState.resources,
        };
      },
    }
  )
);

// Re-export types for backward compatibility
export type { AliveYield as AliveYieldType, DeadYield as DeadYieldType } from './plantsStore';
