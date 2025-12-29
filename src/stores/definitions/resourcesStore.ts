import { StateCreator } from 'zustand';

// Resource-specific types
export interface SpriteVersion {
  imageUrl: string;
  createdAt: number;
  version: number;
}

export interface ResourceDefinition {
  id: string;
  name: string;
  category: 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never';
  weight: number;
  imageUrl?: string;
  spriteVersions?: SpriteVersion[];
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
});

export const initialResources: ResourceDefinition[] = [
  { id: 'res-apple', name: 'Apple', category: 'food', spoilageRate: 'medium', weight: 0.2 },
  { id: 'res-wood', name: 'Wood', category: 'wood', spoilageRate: 'never', weight: 5 },
  { id: 'res-wheat', name: 'Wheat', category: 'food', spoilageRate: 'slow', weight: 0.5 },
  { id: 'res-milk', name: 'Milk', category: 'food', spoilageRate: 'fast', weight: 1 },
  { id: 'res-meat', name: 'Meat', category: 'food', spoilageRate: 'fast', weight: 2 },
  { id: 'res-leather', name: 'Leather', category: 'organics', spoilageRate: 'never', weight: 0.5 },
  { id: 'res-egg', name: 'Egg', category: 'food', spoilageRate: 'medium', weight: 0.1 },
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
