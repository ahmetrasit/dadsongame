# Progress & Gap Analysis (v0.088)

## Recently Completed
**Interaction System Refactor (v0.088)**
- Split interactions: yield (per AliveYield) vs need (entity-level)
- Plants: yield=pick/harvest/collect, need=water/fertilize
- Animals: yield=milk/shear/gather/collect, need=feed/water/pet/lead/tame
- Updated PlantForm/AnimalForm with new UI structure

**Yield & Spoilage System (v0.053-0.086)**
- Time system, per-instance yield tracking, spoilage service
- Visual: emoji resources, yield badges
- Editor: shedding checkbox, emoji picker, nutrition system

## Complete (100%)
- Map Editor - Rivers, placements, spawn, Firebase sync
- Definition Editor - Plants/Animals/Resources/Water CRUD, Firebase sync
- Firebase Integration - Real-time sync, retry, reconnection
- Interaction System - E key detection, yield/need interactions
- Yield System - Season-based yields, shedding, harvest tracking
- Spoilage System - Day-based expiry (14/30/120 days)

## Partial (40-70%)
| System | Done | Missing |
|--------|------|---------|
| Player Movement | WASD, collision, camera | Actions, animations, needs |
| Inventory | Slots, items, stacking | Gathering from yields/resources |
| HUD | Time, weather, connection | Quest log, needs bars |
| Time | Day/season/year tracking | Speed controls, pause |

## Scaffolded Only
| System | Priority | Notes |
|--------|----------|-------|
| Resource Gathering | P0 | E key → collect → inventory |
| Crafting | P1 | Tool creation UI + star system |
| Villagers | P1 | Spawning, recruitment, tasks |
| Buildings | P2 | Blueprint, construction, features |
| Marketplace | P2 | Trading UI, async listings |

---

## Competitive Analysis (vs Factorio, Stardew Valley, RimWorld, Don't Starve, Terraria)

### Unique Strengths
1. **Variable day length by season** (75%/50%/40%/30%) - no competitor has this
2. **Async marketplace trading** - global, player-set prices, NPC-facilitated
3. **Emergent tool crafting** - no predefined tools, discovery-based
4. **Unified yield system** - aliveYield/deadYield across all creatures
5. **Season ordering** - player chooses climate during map design
6. **Peaceful survival niche** - underserved market segment

### Critical Gaps (Must Address)
| Gap | Risk | Competitor Reference |
|-----|------|---------------------|
| **No clear end goal** | Players lack direction | Factorio=rocket, Stardew=Community Center, Terraria=Moon Lord |
| **No "one more turn" hook** | Low retention | Factorio=optimization addiction, Stardew=seasonal deadlines |
| **Shallow NPC system** | Villagers feel like work units | Stardew has relationships, heart events, personalities |
| **No discovery rewards** | Exploration feels pointless | Terraria=biome loot, Stardew=artifacts/secrets |
| **No random events** | Predictable = boring | RimWorld=raids/events, Don't Starve=seasonal threats |
| **No failure state** | Low stakes without danger | Need economic failure or villager departure |

### Recommendations (Priority Order)

**HIGH - Core Engagement**
1. Add clear goals: daily objectives, seasonal challenges, long-term milestones
2. Make marketplace the core hook (like Factorio's automation) - price fluctuations, supply/demand, reputation
3. Add discovery system: hidden recipes, rare resources, visitor NPCs with unique opportunities
4. Deepen villagers: personalities, preferences, relationship progression, personal quests

**MEDIUM - Differentiation**
5. Add peaceful random events: weather, festivals, travelers, discoveries
6. Expand tool crafting: discovery hints, combination feedback, legendary tool goals
7. Multiple islands with unique resources/seasons (already in future plans)

**LOW - Polish**
8. Optional challenges: storms, crop disease (non-lethal), economic events
9. Social features: visit other islands, trading reputation, leaderboards

### Mechanics to Adapt
| From | Mechanic | Adaptation |
|------|----------|------------|
| Stardew | Community Center bundles | "Island restoration" goals with material donations |
| Factorio | Research tree | Trading unlocks new goods/buildings |
| RimWorld | Random events | Peaceful events (visitors, festivals) |
| Don't Starve | Seasonal prep | Weather forecasting, seasonal deadlines |
| Terraria | Boss milestones | Landmark achievements unlocking mechanics |

### Key Insight
> The peaceful survival concept requires replacing combat/danger with equally compelling tension. The **marketplace system** is the best candidate for this role but needs significant expansion.

---

## Next Steps (Updated)

### Immediate (P0)
1. Resource collection - E key → inventory
2. Inventory display in HUD
3. Harvest interaction - E key on yield → harvestYield()

### Short-term (P1)
4. Goal system - daily/seasonal objectives with rewards
5. Villager personalities - unique traits, preferences
6. Discovery mechanic - hidden recipe hints

### Medium-term (P2)
7. Marketplace expansion - dynamic pricing, reputation
8. Random events - visitors, weather, discoveries
9. Multiple islands - exploration incentive

## Key Files
- `src/stores/definitions/index.ts` - AliveYield with interactionType
- `src/stores/definitions/plantsStore.ts` - needInteractions[]
- `src/stores/definitions/animalsStore.ts` - needInteractions[]
- `src/game/utils/interactionDetection.ts` - combines yield+need interactions
- `src/components/DefinitionEditor/PlantForm.tsx` - yield dropdown, need checkboxes
- `src/components/DefinitionEditor/AnimalForm.tsx` - yield dropdown, need checkboxes
