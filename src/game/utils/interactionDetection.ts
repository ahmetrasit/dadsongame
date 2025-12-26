import type { PlantPlacement, AnimalPlacement, WaterPlacement } from '@/stores/mapEditorStore';
import type { PlantDefinition } from '@/stores/definitions/plantsStore';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';
import type { WaterDefinition } from '@/stores/definitions/waterStore';
import type { InteractionTarget, InteractableType } from '@/stores/interactionStore';

interface MapData {
  plants: PlantPlacement[];
  animals: AnimalPlacement[];
  waters: WaterPlacement[];
}

interface Definitions {
  plants: PlantDefinition[];
  animals: AnimalDefinition[];
  waters: WaterDefinition[];
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
        interactionTypes: def.interactionTypes,
      };
    }
  }

  // Check animals
  for (const animal of mapData.animals) {
    const def = definitions.animals.find(a => a.id === animal.definitionId);
    if (!def) continue;

    const dist = distance(playerX, playerY, animal.x, animal.y);
    if (dist <= def.interactionRadius && dist < nearestDistance) {
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
        interactionTypes: def.interactionTypes,
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
  };

  return labels[interactionType] || interactionType;
}
