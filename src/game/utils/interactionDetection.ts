import type { PlantPlacement, AnimalPlacement, WaterPlacement, ResourcePlacement } from '@/stores/mapEditorStore';
import type { PlantDefinition } from '@/stores/definitions/plantsStore';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';
import type { WaterDefinition } from '@/stores/definitions/waterStore';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';
import type { InteractionTarget, InteractableType } from '@/stores/interactionStore';

interface MapData {
  plants: PlantPlacement[];
  animals: AnimalPlacement[];
  waters: WaterPlacement[];
  resources: ResourcePlacement[];
}

interface Definitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  waters: WaterDefinition[];
  resources: ResourceDefinition[];
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
 */
export function findNearestInteractable(
  playerX: number,
  playerY: number,
  mapData: MapData,
  definitions: Definitions
): InteractionTarget | null {
  let nearest: InteractionTarget | null = null;
  let nearestDistance = Infinity;

  // Check plants
  for (const plant of mapData.plants) {
    const def = definitions.plants.find(p => p.id === plant.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, plant.x, plant.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      // Combine yield interactions, yield transformation actions, and need interactions
      const yieldInteractions = def.aliveYields
        .map(y => y.interactionType)
        .filter(Boolean) as string[];
      // Include transformation actions from yields
      const yieldTransformActions = def.aliveYields
        .flatMap(y => (y.transformations || []).map(t => t.action))
        .filter(Boolean) as string[];
      const allInteractions = [...new Set([...yieldInteractions, ...yieldTransformActions, ...(def.needInteractions || [])])] as string[];

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
        interactionTypes: allInteractions,
      };
    }
  }

  // Check animals
  for (const animal of mapData.animals) {
    const def = definitions.animals.find(a => a.id === animal.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, animal.x, animal.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
      // Combine yield interactions, yield transformation actions, and need interactions
      const yieldInteractions = def.aliveYields
        .map(y => y.interactionType)
        .filter(Boolean) as string[];
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

  return nearest;
}

/**
 * Get a human-readable action label for an interaction type
 */
export function getInteractionLabel(interactionType: string): string {
  const labels: Record<string, string> = {
    // Plant interactions
    harvest: 'Harvest',
    chop: 'Chop',
    water: 'Water',
    inspect: 'Inspect',
    pick: 'Pick',
    // Animal interactions
    pet: 'Pet',
    feed: 'Feed',
    milk: 'Milk',
    shear: 'Shear',
    ride: 'Ride',
    collect: 'Collect',
    tame: 'Tame',
    // Water interactions
    fish: 'Fish',
    drink: 'Drink',
    swim: 'Swim',
    // Bootstrap actions
    break: 'Break',
    twist: 'Twist',
    mold: 'Mold',
  };

  return labels[interactionType] || interactionType;
}
