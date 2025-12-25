import { create } from 'zustand';
import type { LegacyInventory as Inventory, LegacyInventorySlot as InventorySlot, ItemDefinition } from '@/types';

// Item definitions - will be expanded later
export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  'wood': {
    id: 'wood',
    name: 'Wood',
    description: 'A piece of wood. Good for crafting.',
    category: 'material',
    stackable: true,
    maxStack: 99,
    spriteKey: 'item-wood'
  },
  'stone': {
    id: 'stone',
    name: 'Stone',
    description: 'A chunk of stone.',
    category: 'material',
    stackable: true,
    maxStack: 99,
    spriteKey: 'item-stone'
  },
  'sword': {
    id: 'sword',
    name: 'Wooden Sword',
    description: 'A basic sword made of wood.',
    category: 'weapon',
    stackable: false,
    maxStack: 1,
    spriteKey: 'item-sword'
  },
  'pickaxe': {
    id: 'pickaxe',
    name: 'Pickaxe',
    description: 'Used to mine rocks and ores.',
    category: 'tool',
    stackable: false,
    maxStack: 1,
    spriteKey: 'item-pickaxe'
  },
  'apple': {
    id: 'apple',
    name: 'Apple',
    description: 'A fresh apple. Restores health.',
    category: 'consumable',
    stackable: true,
    maxStack: 20,
    spriteKey: 'item-apple'
  }
};

interface InventoryState {
  inventory: Inventory;
  isOpen: boolean;

  // Actions
  initInventory: (maxSlots?: number) => void;
  addItem: (itemId: string, quantity?: number) => boolean;
  removeItem: (slotIndex: number, quantity?: number) => boolean;
  moveItem: (fromSlot: number, toSlot: number) => void;
  selectSlot: (slotIndex: number) => void;
  selectNextSlot: () => void;
  selectPrevSlot: () => void;
  toggleInventory: () => void;
  setOpen: (isOpen: boolean) => void;
  getItemDefinition: (itemId: string) => ItemDefinition | undefined;
  getSelectedItem: () => InventorySlot | null;
}

const createEmptySlots = (count: number): InventorySlot[] =>
  Array.from({ length: count }, () => ({ itemId: null, quantity: 0 }));

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventory: {
    slots: createEmptySlots(20),
    maxSlots: 20,
    selectedSlot: 0
  },
  isOpen: false,

  initInventory: (maxSlots = 20) => {
    set({
      inventory: {
        slots: createEmptySlots(maxSlots),
        maxSlots,
        selectedSlot: 0
      }
    });
  },

  addItem: (itemId, quantity = 1) => {
    const state = get();
    const definition = ITEM_DEFINITIONS[itemId];
    if (!definition) return false;

    const slots = [...state.inventory.slots];
    let remaining = quantity;

    // First, try to stack with existing items
    if (definition.stackable) {
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        const slot = slots[i];
        if (slot.itemId === itemId && slot.quantity < definition.maxStack) {
          const canAdd = Math.min(remaining, definition.maxStack - slot.quantity);
          slots[i] = { itemId, quantity: slot.quantity + canAdd };
          remaining -= canAdd;
        }
      }
    }

    // Then, use empty slots
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];
      if (slot.itemId === null) {
        const canAdd = definition.stackable ? Math.min(remaining, definition.maxStack) : 1;
        slots[i] = { itemId, quantity: canAdd };
        remaining -= canAdd;
      }
    }

    if (remaining < quantity) {
      set({ inventory: { ...state.inventory, slots } });
      return remaining === 0;
    }

    return false; // Inventory full
  },

  removeItem: (slotIndex, quantity = 1) => {
    const state = get();
    const slots = [...state.inventory.slots];
    const slot = slots[slotIndex];

    if (!slot || slot.itemId === null) return false;

    const newQuantity = slot.quantity - quantity;
    if (newQuantity <= 0) {
      slots[slotIndex] = { itemId: null, quantity: 0 };
    } else {
      slots[slotIndex] = { ...slot, quantity: newQuantity };
    }

    set({ inventory: { ...state.inventory, slots } });
    return true;
  },

  moveItem: (fromSlot, toSlot) => {
    const state = get();
    const slots = [...state.inventory.slots];

    // Swap slots
    [slots[fromSlot], slots[toSlot]] = [slots[toSlot], slots[fromSlot]];

    set({ inventory: { ...state.inventory, slots } });
  },

  selectSlot: (slotIndex) => {
    set((state) => ({
      inventory: { ...state.inventory, selectedSlot: slotIndex }
    }));
  },

  selectNextSlot: () => {
    set((state) => ({
      inventory: {
        ...state.inventory,
        selectedSlot: (state.inventory.selectedSlot + 1) % state.inventory.maxSlots
      }
    }));
  },

  selectPrevSlot: () => {
    set((state) => ({
      inventory: {
        ...state.inventory,
        selectedSlot:
          (state.inventory.selectedSlot - 1 + state.inventory.maxSlots) %
          state.inventory.maxSlots
      }
    }));
  },

  toggleInventory: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  setOpen: (isOpen) => {
    set({ isOpen });
  },

  getItemDefinition: (itemId) => ITEM_DEFINITIONS[itemId],

  getSelectedItem: () => {
    const state = get();
    return state.inventory.slots[state.inventory.selectedSlot] ?? null;
  }
}));

// Selector hooks
export const useInventorySlots = () => useInventoryStore((state) => state.inventory.slots);
export const useSelectedSlot = () => useInventoryStore((state) => state.inventory.selectedSlot);
export const useInventoryOpen = () => useInventoryStore((state) => state.isOpen);
