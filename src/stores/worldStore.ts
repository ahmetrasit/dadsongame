import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorldChunk, BiomeType, Tile } from '@/types';
import { getChunkKey } from '@/services';
import type { Season } from '@/stores/definitions';

// Time constants
export const MINUTES_PER_DAY = 24 * 60;  // 1440 minutes
export const DAYS_PER_SEASON = 30;
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length;  // 120 days

// Spoilage durations in days
export const SPOILAGE_DAYS: Record<string, number> = {
  fast: 14,
  medium: 30,
  slow: 120,
  never: Infinity,
};

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

// Event callbacks for time changes
type TimeEventCallback = () => void;
type SeasonEventCallback = (newSeason: Season, oldSeason: Season) => void;

interface WorldState {
  chunks: Map<string, WorldChunk>;
  currentBiome: BiomeType;
  time: number;          // 0-1440 (minutes in game day)
  day: number;           // Current day (1-based, continuous)
  season: Season;        // Current season
  year: number;          // Current year (1-based)
  weather: 'clear' | 'rain' | 'snow' | 'storm';
  seed: number;

  // Event subscribers
  onDayChangeCallbacks: TimeEventCallback[];
  onSeasonChangeCallbacks: SeasonEventCallback[];

  // Actions
  initWorld: (seed?: number) => void;
  loadChunk: (chunkX: number, chunkY: number) => WorldChunk;
  getChunk: (chunkX: number, chunkY: number) => WorldChunk | undefined;
  getTile: (worldX: number, worldY: number) => Tile | undefined;
  setTile: (worldX: number, worldY: number, tileId: number) => void;
  isWalkable: (worldX: number, worldY: number) => boolean;
  advanceTime: (deltaMinutes: number) => void;
  setWeather: (weather: WorldState['weather']) => void;

  // Time helpers
  getSeason: () => Season;
  getDayOfSeason: () => number;  // 1-30
  getSeasonProgress: () => number;  // 0-1
  isSeasonEnd: () => boolean;

  // Event subscriptions
  onDayChange: (callback: TimeEventCallback) => () => void;
  onSeasonChange: (callback: SeasonEventCallback) => () => void;
}

// Helper to calculate season from day
function calculateSeason(day: number): Season {
  const dayOfYear = ((day - 1) % DAYS_PER_YEAR) + 1;  // 1-120
  const seasonIndex = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON);
  return SEASONS[seasonIndex];
}

// Helper to calculate year from day
function calculateYear(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_YEAR) + 1;
}

// Helper to get day within current season (1-30)
function calculateDayOfSeason(day: number): number {
  const dayOfYear = ((day - 1) % DAYS_PER_YEAR) + 1;
  return ((dayOfYear - 1) % DAYS_PER_SEASON) + 1;
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

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
  chunks: new Map(),
  currentBiome: 'forest',
  time: 8 * 60, // Start at 8:00 AM
  day: 1,       // Start at day 1
  season: 'spring',
  year: 1,
  weather: 'clear',
  seed: 12345,
  onDayChangeCallbacks: [],
  onSeasonChangeCallbacks: [],

  initWorld: (seed = Date.now()) => {
    set({
      chunks: new Map(),
      seed,
      time: 8 * 60,
      day: 1,
      season: 'spring',
      year: 1,
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
    const state = get();
    const newTime = state.time + deltaMinutes;
    const daysPassed = Math.floor(newTime / MINUTES_PER_DAY);
    const remainingTime = newTime % MINUTES_PER_DAY;

    if (daysPassed > 0) {
      const oldSeason = state.season;
      const newDay = state.day + daysPassed;
      const newSeason = calculateSeason(newDay);
      const newYear = calculateYear(newDay);

      set({
        time: remainingTime,
        day: newDay,
        season: newSeason,
        year: newYear,
      });

      // Trigger day change callbacks
      state.onDayChangeCallbacks.forEach(cb => cb());

      // Trigger season change callbacks if season changed
      if (newSeason !== oldSeason) {
        state.onSeasonChangeCallbacks.forEach(cb => cb(newSeason, oldSeason));
      }
    } else {
      set({ time: remainingTime });
    }
  },

  setWeather: (weather) => {
    set({ weather });
  },

  // Time helpers
  getSeason: () => get().season,

  getDayOfSeason: () => calculateDayOfSeason(get().day),

  getSeasonProgress: () => {
    const dayOfSeason = calculateDayOfSeason(get().day);
    return dayOfSeason / DAYS_PER_SEASON;
  },

  isSeasonEnd: () => {
    return calculateDayOfSeason(get().day) === DAYS_PER_SEASON;
  },

  // Event subscriptions
  onDayChange: (callback) => {
    set((state) => ({
      onDayChangeCallbacks: [...state.onDayChangeCallbacks, callback]
    }));
    // Return unsubscribe function
    return () => {
      set((state) => ({
        onDayChangeCallbacks: state.onDayChangeCallbacks.filter(cb => cb !== callback)
      }));
    };
  },

  onSeasonChange: (callback) => {
    set((state) => ({
      onSeasonChangeCallbacks: [...state.onSeasonChangeCallbacks, callback]
    }));
    // Return unsubscribe function
    return () => {
      set((state) => ({
        onSeasonChangeCallbacks: state.onSeasonChangeCallbacks.filter(cb => cb !== callback)
      }));
    };
  },
    }),
    {
      name: 'world-storage',
      partialize: (state) => ({
        time: state.time,
        day: state.day,
        season: state.season,
        year: state.year,
        weather: state.weather,
        seed: state.seed,
      }),
    }
  )
);

// Selectors
export const useGameTime = () => useWorldStore((s) => s.time);
export const useGameDay = () => useWorldStore((s) => s.day);
export const useGameSeason = () => useWorldStore((s) => s.season);
export const useGameYear = () => useWorldStore((s) => s.year);
export const useWeather = () => useWorldStore((s) => s.weather);
export const useCurrentBiome = () => useWorldStore((s) => s.currentBiome);

// Helper to format game time
export function formatGameTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
