import { create } from 'zustand';
import type { PlantDefinition } from './definitions/plantsStore';
import type { AnimalDefinition } from './definitions/animalsStore';
import type { WaterDefinition } from './definitions/waterStore';
import type { ResourceDefinition } from './definitions/resourcesStore';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { useInventoryStore } from './inventoryStore';
import { useMapEditorStore } from './mapEditorStore';
import { useDefinitionsStore } from './definitionsStore';

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
      case 'harvest':
        console.log(`  → Would harvest from ${target.definition.name}`);
        break;
      case 'water':
        console.log(`  → Would water ${target.definition.name}`);
        break;
      case 'inspect':
        console.log(`  → Inspecting ${target.definition.name}`);
        break;
      case 'pick':
        console.log(`  → Would pick ${target.definition.name}`);
        break;
      case 'pet':
        console.log(`  → Petting ${target.definition.name}`);
        break;
      case 'feed':
        console.log(`  → Would feed ${target.definition.name}`);
        break;
      case 'milk':
        console.log(`  → Would milk ${target.definition.name}`);
        break;
      case 'shear':
        console.log(`  → Would shear ${target.definition.name}`);
        break;
      case 'ride':
        console.log(`  → Would ride ${target.definition.name}`);
        break;
      case 'collect': {
        const inventoryStore = useInventoryStore.getState();
        const mapEditorStore = useMapEditorStore.getState();

        // Add to inventory using definitionId
        const added = inventoryStore.addItem(target.object.definitionId, 1);
        if (added) {
          console.log(`  → Collected ${target.definition.name} to inventory`);
          // Remove from world
          mapEditorStore.removeResource(target.object.id);
          // Clear target since resource is gone
          set({ currentTarget: null });
        } else {
          console.log(`  → Inventory full! Cannot collect ${target.definition.name}`);
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
