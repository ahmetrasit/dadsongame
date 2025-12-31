# Progress & Gap Analysis (v0.053)

## Recently Completed (This Session)
**Yield & Spoilage System - FULLY IMPLEMENTED**

| Component | File(s) | Status |
|-----------|---------|--------|
| Time system (day/season/year) | `worldStore.ts` | Done |
| ResourceDefinition (emoji, interaction) | `definitions/resourcesStore.ts` | Done |
| AliveYield (shedding, yieldLayerImageUrl) | `definitions/index.ts` | Done |
| Per-instance yield state | `yieldStateStore.ts` | Done |
| Yield service (init/shed/harvest) | `services/YieldService.ts` | Done |
| Spoilage service (expiry/cleanup) | `services/SpoilageService.ts` | Done |
| Resource interaction detection | `game/utils/interactionDetection.ts` | Done |
| Visual: emoji for resources | `MainScene.ts:createResourceSprite` | Done |
| Visual: yield badge on plants/animals | `MainScene.ts:addYieldBadge` | Done |
| Editor: emoji picker | `ResourceForm.tsx` | Done |
| Editor: shedding checkbox | `PlantForm.tsx`, `AnimalForm.tsx` | Done |

## Key Implementation Details

### Yield System Flow
1. **Season start**: `initializeYieldsForSeason()` fills yield counts for placements
2. **During season**: Player can harvest via `harvestYield()` (reduces remaining count)
3. **Season end**: `processSeasonEnd()` either sheds (creates ResourcePlacement) or loses uncollected

### Spoilage Constants (worldStore.ts:SPOILAGE_DAYS)
- fast: 14 days (milk, meat)
- medium: 30 days (vegetables)
- slow: 120 days (preserved)
- never: Infinity (rock, metal, wood)

### ResourcePlacement Schema
```typescript
{ id, definitionId, x, y, placedAtDay: number, sourceId?: string }
```
- `placedAtDay`: Game day when placed (for spoilage calculation)
- `sourceId`: Plant/animal ID that produced this (if shed)

### Visual Indicators
- **Ground resources**: Emoji from ResourceDefinition (24px)
- **Yield badge**: Green circle (radius 8px) at position (12, -12) with white count text

## Complete (100%)
- Map Editor - Rivers, plants/animals/water/resources placement, spawn, Firebase sync
- Definition Editor - Plants/Animals/Resources/Water CRUD, compact layout, Firebase sync
- Firebase Integration - Real-time sync, retry logic, reconnection
- Interaction System - E key detection, interaction properties, resource detection
- **Yield System** - Season-based yields, shedding, harvest tracking
- **Spoilage System** - Day-based expiry, automatic cleanup

## Partial (40-70%)
| System | Done | Missing |
|--------|------|---------|
| Player Movement | WASD, collision, camera | Actions, animations, needs |
| Inventory | Slots, items, stacking | Gathering from yields/resources |
| HUD | Time, weather, connection | Quest log, needs bars |
| Multiplayer | Mock + Firebase services | Room management, player sync |
| Time | Day/season/year tracking | Speed controls, pause |

## Scaffolded Only (No Implementation)
| System | Priority | Notes |
|--------|----------|-------|
| **Resource Gathering** | P0 | E key → collect resource → add to inventory |
| **Crafting** | P1 | Tool creation UI + star system |
| **Villagers** | P1 | Spawning, recruitment, tasks |
| **Buildings** | P2 | Blueprint, construction, features |
| **Marketplace** | P2 | Trading UI, async listings |

## Next Steps (Suggested)
1. **Resource collection** - E key interaction adds resource to inventory
2. **Inventory display** - Show collected materials in HUD
3. **Time speed controls** - Pause/speed up game time
4. **Harvest interaction** - E key on plant/animal with yield → harvestYield()
5. **Yield layer sprites** - Show overlay when yield available (yieldLayerImageUrl)

## Key Files for Next Session
- `src/stores/yieldStateStore.ts` - Yield state per placement
- `src/services/YieldService.ts` - Yield init/shed/harvest logic
- `src/services/SpoilageService.ts` - Resource expiry
- `src/game/scenes/MainScene.ts` - Phaser rendering (lines 518-586 for badges)
- `src/stores/worldStore.ts` - Time system, SPOILAGE_DAYS
- `src/game/utils/interactionDetection.ts` - findNearestInteractable()
