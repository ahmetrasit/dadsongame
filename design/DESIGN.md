# Dad & Son Game - Design Spec

## CRITICAL: AI Assistant Rules
- **Implement directly** - no task agents unless user explicitly requests
- **Task agents use Opus only** - when explicitly requested
- **Never implement before confirmation** - confirm understanding concisely first
- **Concise summaries only** - just "Done (vX.XXX)" with bullet points
- **Never show code snippets** in responses to user
- **Always run dev server on 0.0.0.0**
- **Increment version** with each change (src/version.ts)

## Overview
2D open-world peaceful survival/management. Player wakes on island, gathers resources, crafts, recruits villagers, trades. **No human combat.** Animal slaughtering for sustenance is under consideration. Inspirations: Terraria, Sneaky Sasquatch, RDR.

**Project name:** "Dad & Son Game" - father and son developing together. Final game name TBD.

## Time
**Day length by season:** Summer=75%, Spring=50%, Fall=40%, Winter=30%
**Year:** 4 season slots × 30 days = 120 days. Player chooses season order during map design. Can repeat (tropical=summer×4). Instant switch at day 30/60/90.
**Implementation:** worldStore.ts tracks day/season/year. Events: onDayChange, onSeasonChange (used by SpoilageService, YieldService).
**Season flow:** Season start → initializeYieldsForSeason() | Season end → processSeasonEnd() (shed/lose)

## Creatures
**Hierarchy:** Creature(base: age,health,growthRate,hunger,needs,yield) → Plant(+water,sun,soil) | Animal(+interaction,speed,intelligence,energy) | Human(+crafting,trading,noYield)
**Yield:** aliveYield{resourceId,amount,interval,seasons[],shedding,yieldLayerImageUrl?} deadYield{resourceId,quantity}
**Shedding:** If true, uncollected yields drop to ground at season end. If false, yields are lost.
**Yield badge:** Green circle with count shown on plants/animals with available yields (MainScene:addYieldBadge)

## Plants
**Stages:** seed→sprout→mature→withered(gone). Trees: permanent at mature.
**Soil types(5):** grass,sand,rock,fertile,swamp
**Props:** Crops wither, trees don't. Harvest window limited for crops. Season-dependent.

## Animals
**Capabilities:** eat,carry,transport,produce (per species)
**Behavior:** Taming by villager (stats affect duration/success, retry on fail). Breeding automatic (happiness→rate). Baby: no yield, can't kill.
**Feeding:** Free-roaming: not fed→stops producing. Enclosed: not fed→dies, no yield.

## Villagers
**Needs:** food,water,shelter,happiness
**States:** Normal(works)→Warning(weak,can't work)→Leaves. No death.
**Stats:** intelligence,strength(carrying),speed,craftingSkill
**Recruitment:** Find→complete quest→joins→keep fed
**Abilities:** Same as player: gather,craft,tame,carry,trade

## Interactions (Master List)
**Plants:** collect, pick, harvest, chop, prune, uproot, water, fertilize
**Animals:** pet, feed, milk, shear, brush, ride, hitch, tame, gather, collect
**Resources:** collect, eat, drink

| Interaction | Applies To | Description |
|-------------|-----------|-------------|
| collect | Plants, Animals, Resources | Pick up from ground or gather items |
| pick | Plants | Harvest fruit/flowers without destroying plant |
| harvest | Plants | Collect crop (may consume plant for annuals) |
| chop | Plants | Cut down tree for wood |
| prune | Plants | Trim branches (improves health/yield) |
| uproot | Plants | Remove plant entirely |
| water | Plants | Provide water |
| fertilize | Plants | Add nutrients to soil |
| milk | Animals | Collect milk |
| shear | Animals | Collect wool/fur |
| gather | Animals | Collect eggs/feathers (passive drops) |
| pet | Animals | Increase happiness |
| feed | Animals | Give food |
| brush | Animals | Groom animal (happiness boost) |
| ride | Animals | Mount for transport |
| hitch | Animals | Attach to cart |
| tame | Animals | Begin taming process |
| eat | Resources | Consume food for nutrition |
| drink | Resources | Consume water for hydration |

## Tool Functions (6)
cutting, shaping, piercing, digging, grinding, scooping

## Technology Tiers
| Tier | Name | Max Points | Key Unlocks |
|------|------|------------|-------------|
| T1 | Primitive | 10 | gather, process, craft |
| T2 | Agricultural | 20 | farm, preserve, build, ferment |
| T3 | Metallurgical | 30 | smelt, forge, shape, alloy |
| T4 | Mechanical | 50 | machine, assemble, engineer |
| T5 | Industrial | 100 | manufacture, design, automate |
| T6 | Electronic | DLC | circuit, program, compute |
| T7 | Information | DLC | network, encrypt |

**Progression:** Tier unlocks when player crafts first item at that tier's point level.
*See storyline.md for full need levels and verb details.*

## Crafting
**Categories:** Tools, Storage, Vehicles, Consumables, Knowledge
**Constraint:** All crafting and stations must be in a building
**Recipe:** Auto-generated on craft, attached to product (documentation + blueprint for villagers)

### Tool Crafting
**Components:** Handle (material), Working Part (material), Binder (material)
**Size:** Short (portable, one-handed) | Long (reach, leverage, two-handed)
**Function Points:** Player allocates points to desired functions (cutting, shaping, piercing, etc.)
**Effectiveness:** allocated_points × material_suitability (see Material Suitability table below)
**Handle:** Affects weight, durability, comfort
**Binder:** Affects durability, stability

**Material Suitability (Working Part multipliers):**
| Material | Cutting | Shaping | Piercing | Digging | Grinding | Scooping |
|----------|---------|---------|----------|---------|----------|----------|
| stone | 0.7 | 0.8 | 0.6 | 0.7 | 0.9 | 0.5 |
| wood | 0.3 | 0.4 | 0.4 | 0.5 | 0.3 | 0.7 |
| bone | 0.6 | 0.5 | 0.8 | 0.4 | 0.5 | 0.6 |
| copper | 0.8 | 0.7 | 0.7 | 0.8 | 0.6 | 0.8 |
| bronze | 0.9 | 0.8 | 0.8 | 0.9 | 0.7 | 0.9 |
| iron | 1.0 | 0.9 | 0.9 | 1.0 | 0.8 | 1.0 |
| steel | 1.2 | 1.0 | 1.0 | 1.1 | 0.9 | 1.0 |

**Formula:** `effective_power = allocated_points × material_suitability × purity_multiplier`
**Purity multipliers:** low=0.7, med=1.0, high=1.3

### Consumable Crafting
**Types:** Food (cooked, preserved), Processed Materials (rope, leather, ingot, charcoal)
**Processing Methods:**
- Environment: Heat (fire), Dry (air/sun/smoke), Soak (liquid+time)
- Manual: Twist (hands), Mold (hands, soft materials only), Weave (hands/loom)
- Additive: Preserve (container + salt/acid/smoke)
- Tool-based: Cut, Shape, Pierce, Grind (power = tool effectiveness)
**Constraints:** Material category determines valid methods (see Processing Constraints table below)

**Processing Outputs:**
| Input | Method | Output | Notes |
|-------|--------|--------|-------|
| Food | Heat | Cooked food | Better nutrition, longer preservation |
| Food | Dry | Dried food (jerky) | Much longer preservation, lighter |
| Food | Preserve | Preserved food | Salt/pickle/smoke extends shelf life |
| Fiber | Twist | Rope/cordage | Strength based on material |
| Fiber | Weave | Cloth | Requires loom for quality |
| Hide | Soak | Leather | Tanning process, needs tannin |
| Hide | Dry | Cured hide | Simpler, less flexible than leather |
| Wood | Heat (contained) | Charcoal | Higher heat fuel |
| Wood | Dry | Seasoned wood | Better for building |
| Clay | Mold | Formed clay | Shape before firing |
| Clay | Heat | Ceramic | Fired clay, durable |
| Ore | Grind | Crusite ore | Preparation for smelting |
| Ore | Heat (high) | Metal ingot | Requires kiln |
| Metal | Heat | Molten metal | For shaping/casting |

**Processing Constraints (by material category):**
| Category | Heat | Dry | Soak | Twist | Mold | Weave | Preserve | Cut | Shape | Pierce | Grind |
|----------|------|-----|------|-------|------|-------|----------|-----|-------|--------|-------|
| Food | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Fiber | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Hide | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ |
| Wood | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ |
| Clay | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Ore | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Metal | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |

### Bootstrap (By Hand)
**Actions possible without tools:**
- Break: stone → fragments (usable as working part material)
- Twist: plant_fiber → cordage (usable as binder)
- Mold: wet clay → formed clay
- Stack: stones + wood → fire pit (Heat level: 150, cooking only)
- Gather: collect loose materials, **branches** (primitive handle, no shaping needed)

**First tool:** Player selects materials + assigns function points
- Example: stone (working part) + branch (handle) + cordage (binder) + short + cutting:5
- No predefined recipes — player decides function allocation

**Heat levels required:**
| Process | Heat needed |
|---------|-------------|
| Cooking | 100 |
| Clay firing | 300 |
| Copper smelting | 500 |
| Iron smelting | 800 |
| Steel forging | 1000 |

**Note:** Fire pit provides ~150 heat. Kiln required for clay firing and metal smelting.

### Component Crafting
**Pattern:** Material + Size → Component (same UI as tools)
| Component | Material options | Size | Output properties |
|-----------|------------------|------|-------------------|
| Wheel | wood, metal, stone | small/large | load capacity, speed, durability |
| Sled runner | wood, bone, metal | short/long | friction, durability |
| Frame | wood, metal, bamboo | S/M/L | attachment slots (1-4), weight capacity |
| Hull | wood, hide, reed | small/large | buoyancy, capacity |
| Handle | wood, metal | short/long | pull strength |
| Sail | cloth + rope + mast | small/large | wind power (T3+) |

### Vehicle Crafting
**Components:** Frame (required), Mobility (wheels/sleds/hull), Handles (for pulling/chaining), Sail (T3+)
**Assembly:** Frame + Mobility + optional(Handles, Sail, Attachments)
**Mobility types:**
- Wheels: land speed
- Sleds: land (snow/sand), lower friction needs
- Hull: water
- Wheels + Hull: amphibious
**Handles:** Required for pulled vehicles, enables vehicle-to-vehicle chaining
**Power:** Pulled (human/animal) | Sail (wind, T3+) | Engine (T5+, future)
**Attachments:** Storage or Tools can attach to frame slots

### Storage Crafting
**Types:**
| Type | Location | Capacity | Pattern |
|------|----------|----------|---------|
| Personal | On body | Smallest | Material + Carrying method (strap/belt/worn) |
| Carried | Outside | Medium-Large | Material + Handle(s) |
| Stationary | In building | Large | Frame + Container material |
| Attached | On vehicle | Large | Container component → Vehicle frame |

**Examples:**
- Personal: pouch (leather+belt), bag (cloth+strap), backpack (frame+cloth+straps)
- Carried: basket (woven fiber+handle), crate (wood+handles), chest (wood+handles)
- Stationary: cabinet (frame+wood), shelf (frame+wood), barrel (wood, no frame)
- Attached: not separate — container attached to vehicle frame

**Capacity:** `material_strength × size`
**Weight:** Container weight always counts against carrier (human or vehicle)

### Station Crafting
**Pattern:** Frame + Processing function
**Constraint:** Must be placed in a building
| Station | Components | Enables |
|---------|------------|---------|
| Loom | frame + roller + heddle | Weave (enhanced) |
| Kiln | frame + fire chamber | Heat (high temp) |
| Drying rack | frame + hanging points | Dry (batch) |
| Tanning vat | frame + container | Soak (batch) |
| Mill | frame + grinding stones | Grind (batch) |

### Knowledge Crafting
**Types:** Recipe (single product), Book (recipe collection)
**Auto-generation:** Recipe created automatically when any product is crafted
**Attachment:** Recipe attached to crafted product
**Uses:**
- Documentation: player reference for how product was made
- Blueprint: give to villager → villager can replicate
- Trading: recipes/books can be sold at marketplace
**Book creation:** Combine multiple recipes → Book
**Sharing:** Books tradeable between players (multiplayer)

### Villager Stars
**Complexity:** stars≥tool points. **Speed:** stars/points. **Time:** baseHours/speed. Base=1hr(admin configurable).
No star combining for tools. Combining OK for buildings.

### Task Requirements
Each task has min/max per function. Ex: cut tree needs cutting≥3.

## Storage & Carrying
**Storage:** Bags(mobile), Sheds(static in buildings)
**Human bags(2):** Tool bag(tools only), Material bag(materials only). Upgradeable. Speed penalty by weight.
**Shed capacity:** area×66 storage points (points=lbs). Formula: area(m²)×2m×3.3×10
**Carrying:** Hand(strength limit), Basket(1p=strength, 2p=3×capacity,(str1+str2)×1.5 limit), Cart(by body basket,animal or human pulls)
**Speed penalty:** All containers cause penalty based on weight.

## Material Categories (7)
| Category | Examples | Spoilage | Notes |
|----------|----------|----------|-------|
| Food | meat, vegetables, fruit | Fast(14d), Medium(30d), Slow(120d) | Perishable, processable |
| Fiber | plant_fiber, wool, cotton | Never | For rope, cloth |
| Hide | raw hide, leather | Never (raw spoils if wet) | From animals |
| Wood | logs, branches, bamboo | Never | Branches=natural only |
| Clay | wet clay, fired clay | Never | Rock subtype |
| Ore | copper ore, iron ore | Never | Raw metal source |
| Metal | copper, bronze, iron, steel | Never | Refined from ore |

**Non-processable:** Water (collection only, used for drinking/processing)
**Special:** Brick = clay + water + heat
**Ground display:** Emoji per resource (editable in ResourceForm). Rendered at 24px in MainScene.
**ResourcePlacement:** `{ id, definitionId, x, y, placedAtDay, sourceId? }` - placedAtDay used for spoilage calc

## Economy
**Marketplace:** Physical location, global scope, async trading, player-set prices, partial trades OK, NPC-facilitated.
**Gold:** Just another metal. **Services:** Boat rides, etc.
**Reputation:** 0-100 (start 50), affects contract limits, recovers over time.
**Contracts:** Supply, Purchase, Service, Knowledge, Alliance (team discount 20%, long-term 10-15%)

## Teams & Governance
**Hierarchy:** Player → Team (2-50) → Coalition (2-20 teams) → Federation (2-10 coalitions)
**Voting:** Routine >50%, Major >66%, Critical >80%, Dissolution unanimous
**Commitment:** Min 50 game-years. Inactive 10+ years: villagers contribute to team food.
*See storyline.md for full details.*

## Multiplayer(future)
Teams(no size limit), shared resources, division of labor. Marketplace for inter-team async trade.

## World
**Units:** All measurements in meters. Humans=2m tall.
**Current:** Single island, tile-based. **Future:** Multiple islands via bridges/boats, season offsets.

## Buildings
**Types:** Roofed(has stars,1/interior tile), Roofless(no stars,movement blocking only,can nest)
**Features(15):** resting_speed,weather_protection,storage_general,storage_cold,crafting_speed,kitchen,stables,happiness,taming,farming,healing,training,repair,dock,water_collection
**Construction:** Blueprint→gather materials→build(progress bar)→complete
**Walls:** Wood or Rock(can mix), perimeter-based. Inner walls optional.
**Doors:** Metal+Wood always. Min 1/building.
**Roof tiers:** Basic(wood+branches,1×), Standard(wood+wood,2×), Reinforced(wood+branches+rock,4×), Premium(wood+brick,8×). Only Basic upgradeable.
**Validation:** Must enclose, min 2×1 interior, min 1 door.
**Demolition:** Whole only, progress bar, 100% reclaim.

## Tech
**Stack:** Vite+React+TS, Phaser3, Zustand, Firebase, PWA
**State:** Slow(Firebase:inventory,saves,profiles), Fast(memory:positions,actions)
**Admin config:** Base craft time(1hr default)

## Visual Style
**Perspective:** Top-down 3/4 view (Factorio-style). All sprites viewed from above at slight angle.
**Tile size:** 32×32px = 1m
**Player sprite:** 20×20px, top-down view (see top of head/shoulders, not front-facing)
**Trees:** Top-down canopy view, 2 tiles tall (canopy tile + trunk tile). Canopy renders above player.
**Shadows:** Objects cast elliptical shadows to indicate depth/perspective.
**Camera:** Free pan (arrow keys), free zoom (mouse wheel 0.5x-3x). No auto-follow.

## Main Menu
**Screens:** menu → game | mapEditor | materialEditor | creatureEditor
**Options:** New Game (choose map), Resume, Editor (Map/Material/Creature)
**State:** Managed by gameStateStore.ts

## Editors

### Map Editor (E key in game, or via menu)
**Tools:** Tree (1), River (2), Spawn (3), Eraser (4)
**River drawing:** Click points, Enter to close polygon, Catmull-Rom smoothing
**Collision:** Point-in-polygon for rivers, circular for trees
**Export/Import:** JSON to clipboard
**Store:** mapEditorStore.ts

### Definition Editor (Shift+D in game, or via menu)
**Tabs:** Plants, Animals, Materials (resources)
**Layout:** Card-based, two-column layout, tree sidebar with categories
**Plant fields:** name, subCategory(tree/crop/flower/bush), growthTime, harvestWindow, seasons, soils, waterNeed, sunNeed, aliveYields[], deadYields[]
**Animal fields:** name, subCategory(livestock/poultry/wild/pet), capabilities, baseSpeed, baseIntelligence, maxEnergy, tamingDifficulty, aliveYields[], deadYields[]
**Resource fields:** name, category(food/water/metal/rock/wood/organics), spoilageRate, stackSize
**Yield structure:** { resourceId, amount, interval (days), seasons[], requiresFed }
**Export/Import:** JSON to clipboard
**Store:** definitionsStore.ts

## Version Display
**File:** src/version.ts - increment with each change
**Component:** VersionBadge.tsx - shows version top-right on all screens

## Key Files
- src/App.tsx - main app with screen routing
- src/stores/gameStateStore.ts - menu/game state
- src/stores/mapEditorStore.ts - map editor state + map data (ResourcePlacement includes placedAtDay)
- src/stores/definitionsStore.ts - plants/animals/resources definitions (re-exports from definitions/)
- src/stores/definitions/index.ts - AliveYield, DeadYield, Season types
- src/stores/definitions/resourcesStore.ts - ResourceDefinition (emoji, interactionTypes, spoilageRate)
- src/stores/yieldStateStore.ts - per-placement yield tracking (remaining counts)
- src/stores/worldStore.ts - day/season/year, SPOILAGE_DAYS, event subscriptions
- src/services/YieldService.ts - initializeYieldsForSeason, processSeasonEnd, harvestYield
- src/services/SpoilageService.ts - isResourceExpired, removeExpiredResources
- src/game/scenes/MainScene.ts - Phaser scene, addYieldBadge, createResourceSprite (emoji)
- src/game/utils/interactionDetection.ts - findNearestInteractable (plants/animals/waters/resources)
- src/components/DefinitionEditor/ - PlantForm, AnimalForm, ResourceForm (shedding checkbox, emoji picker)

## Current Phase: Yield & Spoilage Complete (v0.053)
**Version:** v0.053
**Theme:** FT salmon (#FFF1E5) with Avenir font
**Completed this session:**
- Yield system: season-based yields, per-instance tracking, shedding at season end
- Spoilage system: day-based expiry (fast=14d, medium=30d, slow=120d)
- Visual indicators: emoji for resources, yield badges for plants/animals
- Editor UI: shedding checkbox, emoji picker
**Next:** Resource collection (E key → inventory), harvest interaction, yield layer sprites
