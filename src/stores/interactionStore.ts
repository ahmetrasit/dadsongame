import { create } from 'zustand';
import type { PlantDefinition } from './definitions/plantsStore';
import type { AnimalDefinition } from './definitions/animalsStore';
import type { WaterDefinition } from './definitions/waterStore';
import type { ResourceDefinition, MaterialTransformation } from './definitions/resourcesStore';
import type { StructureDefinition } from './definitions/structuresStore';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { useInventoryStore } from './inventoryStore';
import { useRuntimeMapStore } from './runtimeMapStore';
import { useDefinitionsStore } from './definitionsStore';
import { useVillagerStore } from './villagerStore';
import { usePlayerStore } from './playerStore';
import { useToolsStore } from './toolsStore';
import { useAnimalStateStore } from './animalStateStore';
import { useWorldStore } from './worldStore';
import { harvestYield } from '@/services/YieldService';
import { triggerDeadYield } from '@/services/DeadYieldService';
import { checkRequirement } from '@/utils/transformationUtils';
import type { ToolFunctionAllocation } from '@/types/tools';

// Constants for heat detection
const HEAT_DETECTION_RADIUS = 96; // 3 tiles (32px each) - must be near fire to cook

/**
 * Calculate the maximum heat level from nearby structures.
 * Checks all placed structures within HEAT_DETECTION_RADIUS of the player.
 */
function getNearbyHeat(): number {
  const playerPos = usePlayerStore.getState().player?.position;
  if (!playerPos) return 0;

  const defStore = useDefinitionsStore.getState();
  const placements = defStore.structurePlacements;
  const structures = defStore.structures;

  let maxHeat = 0;

  for (const placement of placements) {
    // Calculate distance to structure
    const dx = placement.x - playerPos.x;
    const dy = placement.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= HEAT_DETECTION_RADIUS) {
      // Find the structure definition to get heat level
      const structDef = structures.find(s => s.id === placement.definitionId);
      if (structDef?.heatLevel && structDef.heatLevel > maxHeat) {
        maxHeat = structDef.heatLevel;
      }
    }
  }

  return maxHeat;
}

/**
 * Get the function allocation stats from the currently equipped tool.
 * Returns null if no tool is equipped or the equipped item isn't a tool.
 */
function getEquippedToolStats(): Partial<ToolFunctionAllocation> | null {
  const inventoryStore = useInventoryStore.getState();
  const selectedSlot = inventoryStore.getSelectedItem();

  if (!selectedSlot?.itemId) return null;

  // Check if it's a crafted tool
  if (selectedSlot.itemId.startsWith('tool-')) {
    const tool = useToolsStore.getState().getTool(selectedSlot.itemId);
    if (tool) {
      return tool.functionPoints;
    }
  }

  return null;
}

/**
 * Check if all requirements for a transformation are met.
 * Returns { canPerform: true } if all pass, or { canPerform: false, reason: string } if any fail.
 */
function checkTransformationRequirements(
  transformation: MaterialTransformation
): { canPerform: boolean; reason?: string } {
  // No requirements = by hand, always available
  if (!transformation.requirements || transformation.requirements.length === 0) {
    return { canPerform: true };
  }

  const toolStats = getEquippedToolStats();
  const nearbyHeat = getNearbyHeat();

  for (const req of transformation.requirements) {
    const result = checkRequirement(req, toolStats, nearbyHeat);
    if (!result.met) {
      return { canPerform: false, reason: result.reason };
    }
  }

  return { canPerform: true };
}

export type InteractableType = 'plant' | 'animal' | 'water' | 'resource' | 'villager' | 'structure';

export interface InteractableObject {
  id: string;
  definitionId: string;
  type: InteractableType;
  x: number;
  y: number;
}

export interface InteractionTarget {
  object: InteractableObject;
  definition: PlantDefinition | AnimalDefinition | WaterDefinition | ResourceDefinition | StructureDefinition;
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

    // TODO: Implement actual interaction effects based on type
    switch (interactionType) {
      // Yield harvesting interactions (plants and animals)
      case 'pick':
      case 'harvest':
      case 'gather':
      case 'milk':
      case 'shear': {
        if (target.object.type !== 'plant' && target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const inventoryStore = useInventoryStore.getState();

        // Get the definition to find which yield matches this interaction
        const def = target.object.type === 'plant'
          ? defStore.plants.find(p => p.id === target.object.definitionId)
          : defStore.animals.find(a => a.id === target.object.definitionId);

        if (!def || !('aliveYields' in def)) break;

        // Default fallback for undefined interactionType
        const defaultInteraction = target.object.type === 'plant' ? 'harvest' : 'collect';

        // Find the yield that has this interaction type (with fallback for undefined)
        const yieldIndex = def.aliveYields.findIndex(y =>
          (y.interactionType || defaultInteraction) === interactionType
        );
        if (yieldIndex === -1) break;

        // Get yield info to check what resource we'd get
        const yieldDef = def.aliveYields[yieldIndex];

        // Check if inventory has space before harvesting
        if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) break;

        // Harvest the yield
        const result = harvestYield(target.object.id, yieldIndex, 1);
        if (result) {
          inventoryStore.addItem(result.resourceId, result.amount);
        }
        break;
      }
      case 'water': {
        if (target.object.type !== 'plant') break;

        const defStore = useDefinitionsStore.getState();
        const plantDef = defStore.plants.find(p => p.id === target.object.definitionId);

        if (!plantDef) break;

        // Check if plant accepts watering
        if (plantDef.needInteractions.includes('water')) {
          console.log(`[Interaction] Watered plant ${target.object.id}`);
          // TODO: Future enhancement - affect growth rate or yield quality
        }
        break;
      }
      case 'inspect': {
        const type = target.object.type;
        const name = target.definition.name;
        const id = target.object.id;

        console.log(`[Interaction] Inspecting ${type}: ${name} (id: ${id})`);

        // Log additional details based on type
        if (type === 'plant' || type === 'animal') {
          const def = target.definition as PlantDefinition | AnimalDefinition;
          if ('aliveYields' in def && def.aliveYields.length > 0) {
            console.log(`  Yields: ${def.aliveYields.map(y => `${y.resourceId} (${y.interactionType || 'harvest'})`).join(', ')}`);
          }
        } else if (type === 'resource') {
          const def = target.definition as ResourceDefinition;
          if (def.category) {
            console.log(`  Category: ${def.category}`);
          }
        }
        break;
      }
      case 'observe': {
        if (target.object.type !== 'animal') break;

        const animalState = useAnimalStateStore.getState();
        const animalData = animalState.getAnimalState(target.object.id);
        const tamingState = animalState.getTamingState(target.object.id);
        const name = target.definition.name;

        console.log(`[Interaction] Observing ${name} (${target.object.id})`);
        console.log(`  State: ${tamingState}`);

        if (animalData) {
          console.log(`  Trust: ${animalData.trustLevel}/100`);
          console.log(`  Happiness: ${animalData.happiness}/100`);
          if (animalData.lastFedDay >= 0) {
            console.log(`  Last fed: Day ${animalData.lastFedDay}`);
          }
        } else {
          console.log(`  Trust: 0/100 (not yet interacted)`);
        }
        break;
      }
      case 'pet': {
        if (target.object.type !== 'animal') break;
        console.log(`[Interaction] Pet ${target.object.id}`);
        // Future: Could increase animal happiness/friendship
        break;
      }
      case 'feed': {
        if (target.object.type !== 'animal') break;

        const animalState = useAnimalStateStore.getState();
        const worldStore = useWorldStore.getState();
        const currentDay = worldStore.day;

        // Initialize animal state if needed
        if (!animalState.getAnimalState(target.object.id)) {
          animalState.initializeAnimal(target.object.id);
        }

        const currentState = animalState.getAnimalState(target.object.id)!;
        const tamingState = animalState.getTamingState(target.object.id);

        if (tamingState === 'TAME') {
          // Already tamed - just feed for maintenance
          animalState.feedAnimal(target.object.id, currentDay);
          console.log(`[Interaction] Fed tamed animal ${target.object.id}`);
        } else {
          // Wild - build trust
          const isFirstFeed = currentState.trustLevel === 0;
          const trustGain = isFirstFeed ? 10 : 5;
          animalState.addTrust(target.object.id, trustGain);

          const newState = animalState.getAnimalState(target.object.id)!;
          if (newState.isTamed) {
            console.log(`[Interaction] ${target.object.id} is now tamed!`);
          } else {
            console.log(`[Interaction] Trust increased to ${newState.trustLevel}/100`);
          }
        }
        break;
      }
      case 'ride': {
        if (target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const animalDef = defStore.animals.find(a => a.id === target.object.definitionId);

        if (!animalDef) break;

        // Check if animal allows riding
        if (animalDef.needInteractions.includes('ride')) {
          console.log(`[Interaction] Riding ${target.object.id}`);
          // TODO: Future enhancement - change player movement mode
        }
        break;
      }
      case 'collect': {
        // For ground resources
        if (target.object.type === 'resource') {
          const inventoryStore = useInventoryStore.getState();

          const added = inventoryStore.addItem(target.object.definitionId, 1);
          if (added) {
            useRuntimeMapStore.getState().removeResource(target.object.id);
            set({ currentTarget: null });
          }
          break;
        }

        // For plants/animals with 'collect' as yield interaction
        if (target.object.type === 'plant' || target.object.type === 'animal') {
          const defStore = useDefinitionsStore.getState();
          const inventoryStore = useInventoryStore.getState();

          const def = target.object.type === 'plant'
            ? defStore.plants.find(p => p.id === target.object.definitionId)
            : defStore.animals.find(a => a.id === target.object.definitionId);

          if (!def || !('aliveYields' in def)) break;

          // Default fallback for undefined interactionType
          const defaultInteraction = target.object.type === 'plant' ? 'harvest' : 'collect';

          // Find the yield that has 'collect' as interaction type (with fallback for undefined)
          const yieldIndex = def.aliveYields.findIndex(y =>
            (y.interactionType || defaultInteraction) === 'collect'
          );
          if (yieldIndex === -1) break;

          const yieldDef = def.aliveYields[yieldIndex];

          // Check inventory space before harvesting
          if (!inventoryStore.canAddItem(yieldDef.resourceId, 1)) break;

          const result = harvestYield(target.object.id, yieldIndex, 1);
          if (result) {
            inventoryStore.addItem(result.resourceId, result.amount);
          }
        }
        break;
      }
      case 'fish': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Fishing at ${target.object.id}`);
        // TODO: Future enhancement - catch fish based on water type
        break;
      }
      case 'drink': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Drank from ${target.object.id}`);
        // TODO: Future enhancement - restore player thirst/stamina
        break;
      }
      case 'swim': {
        if (target.object.type !== 'water') break;
        console.log(`[Interaction] Swimming in ${target.object.id}`);
        // TODO: Future enhancement - affect player position/state
        break;
      }
      case 'tame': {
        if (target.object.type !== 'animal') break;

        const defStore = useDefinitionsStore.getState();
        const animalDef = defStore.animals.find(a => a.id === target.object.definitionId);

        if (!animalDef) break;

        // Check if animal allows taming
        if (animalDef.needInteractions.includes('tame')) {
          console.log(`[Interaction] Taming ${target.object.id}`);
          // TODO: Future enhancement - track taming progress
        }
        break;
      }
      case 'prune': {
        if (target.object.type !== 'plant') break;

        console.log(`[Interaction] Pruning plant ${target.object.id}`);
        // TODO: Future enhancement - improve plant health, encourage yield production
        break;
      }
      case 'fertilize': {
        if (target.object.type !== 'plant') break;

        const defStore = useDefinitionsStore.getState();
        const plantDef = defStore.plants.find(p => p.id === target.object.definitionId);

        if (!plantDef) break;

        // Check if plant accepts fertilizing
        if (plantDef.needInteractions.includes('fertilize')) {
          console.log(`[Interaction] Fertilized plant ${target.object.id}`);
          // TODO: Future enhancement - boost growth or yield quality
        }
        break;
      }
      case 'chop_down': {
        if (target.object.type !== 'plant') break;

        const result = triggerDeadYield(target.object.id, target.object.type);
        if (result) {
          set({ currentTarget: null });
        }
        break;
      }
      case 'uproot': {
        if (target.object.type !== 'plant') break;

        // Remove dead plant from the map (no yield given)
        console.log(`[Interaction] Uprooting dead plant ${target.object.id}`);
        useRuntimeMapStore.getState().removePlant(target.object.id);
        set({ currentTarget: null });
        break;
      }
      case 'butcher': {
        if (target.object.type !== 'animal') break;

        const result = triggerDeadYield(target.object.id, target.object.type);
        if (result) {
          set({ currentTarget: null });
        }
        break;
      }
      case 'talk': {
        if (target.object.type !== 'villager') break;
        console.log(`[Interaction] Talking to villager ${target.object.id}`);
        // TODO: Future enhancement - open dialogue UI
        break;
      }
      case 'recruit': {
        if (target.object.type !== 'villager') break;

        const villagerStore = useVillagerStore.getState();
        const villager = villagerStore.getVillager(target.object.id);

        if (!villager) {
          console.warn(`[Interaction] Cannot recruit: villager ${target.object.id} not found`);
          break;
        }

        if (!villager.recruitmentQuest?.completed) {
          console.warn(`[Interaction] Cannot recruit ${target.object.id}: quest not completed`);
          break;
        }

        const success = villagerStore.recruitVillager(target.object.id);
        if (success) {
          console.log(`[Interaction] Successfully recruited villager ${target.object.id}`);
        } else {
          console.log(`[Interaction] Failed to recruit villager ${target.object.id}`);
        }
        break;
      }
      case 'assign': {
        if (target.object.type !== 'villager') break;

        const villagerStore = useVillagerStore.getState();
        const villager = villagerStore.getVillager(target.object.id);

        if (!villager?.isRecruited) {
          console.warn(`[Interaction] Cannot assign task: villager ${target.object.id} not recruited`);
          break;
        }

        // TODO: Future enhancement - open task assignment UI
        console.log(`[Interaction] Opening task assignment for villager ${target.object.id}`);
        break;
      }
      case 'give_item': {
        if (target.object.type !== 'villager') break;

        const villagerStore = useVillagerStore.getState();
        const inventoryStore = useInventoryStore.getState();
        const villager = villagerStore.getVillager(target.object.id);

        if (!villager || villager.isRecruited) {
          console.log('[Interaction] Villager already recruited or not found');
          break;
        }

        const quest = villager.recruitmentQuest;
        if (!quest) {
          console.log('[Interaction] No active quest');
          break;
        }

        // Find unfulfilled bring_material requirements
        const itemReqs = quest.requirements
          .map((req, index) => ({ req, index }))
          .filter(({ req }) => req.type === 'bring_material' && req.current < req.quantity);

        if (itemReqs.length === 0) {
          console.log('[Interaction] No unfulfilled item requirements');
          break;
        }

        // Helper to count items in inventory
        const getItemCount = (itemId: string): number => {
          return inventoryStore.inventory.slots
            .filter(slot => slot.itemId === itemId)
            .reduce((sum, slot) => sum + slot.quantity, 0);
        };

        // Check player inventory for matching items and give them
        let itemsGiven = false;
        for (const { req, index } of itemReqs) {
          const playerHas = getItemCount(req.targetId);
          const needed = req.quantity - req.current;

          if (playerHas > 0) {
            // Give as many as we can (up to what's needed)
            const toGive = Math.min(playerHas, needed);

            // Remove from player inventory
            const removed = inventoryStore.removeItems([{ itemId: req.targetId, quantity: toGive }]);
            if (removed) {
              // Update quest progress (call once for each unit given)
              for (let i = 0; i < toGive; i++) {
                villagerStore.completeQuestRequirement(villager.id, index);
              }
              console.log(`[Interaction] Gave ${toGive}x ${req.targetId} to ${villager.name}`);
              itemsGiven = true;
            }
          }
        }

        if (!itemsGiven) {
          console.log('[Interaction] No matching items in inventory');
          break;
        }

        // Check if quest is now complete and auto-recruit
        const updatedVillager = villagerStore.getVillager(target.object.id);
        if (updatedVillager?.recruitmentQuest?.completed) {
          const success = villagerStore.recruitVillager(villager.id);
          if (success) {
            console.log(`[Interaction] ${villager.name} joined your settlement!`);
          }
        }
        break;
      }
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
                // Check requirements before executing transformation
                const reqCheck = checkTransformationRequirements(transformation);
                if (!reqCheck.canPerform) {
                  console.log(`[Interaction] Transformation failed: ${reqCheck.reason}`);
                  break;
                }

                inventoryStore.addItem(transformation.resultMaterialId, transformation.resultQuantity);
                // Note: plant/animal stays in the world, only the yield is consumed
                // TODO: Track yield availability state (cooldown, seasons, etc.)
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
            // Check requirements before executing transformation
            const reqCheck = checkTransformationRequirements(transformation);
            if (!reqCheck.canPerform) {
              console.log(`[Interaction] Transformation failed: ${reqCheck.reason}`);
              break;
            }

            const added = inventoryStore.addItem(transformation.resultMaterialId, transformation.resultQuantity);
            if (added) {
              useRuntimeMapStore.getState().removeResource(target.object.id);
              set({ currentTarget: null });
            }
            break;
          }

          // Fallback to bootstrap recipe (for break, twist, mold)
          const recipe = getBootstrapRecipe(target.object.definitionId);
          if (recipe && recipe.action === interactionType) {
            const added = inventoryStore.addItem(recipe.output, recipe.outputQuantity);
            if (added) {
              useRuntimeMapStore.getState().removeResource(target.object.id);
              set({ currentTarget: null });
            }
            break;
          }
        }
        break;
      }
      case 'process': {
        // Station-based processing (fire pit, workbench, furnace)
        if (target.object.type !== 'structure') {
          console.log('[Process] Can only process at structures');
          break;
        }

        const defStore = useDefinitionsStore.getState();
        const inventoryStore = useInventoryStore.getState();

        // Get structure definition to get heat level
        const structDef = defStore.structures.find(s => s.id === target.object.definitionId);
        const stationHeat = structDef?.heatLevel || 0;

        // Get selected inventory item
        const selectedSlot = inventoryStore.inventory.slots[inventoryStore.inventory.selectedSlot];

        if (!selectedSlot || !selectedSlot.itemId) {
          console.log('[Process] No item selected in inventory');
          break;
        }

        // Get resource definition and transformations
        const resource = defStore.resources.find(r => r.id === selectedSlot.itemId);
        const transformations = resource?.transformations || [];

        if (transformations.length === 0) {
          console.log(`[Process] ${selectedSlot.itemId} has no transformations`);
          break;
        }

        // Find valid transformation based on station's heat level
        // For heat sources, filter by heat requirements
        // For crafting stations, filter by tool requirements (handled by checkTransformationRequirements)
        const validTransform = transformations.find(t => {
          const heatReq = t.requirements?.find(r => r.property === 'heat');
          // If transformation needs heat, check if station provides enough
          if (heatReq) {
            return stationHeat >= heatReq.min && (heatReq.max === undefined || stationHeat <= heatReq.max);
          }
          // If no heat requirement, it can be done here if we have heat source
          // (or if it's a crafting station with no heat requirement)
          return true;
        });

        if (!validTransform) {
          console.log(`[Process] No valid transformations at heat level ${stationHeat}`);
          break;
        }

        // Check all requirements (heat + tools) using TASK-003 infrastructure
        const reqCheck = checkTransformationRequirements(validTransform);
        if (!reqCheck.canPerform) {
          console.log(`[Process] Requirements not met: ${reqCheck.reason}`);
          break;
        }

        // Check if we can add the result to inventory before removing input
        if (!inventoryStore.canAddItem(validTransform.resultMaterialId, validTransform.resultQuantity)) {
          console.log('[Process] Inventory full - cannot add result');
          break;
        }

        // Execute transformation - remove input, add output
        const removed = inventoryStore.removeItem(inventoryStore.inventory.selectedSlot, 1);
        if (removed) {
          inventoryStore.addItem(validTransform.resultMaterialId, validTransform.resultQuantity);
          console.log(`[Process] Transformed ${selectedSlot.itemId} into ${validTransform.resultMaterialId} x${validTransform.resultQuantity}`);
        }
        break;
      }
      default:
        // Unknown interaction type - no action
    }
  },
}));
