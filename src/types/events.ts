// ==========================================
// Event Types
// ==========================================

import type { Vector2 } from './core';
import type { Player } from './humans';
import type { MarketListing } from './marketplace';
import type { WorldChange } from './multiplayer';

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
