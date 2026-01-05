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

// ==========================================
// Tool Crafting System
// ==========================================

export type ToolSize = 'short' | 'long';
export type MaterialPurity = 'low' | 'medium' | 'high';

export const TOOL_FUNCTIONS: ToolFunction[] = ['cutting', 'shaping', 'piercing', 'digging', 'grinding', 'scooping'];

// Purity multipliers (affects tool effectiveness)
export const PURITY_MULTIPLIERS: Record<MaterialPurity, number> = {
  low: 0.7,
  medium: 1.0,
  high: 1.3
};

// Material suitability for working parts (from DESIGN.md)
export const MATERIAL_SUITABILITY: Record<string, Record<ToolFunction, number>> = {
  stone: { cutting: 0.7, shaping: 0.8, piercing: 0.6, digging: 0.7, grinding: 0.9, scooping: 0.5 },
  wood: { cutting: 0.3, shaping: 0.4, piercing: 0.4, digging: 0.5, grinding: 0.3, scooping: 0.7 },
  bamboo: { cutting: 0.4, shaping: 0.5, piercing: 0.4, digging: 0.5, grinding: 0.4, scooping: 0.8 },
  bone: { cutting: 0.6, shaping: 0.5, piercing: 0.8, digging: 0.4, grinding: 0.5, scooping: 0.6 },
  copper: { cutting: 0.8, shaping: 0.7, piercing: 0.7, digging: 0.8, grinding: 0.6, scooping: 0.8 },
  bronze: { cutting: 0.9, shaping: 0.8, piercing: 0.8, digging: 0.9, grinding: 0.7, scooping: 0.9 },
  iron: { cutting: 1.0, shaping: 0.9, piercing: 0.9, digging: 1.0, grinding: 0.8, scooping: 1.0 },
  steel: { cutting: 1.2, shaping: 1.0, piercing: 1.0, digging: 1.1, grinding: 0.9, scooping: 1.0 },
  fiber: { cutting: 0.2, shaping: 0.2, piercing: 0.2, digging: 0.3, grinding: 0.2, scooping: 0.4 },
  hide: { cutting: 0.3, shaping: 0.3, piercing: 0.2, digging: 0.3, grinding: 0.2, scooping: 0.4 },
};

// Valid materials for tool components (resource categories)
export const HANDLE_MATERIALS = ['wood', 'bone', 'bamboo'] as const;
export const WORKING_PART_MATERIALS = ['stone', 'wood', 'bone', 'copper', 'bronze', 'iron', 'steel'] as const;
export const BINDER_MATERIALS = ['fiber', 'hide', 'metal'] as const;

export interface CraftedTool {
  id: string;
  name: string;
  // Components (resource IDs)
  handleMaterial: string;
  workingPartMaterial: string;
  binderMaterial: string;
  size: ToolSize;
  // Function points (player-allocated)
  functionPoints: ToolFunctionAllocation;
  // Calculated properties
  totalPoints: number;
  durability: number;
  currentDurability: number;
  weight: number;
  purity: MaterialPurity;
  craftedAtDay: number;
}

// Calculate effective power for a tool function
export function calculateEffectivePower(
  tool: CraftedTool,
  func: ToolFunction
): number {
  const allocated = tool.functionPoints[func] || 0;
  if (allocated === 0) return 0;

  const materialKey = getMaterialCategory(tool.workingPartMaterial);
  const suitability = MATERIAL_SUITABILITY[materialKey]?.[func] ?? 0.5;
  const purityMult = PURITY_MULTIPLIERS[tool.purity];

  return allocated * suitability * purityMult;
}

// Extract material category from resource ID (res-stone → stone)
export function getMaterialCategory(resourceId: string): string {
  const match = resourceId.match(/^res-(.+?)(?:-|$)/);
  return match ? match[1] : resourceId;
}

// Get max points for material tier
export function getMaxPointsForMaterial(materialCategory: string): number {
  if (['stone', 'wood', 'bone'].includes(materialCategory)) return 10;  // T1 Primitive
  if (['copper'].includes(materialCategory)) return 20;                  // T2 Agricultural
  if (['bronze', 'iron'].includes(materialCategory)) return 30;          // T3 Metallurgical
  if (['steel'].includes(materialCategory)) return 50;                   // T4 Mechanical
  return 10;
}

// Validate tool crafting
export function validateToolCraft(
  handleId: string | null,
  workingPartId: string | null,
  binderId: string | null,
  functionPoints: ToolFunctionAllocation
): { valid: boolean; error?: string } {
  if (!handleId) return { valid: false, error: 'Handle required' };
  if (!workingPartId) return { valid: false, error: 'Working part required' };
  if (!binderId) return { valid: false, error: 'Binder required' };

  const totalPoints = Object.values(functionPoints).reduce((a, b) => a + b, 0);
  if (totalPoints === 0) return { valid: false, error: 'Allocate at least 1 function point' };

  const materialCategory = getMaterialCategory(workingPartId);
  const maxPoints = getMaxPointsForMaterial(materialCategory);

  if (totalPoints > maxPoints) {
    return { valid: false, error: `Max ${maxPoints} points for ${materialCategory}` };
  }

  return { valid: true };
}

// Generate a name for a crafted tool based on primary function
export function generateToolName(
  workingPartMaterial: string,
  size: ToolSize,
  functionPoints: ToolFunctionAllocation
): string {
  // Find the function with most points
  let primaryFunc: ToolFunction = 'cutting';
  let maxPoints = 0;
  for (const func of TOOL_FUNCTIONS) {
    if (functionPoints[func] > maxPoints) {
      maxPoints = functionPoints[func];
      primaryFunc = func;
    }
  }

  const materialName = getMaterialCategory(workingPartMaterial);
  const capMaterial = materialName.charAt(0).toUpperCase() + materialName.slice(1);

  // Map function to tool type names
  const toolNames: Record<ToolFunction, [string, string]> = {
    cutting: ['Knife', 'Axe'],
    shaping: ['Chisel', 'Adze'],
    piercing: ['Awl', 'Spear'],
    digging: ['Trowel', 'Shovel'],
    grinding: ['Pestle', 'Grinder'],
    scooping: ['Scoop', 'Ladle'],
  };

  const [shortName, longName] = toolNames[primaryFunc];
  return `${capMaterial} ${size === 'long' ? longName : shortName}`;
}
