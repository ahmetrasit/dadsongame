import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';

// Control Testing: 20x20m map, 1m = 32px (1 tile)
export const TILE_SIZE = 32;
export const MAP_SIZE = 20; // tiles
export const GAME_WIDTH = MAP_SIZE * TILE_SIZE;  // 640px
export const GAME_HEIGHT = MAP_SIZE * TILE_SIZE; // 640px

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#2d5a27',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    }
  },
  scene: [BootScene, MainScene]
};
