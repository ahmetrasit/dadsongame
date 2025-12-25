import Phaser from 'phaser';
import { usePlayerStore } from '@/stores/playerStore';
import { useWorldStore, CHUNK_SIZE, TILE_SIZE } from '@/stores/worldStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import type { RemotePlayer } from '@/types';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // Remote player sprites
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // World rendering
  private tileSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private loadedChunks: Set<string> = new Set();

  // Movement
  private readonly MOVE_SPEED = 160;

  // Sync timer
  private syncTimer = 0;
  private readonly SYNC_INTERVAL = 50; // ms

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    // Initialize stores
    const playerStore = usePlayerStore.getState();
    const worldStore = useWorldStore.getState();
    const multiplayerStore = useMultiplayerStore.getState();

    // Initialize player if not already
    if (!playerStore.isInitialized) {
      playerStore.initPlayer('Dad');
    }

    // Initialize world
    worldStore.initWorld();

    // Create player sprite
    this.player = this.add.sprite(300, 300, 'player');
    this.player.setDepth(10);

    // Set up camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // Inventory toggle
    this.input.keyboard!.on('keydown-I', () => {
      useInventoryStore.getState().toggleInventory();
    });

    // Number keys for hotbar
    for (let i = 1; i <= 9; i++) {
      this.input.keyboard!.on(`keydown-${i}`, () => {
        useInventoryStore.getState().selectSlot(i - 1);
      });
    }
    this.input.keyboard!.on('keydown-ZERO', () => {
      useInventoryStore.getState().selectSlot(9);
    });

    // Mouse wheel for slot selection
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (deltaY > 0) {
        useInventoryStore.getState().selectNextSlot();
      } else {
        useInventoryStore.getState().selectPrevSlot();
      }
    });

    // Connect to multiplayer (mock for now)
    const playerName = playerStore.player?.name || 'Player';
    multiplayerStore.connect('test-room', playerName);

    // Initial chunk load
    this.updateVisibleChunks();

    // Give player some starter items
    const inventoryStore = useInventoryStore.getState();
    inventoryStore.addItem('sword', 1);
    inventoryStore.addItem('pickaxe', 1);
    inventoryStore.addItem('wood', 10);
    inventoryStore.addItem('apple', 5);
  }

  update(_time: number, delta: number): void {
    this.handlePlayerMovement(delta);
    this.updateVisibleChunks();
    this.updateRemotePlayers();
    this.syncPlayerState(delta);
  }

  private handlePlayerMovement(delta: number): void {
    let vx = 0;
    let vy = 0;

    // Check input
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = 1;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -1;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = 1;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const factor = 0.7071; // 1/sqrt(2)
      vx *= factor;
      vy *= factor;
    }

    // Apply movement
    const speed = this.MOVE_SPEED * (delta / 1000);
    const newX = this.player.x + vx * speed;
    const newY = this.player.y + vy * speed;

    // Check collision with tiles
    const worldStore = useWorldStore.getState();
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);

    if (worldStore.isWalkable(tileX, tileY)) {
      this.player.x = newX;
      this.player.y = newY;
    }

    // Update player store
    const playerStore = usePlayerStore.getState();
    const facing = this.getFacing(vx, vy);
    const state = vx !== 0 || vy !== 0 ? 'walking' : 'idle';

    playerStore.updatePlayer({
      position: { x: this.player.x, y: this.player.y },
      velocity: { x: vx * this.MOVE_SPEED, y: vy * this.MOVE_SPEED },
      facing,
      state
    });
  }

  private getFacing(vx: number, vy: number): 'left' | 'right' | 'up' | 'down' {
    if (vx === 0 && vy === 0) {
      // Keep current facing
      return usePlayerStore.getState().player?.facing || 'down';
    }

    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left';
    }
    return vy > 0 ? 'down' : 'up';
  }

  private updateVisibleChunks(): void {
    const worldStore = useWorldStore.getState();
    const camera = this.cameras.main;

    // Calculate visible chunk range
    const startChunkX = Math.floor((camera.scrollX - camera.width) / (CHUNK_SIZE * TILE_SIZE)) - 1;
    const endChunkX = Math.floor((camera.scrollX + camera.width * 2) / (CHUNK_SIZE * TILE_SIZE)) + 1;
    const startChunkY = Math.floor((camera.scrollY - camera.height) / (CHUNK_SIZE * TILE_SIZE)) - 1;
    const endChunkY = Math.floor((camera.scrollY + camera.height * 2) / (CHUNK_SIZE * TILE_SIZE)) + 1;

    // Load and render visible chunks
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`;

        if (!this.loadedChunks.has(chunkKey)) {
          const chunk = worldStore.loadChunk(chunkX, chunkY);
          this.renderChunk(chunk);
          this.loadedChunks.add(chunkKey);
        }
      }
    }
  }

  private renderChunk(chunk: { x: number; y: number; tiles: number[][] }): void {
    const tileTextures: Record<number, string> = {
      0: 'tile-grass',
      1: 'tile-tree',
      2: 'tile-path',
      3: 'tile-water',
      4: 'tile-rock'
    };

    for (let y = 0; y < chunk.tiles.length; y++) {
      for (let x = 0; x < chunk.tiles[y].length; x++) {
        const tileId = chunk.tiles[y][x];
        const worldX = chunk.x * CHUNK_SIZE * TILE_SIZE + x * TILE_SIZE;
        const worldY = chunk.y * CHUNK_SIZE * TILE_SIZE + y * TILE_SIZE;

        const textureKey = tileTextures[tileId] || 'tile-grass';
        const sprite = this.add.sprite(worldX + TILE_SIZE / 2, worldY + TILE_SIZE / 2, textureKey);
        sprite.setDepth(0);

        const key = `${chunk.x},${chunk.y},${x},${y}`;
        this.tileSprites.set(key, sprite);
      }
    }
  }

  private updateRemotePlayers(): void {
    const multiplayerStore = useMultiplayerStore.getState();
    const remotePlayers = multiplayerStore.remotePlayers;

    // Add/update remote player sprites
    remotePlayers.forEach((player: RemotePlayer, id: string) => {
      let sprite = this.remotePlayers.get(id);

      if (!sprite) {
        // Create new sprite for this player
        sprite = this.add.sprite(player.position.x, player.position.y, 'remote-player');
        sprite.setDepth(9);

        // Add name label
        const nameLabel = this.add.text(0, -20, player.name, {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { x: 4, y: 2 }
        });
        nameLabel.setOrigin(0.5, 0.5);
        sprite.setData('nameLabel', nameLabel);

        this.remotePlayers.set(id, sprite);
      }

      // Update position (with interpolation)
      sprite.x = Phaser.Math.Linear(sprite.x, player.position.x, 0.2);
      sprite.y = Phaser.Math.Linear(sprite.y, player.position.y, 0.2);

      // Update name label position
      const nameLabel = sprite.getData('nameLabel') as Phaser.GameObjects.Text;
      if (nameLabel) {
        nameLabel.x = sprite.x;
        nameLabel.y = sprite.y - 24;
      }
    });

    // Remove sprites for disconnected players
    this.remotePlayers.forEach((sprite, id) => {
      if (!remotePlayers.has(id)) {
        const nameLabel = sprite.getData('nameLabel') as Phaser.GameObjects.Text;
        if (nameLabel) nameLabel.destroy();
        sprite.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  private syncPlayerState(delta: number): void {
    this.syncTimer += delta;

    if (this.syncTimer >= this.SYNC_INTERVAL) {
      this.syncTimer = 0;

      const playerStore = usePlayerStore.getState();
      const player = playerStore.player;

      if (player) {
        const multiplayerStore = useMultiplayerStore.getState();
        multiplayerStore.broadcastPosition(
          player.position.x,
          player.position.y,
          player.velocity.x,
          player.velocity.y,
          player.facing,
          player.state
        );
      }
    }
  }
}
