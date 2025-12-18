import Phaser from 'phaser';
import { DEPTH_LAYERS } from './DepthSortSystem';
import { GAME_CONFIG } from '../config/game.config';

/**
 * Particle Effects System for Tower Defense Game
 *
 * Provides easy-to-use static methods for creating visual effects throughout the game.
 * Handles automatic cleanup and supports multiple simultaneous effects.
 */
export class ParticleEffects {
  /**
   * Create an explosion effect using the Tiny Swords explosion sprite
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param scale Scale multiplier (default: 1)
   */
  public static createExplosion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    scale: number = 1
  ): void {
    // Use sprite-based explosion if available
    if (scene.textures.exists('explosion') && scene.anims.exists('explosion_anim')) {
      const explosion = scene.add.sprite(x, y, 'explosion');
      explosion.setScale(scale);
      explosion.setDepth(DEPTH_LAYERS.EFFECTS);
      explosion.play('explosion_anim');

      // Destroy when animation completes
      explosion.once('animationcomplete', () => {
        explosion.destroy();
      });
    } else {
      // Fallback to particle-based explosion
      this.createParticleExplosion(scene, x, y, scale);
    }

    // Add screen shake for large explosions
    if (scale >= 1.5) {
      this.shakeScreen(scene, 4, 200);
    }
  }

  /**
   * Create a particle-based explosion (fallback or additional effect)
   */
  private static createParticleExplosion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    scale: number
  ): void {
    const particleCount = Math.floor(15 * scale);
    const colors = [0xFF6B35, 0xF7931E, 0xFDC830, 0xFF4500];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 100;
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = (4 + Math.random() * 8) * scale;

      const particle = scene.add.circle(x, y, size, color);
      particle.setDepth(DEPTH_LAYERS.EFFECTS);

      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      scene.tweens.add({
        targets: particle,
        x: x + velocityX * scale,
        y: y + velocityY * scale,
        alpha: 0,
        scale: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Central flash
    const flash = scene.add.circle(x, y, 20 * scale, 0xFFFFFF, 0.8);
    flash.setDepth(DEPTH_LAYERS.EFFECTS);
    scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }

  /**
   * Create a fire effect at a position (e.g., for wizard tower)
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @returns The fire sprite (so caller can destroy it when needed)
   */
  public static createFireEffect(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Container {
    if (scene.textures.exists('fire') && scene.anims.exists('fire_anim')) {
      // Use animated fire sprite
      const fire = scene.add.sprite(x, y, 'fire');
      fire.setScale(0.8);
      fire.setDepth(DEPTH_LAYERS.EFFECTS);
      fire.play('fire_anim');
      return fire;
    } else {
      // Fallback to particle fire effect
      return this.createParticleFireEffect(scene, x, y);
    }
  }

  /**
   * Create a particle-based fire effect (fallback)
   */
  private static createParticleFireEffect(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    container.setDepth(DEPTH_LAYERS.EFFECTS);

    // Create fire particles that rise up
    const emitFire = () => {
      if (!container.active) return;

      const colors = [0xFF4500, 0xFF6B35, 0xFDC830];
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = 4 + Math.random() * 6;

      const particle = scene.add.circle(
        Math.random() * 20 - 10,
        0,
        size,
        color,
        0.8
      );
      container.add(particle);

      scene.tweens.add({
        targets: particle,
        y: -40 - Math.random() * 20,
        x: particle.x + (Math.random() * 20 - 10),
        alpha: 0,
        scale: 0.2,
        duration: 600 + Math.random() * 400,
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    };

    // Emit particles periodically
    const timer = scene.time.addEvent({
      delay: 100,
      callback: emitFire,
      loop: true
    });

    // Store timer for cleanup
    container.setData('fireTimer', timer);

    return container;
  }

  /**
   * Create hit spark effect when projectiles connect
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param color Color of the spark (default: yellow)
   */
  public static createHitSpark(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xFFFF00
  ): void {
    const sparkCount = 8;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount;
      const speed = 80 + Math.random() * 40;
      const size = 3 + Math.random() * 3;

      const spark = scene.add.circle(x, y, size, color);
      spark.setDepth(DEPTH_LAYERS.EFFECTS);

      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      scene.tweens.add({
        targets: spark,
        x: x + velocityX * 0.5,
        y: y + velocityY * 0.5,
        alpha: 0,
        scale: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => spark.destroy()
      });
    }

    // Central flash
    const flash = scene.add.circle(x, y, 15, 0xFFFFFF, 0.8);
    flash.setDepth(DEPTH_LAYERS.EFFECTS);
    scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }

  /**
   * Create a burst of gold coins when collecting gold
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param amount Number of coins to show
   */
  public static createGoldBurst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number
  ): void {
    // Determine coin count based on amount (more gold = more coins)
    const coinCount = Math.min(3 + Math.floor(amount / 5), 12);

    for (let i = 0; i < coinCount; i++) {
      const angle = (Math.PI * 2 * i) / coinCount + Math.random() * 0.3;
      const distance = 30 + Math.random() * 20;
      const delay = i * 30;

      // Create coin visual
      let coin: Phaser.GameObjects.GameObject;

      if (scene.textures.exists('gold_icon')) {
        // Use actual gold icon if available
        const goldSprite = scene.add.image(x, y, 'gold_icon');
        goldSprite.setScale(0.5);
        goldSprite.setDepth(DEPTH_LAYERS.EFFECTS);
        coin = goldSprite;
      } else {
        // Fallback to colored circle
        const goldCircle = scene.add.circle(x, y, 6, 0xFFD700);
        goldCircle.setDepth(DEPTH_LAYERS.EFFECTS);
        coin = goldCircle;
      }

      // Animate coin burst
      scene.tweens.add({
        targets: coin,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 30,
        alpha: { from: 1, to: 0 },
        scale: { from: 0.5, to: 1.2 },
        duration: 600,
        delay: delay,
        ease: 'Power2',
        onComplete: () => (coin as any).destroy()
      });
    }

    // Gold amount text
    const goldText = scene.add.text(x, y - 20, `+${amount}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    goldText.setDepth(DEPTH_LAYERS.EFFECTS);

    scene.tweens.add({
      targets: goldText,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => goldText.destroy()
    });
  }

  /**
   * Create a trail effect that follows a projectile
   * @param scene The Phaser scene
   * @param projectile The projectile game object to follow
   * @param color Color of the trail particles
   * @returns A timer event (can be removed when projectile is destroyed)
   */
  public static createProjectileTrail(
    scene: Phaser.Scene,
    projectile: Phaser.GameObjects.GameObject,
    color: number = 0xFFFFFF
  ): Phaser.Time.TimerEvent {
    const emitTrail = () => {
      if (!projectile.active) return;

      const x = (projectile as any).x;
      const y = (projectile as any).y;

      // Create small trail particle
      const particle = scene.add.circle(x, y, 3, color, 0.6);
      particle.setDepth(DEPTH_LAYERS.PROJECTILES - 1);

      scene.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    };

    // Emit trail particle every 50ms
    return scene.time.addEvent({
      delay: 50,
      callback: emitTrail,
      loop: true
    });
  }

  /**
   * Create a muzzle flash effect when towers fire
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param angle Direction of the shot in radians
   */
  public static createMuzzleFlash(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number = 0
  ): void {
    // Flash circle
    const flash = scene.add.circle(x, y, 12, 0xFFFFAA, 0.9);
    flash.setDepth(DEPTH_LAYERS.EFFECTS);

    scene.tweens.add({
      targets: flash,
      scale: { from: 1, to: 2 },
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Directional particles
    for (let i = 0; i < 5; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 40;
      const size = 3 + Math.random() * 2;

      const particle = scene.add.circle(x, y, size, 0xFFCC66, 0.8);
      particle.setDepth(DEPTH_LAYERS.EFFECTS);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(spreadAngle) * speed,
        y: y + Math.sin(spreadAngle) * speed,
        alpha: 0,
        scale: 0,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Shake the screen for dramatic moments
   * @param scene The Phaser scene
   * @param intensity Shake intensity in pixels (default: 5)
   * @param duration Duration in milliseconds (default: 300)
   */
  public static shakeScreen(
    scene: Phaser.Scene,
    intensity: number = 5,
    duration: number = 300
  ): void {
    // Respect the config setting
    if (!GAME_CONFIG.ENABLE_SCREEN_SHAKE) return;

    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(duration, intensity / 1000);
    }
  }

  /**
   * Create dust/smoke puff effect (useful for enemy spawn, tower placement, etc.)
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param color Color of the puff (default: gray smoke)
   */
  public static createDustPuff(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0x999999
  ): void {
    const puffCount = 6;

    for (let i = 0; i < puffCount; i++) {
      const angle = (Math.PI * 2 * i) / puffCount;
      const distance = 20 + Math.random() * 10;
      const size = 8 + Math.random() * 8;
      const delay = i * 40;

      const puff = scene.add.circle(x, y, size, color, 0.5);
      puff.setDepth(DEPTH_LAYERS.EFFECTS);

      scene.tweens.add({
        targets: puff,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 20,
        alpha: 0,
        scale: 2,
        duration: 500 + Math.random() * 200,
        delay: delay,
        ease: 'Power2',
        onComplete: () => puff.destroy()
      });
    }
  }

  /**
   * Create an impact crater/ring effect
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   * @param size Size of the crater (default: 30)
   */
  public static createImpactRing(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number = 30
  ): void {
    const ring = scene.add.circle(x, y, size / 2, 0x000000, 0);
    ring.setStrokeStyle(3, 0xFFFFFF, 0.8);
    ring.setDepth(DEPTH_LAYERS.EFFECTS);

    scene.tweens.add({
      targets: ring,
      scale: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });
  }

  /**
   * Create level up / power up effect
   * @param scene The Phaser scene
   * @param x X position
   * @param y Y position
   */
  public static createLevelUpEffect(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): void {
    // Rising particles
    const particleCount = 12;
    const colors = [0xFFD700, 0xFFA500, 0xFFFF00];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = 20;
      const delay = i * 50;
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = scene.add.circle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        5,
        color,
        0.9
      );
      particle.setDepth(DEPTH_LAYERS.EFFECTS);

      scene.tweens.add({
        targets: particle,
        y: y - 80,
        alpha: 0,
        scale: 1.5,
        duration: 800,
        delay: delay,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Central burst
    const burst = scene.add.circle(x, y, 15, 0xFFFF00, 0.8);
    burst.setDepth(DEPTH_LAYERS.EFFECTS);
    scene.tweens.add({
      targets: burst,
      scale: 3,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => burst.destroy()
    });
  }

  /**
   * Create a persistent upgrade aura effect around a tower
   * Spawns subtle floating sparkles periodically
   * @param scene The Phaser scene
   * @param target Object with x, y position to follow
   * @param level Tower level (affects particle intensity)
   * @returns Timer event that can be destroyed when tower is removed
   */
  public static createUpgradeAura(
    scene: Phaser.Scene,
    target: { x: number; y: number },
    level: number
  ): Phaser.Time.TimerEvent {
    const colors = [0xFFD700, 0xFFFFFF, 0xFFF8DC]; // Gold, white, cream
    const particlesPerSpawn = level >= 3 ? 2 : 1; // More particles at max level
    const spawnInterval = level >= 3 ? 400 : 500; // Faster at max level

    const emitSparkle = () => {
      if (!scene || !scene.tweens) return;

      for (let i = 0; i < particlesPerSpawn; i++) {
        // Random position around the tower
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 30 - 20; // Bias upward
        const color = Phaser.Utils.Array.GetRandom(colors);
        const size = 2 + Math.random() * 2;

        const sparkle = scene.add.circle(
          target.x + offsetX,
          target.y + offsetY,
          size,
          color,
          0.7
        );
        sparkle.setDepth(DEPTH_LAYERS.EFFECTS);

        // Float upward and fade
        scene.tweens.add({
          targets: sparkle,
          y: sparkle.y - 30 - Math.random() * 20,
          x: sparkle.x + (Math.random() - 0.5) * 15,
          alpha: 0,
          scale: 0.3,
          duration: 800 + Math.random() * 400,
          ease: 'Power1',
          onComplete: () => sparkle.destroy()
        });
      }
    };

    // Start emitting sparkles periodically
    return scene.time.addEvent({
      delay: spawnInterval,
      callback: emitSparkle,
      loop: true
    });
  }

  /**
   * Create a healing/buff effect
   * @param scene The Phaser scene
   * @param target The game object to apply the effect to
   * @param duration Duration of the effect in milliseconds
   */
  public static createHealEffect(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration: number = 1000
  ): void {
    const x = (target as any).x;
    const y = (target as any).y;

    // Green sparkles rising
    const emitHeal = () => {
      if (!target.active) return;

      const offsetX = Math.random() * 30 - 15;
      const offsetY = Math.random() * 30 - 15;

      const sparkle = scene.add.circle(x + offsetX, y + offsetY, 4, 0x00FF00, 0.8);
      sparkle.setDepth(DEPTH_LAYERS.EFFECTS);

      scene.tweens.add({
        targets: sparkle,
        y: sparkle.y - 40,
        alpha: 0,
        duration: 600,
        ease: 'Power1',
        onComplete: () => sparkle.destroy()
      });
    };

    // Emit sparkles during duration
    let elapsed = 0;
    const interval = 100;
    const timer = scene.time.addEvent({
      delay: interval,
      callback: () => {
        emitHeal();
        elapsed += interval;
        if (elapsed >= duration) {
          timer.remove();
        }
      },
      loop: true
    });
  }

  /**
   * Cleanup helper - destroy fire effects properly
   * @param fireEffect The fire effect returned from createFireEffect
   */
  public static destroyFireEffect(
    fireEffect: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container
  ): void {
    if (fireEffect instanceof Phaser.GameObjects.Container) {
      // Stop the particle emission timer
      const timer = fireEffect.getData('fireTimer') as Phaser.Time.TimerEvent;
      if (timer) {
        timer.remove();
      }
    }
    fireEffect.destroy();
  }
}
