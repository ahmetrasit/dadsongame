import { StateCreator } from 'zustand';

// Resource-specific types
export interface ResourceDefinition {
  id: string;
  name: string;
  category: 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never';
  weight: number;
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

let resourceIdCounter = 0;
const genResourceId = () => `resource-${++resourceIdCounter}`;

export const defaultResource = (): ResourceDefinition => ({
  id: genResourceId(),
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
    set({ draftResource: defaultResource(), selectedId: null });
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
