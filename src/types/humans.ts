// ==========================================
// Human System (Player & Villager)
// ==========================================

import type { Vector2, Direction } from './core';
import type { Creature } from './creatures';
import type { Inventory } from './tools';

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

export type HumanState = 'idle' | 'walking' | 'running' | 'working' | 'crafting' | 'trading';

export interface Human extends Creature {
  type: 'human';
  needs: HumanNeeds;
  stats: HumanStats;
  velocity: Vector2;
  facing: Direction;
  state: HumanState;
  inventory: Inventory;
}

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

export interface QuestRequirement {
  type: 'bring_material' | 'craft_tool' | 'tame_animal' | 'build_structure';
  targetId: string;
  quantity: number;
  current: number;
}

export interface VillagerQuest {
  id: string;
  description: string;
  requirements: QuestRequirement[];
  completed: boolean;
}

export interface VillagerTask {
  type: 'gather' | 'craft' | 'tame' | 'carry' | 'build' | 'farm' | 'tend' | 'guard';
  targetId?: string;
  targetPosition?: Vector2;
  progress: number;
  complexity?: number;  // Star rating required to perform this task
}

export interface Villager extends Human {
  isLocalPlayer: false;
  loyalty: VillagerLoyalty;
  recruitmentQuest?: VillagerQuest;  // Present if not yet recruited
  isRecruited: boolean;
  warningTimer: number;              // Time until leaving (when in warning state)
  daysUnhappy: number;               // Consecutive days with unmet needs (warning/leaving)
  currentTask?: VillagerTask;
}
