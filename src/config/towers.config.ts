import { DamageType } from './damage.config';

export interface TowerConfig {
  id: string;
  name: string;
  nickname: string; // Short name for card display when not featured
  description: string;
  role: string;
  spriteKey: string;
  iconKey: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number; // ms between shots
  projectileSpeed: number;
  projectileKey: string;
  scale?: number;
  // Damage type(s) this tower deals
  damageType: DamageType;
  secondaryDamageType?: DamageType;
  // Visual customization
  tint?: number;
  // What this tower is strong/weak against (enemy types)
  strongAgainst: string[];
  weakAgainst: string[];
  // Special abilities
  special?: {
    type: 'splash' | 'slow' | 'dot' | 'critical' | 'multishot' | 'armor_shred' | 'fear' | 'damage_amp' | 'freeze';
    value: number; // splash radius, slow %, dot damage/tick, crit chance, projectile count, armor reduction %, fear duration, damage amp %
    duration?: number; // ms
    secondaryValue?: number; // for effects with two values (e.g., freeze chance + slow)
  };
  // Upgrade info
  upgrades: TowerUpgrade[];
  // Tier for unlock order
  tier: 1 | 2 | 3;
}

export interface TowerUpgrade {
  level: number;
  cost: number;
  damageBonus: number;
  rangeBonus: number;
  fireRateBonus: number; // negative = faster
  specialBonus?: number;
}

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  // === TIER 1: EARLY GAME (50-80 gold) ===

  ember_watch: {
    id: 'ember_watch',
    name: 'Ember Watch',
    nickname: 'Ember',
    description: 'Fast attacks with burning arrows. Ignites enemies for damage over time.',
    role: 'Fast single-target DPS',
    spriteKey: 'tower_ember_watch',
    iconKey: 'tower_ember_watch',
    cost: 50,
    damage: 15,
    range: 180,
    fireRate: 600, // Fast fire rate
    projectileSpeed: 500,
    projectileKey: 'ammo_flaming_arrow',
    scale: 0.45,
    damageType: DamageType.FIRE,
    strongAgainst: ['swarm', 'beast', 'undead'],
    weakAgainst: ['demon', 'dragon', 'construct'],
    special: {
      type: 'dot',
      value: 5, // 5 damage per tick
      duration: 3000 // 3 seconds burn
    },
    tier: 1,
    upgrades: [
      { level: 2, cost: 40, damageBonus: 5, rangeBonus: 15, fireRateBonus: -50, specialBonus: 2 },
      { level: 3, cost: 80, damageBonus: 10, rangeBonus: 25, fireRateBonus: -100, specialBonus: 4 }
    ]
  },

  rockbound_bastion: {
    id: 'rockbound_bastion',
    name: 'Rockbound Bastion',
    nickname: 'Bastion',
    description: 'Hurls massive boulders that deal splash damage and slow enemies.',
    role: 'Area damage / construct killer',
    spriteKey: 'tower_rockbound_bastion',
    iconKey: 'tower_rockbound_bastion',
    cost: 75,
    damage: 25,
    range: 160,
    fireRate: 1800, // Slow but powerful
    projectileSpeed: 280,
    projectileKey: 'ammo_boulder',
    scale: 0.45,
    damageType: DamageType.PHYSICAL,
    strongAgainst: ['swarm', 'construct'],
    weakAgainst: ['armored', 'elemental'],
    special: {
      type: 'splash',
      value: 70, // 70px splash radius
      secondaryValue: 25 // 25% slow on hit
    },
    tier: 1,
    upgrades: [
      { level: 2, cost: 55, damageBonus: 10, rangeBonus: 15, fireRateBonus: -150, specialBonus: 15 },
      { level: 3, cost: 110, damageBonus: 18, rangeBonus: 25, fireRateBonus: -250, specialBonus: 25 }
    ]
  },

  frostcoil_tower: {
    id: 'frostcoil_tower',
    name: 'Frostcoil Tower',
    nickname: 'Frostcoil',
    description: 'Shoots freezing bolts that slow enemies and can briefly freeze them solid.',
    role: 'Slow / control',
    spriteKey: 'tower_frostcoil',
    iconKey: 'tower_frostcoil',
    cost: 70,
    damage: 10,
    range: 150,
    fireRate: 1200,
    projectileSpeed: 380,
    projectileKey: 'ammo_ice_bolt',
    scale: 0.45,
    damageType: DamageType.ICE,
    strongAgainst: ['demon', 'dragon', 'aquatic', 'flying'],
    weakAgainst: ['undead', 'construct'],
    special: {
      type: 'freeze',
      value: 50, // 50% slow
      duration: 2500, // 2.5 seconds
      secondaryValue: 15 // 15% chance to freeze for 1 second
    },
    tier: 1,
    upgrades: [
      { level: 2, cost: 50, damageBonus: 5, rangeBonus: 15, fireRateBonus: -100, specialBonus: 10 },
      { level: 3, cost: 100, damageBonus: 8, rangeBonus: 25, fireRateBonus: -200, specialBonus: 15 }
    ]
  },

  // === TIER 2: MID GAME (100-150 gold) ===

  sunflare_cannon: {
    id: 'sunflare_cannon',
    name: 'Sunflare Cannon',
    nickname: 'Sunflare',
    description: 'Launches radiant fire shells. Devastating against undead and demons.',
    role: 'Heavy burst damage',
    spriteKey: 'tower_sunflare_cannon',
    iconKey: 'tower_sunflare_cannon',
    cost: 120,
    damage: 55,
    range: 170,
    fireRate: 2400, // Slow but devastating
    projectileSpeed: 320,
    projectileKey: 'ammo_fire_shell',
    scale: 0.45,
    damageType: DamageType.LIGHT,
    secondaryDamageType: DamageType.FIRE,
    strongAgainst: ['undead', 'demon', 'humanoid', 'elemental'],
    weakAgainst: ['dragon', 'construct'],
    special: {
      type: 'splash',
      value: 45 // 45px blast radius
    },
    tier: 2,
    upgrades: [
      { level: 2, cost: 85, damageBonus: 20, rangeBonus: 15, fireRateBonus: -200, specialBonus: 10 },
      { level: 3, cost: 170, damageBonus: 35, rangeBonus: 25, fireRateBonus: -350, specialBonus: 20 }
    ]
  },

  ironspike_launcher: {
    id: 'ironspike_launcher',
    name: 'Ironspike Launcher',
    nickname: 'Ironspike',
    description: 'Fires brutal spiked projectiles that shred armor, reducing enemy defense.',
    role: 'Armor shred',
    spriteKey: 'tower_ironspike_launcher',
    iconKey: 'tower_ironspike_launcher',
    cost: 100,
    damage: 30,
    range: 155,
    fireRate: 1400,
    projectileSpeed: 420,
    projectileKey: 'ammo_spiked_ball',
    scale: 0.45,
    damageType: DamageType.PIERCE,
    secondaryDamageType: DamageType.PHYSICAL,
    strongAgainst: ['armored', 'flying', 'dragon', 'humanoid'],
    weakAgainst: ['elemental', 'swarm'],
    special: {
      type: 'armor_shred',
      value: 30, // 30% armor reduction
      duration: 5000 // 5 seconds
    },
    tier: 2,
    upgrades: [
      { level: 2, cost: 70, damageBonus: 12, rangeBonus: 15, fireRateBonus: -100, specialBonus: 10 },
      { level: 3, cost: 140, damageBonus: 20, rangeBonus: 25, fireRateBonus: -200, specialBonus: 15 }
    ]
  },

  pyrehold: {
    id: 'pyrehold',
    name: 'Pyrehold',
    nickname: 'Pyre',
    description: 'Launches rolling fireballs that burn enemies over time. Strong lane denial.',
    role: 'Sustained AoE damage',
    spriteKey: 'tower_pyrehold',
    iconKey: 'tower_pyrehold',
    cost: 110,
    damage: 20,
    range: 165,
    fireRate: 1600,
    projectileSpeed: 300,
    projectileKey: 'ammo_fireball',
    scale: 0.45,
    damageType: DamageType.FIRE,
    secondaryDamageType: DamageType.PHYSICAL,
    strongAgainst: ['swarm', 'beast', 'undead'],
    weakAgainst: ['demon', 'dragon'],
    special: {
      type: 'dot',
      value: 8, // 8 damage per tick
      duration: 4000, // 4 seconds burn
      secondaryValue: 50 // 50px burn radius (hits nearby enemies)
    },
    tier: 2,
    upgrades: [
      { level: 2, cost: 75, damageBonus: 8, rangeBonus: 15, fireRateBonus: -150, specialBonus: 3 },
      { level: 3, cost: 150, damageBonus: 15, rangeBonus: 25, fireRateBonus: -250, specialBonus: 5 }
    ]
  },

  // === TIER 3: LATE GAME / SPECIALIST (150-200 gold) ===

  void_obelisk: {
    id: 'void_obelisk',
    name: 'Void Obelisk',
    nickname: 'Void',
    description: 'Channels void energy that disrupts magical creatures and amplifies damage.',
    role: 'Magic damage / debuffs',
    spriteKey: 'tower_void_obelisk',
    iconKey: 'tower_void_obelisk',
    cost: 160,
    damage: 22,
    range: 175,
    fireRate: 1100,
    projectileSpeed: 450,
    projectileKey: 'ammo_arcane_bolt',
    scale: 0.45,
    damageType: DamageType.VOID,
    strongAgainst: ['elemental', 'tank', 'boss'],
    weakAgainst: ['undead', 'demon', 'construct'],
    special: {
      type: 'damage_amp',
      value: 25, // 25% more damage from all sources
      duration: 4000 // 4 seconds
    },
    tier: 3,
    upgrades: [
      { level: 2, cost: 110, damageBonus: 10, rangeBonus: 20, fireRateBonus: -100, specialBonus: 8 },
      { level: 3, cost: 220, damageBonus: 18, rangeBonus: 30, fireRateBonus: -150, specialBonus: 12 }
    ]
  },

  stone_mortar: {
    id: 'stone_mortar',
    name: 'Stone Mortar',
    nickname: 'Mortar',
    description: 'Fires heavy cannonballs over extreme distances. Slow but reliable siege damage.',
    role: 'Long-range siege / construct killer',
    spriteKey: 'tower_stone_mortar',
    iconKey: 'tower_stone_mortar',
    cost: 150,
    damage: 65,
    range: 280, // Longest range
    fireRate: 3200, // Very slow
    projectileSpeed: 250,
    projectileKey: 'ammo_cannonball',
    scale: 0.45,
    damageType: DamageType.PHYSICAL,
    secondaryDamageType: DamageType.PIERCE,
    strongAgainst: ['boss', 'construct'],
    weakAgainst: ['elemental', 'swarm', 'tank'],
    special: {
      type: 'splash',
      value: 55 // 55px splash radius
    },
    tier: 3,
    upgrades: [
      { level: 2, cost: 100, damageBonus: 25, rangeBonus: 30, fireRateBonus: -300, specialBonus: 12 },
      { level: 3, cost: 200, damageBonus: 40, rangeBonus: 50, fireRateBonus: -500, specialBonus: 20 }
    ]
  },

  dread_pyre: {
    id: 'dread_pyre',
    name: 'Dread Pyre',
    nickname: 'Dread',
    description: 'Launches cursed skulls that burn and terrify enemies, causing hesitation.',
    role: 'Fear / damage-over-time',
    spriteKey: 'tower_dread_pyre',
    iconKey: 'tower_dread_pyre',
    cost: 180,
    damage: 28,
    range: 170,
    fireRate: 1800,
    projectileSpeed: 340,
    projectileKey: 'ammo_flaming_skull',
    scale: 0.45,
    damageType: DamageType.VOID,
    secondaryDamageType: DamageType.FIRE,
    strongAgainst: ['swarm', 'beast'],
    weakAgainst: ['undead', 'demon', 'construct'],
    special: {
      type: 'fear',
      value: 60, // 60% slow during fear
      duration: 1500, // 1.5 second fear
      secondaryValue: 6 // 6 damage per tick burn
    },
    tier: 3,
    upgrades: [
      { level: 2, cost: 120, damageBonus: 12, rangeBonus: 15, fireRateBonus: -150, specialBonus: 500 },
      { level: 3, cost: 240, damageBonus: 20, rangeBonus: 25, fireRateBonus: -250, specialBonus: 750 }
    ]
  }
};
