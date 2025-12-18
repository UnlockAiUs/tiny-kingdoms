import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/game.config';

/**
 * Main Menu - Beautiful fantasy style with cover art
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Cover photo background
    this.createBackground();

    // Ambient particles
    this.createAmbientEffects();

    // Game title
    this.createTitle();

    // Play button
    this.createPlayButton();

    // Version
    this.add.text(WIDTH - 20, HEIGHT - 20, 'v1.0', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#8B7355'
    }).setOrigin(1, 1).setAlpha(0.6);

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createBackground(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Add cover photo
    if (this.textures.exists('cover_photo')) {
      const bg = this.add.image(WIDTH / 2, HEIGHT / 2, 'cover_photo');

      // Scale to cover the screen
      const scaleX = WIDTH / bg.width;
      const scaleY = HEIGHT / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);

      // Slight darkening overlay at top for title readability
      const overlay = this.add.graphics();
      overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
      overlay.fillRect(0, 0, WIDTH, HEIGHT * 0.4);
      overlay.setDepth(1);
    } else {
      // Fallback gradient
      const gfx = this.add.graphics();
      gfx.fillGradientStyle(0x2d5a27, 0x2d5a27, 0x1a3d1a, 0x1a3d1a, 1);
      gfx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  private createAmbientEffects(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Floating dust/magic particles
    for (let i = 0; i < 30; i++) {
      const particle = this.add.graphics();
      const isGold = Math.random() > 0.5;
      const color = isGold ? 0xFFD700 : 0xFFFFFF;
      const size = Phaser.Math.FloatBetween(1, 3);

      particle.fillStyle(color, Phaser.Math.FloatBetween(0.3, 0.7));
      particle.fillCircle(0, 0, size);

      particle.x = Phaser.Math.Between(0, WIDTH);
      particle.y = Phaser.Math.Between(0, HEIGHT);
      particle.setDepth(10);

      // Gentle floating animation
      this.tweens.add({
        targets: particle,
        y: particle.y - Phaser.Math.Between(50, 150),
        x: particle.x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, WIDTH);
          particle.y = HEIGHT + 20;
          particle.alpha = Phaser.Math.FloatBetween(0.3, 0.7);
        }
      });
    }
  }

  private createTitle(): void {
    const { WIDTH } = GAME_CONFIG;
    const titleY = 180;

    // Warm glow behind title
    const glow = this.add.graphics();
    glow.fillStyle(0xFFAA44, 0.2);
    glow.fillEllipse(WIDTH / 2, titleY + 20, 500, 200);
    glow.setDepth(2);

    // Title: "TINY KINGDOMS" - Fantasy style - MUCH larger for mobile
    // Main title with shadow
    this.add.text(WIDTH / 2 + 5, titleY + 5, 'TINY KINGDOMS', {
      fontSize: '82px',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      color: '#000000'
    }).setOrigin(0.5).setAlpha(0.4).setDepth(3);

    const title = this.add.text(WIDTH / 2, titleY, 'TINY KINGDOMS', {
      fontSize: '82px',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      color: '#FFE4B5',
      stroke: '#8B4513',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(4);

    // Subtle breathing animation
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Decorative line under title
    const line = this.add.graphics();
    line.lineStyle(2, 0xD4A574, 0.8);
    line.lineBetween(WIDTH / 2 - 180, titleY + 50, WIDTH / 2 + 180, titleY + 50);
    line.setDepth(4);

    // Subtitle - MUCH larger for mobile with dark stroke for visibility
    // Shadow layer
    this.add.text(WIDTH / 2 + 2, titleY + 112, 'Tower Defense', {
      fontSize: '38px',
      fontFamily: '"Palatino Linotype", "Book Antiqua", serif',
      color: '#000000',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.6).setDepth(3);

    const subtitle = this.add.text(WIDTH / 2, titleY + 110, 'Tower Defense', {
      fontSize: '38px',
      fontFamily: '"Palatino Linotype", "Book Antiqua", serif',
      color: '#FFE4B5',
      fontStyle: 'italic',
      stroke: '#5D3A1A',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setDepth(4);

    this.tweens.add({
      targets: subtitle,
      alpha: 0.9,
      duration: 1500,
      delay: 600
    });
  }

  private createPlayButton(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const btnY = HEIGHT * 0.55;

    const container = this.add.container(WIDTH / 2, btnY);
    container.setDepth(20);

    // Button background - medieval style
    const btnBg = this.add.graphics();

    // Draw ornate button - MUCH larger for mobile
    const drawButton = (hover: boolean) => {
      btnBg.clear();

      const borderColor = hover ? 0xFFD700 : 0xD4A574;
      const innerColor = hover ? 0x4A3728 : 0x3A2718;

      // Outer border - MUCH larger
      btnBg.fillStyle(borderColor, 1);
      btnBg.fillRoundedRect(-180, -55, 360, 110, 12);

      // Inner fill
      btnBg.fillStyle(innerColor, 1);
      btnBg.fillRoundedRect(-172, -47, 344, 94, 10);

      // Highlight at top
      btnBg.fillStyle(0xFFFFFF, 0.1);
      btnBg.fillRoundedRect(-168, -44, 336, 28, { tl: 8, tr: 8, bl: 0, br: 0 });

      // Inner border
      btnBg.lineStyle(3, borderColor, 0.6);
      btnBg.strokeRoundedRect(-165, -40, 330, 80, 6);
    };

    drawButton(false);
    container.add(btnBg);

    // Button text - MUCH larger for mobile
    const btnText = this.add.text(0, 0, 'BEGIN QUEST', {
      fontSize: '44px',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      color: '#FFE4B5'
    }).setOrigin(0.5);
    container.add(btnText);

    // Make interactive - MUCH larger hit area
    container.setSize(360, 110);
    container.setInteractive({ useHandCursor: true });

    // Subtle pulse
    this.tweens.add({
      targets: container,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hover effects
    container.on('pointerover', () => {
      drawButton(true);
      btnText.setColor('#FFFFFF');
      container.setScale(1.08);
    });

    container.on('pointerout', () => {
      drawButton(false);
      btnText.setColor('#FFE4B5');
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      this.startGame();
    });

    // Instructions - MUCH larger for mobile with dark backdrop for visibility
    // Dark banner behind text
    const bannerGfx = this.add.graphics();
    bannerGfx.fillStyle(0x000000, 0.5);
    bannerGfx.fillRoundedRect(WIDTH / 2 - 320, HEIGHT - 125, 640, 50, 8);
    bannerGfx.setDepth(9);

    this.add.text(WIDTH / 2, HEIGHT - 100, 'Defend your kingdom against endless waves', {
      fontSize: '28px',
      fontFamily: '"Palatino Linotype", serif',
      color: '#FFE4B5',
      stroke: '#3A2510',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // Hint - MUCH larger for mobile
    const hint = this.add.text(WIDTH / 2, btnY + 100, '— Tap to start —', {
      fontSize: '26px',
      fontFamily: '"Palatino Linotype", serif',
      color: '#A08060',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: hint,
      alpha: 0.4,
      duration: 1200,
      yoyo: true,
      repeat: -1
    });
  }

  private startGame(): void {
    // Dramatic flash
    this.cameras.main.flash(150, 255, 220, 180, true);

    this.time.delayedCall(150, () => {
      this.cameras.main.fade(500, 0, 0, 0);

      this.time.delayedCall(500, () => {
        this.scene.start('BattleScene', {
          selectedTowers: [
            'ember_watch', 'rockbound_bastion', 'frostcoil_tower',
            'sunflare_cannon', 'ironspike_launcher', 'pyrehold',
            'void_obelisk', 'stone_mortar', 'dread_pyre'
          ]
        });
      });
    });
  }
}
