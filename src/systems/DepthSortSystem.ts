import Phaser from 'phaser';

// Depth layer constants
export const DEPTH_LAYERS = {
  BACKGROUND: 0,
  TERRAIN: 10,
  PATH: 20,
  GRID_CELLS: 30,
  // Dynamic objects use their Y position (typically 200-700)
  TOWERS_BASE: 100,
  ENEMIES_BASE: 100,
  PROJECTILES: 800,
  EFFECTS: 900,
  UI_BACKGROUND: 1000,
  UI_ELEMENTS: 1100,
  UI_TOP: 1200,
  OVERLAY: 2000
};

export class DepthSortSystem {
  private sortableObjects: Phaser.GameObjects.Container[] = [];

  constructor(_scene: Phaser.Scene) {
    // Scene reference available if needed for future features
  }

  public register(object: Phaser.GameObjects.Container): void {
    if (!this.sortableObjects.includes(object)) {
      this.sortableObjects.push(object);
    }
  }

  public unregister(object: Phaser.GameObjects.Container): void {
    const index = this.sortableObjects.indexOf(object);
    if (index > -1) {
      this.sortableObjects.splice(index, 1);
    }
  }

  public update(): void {
    // Remove destroyed objects
    this.sortableObjects = this.sortableObjects.filter(obj => obj.active);

    // Sort by Y position - objects lower on screen render in front
    this.sortableObjects.forEach(obj => {
      // Use Y position as depth, offset by base layer
      // This ensures proper overlapping of units, towers, etc.
      obj.setDepth(DEPTH_LAYERS.TOWERS_BASE + Math.floor(obj.y));
    });
  }

  public clear(): void {
    this.sortableObjects = [];
  }
}
