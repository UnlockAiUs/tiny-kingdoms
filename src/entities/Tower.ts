import Phaser from 'phaser';
import { TowerConfig } from '../config/towers.config';
import { ParticleEffects } from '../systems/ParticleEffects';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';

// Minimal interface for tower placement (replaces deleted GridCell)
export interface TowerPlacement {
  x: number;
  y: number;
  placeTower: () => void;
  removeTower: () => void;
}

export class Tower extends Phaser.GameObjects.Container {
  public config: TowerConfig;
  public gridCell: TowerPlacement;
  public level: number = 1;
  public totalInvested: number = 0;
  public readonly uniqueId: string;

  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private rangeCircle: Phaser.GameObjects.Graphics;
  private levelBadge: Phaser.GameObjects.Container | null = null;
  private selectionRing: Phaser.GameObjects.Graphics | null = null;
  private lastFireTime: number = 0;
  private currentTarget?: Phaser.GameObjects.Container;
  private isSelected: boolean = false;
  private auraTimer?: Phaser.Time.TimerEvent;

  // Upgrade cost multipliers: Level 2 = 5x base, Level 3 = 25x base
  private static readonly UPGRADE_MULTIPLIER = 5;

  // Prevent rapid upgrade calls (debounce at Tower level)
  private lastUpgradeTime: number = 0;
  private static readonly UPGRADE_COOLDOWN = 500; // 500ms between upgrades

  constructor(
    scene: Phaser.Scene,
    config: TowerConfig,
    gridCell: TowerPlacement
  ) {
    super(scene, gridCell.x, gridCell.y);

    this.config = config;
    this.gridCell = gridCell;
    this.uniqueId = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.totalInvested = config.cost; // Track initial cost

    // Create tower sprite - with fallback if texture doesn't exist
    if (scene.textures.exists(config.spriteKey)) {
      this.sprite = scene.add.sprite(0, -20, config.spriteKey);
      (this.sprite as Phaser.GameObjects.Sprite).setScale(config.scale || 0.5);

      // Apply tint if specified
      if (config.tint) {
        (this.sprite as Phaser.GameObjects.Sprite).setTint(config.tint);
      }
    } else {
      // Fallback: draw tower shape programmatically
      this.sprite = this.createFallbackTower(config);
    }
    this.add(this.sprite);

    // Create range indicator (hidden by default)
    this.rangeCircle = scene.add.graphics();
    this.updateRangeCircle();
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);

    // Set depth based on Y position
    this.setDepth(DEPTH_LAYERS.TOWERS_BASE + this.y * 0.001);

    // Create selection ring (hidden by default)
    this.selectionRing = scene.add.graphics();
    this.updateSelectionRing();
    this.selectionRing.setVisible(false);
    this.add(this.selectionRing);

    // Make interactive for selection and upgrades
    this.setSize(64, 80);
    this.setInteractive({ useHandCursor: true })
      .on('pointerover', this.showRange, this)
      .on('pointerout', this.onPointerOut, this)
      .on('pointerdown', this.onSelect, this);

    // Play idle animation if exists
    if (this.sprite instanceof Phaser.GameObjects.Sprite && scene.anims.exists(`${config.spriteKey}_idle`)) {
      this.sprite.play(`${config.spriteKey}_idle`);
    }

    scene.add.existing(this);
    gridCell.placeTower();
  }

  private createFallbackTower(_config: TowerConfig): Phaser.GameObjects.Graphics {
    const gfx = this.scene.add.graphics();

    // Generic fallback tower colors
    const baseColor = 0x4488CC;
    const accentColor = 0x66AAEE;

    // Draw tower base
    gfx.fillStyle(baseColor, 1);
    gfx.fillRect(-20, -10, 40, 30);

    // Draw tower top
    gfx.fillStyle(accentColor, 1);
    gfx.fillTriangle(-25, -10, 0, -50, 25, -10);

    // Draw tower details
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillRect(-10, 0, 8, 15);
    gfx.fillRect(2, 0, 8, 15);

    return gfx;
  }

  private updateRangeCircle(): void {
    this.rangeCircle.clear();
    // White range indicator for better visibility against green background
    this.rangeCircle.fillStyle(0xFFFFFF, 0.15);
    this.rangeCircle.fillCircle(0, 0, this.config.range);
    this.rangeCircle.lineStyle(2, 0xFFFFFF, 0.5);
    this.rangeCircle.strokeCircle(0, 0, this.config.range);
  }

  public showRange(): void {
    this.rangeCircle.setVisible(true);
  }

  public hideRange(): void {
    this.rangeCircle.setVisible(false);
  }

  public canFire(time: number): boolean {
    // Non-attacking towers (projectileSpeed === 0) don't fire
    if (this.config.projectileSpeed === 0) {
      return false;
    }
    // Use scaled fireRate from getStats() for upgrade-aware fire rate
    const stats = this.getStats();
    return time - this.lastFireTime >= stats.fireRate;
  }

  public fire(time: number): void {
    this.lastFireTime = time;

    // Muzzle flash effect
    if (this.currentTarget) {
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        this.currentTarget.x,
        this.currentTarget.y
      );
      ParticleEffects.createMuzzleFlash(this.scene, this.x, this.y - 30, angle);
    }

    // Play attack animation if exists
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      const attackAnim = `${this.config.spriteKey}_attack`;
      if (this.scene.anims.exists(attackAnim)) {
        this.sprite.play(attackAnim);
        this.sprite.once('animationcomplete', () => {
          const idleAnim = `${this.config.spriteKey}_idle`;
          if (this.scene.anims.exists(idleAnim)) {
            (this.sprite as Phaser.GameObjects.Sprite).play(idleAnim);
          }
        });
      }
    }
  }

  public setTarget(target: Phaser.GameObjects.Container | undefined): void {
    this.currentTarget = target;
  }

  public getTarget(): Phaser.GameObjects.Container | undefined {
    return this.currentTarget;
  }

  public isInRange(targetX: number, targetY: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    return distance <= this.config.range;
  }

  public getStats(): { damage: number; range: number; fireRate: number } {
    // 2x damage and 2x fire speed (half fireRate) per level
    const levelMultiplier = Math.pow(2, this.level - 1); // 1, 2, 4 for levels 1, 2, 3
    return {
      damage: Math.floor(this.config.damage * levelMultiplier),
      range: this.config.range,
      fireRate: Math.floor(this.config.fireRate / levelMultiplier) // Lower = faster
    };
  }

  /**
   * Get the cost to upgrade to the next level
   * Level 2 = 5x base cost, Level 3 = 25x base cost
   * Returns -1 if already max level
   */
  public getUpgradeCost(): number {
    if (this.level >= 3) return -1;

    const baseCost = this.config.cost;
    // Level 1->2: 5x base, Level 2->3: 25x base (5x of 5x)
    const multiplier = Math.pow(Tower.UPGRADE_MULTIPLIER, this.level);
    return Math.floor(baseCost * multiplier);
  }

  /**
   * Get the sell price (50% of total invested)
   */
  public getSellPrice(): number {
    return Math.floor(this.totalInvested * 0.5);
  }

  /**
   * Check if tower can be upgraded
   */
  public canUpgrade(): boolean {
    return this.level < 3;
  }

  /**
   * Upgrade tower to next level
   * Returns the cost paid if successful, 0 if failed
   */
  public upgrade(): number {
    if (this.level >= 3) return 0;

    // Prevent rapid upgrades - enforce cooldown at Tower level
    const currentTime = Date.now();
    if (currentTime - this.lastUpgradeTime < Tower.UPGRADE_COOLDOWN) {
      return 0;
    }
    this.lastUpgradeTime = currentTime;

    const upgradeCost = this.getUpgradeCost();
    if (upgradeCost < 0) return 0;

    // Track investment
    this.totalInvested += upgradeCost;
    this.level++;

    // Visual feedback for upgrade - tint based on level
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setTint(this.level === 2 ? 0xaaffaa : 0xffffaa);

      // Scale tower sprite: 25% larger per level with satisfying animation
      const baseScale = this.config.scale || 0.5;
      const levelScale = baseScale * (1 + 0.25 * (this.level - 1)); // 1.0, 1.25, 1.5
      this.scene.tweens.add({
        targets: this.sprite,
        scale: levelScale,
        duration: 300,
        ease: 'Back.easeOut'
      });
    }

    // Update/create level badge
    this.updateLevelBadge();

    // Update range circle
    this.updateRangeCircle();

    // Start floating particle aura for upgraded towers
    if (this.auraTimer) {
      this.auraTimer.remove();
    }
    this.auraTimer = ParticleEffects.createUpgradeAura(this.scene, this, this.level);

    // Level up effect
    ParticleEffects.createLevelUpEffect(this.scene, this.x, this.y);

    // Emit upgrade event
    this.scene.events.emit('towerUpgraded', this);

    return upgradeCost;
  }

  private updateLevelBadge(): void {
    // Remove existing badge
    if (this.levelBadge) {
      this.levelBadge.destroy();
      this.levelBadge = null;
    }

    // Only show badge for level 2+
    if (this.level < 2) return;

    this.levelBadge = this.scene.add.container(25, -60);

    // Badge colors
    const badgeColor = this.level === 2 ? 0xC0C0C0 : 0xFFD700; // Silver for 2, Gold for 3
    const borderColor = this.level === 2 ? 0x808080 : 0xC9A227;
    const glowColor = this.level === 2 ? 0xE8E8E8 : 0xFFE066; // Soft white for silver, warm gold for gold

    // Soft glow behind badge
    const glow = this.scene.add.graphics();
    glow.fillStyle(glowColor, 0.3);
    glow.fillCircle(0, 0, 20);
    this.levelBadge.add(glow);

    // Badge background - slightly larger
    const badgeBg = this.scene.add.graphics();
    badgeBg.fillStyle(badgeColor, 1);
    badgeBg.fillCircle(0, 0, 14);
    badgeBg.lineStyle(2, borderColor, 1);
    badgeBg.strokeCircle(0, 0, 14);
    this.levelBadge.add(badgeBg);

    // Level number - slightly larger
    const levelText = this.scene.add.text(0, 0, `${this.level}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black',
      color: this.level === 2 ? '#444444' : '#5D3A1A'
    }).setOrigin(0.5);
    this.levelBadge.add(levelText);

    // Gentle pulse animation
    this.scene.tweens.add({
      targets: this.levelBadge,
      scale: 1.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add(this.levelBadge);
  }

  private updateSelectionRing(): void {
    if (!this.selectionRing) return;

    this.selectionRing.clear();
    this.selectionRing.lineStyle(3, 0xFFD700, 0.8);
    this.selectionRing.strokeCircle(0, -10, 45);
    this.selectionRing.lineStyle(2, 0xFFFFFF, 0.4);
    this.selectionRing.strokeCircle(0, -10, 48);
  }

  private onSelect(): void {
    this.scene.events.emit('towerSelected', this);
  }

  private onPointerOut(): void {
    if (!this.isSelected) {
      this.hideRange();
    }
  }

  public select(): void {
    this.isSelected = true;
    this.showRange();
    if (this.selectionRing) {
      this.selectionRing.setVisible(true);
    }
  }

  public deselect(): void {
    this.isSelected = false;
    this.hideRange();
    if (this.selectionRing) {
      this.selectionRing.setVisible(false);
    }
  }

  public getIsSelected(): boolean {
    return this.isSelected;
  }

  public destroy(): void {
    // Clean up aura particle timer
    if (this.auraTimer) {
      this.auraTimer.remove();
      this.auraTimer = undefined;
    }

    this.gridCell.removeTower();
    super.destroy();
  }
}
