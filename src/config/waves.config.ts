import { EnemyType } from './damage.config';

export interface WaveTheme {
  id: string;
  label: string;
  focusTypes: EnemyType[];
  supportTypes: EnemyType[];
  wildcardTypes: EnemyType[];
  focusRatio: number;
  supportRatio: number;
  wildcardRatio: number;
  segmentCount: number;
  spawnIntervalMultiplier: number;
}

export const EARLY_WAVE_THEMES: Record<number, WaveTheme> = {
  1: {
    id: 'intro_swarm',
    label: 'Intro Swarm',
    focusTypes: [EnemyType.SWARM],
    supportTypes: [EnemyType.HUMANOID],
    wildcardTypes: [],
    focusRatio: 0.85,
    supportRatio: 0.15,
    wildcardRatio: 0,
    segmentCount: 1,
    spawnIntervalMultiplier: 1.05
  },
  2: {
    id: 'swarm_mix',
    label: 'Swarm Mix',
    focusTypes: [EnemyType.SWARM],
    supportTypes: [EnemyType.ARMORED],
    wildcardTypes: [],
    focusRatio: 0.7,
    supportRatio: 0.3,
    wildcardRatio: 0,
    segmentCount: 2,
    spawnIntervalMultiplier: 1.0
  },
  3: {
    id: 'armored_check',
    label: 'Armored Check',
    focusTypes: [EnemyType.ARMORED],
    supportTypes: [EnemyType.SWARM],
    wildcardTypes: [],
    focusRatio: 0.6,
    supportRatio: 0.4,
    wildcardRatio: 0,
    segmentCount: 2,
    spawnIntervalMultiplier: 1.0
  },
  4: {
    id: 'flying_intro',
    label: 'Flying Intro',
    focusTypes: [EnemyType.FLYING],
    supportTypes: [EnemyType.SWARM],
    wildcardTypes: [],
    focusRatio: 0.55,
    supportRatio: 0.45,
    wildcardRatio: 0,
    segmentCount: 2,
    spawnIntervalMultiplier: 0.95
  }
};

export const WAVE_THEME_CYCLE: WaveTheme[] = [
  {
    id: 'swarm_pressure',
    label: 'Swarm Pressure',
    focusTypes: [EnemyType.SWARM],
    supportTypes: [EnemyType.HUMANOID],
    wildcardTypes: [EnemyType.ARMORED],
    focusRatio: 0.6,
    supportRatio: 0.2,
    wildcardRatio: 0.2,
    segmentCount: 3,
    spawnIntervalMultiplier: 0.92
  },
  {
    id: 'armored_push',
    label: 'Armored Push',
    focusTypes: [EnemyType.ARMORED],
    supportTypes: [EnemyType.HUMANOID],
    wildcardTypes: [EnemyType.TANK],
    focusRatio: 0.55,
    supportRatio: 0.2,
    wildcardRatio: 0.25,
    segmentCount: 3,
    spawnIntervalMultiplier: 1.05
  },
  {
    id: 'flying_strike',
    label: 'Flying Strike',
    focusTypes: [EnemyType.FLYING],
    supportTypes: [EnemyType.SWARM],
    wildcardTypes: [EnemyType.ARMORED],
    focusRatio: 0.55,
    supportRatio: 0.2,
    wildcardRatio: 0.25,
    segmentCount: 3,
    spawnIntervalMultiplier: 0.95
  },
  {
    id: 'undead_curse',
    label: 'Undead Curse',
    focusTypes: [EnemyType.UNDEAD],
    supportTypes: [EnemyType.ARMORED],
    wildcardTypes: [EnemyType.HUMANOID],
    focusRatio: 0.6,
    supportRatio: 0.2,
    wildcardRatio: 0.2,
    segmentCount: 3,
    spawnIntervalMultiplier: 1.0
  },
  {
    id: 'beast_tank',
    label: 'Beast Tank',
    focusTypes: [EnemyType.BEAST, EnemyType.TANK],
    supportTypes: [EnemyType.ARMORED],
    wildcardTypes: [EnemyType.SWARM],
    focusRatio: 0.55,
    supportRatio: 0.25,
    wildcardRatio: 0.2,
    segmentCount: 3,
    spawnIntervalMultiplier: 1.05
  },
  {
    id: 'construct_wall',
    label: 'Construct Wall',
    focusTypes: [EnemyType.CONSTRUCT],
    supportTypes: [EnemyType.TANK],
    wildcardTypes: [EnemyType.ARMORED],
    focusRatio: 0.55,
    supportRatio: 0.25,
    wildcardRatio: 0.2,
    segmentCount: 3,
    spawnIntervalMultiplier: 1.1
  },
  {
    id: 'elemental_surge',
    label: 'Elemental Surge',
    focusTypes: [EnemyType.ELEMENTAL, EnemyType.AQUATIC],
    supportTypes: [EnemyType.UNDEAD],
    wildcardTypes: [EnemyType.HUMANOID],
    focusRatio: 0.55,
    supportRatio: 0.2,
    wildcardRatio: 0.25,
    segmentCount: 3,
    spawnIntervalMultiplier: 0.98
  },
  {
    id: 'mixed_check',
    label: 'Mixed Check',
    focusTypes: [EnemyType.SWARM, EnemyType.ARMORED, EnemyType.FLYING],
    supportTypes: [EnemyType.UNDEAD, EnemyType.TANK],
    wildcardTypes: [EnemyType.HUMANOID],
    focusRatio: 0.5,
    supportRatio: 0.25,
    wildcardRatio: 0.25,
    segmentCount: 4,
    spawnIntervalMultiplier: 1.0
  }
];

export const BOSS_SUPPORT_THEME: WaveTheme = {
  id: 'boss_support',
  label: 'Boss Support',
  focusTypes: [EnemyType.TANK, EnemyType.ARMORED],
  supportTypes: [EnemyType.SWARM],
  wildcardTypes: [EnemyType.UNDEAD, EnemyType.HUMANOID],
  focusRatio: 0.5,
  supportRatio: 0.3,
  wildcardRatio: 0.2,
  segmentCount: 3,
  spawnIntervalMultiplier: 1.0
};
