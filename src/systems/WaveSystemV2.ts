import Phaser from 'phaser';
import { ENEMY_CONFIGS, EnemyConfig } from '../config/enemies.config';
import { EnemyType } from '../config/damage.config';
import { EnemyUnit } from '../entities/EnemyUnit';
import { PathSystem } from './PathSystem';

export interface WaveSystemV2Config {
  pathSystem: PathSystem;
  rewardMultiplier?: number;
  healthMultiplier?: number;
}

/**
 * Wave System V2 - Simple staggered enemy spawning
 *
 * Enemies spawn at regular intervals, following the path independently.
 * Speed increases with wave level.
 */
export class WaveSystemV2 {
  private scene: Phaser.Scene;
  private pathSystem: PathSystem;
  private enemies: EnemyUnit[] = [];
  private currentWave: number = 0;
  private isSpawning: boolean = false;
  private waveInProgress: boolean = false;
  private spawnTimers: Phaser.Time.TimerEvent[] = [];
  private enemiesSpawnedThisWave: number = 0;

  // Enemy type pool - unlocks more as waves progress
  private enemyTypes: string[] = [];

  // Difficulty multipliers
  private rewardMultiplier: number = 1.0;
  private healthMultiplier: number = 1.0;

  constructor(scene: Phaser.Scene, config: WaveSystemV2Config) {
    this.scene = scene;
    this.pathSystem = config.pathSystem;
    this.rewardMultiplier = config.rewardMultiplier ?? 1.0;
    this.healthMultiplier = config.healthMultiplier ?? 1.0;

    // Initialize enemy types from config
    this.enemyTypes = Object.keys(ENEMY_CONFIGS);
  }

  /**
   * Get available enemy types for current wave based on unlockWave config
   */
  private getAvailableEnemyTypes(): string[] {
    const wave = this.currentWave;
    const available: string[] = [];

    // Filter enemies by their unlockWave property
    for (const enemyId of this.enemyTypes) {
      const config = ENEMY_CONFIGS[enemyId];
      if (config && config.unlockWave <= wave) {
        // Exclude bosses from regular spawn pool (handled separately)
        const isBoss = config.enemyTypes?.some(t => t === 'boss');
        if (!isBoss) {
          available.push(enemyId);
        }
      }
    }

    // Fallback if no enemies available (goblin is the torch_goblin enemy)
    if (available.length === 0) {
      return ['goblin'];
    }

    return available;
  }

  /**
   * Get available boss types for current wave
   */
  private getAvailableBossTypes(): string[] {
    const wave = this.currentWave;
    const available: string[] = [];

    for (const enemyId of this.enemyTypes) {
      const config = ENEMY_CONFIGS[enemyId];
      if (config && config.unlockWave <= wave) {
        const isBoss = config.enemyTypes?.some(t => t === 'boss');
        if (isBoss) {
          available.push(enemyId);
        }
      }
    }

    return available;
  }

  /**
   * Calculate wave difficulty scaling
   */
  private getWaveScaling(): {
    enemyCount: number;
    healthMultiplier: number;
    speedMultiplier: number;
    rewardMultiplier: number;
    spawnInterval: number;
  } {
    const wave = this.currentWave;

    // Enemy count increases with wave
    const baseCount = 5;
    const enemyCount = Math.floor(baseCount + wave * 1.5 + Math.log(wave + 1) * 3);

    // Health scales up each wave - also apply difficulty multiplier
    const healthMultiplier = (1 + (wave - 1) * 0.15 + Math.pow(wave / 10, 1.5)) * this.healthMultiplier;

    // Speed increases progressively (capped at +50%)
    const speedMultiplier = 1 + Math.min(wave * 0.04, 0.5);

    // Rewards scale with difficulty - apply difficulty multiplier
    const rewardMultiplier = (1 + (wave - 1) * 0.1) * this.rewardMultiplier;

    // Spawn interval gets faster (enemies more staggered at start, tighter later)
    // Starts at 800ms, decreases to minimum 300ms
    const spawnInterval = Math.max(300, 800 - wave * 30);

    return {
      enemyCount,
      healthMultiplier,
      speedMultiplier,
      rewardMultiplier,
      spawnInterval
    };
  }

  public startNextWave(gameSpeed: number = 1): boolean {
    if (this.waveInProgress) {
      return false;
    }

    this.currentWave++;
    this.waveInProgress = true;
    this.isSpawning = true;
    this.enemiesSpawnedThisWave = 0;

    const scaling = this.getWaveScaling();

    this.scene.events.emit('waveStarted', this.currentWave, '∞');

    // Generate wave composition
    const availableTypes = this.getAvailableEnemyTypes();
    const waveComposition = this.generateWaveComposition(scaling.enemyCount, availableTypes);

    // Spawn enemies at regular intervals (staggered)
    // IMPORTANT: Divide by gameSpeed so spawns happen at correct game-time intervals
    waveComposition.forEach((enemyType, index) => {
      const spawnDelay = (index * scaling.spawnInterval) / gameSpeed;

      const timer = this.scene.time.delayedCall(spawnDelay, () => {
        this.spawnEnemy(enemyType, scaling);
        this.enemiesSpawnedThisWave++;
      });

      this.spawnTimers.push(timer);
    });

    // Mark spawning complete after last enemy
    const totalSpawnTime = ((waveComposition.length - 1) * scaling.spawnInterval + 500) / gameSpeed;
    this.scene.time.delayedCall(totalSpawnTime, () => {
      this.isSpawning = false;
    });

    return true;
  }

  private generateWaveComposition(count: number, availableTypes: string[]): string[] {
    const composition: string[] = [];

    // Boss waves every 10 waves (10, 20, 30, etc.)
    const isBossWave = this.currentWave % 10 === 0 && this.currentWave > 0;
    const availableBosses = this.getAvailableBossTypes();

    if (isBossWave && availableBosses.length > 0) {
      // Boss waves: add boss(es) plus support enemies
      const bossCount = Math.max(1, Math.floor(this.currentWave / 25)); // More bosses at higher waves
      const bossType = Phaser.Math.RND.pick(availableBosses);

      for (let i = 0; i < bossCount; i++) {
        composition.push(bossType);
      }

      // Fill remaining slots with regular enemies
      const remaining = count - bossCount;
      for (let i = 0; i < remaining; i++) {
        composition.push(Phaser.Math.RND.pick(availableTypes));
      }
    } else {
      // Normal waves: random mix of available types
      for (let i = 0; i < count; i++) {
        composition.push(Phaser.Math.RND.pick(availableTypes));
      }
    }

    // Shuffle for variety
    Phaser.Utils.Array.Shuffle(composition);

    return composition;
  }

  private spawnEnemy(
    type: string,
    scaling: { healthMultiplier: number; speedMultiplier: number; rewardMultiplier: number }
  ): void {
    const baseConfig = ENEMY_CONFIGS[type];
    if (!baseConfig) {
      this.spawnFallbackEnemy(scaling);
      return;
    }

    // Apply scaling
    const scaledConfig: EnemyConfig = {
      ...baseConfig,
      health: Math.floor(baseConfig.health * scaling.healthMultiplier),
      speed: Math.floor(baseConfig.speed * scaling.speedMultiplier),
      reward: Math.floor(baseConfig.reward * scaling.rewardMultiplier)
    };

    // All enemies spawn at the same position (start of path)
    const spawnPos = this.pathSystem.getSpawnPosition();

    const enemy = new EnemyUnit(
      this.scene,
      scaledConfig,
      this.pathSystem,
      spawnPos.x,
      spawnPos.y
    );

    this.enemies.push(enemy);
    this.scene.events.emit('enemySpawned', enemy);
  }

  private spawnFallbackEnemy(
    scaling: { healthMultiplier: number; speedMultiplier: number; rewardMultiplier: number }
  ): void {
    const fallbackConfig: EnemyConfig = {
      id: 'fallback',
      name: 'Torch Goblin',
      spriteKey: 'torch_goblin',
      health: Math.floor(30 * scaling.healthMultiplier),
      speed: Math.floor(80 * scaling.speedMultiplier),
      damage: 1,
      reward: Math.floor(10 * scaling.rewardMultiplier),
      scale: 0.5,
      enemyTypes: [EnemyType.SWARM, EnemyType.HUMANOID],
      unlockWave: 1,
      tags: ['light', 'swarm'],
      animations: {
        walk: 'torch_goblin_walk'
      }
    };

    const spawnPos = this.pathSystem.getSpawnPosition();

    const enemy = new EnemyUnit(
      this.scene,
      fallbackConfig,
      this.pathSystem,
      spawnPos.x,
      spawnPos.y
    );

    this.enemies.push(enemy);
    this.scene.events.emit('enemySpawned', enemy);
  }

  public update(delta: number): void {
    // Update all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isDead || !enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }

      enemy.update(delta);

      // Check if enemy reached the end
      if (enemy.hasReachedEnd()) {
        this.scene.events.emit('enemyReachedBase', enemy);
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }

    // Check if wave is complete
    if (this.waveInProgress && !this.isSpawning && this.enemies.length === 0) {
      this.waveComplete();
    }
  }

  private waveComplete(): void {
    this.waveInProgress = false;

    // Apply difficulty reward multiplier to wave completion bonus
    const baseBonusGold = 20 + this.currentWave * 5 + Math.pow(this.currentWave, 1.2);
    const bonusGold = Math.floor(baseBonusGold * this.rewardMultiplier);

    this.scene.events.emit('waveComplete', this.currentWave + 1, bonusGold);
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public getTotalWaves(): string {
    return '∞';
  }

  public isWaveInProgress(): boolean {
    return this.waveInProgress;
  }

  public getEnemies(): EnemyUnit[] {
    return this.enemies;
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }

  public clear(): void {
    this.spawnTimers.forEach(timer => timer.destroy());
    this.spawnTimers = [];

    this.enemies.forEach(enemy => enemy.destroy());
    this.enemies = [];

    this.waveInProgress = false;
    this.isSpawning = false;
  }

  /**
   * Pause all spawn timers - call when game is paused
   */
  public pauseSpawning(): void {
    this.spawnTimers.forEach(timer => {
      if (timer && !timer.hasDispatched) {
        timer.paused = true;
      }
    });
  }

  /**
   * Resume all spawn timers - call when game is unpaused
   */
  public resumeSpawning(): void {
    this.spawnTimers.forEach(timer => {
      if (timer && !timer.hasDispatched) {
        timer.paused = false;
      }
    });
  }
}
