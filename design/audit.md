# Codebase Audit vs Game Design (v0.097)

## Summary

**Implementation Rate:** 46% fully implemented, 12% partial, 42% missing

| Category | Done | Partial | Missing | Total |
|----------|------|---------|---------|-------|
| Bootstrap | 4 | 0 | 3 | 7 |
| Interaction System | 4 | 1 | 2 | 7 |
| Plant Interactions | 3 | 1 | 4 | 8 |
| Animal Interactions | 3 | 3 | 6 | 12 |
| Villager System | 5 | 3 | 5 | 13 |
| Crafting System | 3 | 1 | 3 | 7 |
| Time System | 5 | 1 | 1 | 7 |
| Inventory System | 5 | 0 | 1 | 6 |
| Yield System | 5 | 0 | 0 | 5 |
| Building System | 0 | 0 | 4 | 4 |
| Trading System | 0 | 0 | 4 | 4 |
| Multiplayer | 2 | 0 | 2 | 4 |
| **TOTAL** | **39** | **10** | **35** | **84** |

---

## Critical Blockers

### P0: Game Cannot Progress Past Day 1

| Blocker | Issue | Fix Location |
|---------|-------|--------------|
| No COOK transformation | Fire pit=150 exists, no cooking recipes | bootstrap.ts, resource transformations |
| No lean-to/shelter | Cannot complete "before night" | bootstrap.ts, structures |
| Requirements not enforced | checkRequirement() exists but never called | interactionStore.ts |

### P1: Core Mechanics Broken

| Blocker | Issue | Fix Location |
|---------|-------|--------------|
| No plant/animal state machine | Can't determine correct interactions | interactionDetection.ts |
| No taming system | No trust tracking, all animals same state | New: animalStateStore.ts |
| No building system | Types only, no placement/construction | New: buildingStore.ts |
| No give_item for quests | Can't progress villager recruitment | interactionStore.ts |

### P2: Mid-Game Systems Missing

| Blocker | Issue | Fix Location |
|---------|-------|--------------|
| No station-based processing | Can't smelt, forge, process | interactionStore.ts + stations |
| No plant growth | Crops never mature | worldStore callbacks |
| No villager task complexity | Stars >= points not checked | villagerStore.ts |

---

## Detailed Implementation Status

### A. Bootstrap Sequence

| Feature | Status | Notes |
|---------|--------|-------|
| GATHER action | ❌ Missing | Resources use 'collect', no explicit GATHER |
| BREAK (stone→fragments) | ✅ Done | `res-stone` → `res-stone-fragment` x3 |
| TWIST (fibers→cordage) | ✅ Done | `res-plant-fiber` → `res-cordage` x1 |
| STACK (firepit) | ✅ Done | 5 stone + 3 wood → fire pit |
| Fire pit heat=150 | ✅ Done | `struct-fire-pit` with heatLevel: 150 |
| COOK at firepit | ❌ Missing | No cooking transformation linked to heat |
| Lean-to shelter | ❌ Missing | No recipe, no structure definition |

### B. Interaction System

| Feature | Status | Notes |
|---------|--------|-------|
| Proximity detection | ✅ Done | `findNearestInteractable()` |
| interactionStore.setTarget | ✅ Done | Works correctly |
| InteractionPrompt actions | ⚠️ Partial | Shows actions but not state-aware |
| Key press execution | ✅ Done | `executeInteraction()` |
| Tool requirement check | ❌ Not integrated | `checkRequirement()` exists but unused |
| Heat requirement check | ❌ Not integrated | Code exists but not connected |
| Container requirement | ❌ Missing | Never checked |

### C. Plant Interactions

| Feature | Status | Notes |
|---------|--------|-------|
| ALIVE+YIELD: pick/harvest | ✅ Done | Works |
| ALIVE+YIELD: water | ⚠️ Stub | Logs but no effect |
| ALIVE+YIELD: fertilize | ❌ Missing | - |
| ALIVE+NO_YIELD: prune | ❌ Missing | - |
| ALIVE+NO_YIELD: chop_down | ✅ Done | Triggers deadYield |
| DEAD/WITHERED: uproot | ❌ Missing | - |
| Plant state detection | ❌ Missing | No HAS_YIELD/NO_YIELD/DEAD states |
| deadYield on chop_down | ✅ Done | Works |

### D. Animal Interactions

| Feature | Status | Notes |
|---------|--------|-------|
| WILD: feed (trust) | ❌ Stub | No trust tracking |
| WILD: observe | ❌ Missing | - |
| TAME+YIELD: milk/shear | ✅ Done | Works for yield |
| TAME+YIELD: pet | ⚠️ Stub | Logs only |
| TAME+YIELD: ride | ⚠️ Stub | Logs only |
| TAME+YIELD: hitch | ❌ Missing | - |
| TAME+NO_YIELD: brush | ❌ Missing | - |
| TAME+NO_YIELD: lead | ❌ Missing | - |
| TAME+NO_YIELD: butcher | ✅ Done | Triggers deadYield |
| BABY: protected | ❌ Missing | No baby state |
| Taming state machine | ❌ Missing | No WILD/TAME/BABY states |
| deadYield on butcher | ✅ Done | Works |

### E. Villager System

| Feature | Status | Notes |
|---------|--------|-------|
| UNRECRUITED state | ✅ Done | Has quest icon logic |
| talk → view quest | ⚠️ Stub | Logs, no UI |
| give_item progress | ❌ Missing | - |
| Quest completion | ✅ Done | `recruitVillager()` works |
| RECRUITED loyalty dot | ⚠️ Partial | Logic exists, no visual |
| Task: gather | ✅ Done | In VillagerTask |
| Task: farm | ❌ Missing | - |
| Task: craft | ✅ Done | In VillagerTask |
| Task: build | ✅ Done | In VillagerTask |
| Task: tend | ❌ Missing | - |
| Task: guard | ❌ Missing | - |
| Stars >= complexity | ❌ Missing | - |
| Needs decay | ✅ Done | `checkVillagerNeeds()` |
| Loyalty states | ✅ Done | happy/content/warning/leaving |
| 3-day departure | ⚠️ Partial | Warning exists, no timer |

### F. Crafting System

| Feature | Status | Notes |
|---------|--------|-------|
| Tool: Handle+Part+Binder | ✅ Done | Full system |
| Function point allocation | ✅ Done | 6 functions |
| effective_power formula | ✅ Done | `calculateEffectivePower()` |
| Processing at firepit | ❌ Missing | No station interaction |
| Processing at workbench | ❌ Missing | No workbench |
| Processing at furnace | ❌ Missing | No furnace |
| Heat level checking | ⚠️ Partial | Code exists, not integrated |

### G. Time System

| Feature | Status | Notes |
|---------|--------|-------|
| Day/night cycle | ✅ Done | 0-1440 minutes |
| Season progression | ✅ Done | 4 seasons x 30 days |
| Dawn: villager needs | ⚠️ Partial | Day change, not dawn |
| Dawn: yield regen | ✅ Done | `checkYieldRegeneration()` |
| Day: spoilage check | ✅ Done | `removeExpiredResources()` |
| Day: plant growth | ❌ Missing | - |
| Season: yield init | ✅ Done | `initializeYieldsForSeason()` |
| Season: shedding | ✅ Done | `processSeasonEnd()` |

### H. Inventory System

| Feature | Status | Notes |
|---------|--------|-------|
| Slots and capacity | ✅ Done | 20 slots default |
| addItem | ✅ Done | With stacking |
| removeItem | ✅ Done | Works |
| canAddItem | ✅ Done | Works |
| Selected slot | ✅ Done | Works |
| Container types | ❌ Not used | Design has tool/material containers |

### I. Yield System

| Feature | Status | Notes |
|---------|--------|-------|
| aliveYield structure | ✅ Done | All fields |
| deadYield structure | ✅ Done | All fields |
| Yield regeneration | ✅ Done | Interval-based |
| Season shedding | ✅ Done | Works |
| harvestYield | ✅ Done | Works |

### J. Building System

| Feature | Status | Notes |
|---------|--------|-------|
| Place blueprint | ❌ Types only | - |
| Assign materials | ❌ Types only | - |
| Construction progress | ❌ Types only | - |
| Feature activation | ❌ Types only | - |

### K. Trading System

| Feature | Status | Notes |
|---------|--------|-------|
| Marketplace location | ❌ Types only | - |
| List items | ❌ Types only | - |
| Browse/purchase | ❌ Types only | - |
| Team discounts | ❌ Types only | - |

### L. Multiplayer

| Feature | Status | Notes |
|---------|--------|-------|
| Remote player sync | ✅ Done | Works |
| Fast state (positions) | ✅ Done | `broadcastFastState()` |
| Slow state (inventory) | ❌ Missing | - |
| Slow state (world) | ❌ Missing | - |

---

## Code Exists But Unused

| Feature | Location | Why Unused |
|---------|----------|------------|
| `checkRequirement()` | transformationUtils.ts | Never called from interaction |
| Container types | types/tools.ts | inventoryStore uses flat slots |
| FoodNutrition | resourcesStore.ts | No eating/hunger system |
| Building types | types/buildings.ts | No placement logic |
| Marketplace types | types/marketplace.ts | No trading logic |

---

## Implementation Priority

### Phase 1: Unblock Day 1 (Critical)
1. Add COOK transformation (raw_meat → cooked_meat at heat≥100)
2. Add lean-to structure and stack recipe
3. Wire `checkRequirement()` into `executeInteraction()`

### Phase 2: Core Mechanics (High)
4. Add plant state detection (yield available, dead, etc.)
5. Add animal state machine (WILD/TAME/BABY)
6. Add trust system for taming
7. Add give_item interaction for quest progress

### Phase 3: Progression (High)
8. Add station-based processing (approach station → select material → transform)
9. Add plant growth on day change
10. Add villager task complexity check (stars >= points)

### Phase 4: Buildings (Medium)
11. Add building placement system
12. Add construction progress
13. Add building feature activation

### Phase 5: Economy (Low for MVP)
14. Add marketplace logic
15. Add trading between players
16. Add multiplayer slow state sync

---

## Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `src/stores/interactionStore.ts` | Wire checkRequirement, add give_item, station processing |
| `src/types/bootstrap.ts` | Add COOK, lean-to recipes |
| `src/game/utils/interactionDetection.ts` | Add state-aware interaction filtering |
| `src/stores/yieldStateStore.ts` | Expose yield availability for state detection |
| NEW: `src/stores/animalStateStore.ts` | Trust tracking, taming state machine |
| NEW: `src/stores/buildingStore.ts` | Building placement and construction |
| `src/stores/worldStore.ts` | Add plant growth callback |
| `src/stores/villagerStore.ts` | Add task complexity check, 3-day timer |
