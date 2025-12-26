# Dad & Son Game - Design Spec

## CRITICAL: AI Assistant Rules
- **Use Sonnet agents for all implementations** - never implement directly
- **Concise summaries only** - just "Done (vX.XXX)" with bullet points
- **Batch related changes** into single agent calls when possible
- **Use agents for exploration** - Opus or Sonnet, return summaries only
- **Never show code snippets** in responses to user
- **Always run dev server on 0.0.0.0**
- **Increment version** with each change (src/version.ts)

## Overview
2D open-world peaceful survival/management. Player wakes on island, gathers resources, crafts, recruits villagers, trades. No combat. Inspirations: Terraria, Sneaky Sasquatch, RDR.

## Time
**Day length by season:** Summer=75%, Spring=50%, Fall=40%, Winter=30%
**Year:** 4 season slots × 30 days = 120 days. Player chooses season order during map design. Can repeat (tropical=summer×4). Instant switch at day 30/60/90.

## Creatures
**Hierarchy:** Creature(base: age,health,growthRate,hunger,needs,yield) → Plant(+water,sun,soil) | Animal(+interaction,speed,intelligence,energy) | Human(+crafting,trading,noYield)
**Yield:** aliveYield{resource,rate,requiresFed} deadYield{resources[]}

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

## Tool Properties(10)
cutting,digging,smashing,hammering,reaching,damaging,piercing,grinding,scooping,precision

## Crafting
**Types:** Tool(toolhead+handle+binder), Cart(wheels×2++body+handle+binder), Container(TBD)

### Tool Crafting
**Baskets:** Toolhead(materials→properties), Handle(wood→length), Binder(sap/string/nails)
**Toolhead→Properties:** rock→smashing, metal→cutting, bone→precision, etc.
**Handle:** 1 handle=1 length. Count must match toolhead. Fewer=-20%, More=-10%.
**Binder:** Sap(≤3 pieces,-10%/over), String(≤10,-10%/over), Nails(unlimited). 1 binder per total piece. Single type only.

### Villager Stars
**Complexity:** stars≥tool points. **Speed:** stars/points. **Time:** baseHours/speed. Base=1hr(admin configurable).
No star combining for tools. Combining OK for buildings.

### Task Requirements
Each task has min/max per property. Ex: cut tree needs cutting≥3, smashing≤2.

### Cart Crafting
Wheels(2+baskets,≤6 materials each)→speed. Body→capacity. Handle+Binder required.

## Storage & Carrying
**Storage:** Bags(mobile), Sheds(static in buildings)
**Human bags(2):** Tool bag(tools only), Material bag(materials only). Upgradeable. Speed penalty by weight.
**Shed capacity:** area×66 storage points (points=lbs). Formula: area(m²)×2m×3.3×10
**Carrying:** Hand(strength limit), Basket(1p=strength, 2p=3×capacity,(str1+str2)×1.5 limit), Cart(by body basket,animal or human pulls)
**Speed penalty:** All containers cause penalty based on weight.

## Materials(6)
Food(perishable), Water(perishable), Metal, Rock, Wood, Organics
**Special:** Branches=wood subtype(natural only). Brick=rock subtype(rock+water+fire)
**Spoilage:** Fast(milk,meat,juice), Medium(vegetables,cooked), Slow(preserved), Never(rock,metal,wood,organics)

## Economy
**Marketplace:** Physical location, global scope, async trading, player-set prices, partial trades OK, NPC-facilitated.
**Gold:** Just another metal. **Services:** Boat rides, etc.

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
- src/stores/mapEditorStore.ts - map editor state + map data
- src/stores/definitionsStore.ts - plants/animals/resources definitions
- src/components/MainMenu.tsx - main menu
- src/components/DefinitionEditor.tsx - definition editor UI
- src/components/EditorToolbar.tsx - map editor toolbar
- src/game/scenes/MainScene.ts - Phaser game scene

## Current Phase: Editor Foundation (v0.010)
**Version:** v0.010
**Theme:** FT salmon (#FFF1E5) with Avenir font
**Main Menu:** New Game, Resume, Editor (Map Editor, Object Editor)
**Object Editor:**
- Three tabs: Plants, Animals, Materials
- Tree sidebar navigation with subcategories
- Draft pattern for new items with Save/Cancel buttons and unique name validation
- Draft pattern for dead yields with Save/Cancel when adding
- No abbreviations (full words: Spring, Summer, Autumn, Winter, Quantity)
**Controls:** ESC returns to menu from game
**Persistence:** localStorage via zustand persist middleware
**Player:** Top-down sprite (20×20px), WASD movement
**Camera:** Factorio-style (arrows=pan, wheel=zoom)
**Map:** Polygon rivers with Catmull-Rom smoothing, placeable trees
**Next:** Resource gathering, spawning defined creatures on map
