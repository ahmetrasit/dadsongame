// ==========================================
// Core Types
// ==========================================

export interface Vector2 {
  x: number;
  y: number;
}

// ==========================================
// Legacy Types (for scaffolded placeholder code)
// TODO: Remove after implementing proper game systems
// ==========================================

export interface LocalPlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
  isLocalPlayer: true;
}

export interface RemotePlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
  lastUpdate: number;
  isLocalPlayer: false;
}

export type ItemCategory = 'tool' | 'weapon' | 'material' | 'consumable' | 'key';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  maxStack: number;
  spriteKey: string;
}

export interface LegacyInventorySlot {
  itemId: string | null;
  quantity: number;
}

export interface LegacyInventory {
  slots: LegacyInventorySlot[];
  maxSlots: number;
  selectedSlot: number;
}

// Simple player type for multiplayer service connection
export interface LegacyPlayer {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'walking' | 'running';
}

// Legacy FastState for placeholder multiplayer
export interface LegacyFastState {
  players: Record<string, {
    position: Vector2;
    velocity: Vector2;
    facing: string;
    state: string;
    timestamp: number;
  }>;
}

// ==========================================
// Time System
// ==========================================

export interface GameTime {
  day: number;           // Current day (1-120 in a year)
  timeOfDay: number;     // 0-1 (0 = midnight, 0.5 = noon)
  season: Season;
  year: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const DAYS_PER_SEASON = 30;
export const DAYS_PER_YEAR = 120;

// ==========================================
// Material System
// ==========================================

export type MaterialCategory = 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';

export type SpoilageRate = 'fast' | 'medium' | 'slow' | 'never';

export interface MaterialDefinition {
  id: string;
  name: string;
  description: string;
  category: MaterialCategory;
  spoilageRate: SpoilageRate;
  stackable: boolean;
  maxStack: number;
  weight: number;
  spriteKey: string;
}

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

// ==========================================
// Creature System (Base)
// ==========================================

export interface Creature {
  id: string;
  name: string;
  age: number;
  maxAge: number;
  health: number;
  maxHealth: number;
  growthRate: number;       // How fast it matures
  hunger: number;           // 0-100
  position: Vector2;
}

// ==========================================
// Plant System
// ==========================================

export type PlantStage = 'seed' | 'sprout' | 'mature' | 'withered';

export type SoilType = 'grass' | 'sand' | 'rock' | 'fertile' | 'swamp';

export interface PlantNeeds {
  water: number;           // 0-100
  sun: number;             // 0-100 (affected by time/season)
  suitableSoils: SoilType[];
}

export interface PlantDefinition {
  id: string;
  name: string;
  isTree: boolean;         // Trees are permanent once mature
  growthTime: number;      // Time to go from seed to mature
  harvestWindow: number;   // Time before withering (ignored for trees)
  seasons: Season[];       // Which seasons it can grow
  needs: PlantNeeds;
  yield: MaterialYield;
  spriteKey: string;
}

export interface Plant extends Creature {
  type: 'plant';
  definitionId: string;
  stage: PlantStage;
  needs: PlantNeeds;
  currentSoil: SoilType;
  stageProgress: number;   // 0-1 progress to next stage
}

// ==========================================
// Animal System
// ==========================================

export type AnimalCapability = 'eat' | 'carry' | 'transport' | 'produce';

export interface AnimalNeeds {
  food: number;            // 0-100
  water: number;           // 0-100
  shelter: boolean;        // Has access to shelter
  happiness: number;       // 0-100 (affects breeding, yield)
}

export interface AliveYield {
  resource: string;        // Material ID
  rate: number;            // Per in-game day
  requiresFed: boolean;
}

export interface DeadYield {
  resources: string[];     // Material IDs
}

export interface MaterialYield {
  alive?: AliveYield;
  dead?: DeadYield;
}

export interface AnimalDefinition {
  id: string;
  name: string;
  capabilities: AnimalCapability[];
  baseSpeed: number;
  baseIntelligence: number;
  maxEnergy: number;
  tamingDifficulty: number;
  yield: MaterialYield;
  spriteKey: string;
}

export interface Animal extends Creature {
  type: 'animal';
  definitionId: string;
  needs: AnimalNeeds;
  capabilities: AnimalCapability[];
  speed: number;
  intelligence: number;
  energy: number;
  maxEnergy: number;
  isTamed: boolean;
  isBaby: boolean;
  velocity: Vector2;
  facing: Direction;
  state: AnimalState;
}

export type AnimalState = 'idle' | 'walking' | 'eating' | 'sleeping' | 'working';
export type Direction = 'left' | 'right' | 'up' | 'down';

// ==========================================
// Human System (Player & Villager)
// ==========================================

export interface HumanNeeds {
  food: number;            // 0-100
  water: number;           // 0-100
  shelter: boolean;
  happiness: number;       // 0-100
}

export interface HumanStats {
  intelligence: number;
  strength: number;
  speed: number;
  craftingSkill: number;   // Affects star contribution
}

export interface Human extends Creature {
  type: 'human';
  needs: HumanNeeds;
  stats: HumanStats;
  velocity: Vector2;
  facing: Direction;
  state: HumanState;
  inventory: Inventory;
}

export type HumanState = 'idle' | 'walking' | 'running' | 'working' | 'crafting' | 'trading';

// ==========================================
// Player
// ==========================================

export interface Player extends Human {
  isLocalPlayer: true;
}

// ==========================================
// Villager
// ==========================================

export type VillagerLoyalty = 'happy' | 'content' | 'warning' | 'leaving';

export interface VillagerQuest {
  id: string;
  description: string;
  requirements: QuestRequirement[];
  completed: boolean;
}

export interface QuestRequirement {
  type: 'bring_material' | 'craft_tool' | 'tame_animal' | 'build_structure';
  targetId: string;
  quantity: number;
  current: number;
}

export interface Villager extends Human {
  isLocalPlayer: false;
  loyalty: VillagerLoyalty;
  recruitmentQuest?: VillagerQuest;  // Present if not yet recruited
  isRecruited: boolean;
  warningTimer: number;              // Time until leaving (when in warning state)
  currentTask?: VillagerTask;
}

export interface VillagerTask {
  type: 'gather' | 'craft' | 'tame' | 'carry' | 'build';
  targetId?: string;
  targetPosition?: Vector2;
  progress: number;
}

// ==========================================
// Crafting System
// ==========================================

export interface CraftingSession {
  participants: string[];           // Villager IDs helping
  totalStars: number;               // Sum of participants' crafting skills
  allocation: ToolStarAllocation;   // How stars are distributed
  inProgress: boolean;
  progress: number;                 // 0-1
  resultingTool?: Tool;
}

// ==========================================
// Marketplace System
// ==========================================

export interface MarketListing {
  id: string;
  sellerId: string;                 // Player/team ID
  sellerName: string;
  offeredItem: MarketItem;
  requestedItem: MarketItem;
  createdAt: number;                // Game time
  expiresAt?: number;               // For perishables
}

export interface MarketItem {
  type: 'material' | 'tool';
  itemId: string;
  quantity: number;
}

export interface Marketplace {
  listings: MarketListing[];
}

// ==========================================
// Building System
// ==========================================

export type BuildingType = 'roofed' | 'roofless';

export type BuildingFeature =
  | 'resting_speed'
  | 'weather_protection'
  | 'storage_general'
  | 'storage_cold'
  | 'crafting_speed'
  | 'kitchen'
  | 'stables'
  | 'happiness'
  | 'taming'
  | 'farming'
  | 'healing'
  | 'training'
  | 'repair'
  | 'dock'
  | 'water_collection';

export interface BuildingStarAllocation {
  resting_speed: number;
  weather_protection: number;
  storage_general: number;
  storage_cold: number;
  crafting_speed: number;
  kitchen: number;
  stables: number;
  happiness: number;
  taming: number;
  farming: number;
  healing: number;
  training: number;
  repair: number;
  dock: number;
  water_collection: number;
}

export type RoofTier = 'basic' | 'standard' | 'reinforced' | 'premium';

export interface RoofDefinition {
  tier: RoofTier;
  weatherProtectionMultiplier: number;  // 1x, 2x, 4x, 8x
  materials: {
    woodBase: number;
    branches?: number;
    wood?: number;
    rock?: number;
    brick?: number;
  };
}

export const ROOF_TIERS: Record<RoofTier, RoofDefinition> = {
  basic: { tier: 'basic', weatherProtectionMultiplier: 1, materials: { woodBase: 1, branches: 1 } },
  standard: { tier: 'standard', weatherProtectionMultiplier: 2, materials: { woodBase: 1, wood: 1 } },
  reinforced: { tier: 'reinforced', weatherProtectionMultiplier: 4, materials: { woodBase: 1, branches: 1, rock: 1 } },
  premium: { tier: 'premium', weatherProtectionMultiplier: 8, materials: { woodBase: 1, brick: 1 } },
};

export type WallMaterial = 'wood' | 'rock';

export interface BuildingBlueprint {
  id: string;
  name: string;
  tiles: Vector2[];              // List of tile positions that form the building
  walls: WallSegment[];          // Wall segments with materials
  doors: Vector2[];              // Door positions
  innerWalls: WallSegment[];     // Optional interior dividers
  roofTier?: RoofTier;           // Only for roofed buildings
  isEnclosed: boolean;
  interiorSize: number;          // Number of interior tiles (= stars available)
}

export interface WallSegment {
  start: Vector2;
  end: Vector2;
  material: WallMaterial;
}

export interface BuildingMaterialRequirements {
  wood: number;
  rock: number;
  metal: number;                 // For doors
  branches?: number;             // For roof
  brick?: number;                // For roof
}

export type ConstructionPhase = 'blueprint' | 'gathering' | 'building' | 'complete';

export interface BuildingConstruction {
  blueprintId: string;
  phase: ConstructionPhase;
  materialsGathered: BuildingMaterialRequirements;
  materialsRequired: BuildingMaterialRequirements;
  progress: number;              // 0-1 for building phase
  assignedWorkers: string[];     // Villager IDs
}

export interface Building {
  id: string;
  name: string;                  // User-defined name
  type: BuildingType;
  blueprint: BuildingBlueprint;
  stars: BuildingStarAllocation; // Only meaningful for roofed
  roofTier?: RoofTier;           // Only for roofed
  position: Vector2;             // Top-left corner in world
}

// ==========================================
// World System
// ==========================================

export interface Tile {
  id: number;
  walkable: boolean;
  soilType: SoilType;
  biome: BiomeType;
}

export type BiomeType = 'forest' | 'beach' | 'mountain' | 'plains' | 'swamp';

export interface WorldChunk {
  x: number;
  y: number;
  tiles: number[][];
  entities: string[];              // Entity IDs in this chunk
}

export interface Island {
  id: string;
  name: string;
  seed: number;
  chunks: Map<string, WorldChunk>;
  seasonOffset: number;            // Days offset from base season
  marketplacePosition: Vector2;
}

export interface WorldState {
  currentIsland: string;
  islands: Map<string, Island>;
  time: GameTime;
  weather: Weather;
}

export type Weather = 'clear' | 'rain' | 'snow' | 'storm';

// ==========================================
// Entity Registry
// ==========================================

export type Entity = Plant | Animal | Player | Villager;

export interface EntityRegistry {
  plants: Map<string, Plant>;
  animals: Map<string, Animal>;
  villagers: Map<string, Villager>;
  player: Player | null;
}

// ==========================================
// Multiplayer Types
// ==========================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  sharedInventory: Inventory;
}

export interface MultiplayerState {
  connectionState: ConnectionState;
  roomId: string | null;
  localPlayerId: string | null;
  team: Team | null;
  remotePlayers: Map<string, Player>;
  latency: number;
}

// Fast state = synced frequently (positions, actions)
export interface FastState {
  players: Record<string, {
    position: Vector2;
    velocity: Vector2;
    facing: Direction;
    state: HumanState;
    timestamp: number;
  }>;
}

// Slow state = persisted (inventory, world changes)
export interface SlowState {
  inventory: Inventory;
  worldChanges: WorldChange[];
  lastSaved: number;
}

export interface WorldChange {
  islandId: string;
  chunkKey: string;
  tileX: number;
  tileY: number;
  newTileId: number;
  timestamp: number;
}

// ==========================================
// Event Types
// ==========================================

export type GameEvent =
  | { type: 'player_move'; playerId: string; position: Vector2; velocity: Vector2 }
  | { type: 'player_action'; playerId: string; action: string; target?: string }
  | { type: 'world_change'; change: WorldChange }
  | { type: 'chat_message'; playerId: string; message: string }
  | { type: 'player_join'; player: Player }
  | { type: 'player_leave'; playerId: string }
  | { type: 'market_listing'; listing: MarketListing }
  | { type: 'market_purchase'; listingId: string; buyerId: string; quantity: number }
  | { type: 'villager_recruited'; villagerId: string }
  | { type: 'villager_left'; villagerId: string };

// ==========================================
// Definition Registries (loaded from data)
// ==========================================

export interface GameDefinitions {
  materials: Map<string, MaterialDefinition>;
  plants: Map<string, PlantDefinition>;
  animals: Map<string, AnimalDefinition>;
  tiles: Map<number, Tile>;
}
