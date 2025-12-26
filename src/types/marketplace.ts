// ==========================================
// Marketplace System
// ==========================================

export interface MarketItem {
  type: 'material' | 'tool';
  itemId: string;
  quantity: number;
}

export interface MarketListing {
  id: string;
  sellerId: string;                 // Player/team ID
  sellerName: string;
  offeredItem: MarketItem;
  requestedItem: MarketItem;
  createdAt: number;                // Game time
  expiresAt?: number;               // For perishables
}

export interface Marketplace {
  listings: MarketListing[];
}
