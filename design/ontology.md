# Crafting Ontology

Every product has 3 ontologies: Made Of, Can Do, Can Be Used For.

## Product Hierarchy
```
Raw Material → Component → Product
```

## 1. Made Of (Composition)

### Structure
```yaml
made_of:
  raw:
    - {material: string, amount: number, purity: low|med|high, state: raw|processed|refined}
  components:
    - {component: string, count: number}
```

### Raw Materials
| Material | Hardness | Strength | Weight/unit | State | Tier |
|----------|----------|----------|-------------|-------|------|
| stone | 50 | 40 | 5kg | raw | 1 |
| wood | 20 | 30 | 2kg | raw | 1 |
| bone | 35 | 25 | 1kg | raw | 1 |
| plant_fiber | 5 | 10 | 0.2kg | raw | 1 |
| clay | 15 | 20 | 3kg | raw→processed | 1 |
| hide | 10 | 30 | 1.5kg | raw | 1 |
| leather | 15 | 35 | 2kg | processed | 2 |
| copper | 30 | 40 | 4kg | refined | 2 |
| bronze | 45 | 55 | 5kg | refined | 3 |
| iron | 60 | 65 | 6kg | refined | 3 |
| steel | 80 | 85 | 7kg | refined | 4 |

### Purity Effects
```yaml
purity_multiplier:
  low: 0.7
  med: 1.0
  high: 1.3
output_quality = base_quality × purity_multiplier
```

## 2. Can Do (Enabled Verbs)

### Structure
```yaml
can_do:
  - verb: string
    capacity: number
    requires: [conditions]
```

### Verb-to-Category Mapping
| Verb | Category | Capacity Unit |
|------|----------|---------------|
| move | Mobility | speed (tiles/s) |
| pull | Mobility | force (kg) |
| carry | Hauling | weight (kg) |
| store | Hauling | volume (L) |
| cut | Crafting | power (hardness×length) |
| shape | Crafting | force (weight×length) |
| heat | Crafting | output (energy×efficiency) |
| cook | Nourishment | speed (heat/volume) |
| rest | Recovery | quality (comfort×stability) |
| heal | Recovery | effect (purity×precision) |
| signal | Signaling | range (size×clarity) |
| record | Signaling | permanence |

## 3. Can Be Used For (Functional Categories)

### Category Hierarchy
```
Functional Category
├── Nourishment (Need: Eat_and_Drink)
│   ├── cooking
│   └── preservation
├── Recovery (Need: Recover)
│   ├── resting
│   └── healing
├── Mobility (Need: Move)
│   ├── land
│   ├── water
│   └── sled
├── Hauling (Need: Carry)
│   ├── carried
│   └── stationary
├── Crafting (Need: Make)
│   ├── cutting
│   ├── shaping
│   ├── heating
│   └── joining
└── Signaling (Need: Talk)
    ├── audible
    ├── visual
    └── recorded
```

### Category Definitions

```yaml
Nourishment:
  cooking:
    requires: [heat_source, vessel]
    formula: speed = heat_output / food_volume
    verbs: [cook, boil, roast]
  preservation:
    requires: [container, seal]
    formula: duration = seal_quality × insulation / spoilage_rate
    verbs: [store, preserve]

Recovery:
  resting:
    requires: [support_surface, padding]
    formula: quality = padding_comfort × support_stability
    verbs: [rest, sleep]
  healing:
    requires: [medicine_container, applicator]
    formula: effect = medicine_purity × application_precision
    verbs: [heal, treat]

Mobility:
  land:
    requires: [wheels(2+), frame, axle]
    formula:
      max_load: frame_strength × min(wheel_strength) × wheel_count
      speed: pulling_power / (total_weight × 0.1)
    verbs: [move, pull]
  water:
    requires: [hull(waterproof), frame]
    formula:
      max_load: hull_volume × water_displacement
      speed: rowing_power / (total_weight × 0.3)
    verbs: [move, cross_water]
  sled:
    requires: [runners(2+), frame]
    formula:
      max_load: frame_strength × runner_count
      speed: pulling_power / (total_weight × 0.3)
    verbs: [move, pull]

Hauling:
  carried:
    requires: [container, handle OR strap]
    formula: capacity = min(container_strength, carrier_limit)
    verbs: [carry]
  stationary:
    requires: [container]
    formula: capacity = container_strength
    verbs: [store]

Crafting:
  cutting:
    requires: [edge, handle]
    formula: power = edge_hardness × handle_length
    verbs: [cut, carve, scrape]
    min_power: {soft: 10, medium: 30, hard: 50, metal: 70}
  shaping:
    requires: [head(weight>0.5kg), handle]
    formula: force = head_weight × handle_length
    verbs: [shape, flatten, break]
    min_force: {soft: 5, medium: 20, hard: 40, metal: 60}
  heating:
    requires: [fuel_source, containment]
    formula: output = fuel_energy × containment_efficiency
    verbs: [heat, melt, fire, smelt]
    min_heat: {cooking: 100, clay: 300, copper: 500, iron: 800, steel: 1000}
  joining:
    requires: [fastener OR adhesive, control]
    formula: strength = fastener_strength × control_precision
    verbs: [join, tie, bind, fasten]

Signaling:
  audible:
    requires: [resonator OR amplifier]
    formula: range = volume × frequency_clarity
    verbs: [signal, amplify]
  visual:
    requires: [reflective OR colored, mount]
    formula: range = size × contrast
    verbs: [signal, mark]
  recorded:
    requires: [surface, marker]
    formula: permanence = surface_durability × marker_adhesion
    verbs: [record, write]
```

## Components

### Component Definitions
```yaml
wheel:
  requires: [circular_form, axle_hole, rigid_material]
  properties: [weight, strength, diameter]

frame:
  requires: [connected_rods(3+), rigid_material]
  properties: [weight, strength, dimensions]

container:
  requires: [enclosed_space, opening]
  properties: [volume, strength, waterproof]

edge:
  requires: [thin_profile(<2mm), rigid_material]
  properties: [hardness, length, sharpness]

handle:
  requires: [grippable_diameter(2-5cm), rigid_material]
  properties: [length, grip_friction]

hull:
  requires: [curved_form, waterproof_material]
  properties: [volume, displacement, strength]

axle:
  requires: [rod_form, rigid_material]
  properties: [length, strength, diameter]

head:
  requires: [block_form, weight>0.5kg]
  properties: [weight, hardness]
```

### Component-to-Category Mapping
| Component | Enables Category |
|-----------|-----------------|
| wheel + frame + axle | Mobility.land |
| hull + frame | Mobility.water |
| runners + frame | Mobility.sled |
| container + handle | Hauling.carried |
| container | Hauling.stationary |
| edge + handle | Crafting.cutting |
| head + handle | Crafting.shaping |
| fuel + containment | Crafting.heating |

## Tool Dependencies

### Crafting Methods
```yaml
by_hand:
  actions: [gather, break, tie, weave, mold, stack]
  materials: [clay, fiber, leaves, stone(breaking only)]
  output: [crude_components, unfired_clay, cordage]

with_cutting:
  requires: Crafting.cutting tool
  unlocks: [shaped_wood, leather, precise_stone]

with_shaping:
  requires: Crafting.shaping tool
  unlocks: [formed_metal, shaped_stone, flattened_material]

with_heating:
  requires: Crafting.heating setup
  unlocks: [fired_clay, molten_metal, cooked_food, charcoal]

with_joining:
  requires: Crafting.joining tool
  unlocks: [assembled_products, reinforced_structures]
```

### Bootstrap Chain (Tier 1)
```yaml
# Hand-craftable (no tools)
stone_edge:
  action: break stone
  result: sharp_fragment
  satisfies: Crafting.cutting (crude, power: 15)

cordage:
  action: twist plant_fiber
  result: rope/string
  satisfies: binding

clay_form:
  action: mold wet_clay
  result: unfired_vessel
  satisfies: container (fragile)

fire_pit:
  action: stack stones + wood
  result: heating_setup
  satisfies: Crafting.heating (output: 150)

# First composite tools
stone_knife:
  requires: [stone_edge, shaped_wood(by stone_edge), cordage]
  satisfies: Crafting.cutting (power: 25)

stone_hammer:
  requires: [stone_head, handle, cordage]
  satisfies: Crafting.shaping (force: 20)
```

## Example Products

### Cart
```yaml
cart:
  made_of:
    components:
      - {component: wheel, count: 4}
      - {component: wooden_frame, count: 1}
      - {component: axle, count: 2}
      - {component: wooden_box, count: 1}
    raw:
      - {material: leather, amount: 2, state: processed}

  can_be_used_for:
    - Mobility.land
    - Hauling.stationary

  can_do:
    - {verb: move, max_load: 320kg, speed: "power/(weight×0.1)"}
    - {verb: carry, capacity_kg: 200}
    - {verb: store, capacity_L: 150}
```

### Stone Knife
```yaml
stone_knife:
  made_of:
    raw:
      - {material: stone, amount: 1, purity: med, state: raw}
      - {material: wood, amount: 1, purity: low, state: processed}
      - {material: plant_fiber, amount: 0.5, state: processed}

  can_be_used_for:
    - Crafting.cutting

  can_do:
    - {verb: cut, power: 25}
    - {verb: scrape, power: 20}
    - {verb: carve, power: 15}
```

### Iron Hammer
```yaml
iron_hammer:
  made_of:
    components:
      - {component: iron_head, count: 1}
      - {component: wooden_handle, count: 1}
    raw:
      - {material: leather, amount: 0.5, state: processed}  # grip wrap

  can_be_used_for:
    - Crafting.shaping

  can_do:
    - {verb: shape, force: 65}
    - {verb: break, force: 70}
    - {verb: flatten, force: 60}
```

## Upgrade Mechanics

Products can be upgraded by adding components:
```yaml
upgrade:
  target: wheeled_frame
  add: wooden_box
  result: cart

  before:
    satisfies: [Mobility.land]
    can_do: [move]
  after:
    satisfies: [Mobility.land, Hauling.stationary]
    can_do: [move, carry, store]
```

## Pulling Power

```yaml
pullers:
  human: {power: 50, carry: 25}
  child: {power: 5, carry: 3}
  donkey: {power: 100, carry: 50}
  horse: {power: 300, carry: 100}
  ox: {power: 500, carry: 0}

friction:
  wheels: 0.1
  sled: 0.3
  drag: 1.0

# Speed calculation
speed = pulling_power / (total_weight × friction)
max_speed = 1.0  # capped
```
