import { Point } from '@/stores/mapEditorStore';

/**
 * Catmull-Rom spline interpolation for a single point
 * Used to create smooth curves through control points
 */
export function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return { x, y };
}

/**
 * Smooths a polygon using Catmull-Rom spline interpolation
 * Creates a closed smooth curve through all points
 */
export function smoothPolygon(points: Point[], segments: number = 10): Point[] {
  if (points.length < 3) return points;

  const smoothed: Point[] = [];

  // For closed polygon, we need to wrap around
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    // Generate points along the spline segment
    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const point = catmullRom(p0, p1, p2, p3, s);
      smoothed.push(point);
    }
  }

  return smoothed;
}
