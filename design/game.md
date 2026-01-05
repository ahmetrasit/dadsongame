# Game Flow & Interaction Design (Agent Context)

## Core Loop
```
Survive → Stabilize → Expand → Specialize → Dominate
   ↓         ↓          ↓          ↓           ↓
 Day 1    Week 1    Month 1    Season 1    Year 1+
```

## Day 1: Bootstrap Sequence
```
Wake(nothing) → Look around → See: loose_stones, fallen_branches, plants
  ↓
GATHER(no tool): pick up stones, sticks, fibers
  ↓
BREAK(stone→fragments): smash stone, get sharp edges
  ↓
TWIST(fibers→cordage): make binding material
  ↓
First tool: stone_edge (fragment with cutting capability)
  ↓
STACK(stones+sticks→firepit): create heat source (150)
  ↓
Find food: PICK berries, GATHER eggs, COLLECT shellfish
  ↓
COOK at firepit: raw→cooked (better nutrition, slower spoil)
  ↓
Before night: STACK branches→lean-to (minimal shelter)
  ↓
SLEEP: recover, advance to Day 2
```

## Daily Cycle
```
Dawn─────────────Noon─────────────Dusk───Night
 │                 │                │      │
 └─wake,eat,drink  └─peak work     └─return └─rest
   assign villagers   harvest        eat      sleep
   plan day           craft          secure
```

Day Length by Season:
- Summer: 75% (long work, short rest)
- Spring: 50% (balanced)
- Fall: 40% (harvest urgency)
- Winter: 30% (survival mode)

⚠️ **[GAP-5]** Base day length undefined. See gaps.md for suggested values (15-20 min real-time).

## Seasonal Cycle
```
SPRING: Plant crops, animals birth, moderate yields
    ↓
SUMMER: Growth peak, maximum yields, expansion time
    ↓
FALL: Harvest everything, preserve food, prepare stores
    ↓
WINTER: Consume stores, minimal outdoor work, craft indoors
    ↓
[REPEAT] or fail if unprepared
```

Season End Events:
- Yield shedding (shedding=true → ground; false → lost)
- Crop stage advancement
- Animal aging
- Spoilage acceleration check

## Need Satisfaction Flows

### Eat_and_Drink Flow
⚠️ **[GAP-8]** Hunger/thirst decay rates undefined. See gaps.md.
```
Hunger rising → Find food source:
  ├─ Wild: approach_plant → PICK/HARVEST → eat_raw OR cook_first
  ├─ Farmed: check_mature → HARVEST → process → eat
  ├─ Animal: approach → MILK/COLLECT_EGGS → consume/cook
  └─ Stored: open_inventory → select_food → EAT

Water:
  ├─ Natural: approach_water → DRINK (direct, risky)
  ├─ Container: craft_bowl → COLLECT → drink_clean
  └─ Well: build_well → infinite_clean_water
```

### Recover Flow
⚠️ **[GAP-7]** Energy/stamina system undefined. See gaps.md for action costs & recovery rates.
```
Energy low → Find rest spot:
  ├─ Ground: minimal recovery, weather exposed
  ├─ Lean-to: basic shelter, some protection
  ├─ Bed: good recovery (bed=frame+soft_material)
  └─ House: best (roofed building, resting_speed feature)

Healing:
  ├─ Natural: rest + time
  ├─ Food: certain foods boost healing
  └─ Building: healing feature in structure
```

### Move Flow
```
Default: walk (1x speed)
  ↓ craft shoes
Shoes: walk (1.2x speed)
  ↓ tame animal
Ride: horse (3x), donkey (2x)
  ↓ build vehicle
Vehicle: cart (carry while moving), wagon (more capacity)

Water crossing:
  ├─ Shallow: walk through (slow)
  ├─ Deep: need boat/raft
  └─ Bridge: build (permanent crossing)
```

### Carry Flow
```
Hands: ~5 items, no heavy
  ↓ craft pouch
Pouch: 10 slots, light items
  ↓ craft basket
Basket: 20 slots, medium items
  ↓ craft bag
Bag: 30 slots, carried on back
  ↓ build cart
Cart: 100+ capacity, needs pulling (human=50kg, donkey=100kg, ox=500kg)
  ↓ attach to animal
Wagon: massive capacity, animal-pulled
```

### Make Flow
```
Hands(bootstrap): gather, break, twist, mold, stack
  ↓ craft stone tools
Stone(T1): cutting=0.7, shaping=0.8, piercing=0.6
  ↓ smelt metal
Metal(T3): cutting=1.0, shaping=0.9, piercing=0.9
  ↓ build machines
Machine(T4): automate, multiply output
```

### Talk Flow
```
Voice: nearby only (~10m)
  ↓ craft signal tools
Signals: fire(visible), horn(audible), flags(visual code)
  ↓ develop writing
Writing: permanent, shareable, knowledge_books
  ↓ build printing
Printing: mass produce knowledge
```

## Interaction State Machine

### Resource Interaction
```
Player approaches resource (proximity < interaction_radius)
  ↓
interactionStore.setTarget(resource)
  ↓
InteractionPrompt shows available actions:
  [1] collect  [2] eat  [3] drink  [4] break  [5] twist...
  ↓
Player presses key
  ↓
Check requirements:
  ├─ Tool needed? → check inventory for tool with sufficient function_points
  ├─ Heat needed? → check nearby heat source level
  └─ Container needed? → check inventory for container
  ↓
If requirements met:
  ├─ Consume input (remove from map/inventory)
  ├─ Produce output (add to inventory)
  ├─ Reduce tool durability (if tool used) ⚠️ **[GAP-9]** Durability values undefined
  └─ Update yield state (if yield action)

⚠️ **[GAP-17]** Failure feedback undefined. What messages show when requirements not met?
```

### Plant Interaction
```
Approach plant → detect interaction type by plant state:

ALIVE + HAS_YIELD:
  [1] pick/harvest/gather → reduce yield, add to inventory
  [2] water → reset water need (if wilting)
  [3] fertilize → boost growth

ALIVE + NO_YIELD:
  [1] water
  [2] prune (if applicable)
  [3] chop_down → trigger deadYield, remove plant

DEAD/WITHERED:
  [1] uproot → remove, get minimal materials
```

### Animal Interaction
```
Approach animal → detect state:

WILD:
  [1] feed → build trust toward taming
  [2] observe → learn behavior

TAME + HAS_YIELD:
  [1] milk/shear/collect → reduce yield, add to inventory
  [2] pet → increase happiness
  [3] feed → maintain health
  [4] ride (if rideable)
  [5] hitch (if vehicle nearby)

TAME + NO_YIELD:
  [1] pet/feed/brush
  [2] lead → animal follows
  [3] butcher → trigger deadYield, remove animal

BABY:
  [1] pet/feed only
  NO butcher (protected)
  NO yield
```

### Villager Interaction
```
Approach villager → detect recruitment state:

UNRECRUITED (quest icon visible):
  [1] talk → view recruitment quest
  [2] give_item → if quest item, progress quest
  Quest complete → villager.isRecruited = true

RECRUITED (loyalty dot visible):
  [1] talk → view status, needs, happiness
  [2] assign_task → open task menu
  [3] give_item → transfer from player inventory
  [4] follow → villager follows player
  [5] stay → villager stays at location
```

## Crafting Flow

### Tool Crafting
```
Open crafting menu (key or UI button)
  ↓
Select: Tools tab
  ↓
Choose tool type → see requirements:
  Handle: stick, bone, shaped_wood
  WorkingPart: stone_edge, metal_blade, etc.
  Binder: cordage, leather_strip, etc.
  ↓
Allocate function points (total based on materials):
  cutting: [slider 0-10]
  shaping: [slider 0-10]
  piercing: [slider 0-10]
  etc.
  ↓
Preview: effective_power = points × material_suitability × purity
  ↓
Confirm → consume materials → tool added to inventory
```

### Processing
```
Approach station (firepit, workbench, furnace)
  ↓
Select material from inventory
  ↓
See available transformations:
  raw_meat at firepit(100): [cook] → cooked_meat
  clay at firepit(150): [fire] → fired_clay
  ore at furnace(500): [smelt] → metal_ingot
  ↓
Select transformation → check requirements:
  Heat level sufficient?
  Tool with required function?
  Time available?
  ↓
If met: start processing → wait → collect result
```

### Building
```
Open build menu
  ↓
Select structure type:
  Shelter (roofless, quick)
  House (roofed, provides features)
  Storage (stationary containers)
  Station (workbench, furnace, etc.)
  ↓
Place blueprint in world (ghost preview)
  ↓
Assign materials (from inventory or nearby)
  ↓
Build progress:
  Instant (simple structures)
  Time-based (complex, can assign villagers)
  ↓
Complete → structure provides features
```

## Villager Management

### Recruitment Quest Flow
```
Find NPC in world (wanders, has quest icon)
  ↓
Talk → Quest revealed:
  "Bring me 5 cooked_fish and 3 cordage"
  "I need a stone_knife to join you"
  "Build me a shelter first"
  ↓
Player gathers requirements
  ↓
Return to villager → complete quest
  ↓
Villager joins settlement:
  - Needs activate (food, water, shelter, happiness)
  - Can be assigned tasks
  - Daily needs check begins
```

### Task Assignment Flow
```
Approach recruited villager
  ↓
Open assign menu:
  [1] Gather (specify: berries, wood, stone)
  [2] Farm (specify: plant, water, harvest)
  [3] Craft (specify: recipe) ← requires stars >= complexity
  [4] Build (specify: structure)
  [5] Tend animals (feed, collect)
  [6] Guard (watch for events)
  ↓
Villager evaluates:
  stars >= task_complexity? → accept
  has required tools? → proceed
  knows recipe? → can craft
  ↓
Villager works:
  time = baseHours / (stars / points)
  ↓
Task complete → result in settlement storage
```

### Needs Decay & Loyalty
```
Each day at dawn:
  food -= decay_rate
  water -= decay_rate
  happiness adjusted by shelter quality

Check thresholds:
  food/water > 50: happy (green)
  food/water > 25: content (yellow)
  food/water > 10: warning (orange) → cannot work
  food/water <= 10: leaving (red) → will depart

If needs unmet for 3 consecutive days:
  loyalty drops
  Eventually: villager leaves (not dies)
```

## Animal Taming Flow
⚠️ **[GAP-6]** Trust mechanics incomplete. See gaps.md for decay, species modifiers, intermediate benefits.
```
Find wild animal (horse, donkey, cow, etc.)
  ↓
Approach slowly (don't spook) ← [GAP] "spook" mechanic undefined (speed threshold?)
  ↓
Feed from inventory:
  First feed: trust +10
  Subsequent: trust +5
  [GAP] Trust decay? Per-species modifiers? Intermediate benefits at 25/50/75?
  ↓
Repeat over multiple days (trust threshold ~100)
  ↓
Once tamed:
  - Can lead (follows player)
  - Can ride (if rideable type)
  - Can hitch to vehicle
  - Can assign to stable
  ↓
Maintenance:
  Free-roaming: not fed → stops producing (no death)
  Enclosed (stable): not fed → eventually dies
  Baby animals: protected, no yield, cannot butcher
```

## Trading & Economy Flow

### Marketplace Sequence
```
Travel to marketplace (physical location on map)
  ↓
Open trading UI:
  [List Item]: select from inventory, set price
  [Browse]: see all listed items from all players
  [My Listings]: manage active listings
  [History]: past trades
  ↓
Listing:
  Select item → set quantity → set price → confirm
  Item removed from inventory, held by marketplace
  ↓
Purchase (other player):
  Browse listings → select → pay (gold or barter)
  Item transferred, payment held for seller
  ↓
Collect:
  Seller returns to marketplace
  Collect payment → inventory
  Reputation adjusted based on trade fairness
```

### Team Trading
```
Team members: 20% discount on internal trades
Long-term contracts: 10-15% additional discount

Contract creation:
  Type: supply, purchase, service, knowledge, alliance
  Terms: quantity, frequency, price, duration
  Vote: team approval required (>50% routine)
  ↓
Contract active:
  Auto-execute at specified intervals
  Breach → reputation penalty
```

## Progression Milestones

### T1: Primitive (Days 1-7)
```
Goals:
  ✓ Survive first night
  ✓ Stable food source
  ✓ Basic shelter
  ✓ First stone tools
  ✓ Fire pit operational

Unlocks: stone tools (cut:0.7, shape:0.8)
```

### T2: Agricultural (Weeks 1-4)
⚠️ **[GAP-2]** Seed acquisition undefined. How does player get seeds?
⚠️ **[GAP-10]** Planting mechanics undefined. Tilling? Spacing? Tools?
```
Goals:
  ✓ Plant first crop
  ✓ Tame first animal
  ✓ Recruit first villager
  ✓ Build first house (roofed)
  ✓ Preserve food for winter

Unlocks: farming, preservation, fermentation
```

### T3: Metallurgical (Months 1-3)
⚠️ **[GAP-3]** Fire→Kiln bootstrap gap. Fire pit=150, clay firing=300. No bridge defined.
```
Goals:
  ✓ Find ore deposits ← [GAP] Ore discovery mechanics undefined
  ✓ Build furnace (heat:500+)
  ✓ Smelt first metal
  ✓ Forge metal tools
  ✓ Expand settlement

Unlocks: metal tools (cut:1.0), alloys
```

### T4: Mechanical (Months 3-12)
```
Goals:
  ✓ Build machines (watermill, windmill)
  ✓ Automate processing
  ✓ Multiple villagers specialized
  ✓ Trade network established
  ✓ Second island scouted

Unlocks: machines, assembly, engineering
```

### T5: Industrial (Year 1+)
```
Goals:
  ✓ Factory production
  ✓ Multi-island empire
  ✓ Coalition/Federation membership
  ✓ Knowledge economy (books, training)
  ✓ Market dominance in specialty

Unlocks: manufacturing, automation, design
```

## Failure States & Recovery

### Starvation
```
Trigger: food need = 0
Effect: player weak, cannot run, reduced work speed
Recovery: eat any food
Consequence: lost work time, potential villager unhappiness
```

### Villager Departure
```
Trigger: needs unmet for 3+ days
Effect: villager leaves settlement
Recovery: cannot (villager gone), must recruit new
Consequence: lost worker, reduced capacity
```

### Crop Failure
```
Trigger: not watered, wrong season, not harvested in time
Effect: crop dies, no yield
Recovery: replant next season
Consequence: food shortage, wasted time
```

### Animal Death
```
Trigger: enclosed animal not fed
Effect: animal dies, minimal deadYield
Recovery: tame/buy new animal
Consequence: lost resource producer, food waste
```

### Economic Failure
```
Trigger: bad trades, broken contracts
Effect: reputation drops (<20 = blacklisted)
Recovery: slow reputation recovery over time, or fulfill amends
Consequence: cannot trade, isolated
```

## Multi-Island Strategy

### Citizen Limit Mechanic
⚠️ **[GAP-29]** Citizen cap (N) undefined. See gaps.md (suggested: 20/island, 50/team).
```
Each island: max N citizens (forces specialization)
  ↓
Island A: farming focus (high food output)
Island B: mining focus (ore and metal)
Island C: crafting focus (finished goods)
  ↓
Trade between islands via:
  - Boats (player travel + cargo)
  - Contracts (async delivery)
  - Marketplace (global listings)
```

### Expansion Sequence
```
Home island stable (T3+)
  ↓
Build boat (frame + mobility:sail + container:hold)
  ↓
Scout new island
  ↓
Establish outpost:
  - Basic shelter
  - Food source
  - Storage
  ↓
Send villager(s) to colonize
  ↓
Specialize based on island resources
  ↓
Trade route established
```

## Key Interaction Chains

### Food Production Chain
```
plant_seed → water → wait(days) → harvest → cook/preserve → eat
     OR
approach_animal → collect_yield → cook → eat
     OR
wild_plant → pick → eat_raw/cook → eat
```

### Tool Production Chain
```
gather_stone → break → stone_fragment (workingPart)
gather_wood → break → stick (handle)
gather_fiber → twist → cordage (binder)
  ↓
combine → stone_tool (T1)
  ↓ later
mine_ore → smelt → metal_ingot → forge → metal_tool (T3)
```

### Building Production Chain
```
gather_materials (wood, stone, thatch)
  ↓
process (cut wood to planks, shape stone to blocks)
  ↓
place_blueprint → assign_materials → build → complete
  ↓
building_provides: features (stars, bonuses)
```

### Knowledge Production Chain
```
craft_new_item → recipe_auto_discovered
  ↓
create_book (paper + ink + recipe)
  ↓
trade_book OR teach_villager
  ↓
recipient_learns_recipe
```

## Event Triggers

### Time-Based
```
Dawn: villager needs check, yield regeneration check
Day change: spoilage check, plant growth
Season change: yield initialization, shedding, crop stage
Year change: animal aging, long-term events
```

### Proximity-Based
```
Enter interaction radius: show interaction prompt
Enter danger zone: (future) predator alert
Enter trade zone: marketplace UI available
Enter building: apply building features
```

### State-Based
```
Yield available: show green badge on plant/animal
Villager unhappy: show warning indicator
Tool durability low: show wear indicator
Inventory full: block pickup, show warning
```

## UI State Flows

### Main Game States
```
MainMenu → NewGame/LoadGame → GameWorld
                                ↓
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
          Exploration       Interaction       Building
          (WASD move)       (E/1-9 keys)      (B key)
              ↓                 ↓                 ↓
              └─────────────────┴─────────────────┘
                                ↓
                            Inventory (I key)
                            Crafting (C key)
                            Map (M key)
                            Pause (Esc)
```

### Editor States (Development)
```
GameWorld ↔ MapEditor (Tab)
              ↓
          Tool palette
          Place/Remove objects
          River drawing
          Spawn point
              ↓
          Save → RuntimeMap copy for gameplay
```

---

## Gap Reference Index

See **gaps.md** for full analysis. Key gaps by category:

### Critical (Blocks Playability)
| ID | Gap | Impact |
|----|-----|--------|
| GAP-5 | Base day length undefined | Cannot tune gameplay pace |
| GAP-2 | Seed acquisition missing | Blocks T1→T2 progression |
| GAP-3 | Fire→Kiln bootstrap gap | Blocks pottery/T2 crafting |
| GAP-4 | No tutorial/onboarding | Player confusion |

### High (Significant Gameplay Impact)
| ID | Gap | Impact |
|----|-----|--------|
| GAP-6 | Trust/taming incomplete | Animal system broken |
| GAP-7 | Energy/stamina undefined | No work/rest balance |
| GAP-8 | Hunger/thirst rates undefined | Survival pacing broken |
| GAP-9 | Tool durability undefined | Tool economy broken |
| GAP-10 | Planting mechanics missing | Farming unusable |
| GAP-11 | Crop list missing | No farming content |
| GAP-12 | Animal list missing | No husbandry content |
| GAP-13 | Building types missing | No building content |
| GAP-14 | Building system not in roadmap | Implementation gap |
| GAP-15 | Trading system not in roadmap | Implementation gap |
| GAP-16 | Multiplayer+villagers undefined | MP broken |
| GAP-17 | Failure feedback undefined | Player confusion |

### Medium (Important Polish)
| ID | Gap | Impact |
|----|-----|--------|
| GAP-18 | Weather effects undefined | Weather decorative only |
| GAP-19 | Happiness calculation undefined | Villager mood random |
| GAP-20 | Skill training undefined | Villager growth blocked |
| GAP-21 | Quest types undefined | Recruitment repetitive |
| GAP-22 | Recipe discovery undefined | Crafting mysterious |
| GAP-23 | Bootstrap vs building constraint | Confusing rules |
| GAP-24 | Stars vs stats relationship | Villager skills confusing |
| GAP-25 | Random events undefined | World feels static |

### Edge Cases
| ID | Gap | Impact |
|----|-----|--------|
| GAP-33 | Inventory full on harvest | Yield fate unclear |
| GAP-34 | All villagers leave | Recovery path unclear |
| GAP-35 | Player offline (MP) | Villager fate unclear |
| GAP-36 | Season change mid-harvest | Timing unclear |
| GAP-37 | Multiple players same resource | Contention undefined |

### Content Tables Needed
- **GAP-11**: Crop definitions (10+ crops with growth/yield/nutrition)
- **GAP-12**: Animal definitions (8+ animals with taming/yields/capabilities)
- **GAP-13**: Building definitions (10+ buildings with materials/features/times)
- **GAP-21**: Quest templates (fetch/craft/build/timed)
- **GAP-25**: Random event definitions (10+ events with triggers/effects)
