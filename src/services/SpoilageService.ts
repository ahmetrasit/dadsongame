import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { SPOILAGE_DAYS, useWorldStore } from '@/stores/worldStore';

/**
 * Spoilage Service
 *
 * Handles checking and removing expired resources based on their spoilage rate.
 * Resources are considered expired when:
 *   currentDay - placementDay >= spoilageDays
 *
 * Spoilage rates (in days):
 * - fast: 14 days
 * - medium: 30 days
 * - slow: 120 days
 * - never: infinite (never spoils)
 */

/**
 * Check if a resource has expired based on its spoilage rate
 */
export function isResourceExpired(
  placedAtDay: number,
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never',
  currentDay: number
): boolean {
  if (spoilageRate === 'never') return false;

  const spoilageDays = SPOILAGE_DAYS[spoilageRate];
  const daysElapsed = currentDay - placedAtDay;

  return daysElapsed >= spoilageDays;
}

/**
 * Check all resources and remove expired ones
 * Should be called at the start of each new day
 */
export function removeExpiredResources(): number {
  const mapStore = useMapEditorStore.getState();
  const defStore = useDefinitionsStore.getState();
  const worldStore = useWorldStore.getState();
  const currentDay = worldStore.day;

  const resources = mapStore.mapData.resources || [];
  const expiredIds: string[] = [];

  for (const resource of resources) {
    const definition = defStore.resources.find(r => r.id === resource.definitionId);
    if (!definition) continue;

    if (isResourceExpired(resource.placedAtDay, definition.spoilageRate, currentDay)) {
      expiredIds.push(resource.id);
    }
  }

  // Remove expired resources
  for (const id of expiredIds) {
    mapStore.removeResource(id);
  }

  if (expiredIds.length > 0) {
    console.log(`[SpoilageService] Removed ${expiredIds.length} expired resources`);
  }

  return expiredIds.length;
}

/**
 * Get remaining days until a resource expires
 * Returns Infinity for never-spoiling resources
 * Returns 0 or negative if already expired
 */
export function getRemainingDays(
  placedAtDay: number,
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never',
  currentDay: number
): number {
  if (spoilageRate === 'never') return Infinity;

  const spoilageDays = SPOILAGE_DAYS[spoilageRate];
  const daysElapsed = currentDay - placedAtDay;

  return spoilageDays - daysElapsed;
}

/**
 * Get spoilage progress as a percentage (0-100)
 * Returns 0 for never-spoiling resources
 * Returns 100 if expired
 */
export function getSpoilageProgress(
  placedAtDay: number,
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never',
  currentDay: number
): number {
  if (spoilageRate === 'never') return 0;

  const spoilageDays = SPOILAGE_DAYS[spoilageRate];
  const daysElapsed = currentDay - placedAtDay;

  return Math.min(100, (daysElapsed / spoilageDays) * 100);
}

/**
 * Initialize spoilage checking on day changes
 * Call this once when the game starts
 */
export function initSpoilageSystem(): () => void {
  const unsubscribe = useWorldStore.getState().onDayChange(() => {
    removeExpiredResources();
  });

  return unsubscribe;
}
