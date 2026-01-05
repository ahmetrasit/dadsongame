import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Animal State Store
 *
 * Manages the taming/trust state for animals separately from their placement data.
 * This keeps AnimalPlacement in runtimeMapStore focused on position/definition,
 * while this store handles behavioral state progression.
 *
 * State Machine:
 * - WILD: Animal is not tamed (trustLevel < 100, isBaby = false)
 *   Actions: feed (increases trust), observe
 *
 * - BABY: Animal is young (isBaby = true, regardless of tame status)
 *   Actions: pet/feed only, NO butcher, NO yield
 *
 * - TAME: Animal is fully tamed (trustLevel = 100, isBaby = false)
 *   Actions depend on yield availability (handled by caller)
 */

// Taming state - different from AnimalState in creatures.ts which is behavior state
export type TamingState = 'WILD' | 'TAME' | 'BABY';

export interface AnimalStateData {
  placementId: string;    // Links to AnimalPlacement in runtimeMapStore
  isTamed: boolean;       // true when trustLevel reaches 100
  trustLevel: number;     // 0-100, animal becomes tamed at 100
  isBaby: boolean;        // Baby animals have restricted interactions
  happiness: number;      // 0-100, affects yield and breeding
  lastFedDay: number;     // Game day when last fed (for hunger tracking)
}

interface AnimalStateStore {
  // State
  animalStates: Map<string, AnimalStateData>;

  // Actions
  initializeAnimal: (placementId: string, isBaby?: boolean) => void;
  getAnimalState: (placementId: string) => AnimalStateData | undefined;
  getTamingState: (placementId: string) => TamingState;
  addTrust: (placementId: string, amount: number) => void;
  setTamed: (placementId: string) => void;
  feedAnimal: (placementId: string, currentDay: number) => void;
  updateHappiness: (placementId: string, amount: number) => void;
  growUp: (placementId: string) => void;
  removeAnimalState: (placementId: string) => void;
  clearAll: () => void;
}

const DEFAULT_HAPPINESS = 50;
const TRUST_MAX = 100;
const HAPPINESS_MAX = 100;
const FEED_TRUST_BONUS = 10;
const FEED_HAPPINESS_BONUS = 15;

export const useAnimalStateStore = create<AnimalStateStore>()(
  persist(
    (set, get) => ({
      // Initial State
      animalStates: new Map(),

      // Initialize state for a newly placed/spawned animal
      initializeAnimal: (placementId, isBaby = false) => {
        const existing = get().animalStates.get(placementId);
        if (existing) {
          console.log(`[AnimalStateStore] Animal ${placementId} already initialized`);
          return;
        }

        console.log(`[AnimalStateStore] Initializing animal: ${placementId} (baby: ${isBaby})`);

        set((state) => {
          const newMap = new Map(state.animalStates);
          newMap.set(placementId, {
            placementId,
            isTamed: false,
            trustLevel: 0,
            isBaby,
            happiness: DEFAULT_HAPPINESS,
            lastFedDay: -1, // Never fed
          });
          return { animalStates: newMap };
        });
      },

      // Get the full state for an animal
      getAnimalState: (placementId) => {
        return get().animalStates.get(placementId);
      },

      // Get the simplified taming state for interaction logic
      getTamingState: (placementId) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          // No state initialized - treat as wild
          return 'WILD';
        }

        // BABY state takes priority - babies have restricted interactions
        if (state.isBaby) {
          return 'BABY';
        }

        // Check if tamed (trustLevel at max)
        if (state.isTamed || state.trustLevel >= TRUST_MAX) {
          return 'TAME';
        }

        return 'WILD';
      },

      // Add trust from feeding or positive interactions
      addTrust: (placementId, amount) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          console.warn(`[AnimalStateStore] Cannot add trust: animal ${placementId} not found`);
          return;
        }

        if (state.isTamed) {
          // Already tamed, trust maxed
          return;
        }

        const newTrust = Math.min(TRUST_MAX, state.trustLevel + amount);
        const becameTamed = newTrust >= TRUST_MAX;

        console.log(
          `[AnimalStateStore] Trust for ${placementId}: ${state.trustLevel} -> ${newTrust}` +
          (becameTamed ? ' (TAMED!)' : '')
        );

        set((s) => {
          const newMap = new Map(s.animalStates);
          newMap.set(placementId, {
            ...state,
            trustLevel: newTrust,
            isTamed: becameTamed,
          });
          return { animalStates: newMap };
        });
      },

      // Force-set an animal as tamed (for testing or special events)
      setTamed: (placementId) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          console.warn(`[AnimalStateStore] Cannot set tamed: animal ${placementId} not found`);
          return;
        }

        if (state.isTamed) {
          return;
        }

        console.log(`[AnimalStateStore] Force-taming animal: ${placementId}`);

        set((s) => {
          const newMap = new Map(s.animalStates);
          newMap.set(placementId, {
            ...state,
            trustLevel: TRUST_MAX,
            isTamed: true,
          });
          return { animalStates: newMap };
        });
      },

      // Feed an animal - increases trust and happiness, updates lastFedDay
      feedAnimal: (placementId, currentDay) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          console.warn(`[AnimalStateStore] Cannot feed: animal ${placementId} not found`);
          return;
        }

        const newTrust = Math.min(TRUST_MAX, state.trustLevel + FEED_TRUST_BONUS);
        const newHappiness = Math.min(HAPPINESS_MAX, state.happiness + FEED_HAPPINESS_BONUS);
        const becameTamed = !state.isTamed && newTrust >= TRUST_MAX;

        console.log(
          `[AnimalStateStore] Fed ${placementId} on day ${currentDay}: ` +
          `trust ${state.trustLevel} -> ${newTrust}, happiness ${state.happiness} -> ${newHappiness}` +
          (becameTamed ? ' (TAMED!)' : '')
        );

        set((s) => {
          const newMap = new Map(s.animalStates);
          newMap.set(placementId, {
            ...state,
            trustLevel: newTrust,
            happiness: newHappiness,
            lastFedDay: currentDay,
            isTamed: state.isTamed || becameTamed,
          });
          return { animalStates: newMap };
        });
      },

      // Update happiness (can be positive or negative)
      updateHappiness: (placementId, amount) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          console.warn(`[AnimalStateStore] Cannot update happiness: animal ${placementId} not found`);
          return;
        }

        const newHappiness = Math.max(0, Math.min(HAPPINESS_MAX, state.happiness + amount));

        console.log(`[AnimalStateStore] Happiness for ${placementId}: ${state.happiness} -> ${newHappiness}`);

        set((s) => {
          const newMap = new Map(s.animalStates);
          newMap.set(placementId, {
            ...state,
            happiness: newHappiness,
          });
          return { animalStates: newMap };
        });
      },

      // Transition baby to adult
      growUp: (placementId) => {
        const state = get().animalStates.get(placementId);

        if (!state) {
          console.warn(`[AnimalStateStore] Cannot grow up: animal ${placementId} not found`);
          return;
        }

        if (!state.isBaby) {
          return;
        }

        console.log(`[AnimalStateStore] Animal ${placementId} grew up!`);

        set((s) => {
          const newMap = new Map(s.animalStates);
          newMap.set(placementId, {
            ...state,
            isBaby: false,
          });
          return { animalStates: newMap };
        });
      },

      // Remove state when animal is removed from the world
      removeAnimalState: (placementId) => {
        console.log(`[AnimalStateStore] Removing animal state: ${placementId}`);
        set((state) => {
          const newMap = new Map(state.animalStates);
          newMap.delete(placementId);
          return { animalStates: newMap };
        });
      },

      // Clear all animal states (for new game reset)
      clearAll: () => {
        console.log('[AnimalStateStore] Clearing all animal states');
        set({ animalStates: new Map() });
      },
    }),
    {
      name: 'animal-state-storage',
      // Custom storage to handle Map serialization (following villagerStore pattern)
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert array back to Map
          if (data.state?.animalStates) {
            data.state.animalStates = new Map(data.state.animalStates);
          }
          return data;
        },
        setItem: (name, value) => {
          // Convert Map to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              animalStates: Array.from((value.state?.animalStates || new Map()).entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist animalStates
      partialize: (state) => ({
        animalStates: state.animalStates,
      }) as AnimalStateStore,
    }
  )
);

// Selectors
export const useAnimalState = (placementId: string) =>
  useAnimalStateStore((s) => s.animalStates.get(placementId));

export const useTamingState = (placementId: string) =>
  useAnimalStateStore((s) => s.getTamingState(placementId));

export const useTamedAnimals = () =>
  useAnimalStateStore((s) =>
    Array.from(s.animalStates.values()).filter(a => a.isTamed && !a.isBaby)
  );

export const useWildAnimals = () =>
  useAnimalStateStore((s) =>
    Array.from(s.animalStates.values()).filter(a => !a.isTamed && !a.isBaby)
  );

export const useBabyAnimals = () =>
  useAnimalStateStore((s) =>
    Array.from(s.animalStates.values()).filter(a => a.isBaby)
  );
