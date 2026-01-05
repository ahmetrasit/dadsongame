import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Vector2 } from '@/types/core';
import type {
  BuildingMaterialRequirements,
  ConstructionPhase,
  BuildingStarAllocation,
  BuildingType,
  RoofTier,
} from '@/types/buildings';

// ==========================================
// Building Instance (runtime state)
// ==========================================

export interface PlacedBuilding {
  id: string;
  blueprintId: string;
  name: string;
  type: BuildingType;
  position: Vector2;
  rotation: number; // 0, 90, 180, 270 degrees
  constructionPhase: ConstructionPhase;
  constructionProgress: number; // 0-1 for building phase
  assignedMaterials: BuildingMaterialRequirements;
  requiredMaterials: BuildingMaterialRequirements;
  assignedWorkers: string[]; // Villager IDs
  stars?: BuildingStarAllocation;
  roofTier?: RoofTier;
  placedAtDay: number;
  completedAtDay?: number;
}

// ==========================================
// Ghost Preview (placement preview)
// ==========================================

export interface GhostPreview {
  blueprintId: string;
  position: Vector2;
  rotation: number;
  isValid: boolean;
  invalidReason?: string;
}

// ==========================================
// Building Store State
// ==========================================

interface BuildingState {
  // State
  placedBuildings: Record<string, PlacedBuilding>;
  ghostPreview: GhostPreview | null;
  selectedBlueprintId: string | null;
  isPlacementMode: boolean;
  isMenuOpen: boolean;

  // Actions - Menu
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;

  // Actions - Placement
  startPlacement: (blueprintId: string) => void;
  updateGhostPosition: (x: number, y: number) => void;
  rotateGhost: () => void;
  confirmPlacement: () => string | null; // Returns building ID or null if failed
  cancelPlacement: () => void;

  // Actions - Construction
  addMaterial: (buildingId: string, materialId: keyof BuildingMaterialRequirements, quantity: number) => boolean;
  assignWorker: (buildingId: string, villagerId: string) => void;
  unassignWorker: (buildingId: string, villagerId: string) => void;
  updateConstructionProgress: (buildingId: string, progress: number) => void;
  completeConstruction: (buildingId: string) => void;

  // Actions - Management
  removeBuilding: (buildingId: string) => void;
  updateBuildingName: (buildingId: string, name: string) => void;
  updateStarAllocation: (buildingId: string, stars: BuildingStarAllocation) => void;

  // Queries
  getBuilding: (buildingId: string) => PlacedBuilding | undefined;
  getBuildingsAtPosition: (x: number, y: number, radius: number) => PlacedBuilding[];
  getBuildingsByPhase: (phase: ConstructionPhase) => PlacedBuilding[];
  canPlaceAt: (x: number, y: number, blueprintId: string, excludeBuildingId?: string) => { valid: boolean; reason?: string };
}

// ==========================================
// Blueprint Registry (temporary - should be moved to definitions)
// ==========================================

const DEFAULT_MATERIAL_REQUIREMENTS: BuildingMaterialRequirements = {
  wood: 10,
  rock: 5,
  metal: 2,
};

// ==========================================
// Helpers
// ==========================================

let buildingIdCounter = 0;

const generateBuildingId = (): string => {
  buildingIdCounter++;
  return `building-${Date.now()}-${buildingIdCounter}`;
};

const createEmptyMaterials = (): BuildingMaterialRequirements => ({
  wood: 0,
  rock: 0,
  metal: 0,
});

const createDefaultStars = (): BuildingStarAllocation => ({
  resting_speed: 0,
  weather_protection: 0,
  storage_general: 0,
  storage_cold: 0,
  crafting_speed: 0,
  kitchen: 0,
  stables: 0,
  happiness: 0,
  taming: 0,
  farming: 0,
  healing: 0,
  training: 0,
  repair: 0,
  dock: 0,
  water_collection: 0,
});

// ==========================================
// Store Implementation
// ==========================================

export const useBuildingStore = create<BuildingState>()(
  persist(
    (set, get) => ({
      // Initial State
      placedBuildings: {},
      ghostPreview: null,
      selectedBlueprintId: null,
      isPlacementMode: false,
      isMenuOpen: false,

      // ==========================================
      // Menu Actions
      // ==========================================

      openMenu: () => {
        console.log('[Building] Opening building menu');
        set({ isMenuOpen: true });
      },

      closeMenu: () => {
        console.log('[Building] Closing building menu');
        set({ isMenuOpen: false });
      },

      toggleMenu: () => {
        const state = get();
        console.log(`[Building] Toggling building menu: ${!state.isMenuOpen}`);
        set({ isMenuOpen: !state.isMenuOpen });
      },

      // ==========================================
      // Placement Actions
      // ==========================================

      startPlacement: (blueprintId) => {
        console.log(`[Building] Starting placement mode for blueprint: ${blueprintId}`);
        set({
          isPlacementMode: true,
          selectedBlueprintId: blueprintId,
          isMenuOpen: false, // Close menu when entering placement mode
          ghostPreview: {
            blueprintId,
            position: { x: 0, y: 0 },
            rotation: 0,
            isValid: false,
            invalidReason: 'Move to a valid position',
          },
        });
      },

      updateGhostPosition: (x, y) => {
        const state = get();
        if (!state.isPlacementMode || !state.ghostPreview) return;

        const validation = state.canPlaceAt(x, y, state.ghostPreview.blueprintId);

        set({
          ghostPreview: {
            ...state.ghostPreview,
            position: { x, y },
            isValid: validation.valid,
            invalidReason: validation.reason,
          },
        });
      },

      rotateGhost: () => {
        const state = get();
        if (!state.ghostPreview) return;

        const newRotation = (state.ghostPreview.rotation + 90) % 360;
        set({
          ghostPreview: {
            ...state.ghostPreview,
            rotation: newRotation,
          },
        });
      },

      confirmPlacement: () => {
        const state = get();
        if (!state.isPlacementMode || !state.ghostPreview || !state.ghostPreview.isValid) {
          console.warn('[Building] Cannot confirm placement - invalid state');
          return null;
        }

        const buildingId = generateBuildingId();
        const { useWorldStore } = require('./worldStore');
        const currentDay = useWorldStore.getState().day ?? 1;

        const newBuilding: PlacedBuilding = {
          id: buildingId,
          blueprintId: state.ghostPreview.blueprintId,
          name: `Building ${buildingId.slice(-4)}`,
          type: 'roofed', // Default, should be determined by blueprint
          position: { ...state.ghostPreview.position },
          rotation: state.ghostPreview.rotation,
          constructionPhase: 'blueprint',
          constructionProgress: 0,
          assignedMaterials: createEmptyMaterials(),
          requiredMaterials: { ...DEFAULT_MATERIAL_REQUIREMENTS },
          assignedWorkers: [],
          stars: createDefaultStars(),
          placedAtDay: currentDay,
        };

        console.log(`[Building] Placed building ${buildingId} at (${newBuilding.position.x}, ${newBuilding.position.y})`);

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: newBuilding,
          },
          isPlacementMode: false,
          selectedBlueprintId: null,
          ghostPreview: null,
        }));

        return buildingId;
      },

      cancelPlacement: () => {
        console.log('[Building] Cancelled placement mode');
        set({
          isPlacementMode: false,
          selectedBlueprintId: null,
          ghostPreview: null,
        });
      },

      // ==========================================
      // Construction Actions
      // ==========================================

      addMaterial: (buildingId, materialId, quantity) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building) {
          console.warn(`[Building] Building ${buildingId} not found`);
          return false;
        }

        if (building.constructionPhase === 'complete') {
          console.warn(`[Building] Building ${buildingId} is already complete`);
          return false;
        }

        const currentAmount = building.assignedMaterials[materialId] ?? 0;
        const requiredAmount = building.requiredMaterials[materialId] ?? 0;
        const canAdd = Math.min(quantity, requiredAmount - currentAmount);

        if (canAdd <= 0) {
          console.warn(`[Building] No more ${materialId} needed for building ${buildingId}`);
          return false;
        }

        const newAssigned = {
          ...building.assignedMaterials,
          [materialId]: currentAmount + canAdd,
        };

        // Check if all materials gathered - transition to building phase
        const allMaterialsGathered = (Object.keys(building.requiredMaterials) as (keyof BuildingMaterialRequirements)[])
          .every((key) => (newAssigned[key] ?? 0) >= (building.requiredMaterials[key] ?? 0));

        const newPhase: ConstructionPhase = allMaterialsGathered ? 'building' : 'gathering';

        console.log(`[Building] Added ${canAdd}x ${materialId} to building ${buildingId}`);

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              assignedMaterials: newAssigned,
              constructionPhase: building.constructionPhase === 'blueprint' ? 'gathering' : newPhase,
            },
          },
        }));

        return true;
      },

      assignWorker: (buildingId, villagerId) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building) return;
        if (building.assignedWorkers.includes(villagerId)) return;

        console.log(`[Building] Assigned worker ${villagerId} to building ${buildingId}`);

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              assignedWorkers: [...building.assignedWorkers, villagerId],
            },
          },
        }));
      },

      unassignWorker: (buildingId, villagerId) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building) return;

        console.log(`[Building] Unassigned worker ${villagerId} from building ${buildingId}`);

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              assignedWorkers: building.assignedWorkers.filter((id) => id !== villagerId),
            },
          },
        }));
      },

      updateConstructionProgress: (buildingId, progress) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building || building.constructionPhase !== 'building') return;

        const clampedProgress = Math.max(0, Math.min(1, progress));

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              constructionProgress: clampedProgress,
            },
          },
        }));
      },

      completeConstruction: (buildingId) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building) {
          console.warn(`[Building] Building ${buildingId} not found`);
          return;
        }

        const { useWorldStore } = require('./worldStore');
        const currentDay = useWorldStore.getState().day ?? 1;

        console.log(`[Building] Completed construction of building ${buildingId}`);

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              constructionPhase: 'complete',
              constructionProgress: 1,
              completedAtDay: currentDay,
              assignedWorkers: [], // Clear workers on completion
            },
          },
        }));
      },

      // ==========================================
      // Management Actions
      // ==========================================

      removeBuilding: (buildingId) => {
        const state = get();
        if (!state.placedBuildings[buildingId]) return;

        console.log(`[Building] Removed building ${buildingId}`);

        const { [buildingId]: removed, ...remaining } = state.placedBuildings;
        set({ placedBuildings: remaining });
      },

      updateBuildingName: (buildingId, name) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building) return;

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              name,
            },
          },
        }));
      },

      updateStarAllocation: (buildingId, stars) => {
        const state = get();
        const building = state.placedBuildings[buildingId];

        if (!building || building.constructionPhase !== 'complete') return;

        set((s) => ({
          placedBuildings: {
            ...s.placedBuildings,
            [buildingId]: {
              ...building,
              stars,
            },
          },
        }));
      },

      // ==========================================
      // Queries
      // ==========================================

      getBuilding: (buildingId) => {
        return get().placedBuildings[buildingId];
      },

      getBuildingsAtPosition: (x, y, radius) => {
        const state = get();
        return Object.values(state.placedBuildings).filter((building) => {
          const dx = building.position.x - x;
          const dy = building.position.y - y;
          return Math.sqrt(dx * dx + dy * dy) <= radius;
        });
      },

      getBuildingsByPhase: (phase) => {
        const state = get();
        return Object.values(state.placedBuildings).filter(
          (building) => building.constructionPhase === phase
        );
      },

      canPlaceAt: (x, y, _blueprintId, excludeBuildingId) => {
        const state = get();

        // Check collision with existing buildings
        const BUILDING_RADIUS = 48; // Default building collision radius
        const MIN_DISTANCE = BUILDING_RADIUS * 2;

        for (const building of Object.values(state.placedBuildings)) {
          if (excludeBuildingId && building.id === excludeBuildingId) continue;

          const dx = building.position.x - x;
          const dy = building.position.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < MIN_DISTANCE) {
            return {
              valid: false,
              reason: 'Too close to another building',
            };
          }
        }

        // Check collision with structures (fire pits, etc)
        try {
          const { useDefinitionsStore } = require('./definitionsStore');
          const defStore = useDefinitionsStore.getState();
          const STRUCTURE_RADIUS = 24;

          for (const structure of defStore.structurePlacements ?? []) {
            const dx = structure.x - x;
            const dy = structure.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BUILDING_RADIUS + STRUCTURE_RADIUS) {
              return {
                valid: false,
                reason: 'Too close to a structure',
              };
            }
          }
        } catch {
          // Definitions store not available
        }

        // Check collision with resources on ground
        try {
          const { useRuntimeMapStore } = require('./runtimeMapStore');
          const runtimeMap = useRuntimeMapStore.getState();
          const RESOURCE_RADIUS = 16; // Collision radius for resources

          for (const resource of runtimeMap.mapData.resources ?? []) {
            const dx = resource.x - x;
            const dy = resource.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BUILDING_RADIUS + RESOURCE_RADIUS) {
              return {
                valid: false,
                reason: 'Too close to a resource',
              };
            }
          }
        } catch {
          // Runtime map store not available
        }

        // Check collision with plants
        try {
          const { useRuntimeMapStore } = require('./runtimeMapStore');
          const runtimeMap = useRuntimeMapStore.getState();
          const PLANT_RADIUS = 24; // Collision radius for plants

          for (const plant of runtimeMap.mapData.plants ?? []) {
            const dx = plant.x - x;
            const dy = plant.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BUILDING_RADIUS + PLANT_RADIUS) {
              return {
                valid: false,
                reason: 'Too close to a plant',
              };
            }
          }
        } catch {
          // Runtime map store not available
        }

        // Check collision with animals
        try {
          const { useRuntimeMapStore } = require('./runtimeMapStore');
          const runtimeMap = useRuntimeMapStore.getState();
          const ANIMAL_RADIUS = 20; // Collision radius for animals

          for (const animal of runtimeMap.mapData.animals ?? []) {
            const dx = animal.x - x;
            const dy = animal.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BUILDING_RADIUS + ANIMAL_RADIUS) {
              return {
                valid: false,
                reason: 'Too close to an animal',
              };
            }
          }
        } catch {
          // Runtime map store not available
        }

        // Check terrain walkability (avoid water and impassable terrain)
        try {
          const { useWorldStore } = require('./worldStore');
          const { TILE_SIZE } = require('./worldStore');
          const worldStore = useWorldStore.getState();

          // Check multiple points around the building footprint
          // This ensures the entire building area is on walkable terrain
          const checkPoints = [
            { x, y }, // center
            { x: x - BUILDING_RADIUS * 0.7, y: y - BUILDING_RADIUS * 0.7 }, // top-left
            { x: x + BUILDING_RADIUS * 0.7, y: y - BUILDING_RADIUS * 0.7 }, // top-right
            { x: x - BUILDING_RADIUS * 0.7, y: y + BUILDING_RADIUS * 0.7 }, // bottom-left
            { x: x + BUILDING_RADIUS * 0.7, y: y + BUILDING_RADIUS * 0.7 }, // bottom-right
          ];

          for (const point of checkPoints) {
            const tileX = Math.floor(point.x / (TILE_SIZE || 32));
            const tileY = Math.floor(point.y / (TILE_SIZE || 32));

            if (!worldStore.isWalkable(tileX, tileY)) {
              return {
                valid: false,
                reason: 'Cannot build on impassable terrain',
              };
            }
          }
        } catch {
          // World store not available or terrain check failed
        }

        // Check world bounds (if world store available)
        try {
          const { useWorldStore } = require('./worldStore');
          const world = useWorldStore.getState();
          const mapWidth = world.mapWidth ?? 2000;
          const mapHeight = world.mapHeight ?? 2000;

          if (x < BUILDING_RADIUS || x > mapWidth - BUILDING_RADIUS ||
              y < BUILDING_RADIUS || y > mapHeight - BUILDING_RADIUS) {
            return {
              valid: false,
              reason: 'Outside map bounds',
            };
          }
        } catch {
          // World store not available
        }

        return { valid: true };
      },
    }),
    {
      name: 'building-storage',
      partialize: (state) => ({
        placedBuildings: state.placedBuildings,
        // Don't persist placement mode state or menu state
      }),
    }
  )
);

// ==========================================
// Selector Hooks
// ==========================================

export const usePlacedBuildings = () => useBuildingStore((state) => Object.values(state.placedBuildings));
export const useIsPlacementMode = () => useBuildingStore((state) => state.isPlacementMode);
export const useGhostPreview = () => useBuildingStore((state) => state.ghostPreview);
export const useIsMenuOpen = () => useBuildingStore((state) => state.isMenuOpen);
export const useBuildingsUnderConstruction = () =>
  useBuildingStore((state) =>
    Object.values(state.placedBuildings).filter(
      (b) => b.constructionPhase !== 'complete'
    )
  );
export const useCompletedBuildings = () =>
  useBuildingStore((state) =>
    Object.values(state.placedBuildings).filter(
      (b) => b.constructionPhase === 'complete'
    )
  );
