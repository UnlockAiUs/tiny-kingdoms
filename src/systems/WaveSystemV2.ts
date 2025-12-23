import Phaser from 'phaser';
import { ENEMY_CONFIGS, EnemyConfig } from '../config/enemies.config';
import { EnemyType } from '../config/damage.config';
import { BOSS_SUPPORT_THEME, EARLY_WAVE_THEMES, WAVE_THEME_CYCLE, WaveTheme } from '../config/waves.config';
import { EnemyUnit } from '../entities/EnemyUnit';
import { PathSystem } from './PathSystem';

export interface WaveSystemV2Config {
  pathSystem: PathSystem;
  rewardMultiplier?: number;
  healthMultiplier?: number;
  countMultiplier?: number;
  speedMultiplier?: number;
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
  private enemyCountMultiplier: number = 1.0;
  private speedMultiplier: number = 1.0;

  constructor(scene: Phaser.Scene, config: WaveSystemV2Config) {
    this.scene = scene;
    this.pathSystem = config.pathSystem;
    this.rewardMultiplier = config.rewardMultiplier ?? 1.0;
    this.healthMultiplier = config.healthMultiplier ?? 1.0;
    this.enemyCountMultiplier = config.countMultiplier ?? 1.0;
    this.speedMultiplier = config.speedMultiplier ?? 1.0;

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
  private getWaveScaling(theme?: WaveTheme): {
    enemyCount: number;
    healthMultiplier: number;
    speedMultiplier: number;
    rewardMultiplier: number;
    spawnInterval: number;
  } {
    const wave = this.currentWave;

    // Enemy count increases with wave
    const baseCount = 5;
    const enemyCount = Math.floor((baseCount + wave * 1.5 + Math.log(wave + 1) * 3) * this.enemyCountMultiplier);

    // Health scales up each wave - also apply difficulty multiplier
    const healthMultiplier = (1 + (wave - 1) * 0.15 + Math.pow(wave / 10, 1.5)) * this.healthMultiplier;

    // Speed increases progressively (capped at +50%)
    const speedMultiplier = (1 + Math.min(wave * 0.04, 0.5)) * this.speedMultiplier;

    // Rewards scale with difficulty - apply difficulty multiplier
    const rewardGrowth = Math.min(1.25, 0.95 + Math.log(wave + 1) * 0.08);
    const rewardMultiplier = rewardGrowth * this.rewardMultiplier;

    // Spawn interval gets faster (enemies more staggered at start, tighter later)
    // Starts at 800ms, decreases to minimum 300ms
    let spawnInterval = Math.max(300, 800 - wave * 30);
    if (theme) {
      spawnInterval = Math.max(280, Math.round(spawnInterval * theme.spawnIntervalMultiplier));
    }

    return {
      enemyCount,
      healthMultiplier,
      speedMultiplier,
      rewardMultiplier,
      spawnInterval
    };
  }

  private getWaveTheme(availableTypes: string[], isBossWave: boolean): WaveTheme {
    if (isBossWave) {
      return BOSS_SUPPORT_THEME;
    }

    const earlyTheme = EARLY_WAVE_THEMES[this.currentWave];
    if (earlyTheme) {
      return earlyTheme;
    }

    const unlockTheme = this.getUnlockTheme(availableTypes);
    if (unlockTheme) {
      return unlockTheme;
    }

    const cycleIndex = Math.max(0, this.currentWave - 5) % WAVE_THEME_CYCLE.length;
    return WAVE_THEME_CYCLE[cycleIndex];
  }

  private getUnlockTheme(availableTypes: string[]): WaveTheme | null {
    const newlyUnlockedTypes = this.getNewEnemyTypesForWave();
    if (newlyUnlockedTypes.length === 0) {
      return null;
    }

    const strategicTypes = new Set<EnemyType>([
      EnemyType.FLYING,
      EnemyType.ARMORED,
      EnemyType.UNDEAD,
      EnemyType.CONSTRUCT,
      EnemyType.TANK,
      EnemyType.ELEMENTAL,
      EnemyType.AQUATIC,
      EnemyType.BEAST
    ]);

    const focusTypes = newlyUnlockedTypes.filter(type => strategicTypes.has(type));
    if (focusTypes.length === 0) {
      return null;
    }

    if (this.getEnemyPoolByTypes(availableTypes, focusTypes).length === 0) {
      return null;
    }

    return {
      id: 'new_threat',
      label: 'New Threat',
      focusTypes,
      supportTypes: [EnemyType.SWARM, EnemyType.HUMANOID, EnemyType.ARMORED],
      wildcardTypes: [EnemyType.TANK],
      focusRatio: 0.65,
      supportRatio: 0.25,
      wildcardRatio: 0.1,
      segmentCount: 3,
      spawnIntervalMultiplier: 1.0
    };
  }

  private getNewEnemyTypesForWave(): EnemyType[] {
    const types = new Set<EnemyType>();
    for (const config of Object.values(ENEMY_CONFIGS)) {
      if (config.unlockWave === this.currentWave) {
        for (const enemyType of config.enemyTypes ?? []) {
          if (enemyType !== EnemyType.BOSS) {
            types.add(enemyType);
          }
        }
      }
    }

    return Array.from(types);
  }

  private getEnemyPoolByTypes(availableTypes: string[], types: EnemyType[]): string[] {
    if (types.length === 0) {
      return [];
    }

    return availableTypes.filter(enemyId => {
      const config = ENEMY_CONFIGS[enemyId];
      if (!config) return false;
      return config.enemyTypes?.some(enemyType => types.includes(enemyType)) ?? false;
    });
  }

  private getSegmentCount(total: number, preferred: number): number {
    const dynamic = Math.floor(total / 8) + 1;
    return Math.max(1, Math.min(preferred, Math.min(4, dynamic)));
  }

  private allocateThemeCounts(total: number, theme: WaveTheme): {
    focusCount: number;
    supportCount: number;
    wildcardCount: number;
  } {
    const ratioTotal = theme.focusRatio + theme.supportRatio + theme.wildcardRatio;
    const focusRatio = ratioTotal > 0 ? theme.focusRatio / ratioTotal : 1;
    const supportRatio = ratioTotal > 0 ? theme.supportRatio / ratioTotal : 0;
    const wildcardRatio = ratioTotal > 0 ? theme.wildcardRatio / ratioTotal : 0;

    let focusCount = Math.floor(total * focusRatio);
    let supportCount = Math.floor(total * supportRatio);
    let wildcardCount = total - focusCount - supportCount;

    if (total > 0 && focusCount === 0) {
      focusCount = 1;
      wildcardCount = total - focusCount - supportCount;
    }

    if (wildcardCount < 0) {
      wildcardCount = 0;
      if (supportCount > 0) {
        supportCount = total - focusCount;
      } else {
        focusCount = total;
      }
    }

    return { focusCount, supportCount, wildcardCount };
  }

  private buildSequenceFromPool(pool: string[], count: number): string[] {
    if (pool.length === 0 || count <= 0) {
      return [];
    }

    const sequence: string[] = [];
    while (sequence.length < count) {
      const batch = Phaser.Utils.Array.Shuffle([...pool]);
      if (sequence.length > 0 && batch.length > 1 && sequence[sequence.length - 1] === batch[0]) {
        batch.push(batch.shift() as string);
      }
      sequence.push(...batch);
    }

    return sequence.slice(0, count);
  }

  private generateThemedComposition(count: number, availableTypes: string[], theme: WaveTheme): string[] {
    const basePool = availableTypes.length > 0 ? availableTypes : ['goblin'];
    const focusPool = this.getEnemyPoolByTypes(basePool, theme.focusTypes);
    const supportPool = this.getEnemyPoolByTypes(basePool, theme.supportTypes);
    const wildcardPool = this.getEnemyPoolByTypes(basePool, theme.wildcardTypes);

    const resolvedFocusPool = focusPool.length > 0 ? focusPool : basePool;
    const resolvedSupportPool = supportPool.length > 0 ? supportPool : resolvedFocusPool;
    const resolvedWildcardPool = wildcardPool.length > 0 ? wildcardPool : resolvedSupportPool;

    const { focusCount, supportCount, wildcardCount } = this.allocateThemeCounts(count, theme);
    const segmentCount = this.getSegmentCount(count, theme.segmentCount);

    // Build sequential segments to create recognizable wave phases.
    const segments: Array<{ pool: string[]; size: number }> = [];
    if (segmentCount <= 1) {
      segments.push({ pool: resolvedFocusPool, size: count });
    } else if (segmentCount === 2) {
      segments.push({ pool: resolvedFocusPool, size: focusCount });
      segments.push({ pool: resolvedSupportPool, size: count - focusCount });
    } else {
      const focusFirst = Math.ceil(focusCount / 2);
      const focusSecond = focusCount - focusFirst;
      const supportSize = supportCount + (segmentCount < 4 ? wildcardCount : 0);

      segments.push({ pool: resolvedFocusPool, size: focusFirst });
      if (supportSize > 0) {
        segments.push({ pool: resolvedSupportPool, size: supportSize });
      }
      if (segmentCount >= 4 && wildcardCount > 0) {
        segments.push({ pool: resolvedWildcardPool, size: wildcardCount });
      }
      if (focusSecond > 0) {
        segments.push({ pool: resolvedFocusPool, size: focusSecond });
      }
    }

    const composition: string[] = [];
    for (const segment of segments) {
      composition.push(...this.buildSequenceFromPool(segment.pool, segment.size));
    }

    if (composition.length < count) {
      composition.push(...this.buildSequenceFromPool(resolvedFocusPool, count - composition.length));
    }

    return composition.slice(0, count);
  }

  public startNextWave(gameSpeed: number = 1): boolean {
    if (this.waveInProgress) {
      return false;
    }

    this.currentWave++;
    this.waveInProgress = true;
    this.isSpawning = true;
    this.enemiesSpawnedThisWave = 0;

    const availableTypes = this.getAvailableEnemyTypes();
    const isBossWave = this.currentWave % 10 === 0 && this.currentWave > 0;
    const theme = this.getWaveTheme(availableTypes, isBossWave);
    const scaling = this.getWaveScaling(theme);

    this.scene.events.emit('waveStarted', this.currentWave, '∞');

    // Generate wave composition
    const waveComposition = this.generateWaveComposition(scaling.enemyCount, availableTypes, theme, isBossWave);

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

  private generateWaveComposition(
    count: number,
    availableTypes: string[],
    theme: WaveTheme,
    isBossWave: boolean
  ): string[] {
    const availableBosses = this.getAvailableBossTypes();

    if (isBossWave && availableBosses.length > 0) {
      const maxBosses = Math.max(1, Math.floor(this.currentWave / 25));
      const bossCount = Math.min(count, maxBosses);
      const bossType = Phaser.Math.RND.pick(availableBosses);

      const remaining = Math.max(0, count - bossCount);
      const supportComposition = this.generateThemedComposition(remaining, availableTypes, BOSS_SUPPORT_THEME);

      if (supportComposition.length === 0) {
        return Array.from({ length: bossCount }, () => bossType);
      }

      const spaced = [...supportComposition];
      const spacing = Math.max(1, Math.floor(spaced.length / (bossCount + 1)));
      for (let i = 0; i < bossCount; i++) {
        const insertAt = Math.min(spaced.length, spacing * (i + 1) + i);
        spaced.splice(insertAt, 0, bossType);
      }

      return spaced;
    }

    return this.generateThemedComposition(count, availableTypes, theme);
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
    const baseBonusGold = 12 + this.currentWave * 3 + Math.pow(this.currentWave, 1.1);
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
