import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Display a simple loading message
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height / 2, 'Tiny Kingdoms', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 60, 'Loading...', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#888888'
    }).setOrigin(0.5);

    // Short delay then move to preload
    this.time.delayedCall(500, () => {
      this.scene.start('PreloadScene');
    });
  }
}
