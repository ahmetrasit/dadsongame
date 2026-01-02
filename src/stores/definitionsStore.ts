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
  type PlantYieldInteraction,
  type PlantNeedInteraction,
  // Animal types
  type AnimalDefinition,
  type AnimalCapability,
  type AnimalSubCategory,
  type AnimalYieldInteraction,
  type AnimalNeedInteraction,
  // Resource types
  type ResourceDefinition,
  type ResourceInteractionType,
  type MaterialTransformation,
  type TransformationAction,
  type TransformationProperty,
  type TransformationRequirement,
  // Water types
  type WaterDefinition,
  type WaterType,
  type WaterInteractionType,
  type FishType,
} from './definitions';
