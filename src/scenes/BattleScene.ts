import Phaser from 'phaser';
import { GAME_CONFIG, Difficulty, DIFFICULTY_CONFIG } from '../config/game.config';
import { TOWER_CONFIGS } from '../config/towers.config';
import { PathSystem } from '../systems/PathSystem';
import { PathRenderer } from '../systems/PathRenderer';
import { WaveSystemV2 } from '../systems/WaveSystemV2';
import { DepthSortSystem, DEPTH_LAYERS } from '../systems/DepthSortSystem';
import { Tower } from '../entities/Tower';
import { EnemyUnit } from '../entities/EnemyUnit';
import { TowerPanel } from '../ui/TowerPanel';
import { InfoModal } from '../ui/InfoModal';
import { TowerActionPanel } from '../ui/TowerActionPanel';
import { Projectile } from '../entities/Projectile';
import { ParticleEffects } from '../systems/ParticleEffects';

/**
 * BattleScene V2 - With predetermined path and path-adjacent tower placement
 *
 * Features:
 * - Cobblestone path that enemies follow
 * - Towers can only be placed adjacent to the path
 * - Leader/follower enemy AI
 */
export class BattleScene extends Phaser.Scene {
  private pathSystem!: PathSystem;
  private pathRenderer!: PathRenderer;
  private waveSystem!: WaveSystemV2;
  private depthSortSystem!: DepthSortSystem;

  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];

  private towerPanel!: TowerPanel;
  private infoModal!: InfoModal;
  private towerActionPanel!: TowerActionPanel;
  private selectedTower: Tower | null = null;

  private gold: number = GAME_CONFIG.STARTING_GOLD;
  private lives: number = 20;
  private currentWave: number = 0;

  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private isPaused: boolean = false; // Game runs immediately
  private gameSpeed: number = 1;
  private gameTime: number = 0; // Scaled time for game logic (affected by speed multiplier)
  private speedButton!: Phaser.GameObjects.Container;
  private speedButtonText!: Phaser.GameObjects.Text;
  private speedButtonBg!: Phaser.GameObjects.Graphics;
  private hasGameStarted: boolean = false;

  // Drag state for free-form placement
  private isDragging: boolean = false;
  private placementZoneGraphics!: Phaser.GameObjects.Graphics;
  private rangePreview!: Phaser.GameObjects.Graphics;

  // Tower tracking
  private towerIdCounter: number = 0;

  private availableTowers: string[] = [];
  private difficulty: Difficulty = Difficulty.EASY;
  private difficultyModal: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { selectedTowers?: string[]; difficulty?: Difficulty }): void {
    this.gold = GAME_CONFIG.STARTING_GOLD;
    this.lives = 20;
    this.currentWave = 0;
    this.gameOver = false;
    this.isPaused = false; // Game runs immediately
    this.hasGameStarted = false;
    this.gameSpeed = 1;
    this.gameTime = 0;
    this.towers = [];
    this.projectiles = [];
    this.isDragging = false;
    this.towerIdCounter = 0;
    this.selectedTower = null;

    this.availableTowers = data.selectedTowers || [
      'ember_watch', 'rockbound_bastion', 'frostcoil_tower',
      'sunflare_cannon', 'ironspike_launcher', 'pyrehold',
      'void_obelisk', 'stone_mortar', 'dread_pyre'
    ];

    // Set difficulty from data, or show selection modal if not provided
    if (data.difficulty !== undefined) {
      this.difficulty = data.difficulty;
      this.needsDifficultySelection = false;
    } else {
      // Will show difficulty selection modal
      this.difficulty = Difficulty.EASY; // Default, will be overridden by modal
      this.needsDifficultySelection = true;
    }
  }

  // Track if we need to show difficulty selection
  private needsDifficultySelection: boolean = true;
  private difficultyIndicator!: Phaser.GameObjects.Text;

  create(): void {
    // Create canvas background (the beautiful pre-rendered map)
    this.createCanvasBackground();

    // Initialize path system (predetermined waypoint path)
    this.pathSystem = new PathSystem();

    // Render the cobblestone path
    this.pathRenderer = new PathRenderer(this, this.pathSystem);

    // Initialize systems
    this.depthSortSystem = new DepthSortSystem(this);

    // Wave system with leader/follower AI - apply difficulty multipliers
    const diffConfig = DIFFICULTY_CONFIG[this.difficulty];
    this.waveSystem = new WaveSystemV2(this, {
      pathSystem: this.pathSystem,
      rewardMultiplier: diffConfig.rewardMultiplier,
      healthMultiplier: diffConfig.healthMultiplier
    });

    // Create placement zone visualization (hidden until dragging)
    this.placementZoneGraphics = this.add.graphics();
    this.placementZoneGraphics.setDepth(DEPTH_LAYERS.UI_BACKGROUND);
    this.placementZoneGraphics.setVisible(false);

    // Range preview for tower placement
    this.rangePreview = this.add.graphics();
    this.rangePreview.setDepth(DEPTH_LAYERS.UI_BACKGROUND + 1);
    this.rangePreview.setVisible(false);

    // Create UI
    this.createTopHUD();

    // Create tower panel with drag handlers
    this.towerPanel = new TowerPanel(this, {
      availableTowers: this.availableTowers,
      onTowerDragStart: (towerId, pointer) => this.onTowerDragStart(towerId, pointer),
      onTowerDragMove: (towerId, x, y) => this.onTowerDragMove(towerId, x, y),
      onTowerDragEnd: (towerId, x, y) => this.onTowerDragEnd(towerId, x, y)
    });
    this.towerPanel.updateGold(this.gold);

    // Create info modal (hidden by default)
    this.infoModal = new InfoModal(this);

    // Create tower action panel (hidden by default)
    this.towerActionPanel = new TowerActionPanel(this);

    // Set up event listeners
    this.setupEventListeners();

    // Click on background to deselect tower
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleBackgroundClick(pointer);
    });

    // Create player base area (no castle)
    this.createPlayerBase();

    // Entrance animation
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Start the game (first wave after 10 seconds)
    this.createStartIndicator();
  }

  private createCanvasBackground(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Check if canvas texture exists
    if (this.textures.exists('canvas_forest')) {
      // Add the pre-rendered canvas background
      const bg = this.add.image(WIDTH / 2, HEIGHT / 2, 'canvas_forest');

      // Scale to fit the game dimensions
      const scaleX = WIDTH / bg.width;
      const scaleY = HEIGHT / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);

      bg.setDepth(DEPTH_LAYERS.TERRAIN);
    } else {
      // Fallback: create a simple gradient background
      const gfx = this.add.graphics();
      gfx.fillGradientStyle(0x2d5a27, 0x2d5a27, 0x1a3d1a, 0x1a3d1a, 1);
      gfx.fillRect(0, 0, WIDTH, HEIGHT);
      gfx.setDepth(DEPTH_LAYERS.TERRAIN);
    }
  }

  private drawPlacementZones(): void {
    this.placementZoneGraphics.clear();

    // Highlight the path (enemies walk here, no towers allowed)
    const segments = this.pathSystem.getSegments();
    const pathWidth = this.pathSystem.getPathWidth();

    this.placementZoneGraphics.fillStyle(0xFF4444, 0.15);
    for (const segment of segments) {
      const { start, end, direction } = segment;
      const halfWidth = pathWidth / 2 + 10; // Buffer zone

      if (direction === 'down') {
        const minY = Math.min(start.y, end.y) - halfWidth;
        const maxY = Math.max(start.y, end.y) + halfWidth;
        this.placementZoneGraphics.fillRect(start.x - halfWidth, minY, pathWidth + 20, maxY - minY);
      } else {
        const minX = Math.min(start.x, end.x) - halfWidth;
        const maxX = Math.max(start.x, end.x) + halfWidth;
        this.placementZoneGraphics.fillRect(minX, start.y - halfWidth, maxX - minX, pathWidth + 20);
      }
    }

    // Draw existing tower positions (can't overlap)
    this.placementZoneGraphics.fillStyle(0x4444FF, 0.2);
    this.placementZoneGraphics.lineStyle(2, 0x4444FF, 0.4);
    for (const tower of this.towers) {
      this.placementZoneGraphics.strokeCircle(tower.x, tower.y, 35);
    }
  }

  private createTopHUD(): void {
    const { WIDTH } = GAME_CONFIG;

    const hudContainer = this.add.container(0, 0);
    hudContainer.setDepth(DEPTH_LAYERS.UI_ELEMENTS);

    // Clean fantasy header bar - matching TowerActionPanel style
    const topBg = this.add.graphics();
    // Shadow
    topBg.fillStyle(0x000000, 0.3);
    topBg.fillRoundedRect(13, 13, WIDTH - 16, 120, 14);
    // Outer wood frame
    topBg.fillStyle(0x5D3A1A, 1);
    topBg.fillRoundedRect(8, 8, WIDTH - 16, 120, 14);
    // Inner wood
    topBg.fillStyle(0x8B5A2B, 1);
    topBg.fillRoundedRect(13, 13, WIDTH - 26, 110, 12);
    // Parchment center
    topBg.fillStyle(0xF5E6C8, 1);
    topBg.fillRoundedRect(18, 18, WIDTH - 36, 100, 10);
    // Gold trim
    topBg.lineStyle(2, 0xC9A227, 0.6);
    topBg.strokeRoundedRect(17, 17, WIDTH - 34, 102, 11);
    hudContainer.add(topBg);

    // LEFT SECTION: Gold and Lives - clean labels
    // Gold label
    const goldLabel = this.add.text(35, 42, 'GOLD', {
      fontSize: '14px',
      fontFamily: '"Cinzel", serif',
      color: '#8B5A2B'
    }).setOrigin(0, 0.5);
    hudContainer.add(goldLabel);

    this.goldText = this.add.text(35, 68, `${this.gold}`, {
      fontSize: '34px',
      fontFamily: '"Cinzel", serif',
      color: '#C9A227',
      fontStyle: 'bold',
      stroke: '#5D3A1A',
      strokeThickness: 2
    }).setOrigin(0, 0.5);
    hudContainer.add(this.goldText);

    // Vertical divider
    const divider1 = this.add.graphics();
    divider1.lineStyle(2, 0xC9A227, 0.4);
    divider1.lineBetween(160, 30, 160, 106);
    hudContainer.add(divider1);

    // Lives label
    const livesLabel = this.add.text(180, 42, 'LIVES', {
      fontSize: '14px',
      fontFamily: '"Cinzel", serif',
      color: '#8B5A2B'
    }).setOrigin(0, 0.5);
    hudContainer.add(livesLabel);

    this.livesText = this.add.text(180, 68, `${this.lives}`, {
      fontSize: '34px',
      fontFamily: '"Cinzel", serif',
      color: '#B71C1C',
      fontStyle: 'bold',
      stroke: '#3D2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5);
    hudContainer.add(this.livesText);

    // CENTER SECTION: Wave display
    const centerX = WIDTH / 2;

    this.waveText = this.add.text(centerX, 48, 'WAVE 0', {
      fontSize: '26px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold',
      stroke: '#F5E6C8',
      strokeThickness: 1
    }).setOrigin(0.5, 0.5);
    hudContainer.add(this.waveText);

    // Enemy count - smaller, below wave
    this.enemyCountText = this.add.text(centerX, 82, 'ENEMIES: 0', {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#5D3A1A'
    }).setOrigin(0.5, 0.5);
    hudContainer.add(this.enemyCountText);

    // Difficulty indicator - small badge under enemy count
    const diffConfig = DIFFICULTY_CONFIG[this.difficulty];
    this.difficultyIndicator = this.add.text(centerX, 102, diffConfig.name.toUpperCase(), {
      fontSize: '12px',
      fontFamily: '"Cinzel", serif',
      color: `#${diffConfig.color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      stroke: '#3D2817',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);
    hudContainer.add(this.difficultyIndicator);

    // RIGHT SECTION: Info, Speed, Play, Reset buttons (left to right)
    // Layout from right edge: [Play 56] [gap 10] [Reset 56] [gap 10] [Speed 70] [gap 10] [Info 56] [margin 20]
    this.createInfoButton(hudContainer, WIDTH - 263, 68);
    this.createSpeedButton(hudContainer, WIDTH - 192, 68);
    this.createResetButton(hudContainer, WIDTH - 121, 68);
    this.createPauseButton(hudContainer, WIDTH - 55, 68);

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ONE', () => this.setGameSpeed(1));
    this.input.keyboard?.on('keydown-TWO', () => this.setGameSpeed(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.setGameSpeed(4));
  }

  private createSpeedButton(container: Phaser.GameObjects.Container, x: number, y: number): void {
    this.speedButton = this.add.container(x, y);
    const width = 70;
    const height = 56;

    this.speedButtonBg = this.add.graphics();
    this.drawSpeedButtonBg(false);
    this.speedButton.add(this.speedButtonBg);

    this.speedButtonText = this.add.text(0, 0, '1X', {
      fontSize: '24px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.speedButton.add(this.speedButtonText);

    this.speedButton.setSize(width, height);
    this.speedButton.setInteractive({ useHandCursor: true });

    this.speedButton.on('pointerover', () => this.drawSpeedButtonBg(true));
    this.speedButton.on('pointerout', () => this.drawSpeedButtonBg(false));
    this.speedButton.on('pointerdown', () => this.cycleGameSpeed());

    container.add(this.speedButton);
  }

  private drawSpeedButtonBg(hover: boolean): void {
    const width = 70;
    const height = 56;
    this.speedButtonBg.clear();

    if (hover) {
      // Hover - gold highlight
      this.speedButtonBg.fillStyle(0xC9A227, 1);
      this.speedButtonBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      this.speedButtonBg.fillStyle(0xFFD700, 1);
      this.speedButtonBg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
      this.speedButtonBg.lineStyle(2, 0x8B5A2B, 1);
    } else {
      // Normal - wood button
      this.speedButtonBg.fillStyle(0x8B5A2B, 1);
      this.speedButtonBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      this.speedButtonBg.fillStyle(0xA67C52, 1);
      this.speedButtonBg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
      this.speedButtonBg.lineStyle(2, 0x5D3A1A, 1);
    }
    this.speedButtonBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  }

  private cycleGameSpeed(): void {
    // Cycle: 1x -> 2x -> 4x -> 1x
    const speeds = [1, 2, 4];
    const currentIndex = speeds.indexOf(this.gameSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.setGameSpeed(speeds[nextIndex]);
  }

  private setGameSpeed(speed: number): void {
    const oldSpeed = this.gameSpeed;
    this.gameSpeed = speed;

    // Update button text
    this.speedButtonText.setText(`${speed}X`);

    // Quick pulse animation on change
    this.tweens.add({
      targets: this.speedButton,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Power2'
    });

    // Adjust wave delay timer if one is active
    if (this.waveDelayTimer && !this.waveDelayTimer.hasDispatched) {
      // Calculate how much real time has elapsed
      const elapsed = this.time.now - this.waveDelayStartTime;
      // Convert to base time (how much of the 10 seconds passed at old speed)
      const baseTimeElapsed = elapsed * oldSpeed;
      // Calculate remaining base time
      const baseTimeRemaining = this.WAVE_DELAY_BASE - baseTimeElapsed;

      if (baseTimeRemaining > 0) {
        // Cancel current timer and create new one with adjusted remaining time
        this.waveDelayTimer.destroy();
        const newDelay = baseTimeRemaining / speed;

        this.waveDelayTimer = this.time.delayedCall(newDelay, () => {
          if (!this.gameOver) {
            this.startNextWave();
          }
        });
        this.waveDelayStartTime = this.time.now - (baseTimeElapsed / speed);
      }
    }
  }

  private pauseButtonIcon!: Phaser.GameObjects.Graphics;
  private pauseButtonBg!: Phaser.GameObjects.Graphics;

  private createInfoButton(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const infoBtn = this.add.container(x, y);
    const size = 56;

    const bg = this.add.graphics();
    this.drawInfoButtonBg(bg, size, false);
    infoBtn.add(bg);

    // Draw a clean book icon
    const iconGfx = this.add.graphics();
    this.drawBookIcon(iconGfx);
    infoBtn.add(iconGfx);

    infoBtn.setSize(size, size);
    infoBtn.setInteractive({ useHandCursor: true });

    infoBtn.on('pointerover', () => this.drawInfoButtonBg(bg, size, true));
    infoBtn.on('pointerout', () => this.drawInfoButtonBg(bg, size, false));
    infoBtn.on('pointerdown', () => {
      this.infoModal.toggle();
      this.updateTowerPanelBlocking();
    });

    container.add(infoBtn);
  }

  private drawInfoButtonBg(bg: Phaser.GameObjects.Graphics, size: number, hover: boolean): void {
    bg.clear();
    if (hover) {
      bg.fillStyle(0xC9A227, 1);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.fillStyle(0xFFD700, 1);
      bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
      bg.lineStyle(2, 0x8B5A2B, 1);
    } else {
      bg.fillStyle(0x8B5A2B, 1);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.fillStyle(0xA67C52, 1);
      bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
      bg.lineStyle(2, 0x5D3A1A, 1);
    }
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
  }

  private drawBookIcon(gfx: Phaser.GameObjects.Graphics): void {
    // Simple book shape
    gfx.fillStyle(0x5D3A1A, 1);
    // Book cover
    gfx.fillRoundedRect(-12, -14, 24, 28, 2);
    // Pages (lighter)
    gfx.fillStyle(0xF5E6C8, 1);
    gfx.fillRect(-10, -12, 20, 24);
    // Spine line
    gfx.lineStyle(2, 0x5D3A1A, 1);
    gfx.lineBetween(0, -12, 0, 12);
    // Page lines
    gfx.lineStyle(1, 0xC9A227, 0.5);
    gfx.lineBetween(-7, -6, -2, -6);
    gfx.lineBetween(-7, 0, -2, 0);
    gfx.lineBetween(-7, 6, -2, 6);
    gfx.lineBetween(2, -6, 7, -6);
    gfx.lineBetween(2, 0, 7, 0);
    gfx.lineBetween(2, 6, 7, 6);
  }

  private createPauseButton(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const pauseBtn = this.add.container(x, y);
    const size = 56;

    this.pauseButtonBg = this.add.graphics();
    this.drawPauseButtonBg(false);
    pauseBtn.add(this.pauseButtonBg);

    // Draw pause/play icon
    this.pauseButtonIcon = this.add.graphics();
    this.drawPausePlayIcon(false);
    pauseBtn.add(this.pauseButtonIcon);

    pauseBtn.setSize(size, size);
    pauseBtn.setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerover', () => this.drawPauseButtonBg(true));
    pauseBtn.on('pointerout', () => this.drawPauseButtonBg(false));
    pauseBtn.on('pointerdown', () => this.togglePause());

    container.add(pauseBtn);
  }

  private drawPausePlayIcon(isPaused: boolean): void {
    this.pauseButtonIcon.clear();

    // Always white for contrast on green button
    this.pauseButtonIcon.fillStyle(0xFFFFFF, 1);

    if (isPaused) {
      // Play triangle
      this.pauseButtonIcon.fillTriangle(-8, -12, -8, 12, 14, 0);
    } else {
      // Pause bars
      this.pauseButtonIcon.fillRect(-10, -12, 7, 24);
      this.pauseButtonIcon.fillRect(3, -12, 7, 24);
    }
  }

  private drawPauseButtonBg(hover: boolean): void {
    const size = 56;
    this.pauseButtonBg.clear();

    // Always green - this is the primary action button (distinguishes from info button)
    if (hover) {
      this.pauseButtonBg.fillStyle(0x4CAF50, 1);
      this.pauseButtonBg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      this.pauseButtonBg.fillStyle(0x66BB6A, 1);
      this.pauseButtonBg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
    } else {
      this.pauseButtonBg.fillStyle(0x388E3C, 1);
      this.pauseButtonBg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      this.pauseButtonBg.fillStyle(0x4CAF50, 1);
      this.pauseButtonBg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
    }
    this.pauseButtonBg.lineStyle(2, 0x2E7D32, 1);
    this.pauseButtonBg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
  }

  private createResetButton(container: Phaser.GameObjects.Container, x: number, y: number): void {
    const resetBtn = this.add.container(x, y);
    const size = 56;

    const bg = this.add.graphics();
    this.drawResetButtonBg(bg, size, false);
    resetBtn.add(bg);

    // Draw reset/refresh icon (circular arrow)
    const icon = this.add.graphics();
    this.drawResetIcon(icon);
    resetBtn.add(icon);

    resetBtn.setSize(size, size);
    resetBtn.setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => this.drawResetButtonBg(bg, size, true));
    resetBtn.on('pointerout', () => this.drawResetButtonBg(bg, size, false));
    resetBtn.on('pointerdown', () => this.showResetConfirmation());

    container.add(resetBtn);
  }

  private drawResetButtonBg(bg: Phaser.GameObjects.Graphics, size: number, hover: boolean): void {
    bg.clear();
    if (hover) {
      bg.fillStyle(0xEF6C00, 1);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.fillStyle(0xFF9800, 1);
      bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
      bg.lineStyle(2, 0xE65100, 1);
    } else {
      bg.fillStyle(0xD84315, 1);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.fillStyle(0xEF6C00, 1);
      bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 6);
      bg.lineStyle(2, 0xBF360C, 1);
    }
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
  }

  private drawResetIcon(gfx: Phaser.GameObjects.Graphics): void {
    // Circular arrow for reset
    gfx.lineStyle(3, 0xFFFFFF, 1);

    // Draw arc (270 degrees)
    gfx.beginPath();
    gfx.arc(0, 0, 12, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(225), false);
    gfx.strokePath();

    // Arrow head
    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillTriangle(-8, -10, -4, -16, -14, -14);
  }

  private togglePause(): void {
    if (this.gameOver) return;

    // If game hasn't started yet, start it instead of toggling
    if (!this.hasGameStarted) {
      this.startGame();
      return;
    }

    this.isPaused = !this.isPaused;

    // Pause/resume enemy spawn timers AND wave delay timer
    if (this.isPaused) {
      this.waveSystem.pauseSpawning();
      // Also pause the next wave timer
      if (this.waveDelayTimer && !this.waveDelayTimer.hasDispatched) {
        this.waveDelayTimer.paused = true;
      }
    } else {
      this.waveSystem.resumeSpawning();
      // Resume the next wave timer
      if (this.waveDelayTimer && !this.waveDelayTimer.hasDispatched) {
        this.waveDelayTimer.paused = false;
      }
    }

    // Note: We do NOT pause this.time or tweens because that blocks UI interactions
    // The update() method already checks isPaused and skips game logic
    // This allows users to scroll carousel and position towers while paused

    // Update button icon: pause bars when playing, play triangle when paused
    this.drawPausePlayIcon(this.isPaused);
    this.drawPauseButtonBg(false);
  }

  private createPlayerBase(): void {
    // Castle removed - enemies follow the predetermined path and exit off-screen
    // The exit position is the last waypoint in PathSystem
  }

  private createStartIndicator(): void {
    // Show difficulty selection modal before starting
    if (this.needsDifficultySelection) {
      this.showDifficultySelection();
    } else {
      this.startGame();
    }
  }

  private showDifficultySelection(): void {
    if (this.difficultyModal) return;

    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Create modal container with high depth
    this.difficultyModal = this.add.container(0, 0);
    this.difficultyModal.setDepth(DEPTH_LAYERS.OVERLAY + 100);

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.difficultyModal.add(overlay);

    // Modal dimensions - compact since we only show labels
    const modalWidth = 360;
    const modalHeight = 340;
    const modalX = WIDTH / 2 - modalWidth / 2;
    const modalY = HEIGHT / 2 - modalHeight / 2;

    // Modal background - wood frame with parchment (same style as reset modal)
    const modalBg = this.add.graphics();
    // Shadow
    modalBg.fillStyle(0x000000, 0.3);
    modalBg.fillRoundedRect(modalX + 5, modalY + 5, modalWidth, modalHeight, 12);
    // Outer wood frame (dark)
    modalBg.fillStyle(0x5D3A1A, 1);
    modalBg.fillRoundedRect(modalX, modalY, modalWidth, modalHeight, 12);
    // Inner wood frame (medium)
    modalBg.fillStyle(0x8B5A2B, 1);
    modalBg.fillRoundedRect(modalX + 4, modalY + 4, modalWidth - 8, modalHeight - 8, 10);
    // Parchment background
    modalBg.fillStyle(0xF5E6C8, 1);
    modalBg.fillRoundedRect(modalX + 8, modalY + 8, modalWidth - 16, modalHeight - 16, 8);
    // Gold trim
    modalBg.lineStyle(2, 0xC9A227, 0.8);
    modalBg.strokeRoundedRect(modalX + 6, modalY + 6, modalWidth - 12, modalHeight - 12, 9);
    this.difficultyModal.add(modalBg);

    // Title
    const title = this.add.text(WIDTH / 2, modalY + 45, 'SELECT DIFFICULTY', {
      fontSize: '28px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold',
      stroke: '#F5E6C8',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.difficultyModal.add(title);

    // Create difficulty buttons - compact since we removed descriptions
    const buttonWidth = 300;
    const buttonHeight = 60;
    const startY = modalY + 110;
    const buttonGap = 20;

    const difficulties = [
      { key: Difficulty.EASY, config: DIFFICULTY_CONFIG[Difficulty.EASY] },
      { key: Difficulty.NORMAL, config: DIFFICULTY_CONFIG[Difficulty.NORMAL] },
      { key: Difficulty.HARD, config: DIFFICULTY_CONFIG[Difficulty.HARD] }
    ];

    difficulties.forEach((diff, index) => {
      const btn = this.createDifficultyButton(
        WIDTH / 2,
        startY + index * (buttonHeight + buttonGap),
        buttonWidth,
        buttonHeight,
        diff.key,
        diff.config
      );
      this.difficultyModal!.add(btn);
    });

    this.updateTowerPanelBlocking();
  }

  private createDifficultyButton(
    x: number,
    y: number,
    width: number,
    height: number,
    difficultyKey: Difficulty,
    config: { name: string; description: string; rewardMultiplier: number; healthMultiplier: number; color: number }
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();

    const drawButton = (hover: boolean) => {
      bg.clear();

      // Use the difficulty color
      const baseColor = config.color;
      const darkColor = Phaser.Display.Color.IntegerToColor(baseColor);
      const darkerColor = Phaser.Display.Color.GetColor(
        Math.max(0, darkColor.red - 40),
        Math.max(0, darkColor.green - 40),
        Math.max(0, darkColor.blue - 40)
      );

      if (hover) {
        // Hover state - brighter
        const brighterColor = Phaser.Display.Color.GetColor(
          Math.min(255, darkColor.red + 30),
          Math.min(255, darkColor.green + 30),
          Math.min(255, darkColor.blue + 30)
        );
        bg.fillStyle(baseColor, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.fillStyle(brighterColor, 1);
        bg.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 8);
      } else {
        // Normal state
        bg.fillStyle(darkerColor, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.fillStyle(baseColor, 1);
        bg.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 8);
      }

      // Border
      bg.lineStyle(3, darkerColor, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

      // Highlight at top
      bg.fillStyle(0xFFFFFF, hover ? 0.25 : 0.15);
      bg.fillRoundedRect(-width / 2 + 6, -height / 2 + 6, width - 12, height / 4, { tl: 6, tr: 6, bl: 0, br: 0 });
    };

    drawButton(false);
    btn.add(bg);

    // Difficulty name - simple, just the label
    const nameText = this.add.text(0, 0, config.name.toUpperCase(), {
      fontSize: '32px',
      fontFamily: '"Cinzel", serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    btn.add(nameText);

    btn.setSize(width, height);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => drawButton(true));
    btn.on('pointerout', () => drawButton(false));
    btn.on('pointerdown', () => this.selectDifficulty(difficultyKey));

    return btn;
  }

  private selectDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.needsDifficultySelection = false;

    // Hide the modal
    if (this.difficultyModal) {
      this.difficultyModal.destroy();
      this.difficultyModal = null;
    }
    this.updateTowerPanelBlocking();

    // Re-create wave system with new difficulty
    const diffConfig = DIFFICULTY_CONFIG[this.difficulty];
    this.waveSystem = new WaveSystemV2(this, {
      pathSystem: this.pathSystem,
      rewardMultiplier: diffConfig.rewardMultiplier,
      healthMultiplier: diffConfig.healthMultiplier
    });

    // Update difficulty indicator in HUD
    if (this.difficultyIndicator) {
      this.difficultyIndicator.setText(diffConfig.name.toUpperCase());
      this.difficultyIndicator.setColor(`#${diffConfig.color.toString(16).padStart(6, '0')}`);
    }

    // Start the game
    this.startGame();
  }

  private startGame(): void {
    if (this.hasGameStarted) return;

    this.hasGameStarted = true;
    this.isPaused = false;

    // Update pause button to show pause icon
    this.drawPausePlayIcon(false);
    this.drawPauseButtonBg(false);

    // Start first wave after 10 seconds
    this.scheduleNextWave();
  }

  private waveDelayTimer?: Phaser.Time.TimerEvent;
  private waveDelayStartTime: number = 0;
  private readonly WAVE_DELAY_BASE: number = 10000; // 10 seconds base delay

  private scheduleNextWave(): void {
    // Clear any existing timer
    if (this.waveDelayTimer) {
      this.waveDelayTimer.destroy();
    }

    // Apply game speed to the delay (10 seconds / gameSpeed)
    const adjustedDelay = this.WAVE_DELAY_BASE / this.gameSpeed;
    this.waveDelayStartTime = this.time.now;

    this.waveDelayTimer = this.time.delayedCall(adjustedDelay, () => {
      if (!this.gameOver) {
        this.startNextWave();
      }
    });
  }

  // ===== FREE-FORM DRAG AND DROP =====

  private onTowerDragStart(_towerId: string, _pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;

    // Show placement zones
    this.drawPlacementZones();
    this.placementZoneGraphics.setVisible(true);
  }

  private onTowerDragMove(towerId: string, x: number, y: number): void {
    if (!this.isDragging) return;

    // Check if in UI areas first (no snapping needed for invalid areas)
    // Add 50px buffer above footer to prevent accidental placements near panel
    const { TOP_HUD_HEIGHT, HEIGHT, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;
    const playAreaBottom = HEIGHT - BOTTOM_PANEL_HEIGHT - 50; // 50px safety buffer
    const inUIArea = y < TOP_HUD_HEIGHT || y >= playAreaBottom;

    if (inUIArea) {
      this.towerPanel.updateGhostValidity(false);
      this.rangePreview.setVisible(false);
      return;
    }

    // Snap to grid for symmetrical placement
    const snappedPos = this.snapToGrid(x, y);
    x = snappedPos.x;
    y = snappedPos.y;

    // Check if position is valid (near path but not on it, not overlapping towers)
    let canPlace = this.pathSystem.canPlaceTower(x, y);

    // Also check for tower overlap (40px allows close adjacent placement)
    for (const tower of this.towers) {
      const dist = Phaser.Math.Distance.Between(x, y, tower.x, tower.y);
      if (dist < 40) {
        canPlace = false;
        break;
      }
    }

    this.towerPanel.updateGhostValidity(canPlace);

    // Show range preview
    const config = TOWER_CONFIGS[towerId];
    if (config) {
      this.rangePreview.clear();
      this.rangePreview.setVisible(true);

      if (canPlace) {
        this.rangePreview.lineStyle(2, 0x44FF44, 0.6);
        this.rangePreview.fillStyle(0x44FF44, 0.1);
      } else {
        this.rangePreview.lineStyle(2, 0xFF4444, 0.6);
        this.rangePreview.fillStyle(0xFF4444, 0.1);
      }

      this.rangePreview.strokeCircle(x, y, config.range);
      this.rangePreview.fillCircle(x, y, config.range);
    }
  }

  private onTowerDragEnd(towerId: string, x: number, y: number): boolean {
    this.isDragging = false;
    this.placementZoneGraphics.setVisible(false);
    this.rangePreview.setVisible(false);

    const { TOP_HUD_HEIGHT, HEIGHT, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;
    const playAreaBottom = HEIGHT - BOTTOM_PANEL_HEIGHT - 50; // 50px safety buffer

    // Quick reject if pointer is clearly in UI areas
    if (y < TOP_HUD_HEIGHT - 50 || y >= HEIGHT - BOTTOM_PANEL_HEIGHT) {
      return false; // Silent rejection for UI areas
    }

    // Snap to grid for symmetrical placement
    const snappedPos = this.snapToGrid(x, y);
    x = snappedPos.x;
    y = snappedPos.y;

    // CRITICAL: Check boundaries AFTER snapping - snapping can push towers into UI areas!
    if (y < TOP_HUD_HEIGHT || y >= playAreaBottom) {
      this.showNotification('Cannot place there!', 0xFF4444);
      return false;
    }

    // Check if position is valid (near path but not on it)
    if (!this.pathSystem.canPlaceTower(x, y)) {
      this.showNotification('Place near the path!', 0xFF4444);
      return false;
    }

    // Check for tower overlap (40px allows close adjacent placement)
    for (const tower of this.towers) {
      const dist = Phaser.Math.Distance.Between(x, y, tower.x, tower.y);
      if (dist < 40) {
        this.showNotification('Too close to another tower!', 0xFF4444);
        return false;
      }
    }

    const towerConfig = TOWER_CONFIGS[towerId];
    if (!towerConfig) {
      return false;
    }

    if (this.gold < towerConfig.cost) {
      this.showNotification('Not enough gold!', 0xFF4444);
      ParticleEffects.shakeScreen(this, 4, 150);
      return false;
    }

    // Place the tower
    this.placeTower(towerId, x, y);
    this.gold -= towerConfig.cost;
    this.updateGoldDisplay();

    return true;
  }

  // ===== TOWER PLACEMENT =====

  /**
   * Snap position to a small grid for clean placement
   * Uses 8px micro-grid (feels free but avoids subpixel issues)
   */
  private snapToGrid(x: number, y: number): { x: number; y: number } {
    const gridSize = 8;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
  }

  private placeTower(towerId: string, x: number, y: number): void {
    const config = TOWER_CONFIGS[towerId];
    if (!config) return;

    // Generate unique ID for this tower
    const uniqueId = `tower_${this.towerIdCounter++}`;

    // Create shadow
    if (GAME_CONFIG.ENABLE_SHADOWS) {
      this.add.ellipse(x, y + 25, 45, 12, 0x000000, 0.2)
        .setDepth(DEPTH_LAYERS.TOWERS_BASE - 1);
    }

    // Create a fake GridCell for Tower compatibility
    const fakeCell = {
      x: x,
      y: y,
      row: 0,
      col: 0,
      canPlaceTower: true,
      hasTower: true,
      terrain: 'grass' as const,
      isPath: false,
      showPlacementMode: () => {},
      showRangePreview: () => {},
      hideRangePreview: () => {},
      placeTower: () => {},
      removeTower: () => {},
      destroy: () => {}
    };

    const tower = new Tower(this, config, fakeCell as any);
    (tower as any).uniqueId = uniqueId; // Store for removal
    this.towers.push(tower);
    this.depthSortSystem.register(tower);

    // Effects
    ParticleEffects.createDustPuff(this, x, y, 0x8B7355);
    ParticleEffects.createLevelUpEffect(this, x, y - 20);

    // Scale animation
    tower.setScale(0);
    this.tweens.add({
      targets: tower,
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: 'Back.easeOut'
    });

    // Flash feedback
    this.cameras.main.flash(80, 255, 255, 255, true);
    this.showNotification(`${config.name}`, 0x44FF44, 'small');
  }

  // ===== EVENT LISTENERS =====

  private setupEventListeners(): void {
    this.events.on('enemyKilled', (enemy: EnemyUnit) => {
      this.addGold(enemy.getReward());
      ParticleEffects.createGoldBurst(this, enemy.x, enemy.y, enemy.getReward());

      if (GAME_CONFIG.ENABLE_SCREEN_SHAKE) {
        ParticleEffects.shakeScreen(this, 2, 80);
      }
    });

    this.events.on('enemyReachedBase', (enemy: EnemyUnit) => {
      this.loseLife(enemy.config.damage);
    });

    this.events.on('waveStarted', (wave: number) => {
      this.currentWave = wave;
      this.waveText.setText(`WAVE ${wave}`);
      this.showNotification(`Wave ${wave}`, 0xFFAA44, 'large');

      // Pulse wave text
      this.tweens.add({
        targets: this.waveText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true
      });
    });

    this.events.on('waveComplete', (_nextWave: number, bonusGold: number) => {
      this.addGold(bonusGold);
      this.createWaveCompleteEffect();
      this.showNotification(`+${bonusGold} Gold!`, 0xFFD700);

      // Schedule next wave after 10 second delay
      this.scheduleNextWave();
    });

    // Tower selection
    this.events.on('towerSelected', (tower: Tower) => {
      this.selectTower(tower);
    });

    // Tower upgrade request
    this.events.on('requestTowerUpgrade', (tower: Tower) => {
      this.upgradeTower(tower);
    });

    // Tower sell request
    this.events.on('requestTowerSell', (tower: Tower) => {
      this.sellTower(tower);
    });

    // Info modal closed - update tower panel blocking
    this.events.on('infoModalClosed', () => {
      this.updateTowerPanelBlocking();
    });
  }

  private handleBackgroundClick(pointer: Phaser.Input.Pointer): void {
    // Don't deselect if clicking on UI elements or if dragging a new tower
    if (this.isDragging) return;
    if (this.infoModal.getIsVisible()) return;
    if (this.towerActionPanel.getIsVisible()) {
      // Check if click is outside the action panel
      const panelBounds = this.towerActionPanel.getBounds();
      if (!panelBounds.contains(pointer.x, pointer.y)) {
        // Also check if clicking on a tower
        const clickedTower = this.towers.find(t =>
          Phaser.Geom.Rectangle.Contains(
            new Phaser.Geom.Rectangle(t.x - 32, t.y - 50, 64, 80),
            pointer.x,
            pointer.y
          )
        );
        if (!clickedTower) {
          this.deselectTower();
        }
      }
      return;
    }

    // Check if clicking on tower panel area - updated for larger panel
    const { HEIGHT, BOTTOM_PANEL_HEIGHT, TOP_HUD_HEIGHT } = GAME_CONFIG;
    if (pointer.y > HEIGHT - BOTTOM_PANEL_HEIGHT) return;

    // Check if clicking on header HUD - updated for larger HUD
    if (pointer.y < TOP_HUD_HEIGHT) return;
  }

  private selectTower(tower: Tower): void {
    // Deselect previous tower
    if (this.selectedTower && this.selectedTower !== tower) {
      this.selectedTower.deselect();
    }

    this.selectedTower = tower;
    tower.select();
    this.towerActionPanel.showForTower(tower);
    this.updateTowerPanelBlocking();
  }

  private deselectTower(): void {
    if (this.selectedTower) {
      this.selectedTower.deselect();
      this.selectedTower = null;
    }
    this.towerActionPanel.hide();
    this.updateTowerPanelBlocking();
  }

  /**
   * Check if any modal is open and block/unblock tower panel interactions
   */
  private updateTowerPanelBlocking(): void {
    const anyModalOpen =
      this.infoModal.getIsVisible() ||
      this.towerActionPanel.getIsVisible() ||
      this.difficultyModal !== null ||
      this.confirmationModal !== null;

    this.towerPanel.setInteractionsBlocked(anyModalOpen);
  }

  private upgradeTower(tower: Tower): void {
    const upgradeCost = tower.getUpgradeCost();

    if (upgradeCost < 0) {
      this.showNotification('MAX LEVEL!', 0xC9A227);
      return;
    }

    if (this.gold < upgradeCost) {
      this.showNotification('Not enough gold!', 0xFF4444);
      return;
    }

    // Deduct gold and upgrade
    this.gold -= upgradeCost;
    this.updateGoldDisplay();

    const actualCost = tower.upgrade();
    if (actualCost > 0) {
      this.showNotification(`Upgraded! -${upgradeCost}`, 0x2E7D32);
    }
  }

  private sellTower(tower: Tower): void {
    const sellPrice = tower.getSellPrice();

    // Add gold
    this.addGold(sellPrice);

    // Remove tower from array
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
    }

    // Create sell effect
    ParticleEffects.createGoldBurst(this, tower.x, tower.y, sellPrice);

    // Destroy the tower
    tower.destroy();

    // Clear selection
    this.selectedTower = null;

    this.showNotification(`Sold! +${sellPrice}`, 0xFFD700);
  }

  private createWaveCompleteEffect(): void {
    const { WIDTH } = GAME_CONFIG;

    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(100, WIDTH - 100);
      const y = 150;

      const particle = this.add.graphics();
      const color = Phaser.Math.RND.pick([0xFFD700, 0xFFA500, 0xFFFF00]);
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 4);
      particle.x = x;
      particle.y = y;
      particle.setDepth(DEPTH_LAYERS.EFFECTS);

      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(150, 300),
        x: x + Phaser.Math.Between(-60, 60),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(1200, 2000),
        ease: 'Quad.easeOut',
        delay: i * 25,
        onComplete: () => particle.destroy()
      });
    }
  }

  private startNextWave(): void {
    if (this.gameOver) return;
    this.waveSystem.startNextWave(this.gameSpeed);
  }

  private addGold(amount: number): void {
    this.gold += amount;
    this.updateGoldDisplay();
  }

  /**
   * Format gold for display
   * 0-99,999: show with commas (e.g., "12,345")
   * 100,000-999,999: show as "###.##K" (e.g., "100.00K")
   * 1,000,000+: show as "###.##M" (e.g., "1.00M")
   */
  private formatGold(amount: number): string {
    if (amount >= 1000000) {
      // Millions
      const m = amount / 1000000;
      if (m >= 100) {
        return `${m.toFixed(1)}M`; // 100.0M, 999.9M
      }
      return `${m.toFixed(2)}M`; // 1.00M, 99.99M
    }
    if (amount >= 100000) {
      // Hundreds of thousands
      const k = amount / 1000;
      return `${k.toFixed(2)}K`; // 100.00K, 999.99K
    }
    // Under 100,000: show with commas
    return amount.toLocaleString();
  }

  private updateGoldDisplay(): void {
    const oldGold = parseInt(this.goldText.text.replace(/[KM,]/g, '')) || 0;
    const newGold = this.gold;

    this.tweens.addCounter({
      from: oldGold,
      to: newGold,
      duration: 250,
      onUpdate: (tween) => {
        this.goldText.setText(this.formatGold(Math.round(tween.getValue() ?? 0)));
      }
    });

    this.goldText.setScale(1.15);
    this.tweens.add({
      targets: this.goldText,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });

    // Notify UI components of gold change (for live updates)
    this.events.emit('goldChanged', this.gold);

    this.towerPanel.updateGold(this.gold);
  }

  private loseLife(amount: number): void {
    this.lives -= amount;
    this.livesText.setText(`${this.lives}`);

    // Visual feedback without screen shake/flash (removed as it caused screen glitches)
    this.livesText.setScale(1.4);
    this.livesText.setTint(0xFF0000);
    this.tweens.add({
      targets: this.livesText,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => this.livesText.clearTint()
    });

    if (this.lives <= 0) {
      this.defeat();
    }
  }

  private showNotification(message: string, color: number, size: 'small' | 'large' = 'small'): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const fontSize = size === 'large' ? '56px' : '32px'; // MUCH larger for mobile
    const yPos = size === 'large' ? HEIGHT / 3 : HEIGHT / 2;

    const text = this.add.text(WIDTH / 2, yPos, message, {
      fontSize: fontSize,
      fontFamily: '"Silkscreen", monospace',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: size === 'large' ? 5 : 3
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY);

    text.setScale(0);
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1000,
      delay: 350,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private defeat(): void {
    this.gameOver = true;

    this.cameras.main.flash(400, 255, 0, 0, true);

    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);
    overlay.setDepth(DEPTH_LAYERS.OVERLAY);

    // Modal dimensions - centered panel
    const modalWidth = 400;
    const modalHeight = 340;
    const modalX = WIDTH / 2 - modalWidth / 2;
    const modalY = HEIGHT / 2 - modalHeight / 2;

    // Modal background - wood frame with parchment (matches game style)
    const modalBg = this.add.graphics();
    modalBg.setDepth(DEPTH_LAYERS.OVERLAY + 1);
    // Shadow
    modalBg.fillStyle(0x000000, 0.3);
    modalBg.fillRoundedRect(modalX + 5, modalY + 5, modalWidth, modalHeight, 12);
    // Outer wood frame (dark)
    modalBg.fillStyle(0x5D3A1A, 1);
    modalBg.fillRoundedRect(modalX, modalY, modalWidth, modalHeight, 12);
    // Inner wood frame (medium)
    modalBg.fillStyle(0x8B5A2B, 1);
    modalBg.fillRoundedRect(modalX + 4, modalY + 4, modalWidth - 8, modalHeight - 8, 10);
    // Parchment background
    modalBg.fillStyle(0xF5E6C8, 1);
    modalBg.fillRoundedRect(modalX + 8, modalY + 8, modalWidth - 16, modalHeight - 16, 8);
    // Gold trim
    modalBg.lineStyle(2, 0xC9A227, 0.8);
    modalBg.strokeRoundedRect(modalX + 6, modalY + 6, modalWidth - 12, modalHeight - 12, 9);
    // Red accent line at top (defeat indicator)
    modalBg.fillStyle(0xB71C1C, 1);
    modalBg.fillRoundedRect(modalX + 20, modalY + 20, modalWidth - 40, 6, 3);

    // DEFEAT title - large, dramatic
    this.add.text(WIDTH / 2, modalY + 70, 'DEFEAT', {
      fontSize: '56px',
      fontFamily: '"Cinzel", serif',
      color: '#B71C1C',
      fontStyle: 'bold',
      stroke: '#3D2817',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY + 2);

    // Subtitle
    this.add.text(WIDTH / 2, modalY + 125, 'The kingdom has fallen...', {
      fontSize: '22px',
      fontFamily: '"Cinzel", serif',
      color: '#5D4037',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY + 2);

    // Wave reached - prominent stat
    this.add.text(WIDTH / 2, modalY + 175, `Wave ${this.currentWave}`, {
      fontSize: '42px',
      fontFamily: '"Cinzel", serif',
      color: '#C9A227',
      fontStyle: 'bold',
      stroke: '#5D3A1A',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY + 2);

    this.add.text(WIDTH / 2, modalY + 215, 'reached', {
      fontSize: '20px',
      fontFamily: '"Cinzel", serif',
      color: '#8D7050'
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY + 2);

    // Play again button - styled as wood button
    this.time.delayedCall(1200, () => {
      const btnWidth = 280;
      const btnHeight = 60;
      const btnX = WIDTH / 2;
      const btnY = modalY + 285;

      const btnBg = this.add.graphics();
      btnBg.setDepth(DEPTH_LAYERS.OVERLAY + 2);

      const drawButton = (hover: boolean) => {
        btnBg.clear();
        // Button shadow
        btnBg.fillStyle(0x000000, 0.3);
        btnBg.fillRoundedRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth, btnHeight, 10);
        // Button base
        btnBg.fillStyle(hover ? 0x4CAF50 : 0x388E3C, 1);
        btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
        // Highlight
        btnBg.fillStyle(0xFFFFFF, hover ? 0.25 : 0.15);
        btnBg.fillRoundedRect(btnX - btnWidth / 2 + 5, btnY - btnHeight / 2 + 5, btnWidth - 10, btnHeight / 3, { tl: 8, tr: 8, bl: 0, br: 0 });
        // Border
        btnBg.lineStyle(3, 0x2E7D32, 1);
        btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
      };
      drawButton(false);

      const playAgain = this.add.text(btnX, btnY, 'PLAY AGAIN', {
        fontSize: '28px',
        fontFamily: '"Cinzel", serif',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#1B5E20',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH_LAYERS.OVERLAY + 3);

      // Make button interactive
      const hitArea = new Phaser.Geom.Rectangle(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight);
      btnBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      btnBg.on('pointerover', () => drawButton(true));
      btnBg.on('pointerout', () => drawButton(false));
      btnBg.on('pointerdown', () => {
        this.cameras.main.fade(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          this.scene.restart();
        });
      });

      // Gentle pulse on button text
      this.tweens.add({
        targets: playAgain,
        scale: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    this.saveHighScore();
  }

  private saveHighScore(): void {
    const currentHigh = parseInt(localStorage.getItem('tinyKingdoms_highWave') || '0');
    if (this.currentWave > currentHigh) {
      localStorage.setItem('tinyKingdoms_highWave', this.currentWave.toString());
    }
  }

  private confirmationModal: Phaser.GameObjects.Container | null = null;

  private showResetConfirmation(): void {
    if (this.confirmationModal) return;

    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Create modal container with high depth
    this.confirmationModal = this.add.container(0, 0);
    this.confirmationModal.setDepth(DEPTH_LAYERS.OVERLAY + 100);

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.confirmationModal.add(overlay);

    // Modal dimensions
    const modalWidth = 400;
    const modalHeight = 220;
    const modalX = WIDTH / 2 - modalWidth / 2;
    const modalY = HEIGHT / 2 - modalHeight / 2;

    // Modal background - wood frame with parchment
    const modalBg = this.add.graphics();
    // Shadow
    modalBg.fillStyle(0x000000, 0.3);
    modalBg.fillRoundedRect(modalX + 5, modalY + 5, modalWidth, modalHeight, 12);
    // Outer wood frame (dark)
    modalBg.fillStyle(0x5D3A1A, 1);
    modalBg.fillRoundedRect(modalX, modalY, modalWidth, modalHeight, 12);
    // Inner wood frame (medium)
    modalBg.fillStyle(0x8B5A2B, 1);
    modalBg.fillRoundedRect(modalX + 4, modalY + 4, modalWidth - 8, modalHeight - 8, 10);
    // Parchment background
    modalBg.fillStyle(0xF5E6C8, 1);
    modalBg.fillRoundedRect(modalX + 8, modalY + 8, modalWidth - 16, modalHeight - 16, 8);
    // Gold trim
    modalBg.lineStyle(2, 0xC9A227, 0.8);
    modalBg.strokeRoundedRect(modalX + 6, modalY + 6, modalWidth - 12, modalHeight - 12, 9);
    this.confirmationModal.add(modalBg);

    // Title
    const title = this.add.text(WIDTH / 2, modalY + 50, 'RESTART GAME?', {
      fontSize: '32px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold',
      stroke: '#F5E6C8',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.confirmationModal.add(title);

    // Warning text
    const warning = this.add.text(WIDTH / 2, modalY + 95, 'All progress will be lost!', {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#8B5A2B'
    }).setOrigin(0.5);
    this.confirmationModal.add(warning);

    // Button dimensions
    const buttonWidth = 140;
    const buttonHeight = 56;
    const buttonY = modalY + modalHeight - 45;
    const buttonGap = 20;

    // NO button (left) - red
    const noBtn = this.createConfirmButton(
      WIDTH / 2 - buttonWidth / 2 - buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      'NO',
      0xB71C1C,
      0xC62828,
      () => this.hideResetConfirmation()
    );
    this.confirmationModal.add(noBtn);

    // YES button (right) - green
    const yesBtn = this.createConfirmButton(
      WIDTH / 2 + buttonWidth / 2 + buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      'YES',
      0x388E3C,
      0x4CAF50,
      () => this.resetGame()
    );
    this.confirmationModal.add(yesBtn);

    // Pause the game when modal is shown
    if (!this.isPaused && !this.gameOver) {
      this.isPaused = true;
      // Also pause spawn and wave timers
      this.waveSystem.pauseSpawning();
      if (this.waveDelayTimer && !this.waveDelayTimer.hasDispatched) {
        this.waveDelayTimer.paused = true;
      }
    }

    this.updateTowerPanelBlocking();
  }

  private createConfirmButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    colorDark: number,
    colorLight: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();

    const drawButton = (hover: boolean) => {
      bg.clear();
      if (hover) {
        // Hover state - lighter and more vibrant
        const color = Phaser.Display.Color.IntegerToColor(colorLight);
        const brighterColor = Phaser.Display.Color.GetColor(
          Math.min(255, color.red + 20),
          Math.min(255, color.green + 20),
          Math.min(255, color.blue + 20)
        );
        bg.fillStyle(colorLight, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.fillStyle(brighterColor, 1);
        bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
      } else {
        // Normal state
        bg.fillStyle(colorDark, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.fillStyle(colorLight, 1);
        bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
      }
      bg.lineStyle(2, colorDark, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    };

    drawButton(false);
    btn.add(bg);

    const label = this.add.text(0, 0, text, {
      fontSize: '26px',
      fontFamily: '"Cinzel", serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    btn.add(label);

    btn.setSize(width, height);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => drawButton(true));
    btn.on('pointerout', () => drawButton(false));
    btn.on('pointerdown', onClick);

    return btn;
  }

  private hideResetConfirmation(): void {
    if (this.confirmationModal) {
      this.confirmationModal.destroy();
      this.confirmationModal = null;
    }

    // Resume the game if it was paused by the modal
    if (this.isPaused && !this.gameOver && this.hasGameStarted) {
      this.isPaused = false;
      // Also resume spawn and wave timers
      this.waveSystem.resumeSpawning();
      if (this.waveDelayTimer && !this.waveDelayTimer.hasDispatched) {
        this.waveDelayTimer.paused = false;
      }
    }

    this.updateTowerPanelBlocking();
  }

  private resetGame(): void {
    this.hideResetConfirmation();
    this.cameras.main.fade(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      // Restart WITHOUT passing difficulty to trigger selection modal
      this.scene.restart({ selectedTowers: this.availableTowers });
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.isPaused) return;

    // Apply game speed multiplier
    const scaledDelta = delta * this.gameSpeed;

    // Accumulate game time (scaled by speed) - this ensures towers fire faster at higher speeds
    this.gameTime += scaledDelta;

    this.waveSystem.update(scaledDelta);
    this.enemyCountText.setText(`ENEMIES: ${this.waveSystem.getEnemyCount()}`);
    this.depthSortSystem.update();
    this.updateTowers(this.gameTime); // Use gameTime, not real time
    this.updateProjectiles(scaledDelta);
  }

  private updateTowers(time: number): void {
    const enemies = this.waveSystem.getEnemies();

    this.towers.forEach(tower => {
      let leadingEnemy: EnemyUnit | null = null;
      let highestProgress = -1;
      let closestDistance = Infinity;

      enemies.forEach(enemy => {
        if (enemy.isDead) return;
        if (!tower.isInRange(enemy.x, enemy.y)) return;

        const progress = enemy.getPathProgress();
        const distance = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);

        // Prioritize enemy furthest along path (closest to escaping)
        // Use distance as tiebreaker when progress is equal
        if (progress > highestProgress ||
            (progress === highestProgress && distance < closestDistance)) {
          leadingEnemy = enemy;
          highestProgress = progress;
          closestDistance = distance;
        }
      });

      tower.setTarget(leadingEnemy || undefined);

      if (leadingEnemy && tower.canFire(time)) {
        tower.fire(time);
        this.fireProjectile(tower, leadingEnemy);
      }
    });
  }

  private fireProjectile(tower: Tower, target: EnemyUnit): void {
    const stats = tower.getStats();

    // Scale projectile size based on tower level (25% larger per upgrade)
    const baseScale = 0.5;
    const levelScaleBonus = 0.25 * (tower.level - 1); // 0%, 25%, 50% for levels 1, 2, 3
    const projectileScale = baseScale * (1 + levelScaleBonus);

    const projectile = new Projectile(
      this,
      tower.x,
      tower.y - 30,
      target as any, // Type compatibility
      {
        speed: tower.config.projectileSpeed,
        damage: stats.damage,
        spriteKey: tower.config.projectileKey || 'arrow',
        towerId: tower.config.id, // Pass tower ID for damage type calculation
        scale: projectileScale
      }
    );

    this.projectiles.push(projectile);

    ParticleEffects.createMuzzleFlash(
      this,
      tower.x,
      tower.y - 30,
      Math.atan2(target.y - tower.y, target.x - tower.x)
    );
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (!projectile.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      projectile.update(delta);
    }
  }

  shutdown(): void {
    this.events.off('enemyKilled');
    this.events.off('enemyReachedBase');
    this.events.off('waveStarted');
    this.events.off('waveComplete');

    this.waveSystem?.clear();
    this.depthSortSystem?.clear();
    this.pathRenderer?.destroy();
  }
}
