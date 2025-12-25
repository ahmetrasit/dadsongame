# Dad & Son Game - Design Document

## Overview

A 2D open-world peaceful survival/management game. Player wakes up on an island, explores, gathers resources, recruits villagers, and builds a thriving clan. No combat - purely cooperative survival.

**Inspirations:** Terraria, Sneaky Sasquatch, Red Dead Redemption (open-world feel)

---

## Core Gameplay Loop

1. Wake up on island → explore open-world 2D
2. Gather resources (catch animals, pick plants, mine)
3. Craft tools and structures
4. Find villagers → complete quests → recruit → keep fed
5. Specialize (farming, building, trading, etc.)
6. Trade at marketplace
7. Expand to other islands (future)

---

## Time System

| Unit | Duration |
|------|----------|
| Day | In-game day/night cycle |
| Season | 30 in-game days |
| Year | 120 in-game days (4 seasons) |

- Season configuration set during map creation
- Different islands can have offset seasons (future)
- Sun exposure varies by time of day and season

---

## Creature System

### Hierarchy

```
Creature (base)
├── age, health, growth rate, hunger, needs, resource yield
│
├── Plant
│   └── needs: water, sun, soil type
│
├── Animal
│   └── + interaction, speed, intelligence, energy
│
└── Human (Player/Villager)
    └── + crafting, trading, human interactions
    └── no resource yield
    └── villagers follow player orders
```

### Resource Yield (Animals)

```
aliveYield: { resource, rate, requiresFed }  // milk, eggs, wool
deadYield: { resources[] }                    // meat, leather, bones
```

---

## Plants

### Growth Stages

```
seed → sprout → mature (harvestable) → withered (gone)
```

| Property | Crops | Trees |
|----------|-------|-------|
| Stages | All 4 | seed → sprout → mature |
| Permanent | No (withers) | Yes (once mature) |
| Harvest window | Limited time | Always harvestable |
| Regrow | Yes, cycles back | Yes, continuous |
| Season-dependent | Yes | TBD |

### Soil Types (5)

- Grass
- Sand
- Rock
- Fertile
- Swamp

Plants require suitable soil type to grow.

---

## Animals

### Properties

- All base creature properties
- **Interaction**: capabilities (eat, carry, transport)
- **Speed**: movement rate
- **Intelligence**: affects taming, task efficiency
- **Energy**: depletes when working, regenerates with rest

### Capabilities (per species)

| Capability | Examples |
|------------|----------|
| Eat | Rabbit eats carrots |
| Carry | Donkey pulls cart |
| Transport | Horse carries humans |
| Produce | Cow gives milk |

### Behavior

- **Taming**: Required for wild animals. Villager performs taming. Villager stats affect duration + success rate. Failure = just try again.
- **Breeding**: Automatic. Happiness affects breeding rate.
- **Feeding**: Increases yield. Not feeding = stops working/producing (no death, no leaving). Resumes when fed.
- **Baby animals**: No yield, cannot be killed. Wait until mature.
- **Death**: Natural (old age) or player-killed. No sickness mechanic.

---

## Villagers

### Needs

| Need | Effect if unmet |
|------|-----------------|
| Food | Warning → leave |
| Water | Warning → leave |
| Shelter | Reduced happiness |
| Happiness | Determines loyalty |

**Flow:** Needs drop → Warning state → Leave (if not addressed)

No death from neglect - villagers just leave the clan.

### Stats

- Intelligence
- Strength
- Speed
- (Others TBD based on gameplay needs)

### Recruitment

1. Find villager at spawn location
2. Complete their request/quest
3. Villager joins clan
4. Keep fed to retain

### Abilities

Villagers can do everything the player can:
- Gather resources
- Craft
- Tame animals
- Carry/transport
- Trade

---

## Tool System

### Tool Properties (10)

| Property | Use Cases |
|----------|-----------|
| Cutting | Food, plants, trees, rope, fabric |
| Digging | Soil, sand, roots, burying |
| Smashing | Rocks, shells, bones, ore |
| Hammering | Building, shaping metal, nailing |
| Reaching | High fruits, fishing from shore |
| Damaging | One-way hunting (animals don't fight back) |
| Piercing | Fishing spear, sewing, small animal hunting |
| Grinding | Flour, herbs, pigments, crushing ore |
| Scooping | Water, grain, sand, liquids |
| Precision | Fine crafting, medicine, jewelry, traps |

### Star-Based Crafting (Unique Mechanic)

**No predefined tools.** Player allocates "crafting stars" to properties.

**Example:**
- Total stars available: 5
- Allocation: 2 cutting + 3 digging
- Result: Hybrid tool usable for both

**Requirements:**
- Each task has min/max requirements per property
- Example: `food cutting: min 1, max 3` (4+ cutting ruins food)
- Example: `tree chopping: min 3 cutting`

**Star Source:**
- Total crafting capacity = sum of helping villagers' skills
- More/better villagers = more stars available

### Tool Physical Properties

- **Length**: Affects storage, reach
- **Weight**: Affects carrying capacity

### Carrying System

| Container | Holds | Capacity |
|-----------|-------|----------|
| Pouch | Tools | Basic (starting) |
| Satchel | Tools | Crafted upgrade |
| Basket | Materials | Weight limit |

---

## Materials

### Categories (6)

| Category | Examples | Perishable |
|----------|----------|------------|
| Food | Meat, milk, vegetables, fruits, juice | Yes |
| Water | Water | Yes |
| Metal | Iron, copper, brass, gold | No |
| Rock | Stone, granite, brick (crafted) | No |
| Wood | Logs, planks, sticks, branches (natural only) | No |
| Organics | Wool, cotton, leather, bone, rope, fabric | No |

**Special materials:**
- **Branches**: Wood subtype, natural only (from trees/bushes), cannot craft from wood
- **Brick**: Rock subtype, crafted from Rock + Water + Fire

### Processing Chain

```
Raw Materials → Crafted Materials → Complex Materials
    ↓                 ↓                   ↓
  (ore)            (ingot)            (gear)
```

Processed materials stay in same category, just different item.

### Spoilage System

**What spoils:** Food, juice, water

**Spoilage speed categories:**
| Category | Examples |
|----------|----------|
| Fast | Fresh milk, raw meat, juice |
| Medium | Vegetables, cooked food |
| Slow | Dried/salted/preserved items |
| Never | Rock, metal, gold, wood, organics |

**Preservation:** Crafting can extend shelf life (salting, drying, jarring)

**Spoiled:** Gone completely (no secondary use)

---

## Economy & Trading

### Specialization

Emergent from player choice - not locked classes:
- Farming
- Building
- Trading
- Traveling
- Animal husbandry
- Crafting

### Marketplace

| Property | Value |
|----------|-------|
| Location | Physical location on map |
| Scope | Global (one market, access points per island) |
| Trading | Async (post offer, check later) |
| Prices | Player-set (materials for materials) |
| Operator | NPC-facilitated initially |
| Trades | Partial quantities allowed |
| Notifications | In-game message on new listings |

**Gold:** Just another metal material (no special currency status)

**Services:** Can purchase services (boat to another island, etc.)

### Listing Behavior

- Perishable listings spoil over time
- Non-perishable listings stay until accepted/cancelled
- Partial purchases allowed

---

## Multiplayer (Future)

### Teams

- Multiple players form a team
- No team size limit
- Shared resources/base
- Division of labor

### Co-op

- Work on different aspects together
- Contribute to shared buildings
- Coordinate via in-game communication

### Inter-team Trading

- Marketplace enables trade between teams
- No direct interaction required (async)

---

## World Structure

### Current Phase

- Single island
- Open-world 2D exploration
- Tile-based terrain

### Future Phase

- Multiple islands
- Connected via bridges/boats
- Each island can have different:
  - Biomes
  - Resources
  - Season offset
  - Marketplace access point

---

## Buildings & Structures

### Building Types

| Type | Roof | Stars | Function |
|------|------|-------|----------|
| Roofed | Yes | Yes (1 per interior tile) | Full features via star allocation |
| Roofless | No | None | Movement blocking only (walls/compounds) |

**Roofless buildings:**
- Can contain roofed buildings inside (walled towns)
- Can be nested (outer wall → inner wall → buildings)
- Can have gaps (open entrances) or doors
- No weather protection

### Building Stars (15 Features)

Allocate stars to features based on interior size (1 star per tile).

| # | Feature | Description |
|---|---------|-------------|
| 1 | Resting speed | Faster stamina/energy recovery |
| 2 | Weather protection | Shield from rain, snow, sun exposure |
| 3 | Storage (general) | Non-perishable material storage |
| 4 | Cold storage | Perishable storage, slows spoilage |
| 5 | Crafting speed | Tool crafting bonus |
| 6 | Kitchen | Food processing, cooking, preservation |
| 7 | Stables | Animal shelter + breeding bonus |
| 8 | Happiness | Spa, temple, recreation |
| 9 | Taming | Taming pen, boosts success rate |
| 10 | Farming/Greenhouse | Indoor crops, growth speed, season extension |
| 11 | Healing | Health recovery speed |
| 12 | Training | Villager stat improvement |
| 13 | Repair | Tool durability restoration |
| 14 | Dock | Boat access (future) |
| 15 | Water collection | Wells, rain barrels |

### Construction Flow

```
Draw Blueprint → Material List Shown → Gather Materials → Construction (progress bar) → Complete
```

### Construction Materials

**Walls:**
- Wood OR Rock (can mix in same building)
- Based on perimeter length
- Inner walls optional (dividers)

**Doors:**
- Metal (hinges) + Wood (panel)
- Always required, regardless of wall material
- Minimum 1 door per building

**Roof (roofed buildings only):**

| Tier | Materials Required | Weather Protection |
|------|-------------------|-------------------|
| Basic | Wood base + Branches | 1x |
| Standard | Wood base + Wood | 2x |
| Reinforced | Wood base + Branches + Rock | 4x |
| Premium | Wood base + Brick | 8x |

- Wood always required as base
- Only Basic (branches) can be upgraded to Reinforced (+rock)
- Brick is crafted: Rock + Water + Fire

**Branches:**
- Wood subtype (cannot craft from wood)
- Collected from live or dead trees/bushes

### Blueprint Validation

- Must be enclosed
- Minimum 2x1 interior space
- Minimum 1 door (each door uses 1x1 space)
- Shape does not matter

### Demolition

- Whole building only (no partial)
- Requires time + effort (progress bar)
- 100% material reclaim

### Animal Control Pattern

Build roofed building with 2 doors as "airlock":
- One door faces outside
- One door faces walled (roofless) area
- Controls animal movement into enclosed space

---

## Future Scope (Not Current Phase)

- Heating system
- Coal/oil fuel
- Different food effects (meat = longer hunger satisfaction)
- Multiple islands
- Boats/bridges
- Advanced multiplayer features

---

## Technical Notes

### Architecture (from scaffold)

- **Slow state** (Firebase): Inventory, world saves, profiles
- **Fast state** (in-memory): Positions, actions (synced loosely)
- **MultiplayerService**: Abstraction layer for backend swapping

### Stack

- Vite + React + TypeScript
- Phaser 3 (rendering)
- Zustand (state)
- Firebase (persistence, initial multiplayer)
- PWA-ready
