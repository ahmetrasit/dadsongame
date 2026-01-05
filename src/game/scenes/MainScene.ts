import Phaser from 'phaser';
import { TILE_SIZE, MAP_SIZE } from '@/game/config';
import { useMapEditorStore, PlantPlacement, AnimalPlacement, WaterPlacement, ResourcePlacement, VillagerPlacement, MapData } from '@/stores/mapEditorStore';
import { useRuntimeMapStore } from '@/stores/runtimeMapStore';
import { useVillagerStore } from '@/stores/villagerStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { smoothPolygon } from '@/game/utils/splineUtils';
import { checkCollision } from '@/game/utils/collisionDetection';
import { findNearestInteractable } from '@/game/utils/interactionDetection';
import { generatePlantPreview, generateAnimalPreview } from '@/utils/generatePreviewImage';
import { initYieldSystem } from '@/services/YieldService';
import { initSpoilageSystem } from '@/services/SpoilageService';
import { initVillagerSystem } from '@/services/VillagerService';
import { useYieldStateStore } from '@/stores/yieldStateStore';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { usePlacementStore } from '@/stores/placementStore';

/**
 * Helper to get the appropriate map data based on mode.
 * In editor mode: use mapEditorStore (blueprint)
 * In game mode: use runtimeMapStore (working copy)
 */
function getActiveMapData(isEditing: boolean): MapData {
  if (isEditing) {
    return useMapEditorStore.getState().mapData;
  }
  return useRuntimeMapStore.getState().mapData;
}

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // Graphics for rendering
  private riverGraphics!: Phaser.GameObjects.Graphics;
  private activeRiverGraphics!: Phaser.GameObjects.Graphics;
  private plantSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private animalSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private waterSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private resourceSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private structureSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private villagerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private spawnMarker!: Phaser.GameObjects.Graphics;

  // State tracking for diff-based rendering
  private lastRiversHash = '';
  private lastActiveRiverHash = '';
  private lastPlantsHash = '';
  private lastAnimalsHash = '';
  private lastWatersHash = '';
  private lastResourcesHash = '';
  private lastStructuresHash = '';
  private lastVillagersHash = '';
  private lastSpawnHash = '';
  private lastYieldStateHash = '';
  private lastIsEditing = false;

  // Movement
  private readonly MOVE_SPEED = 160;
  private readonly CAMERA_PAN_SPEED = 300;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 3;

  // Editor
  private editorKeys!: {
    E: Phaser.Input.Keyboard.Key;
    D_KEY: Phaser.Input.Keyboard.Key;
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
    FIVE: Phaser.Input.Keyboard.Key;
    SIX: Phaser.Input.Keyboard.Key;
    SEVEN: Phaser.Input.Keyboard.Key;
    EIGHT: Phaser.Input.Keyboard.Key;
    NINE: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
  };

  // System cleanup handlers
  private unsubscribeYieldSystem: (() => void) | null = null;
  private unsubscribeSpoilageSystem: (() => void) | null = null;
  private unsubscribeVillagerSystem: (() => void) | null = null;

  // Event handler references for cleanup
  private wheelHandler: ((pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private focusInHandler: ((e: FocusEvent) => void) | null = null;
  private focusOutHandler: ((e: FocusEvent) => void) | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    // Create grass background
    this.createGrassBackground();

    // Create graphics layers
    this.riverGraphics = this.add.graphics();
    this.riverGraphics.setDepth(1);

    this.activeRiverGraphics = this.add.graphics();
    this.activeRiverGraphics.setDepth(2);

    this.spawnMarker = this.add.graphics();
    this.spawnMarker.setDepth(3);

    // Get spawn point from appropriate store based on mode
    const editorStore = useMapEditorStore.getState();
    const isEditing = editorStore.isEditing;
    const spawn = getActiveMapData(isEditing).spawn;

    // Create player
    this.player = this.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(10);

    // Camera setup
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(spawn.x, spawn.y);

    // Input setup - use enableCapture=false to allow typing in HTML inputs
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false)
    };

    this.editorKeys = {
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
      D_KEY: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
      ONE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE, false),
      TWO: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO, false),
      THREE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE, false),
      FOUR: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR, false),
      FIVE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE, false),
      SIX: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SIX, false),
      SEVEN: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN, false),
      EIGHT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT, false),
      NINE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.NINE, false),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER, false),
      ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false),
    };

    // Mouse wheel zoom
    this.wheelHandler = (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const zoomChange = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(
        this.cameras.main.zoom + zoomChange,
        this.MIN_ZOOM,
        this.MAX_ZOOM
      );
      this.cameras.main.setZoom(newZoom);
    };
    this.input.on('wheel', this.wheelHandler);

    // Mouse click for editor
    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      this.handleEditorClick(pointer);
    };
    this.input.on('pointerdown', this.pointerDownHandler);

    // Disable Phaser keyboard when HTML inputs are focused
    this.focusInHandler = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        this.input.keyboard!.enabled = false;
      }
    };
    this.focusOutHandler = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        this.input.keyboard!.enabled = true;
      }
    };
    document.addEventListener('focusin', this.focusInHandler);
    document.addEventListener('focusout', this.focusOutHandler);

    // Initialize game systems
    this.unsubscribeYieldSystem = initYieldSystem();
    this.unsubscribeSpoilageSystem = initSpoilageSystem();
    this.unsubscribeVillagerSystem = initVillagerSystem();
    console.log('[MainScene] Yield, spoilage, and villager systems initialized');

    // Initial render (force full render)
    this.renderMapData(true);
  }

  shutdown(): void {
    // Cleanup input event listeners
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    if (this.pointerDownHandler) {
      this.input.off('pointerdown', this.pointerDownHandler);
      this.pointerDownHandler = null;
    }

    // Cleanup document event listeners
    if (this.focusInHandler) {
      document.removeEventListener('focusin', this.focusInHandler);
      this.focusInHandler = null;
    }
    if (this.focusOutHandler) {
      document.removeEventListener('focusout', this.focusOutHandler);
      this.focusOutHandler = null;
    }

    // Cleanup game systems
    if (this.unsubscribeYieldSystem) {
      this.unsubscribeYieldSystem();
      this.unsubscribeYieldSystem = null;
    }
    if (this.unsubscribeSpoilageSystem) {
      this.unsubscribeSpoilageSystem();
      this.unsubscribeSpoilageSystem = null;
    }
    if (this.unsubscribeVillagerSystem) {
      this.unsubscribeVillagerSystem();
      this.unsubscribeVillagerSystem = null;
    }
    console.log('[MainScene] Event listeners and systems cleaned up');
  }

  update(_time: number, delta: number): void {
    // Skip keyboard handling if an input element is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).isContentEditable
    );

    if (!isInputFocused) {
      this.handleEditorKeys();
    }

    const mapStore = useMapEditorStore.getState();
    const defStore = useDefinitionsStore.getState();
    const isEditing = mapStore.isEditing;

    // Only allow player movement and interaction when neither editor is open and no input focused
    if (!isEditing && !defStore.isEditorOpen && !isInputFocused) {
      this.handlePlayerMovement(delta);
      this.updateInteractionDetection(isEditing, defStore);
    } else if (isEditing || defStore.isEditorOpen) {
      // Clear interaction target when in editor mode
      useInteractionStore.getState().clearTarget();
    }

    if (!isInputFocused) {
      this.handleCameraPan(delta);
    }
    this.renderMapData();
  }

  private updateInteractionDetection(
    isEditing: boolean,
    defStore: ReturnType<typeof useDefinitionsStore.getState>
  ): void {
    const interactionStore = useInteractionStore.getState();
    const yieldStateStore = useYieldStateStore.getState();

    // Use runtime map for gameplay, editor map for editing
    const mapData = getActiveMapData(isEditing);

    // Create yield state accessor for state-aware interaction filtering
    const yieldStateAccessor = {
      getPlacementYields: yieldStateStore.getPlacementYields,
      hasAvailableYield: yieldStateStore.hasAvailableYield,
    };

    // Find nearest interactable object with state-aware filtering
    // Include structures from definitions store (they're stored there, not in map data)
    const mapDataWithStructures = {
      ...mapData,
      structures: defStore.structurePlacements,
    };

    const target = findNearestInteractable(
      this.player.x,
      this.player.y,
      mapDataWithStructures,
      {
        plants: defStore.plants,
        animals: defStore.animals,
        waters: defStore.waters,
        resources: defStore.resources,
        structures: defStore.structures,
      },
      yieldStateAccessor
    );

    // Update store
    if (target) {
      interactionStore.setTarget(target);
    } else {
      interactionStore.clearTarget();
    }
  }

  private createGrassBackground(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;
        const tile = this.add.sprite(worldX, worldY, 'tile-grass');
        tile.setDepth(0);
      }
    }
  }

  private handleEditorKeys(): void {
    const mapStore = useMapEditorStore.getState();
    const defStore = useDefinitionsStore.getState();
    const gameStateStore = useGameStateStore.getState();
    const interactionStore = useInteractionStore.getState();

    // E key is used only for interaction (not editor toggle)
    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.E)) {
      if (!mapStore.isEditing && !defStore.isEditorOpen && interactionStore.currentTarget) {
        const primaryAction = interactionStore.currentTarget.interactionTypes[0];
        interactionStore.executeInteraction(primaryAction);
      }
    }

    // Handle number keys 1-9 for interactions
    const allNumKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const;
    allNumKeys.forEach((keyName, keyIndex) => {
      const key = this.editorKeys[keyName];
      if (key && Phaser.Input.Keyboard.JustDown(key)) {
        if (!mapStore.isEditing && !defStore.isEditorOpen && interactionStore.currentTarget) {
          const target = interactionStore.currentTarget;

          // For plants/animals: use interactionTypes array (yield actions + transformations)
          if (target.object.type === 'plant' || target.object.type === 'animal') {
            // The interactionTypes array contains yield actions and transformation actions
            // in the same order as displayed in InteractionPrompt
            if (target.interactionTypes[keyIndex]) {
              interactionStore.executeInteraction(target.interactionTypes[keyIndex]);
            }
          }
          // For resources: key 1 = collect, keys 2-9 = transformations
          else if (target.object.type === 'resource') {
            if (keyIndex === 0) {
              interactionStore.executeInteraction('collect');
            } else {
              const transformIndex = keyIndex - 1;  // key 2 = index 0, key 3 = index 1, etc.
              const resource = defStore.resources.find(r => r.id === target.object.definitionId);
              if (resource?.transformations && resource.transformations[transformIndex]) {
                const transformation = resource.transformations[transformIndex];
                interactionStore.executeInteraction(transformation.action);
              } else {
                // Fallback to bootstrap recipe for key 2
                if (transformIndex === 0) {
                  const recipe = getBootstrapRecipe(target.object.definitionId);
                  if (recipe) {
                    interactionStore.executeInteraction(recipe.action);
                  }
                }
              }
            }
          }
        }
      }
    });

    // Toggle Definition Editor with Shift+D
    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.D_KEY) &&
        (this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).isDown)) {
      defStore.toggleEditor();
    }

    // ESC for placement mode or return to main menu
    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.ESC)) {
      const placementStore = usePlacementStore.getState();
      if (placementStore.isPlacing) {
        // Cancel placement mode
        placementStore.cancelPlacement();
        return;
      }
      if (!mapStore.isEditing && !defStore.isEditorOpen) {
        gameStateStore.returnToMenu();
        return;
      }
    }
  }

  private handleEditorClick(pointer: Phaser.Input.Pointer): void {
    // Handle placement mode first
    const placementStore = usePlacementStore.getState();
    if (placementStore.isPlacing) {
      // Get world coordinates
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const worldX = worldPoint.x;
      const worldY = worldPoint.y;

      // Update preview position
      placementStore.updatePreview(worldX, worldY);

      if (pointer.leftButtonDown()) {
        // confirmPlacement() handles inventory consumption and structure placement
        placementStore.confirmPlacement();
      }
      return; // Don't process other clicks during placement
    }

    const store = useMapEditorStore.getState();
    if (!store.isEditing) return;

    // Convert screen to world coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const x = worldPoint.x;
    const y = worldPoint.y;

    // Right click cancels
    if (pointer.rightButtonDown()) {
      store.cancelRiver();
      return;
    }

    switch (store.currentTool) {
      case 'plant':
        store.addPlant(x, y);
        break;
      case 'animal':
        store.addAnimal(x, y);
        break;
      case 'water':
        store.addWater(x, y);
        break;
      case 'resource':
        store.addResource(x, y);
        break;
      case 'river':
        store.addRiverPoint({ x, y });
        break;
      case 'spawn':
        store.setSpawn({ x, y });
        this.player.setPosition(x, y);
        break;
      case 'eraser':
        store.eraseAt(x, y, 30);
        break;
    }
  }

  private hashData(data: unknown): string {
    return JSON.stringify(data);
  }

  private renderMapData(forceRender = false): void {
    const mapStore = useMapEditorStore.getState();
    const defStore = useDefinitionsStore.getState();
    const { activeRiver, isEditing } = mapStore;

    // Get the appropriate map data based on mode
    // Editor mode: use blueprint from mapEditorStore
    // Game mode: use runtime copy from runtimeMapStore
    const mapData = getActiveMapData(isEditing);

    // Check if editing mode changed (need to update labels)
    const editingChanged = isEditing !== this.lastIsEditing;
    this.lastIsEditing = isEditing;

    // Rivers - only update if changed
    const riversHash = this.hashData(mapData.rivers);
    if (forceRender || riversHash !== this.lastRiversHash) {
      this.lastRiversHash = riversHash;
      this.renderRivers(mapData.rivers);
    }

    // Active river - only update if changed
    const activeRiverHash = this.hashData(activeRiver);
    if (forceRender || activeRiverHash !== this.lastActiveRiverHash) {
      this.lastActiveRiverHash = activeRiverHash;
      this.renderActiveRiver(activeRiver);
    }

    // Plants - only update if changed or editing mode changed
    const plantsHash = this.hashData(mapData.plants);
    if (forceRender || plantsHash !== this.lastPlantsHash || editingChanged) {
      this.lastPlantsHash = plantsHash;
      this.updatePlants(mapData.plants, defStore.plants, isEditing);
    }

    // Animals - only update if changed or editing mode changed
    const animalsHash = this.hashData(mapData.animals);
    if (forceRender || animalsHash !== this.lastAnimalsHash || editingChanged) {
      this.lastAnimalsHash = animalsHash;
      this.updateAnimals(mapData.animals, defStore.animals, isEditing);
    }

    // Waters - only update if changed or editing mode changed
    const watersHash = this.hashData(mapData.waters);
    if (forceRender || watersHash !== this.lastWatersHash || editingChanged) {
      this.lastWatersHash = watersHash;
      this.updateWaters(mapData.waters, defStore.waters, isEditing);
    }

    // Resources - only update if changed or editing mode changed
    const resourcesHash = this.hashData(mapData.resources || []);
    if (forceRender || resourcesHash !== this.lastResourcesHash || editingChanged) {
      this.lastResourcesHash = resourcesHash;
      this.updateResources(mapData.resources || [], defStore.resources, isEditing);
    }

    // Structures - only update if changed or editing mode changed
    const structuresHash = this.hashData(defStore.structurePlacements || []);
    if (forceRender || structuresHash !== this.lastStructuresHash || editingChanged) {
      this.lastStructuresHash = structuresHash;
      this.updateStructures(defStore.structurePlacements || [], defStore.structures || [], isEditing);
    }

    // Villagers - only update if changed or editing mode changed
    const villagersHash = this.hashData(mapData.villagers || []);
    if (forceRender || villagersHash !== this.lastVillagersHash || editingChanged) {
      this.lastVillagersHash = villagersHash;
      this.updateVillagers(mapData.villagers || [], isEditing);
    }

    // Spawn marker - only update if changed or editing mode changed
    const spawnHash = this.hashData(mapData.spawn);
    if (forceRender || spawnHash !== this.lastSpawnHash || editingChanged) {
      this.lastSpawnHash = spawnHash;
      this.renderSpawnMarker(mapData.spawn, isEditing);
    }

    // Yield state - update badges when yield state changes (separate from plant/animal data)
    const yieldStateStore = useYieldStateStore.getState();
    const yieldStateHash = this.hashData(Array.from(yieldStateStore.yieldStates.entries()));
    if (forceRender || yieldStateHash !== this.lastYieldStateHash) {
      this.lastYieldStateHash = yieldStateHash;
      // Update yield badges for all plants and animals
      for (const [id, container] of this.plantSprites) {
        this.updateYieldBadge(container, id);
      }
      for (const [id, container] of this.animalSprites) {
        this.updateYieldBadge(container, id);
      }
    }
  }

  private renderRivers(rivers: { points: { x: number; y: number }[] }[]): void {
    this.riverGraphics.clear();

    for (const river of rivers) {
      if (river.points.length >= 3) {
        const smoothed = smoothPolygon(river.points);

        // Fill with blue only (no border)
        this.riverGraphics.fillStyle(0x3b82f6, 1);
        this.riverGraphics.beginPath();
        this.riverGraphics.moveTo(smoothed[0].x, smoothed[0].y);
        for (let i = 1; i < smoothed.length; i++) {
          this.riverGraphics.lineTo(smoothed[i].x, smoothed[i].y);
        }
        this.riverGraphics.closePath();
        this.riverGraphics.fillPath();
      }
    }
  }

  private renderActiveRiver(activeRiver: { x: number; y: number }[]): void {
    this.activeRiverGraphics.clear();
    if (activeRiver.length > 0) {
      this.activeRiverGraphics.lineStyle(2, 0x60a5fa, 1);
      this.activeRiverGraphics.beginPath();
      this.activeRiverGraphics.moveTo(activeRiver[0].x, activeRiver[0].y);
      for (let i = 1; i < activeRiver.length; i++) {
        this.activeRiverGraphics.lineTo(activeRiver[i].x, activeRiver[i].y);
      }
      this.activeRiverGraphics.strokePath();

      // Draw points
      this.activeRiverGraphics.fillStyle(0xffffff, 1);
      for (const point of activeRiver) {
        this.activeRiverGraphics.fillCircle(point.x, point.y, 4);
      }
    }
  }

  private updatePlants(
    placements: PlantPlacement[],
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));

    // Remove sprites that no longer exist
    for (const [id, container] of this.plantSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.plantSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.plantSprites.get(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updatePlantLabel(existing, placement, definitions, isEditing);
        // Update yield badge
        this.updateYieldBadge(existing, placement.id);
      } else {
        // Create new sprite
        const container = this.createPlantSprite(placement, definitions, isEditing);
        this.plantSprites.set(placement.id, container);
      }
    }
  }

  private createPlantSprite(
    placement: PlantPlacement,
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(p => p.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Get sprite image (custom or generated)
    const textureKey = `plant-sprite-${placement.definitionId}`;

    // Create sprite with texture if available, otherwise use fallback
    const sprite = this.textures.exists(textureKey)
      ? this.add.sprite(0, 0, textureKey)
      : this.add.sprite(0, 0, 'tile-grass');

    // Always set size to 32x32 (1 meter)
    sprite.setDisplaySize(32, 32);

    // Apply tint only if using fallback texture
    if (!this.textures.exists(textureKey) && definition) {
      const colorMap: Record<string, number> = {
        tree: 0x22c55e,
        crop: 0xeab308,
        flower: 0xec4899,
        bush: 0x84cc16,
      };
      sprite.setTint(colorMap[definition.subCategory] || 0xffffff);

      // Start loading texture if not available
      const imageUrl = definition.imageUrl || generatePlantPreview(definition.subCategory, definition.name);
      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          // Add texture only if it doesn't exist yet (first load wins)
          if (!this.textures.exists(textureKey)) {
            this.textures.addImage(textureKey, img);
          }
          // Always update THIS sprite once texture is available
          if (sprite && sprite.scene) {
            sprite.setTexture(textureKey);
            sprite.setDisplaySize(32, 32);
            sprite.clearTint();
          }
        };
        img.src = imageUrl;
      }
    }
    container.add(sprite);

    // Add yield badge (top-right corner)
    this.addYieldBadge(container, placement.id);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 20, definition.name, {
        fontFamily: 'Avenir, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      });
      label.setOrigin(0.5, 0);
      label.setName('label');
      container.add(label);
    }

    container.setDepth(5);
    return container;
  }

  private addYieldBadge(container: Phaser.GameObjects.Container, placementId: string): void {
    const yieldStore = useYieldStateStore.getState();
    const yieldState = yieldStore.getPlacementYields(placementId);

    // Calculate total remaining yield across all yield types
    const totalRemaining = yieldState?.yields.reduce((sum, y) => sum + (y.isAvailable ? y.remaining : 0), 0) ?? 0;

    if (totalRemaining > 0) {
      // Create badge background (green circle)
      const badge = this.add.graphics();
      badge.fillStyle(0x22c55e, 1);
      badge.fillCircle(12, -12, 8);
      badge.lineStyle(1, 0xffffff, 1);
      badge.strokeCircle(12, -12, 8);
      badge.setName('yieldBadgeBg');
      container.add(badge);

      // Create badge text showing count
      const badgeText = this.add.text(12, -12, String(totalRemaining), {
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      badgeText.setOrigin(0.5, 0.5);
      badgeText.setName('yieldBadgeText');
      container.add(badgeText);
    }
  }

  private updateYieldBadge(container: Phaser.GameObjects.Container, placementId: string): void {
    const yieldStore = useYieldStateStore.getState();
    const yieldState = yieldStore.getPlacementYields(placementId);

    // Calculate total remaining yield
    const totalRemaining = yieldState?.yields.reduce((sum, y) => sum + (y.isAvailable ? y.remaining : 0), 0) ?? 0;

    // Get existing badge elements
    const existingBadgeBg = container.getByName('yieldBadgeBg') as Phaser.GameObjects.Graphics | null;
    const existingBadgeText = container.getByName('yieldBadgeText') as Phaser.GameObjects.Text | null;

    if (totalRemaining > 0) {
      if (!existingBadgeBg) {
        // Create badge if it doesn't exist
        const badge = this.add.graphics();
        badge.fillStyle(0x22c55e, 1);
        badge.fillCircle(12, -12, 8);
        badge.lineStyle(1, 0xffffff, 1);
        badge.strokeCircle(12, -12, 8);
        badge.setName('yieldBadgeBg');
        container.add(badge);

        const badgeText = this.add.text(12, -12, String(totalRemaining), {
          fontSize: '10px',
          color: '#ffffff',
          fontStyle: 'bold',
        });
        badgeText.setOrigin(0.5, 0.5);
        badgeText.setName('yieldBadgeText');
        container.add(badgeText);
      } else if (existingBadgeText) {
        // Update text if badge exists
        existingBadgeText.setText(String(totalRemaining));
      }
    } else {
      // Remove badge if no yield remaining
      if (existingBadgeBg) existingBadgeBg.destroy();
      if (existingBadgeText) existingBadgeText.destroy();
    }
  }

  /**
   * Generic method to update entity labels for any placement type
   */
  private updateEntityLabel(
    container: Phaser.GameObjects.Container,
    definitionId: string,
    definitions: { id: string; name: string }[],
    isEditing: boolean,
    yOffset: number = 20
  ): void {
    const existingLabel = container.getByName('label') as Phaser.GameObjects.Text | null;
    const definition = definitions.find(d => d.id === definitionId);

    if (isEditing && definition) {
      if (!existingLabel) {
        const label = this.add.text(0, yOffset, definition.name, {
          fontFamily: 'Avenir, system-ui, sans-serif',
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 2, y: 1 },
        });
        label.setOrigin(0.5, 0);
        label.setName('label');
        container.add(label);
      }
    } else if (existingLabel) {
      existingLabel.destroy();
    }
  }

  private updatePlantLabel(
    container: Phaser.GameObjects.Container,
    placement: PlantPlacement,
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    this.updateEntityLabel(container, placement.definitionId, definitions, isEditing, 20);
  }

  private updateAnimals(
    placements: AnimalPlacement[],
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));

    // Remove sprites that no longer exist
    for (const [id, container] of this.animalSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.animalSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.animalSprites.get(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updateAnimalLabel(existing, placement, definitions, isEditing);
        // Update yield badge
        this.updateYieldBadge(existing, placement.id);
      } else {
        // Create new sprite
        const container = this.createAnimalSprite(placement, definitions, isEditing);
        this.animalSprites.set(placement.id, container);
      }
    }
  }

  private createAnimalSprite(
    placement: AnimalPlacement,
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(a => a.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Get sprite image (custom or generated)
    const textureKey = `animal-sprite-${placement.definitionId}`;

    // Create sprite with texture if available, otherwise use fallback graphics
    let sprite: Phaser.GameObjects.Sprite | null = null;
    let graphics: Phaser.GameObjects.Graphics | null = null;

    if (this.textures.exists(textureKey)) {
      sprite = this.add.sprite(0, 0, textureKey);
      sprite.setDisplaySize(32, 32);
      container.add(sprite);
    } else {
      // Fallback: colored circle (16px radius = 32px diameter = 1 meter)
      graphics = this.add.graphics();
      const colorMap: Record<string, number> = {
        livestock: 0x8b4513,
        poultry: 0xffa500,
        wild: 0x808080,
        pet: 0xff69b4,
      };
      const color = definition ? (colorMap[definition.subCategory] || 0xffffff) : 0xffffff;
      graphics.fillStyle(color, 1);
      graphics.fillCircle(0, 0, 16);
      graphics.lineStyle(2, 0x000000, 1);
      graphics.strokeCircle(0, 0, 16);
      container.add(graphics);

      // Start loading texture if not available
      if (definition) {
        const imageUrl = definition.imageUrl || generateAnimalPreview(definition.subCategory, definition.name);
        if (imageUrl) {
          const img = new Image();
          img.onload = () => {
            // Add texture only if it doesn't exist yet (first load wins)
            if (!this.textures.exists(textureKey)) {
              this.textures.addImage(textureKey, img);
            }
            // Always update THIS container once texture is available
            if (graphics && graphics.scene) {
              graphics.destroy();
              const newSprite = this.add.sprite(0, 0, textureKey);
              newSprite.setDisplaySize(32, 32);
              container.addAt(newSprite, 0);
            }
          };
          img.src = imageUrl;
        }
      }
    }

    // Add yield badge (top-right corner)
    this.addYieldBadge(container, placement.id);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 20, definition.name, {
        fontFamily: 'Avenir, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      });
      label.setOrigin(0.5, 0);
      label.setName('label');
      container.add(label);
    }

    container.setDepth(6);
    return container;
  }

  private updateAnimalLabel(
    container: Phaser.GameObjects.Container,
    placement: AnimalPlacement,
    definitions: { id: string; name: string; subCategory: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    this.updateEntityLabel(container, placement.definitionId, definitions, isEditing, 18);
  }

  private updateWaters(
    placements: WaterPlacement[],
    definitions: { id: string; name: string; waterType: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));

    // Remove sprites that no longer exist
    for (const [id, container] of this.waterSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.waterSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.waterSprites.get(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updateWaterLabel(existing, placement, definitions, isEditing);
      } else {
        // Create new sprite
        const container = this.createWaterSprite(placement, definitions, isEditing);
        this.waterSprites.set(placement.id, container);
      }
    }
  }

  private createWaterSprite(
    placement: WaterPlacement,
    definitions: { id: string; name: string; waterType: string; imageUrl?: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(w => w.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Get sprite image if available
    const textureKey = `water-sprite-${placement.definitionId}`;

    // Create sprite with texture if available, otherwise use fallback graphics
    if (this.textures.exists(textureKey)) {
      const sprite = this.add.sprite(0, 0, textureKey);
      sprite.setDisplaySize(32, 32);
      container.add(sprite);
    } else {
      // Fallback: colored circle for water
      const graphics = this.add.graphics();
      const colorMap: Record<string, number> = {
        river: 0x3b82f6,
        pond: 0x60a5fa,
        lake: 0x2563eb,
        ocean: 0x1d4ed8,
        well: 0x6b7280,
      };
      const color = definition ? (colorMap[definition.waterType] || 0x3b82f6) : 0x3b82f6;
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(0, 0, 16);
      graphics.lineStyle(2, 0x1e40af, 1);
      graphics.strokeCircle(0, 0, 16);
      container.add(graphics);

      // Start loading texture if not available
      if (definition?.imageUrl) {
        const img = new Image();
        img.onload = () => {
          // Add texture only if it doesn't exist yet (first load wins)
          if (!this.textures.exists(textureKey)) {
            this.textures.addImage(textureKey, img);
          }
          // Always update THIS container once texture is available
          if (graphics && graphics.scene) {
            graphics.destroy();
            const newSprite = this.add.sprite(0, 0, textureKey);
            newSprite.setDisplaySize(32, 32);
            container.addAt(newSprite, 0);
          }
        };
        img.src = definition.imageUrl;
      }
    }

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 20, definition.name, {
        fontFamily: 'Avenir, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      });
      label.setOrigin(0.5, 0);
      label.setName('label');
      container.add(label);
    }

    container.setDepth(4); // Below plants/animals but above grass
    return container;
  }

  private updateWaterLabel(
    container: Phaser.GameObjects.Container,
    placement: WaterPlacement,
    definitions: { id: string; name: string; waterType: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    this.updateEntityLabel(container, placement.definitionId, definitions, isEditing, 20);
  }

  private updateResources(
    placements: ResourcePlacement[],
    definitions: { id: string; name: string; category: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));

    // Remove sprites that no longer exist
    for (const [id, container] of this.resourceSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.resourceSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.resourceSprites.get(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updateResourceLabel(existing, placement, definitions, isEditing);
      } else {
        // Create new sprite
        const container = this.createResourceSprite(placement, definitions, isEditing);
        this.resourceSprites.set(placement.id, container);
      }
    }
  }

  private createResourceSprite(
    placement: ResourcePlacement,
    definitions: { id: string; name: string; category: string; emoji?: string; imageUrl?: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(r => r.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Use emoji from definition for ground resources
    const emoji = definition?.emoji || '📦';
    const emojiText = this.add.text(0, 0, emoji, {
      fontSize: '24px',
    });
    emojiText.setOrigin(0.5, 0.5);
    emojiText.setName('emoji');
    container.add(emojiText);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 20, definition.name, {
        fontFamily: 'Avenir, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      });
      label.setOrigin(0.5, 0);
      label.setName('label');
      container.add(label);
    }

    container.setDepth(4); // Same as waters
    return container;
  }

  private updateResourceLabel(
    container: Phaser.GameObjects.Container,
    placement: ResourcePlacement,
    definitions: { id: string; name: string; category: string; imageUrl?: string }[],
    isEditing: boolean
  ): void {
    this.updateEntityLabel(container, placement.definitionId, definitions, isEditing, 20);
  }

  private updateStructures(
    placements: { id: string; definitionId: string; x: number; y: number }[],
    definitions: { id: string; name: string; emoji: string; width: number; height: number }[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));

    // Remove sprites that no longer exist
    for (const [id, container] of this.structureSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.structureSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.structureSprites.get(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updateStructureLabel(existing, placement, definitions, isEditing);
      } else {
        // Create new sprite
        const container = this.createStructureSprite(placement, definitions, isEditing);
        this.structureSprites.set(placement.id, container);
      }
    }
  }

  private createStructureSprite(
    placement: { id: string; definitionId: string; x: number; y: number },
    definitions: { id: string; name: string; emoji: string; width: number; height: number }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(s => s.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Use emoji from definition
    const emoji = definition?.emoji || '🏗️';
    const emojiText = this.add.text(0, 0, emoji, {
      fontSize: '32px',
    });
    emojiText.setOrigin(0.5, 0.5);
    emojiText.setName('emoji');
    container.add(emojiText);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 24, definition.name, {
        fontFamily: 'Avenir, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      });
      label.setOrigin(0.5, 0);
      label.setName('label');
      container.add(label);
    }

    container.setDepth(7); // Above animals
    return container;
  }

  private updateStructureLabel(
    container: Phaser.GameObjects.Container,
    placement: { id: string; definitionId: string; x: number; y: number },
    definitions: { id: string; name: string; emoji: string; width: number; height: number }[],
    isEditing: boolean
  ): void {
    this.updateEntityLabel(container, placement.definitionId, definitions, isEditing, 24);
  }

  private updateVillagers(
    placements: VillagerPlacement[],
    isEditing: boolean
  ): void {
    const currentIds = new Set(placements.map(p => p.id));
    const villagerStore = useVillagerStore.getState();

    // Remove sprites that no longer exist
    for (const [id, container] of this.villagerSprites) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.villagerSprites.delete(id);
      }
    }

    // Add or update sprites
    for (const placement of placements) {
      const existing = this.villagerSprites.get(placement.id);
      const villagerData = villagerStore.getVillager(placement.id);

      if (existing) {
        // Update position if changed
        if (existing.x !== placement.x || existing.y !== placement.y) {
          existing.setPosition(placement.x, placement.y);
        }
        // Update label visibility based on editing mode
        this.updateVillagerLabel(existing, placement, villagerData, isEditing);
        // Update recruitment status badge
        this.updateVillagerBadge(existing, villagerData);
      } else {
        // Create new sprite
        const container = this.createVillagerSprite(placement, villagerData, isEditing);
        this.villagerSprites.set(placement.id, container);
      }
    }
  }

  private createVillagerSprite(
    placement: VillagerPlacement,
    villagerData: ReturnType<typeof useVillagerStore.getState.prototype.getVillager>,
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(placement.x, placement.y);

    // Create villager body (simple humanoid shape)
    const graphics = this.add.graphics();

    // Body color based on recruitment status
    const isRecruited = villagerData?.isRecruited ?? false;
    const bodyColor = isRecruited ? 0x22c55e : 0xfbbf24; // Green if recruited, yellow if not

    // Head (circle)
    graphics.fillStyle(0xfcd5b4, 1); // Skin color
    graphics.fillCircle(0, -12, 8);

    // Body (rectangle)
    graphics.fillStyle(bodyColor, 1);
    graphics.fillRect(-8, -4, 16, 20);

    // Border
    graphics.lineStyle(1, 0x000000, 0.5);
    graphics.strokeCircle(0, -12, 8);
    graphics.strokeRect(-8, -4, 16, 20);

    container.add(graphics);

    // Add recruitment quest indicator if not recruited
    if (!isRecruited) {
      const questIcon = this.add.text(12, -20, '❓', {
        fontSize: '14px',
      });
      questIcon.setOrigin(0.5, 0.5);
      questIcon.setName('questIcon');
      container.add(questIcon);
    }

    // Add name label
    const name = villagerData?.name || `Villager ${placement.id.split('-').pop()}`;
    const label = this.add.text(0, 22, name, {
      fontFamily: 'Avenir, system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: isEditing ? '#000000aa' : '#00000066',
      padding: { x: 2, y: 1 },
    });
    label.setOrigin(0.5, 0);
    label.setName('label');
    container.add(label);

    // Add loyalty indicator for recruited villagers
    if (isRecruited && villagerData) {
      this.addLoyaltyIndicator(container, villagerData.loyalty);
    }

    container.setDepth(9); // Just below player (10)
    return container;
  }

  private addLoyaltyIndicator(container: Phaser.GameObjects.Container, loyalty: string): void {
    const loyaltyColors: Record<string, number> = {
      happy: 0x22c55e,
      content: 0x3b82f6,
      warning: 0xf59e0b,
      leaving: 0xef4444,
    };
    const color = loyaltyColors[loyalty] || 0x6b7280;

    const indicator = this.add.graphics();
    indicator.fillStyle(color, 1);
    indicator.fillCircle(-12, -20, 4);
    indicator.lineStyle(1, 0xffffff, 1);
    indicator.strokeCircle(-12, -20, 4);
    indicator.setName('loyaltyIndicator');
    container.add(indicator);
  }

  private updateVillagerLabel(
    container: Phaser.GameObjects.Container,
    placement: VillagerPlacement,
    villagerData: ReturnType<typeof useVillagerStore.getState.prototype.getVillager>,
    isEditing: boolean
  ): void {
    const existingLabel = container.getByName('label') as Phaser.GameObjects.Text | null;
    const name = villagerData?.name || `Villager ${placement.id.split('-').pop()}`;

    if (existingLabel) {
      existingLabel.setText(name);
      existingLabel.setBackgroundColor(isEditing ? '#000000aa' : '#00000066');
    }
  }

  private updateVillagerBadge(
    container: Phaser.GameObjects.Container,
    villagerData: ReturnType<typeof useVillagerStore.getState.prototype.getVillager>
  ): void {
    const isRecruited = villagerData?.isRecruited ?? false;
    const existingQuestIcon = container.getByName('questIcon') as Phaser.GameObjects.Text | null;
    const existingLoyaltyIndicator = container.getByName('loyaltyIndicator') as Phaser.GameObjects.Graphics | null;

    // Remove quest icon if recruited
    if (isRecruited && existingQuestIcon) {
      existingQuestIcon.destroy();
    }

    // Add/update loyalty indicator for recruited villagers
    if (isRecruited && villagerData) {
      if (existingLoyaltyIndicator) {
        existingLoyaltyIndicator.destroy();
      }
      this.addLoyaltyIndicator(container, villagerData.loyalty);
    }
  }

  private renderSpawnMarker(spawn: { x: number; y: number }, isEditing: boolean): void {
    this.spawnMarker.clear();
    if (isEditing) {
      this.spawnMarker.lineStyle(2, 0x22c55e, 1);
      this.spawnMarker.strokeCircle(spawn.x, spawn.y, 12);
      this.spawnMarker.lineBetween(spawn.x - 8, spawn.y, spawn.x + 8, spawn.y);
      this.spawnMarker.lineBetween(spawn.x, spawn.y - 8, spawn.x, spawn.y + 8);
    }
  }

  private handleCameraPan(delta: number): void {
    const panSpeed = this.CAMERA_PAN_SPEED * (delta / 1000);
    const camera = this.cameras.main;

    if (this.cursors.left.isDown) {
      camera.scrollX -= panSpeed;
    } else if (this.cursors.right.isDown) {
      camera.scrollX += panSpeed;
    }

    if (this.cursors.up.isDown) {
      camera.scrollY -= panSpeed;
    } else if (this.cursors.down.isDown) {
      camera.scrollY += panSpeed;
    }
  }

  private handlePlayerMovement(delta: number): void {
    let vx = 0;
    let vy = 0;

    if (this.wasd.A.isDown) vx = -1;
    else if (this.wasd.D.isDown) vx = 1;

    if (this.wasd.W.isDown) vy = -1;
    else if (this.wasd.S.isDown) vy = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const factor = 0.7071;
      vx *= factor;
      vy *= factor;
    }

    const speed = this.MOVE_SPEED * (delta / 1000);
    const newX = this.player.x + vx * speed;
    const newY = this.player.y + vy * speed;

    // Check collisions using runtime map (since this is called during gameplay, not editing)
    const mapData = useRuntimeMapStore.getState().mapData;
    const canMove = !checkCollision(newX, newY, mapData);

    if (canMove) {
      this.player.x = newX;
      this.player.y = newY;
    } else {
      // Try axis-separated movement
      const canMoveX = !checkCollision(newX, this.player.y, mapData);
      const canMoveY = !checkCollision(this.player.x, newY, mapData);
      if (canMoveX) this.player.x = newX;
      if (canMoveY) this.player.y = newY;
    }

    // Clamp to map bounds
    const mapWidth = MAP_SIZE * TILE_SIZE;
    const mapHeight = MAP_SIZE * TILE_SIZE;
    this.player.x = Phaser.Math.Clamp(this.player.x, 10, mapWidth - 10);
    this.player.y = Phaser.Math.Clamp(this.player.y, 10, mapHeight - 10);
  }
}
