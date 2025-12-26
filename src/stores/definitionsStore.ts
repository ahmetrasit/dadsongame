import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Yield types
export interface AliveYield {
  resourceId: string;      // Reference to a defined resource
  amount: number;          // How much per harvest
  interval: number;        // Game days between yields
  seasons: Season[];       // Which seasons this yield is available
}

export interface DeadYield {
  resourceId: string;      // Reference to a defined resource
  quantity: number;
}

// Plant definitions
export type PlantStage = 'seed' | 'sprout' | 'mature' | 'withered';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SoilType = 'grass' | 'sand' | 'rock' | 'fertile' | 'swamp';
export type PlantSubCategory = 'tree' | 'crop' | 'flower' | 'bush';

export interface PlantDefinition {
  id: string;
  name: string;
  subCategory: PlantSubCategory;
  growthTime: number; // game days to mature
  harvestWindow: number; // game days before withering (0 = doesn't wither)
  seasons: Season[];
  suitableSoils: SoilType[];
  waterNeed: number; // 0-100
  sunNeed: number; // 0-100
  aliveYields: AliveYield[];
  deadYields: DeadYield[];
  spriteKey: string;
}

// Animal definitions
export type AnimalCapability = 'eat' | 'carry' | 'transport' | 'produce';
export type AnimalSubCategory = 'livestock' | 'poultry' | 'wild' | 'pet';

export interface AnimalDefinition {
  id: string;
  name: string;
  subCategory: AnimalSubCategory;
  baseSpeed: number;
  maxEnergy: number;
  tamingDifficulty: number; // 1-10
  canPull: boolean;
  foodNeeds: number; // Daily food requirement
  waterNeeds: number; // Daily water requirement
  aliveYields: AliveYield[];
  deadYields: DeadYield[];
  spriteKey: string;
}

// Resource definition (simple for now)
export interface ResourceDefinition {
  id: string;
  name: string;
  category: 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never';
  weight: number;
}

// All definitions
export interface GameDefinitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  resources: ResourceDefinition[];
}

interface DefinitionsState {
  definitions: GameDefinitions;

  // UI state
  isEditorOpen: boolean;
  activeTab: 'plants' | 'animals' | 'resources';
  selectedId: string | null;

  // Draft state for new items (not yet saved)
  draftPlant: PlantDefinition | null;
  draftAnimal: AnimalDefinition | null;
  draftResource: ResourceDefinition | null;

  // Actions
  openEditor: (tab?: 'plants' | 'animals' | 'resources') => void;
  closeEditor: () => void;
  toggleEditor: () => void;
  setActiveTab: (tab: 'plants' | 'animals' | 'resources') => void;
  selectItem: (id: string | null) => void;

  // Plant actions
  addPlant: () => void;
  savePlant: () => void;
  cancelPlant: () => void;
  updatePlant: (id: string, updates: Partial<PlantDefinition>) => void;
  updateDraftPlant: (updates: Partial<PlantDefinition>) => void;
  deletePlant: (id: string) => void;

  // Animal actions
  addAnimal: () => void;
  saveAnimal: () => void;
  cancelAnimal: () => void;
  updateAnimal: (id: string, updates: Partial<AnimalDefinition>) => void;
  updateDraftAnimal: (updates: Partial<AnimalDefinition>) => void;
  deleteAnimal: (id: string) => void;

  // Resource actions
  addResource: () => void;
  saveResource: () => void;
  cancelResource: () => void;
  updateResource: (id: string, updates: Partial<ResourceDefinition>) => void;
  updateDraftResource: (updates: Partial<ResourceDefinition>) => void;
  deleteResource: (id: string) => void;

  // Import/Export
  exportDefinitions: () => string;
  importDefinitions: (json: string) => void;
}

let idCounter = 0;
const genId = (prefix: string) => `${prefix}-${++idCounter}`;

const defaultPlant = (): PlantDefinition => ({
  id: genId('plant'),
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

const defaultAnimal = (): AnimalDefinition => ({
  id: genId('animal'),
  name: 'New Animal',
  subCategory: 'wild',
  baseSpeed: 50,
  maxEnergy: 100,
  tamingDifficulty: 5,
  canPull: false,
  foodNeeds: 5,
  waterNeeds: 5,
  aliveYields: [],
  deadYields: [],
  spriteKey: 'animal-default',
});

const defaultResource = (): ResourceDefinition => ({
  id: genId('resource'),
  name: 'New Resource',
  category: 'organics',
  spoilageRate: 'never',
  weight: 1,
});

// Pre-populated with some examples
const initialDefinitions: GameDefinitions = {
  plants: [
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
  ],
  animals: [
    {
      id: 'animal-cow',
      name: 'Cow',
      subCategory: 'livestock',
      baseSpeed: 30,
      maxEnergy: 100,
      tamingDifficulty: 3,
      canPull: true,
      foodNeeds: 8,
      waterNeeds: 10,
      aliveYields: [{ resourceId: 'res-milk', amount: 1, interval: 1, seasons: ['spring', 'summer', 'autumn', 'winter'] }],
      deadYields: [
        { resourceId: 'res-meat', quantity: 8 },
        { resourceId: 'res-leather', quantity: 2 },
      ],
      spriteKey: 'animal-cow',
    },
    {
      id: 'animal-chicken',
      name: 'Chicken',
      subCategory: 'poultry',
      baseSpeed: 50,
      maxEnergy: 50,
      tamingDifficulty: 1,
      canPull: false,
      foodNeeds: 2,
      waterNeeds: 2,
      aliveYields: [{ resourceId: 'res-egg', amount: 1, interval: 1, seasons: ['spring', 'summer', 'autumn', 'winter'] }],
      deadYields: [{ resourceId: 'res-meat', quantity: 2 }],
      spriteKey: 'animal-chicken',
    },
  ],
  resources: [
    { id: 'res-apple', name: 'Apple', category: 'food', spoilageRate: 'medium', weight: 0.2 },
    { id: 'res-wood', name: 'Wood', category: 'wood', spoilageRate: 'never', weight: 5 },
    { id: 'res-wheat', name: 'Wheat', category: 'food', spoilageRate: 'slow', weight: 0.5 },
    { id: 'res-milk', name: 'Milk', category: 'food', spoilageRate: 'fast', weight: 1 },
    { id: 'res-meat', name: 'Meat', category: 'food', spoilageRate: 'fast', weight: 2 },
    { id: 'res-leather', name: 'Leather', category: 'organics', spoilageRate: 'never', weight: 0.5 },
    { id: 'res-egg', name: 'Egg', category: 'food', spoilageRate: 'medium', weight: 0.1 },
  ],
};

export const useDefinitionsStore = create<DefinitionsState>()(
  persist(
    (set, get) => ({
  definitions: initialDefinitions,
  isEditorOpen: false,
  activeTab: 'plants',
  selectedId: null,
  draftPlant: null,
  draftAnimal: null,
  draftResource: null,

  openEditor: (tab) => set({ isEditorOpen: true, activeTab: tab || 'plants', selectedId: null, draftPlant: null, draftAnimal: null, draftResource: null }),
  closeEditor: () => set({ isEditorOpen: false, selectedId: null, draftPlant: null, draftAnimal: null, draftResource: null }),
  toggleEditor: () => set((s) => ({ isEditorOpen: !s.isEditorOpen, selectedId: null, draftPlant: null, draftAnimal: null, draftResource: null })),
  setActiveTab: (tab) => set({ activeTab: tab, selectedId: null, draftPlant: null, draftAnimal: null, draftResource: null }),
  selectItem: (id) => set({ selectedId: id, draftPlant: null, draftAnimal: null, draftResource: null }),

  // Plants
  addPlant: () => {
    set({ draftPlant: defaultPlant(), selectedId: null });
  },
  savePlant: () => {
    const draft = get().draftPlant;
    if (draft) {
      set((s) => ({
        definitions: { ...s.definitions, plants: [...s.definitions.plants, draft] },
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
    definitions: {
      ...s.definitions,
      plants: s.definitions.plants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    },
  })),
  deletePlant: (id) => set((s) => ({
    definitions: {
      ...s.definitions,
      plants: s.definitions.plants.filter((p) => p.id !== id),
    },
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  // Animals
  addAnimal: () => {
    set({ draftAnimal: defaultAnimal(), selectedId: null });
  },
  saveAnimal: () => {
    const draft = get().draftAnimal;
    if (draft) {
      set((s) => ({
        definitions: { ...s.definitions, animals: [...s.definitions.animals, draft] },
        selectedId: draft.id,
        draftAnimal: null,
      }));
    }
  },
  cancelAnimal: () => set({ draftAnimal: null }),
  updateDraftAnimal: (updates) => set((s) => ({
    draftAnimal: s.draftAnimal ? { ...s.draftAnimal, ...updates } : null,
  })),
  updateAnimal: (id, updates) => set((s) => ({
    definitions: {
      ...s.definitions,
      animals: s.definitions.animals.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    },
  })),
  deleteAnimal: (id) => set((s) => ({
    definitions: {
      ...s.definitions,
      animals: s.definitions.animals.filter((a) => a.id !== id),
    },
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  // Resources
  addResource: () => {
    set({ draftResource: defaultResource(), selectedId: null });
  },
  saveResource: () => {
    const draft = get().draftResource;
    if (draft) {
      set((s) => ({
        definitions: { ...s.definitions, resources: [...s.definitions.resources, draft] },
        selectedId: draft.id,
        draftResource: null,
      }));
    }
  },
  cancelResource: () => set({ draftResource: null }),
  updateDraftResource: (updates) => set((s) => ({
    draftResource: s.draftResource ? { ...s.draftResource, ...updates } : null,
  })),
  updateResource: (id, updates) => set((s) => ({
    definitions: {
      ...s.definitions,
      resources: s.definitions.resources.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    },
  })),
  deleteResource: (id) => set((s) => ({
    definitions: {
      ...s.definitions,
      resources: s.definitions.resources.filter((r) => r.id !== id),
    },
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  // Import/Export
  exportDefinitions: () => JSON.stringify(get().definitions, null, 2),
  importDefinitions: (json) => {
    try {
      const data = JSON.parse(json) as GameDefinitions;
      set({ definitions: data });
    } catch (e) {
      console.error('Failed to import definitions:', e);
    }
  },
}),
    { name: 'game-definitions' }
  )
);
