import { create } from 'zustand';
import type { LegacyInventory as Inventory, LegacyInventorySlot as InventorySlot, ItemDefinition } from '@/types';
import { useDefinitionsStore } from './definitionsStore';

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
  canAddItem: (itemId: string, quantity?: number) => boolean;
  removeItem: (slotIndex: number, quantity?: number) => boolean;
  removeItems: (items: { itemId: string; quantity: number }[]) => boolean;
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

// Log inventory contents to console
const logInventory = (slots: InventorySlot[], action: string) => {
  const items = slots
    .filter(s => s.itemId !== null)
    .map(s => `${s.itemId} x${s.quantity}`);

  console.log(`[Inventory] ${action}`);
  if (items.length === 0) {
    console.log('  (empty)');
  } else {
    items.forEach(item => console.log(`  • ${item}`));
  }
  console.log(`  Total: ${items.length} item type(s)`);
};

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

    // Try ITEM_DEFINITIONS first (for tools, weapons)
    let definition = ITEM_DEFINITIONS[itemId];

    // If not found, try resource definitions
    if (!definition) {
      const defStore = useDefinitionsStore.getState();
      const resource = defStore.resources.find(r => r.id === itemId);
      if (resource) {
        definition = {
          id: resource.id,
          name: resource.name,
          description: `${resource.category} material`,
          category: 'material',
          stackable: true,
          maxStack: 99,
          spriteKey: resource.imageUrl || `item-${resource.category}`
        };
      }
    }

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
      logInventory(slots, `Added ${quantity - remaining}x ${itemId}`);
      return remaining === 0;
    }

    console.log(`[Inventory] Failed to add ${itemId} - inventory full`);
    return false; // Inventory full
  },

  canAddItem: (itemId, quantity = 1) => {
    const state = get();

    // Try ITEM_DEFINITIONS first (for tools, weapons)
    let definition = ITEM_DEFINITIONS[itemId];

    // If not found, try resource definitions
    if (!definition) {
      const defStore = useDefinitionsStore.getState();
      const resource = defStore.resources.find(r => r.id === itemId);
      if (resource) {
        definition = {
          id: resource.id,
          name: resource.name,
          description: `${resource.category} material`,
          category: 'material',
          stackable: true,
          maxStack: 99,
          spriteKey: resource.imageUrl || `item-${resource.category}`
        };
      }
    }

    if (!definition) return false;

    const slots = state.inventory.slots;
    let canFit = 0;

    // Count space in existing stacks
    if (definition.stackable) {
      for (const slot of slots) {
        if (slot.itemId === itemId && slot.quantity < definition.maxStack) {
          canFit += definition.maxStack - slot.quantity;
        }
      }
    }

    // Count empty slots
    for (const slot of slots) {
      if (slot.itemId === null) {
        canFit += definition.stackable ? definition.maxStack : 1;
      }
    }

    return canFit >= quantity;
  },

  removeItem: (slotIndex, quantity = 1) => {
    const state = get();
    const slots = [...state.inventory.slots];
    const slot = slots[slotIndex];

    if (!slot || slot.itemId === null) return false;

    const itemId = slot.itemId;
    const newQuantity = slot.quantity - quantity;
    if (newQuantity <= 0) {
      slots[slotIndex] = { itemId: null, quantity: 0 };
    } else {
      slots[slotIndex] = { ...slot, quantity: newQuantity };
    }

    set({ inventory: { ...state.inventory, slots } });
    logInventory(slots, `Removed ${quantity}x ${itemId}`);
    return true;
  },

  removeItems: (items) => {
    const state = get();
    const slots = [...state.inventory.slots];

    // First verify we have all items
    for (const item of items) {
      const total = slots
        .filter(s => s.itemId === item.itemId)
        .reduce((sum, s) => sum + s.quantity, 0);
      if (total < item.quantity) {
        console.log(`[Inventory] Failed to remove items - insufficient ${item.itemId}`);
        return false;
      }
    }

    // Remove items
    for (const item of items) {
      let remaining = item.quantity;
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        if (slots[i].itemId === item.itemId) {
          const toRemove = Math.min(remaining, slots[i].quantity);
          slots[i] = {
            itemId: slots[i].quantity - toRemove > 0 ? item.itemId : null,
            quantity: slots[i].quantity - toRemove
          };
          remaining -= toRemove;
        }
      }
    }

    set({ inventory: { ...state.inventory, slots } });
    const summary = items.map(i => `${i.quantity}x ${i.itemId}`).join(', ');
    logInventory(slots, `Removed ${summary}`);
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

  getItemDefinition: (itemId) => {
    // Try ITEM_DEFINITIONS first
    let definition = ITEM_DEFINITIONS[itemId];

    // If not found, try resource definitions
    if (!definition) {
      const defStore = useDefinitionsStore.getState();
      const resource = defStore.resources.find(r => r.id === itemId);
      if (resource) {
        definition = {
          id: resource.id,
          name: resource.name,
          description: `${resource.category} material`,
          category: 'material',
          stackable: true,
          maxStack: 99,
          spriteKey: resource.imageUrl || `item-${resource.category}`
        };
      }
    }

    return definition;
  },

  getSelectedItem: () => {
    const state = get();
    return state.inventory.slots[state.inventory.selectedSlot] ?? null;
  }
}));

// Selector hooks
export const useInventorySlots = () => useInventoryStore((state) => state.inventory.slots);
export const useSelectedSlot = () => useInventoryStore((state) => state.inventory.selectedSlot);
export const useInventoryOpen = () => useInventoryStore((state) => state.isOpen);
