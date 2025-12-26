// ==========================================
// Tool System
// ==========================================

export type ToolProperty =
  | 'cutting'
  | 'digging'
  | 'smashing'
  | 'hammering'
  | 'reaching'
  | 'damaging'
  | 'piercing'
  | 'grinding'
  | 'scooping'
  | 'precision';

export interface ToolStarAllocation {
  cutting: number;
  digging: number;
  smashing: number;
  hammering: number;
  reaching: number;
  damaging: number;
  piercing: number;
  grinding: number;
  scooping: number;
  precision: number;
}

export interface ToolRequirement {
  property: ToolProperty;
  min: number;
  max?: number;  // If undefined, no max limit
}

export interface Tool {
  id: string;
  name: string;
  stars: ToolStarAllocation;
  length: number;
  weight: number;
  durability: number;
  maxDurability: number;
  spriteKey: string;
}

// ==========================================
// Carrying System
// ==========================================

export type ContainerType = 'pouch' | 'satchel' | 'basket';

export interface Container {
  id: string;
  type: ContainerType;
  capacity: number;        // Weight limit
  currentWeight: number;
  slots: InventorySlot[];
}

export interface InventorySlot {
  itemId: string | null;
  itemType: 'material' | 'tool';
  quantity: number;
}

export interface Inventory {
  toolContainer: Container;      // Pouch or satchel
  materialContainer: Container;  // Basket
  selectedToolSlot: number;
}
