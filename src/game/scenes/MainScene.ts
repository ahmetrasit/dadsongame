import Phaser from 'phaser';
import { TILE_SIZE, MAP_SIZE } from '@/game/config';
import { useMapEditorStore } from '@/stores/mapEditorStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { smoothPolygon } from '@/game/utils/splineUtils';
import { checkCollision } from '@/game/utils/collisionDetection';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // Graphics for rendering
  private riverGraphics!: Phaser.GameObjects.Graphics;
  private activeRiverGraphics!: Phaser.GameObjects.Graphics;
  private treeSprites: Phaser.GameObjects.Sprite[] = [];
  private spawnMarker!: Phaser.GameObjects.Graphics;

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
      D_KEY: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false), // false = don't capture for WASD
      ONE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      TWO: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      FOUR: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
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

    // Initial render
    this.renderMapData();
  }

  update(_time: number, delta: number): void {
    this.handleEditorKeys();

    const mapStore = useMapEditorStore.getState();
    const defStore = useDefinitionsStore.getState();

    // Only allow player movement when neither editor is open
    if (!mapStore.isEditing && !defStore.isEditorOpen) {
      this.handlePlayerMovement(delta);
    }

    this.handleCameraPan(delta);
    this.renderMapData();
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

    if (Phaser.Input.Keyboard.JustDown(this.editorKeys.E)) {
      mapStore.toggleEditor();
    }

    // Toggle Definition Editor with Shift+D (to avoid conflict with WASD)
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
        mapStore.setTool('tree');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.TWO)) {
        mapStore.setTool('river');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.THREE)) {
        mapStore.setTool('spawn');
      }
      if (Phaser.Input.Keyboard.JustDown(this.editorKeys.FOUR)) {
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
      case 'tree':
        store.addTree(x, y);
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

  private renderMapData(): void {
    const store = useMapEditorStore.getState();
    const { mapData, activeRiver, isEditing } = store;

    // Clear and redraw rivers
    this.riverGraphics.clear();
    this.riverGraphics.fillStyle(0x3b82f6, 0.8);
    this.riverGraphics.lineStyle(2, 0x2563eb, 1);

    for (const river of mapData.rivers) {
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

    // Draw active river being edited
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

    // Update trees - remove old, add new
    for (const sprite of this.treeSprites) {
      sprite.destroy();
    }
    this.treeSprites = [];

    for (const tree of mapData.trees) {
      const sprite = this.add.sprite(tree.x, tree.y, 'tile-tree-top');
      sprite.setDepth(5);
      this.treeSprites.push(sprite);
    }

    // Draw spawn marker in edit mode
    this.spawnMarker.clear();
    if (isEditing) {
      this.spawnMarker.lineStyle(2, 0x22c55e, 1);
      this.spawnMarker.strokeCircle(mapData.spawn.x, mapData.spawn.y, 12);
      this.spawnMarker.lineBetween(mapData.spawn.x - 8, mapData.spawn.y, mapData.spawn.x + 8, mapData.spawn.y);
      this.spawnMarker.lineBetween(mapData.spawn.x, mapData.spawn.y - 8, mapData.spawn.x, mapData.spawn.y + 8);
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
