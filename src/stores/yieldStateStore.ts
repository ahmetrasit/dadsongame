import { create } from 'zustand';
import type { Season } from '@/stores/definitions';

/**
 * Tracks the runtime yield state for placed plants and animals.
 * This is separate from the placement data (which is saved) -
 * yield state is recalculated based on the current season.
 */

// State for a single yield type on a placement
export interface YieldState {
  yieldIndex: number;           // Index in the aliveYields array
  remaining: number;            // Remaining yield count
  total: number;                // Total yield available this season
  isAvailable: boolean;         // Whether yield is available (season matches)
}

// State for a single placement (plant or animal)
export interface PlacementYieldState {
  placementId: string;
  placementType: 'plant' | 'animal';
  yields: YieldState[];
}

interface YieldStateStore {
  // Map of placementId -> yield state
  yieldStates: Map<string, PlacementYieldState>;

  // Initialize yield state for a placement based on current season
  initYieldState: (
    placementId: string,
    placementType: 'plant' | 'animal',
    aliveYields: { amount: number; seasons: Season[] }[],
    currentSeason: Season
  ) => void;

  // Harvest a yield (reduce remaining count)
  harvestYield: (placementId: string, yieldIndex: number, amount?: number) => number;

  // Get remaining yield for a placement
  getRemainingYield: (placementId: string, yieldIndex: number) => number;

  // Get all yield states for a placement
  getPlacementYields: (placementId: string) => PlacementYieldState | undefined;

  // Check if any yields are available for a placement
  hasAvailableYield: (placementId: string) => boolean;

  // Reset yields for a new season
  resetForSeason: (
    placements: { id: string; type: 'plant' | 'animal'; aliveYields: { amount: number; seasons: Season[] }[] }[],
    newSeason: Season
  ) => void;

  // Clear yield state for removed placements
  removePlacement: (placementId: string) => void;

  // Clear all yield states
  clearAll: () => void;
}

export const useYieldStateStore = create<YieldStateStore>((set, get) => ({
  yieldStates: new Map(),

  initYieldState: (placementId, placementType, aliveYields, currentSeason) => {
    const yields: YieldState[] = aliveYields.map((yield_, index) => {
      const isAvailable = yield_.seasons.includes(currentSeason);
      return {
        yieldIndex: index,
        remaining: isAvailable ? yield_.amount : 0,
        total: yield_.amount,
        isAvailable,
      };
    });

    set((state) => {
      const newMap = new Map(state.yieldStates);
      newMap.set(placementId, {
        placementId,
        placementType,
        yields,
      });
      return { yieldStates: newMap };
    });
  },

  harvestYield: (placementId, yieldIndex, amount = 1) => {
    const state = get();
    const placementState = state.yieldStates.get(placementId);

    if (!placementState) return 0;

    const yieldState = placementState.yields[yieldIndex];
    if (!yieldState || !yieldState.isAvailable || yieldState.remaining <= 0) {
      return 0;
    }

    const harvested = Math.min(amount, yieldState.remaining);

    set((s) => {
      const newMap = new Map(s.yieldStates);
      const newPlacementState = { ...placementState };
      newPlacementState.yields = [...placementState.yields];
      newPlacementState.yields[yieldIndex] = {
        ...yieldState,
        remaining: yieldState.remaining - harvested,
      };
      newMap.set(placementId, newPlacementState);
      return { yieldStates: newMap };
    });

    return harvested;
  },

  getRemainingYield: (placementId, yieldIndex) => {
    const placementState = get().yieldStates.get(placementId);
    if (!placementState) return 0;
    return placementState.yields[yieldIndex]?.remaining ?? 0;
  },

  getPlacementYields: (placementId) => {
    return get().yieldStates.get(placementId);
  },

  hasAvailableYield: (placementId) => {
    const placementState = get().yieldStates.get(placementId);
    if (!placementState) return false;
    return placementState.yields.some(y => y.isAvailable && y.remaining > 0);
  },

  resetForSeason: (placements, newSeason) => {
    set((state) => {
      const newMap = new Map(state.yieldStates);

      for (const placement of placements) {
        const yields: YieldState[] = placement.aliveYields.map((yield_, index) => {
          const isAvailable = yield_.seasons.includes(newSeason);
          return {
            yieldIndex: index,
            remaining: isAvailable ? yield_.amount : 0,
            total: yield_.amount,
            isAvailable,
          };
        });

        newMap.set(placement.id, {
          placementId: placement.id,
          placementType: placement.type,
          yields,
        });
      }

      return { yieldStates: newMap };
    });
  },

  removePlacement: (placementId) => {
    set((state) => {
      const newMap = new Map(state.yieldStates);
      newMap.delete(placementId);
      return { yieldStates: newMap };
    });
  },

  clearAll: () => {
    set({ yieldStates: new Map() });
  },
}));

// Selectors
export const useYieldState = (placementId: string) =>
  useYieldStateStore((s) => s.yieldStates.get(placementId));

export const useHasAvailableYield = (placementId: string) =>
  useYieldStateStore((s) => s.hasAvailableYield(placementId));
