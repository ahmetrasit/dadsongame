import { StateCreator } from 'zustand';
import type { Season } from './index';

// Plant-specific types
export type PlantStage = 'seed' | 'sprout' | 'mature' | 'withered';
export type SoilType = 'grass' | 'sand' | 'rock' | 'fertile' | 'swamp';
export type PlantSubCategory = 'tree' | 'crop' | 'flower' | 'bush';

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

export interface PlantDefinition {
  id: string;
  name: string;
  subCategory: PlantSubCategory;
  growthTime: number;
  harvestWindow: number;
  seasons: Season[];
  suitableSoils: SoilType[];
  waterNeed: number;
  sunNeed: number;
  aliveYields: AliveYield[];
  deadYields: DeadYield[];
  spriteKey: string;
}

// Plant slice state and actions
export interface PlantSlice {
  plants: PlantDefinition[];
  draftPlant: PlantDefinition | null;

  addPlant: () => void;
  savePlant: () => void;
  cancelPlant: () => void;
  updatePlant: (id: string, updates: Partial<PlantDefinition>) => void;
  updateDraftPlant: (updates: Partial<PlantDefinition>) => void;
  deletePlant: (id: string) => void;
}

let plantIdCounter = 0;
const genPlantId = () => `plant-${++plantIdCounter}`;

export const defaultPlant = (): PlantDefinition => ({
  id: genPlantId(),
  name: 'New Plant',
  subCategory: 'crop',
  growthTime: 7,
  harvestWindow: 3,
  seasons: ['spring', 'summer'],
  suitableSoils: ['grass', 'fertile'],
  waterNeed: 50,
  sunNeed: 50,
  aliveYields: [],
  deadYields: [],
  spriteKey: 'plant-default',
});

export const initialPlants: PlantDefinition[] = [
  {
    id: 'plant-apple-tree',
    name: 'Apple Tree',
    subCategory: 'tree',
    growthTime: 30,
    harvestWindow: 0,
    seasons: ['spring', 'summer', 'autumn'],
    suitableSoils: ['grass', 'fertile'],
    waterNeed: 40,
    sunNeed: 60,
    aliveYields: [{ resourceId: 'res-apple', amount: 2, interval: 7, seasons: ['spring', 'summer', 'autumn'] }],
    deadYields: [{ resourceId: 'res-wood', quantity: 10 }],
    spriteKey: 'plant-apple-tree',
  },
  {
    id: 'plant-wheat',
    name: 'Wheat',
    subCategory: 'crop',
    growthTime: 7,
    harvestWindow: 5,
    seasons: ['spring', 'summer'],
    suitableSoils: ['grass', 'fertile'],
    waterNeed: 60,
    sunNeed: 70,
    aliveYields: [],
    deadYields: [{ resourceId: 'res-wheat', quantity: 3 }],
    spriteKey: 'plant-wheat',
  },
];

export const createPlantSlice: StateCreator<
  PlantSlice & { selectedId: string | null },
  [],
  [],
  PlantSlice
> = (set, get) => ({
  plants: initialPlants,
  draftPlant: null,

  addPlant: () => {
    set({ draftPlant: defaultPlant(), selectedId: null });
  },

  savePlant: () => {
    const draft = get().draftPlant;
    if (draft) {
      set((s) => ({
        plants: [...s.plants, draft],
        selectedId: draft.id,
        draftPlant: null,
      }));
    }
  },

  cancelPlant: () => set({ draftPlant: null }),

  updateDraftPlant: (updates) => set((s) => ({
    draftPlant: s.draftPlant ? { ...s.draftPlant, ...updates } : null,
  })),

  updatePlant: (id, updates) => set((s) => ({
    plants: s.plants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  })),

  deletePlant: (id) => set((s) => ({
    plants: s.plants.filter((p) => p.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
});
