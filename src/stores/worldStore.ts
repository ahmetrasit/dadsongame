import { create } from 'zustand';
import type { WorldChunk, BiomeType, Tile } from '@/types';
import { getChunkKey } from '@/services';

// Tile definitions - will be expanded
export const TILE_DEFINITIONS: Record<number, Tile> = {
  0: { id: 0, walkable: true, biome: 'forest', soilType: 'grass' },   // Grass
  1: { id: 1, walkable: false, biome: 'forest', soilType: 'grass' },  // Tree
  2: { id: 2, walkable: true, biome: 'forest', soilType: 'sand' },    // Path
  3: { id: 3, walkable: false, biome: 'beach', soilType: 'sand' },    // Water
  4: { id: 4, walkable: false, biome: 'mountain', soilType: 'rock' }, // Rock
  10: { id: 10, walkable: true, biome: 'plains', soilType: 'grass' }, // Town floor
  11: { id: 11, walkable: false, biome: 'plains', soilType: 'rock' }, // Town wall
};

// Constants
export const CHUNK_SIZE = 16;
export const TILE_SIZE = 32;

interface WorldState {
  chunks: Map<string, WorldChunk>;
  currentBiome: BiomeType;
  time: number;          // 0-24000 (minutes in game day)
  weather: 'clear' | 'rain' | 'snow' | 'storm';
  seed: number;

  // Actions
  initWorld: (seed?: number) => void;
  loadChunk: (chunkX: number, chunkY: number) => WorldChunk;
  getChunk: (chunkX: number, chunkY: number) => WorldChunk | undefined;
  getTile: (worldX: number, worldY: number) => Tile | undefined;
  setTile: (worldX: number, worldY: number, tileId: number) => void;
  isWalkable: (worldX: number, worldY: number) => boolean;
  advanceTime: (deltaMinutes: number) => void;
  setWeather: (weather: WorldState['weather']) => void;
}

// Simple seeded random for deterministic world gen
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Generate a chunk procedurally
function generateChunk(chunkX: number, chunkY: number, seed: number): WorldChunk {
  const random = seededRandom(seed + chunkX * 1000 + chunkY);
  const tiles: number[][] = [];

  for (let y = 0; y < CHUNK_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const r = random();
      let tileId = 0; // Default grass

      // Add some variety
      if (r < 0.05) {
        tileId = 1; // Tree
      } else if (r < 0.08) {
        tileId = 4; // Rock
      } else if (r < 0.1) {
        tileId = 3; // Water
      }

      row.push(tileId);
    }
    tiles.push(row);
  }

  return {
    x: chunkX,
    y: chunkY,
    tiles,
    entities: []
  };
}

export const useWorldStore = create<WorldState>((set, get) => ({
  chunks: new Map(),
  currentBiome: 'forest',
  time: 8 * 60, // Start at 8:00 AM
  weather: 'clear',
  seed: 12345,

  initWorld: (seed = Date.now()) => {
    set({
      chunks: new Map(),
      seed,
      time: 8 * 60,
      weather: 'clear'
    });
  },

  loadChunk: (chunkX, chunkY) => {
    const key = getChunkKey(chunkX, chunkY);
    const existing = get().chunks.get(key);

    if (existing) {
      return existing;
    }

    const chunk = generateChunk(chunkX, chunkY, get().seed);

    set((state) => {
      const newChunks = new Map(state.chunks);
      newChunks.set(key, chunk);
      return { chunks: newChunks };
    });

    return chunk;
  },

  getChunk: (chunkX, chunkY) => {
    const key = getChunkKey(chunkX, chunkY);
    return get().chunks.get(key);
  },

  getTile: (worldX, worldY) => {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = get().getChunk(chunkX, chunkY);
    if (!chunk) return undefined;

    const tileId = chunk.tiles[localY]?.[localX];
    return tileId !== undefined ? TILE_DEFINITIONS[tileId] : undefined;
  },

  setTile: (worldX, worldY, tileId) => {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const key = getChunkKey(chunkX, chunkY);

    set((state) => {
      const chunk = state.chunks.get(key);
      if (!chunk) return state;

      const newTiles = chunk.tiles.map((row, y) =>
        y === localY
          ? row.map((tile, x) => (x === localX ? tileId : tile))
          : row
      );

      const newChunks = new Map(state.chunks);
      newChunks.set(key, { ...chunk, tiles: newTiles });
      return { chunks: newChunks };
    });
  },

  isWalkable: (worldX, worldY) => {
    const tile = get().getTile(worldX, worldY);
    return tile?.walkable ?? true; // Default walkable if tile not loaded
  },

  advanceTime: (deltaMinutes) => {
    set((state) => ({
      time: (state.time + deltaMinutes) % (24 * 60)
    }));
  },

  setWeather: (weather) => {
    set({ weather });
  }
}));

// Selectors
export const useGameTime = () => useWorldStore((s) => s.time);
export const useWeather = () => useWorldStore((s) => s.weather);
export const useCurrentBiome = () => useWorldStore((s) => s.currentBiome);

// Helper to format game time
export function formatGameTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
