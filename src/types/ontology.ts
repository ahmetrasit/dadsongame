// ==========================================
// Crafting Ontology System
// 3-hierarchy approach: Made Of, Can Do, Can Be Used For
// ==========================================

// ==========================================
// Enums and Constants
// ==========================================

export type Purity = 'low' | 'med' | 'high';
export type MaterialState = 'raw' | 'processed' | 'refined';
export type Tier = 1 | 2 | 3 | 4 | 5;

// 6 Human Needs
export type HumanNeed =
  | 'Eat_and_Drink'
  | 'Recover'
  | 'Move'
  | 'Carry'
  | 'Make'
  | 'Talk';

// 30 Forms from property-hierarchy.md
export type Form =
  // Base Forms (20)
  | 'spike' | 'blade' | 'wedge' | 'rod' | 'tube' | 'sheet' | 'bowl' | 'box'
  | 'wheel' | 'ball' | 'ring' | 'hook' | 'frame' | 'mesh' | 'block' | 'cord'
  | 'hinge' | 'handle' | 'platform' | 'enclosure'
  // Advanced Forms (10, Tier 2-5)
  | 'cone' | 'trough' | 'saddle' | 'bellows' | 'helix' | 'valve'
  | 'gear' | 'cam' | 'piston' | 'lens';

// 35 Capabilities from property-hierarchy.md
export type Capability =
  // Base Capabilities (23)
  | 'can_cut' | 'can_pierce' | 'can_scrape' | 'can_contain_liquid' | 'can_contain_solid'
  | 'can_roll' | 'can_spin' | 'can_support_weight' | 'can_float' | 'can_grip'
  | 'can_bind' | 'can_wrap' | 'can_seal' | 'can_strike' | 'can_lever'
  | 'can_hook' | 'can_wedge' | 'can_spring' | 'can_conduct_heat' | 'can_insulate'
  | 'can_absorb' | 'can_reflect' | 'can_grind'
  // Additional Capabilities (12, Tier 1-5)
  | 'can_dig' | 'can_scoop' | 'can_reach' | 'can_channel' | 'can_pump'
  | 'can_control_flow' | 'can_amplify_sound' | 'can_thread'
  | 'can_store_mechanical_energy' | 'can_mesh' | 'can_convert_motion' | 'can_focus';

// 18 Functional Properties from property-hierarchy.md
export type FunctionalProperty =
  // Base Functional (12)
  | 'mobile' | 'floating' | 'stable' | 'contained' | 'controlled' | 'cutting'
  | 'heated' | 'powered' | 'flowing' | 'amplified' | 'preserved' | 'geared'
  // Talk Coverage (3)
  | 'communicating_near' | 'signaling_visual' | 'recorded'
  // Recover Coverage (3)
  | 'resting' | 'healing' | 'sheltering';

// 6 Functional Categories
export type FunctionalCategory =
  | 'Nourishment'
  | 'Recovery'
  | 'Mobility'
  | 'Hauling'
  | 'Crafting'
  | 'Signaling';

// Subcategories for each functional category
export type NourishmentSubcategory = 'cooking' | 'preservation';
export type RecoverySubcategory = 'resting' | 'healing';
export type MobilitySubcategory = 'land' | 'water' | 'sled';
export type HaulingSubcategory = 'carried' | 'stationary';
export type CraftingSubcategory = 'cutting' | 'shaping' | 'heating' | 'joining';
export type SignalingSubcategory = 'audible' | 'visual' | 'recorded';

export type Subcategory =
  | NourishmentSubcategory
  | RecoverySubcategory
  | MobilitySubcategory
  | HaulingSubcategory
  | CraftingSubcategory
  | SignalingSubcategory;

// 53 Core Verbs from storyline.md
export type Verb =
  // Gathering (9)
  | 'pick' | 'dig' | 'chop' | 'collect' | 'catch' | 'pull' | 'break' | 'hunt' | 'mine'
  // Processing (15)
  | 'heat' | 'cool' | 'mix' | 'shape' | 'cut' | 'grind' | 'press' | 'dry'
  | 'soak' | 'cook' | 'clean' | 'join' | 'melt' | 'pour' | 'scrape'
  // Textile (5)
  | 'spin' | 'weave' | 'sew' | 'stuff' | 'tie'
  // Building (6)
  | 'build' | 'place' | 'stack' | 'fix' | 'remove' | 'assemble'
  // Social (6)
  | 'teach' | 'learn' | 'trade' | 'give' | 'ask' | 'lead'
  // Transport (5)
  | 'carry' | 'load' | 'send' | 'store'
  // Farming (4)
  | 'plant' | 'harvest' | 'grow' | 'breed'
  // Care (4)
  | 'feed' | 'water' | 'rest' | 'heal';

// ==========================================
// 1. Made Of (Composition)
// ==========================================

export interface RawMaterial {
  materialId: string;      // Reference to ResourceDefinition
  amount: number;          // Units consumed
  purity: Purity;          // Affects output quality
  state: MaterialState;    // Processing stage required
}

export interface ComponentRef {
  componentId: string;     // Reference to another ProductDefinition
  count: number;           // How many needed
}

export interface MadeOf {
  raw: RawMaterial[];
  components: ComponentRef[];
}

// ==========================================
// 2. Can Do (Enabled Verbs)
// ==========================================

export interface VerbCapacity {
  verb: Verb;
  capacity: number;        // Power/force/speed/etc.
  unit: string;            // 'kg' | 'tiles/s' | 'power' | 'force' | 'heat'
  requires?: string[];     // Conditions like 'hitched_to_animal'
}

export type CanDo = VerbCapacity[];

// ==========================================
// 3. Can Be Used For (Functional Categories)
// ==========================================

export interface CategorySatisfaction {
  category: FunctionalCategory;
  subcategory: Subcategory;
  calculatedValues?: Record<string, number>;  // e.g., { speed: 2.5, max_load: 320 }
}

export type CanBeUsedFor = CategorySatisfaction[];

// ==========================================
// Product Definition
// ==========================================

export interface ProductDefinition {
  id: string;
  name: string;
  description: string;
  tier: Tier;

  // 3 Ontology Hierarchies
  madeOf: MadeOf;
  canDo: CanDo;
  canBeUsedFor: CanBeUsedFor;

  // Derived/calculated properties (computed from madeOf)
  weight?: number;         // Total weight from materials
  durability?: number;     // Based on material strength

  // Display
  spriteKey: string;
}

// ==========================================
// Category Requirements (for validation)
// ==========================================

export interface ComponentRequirement {
  type: 'component' | 'form' | 'capability';
  value: string;           // component id, form name, or capability name
  count?: number;          // minimum count (default 1)
  optional?: boolean;      // true if OR condition
}

export interface CategoryRequirements {
  category: FunctionalCategory;
  subcategory: Subcategory;
  requires: ComponentRequirement[];
  formula: string;         // Formula expression
  enabledVerbs: Verb[];
  satisfiesNeed: HumanNeed;
}

// ==========================================
// Tool Dependency System
// ==========================================

export type CraftingMethod = 'by_hand' | 'with_cutting' | 'with_shaping' | 'with_heating' | 'with_joining';

export interface MethodRequirement {
  method: CraftingMethod;
  requiredCategory?: CraftingSubcategory;  // Which tool category needed
  minPower?: Record<string, number>;       // { soft: 10, medium: 30, hard: 50, metal: 70 }
}

export interface CraftingRecipe {
  productId: string;
  method: CraftingMethod;
  minToolPower?: number;   // If tool required, minimum power needed
  craftTime: number;       // In game-time units
  skillRequired?: number;  // Minimum crafting skill (0-100)
}

// ==========================================
// Material Properties (for calculations)
// ==========================================

export interface MaterialProperties {
  hardness: number;        // 0-100
  strength: number;        // 0-100
  weight: number;          // kg per unit
  conductivity?: number;   // heat/electrical
  flexibility?: number;    // 0-100
  waterproof?: boolean;
}

// ==========================================
// Assembly Patterns
// ==========================================

export interface AssemblyPattern {
  id: string;
  name: string;
  tier: Tier;
  requires: ComponentRequirement[];
  enables: {
    capabilities: Capability[];
    properties: FunctionalProperty[];
  };
  formula?: string;
}

// ==========================================
// Purity Multipliers
// ==========================================

export const PURITY_MULTIPLIER: Record<Purity, number> = {
  low: 0.7,
  med: 1.0,
  high: 1.3,
};

// ==========================================
// Friction Constants
// ==========================================

export const FRICTION: Record<string, number> = {
  wheels: 0.1,
  sled: 0.3,
  drag: 1.0,
};

// ==========================================
// Pulling Power (kg force)
// ==========================================

export const PULLING_POWER: Record<string, { power: number; carry: number }> = {
  child: { power: 5, carry: 3 },
  human: { power: 50, carry: 25 },
  strong_human: { power: 80, carry: 40 },
  donkey: { power: 100, carry: 50 },
  horse: { power: 300, carry: 100 },
  ox: { power: 500, carry: 0 },
};
