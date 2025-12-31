import { StateCreator } from 'zustand';
import type { Season, AliveYield, DeadYield } from './index';

// Plant-specific types
export type PlantStage = 'seed' | 'sprout' | 'mature' | 'withered';
export type SoilType = 'grass' | 'sand' | 'rock' | 'fertile' | 'swamp';
export type PlantSubCategory = 'tree' | 'crop' | 'flower' | 'bush';
export type PlantInteractionType = 'collect' | 'pick' | 'harvest' | 'chop' | 'prune' | 'uproot' | 'water' | 'fertilize' | 'inspect';

export interface SpriteVersion {
  imageUrl: string;
  createdAt: number;
  version: number;
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
  imageUrl?: string;
  spriteVersions?: SpriteVersion[];
  // Interaction properties
  interactionRadius: number;
  interactionTypes: PlantInteractionType[];
  isBlocking: boolean;
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

// Initialize counter from existing plants to prevent ID collisions
let plantIdCounter = 0;
const genPlantId = (existingPlants: PlantDefinition[] = []) => {
  // Find the highest numeric ID from existing plants
  const maxId = existingPlants.reduce((max, plant) => {
    const match = plant.id.match(/^plant-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, plantIdCounter);

  plantIdCounter = maxId + 1;
  return `plant-${plantIdCounter}`;
};

export const defaultPlant = (existingPlants: PlantDefinition[] = []): PlantDefinition => ({
  id: genPlantId(existingPlants),
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
  interactionRadius: 40,
  interactionTypes: ['harvest', 'inspect'],
  isBlocking: false,
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
    aliveYields: [{ resourceId: 'res-apple', amount: 5, interval: 1, seasons: ['spring', 'summer', 'autumn'], shedding: true }],
    deadYields: [{ resourceId: 'res-wood', quantity: 10 }],
    spriteKey: 'plant-apple-tree',
    interactionRadius: 50,
    interactionTypes: ['harvest', 'chop', 'inspect'],
    isBlocking: true,
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
    interactionRadius: 30,
    interactionTypes: ['harvest', 'water', 'inspect'],
    isBlocking: false,
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
    const plants = get().plants;
    set({ draftPlant: defaultPlant(plants), selectedId: null });
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
