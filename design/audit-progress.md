# Implementation Audit Progress

## Document Purpose
This document serves as the single source of truth for implementation progress. It contains all context needed for any independent agent to pick up and complete any task. Update after EVERY implementation.

---

## Context Summary

### Game Overview
2D peaceful survival/crafting game. Player wakes on island with nothing, must:
- Day 1: Gather → Break stone → Twist fibers → Stack firepit → Cook food → Build shelter → Sleep
- Progress through T1 (Primitive) → T2 (Agricultural) → T3 (Metallurgical) → T4 (Mechanical) → T5 (Industrial)

### Architecture
```
Definitions (templates) → Placements (map instances)
MapEditor (blueprint) → RuntimeMap (gameplay copy)
Zustand stores + Firebase sync
```

### Key Files Reference
| Purpose | File |
|---------|------|
| Bootstrap recipes | src/types/bootstrap.ts |
| Interaction execution | src/stores/interactionStore.ts |
| Interaction detection | src/game/utils/interactionDetection.ts |
| Requirement checking | src/utils/transformationUtils.ts |
| Plant definitions | src/stores/definitions/plantsStore.ts |
| Animal definitions | src/stores/definitions/animalsStore.ts |
| Resource definitions | src/stores/definitions/resourcesStore.ts |
| Yield state | src/stores/yieldStateStore.ts |
| Yield service | src/services/YieldService.ts |
| Dead yield service | src/services/DeadYieldService.ts |
| Villager store | src/stores/villagerStore.ts |
| Villager service | src/services/VillagerService.ts |
| World/time store | src/stores/worldStore.ts |
| Inventory store | src/stores/inventoryStore.ts |
| Tool types | src/types/tools.ts |
| Main game scene | src/game/scenes/MainScene.ts |
| Runtime map | src/stores/runtimeMapStore.ts |

### Current Implementation Rate
- **Done:** 39/84 (46%)
- **Partial:** 10/84 (12%)
- **Missing:** 35/84 (42%)

---

## Implementation Phases

### Phase 1: Unblock Day 1 [CRITICAL]
Without these, player cannot complete the designed Day 1 sequence.

### Phase 2: State Machines [HIGH]
Core mechanics that determine what interactions are available.

### Phase 3: Core Interactions [HIGH]
Essential gameplay loops for progression.

### Phase 4: Villager Completeness [MEDIUM]
Full villager system functionality.

### Phase 5: Buildings [MEDIUM]
Structure placement and construction.

### Phase 6: Economy [LOW - POST MVP]
Trading and multiplayer sync.

---

## Task Details

---

### TASK-001: Add COOK Transformations
**Status:** ⬜ NOT STARTED
**Phase:** 1 - Unblock Day 1
**Priority:** P0 CRITICAL
**Agent:** SONNET
**Reasoning:** Pattern-following task. Transformation structure is well-defined in existing code. Just adding similar entries.

#### Context
Fire pit exists with `heatLevel: 150`. Cooking requires `heat >= 100`. But NO food resources have cook transformations defined.

#### Files to Read First
1. `src/types/bootstrap.ts` - See existing STACK_RECIPES pattern
2. `src/types/materials.ts` - See `MaterialTransformation` and `TransformationRequirement` types
3. `src/stores/definitions/resourcesStore.ts` - See existing resource definitions

#### Files to Modify
1. `src/stores/definitions/resourcesStore.ts` - Add cook transformations to raw foods

#### Exact Implementation
Add `transformations` array to these resources:

```typescript
// For res-raw-meat (if exists) or create it:
transformations: [
  {
    action: 'cook',
    resultMaterialId: 'res-cooked-meat',
    resultQuantity: 1,
    requirements: [{ type: 'heat', minValue: 100 }]
  }
]

// For res-raw-fish (if exists) or create it:
transformations: [
  {
    action: 'cook',
    resultMaterialId: 'res-cooked-fish',
    resultQuantity: 1,
    requirements: [{ type: 'heat', minValue: 100 }]
  }
]
```

Also ensure cooked versions exist as resources.

#### Verification Criteria
- [ ] At least 3 raw foods have cook transformations
- [ ] All cooked result resources exist
- [ ] All transformations require heat >= 100
- [ ] Transformation structure matches existing patterns

#### Anti-Patterns (DO NOT)
- Don't create new transformation types
- Don't modify the TransformationRequirement interface
- Don't add transformations to non-food resources

---

### TASK-002: Add Lean-to Shelter Structure
**Status:** ⬜ NOT STARTED
**Phase:** 1 - Unblock Day 1
**Priority:** P0 CRITICAL
**Agent:** SONNET
**Reasoning:** Pattern-following. STACK_RECIPES pattern is clear and well-defined.

#### Context
Player needs shelter before first night. Fire pit uses STACK_RECIPES pattern. Need similar for lean-to.

#### Files to Read First
1. `src/types/bootstrap.ts` - See STACK_RECIPES pattern (fire pit example)
2. `src/types/buildings.ts` - See structure types if defined

#### Files to Modify
1. `src/types/bootstrap.ts` - Add lean-to to STACK_RECIPES

#### Exact Implementation
Add to STACK_RECIPES array:

```typescript
{
  id: 'struct-lean-to',
  name: 'Lean-to Shelter',
  inputs: [
    { resourceId: 'res-branch', quantity: 8 },
    { resourceId: 'res-leaves', quantity: 5 }  // or res-thatch if exists
  ],
  output: {
    type: 'structure',
    structureId: 'struct-lean-to',
    properties: {
      weatherProtection: 0.3,
      restingSpeed: 0.5
    }
  }
}
```

If `res-branch` or `res-leaves` don't exist, check what wood/plant resources ARE available and use those.

#### Verification Criteria
- [ ] Lean-to recipe added to STACK_RECIPES
- [ ] Uses only existing resource IDs
- [ ] Has weatherProtection and restingSpeed properties
- [ ] Follows exact pattern of fire pit recipe

#### Anti-Patterns (DO NOT)
- Don't create resources that don't exist
- Don't change STACK_RECIPES structure
- Don't add complex logic

---

### TASK-003: Wire checkRequirement() Into Interactions
**Status:** ⬜ NOT STARTED
**Phase:** 1 - Unblock Day 1
**Priority:** P0 CRITICAL
**Agent:** OPUS
**Reasoning:** Requires understanding full interaction flow. Must find correct insertion point. Must handle failure feedback. Architectural decision needed.

#### Context
`checkRequirement()` exists in `transformationUtils.ts` but is NEVER CALLED. All transformations execute without checking heat/tool requirements. This breaks core gameplay.

#### Files to Read First
1. `src/utils/transformationUtils.ts` - Understand checkRequirement() implementation
2. `src/stores/interactionStore.ts` - Find where transformations are executed
3. `src/types/materials.ts` - Understand TransformationRequirement type

#### Files to Modify
1. `src/stores/interactionStore.ts` - Add requirement checking before transformation execution

#### Implementation Strategy
1. Find where transformations are executed in interactionStore
2. Before executing, call `checkRequirement()` for each requirement
3. If any requirement fails, show feedback message and abort
4. Only execute transformation if all requirements pass

#### Pseudo-code
```typescript
// In executeInteraction, before applying transformation:
const transformation = getTransformation(material, action);
if (transformation?.requirements) {
  for (const req of transformation.requirements) {
    const result = checkRequirement(req, playerContext);
    if (!result.met) {
      // Show feedback: result.reason
      console.log(`[Interaction] Failed: ${result.reason}`);
      return; // Don't execute
    }
  }
}
// Now safe to execute transformation
```

#### playerContext Needs
- `inventory`: Player's inventory store (for tool checks)
- `nearbyHeat`: Heat level from nearby fire pit/furnace
- Need to determine how to get nearby heat level

#### Finding Nearby Heat
Check `runtimeMapStore` for structures near player position. If structure has `heatLevel`, use it.

#### Verification Criteria
- [ ] checkRequirement() is called before transformations
- [ ] Failed requirements prevent transformation
- [ ] Feedback message logged/shown for failures
- [ ] Successful requirements allow transformation
- [ ] Heat detection works for fire pit proximity

#### Anti-Patterns (DO NOT)
- Don't remove existing interaction handlers
- Don't change checkRequirement() signature
- Don't skip requirements - ALL must be checked

---

### TASK-004: Plant State Detection
**Status:** ⬜ NOT STARTED
**Phase:** 2 - State Machines
**Priority:** P1 HIGH
**Agent:** OPUS
**Reasoning:** Requires synthesizing data from multiple stores. Must determine state logic. Affects interaction filtering.

#### Context
Design requires different interactions based on plant state:
- ALIVE + HAS_YIELD: pick/harvest/gather, water, fertilize
- ALIVE + NO_YIELD: water, prune, chop_down
- DEAD/WITHERED: uproot

Currently ALL interactions show regardless of state.

#### Files to Read First
1. `src/stores/yieldStateStore.ts` - How yield availability is tracked
2. `src/stores/definitions/plantsStore.ts` - Plant definition structure
3. `src/game/utils/interactionDetection.ts` - Current detection logic
4. `src/components/InteractionPrompt.tsx` - How actions display

#### Files to Modify
1. `src/game/utils/interactionDetection.ts` - Add state-aware filtering

#### State Determination Logic
```typescript
function getPlantState(plantPlacement, yieldState): 'HAS_YIELD' | 'NO_YIELD' | 'DEAD' {
  // Check if plant is dead/withered
  if (plantPlacement.isDead || plantPlacement.stage === 'withered') {
    return 'DEAD';
  }

  // Check yield availability from yieldStateStore
  const yields = yieldState.getYieldsForPlacement(plantPlacement.id);
  const hasAvailableYield = yields.some(y => y.available > 0);

  return hasAvailableYield ? 'HAS_YIELD' : 'NO_YIELD';
}
```

#### Interaction Filtering
```typescript
function getPlantInteractions(plantDef, state): string[] {
  switch (state) {
    case 'HAS_YIELD':
      return ['pick', 'harvest', 'gather', 'water', 'fertilize']
        .filter(i => plantDef.needInteractions?.includes(i) || plantDef.aliveYields?.some(y => y.interactionType === i));
    case 'NO_YIELD':
      return ['water', 'prune', 'chop_down']
        .filter(i => plantDef.needInteractions?.includes(i) || plantDef.deadYields?.length > 0);
    case 'DEAD':
      return ['uproot'];
  }
}
```

#### Verification Criteria
- [ ] Plant state correctly determined from yield availability
- [ ] HAS_YIELD plants show harvest interactions
- [ ] NO_YIELD plants show care + chop_down interactions
- [ ] DEAD plants only show uproot
- [ ] Existing yield harvesting still works

#### Anti-Patterns (DO NOT)
- Don't store state separately - derive from existing data
- Don't break existing harvest functionality
- Don't modify yieldStateStore structure

---

### TASK-005: Animal State Machine (WILD/TAME/BABY)
**Status:** ⬜ NOT STARTED
**Phase:** 2 - State Machines
**Priority:** P1 HIGH
**Agent:** OPUS
**Reasoning:** New subsystem. Architectural decisions about state storage. Must persist across sessions.

#### Context
Animals have no taming state. All animals treated the same. Design requires:
- WILD: feed (trust), observe
- TAME + HAS_YIELD: milk/shear, pet, feed, ride, hitch
- TAME + NO_YIELD: pet/feed/brush, lead, butcher
- BABY: pet/feed only, NO butcher, NO yield

#### Files to Read First
1. `src/types/creatures.ts` - Animal type definition
2. `src/stores/runtimeMapStore.ts` - How animal placements work
3. `src/stores/villagerStore.ts` - Example of per-entity state store with persistence

#### Files to Create
1. `src/stores/animalStateStore.ts` - Track per-animal taming state

#### AnimalState Interface
```typescript
interface AnimalState {
  odositionId: string;  // Links to AnimalPlacement
  isTamed: boolean;
  trustLevel: number;   // 0-100, tamed at 100
  isBaby: boolean;
  happiness: number;    // 0-100
  lastFedDay: number;
}

interface AnimalStateStore {
  animalStates: Map<string, AnimalState>;

  initializeAnimal(placementId: string, isBaby?: boolean): void;
  getTamingState(placementId: string): 'WILD' | 'TAME' | 'BABY';
  addTrust(placementId: string, amount: number): void;
  setTamed(placementId: string): void;
  feedAnimal(placementId: string, currentDay: number): void;
}
```

#### Persistence
Use zustand persist middleware like inventoryStore:
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'animal-state-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      animalStates: Array.from(state.animalStates.entries())
    }),
  }
)
```

#### Integration Points
- `interactionDetection.ts` - Filter interactions by taming state
- `interactionStore.ts` - Handle feed/pet/tame actions

#### Verification Criteria
- [ ] AnimalStateStore created with all methods
- [ ] State persists in localStorage
- [ ] getTamingState returns correct state
- [ ] Baby animals identified correctly
- [ ] Integration points identified (but not modified yet)

#### Anti-Patterns (DO NOT)
- Don't modify Animal type in creatures.ts (use separate store)
- Don't couple tightly with runtimeMapStore
- Don't forget persistence

---

### TASK-006: Trust System for Taming
**Status:** ⬜ NOT STARTED
**Phase:** 2 - State Machines
**Priority:** P1 HIGH
**Depends On:** TASK-005
**Agent:** SONNET
**Reasoning:** Clear mechanics once store exists. Pattern-following for interaction handling.

#### Context
Trust mechanics from design:
- First feed: +10 trust
- Subsequent feed: +5 trust
- Threshold: 100 for taming
- Optional: -1/day decay without interaction

#### Files to Read First
1. `src/stores/animalStateStore.ts` (created in TASK-005)
2. `src/stores/interactionStore.ts` - Where to handle feed action

#### Files to Modify
1. `src/stores/animalStateStore.ts` - Ensure addTrust logic is complete
2. `src/stores/interactionStore.ts` - Wire feed action to trust system

#### Feed Interaction Handler
```typescript
case 'feed': {
  const animalState = useAnimalStateStore.getState();
  const currentState = animalState.getAnimalState(target.object.id);

  if (!currentState || currentState.isTamed) {
    // Already tamed - just feed for maintenance
    animalState.feedAnimal(target.object.id, currentDay);
    console.log(`[Interaction] Fed tamed animal ${target.object.id}`);
  } else {
    // Wild - build trust
    const isFirstFeed = currentState.trustLevel === 0;
    const trustGain = isFirstFeed ? 10 : 5;
    animalState.addTrust(target.object.id, trustGain);

    const newTrust = currentState.trustLevel + trustGain;
    if (newTrust >= 100) {
      animalState.setTamed(target.object.id);
      console.log(`[Interaction] ${target.object.id} is now tamed!`);
    } else {
      console.log(`[Interaction] Trust increased to ${newTrust}/100`);
    }
  }
  break;
}
```

#### Verification Criteria
- [ ] First feed gives +10 trust
- [ ] Subsequent feeds give +5 trust
- [ ] At 100 trust, animal becomes tamed
- [ ] Tamed animals stay tamed
- [ ] Feed action consumes food from inventory (if implemented)

#### Anti-Patterns (DO NOT)
- Don't implement without TASK-005 complete
- Don't change trust thresholds from design
- Don't forget to check if animal is already tamed

---

### TASK-007: give_item Interaction for Quest Progress
**Status:** ⬜ NOT STARTED
**Phase:** 3 - Core Interactions
**Priority:** P1 HIGH
**Agent:** OPUS
**Reasoning:** Multiple store interactions. Quest logic complexity. Edge cases.

#### Context
Villager recruitment requires completing quests by giving items. `completeQuestRequirement()` exists in villagerStore but nothing calls it.

#### Files to Read First
1. `src/stores/villagerStore.ts` - Quest structure, completeQuestRequirement()
2. `src/stores/interactionStore.ts` - Villager interaction handlers
3. `src/stores/inventoryStore.ts` - removeItem for taking from player

#### Files to Modify
1. `src/stores/interactionStore.ts` - Add give_item case

#### Quest Structure (from villagerStore)
```typescript
interface VillagerQuest {
  id: string;
  requirements: QuestRequirement[];
  completed: boolean;
}

interface QuestRequirement {
  type: 'item' | 'build' | 'craft';
  itemId?: string;
  quantity?: number;
  fulfilled: boolean;
}
```

#### give_item Implementation
```typescript
case 'give_item': {
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

  // Find unfulfilled item requirements
  const itemReqs = quest.requirements.filter(r =>
    r.type === 'item' && !r.fulfilled
  );

  // Check player inventory for matching items
  for (const req of itemReqs) {
    const playerHas = inventoryStore.getItemCount(req.itemId);
    if (playerHas >= req.quantity) {
      // Remove from player, mark fulfilled
      inventoryStore.removeItem(req.itemId, req.quantity);
      villagerStore.completeQuestRequirement(villager.id, req.itemId);
      console.log(`[Interaction] Gave ${req.quantity}x ${req.itemId}`);
    }
  }

  // Check if quest complete
  const updatedVillager = villagerStore.getVillager(target.object.id);
  const allFulfilled = updatedVillager.recruitmentQuest.requirements.every(r => r.fulfilled);
  if (allFulfilled) {
    villagerStore.recruitVillager(villager.id);
    console.log(`[Interaction] ${villager.name} joined your settlement!`);
  }
  break;
}
```

#### Verification Criteria
- [ ] give_item only works on unrecruited villagers
- [ ] Checks player inventory for quest items
- [ ] Removes items from player inventory
- [ ] Updates quest requirement to fulfilled
- [ ] Auto-recruits when all requirements met
- [ ] Handles partial fulfillment correctly

#### Anti-Patterns (DO NOT)
- Don't give items to already-recruited villagers
- Don't allow giving non-quest items
- Don't forget to remove from player inventory

---

### TASK-008: Station-Based Processing
**Status:** ⬜ NOT STARTED
**Phase:** 3 - Core Interactions
**Priority:** P1 HIGH
**Depends On:** TASK-003 (requirement checking)
**Agent:** OPUS
**Reasoning:** New interaction pattern. UI considerations. Complex flow.

#### Context
Processing flow from design:
1. Approach station (firepit, workbench, furnace)
2. Select material from inventory
3. See available transformations
4. Check requirements (heat, tools)
5. Execute transformation

Currently there's no station interaction flow.

#### Files to Read First
1. `src/stores/interactionStore.ts` - Current interaction patterns
2. `src/game/utils/interactionDetection.ts` - How objects are detected
3. `src/stores/runtimeMapStore.ts` - Structure placements
4. `src/components/InteractionPrompt.tsx` - Current UI

#### Architectural Decision
**Option A:** Add station as interaction target type
- Pro: Fits existing pattern
- Con: Need UI for material selection

**Option B:** Station opens processing UI overlay
- Pro: Better UX for material selection
- Con: More complex, new component needed

**Recommended:** Option A with expanded InteractionPrompt to show material options

#### Implementation Strategy
1. Detect structures as interactables (firepit, workbench, furnace)
2. When structure targeted, show "Process [E]" action
3. Process action shows sub-menu of inventory items
4. Each item shows available transformations at this heat level
5. Selecting transformation executes it (with requirement checking from TASK-003)

#### Verification Criteria
- [ ] Structures detected as interactable
- [ ] Process action available at stations
- [ ] Can select material from inventory
- [ ] Transformations filtered by station heat level
- [ ] Requirement checking enforced
- [ ] Successful transformations work

#### Anti-Patterns (DO NOT)
- Don't bypass requirement checking
- Don't allow processing without station
- Don't break existing structure interactions

---

### TASK-009: Plant Growth on Day Change
**Status:** ⬜ NOT STARTED
**Phase:** 3 - Core Interactions
**Priority:** P1 HIGH
**Agent:** SONNET
**Reasoning:** Clear mechanics. Callback pattern exists in worldStore.

#### Context
Plants have growth stages but never advance. worldStore has day change callbacks.

#### Files to Read First
1. `src/stores/worldStore.ts` - onDayChange callback pattern
2. `src/stores/definitions/plantsStore.ts` - Plant growth stages
3. `src/stores/runtimeMapStore.ts` - Plant placements

#### Files to Modify
1. `src/services/PlantGrowthService.ts` (NEW) - Or add to existing service
2. `src/game/scenes/MainScene.ts` - Register callback

#### Growth Logic
```typescript
function advancePlantGrowth(plants: PlantPlacement[], definitions: Map<string, PlantDefinition>) {
  for (const plant of plants) {
    const def = definitions.get(plant.definitionId);
    if (!def) continue;

    // Increment days since planting
    plant.daysGrown = (plant.daysGrown || 0) + 1;

    // Check if ready to advance stage
    const stages = ['seed', 'sprout', 'mature', 'withered'];
    const currentIndex = stages.indexOf(plant.stage || 'seed');

    if (plant.daysGrown >= def.growthTime && currentIndex < 2) {
      plant.stage = stages[currentIndex + 1];
      plant.daysGrown = 0; // Reset for next stage
    }
  }
}
```

#### Registration
```typescript
// In MainScene.create() or App initialization
const unsubscribe = useWorldStore.getState().onDayChange((newDay) => {
  const plants = useRuntimeMapStore.getState().mapData.plants;
  advancePlantGrowth(plants);
});
```

#### Verification Criteria
- [ ] Plants advance stage after growthTime days
- [ ] seed → sprout → mature progression works
- [ ] Callback registered on day change
- [ ] Plant stage persists

#### Anti-Patterns (DO NOT)
- Don't modify plant definitions
- Don't advance multiple stages at once
- Don't forget withered state for unwatered plants (future)

---

### TASK-010: Villager Task Complexity Check
**Status:** ⬜ NOT STARTED
**Phase:** 4 - Villager Completeness
**Priority:** P2 MEDIUM
**Agent:** SONNET
**Reasoning:** Clear formula. Single check to add.

#### Context
Design: Villagers can only do tasks where `stars >= task_complexity`.
Currently villagers accept any task.

#### Formula
```
crafting_stars = (craftingSkill + intelligence) / 20
task_complexity = tool_points_required
can_do_task = stars >= complexity
```

#### Files to Read First
1. `src/stores/villagerStore.ts` - Task assignment
2. `src/types/humans.ts` - Villager stats

#### Files to Modify
1. `src/stores/villagerStore.ts` - Add check in assignTask

#### Implementation
```typescript
assignTask(villagerId: string, task: VillagerTask): boolean {
  const villager = this.getVillager(villagerId);
  if (!villager) return false;

  // Calculate stars
  const stars = (villager.stats.craftingSkill + villager.stats.intelligence) / 20;

  // Get task complexity (for crafting tasks)
  if (task.type === 'craft' && task.complexity > stars) {
    console.log(`[Villager] ${villager.name} cannot do this task (${stars} stars < ${task.complexity} required)`);
    return false;
  }

  // Assign task
  villager.currentTask = task;
  return true;
}
```

#### Verification Criteria
- [ ] Stars calculated from villager stats
- [ ] Complexity compared before assignment
- [ ] Rejection logged with reason
- [ ] Simple tasks (gather) always allowed

---

### TASK-011: Villager 3-Day Departure Timer
**Status:** ⬜ NOT STARTED
**Phase:** 4 - Villager Completeness
**Priority:** P2 MEDIUM
**Agent:** SONNET
**Reasoning:** Simple counter logic.

#### Context
Design: If needs unmet for 3 consecutive days, villager leaves.
Currently: Warning state exists but no departure timer.

#### Files to Modify
1. `src/stores/villagerStore.ts` - Add daysUnhappy counter
2. `src/services/VillagerService.ts` - Check in daily needs check

#### Implementation
```typescript
// In VillagerState
daysUnhappy: number; // Add to state

// In checkVillagerNeeds
if (villager.loyalty === 'warning' || villager.loyalty === 'leaving') {
  villager.daysUnhappy = (villager.daysUnhappy || 0) + 1;

  if (villager.daysUnhappy >= 3) {
    removeVillager(villager.id);
    console.log(`[Villager] ${villager.name} has left due to neglect`);
  }
} else {
  villager.daysUnhappy = 0; // Reset if happy
}
```

#### Verification Criteria
- [ ] Counter increments when unhappy
- [ ] Counter resets when happy
- [ ] Villager removed after 3 days
- [ ] Removal logged

---

### TASK-012: Missing Villager Task Types
**Status:** ⬜ NOT STARTED
**Phase:** 4 - Villager Completeness
**Priority:** P2 MEDIUM
**Agent:** SONNET
**Reasoning:** Adding enum values and handlers.

#### Context
Missing task types: farm, tend, guard
Existing: gather, craft, build

#### Files to Modify
1. `src/types/humans.ts` - Add to VillagerTaskType
2. `src/stores/villagerStore.ts` - Add handlers if needed

#### Implementation
Add to VillagerTaskType enum:
```typescript
type VillagerTaskType = 'gather' | 'craft' | 'build' | 'farm' | 'tend' | 'guard';
```

Task definitions:
- farm: plant, water, harvest crops
- tend: feed, collect from animals
- guard: watch for events (future)

#### Verification Criteria
- [ ] All 6 task types defined
- [ ] Task type can be assigned
- [ ] Basic handler exists (even if stub)

---

## Tasks 013-018: Building & Economy Systems
**Status:** ⬜ NOT STARTED - DEFER TO POST-MVP

These are larger systems that require more design work:
- TASK-013: Building placement system
- TASK-014: Construction progress
- TASK-015: Building feature activation
- TASK-016: Marketplace logic
- TASK-017: Trading between players
- TASK-018: Multiplayer slow state sync

---

## Progress Tracking

### Completed Tasks
| Task ID | Name | Completed | Verified |
|---------|------|-----------|----------|
| - | - | - | - |

### In Progress
| Task ID | Name | Started | Blocker |
|---------|------|---------|---------|
| - | - | - | - |

### Blocked
| Task ID | Name | Blocked By | Notes |
|---------|------|------------|-------|
| TASK-006 | Trust System | TASK-005 | Needs AnimalStateStore |
| TASK-008 | Station Processing | TASK-003 | Needs requirement checking |

---

## Review Checklist Template

For each task completion, reviewer must verify:

- [ ] **Accuracy**: Implementation matches design exactly
- [ ] **Completeness**: All cases handled (happy path + edge cases)
- [ ] **Pattern Consistency**: Follows existing codebase patterns
- [ ] **No Regressions**: Existing functionality still works
- [ ] **TypeScript**: No type errors, proper typing
- [ ] **Persistence**: State persists if required
- [ ] **Logging**: Appropriate console logs for debugging

---

## Model Selection Guide

| Task Characteristics | Use OPUS | Use SONNET |
|---------------------|----------|------------|
| Multiple files coordinated | ✓ | |
| Architectural decisions | ✓ | |
| Complex state management | ✓ | |
| Edge case heavy | ✓ | |
| Clear pattern to follow | | ✓ |
| Single file focused | | ✓ |
| Adding similar entries | | ✓ |
| Simple logic | | ✓ |

---

## Update Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2025-01-05 | Document created | - | Initial 12 tasks defined |
