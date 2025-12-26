import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff'
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4ade80, 1);
      progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder graphics instead of loading external assets
    this.createPlaceholderGraphics();
  }

  create(): void {
    // Initialize any global game state here
    this.scene.start('MainScene');
  }

  private createPlaceholderGraphics(): void {
    // Player sprite - top-down 3/4 view (20x20px, Factorio-style)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Shadow
    playerGraphics.fillStyle(0x000000, 0.3);
    playerGraphics.fillEllipse(10, 16, 14, 6);
    // Body (blue shirt, viewed from above)
    playerGraphics.fillStyle(0x3b82f6);
    playerGraphics.fillEllipse(10, 10, 12, 10);
    // Head (top of head visible)
    playerGraphics.fillStyle(0xfcd9b6);
    playerGraphics.fillCircle(10, 6, 5);
    // Hair on top
    playerGraphics.fillStyle(0x8b4513);
    playerGraphics.fillCircle(10, 4, 4);
    playerGraphics.generateTexture('player', 20, 20);
    playerGraphics.destroy();

    // Remote player (different color)
    const remoteGraphics = this.make.graphics({ x: 0, y: 0 });
    remoteGraphics.fillStyle(0xef4444); // Red
    remoteGraphics.fillRect(0, 0, 24, 32);
    remoteGraphics.fillStyle(0xfcd34d); // Yellow head
    remoteGraphics.fillRect(4, 2, 16, 12);
    remoteGraphics.generateTexture('remote-player', 24, 32);
    remoteGraphics.destroy();

    // Tile: Grass
    const grassGraphics = this.make.graphics({ x: 0, y: 0 });
    grassGraphics.fillStyle(0x4ade80);
    grassGraphics.fillRect(0, 0, 32, 32);
    // Add some texture
    grassGraphics.fillStyle(0x22c55e);
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 28;
      const y = Math.random() * 28;
      grassGraphics.fillRect(x, y, 4, 4);
    }
    grassGraphics.generateTexture('tile-grass', 32, 32);
    grassGraphics.destroy();

    // Tile: Tree Top (canopy from above - top-down view)
    const treeTopGraphics = this.make.graphics({ x: 0, y: 0 });
    // Shadow under canopy
    treeTopGraphics.fillStyle(0x0f4c2a, 0.5);
    treeTopGraphics.fillCircle(18, 18, 14);
    // Main canopy (circular from above)
    treeTopGraphics.fillStyle(0x166534);
    treeTopGraphics.fillCircle(16, 16, 14);
    // Lighter leaf clusters on top
    treeTopGraphics.fillStyle(0x22c55e);
    treeTopGraphics.fillCircle(12, 12, 6);
    treeTopGraphics.fillCircle(20, 14, 5);
    treeTopGraphics.fillCircle(14, 18, 4);
    treeTopGraphics.generateTexture('tile-tree-top', 32, 32);
    treeTopGraphics.destroy();

    // Tile: Tree Bottom (trunk visible from above, with shadow)
    const treeBottomGraphics = this.make.graphics({ x: 0, y: 0 });
    // Shadow
    treeBottomGraphics.fillStyle(0x000000, 0.3);
    treeBottomGraphics.fillEllipse(18, 24, 16, 8);
    // Trunk (small circle from above)
    treeBottomGraphics.fillStyle(0x854d0e);
    treeBottomGraphics.fillCircle(16, 16, 6);
    treeBottomGraphics.fillStyle(0x6b4c0a);
    treeBottomGraphics.fillCircle(14, 14, 2);
    treeBottomGraphics.generateTexture('tile-tree-bottom', 32, 32);
    treeBottomGraphics.destroy();

    // Tile: Water
    const waterGraphics = this.make.graphics({ x: 0, y: 0 });
    waterGraphics.fillStyle(0x3b82f6);
    waterGraphics.fillRect(0, 0, 32, 32);
    waterGraphics.fillStyle(0x60a5fa);
    waterGraphics.fillRect(4, 8, 24, 4);
    waterGraphics.fillRect(2, 20, 28, 4);
    waterGraphics.generateTexture('tile-water', 32, 32);
    waterGraphics.destroy();

    // Tile: Path
    const pathGraphics = this.make.graphics({ x: 0, y: 0 });
    pathGraphics.fillStyle(0xd4a574);
    pathGraphics.fillRect(0, 0, 32, 32);
    pathGraphics.fillStyle(0xc19a6b);
    pathGraphics.fillRect(4, 4, 8, 8);
    pathGraphics.fillRect(20, 20, 8, 8);
    pathGraphics.generateTexture('tile-path', 32, 32);
    pathGraphics.destroy();

    // Items (simple colored squares)
    this.createItemTexture('item-wood', 0xd97706);
    this.createItemTexture('item-stone', 0x6b7280);
    this.createItemTexture('item-sword', 0xfbbf24);
    this.createItemTexture('item-pickaxe', 0x78716c);
    this.createItemTexture('item-apple', 0xef4444);
  }

  private createItemTexture(key: string, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color);
    graphics.fillRoundedRect(2, 2, 28, 28, 4);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }
}
