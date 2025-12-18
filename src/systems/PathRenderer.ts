import Phaser from 'phaser';
import { PathSystem, PathWaypoint } from './PathSystem';
import { DEPTH_LAYERS } from './DepthSortSystem';

/**
 * PathRenderer - Draws the path with rounded corners
 * Visible cobblestone path that blends with the environment
 */
export class PathRenderer {
  private scene: Phaser.Scene;
  private pathSystem: PathSystem;
  private pathGraphics: Phaser.GameObjects.Graphics;
  private pathTiles: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, pathSystem: PathSystem) {
    this.scene = scene;
    this.pathSystem = pathSystem;

    this.pathGraphics = scene.add.graphics();
    this.pathGraphics.setDepth(DEPTH_LAYERS.TERRAIN + 1);

    this.drawPath();
  }

  private drawPath(): void {
    const waypoints = this.pathSystem.getWaypoints();
    const pathWidth = this.pathSystem.getPathWidth();

    // Draw base path shape with rounded corners
    this.drawPathShape(waypoints, pathWidth);

    // Add texture tiles on top
    this.addPathTiles(waypoints, pathWidth);
  }

  private drawPathShape(waypoints: PathWaypoint[], pathWidth: number): void {
    this.pathGraphics.clear();

    // Path fill - 45% opacity
    this.pathGraphics.fillStyle(0x8B7355, 0.45);
    this.pathGraphics.lineStyle(2, 0x5C4033, 0.5);

    // Draw rounded segments
    for (let i = 0; i < waypoints.length - 1; i++) {
      const current = waypoints[i];
      const next = waypoints[i + 1];

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const isHorizontal = Math.abs(dx) > Math.abs(dy);

      if (isHorizontal) {
        const minX = Math.min(current.x, next.x);
        const maxX = Math.max(current.x, next.x);
        this.pathGraphics.fillRoundedRect(
          minX - pathWidth / 2,
          current.y - pathWidth / 2,
          maxX - minX + pathWidth,
          pathWidth,
          pathWidth / 2
        );
        this.pathGraphics.strokeRoundedRect(
          minX - pathWidth / 2,
          current.y - pathWidth / 2,
          maxX - minX + pathWidth,
          pathWidth,
          pathWidth / 2
        );
      } else {
        const minY = Math.min(current.y, next.y);
        const maxY = Math.max(current.y, next.y);
        this.pathGraphics.fillRoundedRect(
          current.x - pathWidth / 2,
          minY - pathWidth / 2,
          pathWidth,
          maxY - minY + pathWidth,
          pathWidth / 2
        );
        this.pathGraphics.strokeRoundedRect(
          current.x - pathWidth / 2,
          minY - pathWidth / 2,
          pathWidth,
          maxY - minY + pathWidth,
          pathWidth / 2
        );
      }
    }

    // Smooth corners with circles
    for (let i = 1; i < waypoints.length - 1; i++) {
      const point = waypoints[i];
      this.pathGraphics.fillCircle(point.x, point.y, pathWidth / 2);
      this.pathGraphics.strokeCircle(point.x, point.y, pathWidth / 2);
    }
  }

  private addPathTiles(waypoints: PathWaypoint[], pathWidth: number): void {
    if (!this.scene.textures.exists('path_tile')) return;

    const tileSpacing = pathWidth * 1.2;
    const scale = pathWidth / 150;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const current = waypoints[i];
      const next = waypoints[i + 1];

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const numTiles = Math.max(2, Math.ceil(length / tileSpacing));

      for (let j = 0; j < numTiles; j++) {
        const t = numTiles > 1 ? j / (numTiles - 1) : 0.5;
        const x = current.x + dx * t;
        const y = current.y + dy * t;

        const tile = this.scene.add.image(x, y, 'path_tile');
        tile.setScale(scale);
        tile.setDepth(DEPTH_LAYERS.TERRAIN + 2);
        tile.setAlpha(0.4);

        // Rotate for horizontal segments
        if (Math.abs(dx) > Math.abs(dy)) {
          tile.setRotation(Math.PI / 2);
        }

        this.pathTiles.push(tile);
      }
    }

    // Corner tiles
    for (let i = 1; i < waypoints.length - 1; i++) {
      const point = waypoints[i];
      const tile = this.scene.add.image(point.x, point.y, 'path_tile');
      tile.setScale(scale * 1.1);
      tile.setDepth(DEPTH_LAYERS.TERRAIN + 2);
      tile.setAlpha(0.45);
      this.pathTiles.push(tile);
    }
  }

  public destroy(): void {
    this.pathGraphics.destroy();
    this.pathTiles.forEach(tile => tile.destroy());
    this.pathTiles = [];
  }
}
