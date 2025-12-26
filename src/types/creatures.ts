// ==========================================
// Creature System (Base)
// ==========================================

import type { Vector2, Direction } from './core';
import type { Season } from './time';

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

export type AnimalState = 'idle' | 'walking' | 'eating' | 'sleeping' | 'working';

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
