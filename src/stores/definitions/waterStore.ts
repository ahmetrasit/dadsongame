import { StateCreator } from 'zustand';

// Water-specific types
export type WaterType = 'river' | 'pond' | 'lake' | 'ocean' | 'well';
export type WaterInteractionType = 'fish' | 'drink' | 'swim' | 'collect' | 'inspect';

export interface FishType {
  resourceId: string;
  rarity: number; // 0-100, higher = rarer
  seasons: ('spring' | 'summer' | 'autumn' | 'winter')[];
}

export interface WaterDefinition {
  id: string;
  name: string;
  waterType: WaterType;
  fishTypes: FishType[];
  canDrink: boolean;
  canSwim: boolean;
  flowSpeed: number; // 0 for still water
  depth: number; // 1-10, affects fishing and swimming
  interactionRadius: number;
  interactionTypes: WaterInteractionType[];
  isBlocking: boolean; // Whether this water body blocks player movement
  spriteKey: string;
}

// Water slice state and actions
export interface WaterSlice {
  waters: WaterDefinition[];
  draftWater: WaterDefinition | null;

  addWater: () => void;
  saveWater: () => void;
  cancelWater: () => void;
  updateWater: (id: string, updates: Partial<WaterDefinition>) => void;
  updateDraftWater: (updates: Partial<WaterDefinition>) => void;
  deleteWater: (id: string) => void;
}

let waterIdCounter = 0;
const genWaterId = () => `water-${++waterIdCounter}`;

export const defaultWater = (): WaterDefinition => ({
  id: genWaterId(),
  name: 'New Water Body',
  waterType: 'pond',
  fishTypes: [],
  canDrink: true,
  canSwim: true,
  flowSpeed: 0,
  depth: 3,
  interactionRadius: 50,
  interactionTypes: ['fish', 'drink', 'collect', 'inspect'],
  isBlocking: false,
  spriteKey: 'water-default',
});

export const initialWaters: WaterDefinition[] = [
  {
    id: 'water-river',
    name: 'River',
    waterType: 'river',
    fishTypes: [
      { resourceId: 'res-trout', rarity: 30, seasons: ['spring', 'summer', 'autumn'] },
      { resourceId: 'res-salmon', rarity: 60, seasons: ['autumn'] },
    ],
    canDrink: true,
    canSwim: true,
    flowSpeed: 5,
    depth: 4,
    interactionRadius: 40,
    interactionTypes: ['fish', 'drink', 'collect', 'inspect'],
    isBlocking: false, // Shallow enough to walk through
    spriteKey: 'water-river',
  },
  {
    id: 'water-pond',
    name: 'Pond',
    waterType: 'pond',
    fishTypes: [
      { resourceId: 'res-carp', rarity: 20, seasons: ['spring', 'summer', 'autumn', 'winter'] },
    ],
    canDrink: true,
    canSwim: true,
    flowSpeed: 0,
    depth: 2,
    interactionRadius: 50,
    interactionTypes: ['fish', 'drink', 'swim', 'inspect'],
    isBlocking: false, // Shallow enough to walk through
    spriteKey: 'water-pond',
  },
];

export const createWaterSlice: StateCreator<
  WaterSlice & { selectedId: string | null },
  [],
  [],
  WaterSlice
> = (set, get) => ({
  waters: initialWaters,
  draftWater: null,

  addWater: () => {
    set({ draftWater: defaultWater(), selectedId: null });
  },

  saveWater: () => {
    const draft = get().draftWater;
    if (draft) {
      set((s) => ({
        waters: [...s.waters, draft],
        selectedId: draft.id,
        draftWater: null,
      }));
    }
  },

  cancelWater: () => set({ draftWater: null }),

  updateDraftWater: (updates) => set((s) => ({
    draftWater: s.draftWater ? { ...s.draftWater, ...updates } : null,
  })),

  updateWater: (id, updates) => set((s) => ({
    waters: s.waters.map((w) => (w.id === id ? { ...w, ...updates } : w)),
  })),

  deleteWater: (id) => set((s) => ({
    waters: s.waters.filter((w) => w.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
});
