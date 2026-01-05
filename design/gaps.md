# Gap Analysis Report (v0.097)

## Critical (Must Fix Before Playable)

### 1. Real-Time Day Length
- **Gap**: Base duration undefined
- **Impact**: Core gameplay timing
- **Resolution**: Define base cycle (suggested: 15-20 min = 100%), seasonal multiplier applies to daylight portion

### 2. Seed Acquisition
- **Gap**: T2 requires planting but no seed source defined
- **Impact**: Blocks T1→T2 progression
- **Resolution**: Define: (1) Harvest mature plants → seeds, (2) Wild plants chance drop, (3) Trading

### 3. Fire Pit → Kiln Bootstrap
- **Gap**: Fire pit=150 heat, clay firing=300. No bridge.
- **Impact**: Blocks pottery/T2 crafting
- **Resolution**: Either: (1) Improved fire pit structure, (2) Clay fires at 150 with 3x time, (3) Natural fired clay deposits

### 4. No Tutorial/Onboarding
- **Gap**: Complex systems, no introduction
- **Impact**: Player confusion, abandonment
- **Resolution**: Design Day 1 guided sequence: look→gather→break→craft→fire→survive

### 5. Balance Values Undefined
- **Gap**: Core numerical constants missing
- **Impact**: Cannot implement gameplay
- **Values needed**:

| Value | Suggested | Unit |
|-------|-----------|------|
| Base day length | 15-20 | minutes |
| Hunger decay | -2 | per game hour |
| Thirst decay | -3 | per game hour |
| Energy cost (light work) | 1 | per action |
| Energy cost (heavy work) | 5 | per action |
| Energy recovery (sleep) | +10 | per minute |
| Tool durability (stone) | 100 | uses |
| Tool durability (metal) | 500 | uses |
| Walk speed | 3 | m/sec |
| Run speed | 5 | m/sec |
| Inventory slots | 20 | slots |
| Stack size (resources) | 99 | items |
| Villager daily food | 50 | nutrition |
| Citizen cap per island | 20 | citizens |

---

## High Priority

### 6. Trust/Taming Mechanics
- **Gap**: Values mentioned (first:+10, subsequent:+5, threshold:100) but incomplete
- **Undefined**:
  - Trust decay rate (suggested: -1/day without interaction)
  - Per-species modifiers
  - Intermediate trust benefits (25=tolerates, 50=follows, 75=rideable, 100=tamed)
  - Failure conditions (spook threshold: approach speed > 2m/s)
  - Can taming fail permanently? (suggested: no, just resets to 0)

### 7. Energy/Stamina System
- **Gap**: Mentioned but mechanics undefined
- **Define**:
  - Actions consuming energy: walk(0), run(1/sec), harvest(2), chop(5), mine(8), build(3)
  - Recovery: rest(+2/min), sleep(+10/min), eat(+energy from food)
  - At 0 energy: cannot run, actions 50% slower, no heavy work

### 8. Hunger/Thirst Decay
- **Gap**: Daily decay mentioned, actual rates undefined
- **Define**:
  - Base decay: hunger -2/hr, thirst -3/hr
  - Activity multiplier: heavy work = 1.5x decay
  - Season: summer thirst +50%, winter hunger +25%
  - Food satisfaction: nutrition value / 10 = hunger restored

### 9. Tool Durability
- **Gap**: "Reduce durability" mentioned, no values
- **Define**:
  - Base durability by material: stone=100, bone=150, copper=300, iron=500, steel=800
  - Wear per use: light=1, medium=2, heavy=5
  - Repair: workbench + 50% original materials = restore 50% durability

### 10. Planting Mechanics
- **Gap**: Farming mentioned but process undefined
- **Define**:
  - Tilling: optional, +20% growth speed (requires digging tool)
  - Valid soil: per-crop (see crop table)
  - Spacing: 1 tile minimum between plants
  - Tool: none for small seeds, digging tool for large (potatoes, trees)

### 11. Crop Content List
- **Gap**: No enumeration of crops
- **Required fields**: name, tier, seasons, growth_days, water_need, yield_amount, nutrition, seeds_per_harvest

| Crop | Tier | Seasons | Days | Yield | Nutrition | Seeds |
|------|------|---------|------|-------|-----------|-------|
| Wild berries | T1 | Sp,Su | - | 3 | 10 | 0 |
| Wheat | T2 | Sp,Fa | 7 | 5 | 15 | 2 |
| Corn | T2 | Su | 10 | 4 | 20 | 1 |
| Carrots | T2 | Sp,Fa | 5 | 6 | 12 | 2 |
| Potatoes | T2 | Sp,Su,Fa | 8 | 8 | 25 | 3 |
| Cabbage | T2 | Sp,Fa | 6 | 4 | 18 | 1 |
| Tomatoes | T2 | Su | 9 | 6 | 14 | 2 |
| Pumpkin | T2 | Fa | 12 | 2 | 35 | 4 |
| Rice | T3 | Su | 14 | 10 | 20 | 3 |
| Grapes | T3 | Su,Fa | 20 | 8 | 12 | 0 |

### 12. Animal Content List
- **Gap**: Animals referenced but not enumerated
- **Required fields**: name, tier, taming_threshold, yields, capabilities, feed_type, feed_rate

| Animal | Tier | Taming | Yields | Interval | Capabilities | Feed |
|--------|------|--------|--------|----------|--------------|------|
| Chicken | T2 | 30 | eggs(2) | 1 day | produce | grain, 1/day |
| Goat | T2 | 60 | milk(1) | 1 day | produce | grass, 2/day |
| Sheep | T2 | 80 | wool(3) | 7 days | produce | grass, 2/day |
| Cow | T2 | 100 | milk(2) | 1 day | produce,carry(50kg) | grass, 4/day |
| Pig | T2 | 70 | none | - | - | scraps, 3/day |
| Donkey | T3 | 120 | none | - | carry(100kg),transport(2x) | grass, 3/day |
| Horse | T3 | 150 | none | - | transport(3x) | grass, 4/day |
| Ox | T3 | 200 | none | - | carry(500kg),pull | grass, 6/day |

### 13. Building Types
- **Gap**: 15 features listed but buildings not enumerated
- **Required fields**: name, size, materials, features, stars, construction_time

| Building | Size | Materials | Features | Stars | Time |
|----------|------|-----------|----------|-------|------|
| Lean-to | 2x1 | 10 wood | weather(0.3) | 0 | 1min |
| Shelter | 2x2 | 20 wood | weather(0.5),rest(0.5) | 4 | 5min |
| Hut | 3x3 | 40 wood,10 thatch | weather(0.8),rest(1.0),happiness(0.5) | 9 | 15min |
| House | 4x4 | 60 wood,30 stone | weather(1.0),rest(1.5),happiness(1.0) | 16 | 30min |
| Barn | 4x4 | 80 wood | stables(4),storage(100) | 16 | 30min |
| Workshop | 3x3 | 40 wood,10 stone | crafting(1.5) | 9 | 20min |
| Storehouse | 3x4 | 50 wood | storage(200) | 12 | 20min |
| Kitchen | 3x3 | 30 wood,20 stone | kitchen(1.0),crafting(0.5) | 9 | 25min |
| Well | 1x1 | 30 stone | water_collection | 0 | 15min |
| Dock | 2x4 | 40 wood | dock | 0 | 20min |

### 14. Building System Missing from Roadmap
- **Gap**: Detailed design exists, not in implementation order
- **Resolution**: Insert at position 6 (after Processing, before Storage Crafting)

### 15. Trading System Missing from Roadmap
- **Gap**: Marketplace detailed but not in implementation order
- **Resolution**: Add to roadmap (suggested: position 8, after Station Crafting)

### 16. Multiplayer + Villagers
- **Gap**: Ownership and offline behavior undefined
- **Define**:
  - Ownership: Villagers bound to recruiting player
  - Team access: Can assign tasks to teammate's villagers (with permission toggle)
  - Offline behavior: Villager needs suspended, no work, buildings usable by team
  - Transfer: Villagers can be traded/gifted (requires villager consent mechanic?)

### 17. Failure Feedback
- **Gap**: Actions fail silently or with unclear messages
- **Define feedback for**:
  - Tool missing: "Requires [tool] with [X] [function] power"
  - Heat too low: "Needs [X] heat (current: [Y])"
  - Inventory full: "Inventory full - [item] remains"
  - Crop died: "Crop died from [lack of water/wrong season/frost]"
  - Villager left: "[Name] left due to [hunger/unhappiness/neglect]"

---

## Medium Priority

### 18. Weather System
- **Gap**: Weather in worldStore but effects undefined
- **Types**: clear, rain, storm, drought, snow, fog
- **Effects**:
  - Rain: auto-waters crops, -20% work speed outdoors
  - Storm: crop damage chance (10%), building damage chance (5%)
  - Drought: 2x water need, -50% yield
  - Snow: no outdoor farming, +25% hunger
  - Fog: reduced visibility (future: affects animals)

### 19. Happiness Calculation
- **Gap**: Mentioned but formula undefined
- **Formula**: happiness = base(50) + shelter_bonus + food_variety + social + task_satisfaction
  - shelter_bonus: building happiness feature × 10
  - food_variety: unique foods eaten in 7 days × 2
  - social: interactions with player/others × 1
  - task_satisfaction: preferred_task × 5, disliked_task × -3

### 20. Skill Training
- **Gap**: "Trainable" mentioned but no mechanics
- **Define**:
  - Requires: training building feature
  - Trainer: player or higher-skilled villager
  - Time: (10 - trainee_intelligence) × skill_level hours
  - Result: +1 to specific skill, max = trainer's skill

### 21. Villager Quest Types
- **Gap**: Examples given but no system
- **Templates**:
```
FETCH: "Bring me {item} x{quantity}"
  difficulty = item_tier × quantity / 5

CRAFT: "Make me a {tool/item}"
  difficulty = item_tier × 2

BUILD: "I need a {building} to live in"
  difficulty = building_size

TIMED: "Gather {resource} x{quantity} within {days} days"
  difficulty = base + (quantity / days)
```

### 22. Recipe Discovery
- **Gap**: "Auto-generated" but process unclear
- **Define**:
  - T1 recipes: All visible from start
  - T2+ recipes: Unlocked when player crafts prerequisite OR has required tool
  - Hidden recipes: Discovered by experimentation (combine unlikely materials)
  - Notification: "New recipe discovered: [item]!" with fanfare

### 23. Building + Crafting Constraint Clarity
- **Gap**: "All crafting in buildings" conflicts with bootstrap
- **Clarification**:
  - Bootstrap actions (gather, break, twist, mold, stack) = NOT crafting, allowed anywhere
  - Tool crafting = requires workstation (crafting feature)
  - Processing = requires appropriate station (fire pit exempt from building requirement)
  - Advanced processing = requires roofed building

### 24. Stars vs Stats Relationship
- **Gap**: Both exist, relationship unclear
- **Define**:
  - Stars = derived value for task eligibility
  - Formula by task type:
    - Crafting stars = (craftingSkill + intelligence) / 20
    - Farming stars = (strength + speed) / 20
    - Combat stars = (strength + speed) / 20 (future)
  - Max stars = 10

### 25. Random Events
- **Gap**: Mentioned in Critical Gaps but undefined
- **Define**:

| Event | Trigger | Effect | Frequency |
|-------|---------|--------|-----------|
| Traveler | Random | Trade opportunity, rare items | 1/week |
| Festival | Season end | +20 happiness all, no work day | Seasonal |
| Storm | Weather | Building/crop damage | Rare |
| Lost animal | Random | Free tame (trust starts at 50) | 1/month |
| Wanderer | Random | Potential villager appears | 1/2 weeks |
| Bountiful harvest | Random | 2x yield this harvest | Rare |
| Blight | Random | Crop disease spreads | Rare |

---

## Low Priority

### 26. Version Sync
- **Gap**: DESIGN.md shows v0.053, should be v0.097
- **Resolution**: Update version in DESIGN.md header

### 27. Branch Acquisition
- **Gap**: "Natural only" but source unclear
- **Define**: Branches found as deadfall (random ground spawn) or from chopping trees (guaranteed drop)

### 28. Bone Suitability Values
- **Gap**: DESIGN.md=0.8, understanding.md=0.7 for piercing
- **Resolution**: Standardize to 0.7 (bone is less hard than stone)

### 29. Citizen Cap Definition
- **Gap**: "Max N citizens" stated, N undefined
- **Define**: Island cap = 20 citizens. Team cap = 50 total. Forces multi-island expansion.

### 30. Multi-Island Travel
- **Gap**: Mechanics undefined
- **Define**:
  - Boat crafting: T3 (frame + planks + sail)
  - Journey: Select destination, travel time = distance / boat_speed
  - Supplies: Food/water consumed during travel
  - Discovery: Random chance to discover new island while exploring ocean

### 31. Fire Fuel Mechanics
- **Gap**: Fire pit exists but fuel undefined
- **Define**:
  - Fuel types: wood(10min), charcoal(30min), coal(60min)
  - States: burning(full heat) → smoldering(50% heat) → out(0 heat)
  - Reignition: add fuel + fire_starter OR blow on smoldering

### 32. Death While Riding
- **Gap**: Mount death/damage scenarios undefined
- **Define**:
  - Animal dies: player auto-dismounts, no damage
  - Player damaged while mounted: dismount at <25% health
  - Logout while mounted: mount stays at location

---

## Edge Cases

### 33. Inventory Full When Harvesting
- **Define**: Yield remains on plant, subject to shedding. Show persistent "Inventory full" warning.

### 34. All Villagers Leave
- **Define**: Player can survive solo. New villager spawns within 3 days. Reputation penalty.

### 35. Player Offline in Multiplayer
- **Define**: Villagers suspended (no needs, no work). Buildings usable by team. Auto-kick after 30 days.

### 36. Season Change Mid-Harvest
- **Define**: 3-day warning. In-progress actions complete. Then shedding rules apply.

### 37. Multiple Players Same Resource
- **Define**: First interaction locks for 30 seconds. Show "in use" indicator to others.

---

## Implementation Priority

### Phase 1: Core Gameplay (Critical)
1. Define balance values (create constants file)
2. Implement seed acquisition from harvesting
3. Add improved fire pit OR adjust clay firing heat requirement
4. Create tutorial sequence

### Phase 2: Content (High)
5. Define crop table (10 crops minimum)
6. Define animal table (8 animals minimum)
7. Define building table (10 buildings minimum)
8. Add building system to roadmap

### Phase 3: Systems (High)
9. Implement energy/stamina system
10. Implement tool durability
11. Add failure feedback messages
12. Add trading system to roadmap

### Phase 4: Polish (Medium)
13. Weather effects
14. Happiness calculation
15. Random events
16. Recipe discovery notifications

### Phase 5: Multiplayer (High for MP)
17. Villager ownership rules
18. Offline behavior
19. Resource contention
