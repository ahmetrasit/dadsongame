import { useMapEditorStore, type ResourcePlacement } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useYieldStateStore } from '@/stores/yieldStateStore';
import { useWorldStore } from '@/stores/worldStore';
import { TILE_SIZE } from '@/game/config';
import type { Season, AliveYield } from '@/stores/definitions';

/**
 * Yield Service
 *
 * Handles the seasonal yield system:
 * - Season start: Initialize/refill yields for plants and animals
 * - Season end: Shed uncollected yields or lose them
 * - Harvesting: Reduce yield count when player collects
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
 * Initialize yields for all placements when entering a new season
 */
export function initializeYieldsForSeason(season: Season): void {
  const mapStore = useMapEditorStore.getState();
  const defStore = useDefinitionsStore.getState();
  const yieldStore = useYieldStateStore.getState();

  // Initialize plant yields
  for (const plant of mapStore.mapData.plants) {
    const def = defStore.plants.find(p => p.id === plant.definitionId);
    if (!def || !def.aliveYields || def.aliveYields.length === 0) continue;

    yieldStore.initYieldState(
      plant.id,
      'plant',
      def.aliveYields,
      season
    );
  }

  // Initialize animal yields
  for (const animal of mapStore.mapData.animals) {
    const def = defStore.animals.find(a => a.id === animal.definitionId);
    if (!def || !def.aliveYields || def.aliveYields.length === 0) continue;

    yieldStore.initYieldState(
      animal.id,
      'animal',
      def.aliveYields,
      season
    );
  }

  console.log(`[YieldService] Initialized yields for season: ${season}`);
}

/**
 * Process end of season:
 * - Shed uncollected yields (if shedding=true)
 * - Clear uncollected yields (if shedding=false)
 */
export function processSeasonEnd(_endingSeason: Season): void {
  const mapStore = useMapEditorStore.getState();
  const defStore = useDefinitionsStore.getState();
  const yieldStore = useYieldStateStore.getState();

  const resourcesToCreate: Omit<ResourcePlacement, 'id'>[] = [];

  // Process plants
  for (const plant of mapStore.mapData.plants) {
    const def = defStore.plants.find(p => p.id === plant.definitionId);
    if (!def || !def.aliveYields) continue;

    const yieldState = yieldStore.getPlacementYields(plant.id);
    if (!yieldState) continue;

    for (let i = 0; i < def.aliveYields.length; i++) {
      const aliveYield = def.aliveYields[i];
      const yieldInfo = yieldState.yields[i];

      // Skip if not available this season or already collected
      if (!yieldInfo?.isAvailable || yieldInfo.remaining <= 0) continue;

      if (aliveYield.shedding) {
        // Create resource placements for uncollected yields
        const position = getShedPosition(plant.x, plant.y);
        for (let j = 0; j < yieldInfo.remaining; j++) {
          resourcesToCreate.push({
            definitionId: aliveYield.resourceId,
            x: position.x,
            y: position.y,
            placedAtDay: useWorldStore.getState().day,
            sourceId: plant.id,
          });
        }
        console.log(`[YieldService] Plant ${plant.id} shed ${yieldInfo.remaining} ${aliveYield.resourceId}`);
      } else {
        // Yield is lost
        console.log(`[YieldService] Plant ${plant.id} lost ${yieldInfo.remaining} ${aliveYield.resourceId} (not collected)`);
      }
    }
  }

  // Process animals
  for (const animal of mapStore.mapData.animals) {
    const def = defStore.animals.find(a => a.id === animal.definitionId);
    if (!def || !def.aliveYields) continue;

    const yieldState = yieldStore.getPlacementYields(animal.id);
    if (!yieldState) continue;

    for (let i = 0; i < def.aliveYields.length; i++) {
      const aliveYield = def.aliveYields[i];
      const yieldInfo = yieldState.yields[i];

      // Skip if not available this season or already collected
      if (!yieldInfo?.isAvailable || yieldInfo.remaining <= 0) continue;

      if (aliveYield.shedding) {
        // Create resource placements for uncollected yields
        const position = getShedPosition(animal.x, animal.y);
        for (let j = 0; j < yieldInfo.remaining; j++) {
          resourcesToCreate.push({
            definitionId: aliveYield.resourceId,
            x: position.x,
            y: position.y,
            placedAtDay: useWorldStore.getState().day,
            sourceId: animal.id,
          });
        }
        console.log(`[YieldService] Animal ${animal.id} shed ${yieldInfo.remaining} ${aliveYield.resourceId}`);
      } else {
        // Yield is lost
        console.log(`[YieldService] Animal ${animal.id} lost ${yieldInfo.remaining} ${aliveYield.resourceId} (not collected)`);
      }
    }
  }

  // Create all shed resources
  if (resourcesToCreate.length > 0) {
    createShedResources(resourcesToCreate);
    console.log(`[YieldService] Created ${resourcesToCreate.length} shed resources`);
  }
}

/**
 * Create shed resources in the map
 */
function createShedResources(resources: Omit<ResourcePlacement, 'id'>[]): void {
  const mapStore = useMapEditorStore.getState();

  // We need to manually add resources with IDs
  let counter = mapStore.idCounters.resource;

  const newResources: ResourcePlacement[] = resources.map(r => ({
    ...r,
    id: `resource-${++counter}`,
  }));

  // Update store with new resources
  useMapEditorStore.setState((state) => ({
    idCounters: { ...state.idCounters, resource: counter },
    mapData: {
      ...state.mapData,
      resources: [...(state.mapData.resources || []), ...newResources],
    },
  }));
}

/**
 * Harvest yield from a placement
 * Returns the resource ID and amount harvested
 */
export function harvestYield(
  placementId: string,
  yieldIndex: number = 0,
  amount: number = 1
): { resourceId: string; amount: number } | null {
  const mapStore = useMapEditorStore.getState();
  const defStore = useDefinitionsStore.getState();
  const yieldStore = useYieldStateStore.getState();

  // Find the placement and its definition
  let aliveYields: AliveYield[] | undefined;

  const plantPlacement = mapStore.mapData.plants.find(p => p.id === placementId);
  if (plantPlacement) {
    const plantDef = defStore.plants.find(p => p.id === plantPlacement.definitionId);
    aliveYields = plantDef?.aliveYields;
  } else {
    const animalPlacement = mapStore.mapData.animals.find(a => a.id === placementId);
    if (animalPlacement) {
      const animalDef = defStore.animals.find(a => a.id === animalPlacement.definitionId);
      aliveYields = animalDef?.aliveYields;
    }
  }

  if (!aliveYields || !aliveYields[yieldIndex]) {
    return null;
  }

  const aliveYield = aliveYields[yieldIndex];
  const harvested = yieldStore.harvestYield(placementId, yieldIndex, amount);

  if (harvested > 0) {
    console.log(`[YieldService] Harvested ${harvested} ${aliveYield.resourceId} from ${placementId}`);
    return { resourceId: aliveYield.resourceId, amount: harvested };
  }

  return null;
}

/**
 * Initialize the yield system
 * Subscribe to season changes
 */
export function initYieldSystem(): () => void {
  const worldStore = useWorldStore.getState();

  // Initialize yields for current season
  initializeYieldsForSeason(worldStore.season);

  // Subscribe to season changes
  const unsubscribe = worldStore.onSeasonChange((newSeason, oldSeason) => {
    // Process end of previous season (shed/lose)
    processSeasonEnd(oldSeason);

    // Initialize yields for new season
    initializeYieldsForSeason(newSeason);
  });

  return unsubscribe;
}
