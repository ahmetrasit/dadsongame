import { create } from 'zustand';
import type { PlantDefinition } from './definitions/plantsStore';
import type { AnimalDefinition } from './definitions/animalsStore';
import type { WaterDefinition } from './definitions/waterStore';
import type { ResourceDefinition } from './definitions/resourcesStore';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { useInventoryStore } from './inventoryStore';
import { useMapEditorStore } from './mapEditorStore';
import { useDefinitionsStore } from './definitionsStore';
import { harvestYield } from '@/services/YieldService';

export type InteractableType = 'plant' | 'animal' | 'water' | 'resource';

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

    console.log(`[Interaction] Executing "${interactionType}" on ${target.definition.name} (${target.object.type})`);

    // TODO: Implement actual interaction effects based on type
    // For now, just log the interaction
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

        // Find the yield that has this interaction type
        const yieldIndex = def.aliveYields.findIndex(y => y.interactionType === interactionType);
        if (yieldIndex === -1) {
          console.log(`  → No yield found for ${interactionType} on ${target.definition.name}`);
          break;
        }

        // Get yield info to check what resource we'd get
        const yieldDef = def.aliveYields[yieldIndex];

        // Check if inventory has space before harvesting
        if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) {
          console.log(`  → Inventory full! Cannot ${interactionType} ${target.definition.name}`);
          break;
        }

        // Harvest the yield
        const result = harvestYield(target.object.id, yieldIndex, 1);
        if (result) {
          inventoryStore.addItem(result.resourceId, result.amount);
          console.log(`  → ${interactionType} ${result.amount} ${result.resourceId} from ${target.definition.name}`);
        } else {
          console.log(`  → No yield available to ${interactionType} from ${target.definition.name}`);
        }
        break;
      }
      case 'water':
        console.log(`  → Would water ${target.definition.name}`);
        break;
      case 'inspect':
        console.log(`  → Inspecting ${target.definition.name}`);
        break;
      case 'pet':
        console.log(`  → Petting ${target.definition.name}`);
        break;
      case 'feed':
        console.log(`  → Would feed ${target.definition.name}`);
        break;
      case 'ride':
        console.log(`  → Would ride ${target.definition.name}`);
        break;
      case 'collect': {
        // For ground resources
        if (target.object.type === 'resource') {
          const inventoryStore = useInventoryStore.getState();
          const mapEditorStore = useMapEditorStore.getState();

          const added = inventoryStore.addItem(target.object.definitionId, 1);
          if (added) {
            console.log(`  → Collected ${target.definition.name} to inventory`);
            mapEditorStore.removeResource(target.object.id);
            set({ currentTarget: null });
          } else {
            console.log(`  → Inventory full! Cannot collect ${target.definition.name}`);
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

          const yieldIndex = def.aliveYields.findIndex(y => y.interactionType === 'collect');
          if (yieldIndex === -1) break;

          const yieldDef = def.aliveYields[yieldIndex];

          // Check inventory space before harvesting
          if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) {
            console.log(`  → Inventory full! Cannot collect from ${target.definition.name}`);
            break;
          }

          const result = harvestYield(target.object.id, yieldIndex, 1);
          if (result) {
            inventoryStore.addItem(result.resourceId, result.amount);
            console.log(`  → Collected ${result.amount} ${result.resourceId} from ${target.definition.name}`);
          } else {
            console.log(`  → No yield available to collect from ${target.definition.name}`);
          }
        }
        break;
      }
      case 'tame':
        console.log(`  → Would tame ${target.definition.name}`);
        break;
      case 'fish':
        console.log(`  → Would fish in ${target.definition.name}`);
        break;
      case 'drink':
        console.log(`  → Would drink from ${target.definition.name}`);
        break;
      case 'swim':
        console.log(`  → Would swim in ${target.definition.name}`);
        break;
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
        const mapEditorStore = useMapEditorStore.getState();

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
                const added = inventoryStore.addItem(transformation.resultMaterialId, transformation.resultQuantity);
                if (added) {
                  console.log(`  → Transformed yield from ${target.definition.name} into ${transformation.resultMaterialId} x${transformation.resultQuantity}`);
                  // Note: plant/animal stays in the world, only the yield is consumed
                  // TODO: Track yield availability state (cooldown, seasons, etc.)
                } else {
                  console.log(`  → Inventory full, cannot add ${transformation.resultMaterialId}`);
                }
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
              mapEditorStore.removeResource(target.object.id);
              set({ currentTarget: null });
              console.log(`  → Transformed ${target.definition.name} into ${transformation.resultMaterialId} x${transformation.resultQuantity}`);
            } else {
              console.log(`  → Inventory full, cannot add ${transformation.resultMaterialId}`);
            }
            break;
          }

          // Fallback to bootstrap recipe (for break, twist, mold)
          const recipe = getBootstrapRecipe(target.object.definitionId);
          if (recipe && recipe.action === interactionType) {
            const added = inventoryStore.addItem(recipe.output, recipe.outputQuantity);
            if (added) {
              console.log(`  → Bootstrap: ${interactionType} ${recipe.input} → ${recipe.output} x${recipe.outputQuantity}`);
              mapEditorStore.removeResource(target.object.id);
              set({ currentTarget: null });
            } else {
              console.log(`  → Inventory full! Cannot transform ${target.definition.name}`);
            }
            break;
          }

          console.log(`  → No transformation found for ${interactionType} on ${target.definition.name}`);
        }
        break;
      }
      default:
        console.log(`  → Unknown interaction: ${interactionType}`);
    }
  },
}));
