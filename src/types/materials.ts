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
