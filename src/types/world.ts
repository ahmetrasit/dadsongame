// ==========================================
// World System
// ==========================================

import type { Vector2 } from './core';
import type { GameTime } from './time';
import type { SoilType, Plant, Animal } from './creatures';
import type { Player, Villager } from './humans';

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

export type Weather = 'clear' | 'rain' | 'snow' | 'storm';

export interface WorldState {
  currentIsland: string;
  islands: Map<string, Island>;
  time: GameTime;
  weather: Weather;
}

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
