import { StateCreator } from 'zustand';

// Resource-specific types
export interface SpriteVersion {
  imageUrl: string;
  createdAt: number;
  version: number;
}

// Resource interaction types
export type ResourceInteractionType = 'collect' | 'inspect';

// Nutrient types for food
export type VitaminType = 'A' | 'B' | 'C' | 'D' | 'E' | 'K' | 'fiber' | 'calcium' | 'iron' | 'magnesium' | 'potassium' | 'zinc' | 'phosphorus';

// Nutritional info for food category resources
export interface FoodNutrition {
  kcalPerKg: number;              // Calories per kilogram
  vitamins: VitaminType[];        // Which vitamins this food contains
  protein: number;                // Percentage (0-100)
  carbs: number;                  // Percentage (0-100)
  goodFat: number;                // Percentage (0-100)
  badFat: number;                 // Percentage (0-100)
  // protein + carbs + goodFat + badFat should equal 100
}

export interface ResourceDefinition {
  id: string;
  name: string;
  category: 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never';
  weight: number;
  emoji: string;                                    // Emoji for ground display (e.g., '🍎')
  interactionTypes: ResourceInteractionType[];     // Available interactions
  interactionRadius: number;                       // Detection range in pixels
  isBlocking: boolean;                             // Whether it blocks movement (usually false)
  imageUrl?: string;                               // Optional sprite for inventory/UI
  spriteVersions?: SpriteVersion[];
  // Nutritional info - only for food category
  nutrition?: FoodNutrition;
}

// Resource slice state and actions
export interface ResourceSlice {
  resources: ResourceDefinition[];
  draftResource: ResourceDefinition | null;

  addResource: () => void;
  saveResource: () => void;
  cancelResource: () => void;
  updateResource: (id: string, updates: Partial<ResourceDefinition>) => void;
  updateDraftResource: (updates: Partial<ResourceDefinition>) => void;
  deleteResource: (id: string) => void;
}

// Initialize counter from existing resources to prevent ID collisions
let resourceIdCounter = 0;
const genResourceId = (existingResources: ResourceDefinition[] = []) => {
  // Find the highest numeric ID from existing resources
  const maxId = existingResources.reduce((max, resource) => {
    const match = resource.id.match(/^resource-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, resourceIdCounter);

  resourceIdCounter = maxId + 1;
  return `resource-${resourceIdCounter}`;
};

export const defaultResource = (existingResources: ResourceDefinition[] = []): ResourceDefinition => ({
  id: genResourceId(existingResources),
  name: 'New Resource',
  category: 'organics',
  spoilageRate: 'never',
  weight: 1,
  emoji: '📦',
  interactionTypes: ['collect'],
  interactionRadius: 24,
  isBlocking: false,
});

export const initialResources: ResourceDefinition[] = [
  { id: 'res-apple', name: 'Apple', category: 'food', spoilageRate: 'medium', weight: 0.2, emoji: '🍎', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false,
    nutrition: { kcalPerKg: 520, vitamins: ['C'], protein: 2, carbs: 96, goodFat: 1, badFat: 1 } },
  { id: 'res-wood', name: 'Wood', category: 'wood', spoilageRate: 'never', weight: 5, emoji: '🪵', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false },
  { id: 'res-wheat', name: 'Wheat', category: 'food', spoilageRate: 'slow', weight: 0.5, emoji: '🌾', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false,
    nutrition: { kcalPerKg: 3390, vitamins: ['B', 'E'], protein: 15, carbs: 80, goodFat: 4, badFat: 1 } },
  { id: 'res-milk', name: 'Milk', category: 'food', spoilageRate: 'fast', weight: 1, emoji: '🥛', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false,
    nutrition: { kcalPerKg: 610, vitamins: ['A', 'B', 'D'], protein: 21, carbs: 30, goodFat: 27, badFat: 22 } },
  { id: 'res-meat', name: 'Meat', category: 'food', spoilageRate: 'fast', weight: 2, emoji: '🥩', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false,
    nutrition: { kcalPerKg: 2500, vitamins: ['B'], protein: 43, carbs: 0, goodFat: 30, badFat: 27 } },
  { id: 'res-leather', name: 'Leather', category: 'organics', spoilageRate: 'never', weight: 0.5, emoji: '🟫', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false },
  { id: 'res-egg', name: 'Egg', category: 'food', spoilageRate: 'medium', weight: 0.1, emoji: '🥚', interactionTypes: ['collect'], interactionRadius: 24, isBlocking: false,
    nutrition: { kcalPerKg: 1430, vitamins: ['A', 'B', 'D', 'E'], protein: 35, carbs: 3, goodFat: 38, badFat: 24 } },
];

export const createResourceSlice: StateCreator<
  ResourceSlice & { selectedId: string | null },
  [],
  [],
  ResourceSlice
> = (set, get) => ({
  resources: initialResources,
  draftResource: null,

  addResource: () => {
    const resources = get().resources;
    set({ draftResource: defaultResource(resources), selectedId: null });
  },

  saveResource: () => {
    const draft = get().draftResource;
    if (draft) {
      set((s) => ({
        resources: [...s.resources, draft],
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
    resources: s.resources.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),

  deleteResource: (id) => set((s) => ({
    resources: s.resources.filter((r) => r.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
});
