import { useRuntimeMapStore } from '@/stores/runtimeMapStore';
import { useVillagerStore } from '@/stores/villagerStore';
import { useWorldStore } from '@/stores/worldStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import type { VillagerPlacement } from '@/stores/mapEditorStore';
import type { Villager, VillagerQuest, QuestRequirement, HumanNeeds, HumanStats } from '@/types/humans';
import type { Inventory, Container, InventorySlot } from '@/types/tools';
import type { Vector2 } from '@/types/core';

/**
 * Villager Service
 *
 * Handles the villager system:
 * - Spawning villagers from placements
 * - Daily needs and loyalty updates
 * - Recruitment quest generation
 */

/**
 * Create default needs for a new villager
 */
function createDefaultNeeds(): HumanNeeds {
  return {
    food: 80,
    water: 80,
    shelter: false,
    happiness: 70,
  };
}

/**
 * Create default stats for a new villager
 */
function createDefaultStats(): HumanStats {
  return {
    intelligence: 5,
    strength: 5,
    speed: 5,
    craftingSkill: 1,
  };
}

/**
 * Create default inventory for a new villager
 */
function createDefaultInventory(): Inventory {
  const emptySlots: InventorySlot[] = [];
  for (let i = 0; i < 8; i++) {
    emptySlots.push({
      itemId: null,
      itemType: 'material',
      quantity: 0,
    });
  }

  const toolContainer: Container = {
    id: 'tool-container',
    type: 'pouch',
    capacity: 10,
    currentWeight: 0,
    slots: [...emptySlots],
  };

  const materialContainer: Container = {
    id: 'material-container',
    type: 'basket',
    capacity: 20,
    currentWeight: 0,
    slots: [...emptySlots],
  };

  return {
    toolContainer,
    materialContainer,
    selectedToolSlot: 0,
  };
}

/**
 * Generate a simple recruitment quest for a villager
 */
export function generateRecruitmentQuest(villagerId: string): VillagerQuest {
  const defStore = useDefinitionsStore.getState();

  // Get available resources for quest requirements
  const availableResources = defStore.resources.filter(r => r.category === 'food' || r.category === 'wood');

  // Pick 1-2 random resources
  const numRequirements = Math.floor(Math.random() * 2) + 1; // 1 or 2
  const requirements: QuestRequirement[] = [];

  for (let i = 0; i < numRequirements; i++) {
    if (availableResources.length === 0) break;

    const randomIndex = Math.floor(Math.random() * availableResources.length);
    const resource = availableResources[randomIndex];

    // Remove from available to avoid duplicates
    availableResources.splice(randomIndex, 1);

    requirements.push({
      type: 'bring_material',
      targetId: resource.id,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
      current: 0,
    });
  }

  // Fallback if no resources available
  if (requirements.length === 0) {
    requirements.push({
      type: 'bring_material',
      targetId: 'apple',
      quantity: 2,
      current: 0,
    });
  }

  const description = requirements.length === 1
    ? `Bring me ${requirements[0].quantity} ${requirements[0].targetId}`
    : `Bring me some supplies`;

  return {
    id: `quest-${villagerId}`,
    description,
    requirements,
    completed: false,
  };
}

/**
 * Spawn a villager from a placement
 * Creates a full Villager object with default needs, stats, etc.
 */
export function spawnVillagerFromPlacement(placement: VillagerPlacement): void {
  const villagerStore = useVillagerStore.getState();

  // Check if villager already exists
  const existing = villagerStore.getVillager(placement.id);
  if (existing) {
    console.log(`[VillagerService] Villager ${placement.id} already exists, skipping spawn`);
    return;
  }

  // Create recruitment quest if not recruited yet
  const recruitmentQuest = placement.recruitmentQuest
    ? (placement.recruitmentQuest as VillagerQuest)
    : generateRecruitmentQuest(placement.id);

  // Create full villager object
  const villager: Villager = {
    id: placement.id,
    type: 'human',
    name: `Villager ${placement.id.split('-').pop()}`,
    age: 20,
    maxAge: 100,
    health: 100,
    maxHealth: 100,
    growthRate: 0,
    hunger: 0,
    position: { x: placement.x, y: placement.y },
    needs: createDefaultNeeds(),
    stats: createDefaultStats(),
    velocity: { x: 0, y: 0 } as Vector2,
    facing: 'down',
    state: 'idle',
    inventory: createDefaultInventory(),
    isLocalPlayer: false,
    loyalty: 'content',
    recruitmentQuest,
    isRecruited: false,
    warningTimer: 0,
    currentTask: undefined,
  };

  villagerStore.addVillager(villager);
  console.log(`[VillagerService] Spawned villager: ${villager.id} at (${placement.x}, ${placement.y})`);
}

/**
 * Initialize all villagers from map placements
 * Called when starting/loading a game
 */
export function initializeVillagersForMap(): void {
  const mapStore = useRuntimeMapStore.getState();
  const villagerPlacements = mapStore.mapData.villagers;

  console.log(`[VillagerService] Initializing ${villagerPlacements.length} villagers from map`);

  for (const placement of villagerPlacements) {
    spawnVillagerFromPlacement(placement);
  }

  console.log(`[VillagerService] Initialized ${villagerPlacements.length} villagers`);
}

/**
 * Check villager needs and update loyalty
 * Called daily to manage villager satisfaction
 */
export function checkVillagerNeeds(): void {
  const villagerStore = useVillagerStore.getState();
  const villagers = Array.from(villagerStore.villagers.values()) as Villager[];
  const recruitedVillagers = villagers.filter(v => v.isRecruited);

  if (recruitedVillagers.length === 0) {
    return;
  }

  console.log(`[VillagerService] Checking needs for ${recruitedVillagers.length} recruited villagers`);

  for (const villager of recruitedVillagers) {
    // Decrease needs daily
    const newNeeds: HumanNeeds = {
      food: Math.max(0, villager.needs.food - 5),
      water: Math.max(0, villager.needs.water - 8),
      shelter: villager.needs.shelter,
      happiness: villager.needs.happiness,
    };

    // Calculate overall satisfaction (0-100)
    const foodSatisfaction = newNeeds.food;
    const waterSatisfaction = newNeeds.water;
    const shelterBonus = newNeeds.shelter ? 20 : 0;
    const overallSatisfaction = (foodSatisfaction + waterSatisfaction + shelterBonus) / 2.2;

    // Update happiness based on needs
    let happinessChange = 0;
    if (overallSatisfaction < 30) {
      happinessChange = -5;
    } else if (overallSatisfaction < 60) {
      happinessChange = -2;
    } else if (overallSatisfaction > 80) {
      happinessChange = 1;
    }

    newNeeds.happiness = Math.max(0, Math.min(100, villager.needs.happiness + happinessChange));

    // Determine loyalty based on happiness
    let newLoyalty = villager.loyalty;
    if (newNeeds.happiness >= 70) {
      newLoyalty = 'happy';
    } else if (newNeeds.happiness >= 50) {
      newLoyalty = 'content';
    } else if (newNeeds.happiness >= 30) {
      newLoyalty = 'warning';
    } else {
      newLoyalty = 'leaving';
    }

    // Update villager in store
    villagerStore.villagers.set(villager.id, {
      ...villager,
      needs: newNeeds,
      loyalty: newLoyalty,
    });

    // Log warnings for villagers in danger
    if (newLoyalty === 'warning') {
      console.warn(`[VillagerService] ${villager.name} is unhappy! Food: ${newNeeds.food}, Water: ${newNeeds.water}, Happiness: ${newNeeds.happiness}`);
    } else if (newLoyalty === 'leaving') {
      console.warn(`[VillagerService] ${villager.name} is about to leave! Provide food and water immediately!`);
    }

    // Update loyalty in store if changed
    if (newLoyalty !== villager.loyalty) {
      villagerStore.updateLoyalty(villager.id, newLoyalty);
    }
  }
}

/**
 * Initialize the villager system
 * Subscribe to day changes for needs/loyalty updates
 * Returns unsubscribe function
 */
export function initVillagerSystem(): () => void {
  const worldStore = useWorldStore.getState();

  // Initialize villagers from current map
  initializeVillagersForMap();

  // Subscribe to day changes for needs checking
  const unsubscribeDayChange = worldStore.onDayChange(() => {
    checkVillagerNeeds();
  });

  console.log('[VillagerService] Villager system initialized');

  // Return unsubscribe function
  return () => {
    unsubscribeDayChange();
    console.log('[VillagerService] Villager system shut down');
  };
}
