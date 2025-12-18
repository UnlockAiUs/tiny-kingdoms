/**
 * Damage System Configuration
 *
 * Defines damage types, tower damage profiles, and enemy resistances/weaknesses.
 * Multipliers: >1 = weakness (more damage), <1 = resistance (less damage), 0 = immune
 */

// ===== DAMAGE TYPES =====
export enum DamageType {
  FIRE = 'fire',
  PHYSICAL = 'physical',
  ICE = 'ice',
  LIGHT = 'light',
  PIERCE = 'pierce',
  VOID = 'void'
}

// ===== ENEMY TYPES (for resistance profiles) =====
export enum EnemyType {
  SWARM = 'swarm',
  BEAST = 'beast',
  ARMORED = 'armored',
  UNDEAD = 'undead',
  DEMON = 'demon',
  ELEMENTAL = 'elemental',
  FLYING = 'flying',
  TANK = 'tank',
  BOSS = 'boss',
  DRAGON = 'dragon',
  AQUATIC = 'aquatic',
  HUMANOID = 'humanoid',
  CONSTRUCT = 'construct'  // Golems, automata - requires PHYSICAL damage
}

// ===== TOWER DAMAGE PROFILES =====
export interface TowerDamageProfile {
  primary: DamageType;
  secondary: DamageType | null;
  primaryRatio: number; // 0-1, percentage of damage from primary type
}

export const TOWER_DAMAGE_PROFILES: Record<string, TowerDamageProfile> = {
  // Tier 1 Towers
  ember_watch: {
    primary: DamageType.FIRE,
    secondary: null,
    primaryRatio: 1.0
  },
  rockbound_bastion: {
    primary: DamageType.PHYSICAL,
    secondary: null,
    primaryRatio: 1.0
  },
  frostcoil_tower: {
    primary: DamageType.ICE,
    secondary: null,
    primaryRatio: 1.0
  },

  // Tier 2 Towers
  sunflare_cannon: {
    primary: DamageType.LIGHT,
    secondary: DamageType.FIRE,
    primaryRatio: 0.7 // 70% Light, 30% Fire
  },
  ironspike_launcher: {
    primary: DamageType.PIERCE,
    secondary: DamageType.PHYSICAL,
    primaryRatio: 0.75 // 75% Pierce, 25% Physical
  },
  pyrehold: {
    primary: DamageType.FIRE,
    secondary: DamageType.PHYSICAL,
    primaryRatio: 0.65 // 65% Fire, 35% Physical
  },

  // Tier 3 Towers
  void_obelisk: {
    primary: DamageType.VOID,
    secondary: null,
    primaryRatio: 1.0
  },
  stone_mortar: {
    primary: DamageType.PHYSICAL,
    secondary: DamageType.PIERCE,
    primaryRatio: 0.8 // 80% Physical, 20% Pierce
  },
  dread_pyre: {
    primary: DamageType.VOID,
    secondary: DamageType.FIRE,
    primaryRatio: 0.6 // 60% Void, 40% Fire
  }
};

// ===== ENEMY RESISTANCE PROFILES =====
// Multipliers: >1 = takes MORE damage (weakness), <1 = takes LESS damage (resistance), 0 = immune
export interface DamageMultipliers {
  [DamageType.FIRE]: number;
  [DamageType.PHYSICAL]: number;
  [DamageType.ICE]: number;
  [DamageType.LIGHT]: number;
  [DamageType.PIERCE]: number;
  [DamageType.VOID]: number;
}

export const ENEMY_DAMAGE_MULTIPLIERS: Record<EnemyType, DamageMultipliers> = {
  // Swarm - Weak to AOE damage (fire, physical splash), resistant to single-target pierce
  [EnemyType.SWARM]: {
    [DamageType.FIRE]: 1.6,      // Weak - fire spreads (reduced from 2.0 for balance)
    [DamageType.PHYSICAL]: 1.2,  // Weak - AOE splash effective against groups
    [DamageType.ICE]: 1.4,       // Weak - slows groups
    [DamageType.LIGHT]: 1.3,
    [DamageType.PIERCE]: 0.7,    // Resistant - too small/fast, single-target ineffective
    [DamageType.VOID]: 0.9       // Slight resistance - individual units lack magical essence
  },

  // Beast - Weak to fire and pierce, resistant to void
  [EnemyType.BEAST]: {
    [DamageType.FIRE]: 1.5,      // Weak - fur burns
    [DamageType.PHYSICAL]: 1.0,
    [DamageType.ICE]: 1.2,
    [DamageType.LIGHT]: 1.0,
    [DamageType.PIERCE]: 1.3,    // Weak - soft flesh
    [DamageType.VOID]: 0.8       // Resistant - primal nature
  },

  // Armored - Very weak to pierce, very resistant to physical
  [EnemyType.ARMORED]: {
    [DamageType.FIRE]: 1.2,      // Slightly weak - heats armor
    [DamageType.PHYSICAL]: 0.5,  // Very resistant - armor blocks
    [DamageType.ICE]: 1.0,
    [DamageType.LIGHT]: 1.0,
    [DamageType.PIERCE]: 1.8,    // Very weak - bypasses armor
    [DamageType.VOID]: 1.0
  },

  // Undead - Very weak to light/fire, resistant to physical/ice, less extreme void resistance
  [EnemyType.UNDEAD]: {
    [DamageType.FIRE]: 1.5,      // Weak - burns bones
    [DamageType.PHYSICAL]: 0.7,  // Resistant - no vital organs
    [DamageType.ICE]: 0.5,       // Very resistant - already cold/dead
    [DamageType.LIGHT]: 1.8,     // Very weak - holy damage (reduced from 2.0)
    [DamageType.PIERCE]: 0.6,    // Resistant - arrows pass through
    [DamageType.VOID]: 0.5       // Resistant but not immune (was 0.3)
  },

  // Demon - Weak to ice/light, resistant to fire/void
  [EnemyType.DEMON]: {
    [DamageType.FIRE]: 0.5,      // Very resistant - hellfire natives
    [DamageType.PHYSICAL]: 1.0,
    [DamageType.ICE]: 1.5,       // Weak - opposite element
    [DamageType.LIGHT]: 1.8,     // Very weak - holy damage
    [DamageType.PIERCE]: 1.1,
    [DamageType.VOID]: 0.7       // Resistant - dark origin
  },

  // Elemental - Weak to void, resistant to physical/pierce
  [EnemyType.ELEMENTAL]: {
    [DamageType.FIRE]: 0.8,
    [DamageType.PHYSICAL]: 0.6,  // Resistant - no solid form
    [DamageType.ICE]: 0.8,
    [DamageType.LIGHT]: 1.3,
    [DamageType.PIERCE]: 0.4,    // Very resistant - no vital points
    [DamageType.VOID]: 1.5       // Weak - magical disruption
  },

  // Flying - Weak to pierce/ice, resistant to physical
  [EnemyType.FLYING]: {
    [DamageType.FIRE]: 1.3,      // Weak - wings burn
    [DamageType.PHYSICAL]: 0.8,  // Resistant - hard to hit solidly
    [DamageType.ICE]: 1.4,       // Weak - freezes wings
    [DamageType.LIGHT]: 1.0,
    [DamageType.PIERCE]: 1.6,    // Weak - precision hits
    [DamageType.VOID]: 1.0
  },

  // Tank - Weak to pierce/void, resistant to physical/ice
  [EnemyType.TANK]: {
    [DamageType.FIRE]: 1.1,
    [DamageType.PHYSICAL]: 0.6,  // Resistant - thick hide
    [DamageType.ICE]: 0.9,       // Slight resistance - already slow
    [DamageType.LIGHT]: 1.0,
    [DamageType.PIERCE]: 1.4,    // Weak - finds weak points
    [DamageType.VOID]: 1.2
  },

  // Boss - Slight weakness to most, notable weakness to Void (Obelisk role)
  [EnemyType.BOSS]: {
    [DamageType.FIRE]: 1.1,
    [DamageType.PHYSICAL]: 1.1,
    [DamageType.ICE]: 1.1,
    [DamageType.LIGHT]: 1.2,     // Slightly more weak to light
    [DamageType.PIERCE]: 1.2,    // Slightly more weak to pierce
    [DamageType.VOID]: 1.5       // Notable weakness - magical disruption (gives Void Obelisk role)
  },

  // Dragon - Resistant to fire, weak to ice/pierce
  [EnemyType.DRAGON]: {
    [DamageType.FIRE]: 0.3,      // Very resistant - fire breathers
    [DamageType.PHYSICAL]: 0.7,  // Resistant - scales
    [DamageType.ICE]: 1.6,       // Weak - opposite element
    [DamageType.LIGHT]: 1.0,
    [DamageType.PIERCE]: 1.4,    // Weak - between scales
    [DamageType.VOID]: 1.2
  },

  // Aquatic - Weak to ice/light, resistant to fire
  [EnemyType.AQUATIC]: {
    [DamageType.FIRE]: 0.6,      // Resistant - water puts out fire
    [DamageType.PHYSICAL]: 1.0,
    [DamageType.ICE]: 1.7,       // Very weak - freezes water
    [DamageType.LIGHT]: 1.4,     // Weak - deep sea creatures
    [DamageType.PIERCE]: 1.2,
    [DamageType.VOID]: 0.9
  },

  // Humanoid - Balanced profile with resistances and weaknesses
  [EnemyType.HUMANOID]: {
    [DamageType.FIRE]: 1.2,      // Weak - burns flesh
    [DamageType.PHYSICAL]: 0.9,  // Slight resistance - tactical armor/shields
    [DamageType.ICE]: 1.1,       // Slightly weak - slows and chills
    [DamageType.LIGHT]: 1.3,     // Weak - blinding/disorienting (gives Sunflare role vs Rogue)
    [DamageType.PIERCE]: 1.2,    // Weak - armor gaps, vital organs
    [DamageType.VOID]: 0.7       // Resistant - grounded in reality, less affected by magical disruption
  },

  // Construct - Golems, automata, animated armor - ONLY weak to PHYSICAL (Rockbound/Stone Mortar role)
  [EnemyType.CONSTRUCT]: {
    [DamageType.FIRE]: 0.6,      // Resistant - stone/metal doesn't burn
    [DamageType.PHYSICAL]: 1.8,  // Very weak - smash them apart
    [DamageType.ICE]: 0.7,       // Resistant - no flesh to freeze
    [DamageType.LIGHT]: 0.5,     // Very resistant - no soul to purify
    [DamageType.PIERCE]: 0.8,    // Resistant - too solid for arrows
    [DamageType.VOID]: 0.4       // Very resistant - no magic to disrupt
  }
};

// ===== DAMAGE CALCULATION UTILITY =====

/**
 * Calculate effective damage based on tower damage type and enemy type
 */
export function calculateEffectiveDamage(
  baseDamage: number,
  towerId: string,
  enemyTypes: EnemyType[]
): number {
  const damageProfile = TOWER_DAMAGE_PROFILES[towerId];
  if (!damageProfile) {
    return baseDamage; // No profile, return base damage
  }

  // Get the best (highest) multiplier from enemy types
  let bestMultiplier = 1.0;

  for (const enemyType of enemyTypes) {
    const multipliers = ENEMY_DAMAGE_MULTIPLIERS[enemyType];
    if (!multipliers) continue;

    // Calculate weighted multiplier for this enemy type
    let typeMultiplier = multipliers[damageProfile.primary] * damageProfile.primaryRatio;

    if (damageProfile.secondary) {
      typeMultiplier += multipliers[damageProfile.secondary] * (1 - damageProfile.primaryRatio);
    }

    // Use the most favorable multiplier (for multi-type enemies, weakness takes priority)
    if (typeMultiplier > bestMultiplier) {
      bestMultiplier = typeMultiplier;
    }
  }

  // Also check for resistances - use lowest if enemy has strong resistance
  let worstMultiplier = 1.0;
  for (const enemyType of enemyTypes) {
    const multipliers = ENEMY_DAMAGE_MULTIPLIERS[enemyType];
    if (!multipliers) continue;

    let typeMultiplier = multipliers[damageProfile.primary] * damageProfile.primaryRatio;
    if (damageProfile.secondary) {
      typeMultiplier += multipliers[damageProfile.secondary] * (1 - damageProfile.primaryRatio);
    }

    if (typeMultiplier < worstMultiplier) {
      worstMultiplier = typeMultiplier;
    }
  }

  // Average of best and worst for multi-type enemies
  const finalMultiplier = enemyTypes.length > 1
    ? (bestMultiplier + worstMultiplier) / 2
    : bestMultiplier;

  return Math.floor(baseDamage * finalMultiplier);
}

/**
 * Get effectiveness description for UI display
 */
export function getEffectivenessText(multiplier: number): { text: string; color: number } {
  if (multiplier >= 1.8) return { text: 'SUPER EFFECTIVE!', color: 0x00FF00 };
  if (multiplier >= 1.4) return { text: 'Effective', color: 0x88FF88 };
  if (multiplier >= 1.1) return { text: 'Slightly Effective', color: 0xAAFFAA };
  if (multiplier >= 0.9) return { text: 'Normal', color: 0xFFFFFF };
  if (multiplier >= 0.6) return { text: 'Resisted', color: 0xFFAAAA };
  if (multiplier >= 0.3) return { text: 'Strongly Resisted', color: 0xFF8888 };
  return { text: 'IMMUNE', color: 0xFF0000 };
}

/**
 * Get damage type color for UI
 */
export function getDamageTypeColor(damageType: DamageType): number {
  switch (damageType) {
    case DamageType.FIRE: return 0xFF6600;
    case DamageType.PHYSICAL: return 0x888888;
    case DamageType.ICE: return 0x88CCFF;
    case DamageType.LIGHT: return 0xFFFF88;
    case DamageType.PIERCE: return 0xCC8844;
    case DamageType.VOID: return 0x9944FF;
    default: return 0xFFFFFF;
  }
}

/**
 * Get damage type icon/symbol for UI
 */
export function getDamageTypeSymbol(damageType: DamageType): string {
  switch (damageType) {
    case DamageType.FIRE: return '🔥';
    case DamageType.PHYSICAL: return '⚔️';
    case DamageType.ICE: return '❄️';
    case DamageType.LIGHT: return '☀️';
    case DamageType.PIERCE: return '🗡️';
    case DamageType.VOID: return '🌀';
    default: return '❓';
  }
}
