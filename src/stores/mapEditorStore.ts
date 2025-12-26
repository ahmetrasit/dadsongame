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

export interface TreePlacement {
  id: string;
  x: number;
  y: number;
}

export interface MapData {
  rivers: River[];
  trees: TreePlacement[];
  spawn: Point;
}

export type EditorTool = 'none' | 'river' | 'tree' | 'eraser' | 'spawn';

interface MapEditorState {
  // Editor state
  isEditing: boolean;
  currentTool: EditorTool;

  // Current river being drawn
  activeRiver: Point[];

  // Map data
  mapData: MapData;

  // Actions
  toggleEditor: () => void;
  setEditing: (isEditing: boolean) => void;
  setTool: (tool: EditorTool) => void;

  // River actions
  addRiverPoint: (point: Point) => void;
  closeRiver: () => void;
  cancelRiver: () => void;

  // Tree actions
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

let treeIdCounter = 0;
let riverIdCounter = 0;

export const useMapEditorStore = create<MapEditorState>()(
  persist(
    (set, get) => ({
  isEditing: false,
  currentTool: 'none',
  activeRiver: [],

  mapData: {
    rivers: [],
    trees: [],
    spawn: { x: 160, y: 320 }
  },

  toggleEditor: () => set((state) => ({
    isEditing: !state.isEditing,
    currentTool: state.isEditing ? 'none' : 'tree',
    activeRiver: []
  })),

  setEditing: (isEditing) => set({
    isEditing,
    currentTool: isEditing ? 'tree' : 'none',
    activeRiver: []
  }),

  setTool: (tool) => set({ currentTool: tool, activeRiver: [] }),

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

  addTree: (x, y) => set((state) => ({
    mapData: {
      ...state.mapData,
      trees: [...state.mapData.trees, { id: `tree-${treeIdCounter++}`, x, y }]
    }
  })),

  removeTree: (id) => set((state) => ({
    mapData: {
      ...state.mapData,
      trees: state.mapData.trees.filter(t => t.id !== id)
    }
  })),

  setSpawn: (point) => set((state) => ({
    mapData: { ...state.mapData, spawn: point }
  })),

  eraseAt: (x, y, radius) => set((state) => {
    // Remove trees within radius
    const trees = state.mapData.trees.filter(t => {
      const dx = t.x - x;
      const dy = t.y - y;
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
      mapData: { ...state.mapData, trees, rivers }
    };
  }),

  exportMap: () => {
    return JSON.stringify(get().mapData, null, 2);
  },

  importMap: (json) => {
    try {
      const data = JSON.parse(json) as MapData;
      set({ mapData: data });
    } catch (e) {
      console.error('Failed to import map:', e);
    }
  },

  clearMap: () => set({
    mapData: { rivers: [], trees: [], spawn: { x: 160, y: 320 } },
    activeRiver: []
  })
}),
    { name: 'map-editor-data' }
  )
);
