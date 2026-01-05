import { useRuntimeMapStore } from '@/stores/runtimeMapStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useWorldStore } from '@/stores/worldStore';
import type { PlantStage } from '@/stores/definitions/plantsStore';

/**
 * Plant Growth Service
 *
 * Handles advancing plant growth stages on day changes.
 * Plants progress through stages: seed -> sprout -> mature -> withered
 *
 * Growth rules:
 * - Each plant has a growthTime property (days required to advance)
 * - Plants track daysGrown counter
 * - When daysGrown >= growthTime, plant advances to next stage
 * - Trees (subCategory: 'tree') don't advance past 'mature'
 * - Crops advance to 'withered' if not harvested within harvestWindow
 */

const STAGES: PlantStage[] = ['seed', 'sprout', 'mature', 'withered'];

/**
 * Get the next stage for a plant
 */
function getNextStage(currentStage: PlantStage): PlantStage | null {
  const currentIndex = STAGES.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGES.length - 1) {
    return null;
  }
  return STAGES[currentIndex + 1];
}

/**
 * Advance all plants by one day and update their growth stages
 * Called at the start of each new day
 */
export function advancePlantGrowth(): void {
  const mapStore = useRuntimeMapStore.getState();
  const defStore = useDefinitionsStore.getState();
  const plants = mapStore.mapData.plants;

  let advancedCount = 0;

  for (const plant of plants) {
    const definition = defStore.plants.find(p => p.id === plant.definitionId);
    if (!definition) continue;

    // Initialize stage and daysGrown if not set
    if (!plant.stage) {
      plant.stage = 'seed';
    }
    if (plant.daysGrown === undefined) {
      plant.daysGrown = 0;
    }

    // Increment days since planting or last stage advancement
    plant.daysGrown = (plant.daysGrown || 0) + 1;

    // Get current stage index
    const currentStage = plant.stage || 'seed';
    const currentIndex = STAGES.indexOf(currentStage);

    // Trees are permanent at mature - don't advance to withered
    if (definition.subCategory === 'tree' && currentIndex >= 2) {
      continue;
    }

    // Check if ready to advance stage
    // Only advance from seed to sprout to mature (not to withered automatically)
    if (definition.growthTime && plant.daysGrown >= definition.growthTime && currentIndex < 2) {
      const nextStage = getNextStage(currentStage);
      if (nextStage) {
        plant.stage = nextStage;
        plant.daysGrown = 0; // Reset for next stage
        advancedCount++;
        console.log(`[PlantGrowth] ${plant.id} (${definition.name}) advanced to ${plant.stage}`);
      }
    }
  }

  if (advancedCount > 0) {
    console.log(`[PlantGrowth] Advanced ${advancedCount} plants on day ${useWorldStore.getState().day}`);
  }
}

/**
 * Initialize plant growth system on day changes
 * Call this once when the game starts
 * Returns unsubscribe function
 */
export function initPlantGrowthSystem(): () => void {
  const unsubscribe = useWorldStore.getState().onDayChange(() => {
    advancePlantGrowth();
  });

  console.log('[PlantGrowthService] Plant growth system initialized');

  return unsubscribe;
}
