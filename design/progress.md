# Progress (v0.090)

## Latest Session (2026-01-01)
- Reduced to 6 needs (removed Stay_Safe, Live_Together)
- Created ontology.md - 3-hierarchy crafting system:
  - Made Of: materials, amounts, purity, state
  - Can Do: verbs with capacities
  - Can Be Used For: 6 functional categories
- Defined functional categories: Nourishment, Recovery, Mobility, Hauling, Crafting, Signaling
- Added tool dependency chain (by_hand → with_cutting → with_shaping → with_heating)
- Added bootstrap chain for T1 hand-craftable items
- Reduced functional properties to 18 (from 24)

## Previous Session
- Optimized design docs for AI context (81% reduction)
- Added Recover need, 9 verbs (53 total), farming category

## Status

### Complete (100%)
Map Editor, Definition Editor, Firebase Integration, Interaction System, Yield System, Spoilage System

### Partial (40-70%)
| System | Done | Missing |
|--------|------|---------|
| Player Movement | WASD, collision, camera | actions, animations, needs |
| Inventory | slots, items, stacking | gathering from yields |
| HUD | time, weather, connection | quest log, needs bars |
| Time | day/season/year | speed controls, pause |

### Scaffolded
| System | Priority |
|--------|----------|
| Resource Gathering | P0 |
| Crafting | P1 |
| Villagers | P1 |
| Buildings | P2 |
| Marketplace | P2 |

## Next Steps
P0: E key → inventory, inventory HUD, harvestYield()
P1: goal system, villager personalities, discovery hints
P2: marketplace expansion, random events, multiple islands

## Unique Strengths
- Variable day length by season (75/50/40/30%)
- Async marketplace with player-set prices
- Emergent tool crafting (no predefined tools)
- Unified yield system (aliveYield/deadYield)
- Player chooses season order during map design
- Peaceful survival niche

## Critical Gaps
| Gap | Solution |
|-----|----------|
| No end goal | daily/seasonal/long-term milestones |
| No hook | marketplace as core loop (price fluctuations, reputation) |
| Shallow NPCs | personalities, preferences, quests |
| No discovery rewards | hidden recipes, rare resources |
| No random events | visitors, festivals, travelers |
| No failure state | economic failure, villager departure |

## Key Files
```
design/ontology.md                 # 3-hierarchy crafting system
design/property-hierarchy.md       # forms, capabilities, functional
design/storyline.md                # needs, verbs, tiers
stores/definitions/index.ts        # AliveYield, interactionType
game/utils/interactionDetection.ts # yield+need detection
```
