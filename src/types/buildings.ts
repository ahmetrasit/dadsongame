// ==========================================
// Building System
// ==========================================

import type { Vector2 } from './core';

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

export interface WallSegment {
  start: Vector2;
  end: Vector2;
  material: WallMaterial;
}

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
