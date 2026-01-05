import { useRuntimeMapStore } from '@/stores/runtimeMapStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useYieldStateStore } from '@/stores/yieldStateStore';
import { TILE_SIZE } from '@/game/config';

/**
 * Dead Yield Service
 *
 * Handles the death/harvesting of plants and animals:
 * - Spawn deadYield resources at the creature's location
 * - Remove the creature from the map
 * - Clean up yield state
 */

/**
 * Calculate the bottom-right position for shed resources
 * Resources are placed at the bottom-right corner of the source's tile
 */
function getShedPosition(sourceX: number, sourceY: number): { x: number; y: number } {
  // Get tile boundaries
  const tileX = Math.floor(sourceX / TILE_SIZE);
  const tileY = Math.floor(sourceY / TILE_SIZE);

  // Position at bottom-right of tile with slight offset
  return {
    x: (tileX + 1) * TILE_SIZE - 8, // 8px from right edge
    y: (tileY + 1) * TILE_SIZE - 8, // 8px from bottom edge
  };
}

/**
 * Trigger dead yield when a creature dies or is harvested
 * Returns true if successful, false otherwise
 */
export function triggerDeadYield(
  placementId: string,
  creatureType: 'plant' | 'animal'
): boolean {
  const mapStore = useRuntimeMapStore.getState();
  const defStore = useDefinitionsStore.getState();
  const yieldStore = useYieldStateStore.getState();

  // Find the placement in the runtime map
  let placement: { id: string; definitionId: string; x: number; y: number } | undefined;
  let deadYields: { resourceId: string; quantity: number }[] | undefined;

  if (creatureType === 'plant') {
    const found = mapStore.mapData.plants.find(p => p.id === placementId);
    if (found) {
      placement = found;
      const plantDef = defStore.plants.find(p => p.id === found.definitionId);
      deadYields = plantDef?.deadYields;
    }
  } else {
    const found = mapStore.mapData.animals.find(a => a.id === placementId);
    if (found) {
      placement = found;
      const animalDef = defStore.animals.find(a => a.id === found.definitionId);
      deadYields = animalDef?.deadYields;
    }
  }

  // Validate placement exists
  if (!placement) {
    console.warn(`[DeadYieldService] Placement ${placementId} not found`);
    return false;
  }

  // Get position for dropped resources
  const position = getShedPosition(placement.x, placement.y);
  let totalResourcesDropped = 0;

  // Spawn dead yield resources
  if (deadYields && deadYields.length > 0) {
    for (const deadYield of deadYields) {
      for (let i = 0; i < deadYield.quantity; i++) {
        mapStore.addResource(deadYield.resourceId, position.x, position.y, placementId);
        totalResourcesDropped++;
      }
    }
  }

  // Remove the creature from the map
  if (creatureType === 'plant') {
    mapStore.removePlant(placementId);
  } else {
    mapStore.removeAnimal(placementId);
  }

  // Clean up yield state
  yieldStore.removePlacement(placementId);

  console.log(
    `[DeadYieldService] Harvested ${creatureType} ${placementId}, dropped ${totalResourcesDropped} resources`
  );

  return true;
}
