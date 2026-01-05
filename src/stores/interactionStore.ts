import { create } from 'zustand';
import type { PlantDefinition } from './definitions/plantsStore';
import type { AnimalDefinition } from './definitions/animalsStore';
import type { WaterDefinition } from './definitions/waterStore';
import type { ResourceDefinition } from './definitions/resourcesStore';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { useInventoryStore } from './inventoryStore';
import { useRuntimeMapStore } from './runtimeMapStore';
import { useDefinitionsStore } from './definitionsStore';
import { useVillagerStore } from './villagerStore';
import { harvestYield } from '@/services/YieldService';
import { triggerDeadYield } from '@/services/DeadYieldService';

export type InteractableType = 'plant' | 'animal' | 'water' | 'resource' | 'villager';

export interface InteractableObject {
  id: string;
  definitionId: string;
  type: InteractableType;
  x: number;
  y: number;
}

export interface InteractionTarget {
  object: InteractableObject;
  definition: PlantDefinition | AnimalDefinition | WaterDefinition | ResourceDefinition;
  distance: number;
  interactionTypes: string[];
}

interface InteractionState {
  // Current target (nearest interactable object within range)
  currentTarget: InteractionTarget | null;

  // Actions
  setTarget: (target: InteractionTarget | null) => void;
  clearTarget: () => void;
  executeInteraction: (interactionType: string) => void;
}

export const useInteractionStore = create<InteractionState>()((set, get) => ({
  currentTarget: null,

  setTarget: (target) => {
    const current = get().currentTarget;
    // Only update if target changed (avoid unnecessary re-renders)
    if (target?.object.id !== current?.object.id) {
      set({ currentTarget: target });
    }
  },

  clearTarget: () => {
    if (get().currentTarget !== null) {
      set({ currentTarget: null });
    }
  },

  executeInteraction: (interactionType) => {
    const target = get().currentTarget;
    if (!target) return;

    // TODO: Implement actual interaction effects based on type
    switch (interactionType) {
      // Yield harvesting interactions (plants and animals)
      case 'pick':
      case 'harvest':
      case 'gather':
      case 'milk':
      case 'shear': {
        if (target.object.type !== 'plant' && target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const inventoryStore = useInventoryStore.getState();

        // Get the definition to find which yield matches this interaction
        const def = target.object.type === 'plant'
          ? defStore.plants.find(p => p.id === target.object.definitionId)
          : defStore.animals.find(a => a.id === target.object.definitionId);

        if (!def || !('aliveYields' in def)) break;

        // Default fallback for undefined interactionType
        const defaultInteraction = target.object.type === 'plant' ? 'harvest' : 'collect';

        // Find the yield that has this interaction type (with fallback for undefined)
        const yieldIndex = def.aliveYields.findIndex(y =>
          (y.interactionType || defaultInteraction) === interactionType
        );
        if (yieldIndex === -1) break;

        // Get yield info to check what resource we'd get
        const yieldDef = def.aliveYields[yieldIndex];

        // Check if inventory has space before harvesting
        if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) break;

        // Harvest the yield
        const result = harvestYield(target.object.id, yieldIndex, 1);
        if (result) {
          inventoryStore.addItem(result.resourceId, result.amount);
        }
        break;
      }
      case 'water': {
        if (target.object.type !== 'plant') break;

        const defStore = useDefinitionsStore.getState();
        const plantDef = defStore.plants.find(p => p.id === target.object.definitionId);

        if (!plantDef) break;

        // Check if plant accepts watering
        if (plantDef.needInteractions.includes('water')) {
          console.log(`[Interaction] Watered plant ${target.object.id}`);
          // TODO: Future enhancement - affect growth rate or yield quality
        }
        break;
      }
      case 'inspect': {
        const type = target.object.type;
        const name = target.definition.name;
        const id = target.object.id;

        console.log(`[Interaction] Inspecting ${type}: ${name} (id: ${id})`);

        // Log additional details based on type
        if (type === 'plant' || type === 'animal') {
          const def = target.definition as PlantDefinition | AnimalDefinition;
          if ('aliveYields' in def && def.aliveYields.length > 0) {
            console.log(`  Yields: ${def.aliveYields.map(y => `${y.resourceId} (${y.interactionType || 'harvest'})`).join(', ')}`);
          }
        } else if (type === 'resource') {
          const def = target.definition as ResourceDefinition;
          if (def.category) {
            console.log(`  Category: ${def.category}`);
          }
        }
        break;
      }
      case 'pet': {
        if (target.object.type !== 'animal') break;
        console.log(`[Interaction] Pet ${target.object.id}`);
        // Future: Could increase animal happiness/friendship
        break;
      }
      case 'feed': {
        if (target.object.type !== 'animal') break;
        console.log(`[Interaction] Fed ${target.object.id}`);
        // Future: Could check inventory for food items and affect animal health/yield
        break;
      }
      case 'ride': {
        if (target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const animalDef = defStore.animals.find(a => a.id === target.object.definitionId);

        if (!animalDef) break;

        // Check if animal allows riding
        if (animalDef.needInteractions.includes('ride')) {
          console.log(`[Interaction] Riding ${target.object.id}`);
          // TODO: Future enhancement - change player movement mode
        }
        break;
      }
      case 'collect': {
        // For ground resources
        if (target.object.type === 'resource') {
          const inventoryStore = useInventoryStore.getState();

          const added = inventoryStore.addItem(target.object.definitionId, 1);
          if (added) {
            useRuntimeMapStore.getState().removeResource(target.object.id);
            set({ currentTarget: null });
          }
          break;
        }

        // For plants/animals with 'collect' as yield interaction
        if (target.object.type === 'plant' || target.object.type === 'animal') {
          const defStore = useDefinitionsStore.getState();
          const inventoryStore = useInventoryStore.getState();

          const def = target.object.type === 'plant'
            ? defStore.plants.find(p => p.id === target.object.definitionId)
            : defStore.animals.find(a => a.id === target.object.definitionId);

          if (!def || !('aliveYields' in def)) break;

          // Default fallback for undefined interactionType
          const defaultInteraction = target.object.type === 'plant' ? 'harvest' : 'collect';

          // Find the yield that has 'collect' as interaction type (with fallback for undefined)
          const yieldIndex = def.aliveYields.findIndex(y =>
            (y.interactionType || defaultInteraction) === 'collect'
          );
          if (yieldIndex === -1) break;

          const yieldDef = def.aliveYields[yieldIndex];

          // Check inventory space before harvesting
          if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) break;

          const result = harvestYield(target.object.id, yieldIndex, 1);
          if (result) {
            inventoryStore.addItem(result.resourceId, result.amount);
          }
        }
        break;
      }
      case 'fish': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Fishing at ${target.object.id}`);
        // TODO: Future enhancement - catch fish based on water type
        break;
      }
      case 'drink': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Drank from ${target.object.id}`);
        // TODO: Future enhancement - restore player thirst/stamina
        break;
      }
      case 'swim': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Swimming in ${target.object.id}`);
        // TODO: Future enhancement - affect player position/state
        break;
      }
      case 'tame': {
        if (target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const animalDef = defStore.animals.find(a => a.id === target.object.definitionId);

        if (!animalDef) break;

        // Check if animal allows taming
        if (animalDef.needInteractions.includes('tame')) {
          console.log(`[Interaction] Taming ${target.object.id}`);
          // TODO: Future enhancement - track taming progress
        }
        break;
      }
      case 'chop_down': {
        if (target.object.type !== 'plant') break;

        const result = triggerDeadYield(target.object.id, target.object.type);
        if (result) {
          set({ currentTarget: null });
        }
        break;
      }
      case 'butcher': {
        if (target.object.type !== 'animal') break;

        const result = triggerDeadYield(target.object.id, target.object.type);
        if (result) {
          set({ currentTarget: null });
        }
        break;
      }
      case 'talk': {
        if (target.object.type !== 'villager') break;
        console.log(`[Interaction] Talking to villager ${target.object.id}`);
        // TODO: Future enhancement - open dialogue UI
        break;
      }
      case 'recruit': {
        if (target.object.type !== 'villager') break;

        const villagerStore = useVillagerStore.getState();
        const villager = villagerStore.getVillager(target.object.id);

        if (!villager) {
          console.warn(`[Interaction] Cannot recruit: villager ${target.object.id} not found`);
          break;
        }

        if (!villager.recruitmentQuest?.completed) {
          console.warn(`[Interaction] Cannot recruit ${target.object.id}: quest not completed`);
          break;
        }

        const success = villagerStore.recruitVillager(target.object.id);
        if (success) {
          console.log(`[Interaction] Successfully recruited villager ${target.object.id}`);
        } else {
          console.log(`[Interaction] Failed to recruit villager ${target.object.id}`);
        }
        break;
      }
      case 'assign': {
        if (target.object.type !== 'villager') break;

        const villagerStore = useVillagerStore.getState();
        const villager = villagerStore.getVillager(target.object.id);

        if (!villager?.isRecruited) {
          console.warn(`[Interaction] Cannot assign task: villager ${target.object.id} not recruited`);
          break;
        }

        // TODO: Future enhancement - open task assignment UI
        console.log(`[Interaction] Opening task assignment for villager ${target.object.id}`);
        break;
      }
      // Handle ALL transformation actions (user-defined take priority, then bootstrap fallback)
      case 'break':
      case 'twist':
      case 'mold':
      case 'chop':
      case 'cook':
      case 'dry':
      case 'soak':
      case 'grind':
      case 'portion':
      case 'smelt':
      case 'tan':
      case 'weave': {
        const defStore = useDefinitionsStore.getState();
        const inventoryStore = useInventoryStore.getState();

        // Handle plants and animals - check yield transformations
        if (target.object.type === 'plant' || target.object.type === 'animal') {
          const def = target.object.type === 'plant'
            ? defStore.plants.find(p => p.id === target.object.definitionId)
            : defStore.animals.find(a => a.id === target.object.definitionId);

          if (def && 'aliveYields' in def) {
            // Find a yield that has this transformation
            for (const yield_ of def.aliveYields) {
              const transformation = yield_.transformations?.find(t => t.action === interactionType);
              if (transformation) {
                inventoryStore.addItem(transformation.resultMaterialId, transformation.resultQuantity);
                // Note: plant/animal stays in the world, only the yield is consumed
                // TODO: Track yield availability state (cooldown, seasons, etc.)
                break;
              }
            }
          }
          break;
        }

        // Handle resources - check resource transformations
        if (target.object.type === 'resource') {
          const resource = defStore.resources.find(r => r.id === target.object.definitionId);

          // First, check for user-defined transformation
          const transformation = resource?.transformations?.find(t => t.action === interactionType);
          if (transformation) {
            const added = inventoryStore.addItem(transformation.resultMaterialId, transformation.resultQuantity);
            if (added) {
              useRuntimeMapStore.getState().removeResource(target.object.id);
              set({ currentTarget: null });
            }
            break;
          }

          // Fallback to bootstrap recipe (for break, twist, mold)
          const recipe = getBootstrapRecipe(target.object.definitionId);
          if (recipe && recipe.action === interactionType) {
            const added = inventoryStore.addItem(recipe.output, recipe.outputQuantity);
            if (added) {
              useRuntimeMapStore.getState().removeResource(target.object.id);
              set({ currentTarget: null });
            }
            break;
          }
        }
        break;
      }
      default:
        // Unknown interaction type - no action
    }
  },
}));
