import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Season } from '@/stores/definitions';
import { useWorldStore } from '@/stores/worldStore';

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
  lastHarvestDay: number | null; // Day when last harvested (for interval-based regeneration)
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

  // Regenerate a yield (reset remaining to total, update lastHarvestDay)
  regenerateYield: (placementId: string, yieldIndex: number, currentDay: number) => void;
}

export const useYieldStateStore = create<YieldStateStore>()(
  persist(
    (set, get) => ({
  yieldStates: new Map(),

  initYieldState: (placementId, placementType, aliveYields, currentSeason) => {
    const yields: YieldState[] = aliveYields.map((yield_, index) => {
      const isAvailable = yield_.seasons.includes(currentSeason);
      return {
        yieldIndex: index,
        remaining: isAvailable ? yield_.amount : 0,
        total: yield_.amount,
        isAvailable,
        lastHarvestDay: null,
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
    const currentDay = useWorldStore.getState().day;

    set((s) => {
      const newMap = new Map(s.yieldStates);
      const newPlacementState = { ...placementState };
      newPlacementState.yields = [...placementState.yields];
      newPlacementState.yields[yieldIndex] = {
        ...yieldState,
        remaining: yieldState.remaining - harvested,
        lastHarvestDay: currentDay,
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
            lastHarvestDay: null,
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

  regenerateYield: (placementId, yieldIndex, currentDay) => {
    const state = get();
    const placementState = state.yieldStates.get(placementId);

    if (!placementState) return;

    const yieldState = placementState.yields[yieldIndex];
    if (!yieldState || !yieldState.isAvailable) return;

    set((s) => {
      const newMap = new Map(s.yieldStates);
      const newPlacementState = { ...placementState };
      newPlacementState.yields = [...placementState.yields];
      newPlacementState.yields[yieldIndex] = {
        ...yieldState,
        remaining: yieldState.total,
        lastHarvestDay: currentDay,
      };
      newMap.set(placementId, newPlacementState);
      return { yieldStates: newMap };
    });
  },
    }),
    {
      name: 'yield-state-storage',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert array back to Map
          if (data.state?.yieldStates) {
            data.state.yieldStates = new Map(data.state.yieldStates);
          }
          return data;
        },
        setItem: (name, value) => {
          // Convert Map to array for JSON serialization
          // Zustand persist wraps state in { state: ..., version: ... }
          const toStore = {
            ...value,
            state: {
              ...value.state,
              yieldStates: Array.from((value.state?.yieldStates || new Map()).entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist the yieldStates data
      partialize: (state) => ({ yieldStates: state.yieldStates }) as YieldStateStore,
    }
  )
);

// Selectors
export const useYieldState = (placementId: string) =>
  useYieldStateStore((s) => s.yieldStates.get(placementId));

export const useHasAvailableYield = (placementId: string) =>
  useYieldStateStore((s) => s.hasAvailableYield(placementId));
