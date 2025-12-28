import { StateCreator } from 'zustand';
import type { AliveYield, DeadYield } from './index';

// Animal-specific types
export type AnimalCapability = 'eat' | 'carry' | 'transport' | 'produce';
export type AnimalSubCategory = 'livestock' | 'poultry' | 'wild' | 'pet';
export type AnimalInteractionType = 'pet' | 'feed' | 'milk' | 'shear' | 'ride' | 'collect' | 'tame' | 'inspect';

export interface SpriteVersion {
  imageUrl: string;
  createdAt: number;
  version: number;
}

export interface AnimalDefinition {
  id: string;
  name: string;
  subCategory: AnimalSubCategory;
  baseSpeed: number;
  maxEnergy: number;
  tamingDifficulty: number;
  canPull: boolean;
  foodNeeds: number;
  waterNeeds: number;
  aliveYields: AliveYield[];
  deadYields: DeadYield[];
  spriteKey: string;
  imageUrl?: string;
  spriteVersions?: SpriteVersion[];
  // Interaction properties
  interactionRadius: number;
  interactionTypes: AnimalInteractionType[];
  isBlocking: boolean;
}

// Animal slice state and actions
export interface AnimalSlice {
  animals: AnimalDefinition[];
  draftAnimal: AnimalDefinition | null;

  addAnimal: () => void;
  saveAnimal: () => void;
  cancelAnimal: () => void;
  updateAnimal: (id: string, updates: Partial<AnimalDefinition>) => void;
  updateDraftAnimal: (updates: Partial<AnimalDefinition>) => void;
  deleteAnimal: (id: string) => void;
}

let animalIdCounter = 0;
const genAnimalId = () => `animal-${++animalIdCounter}`;

export const defaultAnimal = (): AnimalDefinition => ({
  id: genAnimalId(),
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
  interactionRadius: 40,
  interactionTypes: ['inspect', 'tame'],
  isBlocking: false,
});

export const initialAnimals: AnimalDefinition[] = [
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
    interactionRadius: 50,
    interactionTypes: ['pet', 'feed', 'milk', 'inspect'],
    isBlocking: true,
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
    interactionRadius: 30,
    interactionTypes: ['pet', 'feed', 'collect', 'inspect'],
    isBlocking: false,
  },
];

export const createAnimalSlice: StateCreator<
  AnimalSlice & { selectedId: string | null },
  [],
  [],
  AnimalSlice
> = (set, get) => ({
  animals: initialAnimals,
  draftAnimal: null,

  addAnimal: () => {
    set({ draftAnimal: defaultAnimal(), selectedId: null });
  },

  saveAnimal: () => {
    const draft = get().draftAnimal;
    if (draft) {
      set((s) => ({
        animals: [...s.animals, draft],
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
    animals: s.animals.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),

  deleteAnimal: (id) => set((s) => ({
    animals: s.animals.filter((a) => a.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
});
