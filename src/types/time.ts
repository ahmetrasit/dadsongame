// ==========================================
// Time System
// ==========================================

export interface GameTime {
  day: number;           // Current day (1-120 in a year)
  timeOfDay: number;     // 0-1 (0 = midnight, 0.5 = noon)
  season: Season;
  year: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const DAYS_PER_SEASON = 30;
export const DAYS_PER_YEAR = 120;
