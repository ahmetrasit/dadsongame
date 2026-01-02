// ==========================================
// Main Types Export Hub
// Re-exports all types from domain-specific files for backward compatibility
// ==========================================

// Core Types
export type { Vector2, Direction } from './core';

// Time System
export type { GameTime, Season } from './time';
export { DAYS_PER_SEASON, DAYS_PER_YEAR } from './time';

// Material System
export type {
  MaterialCategory,
  SpoilageRate,
  MaterialDefinition,
  ItemCategory,
  ItemDefinition,
} from './materials';

// Tool System
export type {
  ToolProperty,
  ToolStarAllocation,
  ToolRequirement,
  Tool,
  ContainerType,
  Container,
  InventorySlot,
  Inventory,
} from './tools';

// Creature System
export type {
  Creature,
  PlantStage,
  SoilType,
  PlantNeeds,
  AliveYield,
  DeadYield,
  MaterialYield,
  PlantDefinition,
  Plant,
  AnimalCapability,
  AnimalNeeds,
  AnimalDefinition,
  AnimalState,
  Animal,
} from './creatures';

// Human System
export type {
  HumanNeeds,
  HumanStats,
  HumanState,
  Human,
  Player,
  VillagerLoyalty,
  QuestRequirement,
  VillagerQuest,
  VillagerTask,
  Villager,
} from './humans';

// World System
export type {
  Tile,
  BiomeType,
  WorldChunk,
  Island,
  Weather,
  WorldState,
  Entity,
  EntityRegistry,
} from './world';

// Building System
export type {
  BuildingType,
  BuildingFeature,
  BuildingStarAllocation,
  RoofTier,
  RoofDefinition,
  WallMaterial,
  WallSegment,
  BuildingBlueprint,
  BuildingMaterialRequirements,
  ConstructionPhase,
  BuildingConstruction,
  Building,
} from './buildings';
export { ROOF_TIERS } from './buildings';

// Crafting System
export type { CraftingSession } from './crafting';

// Ontology System (3-hierarchy crafting)
export type {
  Purity,
  MaterialState,
  Tier,
  HumanNeed,
  Form,
  Capability,
  FunctionalProperty,
  FunctionalCategory,
  NourishmentSubcategory,
  RecoverySubcategory,
  MobilitySubcategory,
  HaulingSubcategory,
  CraftingSubcategory,
  SignalingSubcategory,
  Subcategory,
  Verb,
  RawMaterial,
  ComponentRef,
  MadeOf,
  VerbCapacity,
  CanDo,
  CategorySatisfaction,
  CanBeUsedFor,
  ProductDefinition,
  ComponentRequirement,
  CategoryRequirements,
  CraftingMethod,
  MethodRequirement,
  CraftingRecipe,
  MaterialProperties,
  AssemblyPattern,
} from './ontology';
export { PURITY_MULTIPLIER, FRICTION, PULLING_POWER } from './ontology';

// Marketplace System
export type { MarketItem, MarketListing, Marketplace } from './marketplace';

// Multiplayer Types
export type {
  ConnectionState,
  Team,
  MultiplayerState,
  FastState,
  SlowState,
  WorldChange,
} from './multiplayer';

// Event Types
export type { GameEvent } from './events';

// Definition Registries
export type { GameDefinitions } from './definitions';

// Legacy Types (for scaffolded placeholder code)
export type {
  LocalPlayer,
  RemotePlayer,
  LegacyInventorySlot,
  LegacyInventory,
  LegacyPlayer,
  LegacyFastState,
} from './legacy';
