import Phaser from 'phaser';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';
import { ParticleEffects } from '../systems/ParticleEffects';
import { calculateEffectiveDamage, EnemyType, getEffectivenessText } from '../config/damage.config';

// Generic interface for anything that can be a projectile target
export interface ProjectileTarget {
  x: number;
  y: number;
  active: boolean;
  takeDamage(amount: number): void;
  getEnemyTypes?(): EnemyType[];
}

export interface ProjectileConfig {
  spriteKey: string;
  speed: number;
  scale?: number;
  damage: number;
  towerId?: string; // Tower ID for damage type calculation
  trailColor?: number;
  enableTrail?: boolean;
}

export class Projectile extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
  private target: ProjectileTarget;
  private damage: number;
  private speed: number;
  private towerId?: string;
  private trailTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: ProjectileTarget,
    config: ProjectileConfig
  ) {
    super(scene, x, y);

    this.target = target;
    this.damage = config.damage;
    this.speed = config.speed;
    this.towerId = config.towerId;

    // Create sprite or fallback to simple shape
    if (scene.textures.exists(config.spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, config.spriteKey);
      this.sprite.setScale(config.scale || 0.5);
    } else {
      // Simple colored circle as fallback
      this.sprite = scene.add.arc(0, 0, 6, 0, 360, false, this.getProjectileColor(config.spriteKey));
    }
    this.add(this.sprite);

    this.setDepth(DEPTH_LAYERS.PROJECTILES);

    // Calculate initial rotation to face target
    this.updateRotation();

    // Add trail effect if enabled
    if (config.enableTrail !== false) {
      const trailColor = config.trailColor || this.getProjectileColor(config.spriteKey);
      this.trailTimer = ParticleEffects.createProjectileTrail(scene, this, trailColor);
    }

    scene.add.existing(this);
  }

  private getProjectileColor(spriteKey: string): number {
    switch (spriteKey) {
      case 'arrow': return 0x8B4513;
      case 'fireball': return 0xFF4500;
      case 'cannonball': return 0x333333;
      default: return 0xFFFF00;
    }
  }

  private updateRotation(): void {
    if (!this.target?.active) return;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      this.sprite.setRotation(angle);
    }
  }

  public update(delta: number): void {
    if (!this.active) return;

    // Check if target is still valid
    if (!this.target?.active) {
      this.destroy();
      return;
    }

    // Move towards target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Hit detection
    if (distance < 25) {
      this.hit();
      return;
    }

    // Move projectile
    const moveDistance = this.speed * (delta / 1000);
    const ratio = Math.min(moveDistance / distance, 1);

    this.x += dx * ratio;
    this.y += dy * ratio;

    // Update rotation to track target
    this.updateRotation();
  }

  private hit(): void {
    if (!this.active) return;

    // Apply damage to target with damage type calculation
    if (this.target?.active) {
      let effectiveDamage = this.damage;

      // Calculate effective damage based on tower type and enemy types
      if (this.towerId && this.target.getEnemyTypes) {
        const enemyTypes = this.target.getEnemyTypes();
        if (enemyTypes.length > 0) {
          effectiveDamage = calculateEffectiveDamage(this.damage, this.towerId, enemyTypes);

          // Show effectiveness indicator for significant differences
          const ratio = effectiveDamage / this.damage;
          if (this.scene && ratio !== 1) {
            const { color } = getEffectivenessText(ratio);
            if (ratio >= 1.4 || ratio <= 0.6) {
              // Show floating text for super effective or resisted
              this.showDamageIndicator(effectiveDamage, color, ratio >= 1.4);
            }
          }
        }
      }

      this.target.takeDamage(effectiveDamage);
    }

    // Impact ring effect
    if (this.scene) {
      ParticleEffects.createImpactRing(this.scene, this.x, this.y, 20);
    }

    this.destroy();
  }

  private showDamageIndicator(damage: number, color: number, isEffective: boolean): void {
    if (!this.scene) return;

    const text = this.scene.add.text(this.x, this.y - 20, `${damage}${isEffective ? '!' : ''}`, {
      fontSize: isEffective ? '14px' : '12px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`
    });
    text.setOrigin(0.5);
    text.setDepth(DEPTH_LAYERS.EFFECTS);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  public destroy(): void {
    // Clean up trail timer
    if (this.trailTimer) {
      this.trailTimer.remove();
      this.trailTimer = undefined;
    }

    super.destroy();
  }
}
