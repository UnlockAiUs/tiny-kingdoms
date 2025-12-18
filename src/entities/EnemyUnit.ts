import Phaser from 'phaser';
import { EnemyConfig } from '../config/enemies.config';
import { EnemyType } from '../config/damage.config';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';
import { ParticleEffects } from '../systems/ParticleEffects';
import { PathSystem, PathWaypoint } from '../systems/PathSystem';

/**
 * EnemyUnit - Simple waypoint-following enemy
 *
 * All enemies follow the predetermined path via waypoints.
 * No leader/follower logic - each enemy moves independently at the same pace.
 */
export class EnemyUnit extends Phaser.GameObjects.Container {
  public config: EnemyConfig;
  public health: number;
  public maxHealth: number;
  public isDead: boolean = false;

  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private speed: number;

  // Waypoint tracking
  private waypoints: PathWaypoint[] = [];
  private currentWaypointIndex: number = 0;

  // Status effects
  private slowAmount: number = 0;
  private slowDuration: number = 0;

  constructor(
    scene: Phaser.Scene,
    config: EnemyConfig,
    pathSystem: PathSystem,
    startX: number,
    startY: number
  ) {
    super(scene, startX, startY);

    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;

    // Get waypoints from path system
    this.waypoints = pathSystem.getWaypoints();
    this.currentWaypointIndex = 1; // Start moving towards second waypoint (first is spawn)

    // Create enemy sprite - with fallback
    if (scene.textures.exists(config.spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, config.spriteKey);
      (this.sprite as Phaser.GameObjects.Sprite).setScale(config.scale || 1);

      // Play walk animation
      if (scene.anims.exists(config.animations.walk)) {
        (this.sprite as Phaser.GameObjects.Sprite).play(config.animations.walk);
      }
    } else {
      // Fallback - draw enemy programmatically
      this.sprite = this.createFallbackSprite(config);
    }
    this.add(this.sprite);

    // Create health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    // Set depth for Y-sorting
    this.setDepth(DEPTH_LAYERS.ENEMIES_BASE + this.y);

    scene.add.existing(this);
  }

  private createFallbackSprite(config: EnemyConfig): Phaser.GameObjects.Graphics {
    const gfx = this.scene.add.graphics();

    // Color based on enemy tags
    let bodyColor = 0x44AA44; // Default green
    let accentColor = 0x66CC66;

    if (config.tags.includes('armored')) {
      bodyColor = 0x666666;
      accentColor = 0x888888;
    } else if (config.tags.includes('fast')) {
      bodyColor = 0xAAAA44;
      accentColor = 0xCCCC66;
    } else if (config.tags.includes('boss')) {
      bodyColor = 0xAA4444;
      accentColor = 0xCC6666;
    } else if (config.tags.includes('swarm')) {
      bodyColor = 0x448844;
      accentColor = 0x66AA66;
    }

    // Body
    gfx.fillStyle(bodyColor, 1);
    gfx.fillEllipse(0, 0, 25, 30);

    // Head
    gfx.fillStyle(accentColor, 1);
    gfx.fillCircle(0, -12, 10);

    // Eyes
    gfx.fillStyle(0xFF0000, 1);
    gfx.fillCircle(-4, -14, 3);
    gfx.fillCircle(4, -14, 3);

    // Shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(0, 15, 20, 8);

    return gfx;
  }

  private updateHealthBar(): void {
    this.healthBar.clear();

    const barWidth = 40;
    const barHeight = 6;
    const barY = -30;

    // Background (dark red)
    this.healthBar.fillStyle(0x440000, 1);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health (gradient based on health)
    const healthPercent = this.health / this.maxHealth;
    let healthColor = 0x00CC00; // Green
    if (healthPercent < 0.3) healthColor = 0xCC0000; // Red
    else if (healthPercent < 0.6) healthColor = 0xCCAA00; // Yellow

    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Border
    this.healthBar.lineStyle(1, 0x000000, 1);
    this.healthBar.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

    // Slow indicator
    if (this.slowAmount > 0) {
      this.healthBar.fillStyle(0x88CCFF, 0.8);
      this.healthBar.fillCircle(barWidth / 2 + 8, barY + barHeight / 2, 4);
    }
  }

  public update(delta: number): void {
    if (this.isDead) return;

    // Update slow effect
    if (this.slowDuration > 0) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) {
        this.slowAmount = 0;
        this.updateHealthBar();
      }
    }

    // Calculate effective speed (with slow)
    const effectiveSpeed = this.speed * (1 - this.slowAmount / 100);
    const moveDistance = (effectiveSpeed * delta) / 1000;

    // Move towards current waypoint
    const movement = this.moveTowardsWaypoint(moveDistance);

    // Apply movement
    this.x += movement.x;
    this.y += movement.y;

    // Face movement direction
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setFlipX(movement.x < 0);
    }

    // Update depth for Y-sorting
    this.setDepth(DEPTH_LAYERS.ENEMIES_BASE + this.y * 0.001);
  }

  /**
   * Move towards current waypoint, advancing when reached
   */
  private moveTowardsWaypoint(moveDistance: number): { x: number; y: number } {
    if (this.currentWaypointIndex >= this.waypoints.length) {
      return { x: 0, y: 0 };
    }

    const target = this.waypoints[this.currentWaypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if reached waypoint
    if (dist < 10) {
      this.currentWaypointIndex++;
      // Recurse to start moving towards next waypoint
      if (this.currentWaypointIndex < this.waypoints.length) {
        return this.moveTowardsWaypoint(moveDistance);
      }
      return { x: 0, y: 0 };
    }

    // Move towards waypoint
    return {
      x: (dx / dist) * moveDistance,
      y: (dy / dist) * moveDistance
    };
  }

  public hasReachedEnd(): boolean {
    // Reached end when past the last waypoint
    return this.currentWaypointIndex >= this.waypoints.length;
  }

  /**
   * Get the current waypoint index (progress along path)
   * Higher values = further along = closer to escaping
   */
  public getPathProgress(): number {
    return this.currentWaypointIndex;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.health -= amount;
    this.updateHealthBar();

    // Flash effect
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => {
        if (this.sprite?.active && this.sprite instanceof Phaser.GameObjects.Sprite) {
          this.sprite.clearTint();
        }
      });
    }

    // Hit spark effect
    ParticleEffects.createHitSpark(this.scene, this.x, this.y, 0xFF4500);

    if (this.health <= 0) {
      this.die();
    }
  }

  public applySlow(amount: number, duration: number): void {
    // Take the stronger slow
    if (amount > this.slowAmount) {
      this.slowAmount = amount;
    }
    // Extend duration
    this.slowDuration = Math.max(this.slowDuration, duration);
    this.updateHealthBar();

    // Visual feedback
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setTint(0x88CCFF);
      this.scene.time.delayedCall(200, () => {
        if (this.sprite?.active && this.sprite instanceof Phaser.GameObjects.Sprite && this.slowAmount > 0) {
          this.sprite.setTint(0xAADDFF);
        } else if (this.sprite instanceof Phaser.GameObjects.Sprite) {
          this.sprite.clearTint();
        }
      });
    }
  }

  private die(): void {
    this.isDead = true;

    // Create explosion effect
    ParticleEffects.createExplosion(this.scene, this.x, this.y, 0.8);

    // Create gold burst for reward
    ParticleEffects.createGoldBurst(this.scene, this.x, this.y, this.config.reward);

    // Simple fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 250,
      onComplete: () => {
        this.destroy();
      }
    });

    // Emit death event for reward
    this.scene.events.emit('enemyKilled', this);
  }

  public getReward(): number {
    return this.config.reward;
  }

  public getTags(): string[] {
    return this.config.tags;
  }

  public getEnemyTypes(): EnemyType[] {
    return this.config.enemyTypes || [];
  }
}
