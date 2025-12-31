import { create } from 'zustand';
import type { PlantDefinition } from './definitions/plantsStore';
import type { AnimalDefinition } from './definitions/animalsStore';
import type { WaterDefinition } from './definitions/waterStore';
import type { ResourceDefinition } from './definitions/resourcesStore';

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
      case 'chop':
        console.log(`  → Would chop ${target.definition.name}`);
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
      case 'collect':
        console.log(`  → Would collect from ${target.definition.name}`);
        break;
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
      default:
        console.log(`  → Unknown interaction: ${interactionType}`);
    }
  },
}));
