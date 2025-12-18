import { EnemyType } from './damage.config';

export interface EnemyConfig {
  id: string;
  name: string;
  spriteKey: string;
  health: number;
  speed: number; // pixels per second
  damage: number; // damage to base
  reward: number; // gold when killed
  scale?: number;
  // Enemy types for damage resistance/weakness system
  enemyTypes: EnemyType[];
  // Wave when this enemy is first introduced (milestone unlock)
  unlockWave: number;
  // Legacy tags for counter system (deprecated, use enemyTypes)
  tags: string[];
  // Animation keys
  animations: {
    walk: string;
    attack?: string;
    death?: string;
  };
  // Optional special abilities
  abilities?: {
    type: 'ranged' | 'aoe' | 'heal' | 'spawn' | 'shield';
    range?: number;
    cooldown?: number;
  };
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  // === TIER 1: SWARM (Waves 1-5) ===
  // Torch Goblin - basic swarm enemy, good for learning
  goblin: {
    id: 'goblin',
    name: 'Torch Goblin',
    spriteKey: 'torch_goblin',
    health: 40,
    speed: 45,
    damage: 1,
    reward: 8,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM],
    unlockWave: 1,
    tags: ['light', 'swarm'],
    animations: { walk: 'torch_goblin_walk' }
  },

  // TNT Goblin - fast swarm enemy
  tnt_runner: {
    id: 'tnt_runner',
    name: 'TNT Runner',
    spriteKey: 'tnt_goblin',
    health: 25,
    speed: 65,
    damage: 1,
    reward: 6,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM],
    unlockWave: 1,
    tags: ['fast', 'swarm', 'light'],
    animations: { walk: 'tnt_goblin_walk' }
  },

  // Shadow Goblin - sneaky swarm enemy (replaces glitchy Barrel Bomber)
  barrel_bomber: {
    id: 'barrel_bomber',
    name: 'Shadow Goblin',
    spriteKey: 'torch_goblin_purple',
    health: 35,
    speed: 55,
    damage: 1,
    reward: 7,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM],
    unlockWave: 2,
    tags: ['shadow', 'swarm'],
    animations: { walk: 'torch_goblin_purple_walk' }
  },

  // Red Pawn - basic humanoid with light armor
  footman: {
    id: 'footman',
    name: 'Red Footman',
    spriteKey: 'pawn_red',
    health: 30,
    speed: 48,
    damage: 1,
    reward: 7,
    scale: 0.5,
    enemyTypes: [EnemyType.HUMANOID, EnemyType.ARMORED],
    unlockWave: 2,
    tags: ['light', 'swarm'],
    animations: { walk: 'pawn_red_walk' }
  },

  // Color variants for visual variety
  goblin_blue: {
    id: 'goblin_blue',
    name: 'Frost Goblin',
    spriteKey: 'torch_goblin_blue',
    health: 45,
    speed: 42,
    damage: 1,
    reward: 9,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM],
    unlockWave: 3,
    tags: ['light', 'swarm', 'frost'],
    animations: { walk: 'torch_goblin_blue_walk' }
  },

  goblin_yellow: {
    id: 'goblin_yellow',
    name: 'Desert Goblin',
    spriteKey: 'torch_goblin_yellow',
    health: 50,
    speed: 40,
    damage: 1,
    reward: 10,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM],
    unlockWave: 4,
    tags: ['light', 'swarm'],
    animations: { walk: 'torch_goblin_yellow_walk' }
  },

  tnt_runner_blue: {
    id: 'tnt_runner_blue',
    name: 'Winged Runner',
    spriteKey: 'tnt_goblin_blue',
    health: 30,
    speed: 62,
    damage: 1,
    reward: 7,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM, EnemyType.FLYING],
    unlockWave: 3,
    tags: ['fast', 'swarm', 'flying'],
    animations: { walk: 'tnt_goblin_blue_walk' }
  },

  barrel_bomber_purple: {
    id: 'barrel_bomber_purple',
    name: 'Void Runner',
    spriteKey: 'tnt_goblin_purple',
    health: 45,
    speed: 50,
    damage: 1,
    reward: 10,
    scale: 0.5,
    enemyTypes: [EnemyType.SWARM, EnemyType.UNDEAD],
    unlockWave: 4,
    tags: ['shadow', 'undead'],
    animations: { walk: 'tnt_goblin_purple_walk' }
  },

  // === TIER 2: STANDARD (Waves 3-7) ===
  // Red Archer - ranged enemy, lightly armored with leather
  archer: {
    id: 'archer',
    name: 'Red Archer',
    spriteKey: 'archer_red',
    health: 55,
    speed: 35,
    damage: 1,
    reward: 12,
    scale: 0.5,
    enemyTypes: [EnemyType.HUMANOID, EnemyType.ARMORED],
    unlockWave: 3,
    tags: ['ranged', 'light'],
    animations: { walk: 'archer_red_walk' },
    abilities: { type: 'ranged', range: 150, cooldown: 2000 }
  },

  // Red Warrior - armored melee
  warrior: {
    id: 'warrior',
    name: 'Red Warrior',
    spriteKey: 'warrior_red',
    health: 70,
    speed: 38,
    damage: 1,
    reward: 14,
    scale: 0.5,
    enemyTypes: [EnemyType.ARMORED, EnemyType.HUMANOID],
    unlockWave: 3,
    tags: ['armored'],
    animations: { walk: 'warrior_red_walk' }
  },

  // Purple Pawn - fast rogue type with some undead shadow magic
  rogue: {
    id: 'rogue',
    name: 'Purple Rogue',
    spriteKey: 'pawn_purple',
    health: 45,
    speed: 58,
    damage: 2,
    reward: 15,
    scale: 0.5,
    enemyTypes: [EnemyType.HUMANOID, EnemyType.UNDEAD],
    unlockWave: 5,
    tags: ['fast', 'light'],
    animations: { walk: 'pawn_purple_walk' }
  },

  // Purple Warrior - undead knight style
  dark_knight: {
    id: 'dark_knight',
    name: 'Dark Knight',
    spriteKey: 'warrior_purple',
    health: 80,
    speed: 30,
    damage: 2,
    reward: 16,
    scale: 0.5,
    enemyTypes: [EnemyType.UNDEAD, EnemyType.ARMORED],
    unlockWave: 5,
    tags: ['armored', 'undead'],
    animations: { walk: 'warrior_purple_walk' }
  },

  // Yellow Warrior - tanky beast type
  berserker: {
    id: 'berserker',
    name: 'Yellow Berserker',
    spriteKey: 'warrior_yellow',
    health: 100,
    speed: 28,
    damage: 2,
    reward: 18,
    scale: 0.55,
    enemyTypes: [EnemyType.BEAST, EnemyType.TANK],
    unlockWave: 5,
    tags: ['armored', 'beast'],
    animations: { walk: 'warrior_yellow_walk' }
  },

  // === TIER 3: ELITE (Waves 8+) ===
  // Blue Warrior - elite construct tank (requires PHYSICAL damage!)
  iron_guard: {
    id: 'iron_guard',
    name: 'Iron Golem',
    spriteKey: 'warrior_blue',
    health: 150,
    speed: 20,
    damage: 2,
    reward: 22,
    scale: 0.55,
    enemyTypes: [EnemyType.CONSTRUCT, EnemyType.TANK],
    unlockWave: 8,
    tags: ['construct', 'shield'],
    animations: { walk: 'warrior_blue_walk' },
    abilities: { type: 'shield', cooldown: 5000 }
  },

  // Yellow Pawn - fast elite
  elite_scout: {
    id: 'elite_scout',
    name: 'Elite Scout',
    spriteKey: 'pawn_yellow',
    health: 90,
    speed: 40,
    damage: 2,
    reward: 18,
    scale: 0.5,
    enemyTypes: [EnemyType.ARMORED, EnemyType.HUMANOID],
    unlockWave: 8,
    tags: ['fast', 'armored'],
    animations: { walk: 'pawn_yellow_walk' }
  },

  // === TIER 4: CHAMPION (Waves 10+) ===
  // Purple Archer - void magic archer (pure elemental, no humanoid to dilute resistances)
  shadow_archer: {
    id: 'shadow_archer',
    name: 'Shadow Archer',
    spriteKey: 'archer_purple',
    health: 80,
    speed: 28,
    damage: 2,
    reward: 25,
    scale: 0.5,
    enemyTypes: [EnemyType.ELEMENTAL, EnemyType.UNDEAD],
    unlockWave: 10,
    tags: ['magic', 'ranged'],
    animations: { walk: 'archer_purple_walk' },
    abilities: { type: 'aoe', range: 120, cooldown: 3000 }
  },

  // Blue Archer - aquatic ranger (pure aquatic for strong ice weakness)
  frost_archer: {
    id: 'frost_archer',
    name: 'Frost Archer',
    spriteKey: 'archer_blue',
    health: 75,
    speed: 32,
    damage: 2,
    reward: 20,
    scale: 0.5,
    enemyTypes: [EnemyType.AQUATIC],
    unlockWave: 10,
    tags: ['ranged', 'frost'],
    animations: { walk: 'archer_blue_walk' },
    abilities: { type: 'ranged', range: 180, cooldown: 2500 }
  },

  // === TIER 5: BOSS (Milestone waves) ===
  // Boss - large warrior (scaled up)
  warlord: {
    id: 'warlord',
    name: 'Warlord',
    spriteKey: 'warrior_red',
    health: 400,
    speed: 18,
    damage: 5,
    reward: 60,
    scale: 0.85,
    enemyTypes: [EnemyType.BOSS, EnemyType.TANK],
    unlockWave: 10,
    tags: ['boss', 'armored'],
    animations: { walk: 'warrior_red_walk' }
  },

  // Boss - even larger dark knight with demonic power
  dark_lord: {
    id: 'dark_lord',
    name: 'Dark Lord',
    spriteKey: 'warrior_purple',
    health: 600,
    speed: 22,
    damage: 8,
    reward: 100,
    scale: 1.0,
    enemyTypes: [EnemyType.BOSS, EnemyType.DEMON, EnemyType.UNDEAD],
    unlockWave: 15,
    tags: ['boss', 'demon', 'undead'],
    animations: { walk: 'warrior_purple_walk' }
  }
};
