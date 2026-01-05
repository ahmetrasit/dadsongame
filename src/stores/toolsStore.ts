import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CraftedTool, ToolSize, MaterialPurity, ToolFunctionAllocation } from '@/types/tools';
import { generateToolName, getMaterialCategory, getMaxPointsForMaterial } from '@/types/tools';
import { useInventoryStore } from './inventoryStore';
import { useWorldStore } from './worldStore';

interface ToolsState {
  // Crafted tools (stored separately, referenced by ID in inventory)
  craftedTools: CraftedTool[];

  // Tool crafting UI state
  isCraftingOpen: boolean;
  selectedHandle: string | null;
  selectedWorkingPart: string | null;
  selectedBinder: string | null;
  selectedSize: ToolSize;
  functionPoints: ToolFunctionAllocation;

  // Actions
  openCrafting: () => void;
  closeCrafting: () => void;
  selectHandle: (resourceId: string | null) => void;
  selectWorkingPart: (resourceId: string | null) => void;
  selectBinder: (resourceId: string | null) => void;
  setSize: (size: ToolSize) => void;
  setFunctionPoints: (func: keyof ToolFunctionAllocation, points: number) => void;
  resetFunctionPoints: () => void;

  // Crafting
  canCraft: () => { valid: boolean; error?: string };
  craftTool: () => CraftedTool | null;

  // Getters
  getTool: (toolId: string) => CraftedTool | undefined;
  getMaxPoints: () => number;
  getTotalPoints: () => number;
}

const emptyFunctionPoints: ToolFunctionAllocation = {
  cutting: 0,
  shaping: 0,
  piercing: 0,
  digging: 0,
  grinding: 0,
  scooping: 0,
};

export const useToolsStore = create<ToolsState>()(
  persist(
    (set, get) => ({
  craftedTools: [],

  // UI state
  isCraftingOpen: false,
  selectedHandle: null,
  selectedWorkingPart: null,
  selectedBinder: null,
  selectedSize: 'short',
  functionPoints: { ...emptyFunctionPoints },

  openCrafting: () => set({ isCraftingOpen: true }),

  closeCrafting: () => set({
    isCraftingOpen: false,
    selectedHandle: null,
    selectedWorkingPart: null,
    selectedBinder: null,
    selectedSize: 'short',
    functionPoints: { ...emptyFunctionPoints },
  }),

  selectHandle: (resourceId) => set({ selectedHandle: resourceId }),
  selectWorkingPart: (resourceId) => {
    set({ selectedWorkingPart: resourceId });
    // Reset function points when changing working part (max points may change)
    if (resourceId) {
      set({ functionPoints: { ...emptyFunctionPoints } });
    }
  },
  selectBinder: (resourceId) => set({ selectedBinder: resourceId }),
  setSize: (size) => set({ selectedSize: size }),

  setFunctionPoints: (func, points) => {
    const state = get();
    const maxPoints = state.getMaxPoints();
    const currentTotal = state.getTotalPoints();
    const currentForFunc = state.functionPoints[func];

    // Calculate how many points we can add
    const available = maxPoints - currentTotal + currentForFunc;
    const newPoints = Math.min(Math.max(0, points), available);

    set({
      functionPoints: {
        ...state.functionPoints,
        [func]: newPoints,
      },
    });
  },

  resetFunctionPoints: () => set({ functionPoints: { ...emptyFunctionPoints } }),

  canCraft: () => {
    const state = get();
    const { selectedHandle, selectedWorkingPart, selectedBinder } = state;

    if (!selectedHandle) return { valid: false, error: 'Select a handle material' };
    if (!selectedWorkingPart) return { valid: false, error: 'Select a working part material' };
    if (!selectedBinder) return { valid: false, error: 'Select a binder material' };

    const total = state.getTotalPoints();
    if (total === 0) return { valid: false, error: 'Allocate at least 1 function point' };

    // Check inventory has the materials
    const inventory = useInventoryStore.getState();
    const hasHandle = inventory.inventory.slots.some(s => s.itemId === selectedHandle && s.quantity >= 1);
    const hasWorkingPart = inventory.inventory.slots.some(s => s.itemId === selectedWorkingPart && s.quantity >= 1);
    const hasBinder = inventory.inventory.slots.some(s => s.itemId === selectedBinder && s.quantity >= 1);

    if (!hasHandle) return { valid: false, error: 'Missing handle material in inventory' };
    if (!hasWorkingPart) return { valid: false, error: 'Missing working part in inventory' };
    if (!hasBinder) return { valid: false, error: 'Missing binder in inventory' };

    return { valid: true };
  },

  craftTool: () => {
    const state = get();
    const validation = state.canCraft();
    if (!validation.valid) return null;

    const { selectedHandle, selectedWorkingPart, selectedBinder, selectedSize, functionPoints } = state;
    const inventory = useInventoryStore.getState();
    const world = useWorldStore.getState();

    // Remove materials from inventory
    const removed = inventory.removeItems([
      { itemId: selectedHandle!, quantity: 1 },
      { itemId: selectedWorkingPart!, quantity: 1 },
      { itemId: selectedBinder!, quantity: 1 },
    ]);

    if (!removed) return null;

    // Create the tool - calculate next ID from existing tools
    const maxId = state.craftedTools.reduce((max, t) => {
      const idNum = parseInt(t.id.replace('tool-', '')) || 0;
      return Math.max(max, idNum);
    }, 0);
    const nextToolId = maxId + 1;
    const totalPoints = state.getTotalPoints();
    const materialCategory = getMaterialCategory(selectedWorkingPart!);

    // Calculate durability based on materials
    const baseDurability = 100;
    const materialDurabilityBonus: Record<string, number> = {
      stone: 1.0, wood: 0.6, bone: 0.8, copper: 1.2, bronze: 1.5, iron: 2.0, steel: 2.5
    };
    const durability = Math.round(baseDurability * (materialDurabilityBonus[materialCategory] ?? 1.0));

    // Calculate weight based on size and materials
    const sizeWeight = selectedSize === 'long' ? 2.0 : 1.0;
    const materialWeight: Record<string, number> = {
      stone: 1.5, wood: 0.5, bone: 0.7, copper: 1.2, bronze: 1.4, iron: 1.6, steel: 1.8
    };
    const weight = Math.round((materialWeight[materialCategory] ?? 1.0) * sizeWeight * 10) / 10;

    // Determine purity (for now, all materials are medium purity)
    // This could be enhanced to read from resource definitions later
    const purity: MaterialPurity = 'medium';

    const tool: CraftedTool = {
      id: `tool-${nextToolId}`,
      name: generateToolName(selectedWorkingPart!, selectedSize, functionPoints),
      handleMaterial: selectedHandle!,
      workingPartMaterial: selectedWorkingPart!,
      binderMaterial: selectedBinder!,
      size: selectedSize,
      functionPoints: { ...functionPoints },
      totalPoints,
      durability,
      currentDurability: durability,
      weight,
      purity,
      craftedAtDay: world.day,
    };

    // Add tool to crafted tools list
    set(s => ({ craftedTools: [...s.craftedTools, tool] }));

    // Add tool to inventory
    inventory.addItem(tool.id, 1);

    // Reset crafting UI
    state.closeCrafting();

    return tool;
  },

  getTool: (toolId) => {
    return get().craftedTools.find(t => t.id === toolId);
  },

  getMaxPoints: () => {
    const { selectedWorkingPart } = get();
    if (!selectedWorkingPart) return 10; // Default primitive max
    return getMaxPointsForMaterial(getMaterialCategory(selectedWorkingPart));
  },

  getTotalPoints: () => {
    const { functionPoints } = get();
    return Object.values(functionPoints).reduce((a, b) => a + b, 0);
  },
    }),
    {
      name: 'tools-storage',
      partialize: (state) => ({ craftedTools: state.craftedTools }),
    }
  )
);
