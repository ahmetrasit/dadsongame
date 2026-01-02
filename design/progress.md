# Progress (v0.092)

## Latest Session (2026-01-01) - Ontology Implementation Complete
- Created src/types/ontology.ts (full type system):
  - ProductDefinition, MadeOf, CanDo, CanBeUsedFor interfaces
  - 30 Forms, 35 Capabilities, 18 FunctionalProperties as union types
  - 54 Verbs, 6 FunctionalCategories, constants (PURITY_MULTIPLIER, FRICTION, PULLING_POWER)
- Created src/stores/definitions/productsStore.ts:
  - ProductSlice with CRUD operations (add/save/update/delete)
  - Initial T1 products: stone_edge, cordage, stone_knife, stone_hammer
- Created src/data/ontologyRegistries.ts:
  - FORMS_REGISTRY: 30 forms with tier, capabilities, descriptions
  - CAPABILITIES_REGISTRY: 35 capabilities with tier, required forms
  - FUNCTIONAL_PROPERTIES_REGISTRY: 18 properties with category, requirements
  - Helper functions: getFormsByTier, getCapabilitiesByTier, etc.
- Created src/components/DefinitionEditor/ProductForm.tsx:
  - Full editor UI for raw materials, components, verbs, categories
  - Follows existing form patterns (PlantForm, AnimalForm, ResourceForm)
- Updated DefinitionEditor/index.tsx: products tab with TreeSidebar
- Updated stores/definitions/index.ts: integrated ProductSlice
- Updated DefinitionsService.ts: Firebase sync with products
- Branch: crafting-ontology (committed)

## Previous Session (Design)
- Created ontology.md - 3-hierarchy crafting system
- Reduced to 6 needs (removed Stay_Safe, Live_Together)
- Defined functional categories: Nourishment, Recovery, Mobility, Hauling, Crafting, Signaling

## Previous Session (Optimization)
- Optimized design docs for AI context (81% reduction)
- Added Recover need, 9 verbs (53 total), farming category

## Status

### Complete (100%)
Map Editor, Definition Editor, Firebase Integration, Interaction System, Yield System, Spoilage System

### Partial (40-70%)
| System | Done | Missing |
|--------|------|---------|
| Player Movement | WASD, collision, camera | actions, animations, needs |
| Inventory | slots, items, stacking | gathering from yields |
| HUD | time, weather, connection | quest log, needs bars |
| Time | day/season/year | speed controls, pause |

### Scaffolded
| System | Priority |
|--------|----------|
| Resource Gathering | P0 |
| Crafting | P1 |
| Villagers | P1 |
| Buildings | P2 |
| Marketplace | P2 |

## Next Steps
P0: E key → inventory, inventory HUD, harvestYield()
P1: goal system, villager personalities, discovery hints
P2: marketplace expansion, random events, multiple islands

## Unique Strengths
- Variable day length by season (75/50/40/30%)
- Async marketplace with player-set prices
- Emergent tool crafting (no predefined tools)
- Unified yield system (aliveYield/deadYield)
- Player chooses season order during map design
- Peaceful survival niche

## Critical Gaps
| Gap | Solution |
|-----|----------|
| No end goal | daily/seasonal/long-term milestones |
| No hook | marketplace as core loop (price fluctuations, reputation) |
| Shallow NPCs | personalities, preferences, quests |
| No discovery rewards | hidden recipes, rare resources |
| No random events | visitors, festivals, travelers |
| No failure state | economic failure, villager departure |

## Key Files
```
design/ontology.md                             # 3-hierarchy crafting system
design/property-hierarchy.md                   # forms, capabilities, functional
design/storyline.md                            # needs, verbs, tiers
src/types/ontology.ts                          # ProductDefinition, MadeOf, CanDo types
src/data/ontologyRegistries.ts                 # FORMS/CAPABILITIES/FUNCTIONAL registries
src/stores/definitions/productsStore.ts        # ProductSlice, T1 bootstrap products
src/stores/definitions/index.ts                # combined store with all slices
src/components/DefinitionEditor/ProductForm.tsx # Product editor UI
src/services/DefinitionsService.ts             # Firebase sync
```
