// ==========================================
// Crafting System
// ==========================================

import type { Tool, ToolStarAllocation } from './tools';

export interface CraftingSession {
  participants: string[];           // Villager IDs helping
  totalStars: number;               // Sum of participants' crafting skills
  allocation: ToolStarAllocation;   // How stars are distributed
  inProgress: boolean;
  progress: number;                 // 0-1
  resultingTool?: Tool;
}
