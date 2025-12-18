import Phaser from 'phaser';

export class HealthBar {
  private width: number;
  private bg: Phaser.GameObjects.Rectangle;
  private fg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 40, height: number = 6) {
    this.width = width;

    // Background (dark red)
    this.bg = scene.add.rectangle(x, y, width, height, 0x8b0000);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setDepth(100);

    // Foreground (green - shows current health)
    this.fg = scene.add.rectangle(x, y, width, height, 0x00ff00);
    this.fg.setOrigin(0.5, 0.5);
    this.fg.setDepth(101);

    // Border
    this.border = scene.add.rectangle(x, y, width + 2, height + 2);
    this.border.setStrokeStyle(1, 0x000000);
    this.border.setOrigin(0.5, 0.5);
    this.border.setDepth(102);
  }

  public updateHealth(current: number, max: number): void {
    const percent = Math.max(0, current / max);
    this.fg.width = this.width * percent;

    // Color changes based on health percentage
    if (percent > 0.6) {
      this.fg.setFillStyle(0x00ff00); // Green
    } else if (percent > 0.3) {
      this.fg.setFillStyle(0xffff00); // Yellow
    } else {
      this.fg.setFillStyle(0xff0000); // Red
    }
  }

  public setPosition(x: number, y: number): void {
    this.bg.setPosition(x, y);
    this.fg.setPosition(x, y);
    this.border.setPosition(x, y);
  }

  public setVisible(visible: boolean): void {
    this.bg.setVisible(visible);
    this.fg.setVisible(visible);
    this.border.setVisible(visible);
  }

  public destroy(): void {
    this.bg.destroy();
    this.fg.destroy();
    this.border.destroy();
  }
}
