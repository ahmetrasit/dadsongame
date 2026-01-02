import { StateCreator } from 'zustand';

export interface StructureDefinition {
  id: string;
  name: string;
  category: 'heat-source' | 'crafting-station' | 'storage';
  heatLevel?: number;    // For heat sources like fire pit
  imageUrl?: string;
  emoji: string;
  width: number;         // In pixels
  height: number;
  isBlocking: boolean;
}

export interface StructurePlacement {
  id: string;
  definitionId: string;
  x: number;
  y: number;
  placedAtDay: number;
}

export interface StructureSlice {
  structures: StructureDefinition[];
  structurePlacements: StructurePlacement[];

  addStructurePlacement: (definitionId: string, x: number, y: number) => void;
  removeStructurePlacement: (id: string) => void;
}

let structureIdCounter = 0;

export const initialStructures: StructureDefinition[] = [
  {
    id: 'struct-fire-pit',
    name: 'Fire Pit',
    category: 'heat-source',
    heatLevel: 150,
    emoji: '🔥',
    width: 48,
    height: 48,
    isBlocking: false
  }
];

export const createStructureSlice: StateCreator<
  StructureSlice & { selectedId: string | null },
  [],
  [],
  StructureSlice
> = (set) => ({
  structures: initialStructures,
  structurePlacements: [],

  addStructurePlacement: (definitionId, x, y) => {
    structureIdCounter++;
    const placement: StructurePlacement = {
      id: `structure-${structureIdCounter}`,
      definitionId,
      x,
      y,
      placedAtDay: 1 // TODO: get from worldStore
    };
    set((s) => ({
      structurePlacements: [...s.structurePlacements, placement]
    }));
  },

  removeStructurePlacement: (id) => set((s) => ({
    structurePlacements: s.structurePlacements.filter(p => p.id !== id)
  }))
});
