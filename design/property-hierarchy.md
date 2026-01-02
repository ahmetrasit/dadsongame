# Property Hierarchy

## 5-Level Detection Pipeline
```
L1: Material Properties (physics) → L2: Form Properties (geometry) → L3: Capabilities (form+material) → L4: Functional (capabilities+assembly) → L5: Need Requirements (storyline.md)
```

## L1: Material Properties
Physical: strength, hardness, weight, density, flexibility
Thermal: heat_resistance, insulation, melting_point
Electrical: conductivity, resistance
Chemical: reactivity, corrosion_resistance
Biological: nutrition, spoilage_rate

## L2: Forms (30 total)

### Base Forms (20)
| Form | Detection | Enables |
|------|-----------|---------|
| spike | length>5x width, tip<30° | piercing, puncturing, pinning |
| blade | edge<2mm, length>10x edge | cutting, slicing, scraping |
| wedge | tapers thick→thin, triangular | splitting, prying, lifting |
| rod | length>5x diameter, solid | reaching, pushing, rotating, leverage |
| tube | hollow cylinder, wall<1/4 diameter | channeling liquid/air, rolling |
| sheet | thickness<1/10 of width/length | covering, wrapping, blocking |
| bowl | concave, depth>1/4 width, watertight | holding liquids/items, scooping |
| box | 5+ surfaces, 1-2 openings, rigid | storing, protecting, trapping |
| wheel | circular, center hole for axle | rolling, reducing friction, grinding |
| ball | equal w/h/d, curved all around | rolling all directions, even pressure |
| ring | circular, hole>40% diameter | encircling, connecting, sealing |
| hook | curve>90°, open gap, rigid | catching, hanging, pulling |
| frame | rods at joints, encloses space | supporting weight, spanning gaps |
| mesh | many holes, connected material | filtering, catching, airflow |
| block | solid, no dim>3x another | stacking, anchoring, counterweight |
| cord | length>20x diameter, flexible | tying, binding, pulling, weaving |
| hinge | 2 parts, single pivot, allows rotation | opening/closing, folding |
| handle | 2-5cm grip, 8-40cm, attached | gripping, controlling, applying force |
| platform | flat top, supported below | supporting objects, working surface |
| enclosure | 3+ walls, interior>walls | containing creatures, shelter |

### Advanced Forms (10, Tier 2-5)
| Form | Detection | Tier |
|------|-----------|------|
| cone | circular tapers to point | 2 |
| trough | elongated channel, open top | 2 |
| saddle | curved to body contour | 2 |
| bellows | expandable chamber, valves | 3 |
| helix | coiled around axis | 3 |
| valve | movable obstruction in channel | 3 |
| gear | circular, teeth around perimeter | 4 |
| cam | irregular wheel profile | 4 |
| piston | rod in sealed cylinder | 4 |
| lens | transparent, curved surface | 5 |

## L3: Capabilities (35 total)

### Base Capabilities (23)
| Capability | Requires Form | Requires Material |
|------------|---------------|-------------------|
| can_cut | blade | hardness≥med, strength≥low |
| can_pierce | spike | hardness≥med, strength≥med |
| can_scrape | blade | hardness≥low, rigidity≥med |
| can_contain_liquid | bowl | waterproof, rigidity≥low |
| can_contain_solid | bowl/box | strength≥low |
| can_roll | wheel/ball | hardness≥low, rigidity≥med |
| can_spin | wheel/rod | rigidity≥med, balanced |
| can_support_weight | rod/sheet/frame | strength≥med, rigidity≥med |
| can_float | bowl/sheet | density≤low, waterproof |
| can_grip | handle | friction≥med |
| can_bind | cord | flexibility≥high, strength≥low |
| can_wrap | sheet | flexibility≥high |
| can_seal | sheet | waterproof, flexibility≥med |
| can_strike | block | weight≥med, hardness≥med |
| can_lever | rod | strength≥med, rigidity≥high |
| can_hook | hook | strength≥med, rigidity≥med |
| can_wedge | wedge | strength≥high, hardness≥med |
| can_spring | rod | elasticity≥high, strength≥med |
| can_conduct_heat | rod/sheet | heat_conductivity≥high |
| can_insulate | sheet/mesh | heat_conductivity≤low |
| can_absorb | mesh | porosity≥high |
| can_reflect | sheet | smoothness≥high, hardness≥med |
| can_grind | wheel/block | hardness≥high, weight≥med |

### Additional Capabilities (12, Tier 1-5)
| Capability | Requires Form | Tier |
|------------|---------------|------|
| can_dig | wedge/blade | 1 |
| can_scoop | bowl | 1 |
| can_reach | rod | 1 |
| can_channel | tube/trough | 2 |
| can_pump | bellows | 3 |
| can_control_flow | valve | 3 |
| can_amplify_sound | cone | 3 |
| can_thread | helix | 3 |
| can_store_mechanical_energy | helix | 3 |
| can_mesh | gear | 4 |
| can_convert_motion | cam/piston | 4 |
| can_focus | lens | 5 |

## L4: Functional Properties (18 total)

### Base Functional (12)
| Property | Requires | Satisfies Need |
|----------|----------|----------------|
| mobile | can_roll + can_support_weight | Move, Carry |
| floating | can_float + can_contain_solid | Move, Carry |
| stable | can_support_weight + can_bind | Make |
| contained | can_contain_solid + can_seal | Carry, Eat_and_Drink |
| controlled | can_grip + can_lever | Move, Make |
| cutting | can_cut + can_grip | Make, Eat_and_Drink |
| heated | can_conduct_heat + can_contain_solid | Eat_and_Drink, Make |
| powered | can_lever + can_spin | Make, Move |
| flowing | can_channel + can_control_flow | Eat_and_Drink, Make |
| amplified | can_lever + can_spring | Make, Move |
| preserved | can_seal + can_insulate | Eat_and_Drink |
| geared | can_mesh + can_spin | Make, Move |

### Talk Need Coverage (3)
| Property | Requires | Tier |
|----------|----------|------|
| communicating_near | can_amplify_sound | 3 |
| signaling_visual | can_reflect + can_grip | 3 |
| recorded | can_cut + can_grip | 2 |

### Recover Need Coverage (3)
| Property | Requires | Tier |
|----------|----------|------|
| resting | can_support_weight + can_insulate | 1 |
| healing | can_contain_liquid + can_seal | 2 |
| sheltering | can_wrap + can_support_weight | 1 |

## Assembly Detection (17 patterns)

### Tier 1 (5)
```yaml
handle_assembly: handle attached to heavier object → can_grip, user_control
lever_system: rod on fulcrum + load → mechanical_advantage, can_lift
fastener_assembly: cord through aligned holes → joins_parts, removable
inclined_plane: sheet at angle → reduces_lifting_force
cutting_tool: blade + handle → can_cut, cutting_power = hardness × sharpness
```

### Tier 2 (6)
```yaml
axle_assembly: rod through 2+ wheels → synchronized_rotation, can_roll
hinge_assembly: rod through aligned holes in 2 parts → can_pivot, 0-180°
wheel_and_axle: wheel fixed to rod → torque_transfer, mechanical_advantage
frame_assembly: 3+ rods at 3+ joints → structural_integrity
seal_assembly: flexible in gap → waterproof, airtight
container_assembly: bowl/box + walls → capacity = volume × material_mod
```

### Tier 3 (3)
```yaml
pulley_assembly: grooved wheel + cord + anchor → force_redirection, mech_advantage = pulley_count
bellows_assembly: 2 flexible sheets + 2 rigid frames + valve → can_pump_air, pressure
valve_assembly: obstruction in channel + control → flow_control, directional
```

### Tier 4 (3)
```yaml
gear_train: 2+ meshing gears on rods → torque_transfer, speed_conversion = gear_ratio
screw_assembly: helical rod in threaded hole → linear_from_rotation, mech_advantage = circumference/pitch
piston_assembly: rod in sealed tube → converts_linear_motion, pressure_transfer
```

## Weight & Capacity System

### Core Formula
```
object_weight = material_count × weight_per_unit
can_move = pull_capacity >= object_weight × friction_factor
```

### Material Weights (kg/unit)
wood:2, stone:5, bone:1, plant_fiber:0.2, clay:3, hide:1.5, leather:2, copper:4, bronze:5, iron:6, steel:7

### Size Tiers
```yaml
wheel: {small: 2u=4kg/20kg_limit, medium: 5u=10kg/80kg_limit, large: 10u=20kg/200kg_limit}
rod: {thin: 1u=2kg/10kg_limit, medium: 3u=6kg/50kg_limit, thick: 8u=16kg/200kg_limit}
bowl: {small: 1u=0.5L, medium: 3u=5L, large: 8u=50L}
cord: {thread: 0.1u/2kg_break, string: 0.5u/20kg_break, rope: 2u/100kg_break, cable: 5u/500kg_break}
```

### Entity Capacities (kg)
```yaml
pull: {child:5, human:50, strong_human:80, donkey:100, horse:300, ox:500}
carry: {child:3, human:25, strong_human:40, donkey:50, horse:100}
friction: {wheels:0.1, sled:0.3, drag:1.0}
```

### Consequence Checks
```yaml
can_move: pull_capacity >= object_weight × friction_factor
speed_factor: min(1.0, pull_capacity / (object_weight × friction × 0.8))
axle_breaks: load > axle_limit
wheel_cracks: load_per_wheel > wheel_limit
rope_snaps: tension > break_limit
size_mismatch: component_weight / frame_weight > 10
```

## Tier Gating Summary

### Materials by Tier
T1: stone, wood, bone, plant_fiber, clay(unfired), hide, leaves
T2: leather, copper, fired_clay, woven_fiber
T3: bronze, iron, charcoal
T4: steel, rubber, glass
T5: aluminum, refined_steel, electrical_wire
T6-7: silicon, semiconductors, fiber_optics (DLC)

### Forms by Tier
T1: spike, blade, wedge, rod, sheet, bowl, cord, block, handle
T2: +wheel, ring, tube, platform, enclosure, mesh, box
T3: +ball, hinge, hook, frame
T4: +precision versions
T5: +standardized versions

### Capabilities by Tier
T1: cut, pierce, scrape, contain_solid, strike, grip, bind, wrap, lever, wedge, insulate
T2: +contain_liquid, roll, absorb, seal, grind
T3: +spin, hook, spring, conduct_heat, float
T4: +reflect
T5: +conduct_electricity, resist_current

### Functional by Tier
T1: cutting, stable, resting, sheltering
T2: +contained, flowing, recorded
T3: +mobile, floating, heated, powered, communicating_near, signaling_visual
T4: +controlled, amplified
T5: +electrified, automated

## Status
All complete: 30 forms, 35 capabilities, 18 functional (6 needs), 17 assemblies, 5 tiers + DLC, weight system
