# Game Understanding (Agent Context v2)

## Core Identity
- 2D peaceful survival/crafting sim (no human combat)
- ~1500yr tech progression, civilization-building
- React+Phaser3+Zustand+Firebase
- Father-son collaboration project
- Solo-viable, team-accelerated

## 7 Pillars (Core Design Philosophy)
1. **Historical Tech** - real-world logic progression, no arbitrary trees
2. **Property-Based Crafting** - products from characteristics, not names
3. **Point-Based Buildings** - purpose via points+humans+objects
4. **Citizen Evolution** - Villager→Skilled→Citizen (random skills, trainable)
5. **Knowledge Economy** - auto-discovered recipes, shareable as books
6. **Multi-Island** - limited citizens/island forces specialization
7. **Nested Teams** - Teams→Coalitions→Federations (voting, contracts, reputation)

## Architecture
```
Definitions (templates in definitionsStore)
  → Placements (instances on map: plants[], animals[], resources[], villagers[])
MapEditor (blueprint) → RuntimeMap (working copy during gameplay)
localStorage persistence + Firebase sync
```

## 6 Human Needs (All Gameplay Driver)
| Need | Sub-categories | Progression Example |
|------|----------------|---------------------|
| Eat_and_Drink | get_food, get_water, preserve | hands→stone→metal→machine→factory |
| Recover | rest, sleep, heal, energy | ground→mat→bed→room→hospital |
| Move | go_faster, cross_water, climb | walk→shoes→ride→vehicle→fast_vehicle |
| Carry | capacity, storage, heavy_loads | hands→pouch→basket→cart→wagon |
| Make | cut, shape, join, heat | hands→stone→metal→machine→factory |
| Talk | near, far, record | voice→horn→drum→writing→printing |

## Ontology Pipeline (5 Levels)
```
L1: Material Properties
    physical: strength, hardness, weight, density, flexibility
    thermal: heat_resistance, insulation, melting_point
    electrical: conductivity, resistance
    chemical: reactivity, corrosion_resistance
    biological: nutrition, spoilage_rate

L2: Forms (30 total)
    Base(20): spike,blade,wedge,rod,tube,sheet,bowl,box,wheel,ball,
              ring,hook,frame,mesh,block,cord,hinge,handle,platform,enclosure
    Advanced(10,T2+): cone,trough,saddle,bellows,helix,valve,gear,cam,piston,lens

    Detection: spike=length>5x_width+tip<30°, blade=edge<2mm+length>10x_edge

L3: Capabilities (35) = Form + Material
    can_cut: blade + hardness≥med + strength≥low
    can_pierce: spike + hardness≥med + strength≥med
    can_contain_liquid: bowl + waterproof + rigidity≥low
    can_roll: wheel/ball + hardness≥low + rigidity≥med
    can_bind: cord + flexibility≥high + strength≥low

L4: Functional Properties (18)
    mobile: can_roll + can_support_weight → Move,Carry
    cutting: can_cut + can_grip → Make,Eat_and_Drink
    heated: can_conduct_heat + can_contain_solid → Eat_and_Drink,Make
    sheltering: can_wrap + can_support_weight → Recover

L5: Need Satisfaction (emergent from L4)
```

## Assembly Detection (17 Patterns by Tier)
```
T1: handle_assembly, lever_system, fastener_assembly, inclined_plane, cutting_tool
T2: axle_assembly, hinge_assembly, wheel_and_axle, frame_assembly, seal_assembly, container_assembly
T3: pulley_assembly, bellows_assembly, valve_assembly
T4: gear_train, screw_assembly, piston_assembly
```

## Tech Tiers
| Tier | Points | Key Verbs Added |
|------|--------|-----------------|
| T1_PRIMITIVE | 1-10 | gather,process,craft |
| T2_AGRICULTURAL | 1-20 | farm,preserve,build,ferment |
| T3_METALLURGICAL | 1-30 | smelt,forge,shape,alloy |
| T4_MECHANICAL | 1-50 | machine,assemble,engineer,temper |
| T5_INDUSTRIAL | 1-100 | manufacture,design,automate |
| T6_ELECTRONIC | DLC | circuit,program,compute |
| T7_INFORMATION | DLC | network,encrypt |

53 Core Verbs: gathering, processing, textile, building, social, transport, farming, care

## Entity Hierarchy
```
Creature(age,health,growthRate,hunger,needs,yields)
├─ Plant(water,sun,soil)
│   stages: seed→sprout→mature→withered (trees permanent at mature)
│   5 soils: grass,sand,rock,fertile,swamp
│
├─ Animal(interaction,speed,intelligence,energy)
│   capabilities: eat,carry,transport,produce
│   feeding_rules:
│     free-roaming: not_fed→stops_producing
│     enclosed: not_fed→dies,no_yield
│   babies: no_yield,cannot_be_killed
│
└─ Human(crafting,trading,noYield)
    ├─ Player(isLocalPlayer:true)
    └─ Villager(loyalty,recruitmentQuest,isRecruited,currentTask)
```

## Yields System
```typescript
aliveYield: {
  resourceId, amount, interval(days), seasons[],
  shedding(bool), interactionType, transformations[]
}
deadYield: { resourceId, quantity }
```
- shedding=true: uncollected drops to ground at season end
- shedding=false: uncollected yields lost
- Regeneration: tracked via lastHarvestDay, checked daily

## Villager System
```
Evolution: Villager → Skilled → Citizen
States: happy → content → warning → leaving (no death)
Needs: food, water, shelter, happiness (daily decay)
Stats: intelligence, strength(carrying), speed, craftingSkill
Stars: complexity≤stars, speed=stars/points, time=baseHours/speed

Recruitment: find → complete_quest(bring_materials) → joins → keep_fed
Abilities: same as player (gather,craft,tame,carry,trade)
Visual: quest_icon(unrecruited), loyalty_dot(recruited)
```

## Tool Crafting
```
Tool = Handle + WorkingPart + Binder + Size + FunctionPoints
Functions(6): cutting, shaping, piercing, digging, grinding, scooping
Formula: effective_power = allocated_points × material_suitability × purity_multiplier
```

Material Suitability (WorkingPart):
| Material | cut | shape | pierce | dig | grind | scoop |
|----------|-----|-------|--------|-----|-------|-------|
| stone | 0.7 | 0.8 | 0.6 | 0.7 | 0.9 | 0.5 |
| wood | 0.3 | 0.4 | 0.4 | 0.5 | 0.3 | 0.7 |
| bone | 0.5 | 0.5 | 0.7 | 0.4 | 0.6 | 0.6 |
| copper | 0.8 | 0.7 | 0.7 | 0.8 | 0.7 | 0.9 |
| iron | 1.0 | 0.9 | 0.9 | 1.0 | 0.8 | 1.0 |
| steel | 1.2 | 1.0 | 1.0 | 1.1 | 0.9 | 1.0 |

## Bootstrap (No Tools)
| Action | Example |
|--------|---------|
| break | stone → fragments |
| twist | plant_fiber → cordage |
| mold | wet_clay → formed_clay |
| stack | stones+wood → fire_pit(heat:150) |
| gather | collect loose materials, branches |

## Processing Methods
| Type | Methods |
|------|---------|
| Environment | heat, dry, soak |
| Manual | twist, mold, weave |
| Additive | preserve(container+salt/acid/smoke) |
| Tool-based | cut, shape, pierce, grind |

Heat Levels: cooking=100, clay_firing=300, copper_smelt=500, iron_smelt=800, steel_forge=1000

## Interactions by Target
| Target | Yield Actions | Need Actions | Death Actions |
|--------|---------------|--------------|---------------|
| Plant | pick,harvest,gather,collect | water,fertilize,prune | chop_down,uproot |
| Animal | milk,shear,collect,gather | pet,feed,brush,tame,ride,hitch | butcher |
| Resource | collect,eat,drink | - | break,twist,mold,chop,cook,grind |
| Villager | - | talk,recruit,assign | - |

Interaction Flow:
```
player_moves → findNearestInteractable() → interactionStore.setTarget()
  → InteractionPrompt renders → player_presses_key
  → executeInteraction() → inventory/map/yield updates
```

## Buildings System
```
Types:
  Roofed: has stars (1 per interior tile), provides features
  Roofless: no stars, movement blocking only, can nest

15 Features: resting_speed, weather_protection, storage_general, storage_cold,
  crafting_speed, kitchen, stables, happiness, taming, farming, healing,
  training, repair, dock, water_collection

Roof Tiers: Basic(1×) → Standard(2×) → Reinforced(4×) → Premium(8×)

CONSTRAINT: All crafting and stations must be in a building
```

## Weight & Capacity
```
object_weight = material_count × weight_per_unit
can_move = pull_capacity >= object_weight × friction_factor
```

| Entity | Pull(kg) |
|--------|----------|
| child | 5 |
| human | 50 |
| donkey | 100 |
| horse | 300 |
| ox | 500 |

| Transport | Friction |
|-----------|----------|
| wheels | 0.1 |
| sled | 0.3 |
| drag | 1.0 |

## Storage Types
1. Personal (on body)
2. Carried (held containers)
3. Stationary (placed in world)
4. Attached (on vehicles/animals)

Container Types: pouch, basket, bag, chest

## Vehicle Crafting
Frame + Mobility + Handles + optional_Sail

## Multiplayer Architecture
```
Firebase RTDB: /rooms/{roomId}/players/{id}, /state/{id}, /events
  Fast state: positions @ ~60Hz, server timestamp ordering
  Latency: measured via .info/serverTimeOffset
  Interpolation: smooth remote player movement

Firestore: /definitions/global, /maps/{id}, /players/{id}/saves
  Slow state: inventory, world modifications (on-demand/auto-save)
```

## Social Hierarchy
```
Player → Team(2-50) → Coalition(2-20 teams) → Federation(2-10 coalitions)

Voting Thresholds:
  routine: >50%
  major: >66%
  critical: >80%
  dissolution: unanimous

Contracts: supply, purchase, service, knowledge, alliance
  team_members: 20% discount
  long_term: 10-15% discount

Reputation: 0-100 (start:50), transferable, recovers over time
```

## Marketplace
- Physical location, global scope
- Async trading, player-set prices
- Partial trades OK, NPC-facilitated
- Gold is just another metal (no special currency)

## Time System
```
Day length by season: Summer=75%, Spring=50%, Fall=40%, Winter=30%
Year: 4 season slots × 30 days = 120 days
Player chooses season order (tropical = summer×4)
timeOfDay: 0-100 (0=midnight, 50=noon)

Callbacks: onDayChange → yield_regen + villager_needs
           onSeasonChange → yield_init + shedding
```

## World/Visual
```
Units: meters (humans = 2m tall)
Tiles: 32×32px = 1m
Player sprite: 20×20px
Trees: 2 tiles tall (canopy + trunk)
Map: 20×20 tiles = 640×640px
Style: top-down 3/4 view (Factorio-style)
```

## Nutrition System
- USDA-based data for 89 foods
- Vitamins: A, B, C, D, E, K, fiber, calcium, iron
- Macros: protein, carbs, goodFat, badFat (must total 100%)

## Stores (Zustand)
| Store | Key State | Persistence |
|-------|-----------|-------------|
| playerStore | position, velocity, facing, state | - |
| inventoryStore | slots[], selectedSlot, add/remove/canAdd | localStorage |
| worldStore | day, season, timeOfDay, weather, callbacks | localStorage |
| toolsStore | crafted tools | localStorage |
| mapEditorStore | blueprint placements | - |
| runtimeMapStore | working map copy | - |
| definitionsStore | plants/animals/resources/water defs | Firebase |
| villagerStore | Map<id,Villager>, loyalty, quests | localStorage |
| yieldStateStore | per-placement yield availability | - |
| interactionStore | currentTarget, availableActions | - |
| multiplayerStore | remotePlayers, connectionState, latency | - |

## Services
| Service | Responsibility |
|---------|----------------|
| YieldService | initializeYieldsForSeason, processSeasonEnd, harvestYield, checkYieldRegeneration |
| SpoilageService | removeExpiredResources (fast:14d, medium:30d, slow:120d, never) |
| DeadYieldService | triggerDeadYield (chop_down/butcher → spawn resources, remove creature) |
| VillagerService | spawnVillagerFromPlacement, generateRecruitmentQuest, checkVillagerNeeds |
| DefinitionsService | Firebase sync, retry with exponential backoff |
| GalleryService | Sprite gallery with thumbnails to Firebase |
| MultiplayerService | Abstract interface (Mock/Firebase/future:Colyseus/PartyKit) |

## Key Files
```
src/game/scenes/MainScene.ts     # game loop (1400+ lines), rendering, input, collision
src/stores/worldStore.ts         # time/season/weather with callbacks
src/stores/inventoryStore.ts     # slots, containers, item management
src/stores/interactionStore.ts   # target detection, action execution
src/stores/runtimeMapStore.ts    # gameplay map state (separate from editor)
src/services/YieldService.ts     # seasonal yield lifecycle
src/services/VillagerService.ts  # villager spawning, needs, quests
src/services/DeadYieldService.ts # death yields for chop/butcher
src/types/humans.ts              # Human, Player, Villager, HumanNeeds, HumanStats
src/types/tools.ts               # Tool, ToolFunction, Container, InventorySlot
src/types/creatures.ts           # Creature, Plant, Animal bases
src/types/materials.ts           # ResourceDefinition, MaterialTransformation
```

## Current Status (v0.097)
```
Complete (100%): Map Editor, Definition Editor, Firebase Integration,
  Interaction System, Yield System, Spoilage System, Dead Yields, Villager System

Partial (40-70%): Player Movement, Inventory, HUD, Time System

Next (P0): Processing System (heat/dry/soak/twist/mold/weave + tool-based)
```

## Implementation Roadmap
1. ✓ Bootstrap Actions
2. ✓ Inventory Integration
3. ✓ Fire Pit
4. ✓ Tool Crafting
5. → Processing System (CURRENT)
6. Consumables
7. Storage Crafting
8. Station Crafting
9. Vehicle Crafting
10. Knowledge System

## Critical Gaps Identified
| Gap | Proposed Solution |
|-----|-------------------|
| No end goal | daily/seasonal/long-term milestones |
| No hook | marketplace as core loop |
| Shallow NPCs | personalities, preferences, quests |
| No discovery rewards | hidden recipes, rare resources |
| No random events | visitors, festivals, travelers |
| No failure state | economic failure, villager departure |

## Reverted Decisions
- v0.092 Ontology System (1,661 lines) reverted for being too complex
- Replaced with simpler function-point based tool crafting
- ontology.ts had: ProductDefinition, MadeOf, CanDo, CanBeUsedFor, 30 Forms, 35 Capabilities, 18 FunctionalProperties, 54 Verbs
