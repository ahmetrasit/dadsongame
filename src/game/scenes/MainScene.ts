import Phaser from 'phaser';
import { TILE_SIZE, MAP_SIZE } from '@/game/config';
import { useMapEditorStore, PlantPlacement, AnimalPlacement, WaterPlacement } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { smoothPolygon } from '@/game/utils/splineUtils';
import { checkCollision } from '@/game/utils/collisionDetection';
import { findNearestInteractable } from '@/game/utils/interactionDetection';

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
  private spawnMarker!: Phaser.GameObjects.Graphics;

  // State tracking for diff-based rendering
  private lastRiversHash = '';
  private lastActiveRiverHash = '';
  private lastPlantsHash = '';
  private lastAnimalsHash = '';
  private lastWatersHash = '';
  private lastSpawnHash = '';
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
    ENTER: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
  };

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

    // Get spawn point from store
    const store = useMapEditorStore.getState();
    const spawn = store.mapData.spawn;

    // Create player
    this.player = this.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(10);

    // Camera setup
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(spawn.x, spawn.y);

    // Input setup
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.editorKeys = {
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      D_KEY: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
      ONE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      TWO: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      FOUR: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      FIVE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      SIX: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    // Mouse wheel zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const zoomChange = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(
        this.cameras.main.zoom + zoomChange,
        this.MIN_ZOOM,
        this.MAX_ZOOM
      );
      this.cameras.main.setZoom(newZoom);
    });

    // Mouse click for editor
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleEditorClick(pointer);
    });

    // Initial render (force full render)
    this.renderMapData(true);
  }

  update(_time: number, delta: number): void {
    this.handleEditorKeys();

    const mapStore = useMapEditorStore.getState();
    const defStore = useDefinitionsStore.getState();

    // Only allow player movement and interaction when neither editor is open
    if (!mapStore.isEditing && !defStore.isEditorOpen) {
      this.handlePlayerMovement(delta);
      this.updateInteractionDetection(mapStore, defStore);
    } else {
      // Clear interaction target when in editor mode
      useInteractionStore.getState().clearTarget();
    }

    this.handleCameraPan(delta);
    this.renderMapData();
  }

  private updateInteractionDetection(
    mapStore: ReturnType<typeof useMapEditorStore.getState>,
    defStore: ReturnType<typeof useDefinitionsStore.getState>
  ): void {
    const interactionStore = useInteractionStore.getState();

    // Find nearest interactable object
    const target = findNearestInteractable(
      this.player.x,
      this.player.y,
      mapStore.mapData,
      {
        plants: defStore.plants,
        animals: defStore.animals,
        waters: defStore.waters,
      }
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

    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.E)) {
      // If not in editor mode and there's an interaction target, trigger interaction
      if (!mapStore.isEditing && !defStore.isEditorOpen && interactionStore.currentTarget) {
        const primaryAction = interactionStore.currentTarget.interactionTypes[0];
        interactionStore.executeInteraction(primaryAction);
      } else {
        // Otherwise toggle the map editor
        mapStore.toggleEditor();
      }
    }

    // Toggle Definition Editor with Shift+D
    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.D_KEY) &&
        (this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).isDown)) {
      defStore.toggleEditor();
    }

    // ESC returns to main menu when neither editor is open
    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.ESC)) {
      if (!mapStore.isEditing && !defStore.isEditorOpen) {
        gameStateStore.returnToMenu();
        return;
      }
    }

    if (mapStore.isEditing) {
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.ONE)) {
        mapStore.setTool('plant');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.TWO)) {
        mapStore.setTool('animal');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.THREE)) {
        mapStore.setTool('water');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.FOUR)) {
        mapStore.setTool('river');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.FIVE)) {
        mapStore.setTool('spawn');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.SIX)) {
        mapStore.setTool('eraser');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.ENTER)) {
        mapStore.closeRiver();
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.ESC)) {
        mapStore.cancelRiver();
      }
    }
  }

  private handleEditorClick(pointer: Phaser.Input.Pointer): void {
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
    const { mapData, activeRiver, isEditing } = mapStore;

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

    // Spawn marker - only update if changed or editing mode changed
    const spawnHash = this.hashData(mapData.spawn);
    if (forceRender || spawnHash !== this.lastSpawnHash || editingChanged) {
      this.lastSpawnHash = spawnHash;
      this.renderSpawnMarker(mapData.spawn, isEditing);
    }
  }

  private renderRivers(rivers: { points: { x: number; y: number }[] }[]): void {
    this.riverGraphics.clear();
    this.riverGraphics.fillStyle(0x3b82f6, 0.8);
    this.riverGraphics.lineStyle(2, 0x2563eb, 1);

    for (const river of rivers) {
      if (river.points.length >= 3) {
        const smoothed = smoothPolygon(river.points);
        this.riverGraphics.beginPath();
        this.riverGraphics.moveTo(smoothed[0].x, smoothed[0].y);
        for (let i = 1; i < smoothed.length; i++) {
          this.riverGraphics.lineTo(smoothed[i].x, smoothed[i].y);
        }
        this.riverGraphics.closePath();
        this.riverGraphics.fillPath();
        this.riverGraphics.strokePath();
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
    definitions: { id: string; name: string; subCategory: string }[],
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
      } else {
        // Create new sprite
        const container = this.createPlantSprite(placement, definitions, isEditing);
        this.plantSprites.set(placement.id, container);
      }
    }
  }

  private createPlantSprite(
    placement: PlantPlacement,
    definitions: { id: string; name: string; subCategory: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(p => p.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Create sprite
    const spriteKey = definition?.subCategory === 'tree' ? 'tile-tree-top' : 'tile-grass';
    const sprite = this.add.sprite(0, 0, spriteKey);

    // Add tint based on plant type
    if (definition) {
      const colorMap: Record<string, number> = {
        tree: 0x22c55e,
        crop: 0xeab308,
        flower: 0xec4899,
        bush: 0x84cc16,
      };
      sprite.setTint(colorMap[definition.subCategory] || 0xffffff);
    }

    container.add(sprite);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 20, definition.name, {
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

  private updatePlantLabel(
    container: Phaser.GameObjects.Container,
    placement: PlantPlacement,
    definitions: { id: string; name: string; subCategory: string }[],
    isEditing: boolean
  ): void {
    const existingLabel = container.getByName('label') as Phaser.GameObjects.Text | null;
    const definition = definitions.find(p => p.id === placement.definitionId);

    if (isEditing && definition) {
      if (!existingLabel) {
        const label = this.add.text(0, 20, definition.name, {
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

  private updateAnimals(
    placements: AnimalPlacement[],
    definitions: { id: string; name: string; subCategory: string }[],
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
      } else {
        // Create new sprite
        const container = this.createAnimalSprite(placement, definitions, isEditing);
        this.animalSprites.set(placement.id, container);
      }
    }
  }

  private createAnimalSprite(
    placement: AnimalPlacement,
    definitions: { id: string; name: string; subCategory: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(a => a.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Create colored circle
    const graphics = this.add.graphics();
    const colorMap: Record<string, number> = {
      livestock: 0x8b4513,
      poultry: 0xffa500,
      wild: 0x808080,
      pet: 0xff69b4,
    };
    const color = definition ? (colorMap[definition.subCategory] || 0xffffff) : 0xffffff;

    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, 12);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeCircle(0, 0, 12);

    container.add(graphics);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 18, definition.name, {
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
    definitions: { id: string; name: string; subCategory: string }[],
    isEditing: boolean
  ): void {
    const existingLabel = container.getByName('label') as Phaser.GameObjects.Text | null;
    const definition = definitions.find(a => a.id === placement.definitionId);

    if (isEditing && definition) {
      if (!existingLabel) {
        const label = this.add.text(0, 18, definition.name, {
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

  private updateWaters(
    placements: WaterPlacement[],
    definitions: { id: string; name: string; waterType: string }[],
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
    definitions: { id: string; name: string; waterType: string }[],
    isEditing: boolean
  ): Phaser.GameObjects.Container {
    const definition = definitions.find(w => w.id === placement.definitionId);
    const container = this.add.container(placement.x, placement.y);

    // Create colored circle for water
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
    graphics.fillCircle(0, 0, 20);
    graphics.lineStyle(2, 0x1e40af, 1);
    graphics.strokeCircle(0, 0, 20);

    container.add(graphics);

    // Add label if editing
    if (isEditing && definition) {
      const label = this.add.text(0, 26, definition.name, {
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
    definitions: { id: string; name: string; waterType: string }[],
    isEditing: boolean
  ): void {
    const existingLabel = container.getByName('label') as Phaser.GameObjects.Text | null;
    const definition = definitions.find(w => w.id === placement.definitionId);

    if (isEditing && definition) {
      if (!existingLabel) {
        const label = this.add.text(0, 26, definition.name, {
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

    // Check collisions
    const store = useMapEditorStore.getState();
    const canMove = !checkCollision(newX, newY, store.mapData);

    if (canMove) {
      this.player.x = newX;
      this.player.y = newY;
    } else {
      // Try axis-separated movement
      const canMoveX = !checkCollision(newX, this.player.y, store.mapData);
      const canMoveY = !checkCollision(this.player.x, newY, store.mapData);
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
