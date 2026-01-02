# Progress (v0.093)

## Latest Session (2026-01-02)
- Redesigned crafting system (5 categories: Tools, Storage, Vehicles, Consumables, Knowledge)
- Tool crafting: Handle + Working Part + Binder + Size (short/long) + Function Points
- 6 tool functions: cutting, shaping, piercing, digging, grinding, scooping
- 7 material categories: Food, Fiber, Hide, Wood, Clay, Ore, Metal
- Processing methods: Environment (Heat/Dry/Soak), Manual (Twist/Mold/Weave), Additive (Preserve), Tool-based
- Component crafting: Wheel, Frame, Hull, Handle, Sail, Sled runner
- Vehicle crafting: Frame + Mobility + optional(Handles, Sail, Attachments)
- Storage types: Personal, Carried, Stationary, Attached
- Station crafting: Frame + Processing function (must be in building)
- Knowledge: Auto-generated recipes, books for trading
- Bootstrap: by-hand actions (break, twist, mold, stack, gather)
- All crafting consolidated into DESIGN.md

## Previous Sessions
- 2026-01-01: Reduced to 6 needs, defined functional categories
- Earlier: Optimized design docs (81% reduction), added Recover need

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

## Crafting Implementation Order

| Step | Feature               | Dependencies | Description                                    |
|------|-----------------------|--------------|------------------------------------------------|
| 1    | Bootstrap Actions     | None         | by-hand: gather, break, twist, mold, stack     |
| 2    | Inventory Integration | Step 1       | E key → inventory, harvestYield()              |
| 3    | Fire Pit              | Steps 1-2    | Stack stones+wood → heat source (150)          |
| 4    | Tool Crafting         | Steps 1-3    | Handle + Working Part + Binder + Size + Points |
| 5    | Processing System     | Steps 1-4    | Heat/Dry/Soak/Twist/Mold/Weave + tool-based    |
| 6    | Consumables           | Steps 4-5    | Food processing, fuel creation                 |
| 7    | Storage Crafting      | Steps 4-5    | Personal → Carried → Stationary → Attached     |
| 8    | Station Crafting      | Steps 4-7    | Frame + Processing function (in buildings)     |
| 9    | Vehicle Crafting      | Steps 4-8    | Frame + Mobility + attachments                 |
| 10   | Knowledge System      | Steps 4-9    | Auto-generated recipes, books                  |

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
design/DESIGN.md                   # Main design spec (includes crafting)
design/property-hierarchy.md       # forms, capabilities, functional
design/storyline.md                # needs, verbs, tiers
stores/definitions/index.ts        # AliveYield, interactionType
game/utils/interactionDetection.ts # yield+need detection
```
