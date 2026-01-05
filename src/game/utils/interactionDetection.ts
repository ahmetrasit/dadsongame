import type { PlantPlacement, AnimalPlacement, WaterPlacement, ResourcePlacement, VillagerPlacement } from '@/stores/mapEditorStore';
import type { PlantDefinition } from '@/stores/definitions/plantsStore';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';
import type { WaterDefinition } from '@/stores/definitions/waterStore';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';
import type { InteractionTarget, InteractableType } from '@/stores/interactionStore';
import type { PlacementYieldState } from '@/stores/yieldStateStore';
import { useVillagerStore } from '@/stores/villagerStore';

interface MapData {
  plants: PlantPlacement[];
  animals: AnimalPlacement[];
  waters: WaterPlacement[];
  resources: ResourcePlacement[];
  villagers: VillagerPlacement[];
}

interface Definitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  waters: WaterDefinition[];
  resources: ResourceDefinition[];
}

// Extended PlantPlacement with optional state properties (for future use)
interface ExtendedPlantPlacement extends PlantPlacement {
  isDead?: boolean;
  stage?: 'seed' | 'sprout' | 'mature' | 'withered';
}

// Plant state enum for interaction filtering
export type PlantState = 'HAS_YIELD' | 'NO_YIELD' | 'DEAD';

// Yield state accessor interface
interface YieldStateAccessor {
  getPlacementYields: (placementId: string) => PlacementYieldState | undefined;
  hasAvailableYield: (placementId: string) => boolean;
}

/**
 * Determine the current state of a plant based on placement data and yield state
 * State is DERIVED from existing data, not stored separately
 */
export function getPlantState(
  plantPlacement: ExtendedPlantPlacement,
  yieldStateAccessor: YieldStateAccessor | null
): PlantState {
  // Check if plant is dead/withered (future-proofing for when death mechanics are added)
  if (plantPlacement.isDead || plantPlacement.stage === 'withered') {
    return 'DEAD';
  }

  // If no yield state accessor provided, default to NO_YIELD (conservative)
  if (!yieldStateAccessor) {
    return 'NO_YIELD';
  }

  // Check yield availability from yieldStateStore
  const hasYield = yieldStateAccessor.hasAvailableYield(plantPlacement.id);
  return hasYield ? 'HAS_YIELD' : 'NO_YIELD';
}

/**
 * Get filtered interactions for a plant based on its current state
 *
 * Design spec:
 * - ALIVE + HAS_YIELD: yield actions (pick/harvest/gather), care actions (water, fertilize)
 * - ALIVE + NO_YIELD: care actions (water), maintenance (prune, chop_down)
 * - DEAD/WITHERED: removal only (uproot)
 */
export function getPlantInteractions(
  plantDef: PlantDefinition,
  state: PlantState,
  yieldStateAccessor: YieldStateAccessor | null,
  placementId: string
): string[] {
  switch (state) {
    case 'HAS_YIELD': {
      // Get yield interactions only for yields that have remaining amounts
      const yieldInteractions: string[] = [];
      const yieldTransformActions: string[] = [];

      if (yieldStateAccessor) {
        const yieldState = yieldStateAccessor.getPlacementYields(placementId);
        plantDef.aliveYields.forEach((yield_, index) => {
          const yieldInfo = yieldState?.yields[index];
          const hasRemaining = yieldInfo?.isAvailable && yieldInfo.remaining > 0;

          if (hasRemaining) {
            yieldInteractions.push(yield_.interactionType || 'harvest');
            // Include transformation actions from yields
            if (yield_.transformations) {
              for (const t of yield_.transformations) {
                if (t.action) yieldTransformActions.push(t.action);
              }
            }
          }
        });
      } else {
        // Fallback: include all yield interactions if no state accessor
        plantDef.aliveYields.forEach(yield_ => {
          yieldInteractions.push(yield_.interactionType || 'harvest');
          if (yield_.transformations) {
            for (const t of yield_.transformations) {
              if (t.action) yieldTransformActions.push(t.action);
            }
          }
        });
      }

      // Add care interactions (water, fertilize)
      const careInteractions = (plantDef.needInteractions || []).filter(
        i => i === 'water' || i === 'fertilize'
      );

      return [...new Set([...yieldInteractions, ...yieldTransformActions, ...careInteractions])];
    }

    case 'NO_YIELD': {
      // No yield available - show care and maintenance actions
      const interactions: string[] = [];

      // Always allow watering
      if (plantDef.needInteractions?.includes('water')) {
        interactions.push('water');
      }

      // Add maintenance actions
      interactions.push('prune');

      // Allow chop_down for trees/plants that have deadYields
      if (plantDef.deadYields && plantDef.deadYields.length > 0) {
        interactions.push('chop_down');
      }

      return interactions;
    }

    case 'DEAD': {
      // Dead plants can only be uprooted
      return ['uproot'];
    }

    default:
      return [];
  }
}

/**
 * Calculate Euclidean distance between two points
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the nearest interactable object within interaction range
 * Returns null if no objects are within range
 *
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param mapData - Current map data with placements
 * @param definitions - Entity definitions
 * @param yieldStateAccessor - Optional accessor for yield state (enables state-aware filtering)
 */
export function findNearestInteractable(
  playerX: number,
  playerY: number,
  mapData: MapData,
  definitions: Definitions,
  yieldStateAccessor?: YieldStateAccessor | null
): InteractionTarget | null {
  let nearest: InteractionTarget | null = null;
  let nearestDistance = Infinity;

  // Check plants with state-aware interaction filtering
  for (const plant of mapData.plants) {
    const def = definitions.plants.find(p => p.id === plant.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, plant.x, plant.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      // Determine plant state and get filtered interactions
      const plantState = getPlantState(plant as ExtendedPlantPlacement, yieldStateAccessor || null);
      const filteredInteractions = getPlantInteractions(def, plantState, yieldStateAccessor || null, plant.id);

      // Skip plants with no available interactions
      if (filteredInteractions.length === 0) continue;

      nearestDistance = dist;
      nearest = {
        object: {
          id: plant.id,
          definitionId: plant.definitionId,
          type: 'plant' as InteractableType,
          x: plant.x,
          y: plant.y,
        },
        definition: def,
        distance: dist,
        interactionTypes: filteredInteractions,
      };
    }
  }

  // Check animals
  for (const animal of mapData.animals) {
    const def = definitions.animals.find(a => a.id === animal.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, animal.x, animal.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      // Combine yield interactions (with fallback for undefined), yield transformation actions, and need interactions
      const yieldInteractions = def.aliveYields
        .map(y => y.interactionType || 'collect');  // Default fallback for animals
      // Include transformation actions from yields
      const yieldTransformActions = def.aliveYields
        .flatMap(y => (y.transformations || []).map(t => t.action))
        .filter(Boolean) as string[];
      const allInteractions = [...new Set([...yieldInteractions, ...yieldTransformActions, ...(def.needInteractions || [])])] as string[];

      nearestDistance = dist;
      nearest = {
        object: {
          id: animal.id,
          definitionId: animal.definitionId,
          type: 'animal' as InteractableType,
          x: animal.x,
          y: animal.y,
        },
        definition: def,
        distance: dist,
        interactionTypes: allInteractions,
      };
    }
  }

  // Check waters
  for (const water of mapData.waters) {
    const def = definitions.waters.find(w => w.id === water.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, water.x, water.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      nearestDistance = dist;
      nearest = {
        object: {
          id: water.id,
          definitionId: water.definitionId,
          type: 'water' as InteractableType,
          x: water.x,
          y: water.y,
        },
        definition: def,
        distance: dist,
        interactionTypes: def.interactionTypes,
      };
    }
  }

  // Check resources (ground items)
  for (const resource of mapData.resources || []) {
    const def = definitions.resources.find(r => r.id === resource.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, resource.x, resource.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      nearestDistance = dist;
      nearest = {
        object: {
          id: resource.id,
          definitionId: resource.definitionId,
          type: 'resource' as InteractableType,
          x: resource.x,
          y: resource.y,
        },
        definition: def,
        distance: dist,
        interactionTypes: def.interactionTypes,
      };
    }
  }

  // Check villagers
  for (const villager of mapData.villagers || []) {
    const dist = distance(playerX, playerY, villager.x, villager.y);
    const interactionRadius = 50;

    if (dist <= interactionRadius && dist < nearestDistance) {
      // Get villager from store to check recruitment status
      const villagerData = useVillagerStore.getState().getVillager(villager.id);

      // Determine interaction types based on recruitment status
      let interactionTypes: string[];
      if (villagerData?.isRecruited) {
        interactionTypes = ['talk', 'assign'];
      } else if (villagerData?.recruitmentQuest?.completed) {
        interactionTypes = ['talk', 'recruit'];
      } else {
        interactionTypes = ['talk'];
      }

      nearestDistance = dist;
      nearest = {
        object: {
          id: villager.id,
          definitionId: villager.definitionId,
          type: 'villager' as InteractableType,
          x: villager.x,
          y: villager.y,
        },
        // For villagers, we use a minimal definition object
        // In the future, you might want to create a VillagerDefinition type
        definition: {
          id: villager.definitionId,
          name: villagerData?.name || 'Villager',
          interactionRadius,
        } as any,
        distance: dist,
        interactionTypes,
      };
    }
  }

  return nearest;
}

/**
 * Get a human-readable action label for an interaction type
 */
export function getInteractionLabel(interactionType: string): string {
  const labels: Record<string, string> = {
    // Plant interactions - yield actions
    harvest: 'Harvest',
    pick: 'Pick',
    gather: 'Gather',
    // Plant interactions - care actions
    water: 'Water',
    fertilize: 'Fertilize',
    // Plant interactions - maintenance actions
    prune: 'Prune',
    chop_down: 'Chop Down',
    uproot: 'Uproot',
    // Legacy plant interactions
    chop: 'Chop',
    inspect: 'Inspect',
    // Animal interactions
    pet: 'Pet',
    feed: 'Feed',
    milk: 'Milk',
    shear: 'Shear',
    ride: 'Ride',
    collect: 'Collect',
    tame: 'Tame',
    butcher: 'Butcher',
    // Water interactions
    fish: 'Fish',
    drink: 'Drink',
    swim: 'Swim',
    // Villager interactions
    talk: 'Talk',
    recruit: 'Recruit',
    assign: 'Assign',
    // Bootstrap actions
    break: 'Break',
    twist: 'Twist',
    mold: 'Mold',
  };

  return labels[interactionType] || interactionType;
}
