# Storyline & Vision

## Core
Civ-building game: ~1500 years human tech/society progression. Property-based crafting (no predefined products). Solo-viable, team-accelerated. 6 needs drive all products.

## Seven Pillars
1. **Historical Tech** - progression follows real-world logic, no arbitrary tree
2. **Property-Based Crafting** - products defined by characteristics, not names
3. **Point-Based Buildings** - purpose via points + humans + objects
4. **Citizen Evolution** - Villager → Skilled → Citizen (random skills, trainable)
5. **Knowledge Economy** - auto-discovered recipes, shareable as books
6. **Multi-Island** - limited citizens/island forces specialization
7. **Nested Teams** - Teams → Coalitions → Federations (voting, contracts, reputation)

## Tier System
```yaml
T1_PRIMITIVE:   points 1-10,   verbs: gather/process/craft
T2_AGRICULTURAL: points 1-20,  verbs: +farm/preserve/build/ferment
T3_METALLURGICAL: points 1-30, verbs: +smelt/forge/shape/alloy
T4_MECHANICAL:  points 1-50,   verbs: +machine/assemble/engineer/temper
T5_INDUSTRIAL:  points 1-100,  verbs: +manufacture/design/automate
T6_ELECTRONIC:  DLC,           verbs: +circuit/program/compute
T7_INFORMATION: DLC,           verbs: +network/encrypt
```

## Domains
Launch: Metallurgy, Chemistry, Agriculture, Construction, Knowledge
DLC: Electronics, Programming, Networking, Robotics, Data Science

## 6 Human Needs
| Need | Description |
|------|-------------|
| Eat_and_Drink | food, water, preservation |
| Recover | rest, sleep, heal, energy |
| Move | speed, distance, water crossing |
| Carry | capacity, storage, heavy loads |
| Make | cut, shape, join, heat |
| Talk | near/far communication, recording |

## Need Levels (1-5 each)
```yaml
Eat_and_Drink:
  get_food: [hands, stone_tool, metal_tool, machine, factory]
  get_water: [find, carry, store, pipe, pump]
  keep_fresh: [eat_fast, salt/dry, smoke/pickle, can/ice, refrigerate]

Recover:
  rest: [sit, sleep, comfortable_bed, quality_sleep, spa]
  heal: [time, bandage, medicine, surgery, hospital]
  energy: [food, rest, stimulant, efficiency, automation]

Move:
  go_faster: [walk, shoes, ride, vehicle, fast_vehicle]
  go_farther: [walk, pack_animal, cart, motor, train]
  cross_water: [wade, raft, boat, ship, powered_ship]

Carry:
  hold_more: [hands, bag, chest, cart, truck]
  store: [ground, container, shed, warehouse, automated]
  move_heavy: [drag, roll, pulley, crane, power_crane]

Make:
  cut: [hands, stone, iron, steel, power]
  shape: [hands, tool, forge, machine, automated]
  join: [tie, glue/nail, weld, precision, automated]
  heat: [sun, fire, furnace, kiln, industrial]

Talk:
  talk_near: [voice, horn, written, printed, DLC]
  talk_far: [messenger, signals, telegraph, phone, radio]
  remember: [memory, writing, books, library, DLC]
```

## Property Inheritance
```
output_property = input_property × preservation_rate
preservation_rate = base_rate + (skill_points × skill_factor)
# Skill 3: 76%, Skill 10: 90%, Skill 20: 98%
```

## Requirements (Derived)
```
REQUIREMENT = BEST_MATERIAL_OF_ERA × 0.7
# 0.6=easier, 0.7=standard, 0.8=harder, 0.9=challenge
```

## Core Verbs (53)
```yaml
gathering: [pick, dig, chop, collect, catch, pull, break, hunt, mine]
processing: [heat, cool, mix, shape, cut, grind, press, dry, soak, cook, clean, join, melt, pour]
textile: [spin, weave, sew, stuff, tie]
building: [build, place, stack, fix, remove, assemble]
social: [teach, learn, trade, give, ask, lead]
transport: [carry, load, send, pull, store]
farming: [plant, harvest, grow, breed]
care: [feed, water, rest, heal]
```

## Crafting Ontology (3 hierarchies per product)

### 1. Made Of (Composition)
```yaml
structure:
  - material: string      # wood, iron, leather
  - amount: number        # units consumed
  - purity: low|med|high  # affects quality output
  - state: raw|processed|refined
```

### 2. Can Do (Enabled Verbs)
```yaml
structure:
  - verb: string          # from 53 core verbs
  - capacity: number      # how much/well
  - requires: [conditions]
```

### 3. Can Be Used For (Functional Categories)
```yaml
Nourishment:
  cooking: {requires: [heat_source, vessel], formula: speed=heat/volume}
  preservation: {requires: [container, seal], formula: duration=seal×insulation}

Recovery:
  resting: {requires: [support, padding], formula: quality=comfort×stability}
  healing: {requires: [container, applicator], formula: effect=purity×precision}

Mobility:
  land: {requires: [wheels(2+), frame, axle], formula: speed=power/(weight×0.1)}
  water: {requires: [hull, frame], formula: speed=power/(weight×0.3)}
  sled: {requires: [runners(2+), frame], formula: speed=power/(weight×0.3)}

Hauling:
  carried: {requires: [container, handle/strap], formula: capacity=min(strength,carrier)}
  stationary: {requires: [container], formula: capacity=container_strength}

Crafting:
  cutting: {requires: [edge, handle], formula: power=hardness×length}
  shaping: {requires: [head(>0.5kg), handle], formula: force=weight×length}
  heating: {requires: [fuel, containment], formula: output=energy×efficiency}
  joining: {requires: [fastener, control], formula: strength=fastener×precision}

Signaling:
  audible: {requires: [resonator], formula: range=volume×clarity}
  visual: {requires: [reflective/colored], formula: range=size×contrast}
  recorded: {requires: [surface, marker], formula: permanence=durability×adhesion}
```

### Tool Dependencies
```yaml
by_hand:
  actions: [gather, break, tie, weave, mold, stack]
  materials: [soft: clay/fiber/leaves | brittle: stone(breaking)]

with_cutting:
  requires_tool: Crafting.cutting
  min_power: {soft:10, medium:30, hard:50, metal:70}

with_shaping:
  requires_tool: Crafting.shaping
  min_force: {soft:5, medium:20, hard:40, metal:60}

with_heating:
  requires_setup: Crafting.heating
  min_heat: {cooking:100, clay_firing:300, copper:500, iron:800, steel:1000}
```

### Bootstrap Chain (T1)
```yaml
hand_craftable:
  - stone_edge: break stone → sharp fragment (crude cutting)
  - cordage: twist plant_fiber → rope
  - clay_form: mold wet_clay → unfired vessel
  - fire_pit: stack stones + wood → heating setup

first_tools:
  - stone_edge + shaped_wood + cordage → stone_knife (Crafting.cutting)
  - stone_head + handle + cordage → stone_hammer (Crafting.shaping)
```

## Base Materials
| Material | Hardness | Strength | Conductivity | Era |
|----------|----------|----------|--------------|-----|
| wood | 20 | 30 | 5 | 1+ |
| stone | 50 | 40 | 5 | 1+ |
| bone | 35 | 25 | 5 | 1+ |
| leather | 15 | 35 | 5 | 2+ |
| copper | 30 | 40 | 80 | 2+ |
| bronze | 45 | 55 | 60 | 3+ |
| iron | 60 | 65 | 50 | 3+ |
| steel | 80 | 85 | 45 | 4+ |
| aluminum | 40 | 50 | 70 | 5+ |

## Power Sources
| Source | Force | Era |
|--------|-------|-----|
| human | 20 | 1+ |
| small_animal | 40 | 2+ |
| large_animal | 80 | 3+ |
| water_wheel | 60 | 3+ |
| wind | 50 | 3+ |
| steam | 150 | 4+ |
| combustion | 250 | 5+ |
| electric | 200 | 5+ |

## Team Structure
```
Player → Team (2-50) → Coalition (2-20 teams) → Federation (2-10 coalitions)
Min commitment: 50 game-years
Inactive 10+ years: villagers contribute to team food
```

## Voting Thresholds
- Routine: >50%
- Major: >66%
- Critical: >80%
- Dissolution: unanimous

## Contracts
Types: Supply, Purchase, Service, Knowledge, Alliance
Team members: 20% discount
Long-term contracts: 10-15% discount

## Reputation
Range 0-100 (start 50), transferable, recovers over time
Higher combined reputation = larger contracts allowed

## Learning Curve
```
Phase 1 (0-2h):  survive - health, hunger, basic actions
Phase 2 (2-10h): grow - 5 properties, marketplace browse
Phase 3 (10-50h): specialize - 10+ properties, contracts, teams
Phase 4 (50h+): organize - everything visible
```

## Recipe System
- Auto-saved on every craft
- Actions: rename, favorite, share (free), sell, bundle into books
- Books: recipes + guides + tips, sold in marketplace

## Gaps (TBD)
- Building points source
- Citizen limits per island
- Time compression (1500 years = ? play hours)
- Animal slaughter rules
- Citizen aging/death
- Island acquisition cost
