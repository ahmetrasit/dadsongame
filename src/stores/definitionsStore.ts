// Re-export everything from the new modular store structure
// This file is kept for backward compatibility

export {
  useDefinitionsStore,
  // Types
  type Season,
  type AliveYield,
  type DeadYield,
  type GameDefinitions,
  // Plant types
  type PlantDefinition,
  type PlantStage,
  type SoilType,
  type PlantSubCategory,
  // Animal types
  type AnimalDefinition,
  type AnimalCapability,
  type AnimalSubCategory,
  // Resource types
  type ResourceDefinition,
} from './definitions';
