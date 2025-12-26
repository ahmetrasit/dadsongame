import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Point {
  x: number;
  y: number;
}

export interface River {
  id: string;
  points: Point[];
  closed: boolean;
}

export interface PlantPlacement {
  id: string;
  definitionId: string; // Reference to plant definition
  x: number;
  y: number;
}

export interface AnimalPlacement {
  id: string;
  definitionId: string; // Reference to animal definition
  x: number;
  y: number;
}

export interface WaterPlacement {
  id: string;
  definitionId: string; // Reference to water definition
  x: number;
  y: number;
}

export interface MapData {
  rivers: River[];
  plants: PlantPlacement[];
  animals: AnimalPlacement[];
  waters: WaterPlacement[];
  spawn: Point;
  // Legacy support
  trees?: { id: string; x: number; y: number }[];
}

export type EditorTool = 'none' | 'river' | 'plant' | 'animal' | 'water' | 'eraser' | 'spawn';

interface MapEditorState {
  // Editor state
  isEditing: boolean;
  currentTool: EditorTool;

  // Selected definition IDs for placement
  selectedPlantId: string | null;
  selectedAnimalId: string | null;
  selectedWaterId: string | null;

  // Current river being drawn
  activeRiver: Point[];

  // Map data
  mapData: MapData;

  // Actions
  toggleEditor: () => void;
  setEditing: (isEditing: boolean) => void;
  setTool: (tool: EditorTool) => void;

  // Selection actions
  setSelectedPlantId: (id: string | null) => void;
  setSelectedAnimalId: (id: string | null) => void;
  setSelectedWaterId: (id: string | null) => void;

  // River actions
  addRiverPoint: (point: Point) => void;
  closeRiver: () => void;
  cancelRiver: () => void;

  // Plant actions
  addPlant: (x: number, y: number) => void;
  removePlant: (id: string) => void;

  // Animal actions
  addAnimal: (x: number, y: number) => void;
  removeAnimal: (id: string) => void;

  // Water actions
  addWater: (x: number, y: number) => void;
  removeWater: (id: string) => void;

  // Legacy tree support
  addTree: (x: number, y: number) => void;
  removeTree: (id: string) => void;

  // Spawn
  setSpawn: (point: Point) => void;

  // Eraser
  eraseAt: (x: number, y: number, radius: number) => void;

  // Save/Load
  exportMap: () => string;
  importMap: (json: string) => void;
  clearMap: () => void;
}

let plantIdCounter = 0;
let animalIdCounter = 0;
let waterIdCounter = 0;
let riverIdCounter = 0;

export const useMapEditorStore = create<MapEditorState>()(
  persist(
    (set, get) => ({
      isEditing: false,
      currentTool: 'none',
      selectedPlantId: null,
      selectedAnimalId: null,
      selectedWaterId: null,
      activeRiver: [],

      mapData: {
        rivers: [],
        plants: [],
        animals: [],
        waters: [],
        spawn: { x: 160, y: 320 }
      },

      toggleEditor: () => set((state) => ({
        isEditing: !state.isEditing,
        currentTool: state.isEditing ? 'none' : 'plant',
        activeRiver: []
      })),

      setEditing: (isEditing) => set({
        isEditing,
        currentTool: isEditing ? 'plant' : 'none',
        activeRiver: []
      }),

      setTool: (tool) => set({ currentTool: tool, activeRiver: [] }),

      setSelectedPlantId: (id) => set({ selectedPlantId: id }),
      setSelectedAnimalId: (id) => set({ selectedAnimalId: id }),
      setSelectedWaterId: (id) => set({ selectedWaterId: id }),

      addRiverPoint: (point) => set((state) => ({
        activeRiver: [...state.activeRiver, point]
      })),

      closeRiver: () => set((state) => {
        if (state.activeRiver.length < 3) return state;

        const newRiver: River = {
          id: `river-${riverIdCounter++}`,
          points: [...state.activeRiver],
          closed: true
        };

        return {
          activeRiver: [],
          mapData: {
            ...state.mapData,
            rivers: [...state.mapData.rivers, newRiver]
          }
        };
      }),

      cancelRiver: () => set({ activeRiver: [] }),

      addPlant: (x, y) => set((state) => {
        const definitionId = state.selectedPlantId;
        if (!definitionId) {
          console.warn('No plant type selected');
          return state;
        }

        return {
          mapData: {
            ...state.mapData,
            plants: [
              ...state.mapData.plants,
              { id: `plant-${plantIdCounter++}`, definitionId, x, y }
            ]
          }
        };
      }),

      removePlant: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          plants: state.mapData.plants.filter(p => p.id !== id)
        }
      })),

      addAnimal: (x, y) => set((state) => {
        const definitionId = state.selectedAnimalId;
        if (!definitionId) {
          console.warn('No animal type selected');
          return state;
        }

        return {
          mapData: {
            ...state.mapData,
            animals: [
              ...state.mapData.animals,
              { id: `animal-${animalIdCounter++}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeAnimal: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          animals: state.mapData.animals.filter(a => a.id !== id)
        }
      })),

      addWater: (x, y) => set((state) => {
        const definitionId = state.selectedWaterId;
        if (!definitionId) {
          console.warn('No water type selected');
          return state;
        }

        return {
          mapData: {
            ...state.mapData,
            waters: [
              ...state.mapData.waters,
              { id: `water-${waterIdCounter++}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeWater: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          waters: state.mapData.waters.filter(w => w.id !== id)
        }
      })),

      // Legacy tree support - converts to plant placement
      addTree: (x, y) => set((state) => {
        const definitionId = state.selectedPlantId || 'plant-apple-tree';
        return {
          mapData: {
            ...state.mapData,
            plants: [
              ...state.mapData.plants,
              { id: `plant-${plantIdCounter++}`, definitionId, x, y }
            ]
          }
        };
      }),

      removeTree: (id) => set((state) => ({
        mapData: {
          ...state.mapData,
          plants: state.mapData.plants.filter(p => p.id !== id)
        }
      })),

      setSpawn: (point) => set((state) => ({
        mapData: { ...state.mapData, spawn: point }
      })),

      eraseAt: (x, y, radius) => set((state) => {
        // Remove plants within radius
        const plants = state.mapData.plants.filter(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove animals within radius
        const animals = state.mapData.animals.filter(a => {
          const dx = a.x - x;
          const dy = a.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove waters within radius
        const waters = state.mapData.waters.filter(w => {
          const dx = w.x - x;
          const dy = w.y - y;
          return Math.sqrt(dx * dx + dy * dy) > radius;
        });

        // Remove rivers that have points within radius
        const rivers = state.mapData.rivers.filter(r => {
          return !r.points.some(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            return Math.sqrt(dx * dx + dy * dy) <= radius;
          });
        });

        return {
          mapData: { ...state.mapData, plants, animals, waters, rivers }
        };
      }),

      exportMap: () => {
        return JSON.stringify(get().mapData, null, 2);
      },

      importMap: (json) => {
        try {
          const data = JSON.parse(json) as MapData;

          // Migrate legacy trees to plants
          if (data.trees && data.trees.length > 0 && (!data.plants || data.plants.length === 0)) {
            data.plants = data.trees.map(t => ({
              id: t.id,
              definitionId: 'plant-apple-tree', // Default to apple tree
              x: t.x,
              y: t.y
            }));
            delete data.trees;
          }

          // Ensure arrays exist
          if (!data.plants) data.plants = [];
          if (!data.animals) data.animals = [];
          if (!data.waters) data.waters = [];

          set({ mapData: data });
        } catch (e) {
          console.error('Failed to import map:', e);
        }
      },

      clearMap: () => set({
        mapData: { rivers: [], plants: [], animals: [], waters: [], spawn: { x: 160, y: 320 } },
        activeRiver: []
      })
    }),
    {
      name: 'map-editor-data',
      // Migrate old data on load
      onRehydrateStorage: () => (state) => {
        if (state?.mapData) {
          // Migrate legacy trees to plants
          const mapData = state.mapData as MapData & { trees?: { id: string; x: number; y: number }[] };
          if (mapData.trees && mapData.trees.length > 0 && (!mapData.plants || mapData.plants.length === 0)) {
            mapData.plants = mapData.trees.map(t => ({
              id: t.id,
              definitionId: 'plant-apple-tree',
              x: t.x,
              y: t.y
            }));
            delete mapData.trees;
          }
          if (!mapData.plants) mapData.plants = [];
          if (!mapData.animals) mapData.animals = [];
          if (!mapData.waters) mapData.waters = [];
        }
      }
    }
  )
);
