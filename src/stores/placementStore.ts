import { create } from 'zustand';
import type { StackRecipe } from '@/types/bootstrap';

interface PlacementState {
  isPlacing: boolean;
  currentRecipe: StackRecipe | null;
  previewPosition: { x: number; y: number } | null;

  startPlacement: (recipe: StackRecipe) => void;
  updatePreview: (x: number, y: number) => void;
  confirmPlacement: () => void;
  cancelPlacement: () => void;
}

export const usePlacementStore = create<PlacementState>()((set, get) => ({
  isPlacing: false,
  currentRecipe: null,
  previewPosition: null,

  startPlacement: (recipe) => set({
    isPlacing: true,
    currentRecipe: recipe,
    previewPosition: null
  }),

  updatePreview: (x, y) => set({ previewPosition: { x, y } }),

  confirmPlacement: () => {
    const { currentRecipe, previewPosition } = get();
    if (!currentRecipe || !previewPosition) return;

    const { useInventoryStore } = require('./inventoryStore');
    const { useDefinitionsStore } = require('./definitionsStore');

    const inventoryStore = useInventoryStore.getState();
    const definitionsStore = useDefinitionsStore.getState();

    // Convert inputs to format for removeItems
    const itemsToRemove = currentRecipe.inputs.map(input => ({
      itemId: input.resourceId,
      quantity: input.quantity
    }));

    // Try to remove items
    const removed = inventoryStore.removeItems(itemsToRemove);
    if (!removed) {
      console.warn('Failed to remove items - insufficient resources');
      return;
    }

    // Place structure
    definitionsStore.addStructurePlacement(
      currentRecipe.outputId,
      previewPosition.x,
      previewPosition.y
    );

    console.log(`Placed ${currentRecipe.name} at (${previewPosition.x}, ${previewPosition.y})`);

    set({ isPlacing: false, currentRecipe: null, previewPosition: null });
  },

  cancelPlacement: () => set({
    isPlacing: false,
    currentRecipe: null,
    previewPosition: null
  })
}));
