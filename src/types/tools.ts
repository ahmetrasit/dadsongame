// ==========================================
// Tool System
// ==========================================

// 6 Tool Functions (aligned with DESIGN.md)
export type ToolFunction =
  | 'cutting'
  | 'shaping'
  | 'piercing'
  | 'digging'
  | 'grinding'
  | 'scooping';

export interface ToolFunctionAllocation {
  cutting: number;
  shaping: number;
  piercing: number;
  digging: number;
  grinding: number;
  scooping: number;
}

// Legacy alias for backward compatibility
export type ToolProperty = ToolFunction;
export type ToolStarAllocation = ToolFunctionAllocation;

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
