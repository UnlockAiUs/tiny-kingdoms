import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/game.config';

export interface PathWaypoint {
  x: number;
  y: number;
}

export interface PathSegment {
  start: PathWaypoint;
  end: PathWaypoint;
  direction: 'down' | 'left' | 'right';
}

/**
 * PathSystem - Defines a predetermined L-shaped zigzag path for enemies
 *
 * The path consists of waypoints that enemies follow sequentially.
 * Towers can only be placed adjacent to the path, not on it.
 */
export class PathSystem {
  private waypoints: PathWaypoint[] = [];
  private segments: PathSegment[] = [];
  private pathWidth: number = 32; // Width of the path in pixels (narrow - just enough for enemies)

  constructor() {
    this.generatePath();
  }

  /**
   * Generate simple S-shaped path with only 2 curves
   * Path: down -> right -> down -> left -> down -> exit
   */
  private generatePath(): void {
    const { WIDTH, HEIGHT, TOP_HUD_HEIGHT, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;

    const startY = TOP_HUD_HEIGHT + 20;
    const endY = HEIGHT - BOTTOM_PANEL_HEIGHT - 40;
    const leftMargin = 80;
    const rightMargin = WIDTH - 80;
    const midX = WIDTH / 2;

    // Calculate vertical positions for 2 curves
    // First curve should be lower to not cover top art
    // Second curve should stay above the water (water is ~last 15% of screen)
    const playableHeight = endY - startY;
    const firstCurveY = startY + playableHeight * 0.30; // 30% down (above camp/tent)
    const secondCurveY = startY + playableHeight * 0.50; // 50% down (well above water)
    const exitY = startY + playableHeight * 0.65; // 65% down - exit well above water

    // Start point (top center)
    this.waypoints.push({ x: midX, y: startY });

    // Go down to first curve
    this.waypoints.push({ x: midX, y: firstCurveY });

    // First curve: go right
    this.waypoints.push({ x: rightMargin, y: firstCurveY });

    // Go down to second curve
    this.waypoints.push({ x: rightMargin, y: secondCurveY });

    // Second curve: go left
    this.waypoints.push({ x: leftMargin, y: secondCurveY });

    // Go down toward exit (staying above water)
    this.waypoints.push({ x: leftMargin, y: exitY });

    // Final segment: go to center and exit
    this.waypoints.push({ x: midX, y: exitY });
    this.waypoints.push({ x: midX, y: endY + 100 }); // Exit off screen

    // Build segments from waypoints
    this.buildSegments();
  }

  private buildSegments(): void {
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const start = this.waypoints[i];
      const end = this.waypoints[i + 1];

      let direction: 'down' | 'left' | 'right';
      if (end.y > start.y) {
        direction = 'down';
      } else if (end.x > start.x) {
        direction = 'right';
      } else {
        direction = 'left';
      }

      this.segments.push({ start, end, direction });
    }
  }

  /**
   * Get all waypoints for enemy pathfinding
   */
  public getWaypoints(): PathWaypoint[] {
    return [...this.waypoints];
  }

  /**
   * Get spawn position (first waypoint with slight variance)
   */
  public getSpawnPosition(): PathWaypoint {
    const spawn = this.waypoints[0];
    return {
      x: spawn.x + Phaser.Math.Between(-20, 20),
      y: spawn.y
    };
  }

  /**
   * Get end position (last waypoint)
   */
  public getEndPosition(): PathWaypoint {
    return { ...this.waypoints[this.waypoints.length - 1] };
  }

  /**
   * Check if a position is ON the path (for blocking placement)
   */
  public isOnPath(x: number, y: number, buffer: number = 0): boolean {
    const halfWidth = this.pathWidth / 2 + buffer;

    for (const segment of this.segments) {
      if (this.isPointNearSegment(x, y, segment, halfWidth)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a point is near a path segment
   */
  private isPointNearSegment(
    x: number,
    y: number,
    segment: PathSegment,
    maxDist: number
  ): boolean {
    const { start, end } = segment;

    // Calculate distance to line segment
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Segment is a point
      const dist = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2);
      return dist <= maxDist;
    }

    // Project point onto line segment
    let t = ((x - start.x) * dx + (y - start.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = start.x + t * dx;
    const closestY = start.y + t * dy;
    const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

    return dist <= maxDist;
  }

  /**
   * Check if a position is valid for tower placement
   * Can place anywhere in playable area except ON the path
   */
  public canPlaceTower(x: number, y: number, _towerRadius: number = 30): boolean {
    const { WIDTH, HEIGHT, TOP_HUD_HEIGHT, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;

    // Must be in playable area
    if (x < 30 || x > WIDTH - 30) return false;
    if (y < TOP_HUD_HEIGHT + 30 || y > HEIGHT - BOTTOM_PANEL_HEIGHT - 30) return false;

    // Must NOT be on the path (towers can be placed right at the path edge)
    if (this.isOnPath(x, y, this.pathWidth / 2)) {
      return false;
    }

    return true;
  }

  /**
   * Get path width for rendering
   */
  public getPathWidth(): number {
    return this.pathWidth;
  }

  /**
   * Get all segments for rendering
   */
  public getSegments(): PathSegment[] {
    return [...this.segments];
  }
}
