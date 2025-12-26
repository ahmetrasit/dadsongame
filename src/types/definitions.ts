// ==========================================
// Definition Registries (loaded from data)
// ==========================================

import type { MaterialDefinition } from './materials';
import type { PlantDefinition, AnimalDefinition } from './creatures';
import type { Tile } from './world';

export interface GameDefinitions {
  materials: Map<string, MaterialDefinition>;
  plants: Map<string, PlantDefinition>;
  animals: Map<string, AnimalDefinition>;
  tiles: Map<number, Tile>;
}
