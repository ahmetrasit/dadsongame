import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Villager, VillagerLoyalty, VillagerQuest, VillagerTask } from '@/types/humans';

/**
 * Villager Store
 * Manages all villagers in the game, their recruitment status, tasks, and loyalty.
 */

interface VillagerStore {
  // State
  villagers: Map<string, Villager>;
  selectedVillagerId: string | null;

  // Actions
  addVillager: (villager: Villager) => void;
  removeVillager: (id: string) => void;
  getVillager: (id: string) => Villager | undefined;
  recruitVillager: (id: string) => boolean;
  updateLoyalty: (id: string, loyalty: VillagerLoyalty) => void;
  assignTask: (id: string, task: VillagerTask | undefined) => boolean;
  completeQuestRequirement: (villagerId: string, requirementIndex: number) => void;
  selectVillager: (id: string | null) => void;
  clearAll: () => void;
}

export const useVillagerStore = create<VillagerStore>()(
  persist(
    (set, get) => ({
      // Initial State
      villagers: new Map(),
      selectedVillagerId: null,

      // Add a new villager to the game
      addVillager: (villager) => {
        console.log(`[VillagerStore] Adding villager: ${villager.id} (${villager.name})`);
        set((state) => {
          const newMap = new Map(state.villagers);
          newMap.set(villager.id, villager);
          return { villagers: newMap };
        });
      },

      // Remove a villager from the game
      removeVillager: (id) => {
        console.log(`[VillagerStore] Removing villager: ${id}`);
        set((state) => {
          const newMap = new Map(state.villagers);
          newMap.delete(id);
          return {
            villagers: newMap,
            selectedVillagerId: state.selectedVillagerId === id ? null : state.selectedVillagerId
          };
        });
      },

      // Get a villager by ID
      getVillager: (id) => {
        return get().villagers.get(id);
      },

      // Mark a villager as recruited (removes recruitment quest)
      recruitVillager: (id) => {
        const state = get();
        const villager = state.villagers.get(id);

        if (!villager) {
          console.warn(`[VillagerStore] Cannot recruit: villager ${id} not found`);
          return false;
        }

        if (villager.isRecruited) {
          console.warn(`[VillagerStore] Villager ${id} is already recruited`);
          return false;
        }

        if (villager.recruitmentQuest && !villager.recruitmentQuest.completed) {
          console.warn(`[VillagerStore] Cannot recruit ${id}: quest not completed`);
          return false;
        }

        console.log(`[VillagerStore] Recruiting villager: ${id} (${villager.name})`);

        set((s) => {
          const newMap = new Map(s.villagers);
          const updatedVillager: Villager = {
            ...villager,
            isRecruited: true,
            recruitmentQuest: undefined,
          };
          newMap.set(id, updatedVillager);
          return { villagers: newMap };
        });

        return true;
      },

      // Update villager loyalty level
      updateLoyalty: (id, loyalty) => {
        const state = get();
        const villager = state.villagers.get(id);

        if (!villager) {
          console.warn(`[VillagerStore] Cannot update loyalty: villager ${id} not found`);
          return;
        }

        console.log(`[VillagerStore] Updating loyalty for ${id}: ${villager.loyalty} -> ${loyalty}`);

        set((s) => {
          const newMap = new Map(s.villagers);
          const updatedVillager: Villager = {
            ...villager,
            loyalty,
          };
          newMap.set(id, updatedVillager);
          return { villagers: newMap };
        });
      },

      // Assign or clear a task for a villager
      assignTask: (id, task) => {
        const state = get();
        const villager = state.villagers.get(id);

        if (!villager) {
          console.warn(`[VillagerStore] Cannot assign task: villager ${id} not found`);
          return false;
        }

        // If clearing task, allow it
        if (!task) {
          console.log(`[VillagerStore] Clearing task for ${id}`);
          set((s) => {
            const newMap = new Map(s.villagers);
            const updatedVillager: Villager = {
              ...villager,
              currentTask: undefined,
            };
            newMap.set(id, updatedVillager);
            return { villagers: newMap };
          });
          return true;
        }

        // Calculate stars based on task type
        let stars: number;
        switch (task.type) {
          case 'craft':
            stars = (villager.stats.craftingSkill + villager.stats.intelligence) / 20;
            break;
          case 'farm':
          case 'gather':
            stars = (villager.stats.strength + villager.stats.speed) / 20;
            break;
          case 'build':
            stars = (villager.stats.strength + villager.stats.craftingSkill) / 20;
            break;
          default:
            stars = 10; // No restriction for unspecified tasks
        }

        // Check task complexity
        const complexity = task.complexity || 0;
        if (complexity > stars) {
          console.log(`[Villager] ${villager.name} cannot do this task (${stars.toFixed(1)} stars < ${complexity} required)`);
          return false;
        }

        // Assign task
        console.log(`[VillagerStore] Assigning task to ${id}: ${task.type} (${stars.toFixed(1)} stars >= ${complexity} complexity)`);
        set((s) => {
          const newMap = new Map(s.villagers);
          const updatedVillager: Villager = {
            ...villager,
            currentTask: task,
          };
          newMap.set(id, updatedVillager);
          return { villagers: newMap };
        });
        return true;
      },

      // Complete a quest requirement (increment current progress)
      completeQuestRequirement: (villagerId, requirementIndex) => {
        const state = get();
        const villager = state.villagers.get(villagerId);

        if (!villager || !villager.recruitmentQuest) {
          console.warn(`[VillagerStore] Cannot complete requirement: villager ${villagerId} has no quest`);
          return;
        }

        const quest = villager.recruitmentQuest;
        if (requirementIndex < 0 || requirementIndex >= quest.requirements.length) {
          console.warn(`[VillagerStore] Invalid requirement index: ${requirementIndex}`);
          return;
        }

        const requirement = quest.requirements[requirementIndex];

        console.log(
          `[VillagerStore] Completing quest requirement for ${villagerId}: ` +
          `${requirement.type} (${requirement.current + 1}/${requirement.quantity})`
        );

        set((s) => {
          const newMap = new Map(s.villagers);

          // Update the requirement
          const updatedRequirements = [...quest.requirements];
          updatedRequirements[requirementIndex] = {
            ...requirement,
            current: Math.min(requirement.current + 1, requirement.quantity),
          };

          // Check if all requirements are completed
          const allCompleted = updatedRequirements.every(req => req.current >= req.quantity);

          const updatedQuest: VillagerQuest = {
            ...quest,
            requirements: updatedRequirements,
            completed: allCompleted,
          };

          if (allCompleted) {
            console.log(`[VillagerStore] Quest completed for ${villagerId}!`);
          }

          const updatedVillager: Villager = {
            ...villager,
            recruitmentQuest: updatedQuest,
          };

          newMap.set(villagerId, updatedVillager);
          return { villagers: newMap };
        });
      },

      // Select a villager (for UI purposes)
      selectVillager: (id) => {
        console.log(`[VillagerStore] Selected villager: ${id ?? 'none'}`);
        set({ selectedVillagerId: id });
      },

      // Clear all villagers (for new game reset)
      clearAll: () => {
        console.log('[VillagerStore] Clearing all villagers');
        set({
          villagers: new Map(),
          selectedVillagerId: null,
        });
      },
    }),
    {
      name: 'villager-storage',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert array back to Map
          if (data.state?.villagers) {
            data.state.villagers = new Map(data.state.villagers);
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
              villagers: Array.from((value.state?.villagers || new Map()).entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist villagers and selectedVillagerId
      partialize: (state) => ({
        villagers: state.villagers,
        selectedVillagerId: state.selectedVillagerId,
      }) as VillagerStore,
    }
  )
);

// Selectors
export const useVillager = (id: string) =>
  useVillagerStore((s) => s.villagers.get(id));

export const useSelectedVillager = () =>
  useVillagerStore((s) => {
    const id = s.selectedVillagerId;
    return id ? s.villagers.get(id) : undefined;
  });

export const useRecruitedVillagers = () =>
  useVillagerStore((s) =>
    Array.from(s.villagers.values()).filter(v => v.isRecruited)
  );

export const useUnrecruitedVillagers = () =>
  useVillagerStore((s) =>
    Array.from(s.villagers.values()).filter(v => !v.isRecruited)
  );
