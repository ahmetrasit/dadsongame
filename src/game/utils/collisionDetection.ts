import { Point } from '@/stores/mapEditorStore';
import { smoothPolygon } from './splineUtils';

export interface CollisionMapData {
  rivers: { points: Point[] }[];
  trees: { x: number; y: number }[];
}

/**
 * Checks if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Checks if a position collides with any rivers or trees
 * Returns true if there is a collision
 */
export function checkCollision(x: number, y: number, mapData: CollisionMapData): boolean {
  // Check river collision (point in smoothed polygon)
  for (const river of mapData.rivers) {
    const smoothed = smoothPolygon(river.points);
    if (pointInPolygon({ x, y }, smoothed)) {
      return true;
    }
  }

  // Check tree collision (circle)
  const treeRadius = 12;
  const playerRadius = 8;
  for (const tree of mapData.trees) {
    const dx = x - tree.x;
    const dy = y - tree.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < treeRadius + playerRadius) {
      return true;
    }
  }

  return false;
}
